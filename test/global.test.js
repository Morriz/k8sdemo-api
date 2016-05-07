import loopback from 'loopback'
import * as chai from 'chai'
import sinonChai from 'sinon-chai'
import registerModels from '../common/lib/models'

chai.use(sinonChai)

//beforeEach(function() {
global.app = loopback()

// setup default data sources
loopback.setDefaultDataSourceForType('db', {
  connector: loopback.Memory
})

loopback.setDefaultDataSourceForType('mail', {
  connector: loopback.Mail,
  transports: [
    {type: 'STUB'}
  ]
})

global.app.use(loopback.rest())

//})
