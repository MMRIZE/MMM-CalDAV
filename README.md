# MMM-CalDAV
CalDav broker for MagicMirror

## Concept & Motivation
Some CalDAV server doesn't provide ICAL format, so it cannot be used on MM's calendar modules. 

This module enables to convert your CalDAV calendar data into popular ICAL(`.ics`) file. Converted ICAL output is hosted on MM itself. 


## Installation
```sh
cd ~/MagicMirror/modules
git clone https://github.com/MMRIZE/MMM-CalDAV
cd MMM-CalDav
npm install
```

## Configuration
```js
{
  module: "MMM-CalDAV",
  config: {
    name: "company",
    serverUrl: "http://gw.mycomp.com/principals/users/eouia0819@gmail.com",
    credentials: {
      username: "eouia0819@gmail.com",
      password: "myPassWord!@#$",
    },
    vcalendarHeader: false
  }
},

// If you want additional extra CalDAV connection, just describe it once more. (or multiple times as you need.)
{
  module: "MMM-CalDAV",
  config: {
    name: "homenas",
    serverUrl: "http://mynas.synology.me:5000/caldav/eouia",
    credentials: {
      username: "eouia",
      password: "AnotherPassword!@#$",
    },
    calendarFilter: ["My Calendar", "School Schedule"]
  }
},
```

> **IMPORTANT** `name` should be *UNIQUE*.

Then it will provide the ICAL URL like;
```
https://localhost:8080/CALDAV/company.ics
https://localhost:8080/CALDAV/homenas.ics 
```
You can use this URL for your calendar modules.

The real extracted & parsed result will be stored under `modules/MMM-CalDAV/public` as `.ics` file. If you need to reset the previous stored data, delete them there.

### Config options

|**Field**|**Description**|
|---|---|
|`name`|**REQUIRED** **UNIQUE** This name would be used for ICAL filename. It should be unique. |
|`serverUrl`|**REQUIRED** CalDAV server URL for serving calendar data (Ask your CalDAV Administrator) |
|`credentials`|`username` and `password` for auth of your CalDAV server (If needed). <br/>At this moment, this module only serve `Basic` auth. (not oAuth or else.) |
|`updateInterval`| milliseconds interval to rescan and update the result. <br/> Default is `60 * 15 * 1000` (15 minutes)|
|`calendarFilter`| When your CalDAV server serve several calendars together and you need only some specific calendars not all, fulfill Array of calendar names.<br/> **Example** `calendarFilter: ["Sales Team Calendar", "My Calendar"],`. <br/> Default is `[]` (All calendars)|
|`vcalendarHeader`| Some ungenerous iCalendar parser could fails to parse some invalid VCALENDAR Header generated from specific unsmart CalDAV server. In that case, `vcalendarHeader: false` might be a help.<br/>Default is `true`|


## Not Bugs but,...
- Connecting to CalDAV server and getting calendar data might take a long time. So on the first bootup before writing the output ICAL file, the calendar module could not load any data. Please wait a while to next updating cycle. After the first storing ICAL file, the events will be reflexed on next calendar's update timne.
- I have not tested all the possible CalDAV server. So if you can find any issue on the various CalDAVs, feel free to make a PR for it. 
- At this moment only 'Basic' authentification is possible. (Welcome PR)


## Release
### **`1.0.0`** - 2021-09-29

## Author
- Seongnoh Yi (eouia0819@gmail.com)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/Y8Y56IFLK)
