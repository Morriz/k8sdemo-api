export default function enableAuthentication(app) {
  // enable authentication
  app.enableAuth()
  // allow 'me' to point to current logged in user id
  app.middleware('auth', loopback.token({
    model: app.models.accessToken,
    currentUserLiteral: 'me'
  }))
}
