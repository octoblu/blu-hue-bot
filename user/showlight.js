const builder = require('botbuilder')
const _ = require('lodash')
const helpers = require('../helpers');

module.exports = [
  // showLights
  (session) => {
    //  update local listOflights first
    helpers.getAllLights(session, () => {
      let listOflights = session.userData.listOflights
      if (!listOflights || _.isEmpty(listOflights)) {
        session.send('There are no lights connected to your Hue bridge.')
        session.endDialog()
      }
      let response = ''
      _.forEach(listOflights, (value, key) => {
        response += value.name + ' is ' + value.state + '\n'
      })
      session.send(response)
    })
  },
  // parse response
  (session, results) => {
    if (results.response) return session.beginDialog('setup')
    session.send('No problem. Just say \'Setup\' when you\'re ready connect a new Hue bridge')
    session.endDialog()
  }
]
