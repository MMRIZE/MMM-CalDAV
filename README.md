# MMM-CalDAV
CalDav broker for MagicMirror

## Concept & Motivation
Some CalDAV server doesn't provide ICAL format, so it cannot be used on MM's calendar modules.

This module enables to convert your CalDAV calendar data into popular ICAL(`.ics`) file. Converted ICAL output is hosted on MM itself.

> For previous users: ~2.0 is newly rebuilt from scratch. You may need a new installation and configuration.


## Installation
```sh
cd ~/MagicMirror/modules
git clone https://github.com/MMRIZE/MMM-CalDAV
cd MMM-CalDav
npm install
```

## Update
> Before update, backup your `.env` file into somewhere safe.

```sh
cd ~/MagicMirror/modules/MMM-CalDAV
git pull
npm update
```

## Configuration
> You have to read **`.env` and Preparation** Section also.
```js
{
  module: "MMM-CalDAV", // This module works in background, so `position` is not needed.
  config: {
    timeRangeStart: -30, // Get events from 30 days before
    servers: [
      { // example of icloud or basic auth
        envPrefix: "ICLOUD_", // prefix for identifying each server
        serverUrl: "https://caldav.icloud.com", // Ask to your CALDAV provider
        targets: [
          { displayName: "Family" },
          { displayName: "Home", icsName: "home_calendar" },
          "Work",
        ],
      },
      { // example of Google Calendar.
        envPrefix: "GOOGLE_",
        serverUrl: "https://apidata.googleusercontent.com/caldav/v2/",
        authMethod: 'Oauth',
        targets: [],
        updateInterval: 1000 * 60 * 30,
      },
      { // example of synology contacts
        envPrefix: "SYNOLOGY_",
        serverUrl: "http://mynas.ddns.me:5000/carddav/USERNAME/a1234567-ef5b-4d4a-b742-9d3e5886d229"
        targets: [ "Team Contacts", "Partners"]
      },
    ],
  }
},
```
- event

Then it will provide the ICAL URL like;
```
http://localhost:8080/CALDAV/ICLOUD_Family.ics
http://localhost:8080/CALDAV/ICLOUD_home_calendar.ics
http://localhost:8080/CALDAV/ICLOUD_Work.ics
http://localhost:8080/CALDAV/SYNOLOGY_Team_Contacts.ics
...
```
The Generated URL will have a sanitized-safe filename/url. For example the calendar name `회사` will be converted to `_ED_9A_8C_EC_82_AC`. So It's better to use `icsName` to avoid it and to get an easier name if you are a non-English user.

Each calendar would prepend `envPrefix` in the front of the filename to distinguish each other easily. (like `ICLOUD_xxx.ics`)

You can use the URL as a feed of the calendar module(e.g. default calendar module)
```js
{
  module: "calendar",
  position: "top_left",
  config: {
    servers: [
      {
        symbol: "calendar-check",
        url: "http://localhost:8080/CALDAV/ICLOUD_Family.ics",
        auth: { // REQUIRED
          user: 'username1', // DEFINED in .env file.
          pass: 'password1',
          method: 'basic'
        }
      },
...
```
The real extracted & parsed result will be stored under `modules/MMM-CalDAV/service` as a hidden `.ics` file. If you need to reset the previously stored data, just delete them there.

### Config options
#### Global
|**Field**|**Default**|**Description**|
|---|---|---|
|`servers`|[]|**REQUIRED** Array of CalDAV server|
|`updateInterval`|900000| (ms) Interval to rescan and update the result. <br>Default value is 15 minutes.|
|`timeRangeStart`|-365| (days) Get the events before these days from today.|
|`timeRangeEnd`|365| (days) Get the events until these days since today.|

- `updateInterval`, `timeRangeStart`, `timeRangeEnd` could be overridden in each server.
- `timeRangeStart` and `timeRangeEnd` will be ignored in `accountType: 'carddav'`.


#### Server (for **CALDAV**)
|**Field**|**Default**|**Description**|
|---|---|---|
|`accountType` | 'caldav' | **REQUIRED** To retrieve normal calendar events. |
|`envPrefix`| 'DEFAULT_'| **REQUIRED** To match `.env` variables, each server should have unique one.|
|`serverUrl`| '' | **REQUIRED** CalDAV service url of the server.|
|`authMethod`| 'Basic'| For Google Calendar, use `'Oauth'`|
|`timeRangeStart`| config value | You can override speicfic days for this server.|
|`timeRangeEnd`| config value | You can override speicfic days for this server.|
|`updateInterval`| config value | You can override the specific interval for this server.|

