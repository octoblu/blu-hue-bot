const builder = require('botbuilder')
const request = require('request');
const auth = require('../auth');
module.exports = [
  // switch light
  (session, foundLight) => {
    if (!foundLight.uuid) {
      session.send('This light is not connected to a connector yet. Let\'s connect it.')
      session.beginDialog('set_connector')
    }
    request.put('https://' + session.userData.UUID + ':' + session.userData.TOKEN + '@meshblu.octoblu.com/devices/' + foundLight.uuid, {json: {desiredState: {on: true}}}, (error, response, body) => {
      if (error) return session.send('I ran into problem switching the light through Octoblu.')
      auth.updateUserData(session, (error, success) => {
        if (error) return console.log(new Error(error));
      })
      session.send('I have successfully switched the light ' + foundLight.state === 'on' ? 'off' : 'on')
    })
  }
]
