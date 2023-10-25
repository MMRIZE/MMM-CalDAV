const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })
const { DAVClient, DAVNamespace } = require('tsdav')
const fs = require('fs').promises
const createReadStream = require('fs').createReadStream
const existsSync = require('fs').existsSync
const basicAuth = require('express-basic-auth')
const express = require('express')

var NodeHelper = require('node_helper')
const e = require('express')
const { exists } = require('fs')

class Fetcher {
  constructor(options) {
    const prefix = options.envPrefix || ''
    const credentials = Object.entries(process.env).reduce((res, [ key, value ]) => {
      if (key?.startsWith(prefix)) {
        res[ key.slice(prefix.length) ] = value
      }
      return res
    }, {})

    this.options = { ...options, credentials }
    this.timer = null
    try {
      this.work(options)
    } catch (e) {
      console.error(e)
    }
  }

  async work(options) {
    clearTimeout(this.timer)
    this.timer = null

    console.log(`[CALDAV] Fetching ${this.options.envPrefix} ...`)

    const { serverUrl, credentials, authMethod, defaultAccountType, timeRangeStart, timeRangeEnd, expand, useMultiGet, calendars } = this.options
    const client = new DAVClient({
      serverUrl,
      credentials,
      authMethod,
      defaultAccountType,
      expand,
      useMultiGet,
    })

    const buildVcalendar = (vevents, displayName) => {
      return `BEGIN:VCALENDAR
${vevents}
END:VCALENDAR`
    }

    const today = new Date()
    console.log(timeRangeStart, timeRangeEnd)
    const start = new Date(new Date(today.valueOf()).setDate(today.getDate() + timeRangeStart)).toISOString()
    const end = new Date(new Date(today.valueOf()).setDate(today.getDate() + timeRangeEnd)).toISOString()

    try {
      await client.login()
      const fetchedCalendars = await client.fetchCalendars()
      for (let calendar of fetchedCalendars) {
        if (Array.isArray(calendars) && calendars.length > 0 && !calendars.some(c => c.displayName === calendar.displayName)) continue
        const objects = await client.fetchCalendarObjects({
          calendar,
          timeRange: { start, end },
          expand,
          useMultiGet,
        })

        const icsName = encodeURI((calendars[ calendars.findIndex(c => c.displayName === calendar.displayName) ]?.icsName || calendar.displayName)).replace(/[^\w\s]/g, '_') + '.ics'
        console.log(`[CALDAV] ${calendar.displayName}(${icsName}) has ${objects.length} events`)
        const vevents = objects.reduce((result, { data }) => {
          const txt = data.toString()
          // extract all BEGIN:VEVENT ... END:VEVENT in txt
          const regex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/gm
          const matches = txt.match(regex)
          if (matches) {
            return result + matches.join('\r\n') + '\r\n'
          } else {
            return result
          }
        }, '')

        var filePath = path.resolve(__dirname, 'service', '.' + icsName)
        await fs.writeFile(filePath, buildVcalendar(vevents, calendar.displayName))
        console.log(`[CALDAV] ${icsName} is refreshed.`)
      }
      this.timer = setTimeout(() => {
        console.log(`[CALDAV] Try to refresh... ${options.envPrefix} ...`)
        this.work(options)
        return
      }, options.updateInterval)
    } catch (e) {
      clearTimeout(this.timer)
      this.timer = null
      console.error(e)
    }
    return
  }
}

module.exports = NodeHelper.create({
  start: function () {
    this.config = {}
    this.vevents = ''
    this.timer = null
    this.seed = Math.random()
    this.fetchers = []

    this.expressApp.get('/CALDAV/:file', (req, res, next) => { 
      console.log('CALDAV', req.params.file)
      const requested = req.params.file
      const realFile = '.' + requested
      const auth = req.get('Authorization')
      if (!auth) {
        console.log("[CALDAV] NO AUTH")
        res.set('WWW-Authenticate', 'Basic realm="MMM-CalDAV Service"')
        return res.status(401).send()
      }
      const [ username, password ] = Buffer.from(auth.slice(6), 'base64').toString().split(':')
      console.log(username, password)
      if (username !== process.env.CALDAV_SERVICE_USERNAME || password !== process.env.CALDAV_SERVICE_PASSWORD) {
        console.log('[CALDAV] Invalid username or password')
        res.set('WWW-Authenticate', 'Basic realm="MMM-CalDAV Service"')
        return res.status(401).send()
      } else {
        const filePath = path.resolve(__dirname, 'service', realFile)
        console.log(filePath)
        if (existsSync(filePath)) {
          createReadStream(filePath).pipe(res)
        } else {
          console.log(`[CALDAV] ${filePath} is not found.`)
          res.status(404).send()
        }
      }
    })
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === 'REGISTER') {
      const servers = payload.servers || []
      for (let server of servers) {
        this.fetchers.push(new Fetcher(server))
      }
    }
  },
})