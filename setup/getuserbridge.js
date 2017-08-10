const builder = require('botbuilder')
const async = require('async');
const _ = require('lodash')
const helpers = require('../helpers');

module.exports = [
  // recieve bridges
  (session, args, next) => {
    session.dialogData.bridges = args.bridges
    session.send('I need you to push the button on your Hue bridge within 30 seconds. This is due to security reasons.')
    next()
  },
  // find user's bridge
  (session, results) => {
    const functionToRetry = async.apply(helpers.findBridgePushed, session.dialogData.bridges)
    async.retry({times: 4, interval: 5000}, functionToRetry, (error, bridgePushed) => {
      if (error) {
          results = {error: error }
          session.endDialogWithResult(results)
        }
      //  TODO: use '_.filter' to get array of bridges if multiple bridges are pushed
      else {
        results = { bridge: bridgePushed }
        session.endDialogWithResult(results)
      }
    })
  }
]
