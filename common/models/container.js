import createLogger from '../lib/log'
const log = createLogger('Container')

export default function (Container) {

  Container.beforeRemote('**', (ctx, data, next) => {
    log.debug('Container beforeRemote method: ', ctx.method.name)
    next()
  })
}
