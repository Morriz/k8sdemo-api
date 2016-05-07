import createLogger from '../lib/log'
import cnf from '../lib/config'
import {errors, getError} from '../lib/error'
import loopback from 'loopback'
import {getLocale, __} from 'i18n'
import {stripProps} from '../lib/util'
import speakeasy from 'speakeasy'
import nexmo from 'easynexmo'
import pify from 'pify'
import notifyRegistrationVerification from '../lib/notifications/registration-verification'
import notifyPasswordReset from '../lib/notifications/password-reset'
const log = createLogger('AppUser')

const env = process.env

export default (AppUser) => {

  let models = loopback
  AppUser.on('attached', () => {
    models = AppUser.app.models
  })

  AppUser.validatesLengthOf('name', {min: 2, max: 100, allowNull: true})
  AppUser.validate('state', function(err) {
    const len = 65536
    const invalid = 'not a valid object'
    try {
      const stateStr = JSON.stringify(this.state)
      stateStr.indexOf('{') !== 0 && err(invalid)
      stateStr.length > len && err(`state can't be longer than ${len}`)
    } catch (e) {
      err(invalid)
    }
  })

  /**
   * force the user to create a strong password.
   * It should be min 12 chars long and consist of:
   * - one or more lowercase chars
   * - one or more uppercase chars
   * - one or more numbers
   * - two or more special chars
   * @param password
   */
  AppUser.validatePassword = function(password) {
    const reLowercase = /^(?=.*[a-z]).+$/
    const reUppercase = /^(?=.*[A-Z]).+$/
    const reNumber = /^(?=.*[0-9]).+$/
    const reSpecial = /^(?=.*[!@#$%^&*-+_,~'`]).+$/
    if ((password.length < 8 || password.length > 160) ||
      (!reLowercase.test(password)) ||
      (!reUppercase.test(password)) ||
      (!reNumber.test(password)) ||
      (!reSpecial.test(password))) {
      const err = getError(errors.BAD_PASSWORD, null, password)
      throw err
    }
  }

  /**
   * By overriding the default `login()` method here we can restrict the UI from 'accidentally' trying to hit the /api/users/login route
   */
  //AppUser.login = (credentials, include, next) => {
  //  next(new Error('This application requires two-factor authentication.'))
  //}

  /**
   * Verify a user by sending a verification email after registration.
   */
  function verify (user) {

    if (user.emailVerified) return Promise.resolve()
    return new Promise((resolve, reject) => {
      AppUser.generateVerificationToken(user, (err, token) => {
        if (err) {
          log.error(err)
          reject(err)
        }
        user.verificationToken = token
        user.save().then(() => {
          notifyRegistrationVerification(user, token).then(resolve)
        })
      })
      //.catch(err => {
      //  log.error(err)
      //  reject(err)
      //})
    })
  }

  function checkEmailChangeBeforeSave (ctx, next) {
    const user = ctx.instance || ctx.data
    if (ctx.isNewInstance && user.isAutoCreated) {
      stripProps(user, 'isAutoCreated')
      ctx.hookState.isAutoCreated = true
      log.debug('got autocreated user: ', user)
    }
    // email might have changed
    if (!user.id || !user.email) return next()
    // get previous and check
    AppUser.findById(user.id)
      .then(usr => {
        log.debug('before save found existing user: ', usr)
        if (usr && user.email !== usr.email) {
          log.debug('existing user changed email[%s] to: ', usr.email, user.email)
          ctx.hookState.isEmailUpdate = true
          // change to 'not verified'
          user.emailVerified = false
        }
        next(null, user)
      })
      .catch(err => next(err) && log.error(err))
  }

  function checkEmailChangeAfterSave (ctx, next) {
    const user = ctx.instance
    log.debug('after save user: ', user)
    if (!(ctx.isNewInstance || ctx.hookState.isEmailUpdate) || ctx.hookState.isAutoCreated) return next()
    log.debug('first save or email changed, verifying')
    verify(user)
      .then(() => next())
      .catch(err => {
        log.error('error sending verification email: ', err)
        if (!ctx.isEmailUpdate) {
          log.debug('deleting newly created user: %j', user)
          user.delete()
        }
        return next(err)
      })
  }

  /**
   * Request a two-factor authentication code for use during the login process.
   * @param credentials
   * @param next
   * @returns {*}
   */
  AppUser.requestCode = (credentials, next) => {

    if (!credentials.email || !credentials.password) return next(getError(errors.AUTH_FAILED_WRONG_CREDENTIALS))

    const now = (new Date()).getTime()
    const req = loopback.getCurrentContext().get('http').req
    const t = req ? req.__ : __

    this.findOne({where: {email: credentials.email}})
      .then(user => {
        if (!user) return next(getError(errors.AUTH_FAILED_USER_NOT_FOUND))
        user.hasPassword(credentials.password)
          .then(isMatch => {
            if (!isMatch) return next(getError(errors.AUTH_FAILED_WRONG_CREDENTIALS))

            let code = speakeasy.totp({key: cnf.EASY_SECRET + credentials.email})

            log.debug('Two factor code for ' + credentials.email + ': ' + code)

            nexmo.initialize(env.NEXMO_KEY, env.NEXMO_SECRET, env.NEXMO_DEBUG)
            nexmo.sendTextMessage('YourAppName', user.mobile, t('Your verification code is: %s'), {}, (err, data) => {
              if (err) return next(getError(errors.VERIFICATION_FAILED_REASON_UNKNOWN, err))
              // all done! handle the data as you need to
              log.debug('got data from nexmo: ', data)
              user.emailVerified = true
              user.save()
            })
            next(null, now)
          })
      })
      .catch(err => next(getError(errors.AUTH_FAILED_REASON_UNKNOWN, err)))
  }

  /**
   * A method for logging in a user using a time-based (quickly expiring)
   * verification code obtained using the `requestCode()` method.
   *
   * @param  {object} credentials A JSON object containing 'email' and 'twofactor' fields
   * @param  {Function} next The function to call in the Loopback for sending back data
   * @return {void}
   */
  AppUser.loginWithCode = (email, password, twofactor, next) => {

    this.findOne({where: {email: email}})
      .then(user => {
        if (!user) return next(getError(errors.AUTH_FAILED_USER_NOT_FOUND))

        const code = speakeasy.totp({key: env.EASY_SECRET + email})

        if (code !== twofactor) return next(getError(errors.AUTH_FAILED_USER_NOT_FOUND))

        user.createAccessToken(86400)
          .then(token => {
            token.__data.user = user
            next(null, token)
          })
      })
      .catch(err => next(getError(errors.AUTH_FAILED_REASON_UNKNOWN, err)))
  }

  AppUser.fromSession = next => {
    log.info('fromSession - looking for access_token in request')
    const ctx = loopback.getCurrentContext()
    const accessToken = ctx.get('http').req.accessToken
    console.log('accessToken: ', accessToken)
    if (!accessToken) {
      const err = getError(errors.AUTH_FAILED_TOKEN_NOT_FOUND)
      next && next(err)
      return Promise.reject(err)
    }
    return new Promise((resolve, reject) => {
      AppUser.findById(accessToken.userId, {include: {relation: 'account'}})
        .then(user => {
          log.debug('found user in session: ', user)
          next && next(null, user)
          resolve(user)
        })
        .catch(err => {
          log.error(err)
          const e = getError(errors.AUTH_FAILED_USER_NOT_FOUND)
          next && next(e)
          reject(e)
        })
    })
  }

  AppUser.resetPasswordWithToken = (email, accessTokenId, next) => {
    const res = loopback.getCurrentContext().get('http').res
    AppUser.findOne({where: {email}})
      .then(user => {
        if (!user) return next(getError(errors.AUTH_FAILED_USER_NOT_FOUND))
        user.accessTokens.findOne({where: {id: accessTokenId}})
          .then(accessToken => {
            if (!accessToken) return next(getError(errors.AUTH_FAILED_TOKEN_NOT_FOUND))
            // we're redirecting directly to the password input form
            const url = `${env.DOMAIN}/passwordchange/${user.id}/${accessTokenId}`
            res.writeHead(302, {location: url})
            res.end()
          })
      })
      .catch(err => next(err))
  }

  AppUser.on('resetPasswordRequest', info => {
    notifyPasswordReset(info.user, info.accessToken.id)
  })

  AppUser.upload = (req, res, next) => {
    AppUser.fromSession()
      .then(user => {
        const container = cnf.aws.s3.bucket
        log.debug('uploading to container: ', container)
        pify(models.Container.upload)(req, res, {container}).then(res => {
          const fileNames = Object.keys(res.files)
          log.debug('uploaded to container[%s]: ', container, fileNames[0])
          user.image = fileNames[0]
          user.save()
          next()
        }).catch(err => {
          log.error('Error uploading image to S3 ', err)
          next(err)
        })
      })
      .catch(err => next(err))
  }

  /**
   * Hooks
   */

  AppUser.observe('before save', (ctx, next) => {
    checkEmailChangeBeforeSave(ctx, next)
  })

  AppUser.observe('after save', (ctx, next) => {
    checkEmailChangeAfterSave(ctx, next)
  })

  AppUser.afterRemote('login', (context, accessToken, next) => {
    const res = context.res
    const req = context.req
    if (accessToken != null) {
      if (accessToken.id != null) {
        const signed = !!req.signedCookies
        const maxAge = 1000 * accessToken.ttl
        res.cookie('access_token', accessToken.id, {httpOnly: true, signed, maxAge})
        // also set an unsigned one that just says we have an access token, and lives equally long
        res.cookie('authenticated', true, {signed: false, maxAge})
      }
    }
    return next()
  })

  AppUser.afterRemoteError('login', function(ctx, next) {
    // just localize login error
    const req = loopback.getCurrentContext().get('http').req
    const t = req ? req.__ : __
    const e = ctx.error
    log.error('login error: ', e)
    if (e && e.code) e.message = t(errors[e.code].message, ...ctx.args)
    next()
  })

  AppUser.afterRemoteError('create', function(ctx, next) {
    const req = loopback.getCurrentContext().get('http').req
    const t = req ? req.__ : __
    const locale = getLocale(req)
    const e = ctx.error
    if (e) switch (e.statusCode) {
      case 422:
        log.warn(e)
        if (e.details && e.details.codes && e.details.codes.length > 0) {
          e.message = t(errors.REGISTRATION_FAILED_USER_EXISTS.message, Object.keys(e.details.codes).join(', '))
        }
        break
      default:
        log.error(e)
    }
    next()
  })
  //
  //function stripOutgoingAccount() {
  //  console.log(arguments, new Error().trace)
  //  models.Account.stripOutgoing(...arguments)
  //}
  //
  //function stripIncomingAccount() {
  //  models.Account.stripIncoming(...arguments)
  //}
  //
  //AppUser.afterRemote('*.__find__account', stripOutgoingAccount)
  //AppUser.afterRemote('*.__create__account', stripOutgoingAccount)
  //AppUser.afterRemote('*.__update__account', stripOutgoingAccount)
  //
  //AppUser.beforeRemote('*.__create__account', stripIncomingAccount)
  //AppUser.beforeRemote('*.__update__account', stripIncomingAccount)

  /**
   * Exposed custom api methods:
   */

  AppUser.remoteMethod(
    'fromSession', {
      description: 'Tries to find a user in the session',
      returns: {
        arg: 'user',
        type: 'object',
        root: true,
        description: 'The user found in the session.'
      },
      http: {verb: 'get'}
    }
  )

  AppUser.remoteMethod('requestCode', {
    description: 'Request a two-factor code for a user with email and password',
    accepts: [
      {arg: 'email', type: 'string', required: true, http: {source: 'body'}},
      {arg: 'password', type: 'string', required: true, http: {source: 'body'}}
    ],
    returns: {arg: 'timestamp', type: 'string'},
    http: {verb: 'post'}
  })

  AppUser.remoteMethod('loginWithCode', {
    description: 'Login a user with email and two-factor code',
    accepts: [
      {arg: 'email', type: 'string', required: true, http: {source: 'body'}},
      {arg: 'password', type: 'string', required: true, http: {source: 'body'}},
      {arg: 'code', type: 'string', required: true, http: {source: 'body'}}
    ],
    returns: {
      arg: 'accessToken',
      type: 'object',
      root: true,
      description: 'The response body contains properties of the AccessToken created on login.'
    },
    http: {verb: 'post'}
  })

  AppUser.remoteMethod('resetPasswordWithToken', {
    description: 'Method that triggers password reset and redirects to password input form.',
    accepts: [
      {arg: 'email', type: 'string', required: true},
      {arg: 'access_token', type: 'string', required: true},
    ],
    http: {verb: 'get'}
  })

  AppUser.remoteMethod('upload', {
    http: {path: '/:id/files', verb: 'post'},
    accepts: [
      {arg: 'req', type: 'object', http: {source: 'req'}},
      {arg: 'res', type: 'object', http: {source: 'res'}},
    ],
  })
}

