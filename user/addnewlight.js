const builder = require('botbuilder')
const _ = require('lodash')
const request = require('request')
const helpers = require('../helpers');

module.exports = [
  // add new light
  (session) => {
    if (!session.userData.bridgeInfo) {
      session.beginDialog('no_bridge')
    }
    else
    {
      helpers.discoverNewLight(session, helpers.getNewLights)
    }
  },
  // parse response
  (session, results) => {
    if (results.response) return session.beginDialog('setup')
    session.send('No problem. Just say \'Setup\' when you\'re ready connect a new Hue bridge')
    session.endDialog()
  }
]
