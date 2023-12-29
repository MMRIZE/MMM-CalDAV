const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })
const { DAVClient, DAVNamespace } = require('tsdav')
const vCard = require('vcard-parser')
const fs = require('fs').promises
const createReadStream = require('fs').createReadStream
const existsSync = require('fs').existsSync

var NodeHelper = require('node_helper')
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
      this.work()
    } catch (e) {
      console.error(e)
    }
  }

  async work() {
    clearTimeout(this.timer)
    this.timer = null
    const options = { ...this.options }
    const { serverUrl, credentials, authMethod, defaultAccountType, timeRangeStart, timeRangeEnd, expand, useMultiGet, targets, envPrefix } = options
    console.log(`[CALDAV] Fetching ${envPrefix} : ${defaultAccountType} ...`)

    const client = new DAVClient({
      serverUrl,
      credentials,
      authMethod,
      defaultAccountType,
      expand,
      useMultiGet,
    })

    const dateFormat = (dt) => {
      return `${dt.getFullYear()}${(dt.getMonth() + 1).toString().padStart(2, '0')}${dt.getDate().toString().padStart(2, '0')}`
    }

    const convertDate = (str) => {
      let formatted = ''
      if (/^\d{8}$/.test(str)) {
        formatted = str.replace(
          /(\d{4})(\d{2})(\d{2})/,
          '$1-$2-$3'
        )
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        formatted = str
      } else {
        formatted = new Date(str).toISOString().slice(0, 10)
      }
      return formatted
    }

    const saveIcs = async (fileId, vevents) => {
      if (vevents.length === 0) return
      const buildVcalendar = (vevents) => {
      return `BEGIN:VCALENDAR
PRODID:-//github.com/MMRIZE/MMM-CalDAV
VERSION:2.0
${vevents}
END:VCALENDAR`
      }
      const fileCoded = encodeURIComponent(fileId || 'untitled')
      let fileName = encodeURI(envPrefix + (fileCoded).replace(/[^\w\s]/g, '_') + '.ics')
      const filePath = path.resolve(__dirname, 'service', '.' + fileName)
      await fs.writeFile(filePath, buildVcalendar(vevents))
      console.log(`[CALDAV] File: ${fileName} is refreshed.`)
    }

    const inTargets = (dispName, targets) => {
      if (Array.isArray(targets) && targets.length > 0) {
        return targets.some(c => c.displayName === dispName)
      } else {
        return true
      }
    }

    try {
      await client.login()
      if (defaultAccountType === 'carddav') { //carddav
        const fetchedAddressBooks = await client.fetchAddressBooks()
        for (let addressBook of fetchedAddressBooks) {
          //console.log(addressBook) /* To help to gather addressBook info, especially displayName */
          if (!inTargets(addressBook.displayName, targets)) continue
          const birthdays = []
          const vcards = await client.fetchVCards({
            addressBook,
          })
          for (let vcard of vcards) {
            // console.log(vcard) /* To help to gather vcard info, especially data */
            const card = vCard.parse(vcard.data.toString())
            const birthday = card?.bday?.[0]?.value ?? false
            if (birthday) {
              const uid = card?.uid?.[ 0 ]?.value ?? options.envPrefix + Date.now()
              const bday = new Date(convertDate(birthday))
              const bdayEnd = new Date(bday.getFullYear(), bday.getMonth(), bday.getDate() + 1)
              const rev = new Date(card?.rev?.[ 0 ]?.value ?? Date.now())
              const fn = card?.fn?.[ 0 ]?.value ?? (card?.n?.[ 0 ]?.value).join(' ') ?? 'Unknown'


              birthdays.push(`BEGIN:VEVENT
UID:${uid}
DTSTAMP:${rev.toISOString().replace(/[-:]/g, '')}
DTSTART;VALUE=DATE:${dateFormat(bday)}
DTEND;VALUE=DATE:${dateFormat(bdayEnd)}
SUMMARY:${fn}
RRULE:FREQ=YEARLY
END:VEVENT`)
            }
          }
          const fileName = targets[ targets.findIndex(c => c.displayName === addressBook.displayName) ]?.icsName || addressBook.displayName || ''
          saveIcs(fileName, birthdays.join('\r\n'))
        }
      } else { // caldav
        const today = new Date()
        const start = new Date(new Date(today.valueOf()).setDate(today.getDate() + timeRangeStart)).toISOString()
        const end = new Date(new Date(today.valueOf()).setDate(today.getDate() + timeRangeEnd)).toISOString()

        const fetchedCalendars = await client.fetchCalendars()
        for (let calendar of fetchedCalendars) {
          if (!inTargets(calendar.displayName, targets)) continue
          const objects = await client.fetchCalendarObjects({
            calendar,
            timeRange: { start, end },
            expand,
            useMultiGet,
          })

          const vevents = objects.reduce((result, { data }) => {
            const txt = data.toString()
            const regex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/gm
            const matches = txt.match(regex)
            if (matches) {
              return result + matches.join('\r\n') + '\r\n'
            } else {
              return result
            }
          }, '')
          const fileName = targets[ targets.findIndex(c => c.displayName === calendar.displayName) ]?.icsName || calendar.displayName || ''
          saveIcs(fileName, vevents)

        }
      }
    } catch (e) {
      console.log(`[CALDAV] ${options.envPrefix} - Fetch failed. It will retry after updateInterval.`)
      //clearTimeout(this.timer)
      //this.timer = null
      console.error(e)
    } finally {
      this.timer = setTimeout(() => {
        this.work()
        return
      }, options.updateInterval)
      return
    }
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
      const requested = req.params.file
      const realFile = '.' + requested
      const auth = req.get('Authorization')
      if (!auth) {
        console.log("[CALDAV] NO AUTH")
        res.set('WWW-Authenticate', 'Basic realm="MMM-CalDAV Service"')
        return res.status(401).send()
      }
      const [ username, password ] = Buffer.from(auth.slice(6), 'base64').toString().split(':')
      if (username !== process.env.CALDAV_SERVICE_USERNAME || password !== process.env.CALDAV_SERVICE_PASSWORD) {
        console.log('[CALDAV] Invalid username or password')
        res.set('WWW-Authenticate', 'Basic realm="MMM-CalDAV Service"')
        return res.status(401).send()
      } else {
        const filePath = path.resolve(__dirname, 'service', realFile)
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