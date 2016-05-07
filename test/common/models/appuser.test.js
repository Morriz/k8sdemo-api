import _ from 'lodash'
import loopback from 'loopback'
import {expect} from 'chai'
import {errors} from '../../../common/lib/error'

describe('AppUser', () => {

  const validDef = {
    email: 'test@test.com',
    password: 'Password-#01',
    name: 'test name',
    image: 'test image.png',
    locale: 'nl_NL',
    state: {someStateProp: 'bla'},
  }
  const invalidDef = {
    email: 'soooooInvalid',
    password: '123',
    name: 'x',
    image: 'test image.svg',
    locale: 'de_NL',
    state: JSON.parse(`{"someProp": "${_.pad('x', 65536, 'x')}"}`),
  }
  const withInvalidPass = {...validDef, password: validDef.password}
  // name should be min 3 chars
  const withTooShortName = {...validDef, name: 'xx'}
  // name should be max 100 chars
  const withTooLongName = {...validDef, name: _.pad('x', 101, 'x')}
  const withInvalidState = {...validDef, state: invalidDef.state}

  before(() => {
    loopback.AppUser.setMaxListeners(0)
    global.app.model(loopback.AppUser)
    loopback.autoAttach()
  })

  after(() => {
  })

  it('should throw BAD_PASSWORD when invalid password given', () => {
    try {
      new loopback.AppUser(withInvalidPass).isValid()
    } catch (e) {
      expect(e.code).to.equal(errors.BAD_PASSWORD.code)
    }
  })

  it('should err when invalid (but with valid password)', () => {
    const inst = new loopback.AppUser({...invalidDef, password: validDef.password})
    const isValid = inst.isValid()
    const errors = inst.errors
    expect(isValid).to.be.not.ok
    expect(errors.name).to.be.ok
    expect(errors.state).to.be.ok
  })

  it('should not err when valid', (done) => {
    const inst = new loopback.AppUser(validDef)
    // loopback decided to make one of the User validations async (why?), so we have to inject a callback
    const res = inst.isValid(isValid => {
      expect(isValid).to.be.ok
      done()
    })
  })
})