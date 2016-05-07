import {send} from '../../lib/notifications'

const env = process.env

/**
 * Send registration email to new users.
 * @param user
 * @param token Temporary token
 * @returns {*}
 */
export default function notifyRegistrationVerification(user, token) {

  if (user.emailVerified) return Promise.resolve()

  const to = {
    [user.id]: {
      user,
      name: user.name || user.email,
      metadata: {
        user_id: user.id
      },
      data: {
        activation_link: `${env.DOMAIN}/register/verify/${user.email}?uid=${user.id}&token=${token}`,
      }
    }
  }
  const options = {
    tpl: 'registration-activation',
    subject: 'Welcome to YourAppName',
    tags: ['registration'],
  }
  return send(to, options)
}
