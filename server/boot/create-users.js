import createLogger from '../../common/lib/log'
const log = createLogger('createDummyUsers')
const users = [
  {
    id: '123456789a00000000000000',
    name: 'masteradmin',
    email: 'testadmin@your.com',
    password: 'Youizso@dm1nn-',
    type: 'admin',
  },
  {
    id: '123456789a00000000000001',
    name: 'testuser1',
    email: 'testuser1@your.com',
    password: 'Testuser-#01',
    type: 'user',
  },
  {
    id: '123456789a00000000000002',
    name: 'testuser2',
    email: 'testuser2@your.com',
    password: 'Testuser-#02',
    type: 'user',
  },
  {
    id: '123456789a00000000000003',
    name: 'testuser3',
    email: 'testuser3@your.com',
    password: 'Testuser-#03',
    type: 'user',
  },
  {
    id: '123456789a00000000000004',
    name: 'testuser4',
    email: 'testuser4@your.com',
    password: 'Testuser-#04',
    type: 'user',
  },
  {
    id: '123456789a00000000000005',
    name: 'testuser5',
    email: 'testuser5@your.com',
    password: 'Testuser-#05',
    type: 'user',
  }
]

export default (app) => {
  log.debug('creating dummy user data if it does not yet exist')
  const AppUser = app.models.AppUser
  const Role = app.models.Role
  const RoleMapping = app.models.RoleMapping

  users.forEach(_user => {

    function createUser(user) {
      user.isAutoCreated = true
      user.emailVerified = true
      const type = user.type
      delete user.type
      log.debug('creating user: ', user)
      try {
        AppUser.create(user)
          .then(usr => {
            log.debug('created user: ', usr)
            if (type === 'admin') Role.create({name: 'admin'})
              .then(role => role.principals.create({
                principalType: RoleMapping.USER,
                principalId: usr.id
              }).then(principal => log.debug('created admin user: ', usr.username)))
          })
          .catch(err => log.error('error creating user: ', err))
      } catch (e) {
        log.error(e)
      }
    }

    // only create if applicable
    AppUser.findById(_user.id).then(usr => {
      if (!usr) createUser(_user)
      else {
        log.debug('found existing user: ', usr)
        if (process.env.TESTMODE) {
          // first delete user
          AppUser.destroyById(_user.id)
            .then(() => createUser(_user))
            .catch(err => log.error('error removing user: ', err))
        }
      }
    })
  })
}
