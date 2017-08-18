const builder = require('botbuilder')
const auth = require('../auth');

module.exports = [
  // get user's name
  (session) => {
    builder.Prompts.text(session, 'Hi there, I\'m HueBot. What\'s your name?')
  },
  // set user's name
  (session, results, next) => {
    session.userData.name = results.response
    session.send('Hi ' + session.userData.name + ', let\'s connect your Hue bridge.')
    next()
  },
  // request bridges
  (session) => {
    // find all the bridges within the current WiFi
    session.beginDialog('get_bridges')
  },
  // Set User's Bridge
  (session, results) => {
    if (results.bridge) {
      session.userData.bridgeInfo = results.bridge
      session.send('I found your bridge.')
      auth.updateUserData(session, (error, success) => {
        if (error) return console.log(new Error(error));
        session.endDialog()
      })
    }
    else
    {
      session.send(results.error)
      session.endDialogWithResult(results)
    }
  }
]
