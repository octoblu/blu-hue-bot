const builder = require('botbuilder')

module.exports = [
  // ask to setup
  (session) => {
    console.log(session.conversationData);
    session.send('I see you haven\'t setup a Hue bridge yet.')
    builder.Prompts.confirm(session, 'Ready to setup one now?')
  },
  // parse response
  (session, results) => {
    if (results.response) return session.beginDialog('setup')
    session.send('No problem. Just say \'Setup\' when you\'re ready connect a new Hue bridge')
    session.endDialog()
  }
]
