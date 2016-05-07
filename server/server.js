import loopback from 'loopback'
import boot from 'loopback-boot'
import path from 'path'
import bodyParser from 'body-parser'
import basicAuth from 'basic-auth'
import i18n from 'i18n'
import helmet from 'helmet'

const app = loopback()

i18n.configure({
  locales: ['nl_NL', 'en_NL'],
  defaultLocale: 'nl_NL',
  directory: path.resolve(__dirname, '..', 'common/locales')
})

// configure body parser
app.use(bodyParser.urlencoded({extended: true}))
app.use(loopback.cookieParser('sumcooksie'))
app.use(loopback.token({
  searchDefaultTokenKeys: false,
  params: ['access_token'],
  cookies: ['access_token'],
  headers: ['X-Access-Token'],
}))

app.use(helmet.xssFilter())
app.use(helmet.frameguard({action: 'deny'}))
app.use(helmet.hidePoweredBy())
app.use(helmet.ieNoOpen())
app.use(helmet.noSniff())

app.use((req, res, next) => {
  if (req.originalUrl.indexOf('/explorer') === -1) return next()
  const user = basicAuth(req)

  function unauthorized(_res) {
    _res.set('WWW-Authenticate', 'Basic realm=Authorization Required')
    return _res.sendStatus(401)
  }

  if (!user || !user.name || !user.pass) {
    return unauthorized(res)
  }

  if (user.name === 'app-api' && user.pass === 'you1zso0k') {
    return next()
  }
  return unauthorized(res)
})

app.start = () => {
  // start the web server
  let server = app.listen(() => {
    app.emit('started')
    let baseUrl = app.get('url').replace(/\/$/, '')
    console.log('Web server listening at: %s', baseUrl)
    if (app.get('loopback-component-explorer')) {
      let explorerPath = app.get('loopback-component-explorer').mountPath
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath)
    }
  })
}

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname)

// start the server if `$ node server.js`
if (require.main === module) app.start()

//export default app
export default app