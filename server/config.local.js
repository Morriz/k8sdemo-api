import {getShortEnv} from '../common/lib/util'
const env = process.env
const shortEnv = getShortEnv()
const wantedEnv = [
  'API_SECRET',
  'DOMAIN',
  'MANDRILL_KEY',
  //'EASY_SECRET',
  //'NEXMO_KEY',
  //'NEXMO_SECRET',
]

wantedEnv.forEach((ev) => {
  let val = env[ev]
  if (!val && !env.TESTMODE) throw new Error(ev + ' not found in environment !!')
})

const region = 'eu-central-1'
const subscriber = 1234567890
const cnf = {
  port: env.PORT || 5001,
  email: {
    from: 'hello@your.com'
  },
  aws: {
    region,
    sqs: {
      external: {
        queueUrl: `https://sqs.${region}.amazonaws.com/${subscriber}/somequeue-${shortEnv}`
      }
    },
    s3: {
      bucket: `app-${shortEnv}`
    }
  },
  external: {
    serviceUrl: 'https://some.com/services/'
  }
}
cnf.mandrill = {
  defaults: {
    from_email: cnf.email.from,
    preserve_recipients: false,
    merge_vars: [],
    important: false,
    track_opens: true,
    track_clicks: true,
    tracking_domain: cnf.website,
    google_analytics_domains: [cnf.website],
    metadata: {website: cnf.website},
  }
}

export default cnf