#### Server (for **CARDDAV** - Birthday calendar from contacts/address book)
|**Field**|**Default**|**Description**|
|---|---|---|
|`accountType` | 'carddav' | **IMPORTANT/REQUIRED** To get birthday events from addressbook. |
|`envPrefix`| 'DEFAULT_'| **REQUIRED** To match `.env` variables, each server should have unique one.|
|`serverUrl`| '' | **REQUIRED** CardDAV service url of the server. It may different with `CalDAV` endpoint.|
|`authMethod`| 'Basic'| For Google Calendar, use `'Oauth'`|
|`updateInterval`| config value | You can override the specific interval for this server.|
|`targets`| [] | (Array of string/object) addressBook filter by its name. [] would be all addressBooks. |

There would be more properties, but 99.99% of users would not need them.


#### `targets` array
`targets: [ ... ]` array could have string(the name of calendar/addressBook) or object(A pair of original calendar/addressBook name and the result ics name)
```js
envPrefix: 'SOME_', // for example.

targets: [ "Family", "Work" ], // Get events from "Family" and "Work" calendar/addressBook then will serve them as "SOME_Family.ics" and "SOME_Work.ics"
// or
targets: [
  { displayName: "Family", icsName: "private" }, // Get events from "Family" calendar/addressBook then will serve them as "SOME_private.ics"
  { displayName: "Work", icsName: "company" }, // Get events from "Work" calendar/addressBook then will serve them as "Some_company.ics"

],

targets: [], // Get events from all calendars/addressBooks then will serve them as "SOME_ORIGINALNAME.ics"
```
> Some CardDAV provider doesn't support `displayName`. in that case, the birthday calendar of that will be served as "SOME_untitled.ics"

> The birthday list from Google is already possible by natural. So, you don't care about `CardDAV` of Google. Seek a calendar which has `Birthdays` as `displayName` in your result.


## `.env` & Preparation
For the security issue, this module is using `.env` file to store some secret data.

Open `.env` file in module directory. (If not exists, copy one from `env.example`)
Remove `#` from a line commented-out you need.

### COMMON
```.env
CALDAV_SERVICE_USERNAME=username1
CALDAV_SERVICE_PASSWORD=password1
```
**REQUIRED**
- CALDAV_SERVICE_USERNAME : Used for generated .ics auth in the calendar parser.
- CALDAV_SERVICE_PASSWORD : Used for generated .ics auth in the calendar parser

```js
// default calendar module.
{
  module: "calendar",
  position: "top_left",
  config: {
    calendars: [
      {
        symbol: "calendar-check",
        url: "http://localhost:8080/CALDAV/ICLOUD_Family.ics",
        auth: { // REQUIRED
          user: 'username1', // <= used here
          pass: 'password1', // <= used here
          method: 'basic'
        }
      },
...
```



