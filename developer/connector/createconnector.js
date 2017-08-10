const builder = require('botbuilder')
const helpers = require('../../helpers')
const async = require('async');

module.exports = [
  // create connector
  (session) => {
    helpers.getAllLights(session, () => {
      //  TODO: Hoping that authentication w/ octoblu will return user's UUID
      //  then userUUID = session.userData.UUID

      let apply_creator = async.apply(helpers.creator, session, session.userData.listOflights)
      let apply_setter = async.apply(helpers.etter, session, session.userData.listOflights)
      async.waterfall([
          apply_creator,
          apply_setter
      ], function (err, result) {
          if (err) return session.send('I ran into problem creating a connector.')
          return session.send('I have successfully created a connector for each light. You can find and download the connector(s) here https://app.octoblu.com/things/my')
      });
    })
  }
]
