import _ from 'lodash'
import loopback from 'loopback'
import {__, getLocale, getCatalog} from 'i18n'

export const errors = {
  // loopback's own:
  INVALID_TOKEN: {message: 'authentication failed: wrong access token provided'},
  LOGIN_FAILED: {message: 'login failed: wrong credentials provided'},
  LOGIN_FAILED_EMAIL_NOT_VERIFIED: {message: 'login failed: the email has not been verified'},
  REALM_REQUIRED: {message: 'realm required'},
  USER_NOT_FOUND: {message: 'user not found: %s'},
  USERNAME_EMAIL_REQUIRED: {message: 'username or email is required'},
  // custom errors:
  UNKNOWN: {message: 'failure: reason unknown', statusCode: 500},
  FORBIDDEN: {message: 'failure: forbidden', statusCode: 403},
  BAD_PASSWORD: {message: 'failure: bad password (%s)', statusCode: 422},
  AUTH_FAILED_REASON_UNKNOWN: {message: 'authentication failed: reason unknown', statusCode: 500},
  AUTH_FAILED_USER_NOT_FOUND: {message: 'authentication failed: user not found', statusCode: 404},
  AUTH_FAILED_TOKEN_NOT_FOUND: {message: 'authentication failed: session not found', statusCode: 401},
  AUTH_FAILED_TOKEN_EXPIRED: {message: 'authentication failed: session expired', statusCode: 401},
  AUTH_FAILED_WRONG_CREDENTIALS: {message: 'authentication failed: wrong credentials provided', statusCode: 401},
  EMAIL_FAILED_REASON_UNKNOWN: {message: 'sending email failed: reason unknown', statusCode: 500},
  REGISTRATION_FAILED_USER_EXISTS: {message: 'registration failed: user data exists (%s)', statusCode: 422},
  VERIFICATION_FAILED_REASON_UNKNOWN: {message: 'verification failed: reason unknown', statusCode: 500},
  ADDRESS_VALIDATION_FAILED: {message: 'address validation failed:\n%s', statusCode: 422},
}

Object.keys(errors).forEach((code) => {
  errors[code].code = code
})

export function getError(err, originalError, args = {}, _req) {
  //originalError && console.error(originalError)
  // get the context for the current request
  const req = _req ? _req : loopback.getCurrentContext() && loopback.getCurrentContext().get('http').req
  // pick the translator for this particular request:
  const t = req ? req.__ : __
  // only if we have a catalog ready can we translate
  const message = _.isArray(args) ? t(err.message, ...args) : t(err.message, args)
  const e = new Error(message)
  e.code = err.code
  e.statusCode = err.statusCode
  if (originalError) e.stack = originalError.stack
  return e
}

export function handleErr(err, ctx, next) {
  if (err.code === 'ETIMEDOUT') {
    console.error(err)
    ctx.res.statusCode = 408
  }
  next(err)
}