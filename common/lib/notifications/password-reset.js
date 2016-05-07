import {send} from '../../lib/notifications'

const env = process.env

/**
 * Send notification with password reset link.
 * @param user
 * @param token Temporary token
 * @returns {*}
 */
export default function notifyPasswordReset(user, token) {

  const to = {
    [user.id]: {
      user,
      name: user.name || user.email,
      metadata: {
        user_id: user.id
      },
      data: {
        password_reset_link: `${env.DOMAIN}/passwordchange/${user.id}/${token}`,
      }
    }
  }
  const options = {
    tpl: 'password-reset',
    subject: 'Reset your password',
    tags: ['authentication'],
  }
  return send(to, options)
}
