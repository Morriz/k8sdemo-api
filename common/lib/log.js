import debug from 'debug'
import moment from 'moment'

const oldFormat = debug.formatArgs

function formatArgs() {
  const useColors = this.useColors
  const name = this.namespace
  let args

  if (useColors) {
    args = oldFormat.apply(this, arguments)
    if (!process.env.LOG_NODATE && typeof window === 'undefined') {
      args[0] = moment().format('YYYY-MM-DD hh:mm:ss.SSS') + ' ' + args[0]
    }
  } else {
    args = arguments
    args[0] = name + ' ' + args[0]
    if (!process.env.LOG_NODATE && typeof window === 'undefined') {
      args[0] = moment().format('YYYY-MM-DD hh:mm:ss.SSS') + ' ' + args[0]
    }
  }
  return args
}

debug.formatArgs = formatArgs

const prefix = 'app-api:'

function createLogger(context) {
  const ctxPrefix = prefix + context
  const loggers = {
    trace: debug(ctxPrefix + ':trace'),
    debug: debug(ctxPrefix + ':debug'),
    info: debug(ctxPrefix + ':info'),
    warn: debug(ctxPrefix + ':warn'),
    error: debug(ctxPrefix + ':error')
  }
  return loggers
}

export default createLogger
