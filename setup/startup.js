const builder = require('botbuilder')

module.exports = [
  // get user's name
  (session) => {
    builder.Prompts.text(session, 'Hi there, I\'m HueBot. What\'s your name?')
  },
  // set user's name
  (session, results, next) => {
    // TODO: write to database
    session.userData.name = results.response
    session.send('Hi ' + session.userData.name + ', let\'s connect your Hue bridge.')
    next()
  },
  // request bridges
  (session) => {
    // find all the bridges within the current WiFi
    console.log('HELL YEAH');
    session.beginDialog('get_bridges')
  },
  // Set User's Bridge
  (session, results) => {
    if (results.bridge) {
      session.userData.bridgeInfo = results.bridge
      session.send('I found your bridge.')
      session.endDialog()
    }
    else
    {
      session.send(results.error)
      session.endDialogWithResult(results)
    }
  }
]
