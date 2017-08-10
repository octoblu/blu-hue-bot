const builder = require('botbuilder')
const request = require('request')
const _ = require('lodash')

module.exports = [
  // get bridges
  (session, results) => {
    session.send('I\'m searching for Hue bridges on this WiFi.')
    request.get('https://www.meethue.com/api/nupnp', (error, response, body) => {
      if (error) {
        results = { error: error.message }
        session.endDialogWithResult(results)
      }

      const responseBody = JSON.parse(body)

      if (_.isEmpty(responseBody)) {
        results = { error: 'I couldn\'t find any Hue bridge on this WiFi. \n Say \'Setup\' when new bridge is available.' }
        session.endDialogWithResult(results)
      }
      else
      {
        results = { bridges: _.filter(responseBody, 'internalipaddress') }
        //  pass the bridges found to next stack and return one bridge
        session.beginDialog('get_user_bridge', results)
      }
    })
  },
  // return user bridge
  (session, results) => {
    // would return the one bridge pushed
    session.endDialogWithResult(results)
  }
]
