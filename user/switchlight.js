const builder = require('botbuilder')
const helpers = require('../helpers');
const request = require('request');
const _ = require('lodash')

module.exports = [
  // get light to switch
  (session) => {
    helpers.getAllLights(session, () => {
      builder.Prompts.text(session, 'What\'s the name of the light you want to switch?')
    })
  },
  helpers.findLight,
  // switch light
  (session) => {
    if (session.userData.devMode) session.beginDialog('dev_switch_light', session.dialogData.foundLight)
    let light = session.dialogData.foundLight
    let ipAddress = session.userData.bridgeInfo.internalipaddress
    let username = session.userData.bridgeInfo.username
    let url = 'http://' + ipAddress + '/api/' + username + '/lights/' + light.id + '/state'
    let options = {
      method: 'PUT',
      url: url,
      json: {
        "on": light.state === 'on' ? false : true
      }
    }

    request(options, (error, response, body) => {
      if (_.find(body, 'success')) {
        session.send('I have successfully switched ' + light.name + ' ' + (light.state === 'on' ? 'off' : 'on'))
      }
      else {
        session.send('I ran into problem while switching the light. Please try again.')
      }
      session.endDialog()
    })
  }
]
