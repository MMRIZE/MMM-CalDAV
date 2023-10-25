require('dotenv').config()
const app = require('express')()
const { google } = require('googleapis')

const key = process.argv[ 2 ]
if (!key) {
  console.error('Please provide key name as first argument')
  process.exit(1)
}

const clientId = process.env?.[ key + 'clientId' ]
const clientSecret = process.env?.[ key + 'clientSecret' ]
const authHost = process.env?.[ 'AUTH_authHost' ]
const authPort = process.env?.[ 'AUTH_authPort' ]

if (!clientId || !clientSecret || !authHost) {
  console.error('Please provide information for auth in .env file')
  process.exit(1)
}

const authUrl = `${authHost}:${authPort}`
const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, authUrl + '/auth')



app.get('/', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  })
  //console.log(url)
  res.writeHead(302, { Location: url })
  res.end()
})

app.get('/auth', async (req, res) => {
  const { code } = req.query
  const { tokens } = await oauth2Client.getToken(code)
  const message = `Your refresh token is: "${tokens.refresh_token}" \nPlease add it to your .env file as "${key}refreshToken".`
  console.log(message)
  res.send(message)
  res.end()
  process.exit(0)
})

app.listen(authPort)
console.log(`Server listening on ${authUrl}, When the browser is not opened, open it manually`)


import('open').then(open => open.default(authUrl))