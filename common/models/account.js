import _ from 'lodash'
import createLogger from '../lib/log'
const log = createLogger('Account')
import {errors, getError} from '../lib/error'
import loopback from 'loopback'
import {getLocale, __} from 'i18n'
import {stripProps} from '../lib/util'
import {validators, validRegexp} from '../lib/validation'
import {addressTypes} from './address'

const env = process.env

export default (Account) => {

  let models = loopback
  Account.on('attached', () => {
    models = Account.app.models
  })

  Account.validatesLengthOf('firstName', {min: 2, max: 60})
  Account.validate('initials', validators.initials('initials'))
  Account.validatesLengthOf('lastName', {min: 2, max: 100})
  Account.validate('dob', validators.date('dob'))
  Account.validatesLengthOf('pob', {max: 60})
  Account.validatesFormatOf('mobile', {with: validRegexp.internationalPhone})
  Account.validatesInclusionOf('documentType', {in: ['EuropeanIdentityCard', 'Passport', 'DriversLicence', 'SurinamTouristCard', 'Visa', 'VngIdentityCard)'], allowNull: true})
  Account.validatesLengthOf('documentId', {max: 24, allowNull: true})
  Account.validate('documentExpiryDate', validators.date('documentExpiryDate'))

  /**\
   * The purpose of this function is to save the address by using a specific model per country for validation.
   * The data itself will be saved as a regular Address model.
   * @param ctx
   * @param next
   * @returns {*}
   */
  function saveAddress(ctx, next) {
    const account = ctx.instance || ctx.data
    const address = ctx.hookState.address
    //log.debug('saveAddress address: ', address)
    if (!address || !account.id) return next()
    //log.info('saving address')
    const countryCode = address.countryCode ? address.countryCode.toUpperCase() : 'NL'
    const model = 'Address'
    const specificModel = model + addressTypes[countryCode]
    //log.debug('validating %s for account[%s]: ', specificModel, account.id, address)
    const test = new models[specificModel](address)
    test.isValid()
    if (test.errors) {
      //log.debug('test.errors: ', test.errors)
      const flattenedErrors = _.reduce(test.errors, (res, errs, key) => res.concat(errs.map(e => `${key}: ${e}`)), []).join('\n- ')
      log.debug('flattenedErrors: ', flattenedErrors)
      return next(getError(errors.ADDRESS_VALIDATION_FAILED, undefined, flattenedErrors))
    }
    log.info('saving address for account: ', account.id)
    //log.debug('saving address for account[%s]: ', account.id, address)
    const addressModel = models[model]
    const method = address.id ? 'update' : 'create'
    address.accountId = account.id
    const addressId = address.id
    account.address = address
    addressModel[method](address)
      .then(res => {
        if (method === 'create') {
          account.address = res
        } else {
          // somehow we lose the address.id in the update phase!!
          account.address.id = addressId
        }
        next(null, account)
      })
      .catch(err => next(getError(errors.UNKNOWN, err)))
  }

  function hydrateAddress(ctx, next) {
    const account = ctx.instance || ctx.data
    //log.debug('hydrateAddress - account: ', account)
    if (!account.id) return next()
    models.Address.findOne({where: {accountId: account.id}})
      .then(address => {
        //log.debug('found address for account[%s]: ', account.id, address)
        if (address) {
          account.address = address.toJSON()
        }
        next(null, account)
      })
      .catch(err => next(getError(errors.UNKNOWN, err)))
  }

  Account.fromSession = () => {
    const ctx = loopback.getCurrentContext()
    const accessToken = ctx.get('http').req.accessToken
    if (!accessToken) {
      log.error('fromSession: ', errors.AUTH_FAILED_TOKEN_NOT_FOUND)
      return Promise.reject(getError(errors.AUTH_FAILED_TOKEN_NOT_FOUND))
    }
    // get account of user
    return new Promise((resolve, reject) => {
      Account.findOne({where: {appUserId: accessToken.userId}})
        .then(account => {
          if (account) {
            log.debug('found account for user: ', accessToken.userId)
          } else {
            log.debug('no account found for user: ', accessToken.userId)
          }
          resolve(account)
        })
        .catch(err => reject(getError(errors.UNKNOWN, err)))
    })
  }

  Account.stripIncoming = (ctx, data, next) => {
    const account = ctx.args.data
    const disallowedProps = ['verified', 'agreed', 'bic', 'iban']
    stripProps(account, disallowedProps)
    next()
  }

  /**
   * Hooks
   */

  Account.observe('before save', (ctx, next) => {
    let account = ctx.instance || ctx.data
    log.debug('before save - account: ', account)
    // if not yet agreed, but all fields filled, assume agreed
    if (!account.agreed && _.every(['firstName', 'initials', 'lastName', 'dob', 'pob', 'mobile', 'documentType', 'documentId',
        'documentExpiryDate'], prop => !!account[prop])) {
      log.info('account is complete, setting agreed')
      account.agreed = true
    }
    if (account.address) {
      log.debug('address set on account, keeping it')
      ctx.hookState.address = account.address
      stripProps(account, 'address')
    }
    stripProps(account, 'appUser')
    log.debug('before save - modified account: ', account)
    next()
  })

  Account.observe('after save', saveAddress)
  Account.observe('loaded', hydrateAddress)

  /**
   * Related models
   */

  /**
   * Exposed custom api methods:
   */

}
