const builder = require('botbuilder')
const request = require('request')
const auth = require('../auth');

module.exports = [
  // ask to setup
  (session, foundLight, newName) => {
    if (!foundLight.uuid) {
      session.send('This light is not connected to a connector yet. Let\'s connect it.')
      session.beginDialog('set_connector')
    }
    request.put('https://' + session.userData.UUID + ':' + session.userData.TOKEN + '@meshblu.octoblu.com/devices/' + foundLight.uuid, {json: {name: newName}}, (error, response, body) => {
      if (error) return session.send('I ran into problem changing the light\'s name through Octoblu.')
      session.send('I have successfully changed the light\'s name to ' + newName)
      auth.updateUserData(session, (error, success) => {
        if (error) return console.log(new Error(error));
      })
    })
  }
]
