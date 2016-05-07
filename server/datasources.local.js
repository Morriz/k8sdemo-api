const e = process.env

const cnf = {
  mongo: {
    host: e.APP_MONGO_HOST || '127.0.0.1'
  },
  emailDs: {
    transports: [{
      auth: {
        pass: e.MANDRILL_KEY
      }
    }]
  },
}
export default cnf