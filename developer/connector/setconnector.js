const builder = require('botbuilder')

module.exports = [
  // ask for existing connector
  (session) => {
    if (session.userData.devMode) {
      builder.Prompts.confirm(session, 'Do you have an existing Hue connector(s)?')
    }
    else {
      session.send('Developer mode must be activated to use this function. You can say \'Dev Mode\'')
      session.endDialog()
    }
  },
  // parse response
  (session, results) => {
    results.response ? session.beginDialog('connect_connector') : session.beginDialog('create_connector')
  }
]
