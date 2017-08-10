const builder = require('botbuilder')
const request = require('request');
const _ = require('lodash')
const helpers = require('../../helpers')

module.exports = [
  // get light for connector
  (session) => {
    builder.Prompts.text(session, 'What\'s the name of the light you want to set a connector with?')
  },
  helpers.findLight,
  // get connector's name
  (session) => {
    builder.Prompts.text(session, 'What\'s the name of the connector? Note: case sensitive')
  },
  // connect light to connector
  (session, results) => {
    helpers.getConn(session, results.response, session.dialogData.foundLight, helpers.setConn)
  }
]
