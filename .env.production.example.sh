#!/bin/bash

# copy to e.g. https://app.netlify.com/sites/ytsub-v3-hiro18181/settings/deploys#environment

# https://app.planetscale.com
echo 'export APP_MYSQL_HOST=xxx'
echo 'export APP_MYSQL_DATABASE=xxx'
echo 'export APP_MYSQL_USER=xxx'
echo 'export APP_MYSQL_PASSWORD=xxx'
echo 'export APP_MYSQL_SSL=true'

# openssl rand -hex 32
echo 'export APP_SESSION_SECRET=d30eed9c045e6f54377860da2a8384341d3125623b3a5fa02c88d8bc3753ec17'

# https://www.google.com/recaptcha/admin
echo 'export APP_RECAPTCHA_CLIENT_KEY=xxx'
echo 'export APP_RECAPTCHA_SERVER_KEY=xxx'
