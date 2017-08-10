const builder = require('botbuilder')
const request = require('request');

module.exports = [
  // get flow name
  (session) => {
    builder.Prompts.text(session, 'What\'s the name of the flow you want to activate?')
  },
  // find flow
  (session, results) => {
    let nameOfFlow = results.response
    //  TODO: listOfflows.include(nameOfFlow) ? get id : request octoblu
    request.get('https://' + session.userData.UUID + ':' + session.userData.TOKEN + '@api.octoblu.com/api/flows', (err, res, body) => {
      console.log(JSON.parse(body)[0]['_id'])
      let responseBody = JSON.parse(body)
      let flow = _.find(responseBody, {name: nameOfFlow})
      session.userData.listOfflows[flow['_id']] = {
        name: flow.name,
        id: flow['_id'],
        flowId: flow.flowId
      }
    })
  },
  // activate flow
  (session) => {
    request.post('https://nanocyte-flow-deploy.octoblu.com/flows/' + session.dialogData.flowID + '/instances', (error, response, body) => {
      if (error) return session.send('I ran into error activating that flow.')
      session.send('I successfully activated the flow')
    })
  }
]
