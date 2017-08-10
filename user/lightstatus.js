const builder = require('botbuilder')
const helpers = require('../helpers');
const _ = require('lodash')

module.exports = [
  // get requested light
  (session) => {
    helpers.getAllLights(session, () => {
      builder.Prompts.text(session, 'What\'s the name of the light you want to know about?')
    })
  },
  // find light
  helpers.findLight,
  // light status
  (session) => {
    session.send(session.dialogData.foundLight.name + ' is ' + session.dialogData.foundLight.state)
  }
]
