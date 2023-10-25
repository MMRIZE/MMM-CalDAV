Module.register('MMM-CalDAV', {
  defaults: {
    updateInterval: 15 * 60 * 1000,
    timeRangeStart: -365,
    timeRangeEnd: 365,
    servers: [],
  },


  start: function () {
    const defaultServer = {
      envPrefix: 'DEFAULT_',
      serverUrl: 'https://INVALIDCALDAVSERVER.com',
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
      calendars: [],
      timeRangeStart: this.config.timeRangeStart,
      timeRangeEnd: this.config.timeRangeEnd,
      expand: true,
      useMultiGet: true,
      updateInterval: this.config.updateInterval,
      credentials: {},
    }
    this.config.servers = this.config.servers.map((server) => {
      if (!Array.isArray(server.calendars)) server.calendars = []
      const calendars = server.calendars.map((calendar) => {
        if (typeof calendar === 'string') calendar = { displayName: calendar }
        return (typeof calendar === 'object' && calendar?.displayName) ? { ...{ icsName: encodeURIComponent(calendar.displayName)}, ...calendar } : {}
      })
      return { ...defaultServer, ...server,  calendars}
    })
    this.sendSocketNotification('REGISTER', this.config)
  },
})