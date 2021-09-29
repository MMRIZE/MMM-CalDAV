const { createDAVClient, DAVNamespace } = require('tsdav')
const fetch = require('node-fetch')
const path = require('path')
const fs = require('fs')

var NodeHelper = require('node_helper')

class Fetcher {
  constructor(config, expressApp) {
    this.config = config
    this.timeer = null
    this.vevents = ''

    var serveURL = `/CALDAV/${this.config?.name}.ics`

    expressApp.get(serveURL, (req, res) => {
      var filePath = path.resolve(__dirname, 'public', this.config.name + '.ics')
      try {
        if (fs.existsSync(filePath)) {
          res.sendFile(filePath)
        } else {
          res.send(this.ical())
        }
      } catch (e) {
        console.error(e)
      }
    })
    console.log(`CalDAV : Serving - ${serveURL}`)

    this.work()
  }

  async work () {
    clearTimeout (this.timer)
    this.timer = null

    var vevents = ''
    const { serverUrl, credentials } = this.config

    const client = await createDAVClient({
      serverUrl,
      credentials,
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    })

    const url = new URL(serverUrl)
    var urls = []
    const calendars = await client.fetchCalendars()
    const calendarFilter = this.config?.calendarFilter || []
    for (let calendar of calendars) {
      if (Array.isArray(calendarFilter) && calendarFilter.length > 0 && !calendarFilter.includes(calendar.displayName)) continue
      const objects = await client.calendarQuery({
        url: calendar.url,
        props: [{ name: 'getetag', namespace: DAVNamespace.DAV }],
        filters: [
          {
            type: 'comp-filter',
            attributes: { name: 'VCALENDAR' },
          },
        ],
        depth: '1',
      })

      urls = [...urls, ...objects.reduce((result, o) => {
        if (o.href) result.add(url.origin + o.href)
        return result
      }, new Set())]
    }

    for (let u of urls) {
      let auth = "Basic " + Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')
      let headers = {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "Authorization": auth
      }
      const response = await fetch(u, {
        method: 'GET',
        headers,
      })
      var text = await response.text()
      text = text.slice(text.search('BEGIN:VEVENT'))
      text = text.slice(0, text.search('END:VEVENT') + 10)
      vevents += text + '\r\n'
    }
    if (vevents.trim()) {
      console.log(`CalDAV: '${this.config.name}' has valid events.`)
      this.vevents = vevents
      this.writeICAL()
    }
    this.timer = setTimeout( async () => {
      await this.work()
    }, this.config.updateInterval)
    return
  }

  writeICAL () {
    var filePath = path.resolve(__dirname, 'public', this.config.name + '.ics')
    fs.writeFile(filePath, this.ical(), (err) => {
      if (err) {
        console.error(err)
        return
      }
      console.log(`CalDAV : ${this.config.name} is refreshed.`)
    })
  }

  ical () {
    if (!this.config.vcalendarHeader) return this.vevents
    return `BEGIN:VCALENDAR
PRODID:-//davical.org//NONSGML AWL Calendar//EN
VERSION:2.0
CALSCALE:GREGORIAN
X-WR-CALNAME:${this.config.name}
${this.vevents}END:VCALENDAR`
  }
}


module.exports = NodeHelper.create({
  start: function () {
    this.config = {}
    this.vevents = ''
    this.timer = null
    this.seed = Math.random()
    this.fetchers = []
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === 'REGISTER') {
      this.fetchers.push(new Fetcher(payload, this.expressApp))
    }
  },
})