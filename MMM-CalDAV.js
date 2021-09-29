Module.register('MMM-CalDAV', {
  defaults: {
    updateInterval: 15 * 60 * 1000,
    name: "default",
    serverUrl: "https://somewhere.com",
    credentials: {
      username: 'username@somewhere.com',
      password: "Password!@#$"
    },
    authMethod: 'Basic',
    calendarFilter: [],
    vcalendarHeader: true,
  },

  start: function () {
    this.sendSocketNotification('REGISTER', this.config)
  },

  notificationReceived: function (notification, payload, sender) {
    if (notification === 'DOM_OBJECTS_CREATED') {
      
    }
  }


})