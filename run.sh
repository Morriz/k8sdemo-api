#!/usr/bin/env sh
# container entry point

export MANDRILL_KEY=$(cat /etc/secrets/mandrillkey)
export API_SECRET=$(cat /etc/secrets/apisecret)
export LOG_NODATE=true
if [ -z "$DEBUG" ]; then export DEBUG='app-api:*'; fi

echo "using env:"
env

node build/server/server.js