# Demo Loopback Api

Built on top of [Loopback IO](http://loopback.io)

This api exposes functionality to be consumed by mobile and web devices.

## Services

You can browse the [Swagger 2.0 explorer](http://localhost:5001/explorer) to see the REST methods that are exposed, and you can directly interact with these services to see what their contracts are.

Most methods need an authenticated user, by sending a POST to
 
    http://localhost:5000/api/appusers/login
    
containing a payload like `{"email":"testuser1@your.com","password":"Testuser-#01"}`

Please see `server/boot/create-users.js` for the test users available.

Authenticated requests are expected to send the token from the login response in one of the following:
 
* params: access_token
* cookies: access_token
* headers: X-Access-Token

### Get the logged in user

    GET http://localhost:5001/api/appusers/me


