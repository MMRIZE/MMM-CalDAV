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
      targets: [],
      timeRangeStart: this.config.timeRangeStart,
      timeRangeEnd: this.config.timeRangeEnd,
      expand: true,
      useMultiGet: true,
      updateInterval: this.config.updateInterval,
      credentials: {},
    }
    this.config.servers = this.config.servers.map((server) => {
      if (server?.accountType === 'carddav') server.defaultAccountType = 'carddav'
      if (!Array.isArray(server.targets)) {
        server.targets = []
      }
      const targets = server.targets.map((target) => {
        if (typeof target === 'string') target = { displayName: target }
        return (typeof target === 'object' && target?.displayName) ? { ...{ icsName: target.displayName }, ...target } : {}
      })
      return { ...defaultServer, ...server, targets }
    })
    this.sendSocketNotification('REGISTER', this.config)
  },
})