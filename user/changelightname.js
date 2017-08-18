const builder = require('botbuilder')
const helpers = require('../helpers');
const _ = require('lodash')
const request = require('request');
const auth = require('../auth');

module.exports = [
  // get light to change
  (session) => {
    // {
    //  '1': { name: 'Hue Lamp 1', state: 'on' },
    // '2': { name: 'Hue Lamp 2', state: 'off' }
    // }
    helpers.getAllLights(session, () => {
      builder.Prompts.text(session, 'What\'s the name of the light you want to change?')
    })
  },
  helpers.findLight,
  // get light new name
  (session) => {
    builder.Prompts.text(session, 'What name do you want to change to?')
  },
  // set light name
  (session, results) => {
    if (session.userData.devMode) return session.beginDialog('dev_change_light_name', session.dialogData.foundLight, results.response)
    let lightID = session.dialogData.foundLight.id
    let ipAddress = session.userData.bridgeInfo.internalipaddress
    let username = session.userData.bridgeInfo.username
    let url = 'http://' + ipAddress + '/api/' + username + '/lights/' + lightID
    let options = {
      method: 'PUT',
      url: url,
      json: {
        "name": results.response
      }
    }
    request(options, (error, response, body) => {
      if (_.find(body, 'success')) {
        session.send('I have successfully change the light\'s name')
      }
      else {
        session.send('I ran into problem while changing the name. Please try again.')
      }
      auth.updateUserData(session, (error, success) => {
        if (error) return console.log(new Error(error));
        session.endDialog()
      })
    })
  }
]
