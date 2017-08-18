const builder = require('botbuilder')
const email_validator = require('email-validator');
const auth = require('../auth');

module.exports = [
  // get octoblu email
  (session) => {
    builder.Prompts.text(session, 'What\'s your octoblu email?')
  },
  // activate dev mode
  (session, results) => {
    let givenEmail = results.response

    email_validator.validate_async(givenEmail, (error, isValid) => {
      if (error || !isValid) {
        session.send(givenEmail + ' is invalid.')
      }
      else {
        //  TODO: authenticate email with octoblu, if failed -> create new a/c, else -> continue
        session.userData.devMode = true
        session.send('Dev Mode is activated. I need access to a Hue Light connector for each light.')
        auth.updateUserData(session, (error, success) => {
          if (error) return console.log(new Error(error));
          session.beginDialog('set_connector')
        })
      }
    })
  },
  // commands
  (session) => {
    session.send('You can say \'start flow\', \'add new flow\'')
  }
]
