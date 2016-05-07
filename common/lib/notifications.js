import createLogger from '../lib/log'
const log = createLogger('notifications')
import cnf from '../lib/config'
import {errors, getError} from '../lib/error'
import loopback from '../../server/server'
import {getLocale, __} from 'i18n'
import _ from 'lodash'
import moment from 'moment'
import mandrill from 'mandrill-api/mandrill'

const env = process.env
const mandrillClient = new mandrill.Mandrill(env.MANDRILL_KEY, !!env.DEBUG)

/**
 * Inflate rcpt.user from id if it is needed.
 * @param to Hash of id => rcpt
 * @returns {*}
 */
function inflateUsers(to) {

  const userIds = _.map(to, (rcpt, id) => {
    if (!rcpt.user) return id
  })
  if (userIds.length) log.debug('inflating users: ', userIds)
  return loopback.models.AppUser.find({where: {id: {inq: userIds}}})
    .then(users => {
      log.debug('found users: ', users)
      _.each(users, user => {
        log.debug('found user: ', user)
        const rcpt = to[user.id]
        log.debug('attaching to rcpt: ', rcpt)
        rcpt.user = user
      })
      return to
    })
}

export function send(to, options) {

  log.info('sending %s notifications', options.tpl)
  return new Promise((resolve, reject) => {
    inflateUsers(to)
      .then(() => {
        sendEmail(to, options).then(resolve)
        // @todo: send other notifications? like push?
      })
      .catch(e => {
        log.error(e)
        reject(e)
      })
  })
}

export function sendEmail(to, {tpl, subject, data = {}, tags, content}) {

  const localizedTo = _.reduce(to, (res, rcpt) => {
    const locale = rcpt.user.locale
    if (!res[locale]) res[locale] = []
    res[locale].push(rcpt)
    return res
  }, {})

  log.debug('sending %s emails - localized', tpl, localizedTo)
  return Promise.all(_.map(localizedTo, (localizedBlock, locale) => {
    const tplName = `${tpl}-${locale}`
    const msg = {
      ...cnf.mandrill.defaults,
      subject: typeof subject === 'function' ? subject(locale) : subject,
      from_name: __({phrase: 'The YourAppName Team', locale}),
      tags: tags,
      global_merge_vars: _.map(data, (val, key) => ({
        name: key,
        content: val
      })),
      to: [],
      merge_vars: [],
      recipient_metadata: [],
    }
    localizedBlock.forEach(item => {
      msg.to.push({
        email: item.user.email,
        name: item.name,
        type: 'to'
      })
      msg.recipient_metadata.push({
        rcpt: item.user.email,
        values: item.metadata
      })
      msg.merge_vars.push({
        rcpt: item.user.email,
        vars: _.map(item.data, (val, key) => ({
          name: key,
          content: val
        }))
      })
    })
    log.debug('msg: %j', msg)
    return new Promise((resolve, reject) => {
      mandrillClient.messages.sendTemplate({
        template_name: tplName,
        template_content: content || [],
        message: msg,
        async: false
      }, response => {
        log.debug('sccessfully sent %s emails: ', tpl, response)
        resolve()
      }, err => {
        log.error('error sending %s emails: ', tpl, err)
        reject(err)
      })
    })
  }))
}