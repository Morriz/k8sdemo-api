import loopback from 'loopback'
import {expect} from 'chai'

describe('Account', () => {

  const validDef = {
    dob: new Date() + '',
    documentExpiryDate: new Date(),
    documentId: '12345678',
    documentType: 'EuropeanIdentityCard',
    firstName: 'mo-du l\' eau',
    initials: 'A.B.',
    lastName: 'bladibla',
    mobile: '+31123456789',
    pob: 'some city',
  }
  const invalidDef = {
    dob: new Date(),
    documentExpiryDate: new Date(),
    documentId: '12345',
    documentType: 'wrong',
    firstName: 'x',
    initials: 'A.B.CCCCCCCCCCCC',
    lastName: 'x',
    mobile: '123',
    pob: 'x',
  }
  const address = {
    countryCode: 'NL',
    city: 'Amsterdam',
    houseNumber: 11,
    houseNumberAddition: 'bs',
    residenceType: 'appartment',
    street1: 'somstreet',
    street2: 'bla',
    zipCode: '1234 AA',
  }

  before(() => {
    loopback.Account.setMaxListeners(0)
    global.app.model(loopback.AppUser)
    loopback.autoAttach()
  })

  function clean(done) {
    Promise.all([loopback.Address.destroyAll(), loopback.Account.destroyAll()]).then(() => done())
  }

  it('should err when invalid', () => {
    const inst = new loopback.Account(invalidDef)
    const isValid = inst.isValid()
    const errors = inst.errors
    expect(isValid).to.be.not.ok
    expect(errors.documentType).to.be.ok
    expect(errors.firstName).to.be.ok
    expect(errors.initials).to.be.ok
    expect(errors.lastName).to.be.ok
    expect(errors.mobile).to.be.ok
  })

  it('should not err when valid', () => {
    const inst = new loopback.Account(validDef)
    const isValid = inst.isValid()
    expect(isValid).to.be.ok
  })

  it('should save the address when set', done => {
    loopback.Account.create({...validDef, address: {...address}}).then(() => {
      loopback.Address.findOne((err, res) => {
        if (err) console.error(err)
        const _address = res.toJSON()
        delete _address.id
        delete _address.accountId
        expect(_address).to.deep.equal(address)
        clean(done)
      })
    })
  })

  it('should hydrate the address when it exists', done => {
    loopback.Account.create({...validDef, address: {...address}}).then(() => {
      loopback.Account.findOne((err, account) => {
        if (err) console.error(err)
        expect(account.address).to.be.ok
        const _address = {...account.address}
        delete _address.id
        delete _address.accountId
        expect(_address).to.deep.equal(address)
        clean(done)
      })
    })
  })

  it('should not err when valid', () => {
    const inst = new loopback.Account(validDef)
    const isValid = inst.isValid()
    expect(isValid).to.be.ok
  })

})