import loopback from 'loopback'
import Account from '../models/account.js'
import account from '../models/account.json'
import Address from '../models/address.js'
import address from '../models/address.json'
import AddressEU from '../models/address/address-eu.js'
import addressEU from '../models/address/address-eu.json'
import AppUser from '../models/appuser.js'
import appUser from '../models/appuser.json'

const dataSourceTypes = {
  DB: 'db',
  MAIL: 'mail'
}

function createModel (definitionJson, customizeFn) {
  const Model = loopback.createModel(definitionJson)
  customizeFn(Model)
  return Model
}

loopback.Account = createModel(account, Account)
loopback.Address = createModel(address, Address)
loopback.AddressEU = createModel(addressEU, AddressEU)
loopback.AppUser = createModel(appUser, AppUser)

loopback.Account.autoAttach = dataSourceTypes.DB
loopback.Address.autoAttach = dataSourceTypes.DB
loopback.AddressEU.autoAttach = dataSourceTypes.DB
loopback.AppUser.autoAttach = dataSourceTypes.DB