### For Apple (ICLOUD) calendar
You need `app-specific password` to use this module. Read [this](https://support.apple.com/en-us/102654)
```env
# .env
ICLOUD_username=username@icloud.com
ICLOUD_password=abcd-efgh-ijkl-mnop
```

```js
// MMM-CalDAV config in config.js
config: {
  servers: [
    {
      envPrefix: 'ICLOUD_', // prefix for identifying each server
      serverUrl: 'https://caldav.icloud.com', // for normal calendar
      ...
```

### For Apple (ICLOUD) birthdays
```js
config: {
  servers: [
    {
      accountType: 'carddav',
      envPrefix: "ICLOUD_", // prefix for identifying server. You can share this with iCloud CalDav
      serverUrl: 'https://contacts.icloud.com', // for birthday list
      ...
```

### For Yahoo calendar
You need `third-party app password`. [Here](https://help.yahoo.com/kb/enter-yahoo-generated-password-sln15241.html)
Then rest setup would be similar to Apple.
- serverUrl: https://caldav.calendar.yahoo.com
> Yahoo doesn't support `CardDAV` anymore.

### For FastMail
https://www.fastmail.help/hc/en-us/articles/1500000278342
- serverUrl: https://caldav.fastmail.com/
- serverUrl for CardDAV : https://carddav.fastmail.com/
Then the rest setup would be similar to Apple.

### For General CalDAV servers using basic Auth (e.g. Synology NAS, NextCloud, ...)
- serverUrl: Ask to the system admin or user manual.
Then rest setup would be similar to Apple.

### For Google calendar
Google request **OAuth2** authentification to use the calendar data.
1. Go to [Google Dev console](https://console.developers.google.com/).
2. Create a new project or select existing project.
3. MENU > `APIs & Services` > `Library`; Search `CalDAV API` then enaable API for your project.
4. MENU > `APIs & Services` > `credentials`; Create a credentials(`OAuth Client Id` for `Desktop app`)
5. Only you need is `Client ID` and `Client Secret`, just remember them. All other properties or options are not so important.
(You may have to register the user who will use this module for his/her calendars in `Testing` status)

6. Fill the below values;
```env
# .env

AUTH_authHost=http://localhost
AUTH_authPort=3000

GOOGLE_tokenUrl=https://accounts.google.com/o/oauth2/token
GOOGLE_username=user@gmail.com
GOOGLE_clientId=99999999-abcd1234h92het5hsfbec5c3dnifeo9c.apps.googleusercontent.com
GOOGLE_clientSecret=AAAAA-abcd1234uLweeQL2mwHMuWMxXwIA
GOOGLE_refreshToken=
```
For `AUTH_authHost` and `AUTH_authPort`, you don't have to modify these values generally. These values will be used in `google_auth.js`

You have to fill `XXXX_username`, `XXXX_clientId`, `XXXX_clientSecret` with your previous preparation for Google OAuth. and you don't need to fill `refreshToken` at this moment. In this example, `GOOGLE_` is used as server prefix.

7. Then, execute `google_auth.js`
```sh
cd ~/MagicMirror/modules/MMM-CalDAV
node google_auth.js GOOGLE_
```
You are using `GOOGLE_` as server environment prefix, so add it as a parameter.

It will open a browser, then start authentification.
After authentification, you can get `refreshToken`, Fill that into your `.env` file.
```
% node google_auth.js GOOGLE_

Server listening on http://localhost:3000, When the browser is not opened, open it manually
Your refresh token is: "1//09AbCdEfGh30tCgYIARAAGAkSNwF-L9IrUHWoAvpHPzQ_LYybJZbo8pjG_oCdfWc33lu5alklJgeUWLAfCCRhbCfa7IgAbCdEfGh"
Please add it to your .env file as "GOOGLE_refreshToken".
```

8. Fill remaining refreshToken value.
```env
# .env

AUTH_authHost=http://localhost
AUTH_authPort=3000

GOOGLE_tokenUrl=https://accounts.google.com/o/oauth2/token
GOOGLE_username=user@gmail.com
GOOGLE_clientId=99999999-abcd1234h92het5hsfbec5c3dnifeo9c.apps.googleusercontent.com
GOOGLE_clientSecret=AAAAA-abcd1234uLweeQL2mwHMuWMxXwIA
GOOGLE_refreshToken=1//09AbCdEfGh30tCgYIARAAGAkSNwF-L9IrUHWoAvpHPzQ_LYybJZbo8pjG_oCdfWc33lu5alklJgeUWLAfCCRhbCfa7IgAbCdEfGh
```

9. Then you can configure your module config like this;
```js
// MMM-CalDAV config in config.js
config: {
  servers: [
    {
      envPrefix: "GOOGLE_", // prefix for identifying each server
      serverUrl: "https://apidata.googleusercontent.com/caldav/v2/",
			authMethod: 'Oauth', // <= IMPORTANT
      ...
```
> Thankfully, Google provide Birthday of contacts as calendar by default. You can find `Birthdays` calendar in the result. Or specify it with `displayName:'Birthdays'`

### Multi servers.
You can add more servers. Just keep the prefixes.
```env
# .env
SERVER1_username=john.doe@icloud.com
SERVER1_password=abcd-efgh-ijkl-mnop

SERVER2_username=johndoe1234
SERVER2_password=abcd1234
```

```js
// MMM-CalDAV config
servers: [
  {
    envPrefix: "SERVER1_",
    serverUrl: "https://caldav.somewhere.com",
  },
  {
    envPrefix: "SERVER2_",
    serverUrl: "https://otherwhere.com/caldav",
  },
],

```

## Not a bug but,...
- Connecting to CalDAV server and getting calendar data might take some time. So on the first bootup after installation of this module, the calendar module could not load any data. Please wait a while for the next updating cycle. After the first ICAL file, the events will be reflected on the next calendar's update time regardless of rebooting.
- I have not tested all the possible CalDAV servers. So if you can find any issue on the various CalDAVs, feel free to make a PR for it.
- For the purpose of this module, the generated `.ics` is designed to be hidden and not accessible without auth intentionally. You should use `CALDAV_SERVER_USERNAME` and `CALDAV_SERVER_PASSWORD` with `Basic` auth to access that URL.
- If the name of generated `.ics` is duplicated, it will be overwritten. Separate them with `icsName` by manual.
- At this moment, all address books will be retrieved. Filtering is not supported. (I need help to get real examples to know the multi-addressbooks structure.)



## Release
### `2.1.0` (2023-12-29)
- Birthday calendar enabled. (`CardDAV` implementation)
- Some code refactoring.
- `calendars: [],` is changed to `targets: []`. you have to reconfigure your `config.js`

### `2.0.0` (2023-10-25)
- Newly rebuilt from scratch
- OAUTH supported (For Google Calendar)
- Multi calendars/servers in one module.
- More secure and efficiently

### `1.0.0` (2021-09-29)
- released

## Author
- Seongnoh Yi (eouia0819@gmail.com)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/Y8Y56IFLK)
