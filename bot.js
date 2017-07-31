/**
A simple chat-bot that implements IoT with Octoblu services and interacts directly with end-users.
@author Koshin Mariano
@author Olu David
*/

const builder = require('botbuilder')
const { ChatConnector, UniversalBot, IntentDialog } = builder
const express = require('express')
const app = express()
const request = require('request')
const _ = require('lodash')
const async = require('async')
const email_validator = require('email-validator')
const recog = require('./recognizer')
/**
Creates a connection with botframework
*/
const connector = new ChatConnector({
  appId: process.env.APP_ID,
  appPassword: process.env.APP_PASSWORD
})
/**
A new instance of the chat-bot
*/
const bot = new UniversalBot(connector)

//  intent recognizer
recog.recog(bot, builder, connector)

/**
currentUser is a function that is triggered when the bot is initiated. It checks if a user already exists or not and directs the bot accordingly.
*/
const currentUser = (session) => {
  session.userData.UUID = '7f40525e-981f-4170-9656-95d9076d6466'
  session.userData.TOKEN = 'c64ef6296776974f56bad7f8c0e6fc7037e71703'
  if (!session.userData.name) {
    // start a new chat if current user doesn't exists
    session.beginDialog('startup')
  }
  else if (!session.userData.bridgeInfo)
  {
    // Make sure there's a Hue bridge to work with
    session.beginDialog('no_bridge')
  }
  else
  {
    //  for Testing purpose
    session.userData = null
  }
}

const isSetupSuccessfull = (session, results, next) => {
  session.userData.bridgeInfo ? next() : session.endDialog()
}

const displayCommands = (session) => {
  session.send('Here are some commands you can try: \nYou can say \'show my lights\' or \'turn on \'light 1\'\' or \' change light name\' or \' dev mode \'')
}

// On startup, go through the introduction process
bot.dialog('/', [currentUser, isSetupSuccessfull, displayCommands])

/* SETUP */

const getName = (session) => {
  builder.Prompts.text(session, 'Hi there, I\'m HueBot. What\'s your name?')
}

const setUserName = (session, results, next) => {
  session.userData.name = results.response
  session.send('Hi ' + session.userData.name + ', let\'s connect your Hue bridge.')
  next()
}

const requestBridges = (session) => {
  // find all the bridges within the current WiFi
  session.beginDialog('get_bridges')
}

const setUserBridge = (session, results) => {
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

bot.dialog('startup', [getName, setUserName, requestBridges, setUserBridge])

bot.dialog('setup', [requestBridges, setUserBridge]).triggerAction({matches: 'Setup'})

const getBridges = (session, results) => {
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
}

const returnUserBridge = (session, results) => {
  // would return the one bridge pushed
  session.endDialogWithResult(results)
}

bot.dialog('get_bridges', [getBridges, returnUserBridge])

const wannaSetup = (session) => {
  session.send('I see you haven\'t setup a Hue bridge yet.')
  builder.Prompts.confirm(session, 'Ready to setup one now?')
}

const toSetup = (session, results) => {
  if (results.response) return session.beginDialog('setup')
  session.send('No problem. Just say \'Setup\' when you\'re ready connect a new Hue bridge')
  session.endDialog()
}

bot.dialog('no_bridge', [wannaSetup, toSetup, returnUserBridge])

const receiveBridges = (session, args, next) => {
  session.dialogData.bridges = args.bridges
  session.send('I need you to push the button on your Hue bridge within 30 seconds. This is due to security reasons.')
  next()
}

const findBridgePushed = (listOfBridges, callback) => {
  //  call callback after _.forEach runs on each bridge
  let after = _.after(_.size(listOfBridges), () => {
    callback('None of the bridges I found was pushed.')
  })
  _.forEach(listOfBridges, (eachBridge) => {
    if (_.find(eachBridge, 'username')) return false
    let url = 'http://' + eachBridge.internalipaddress + '/api/'
    request.post(url, {json: {'devicetype': 'blu-hue-bot#bridge'}}, (error, response, body) => {
      if (error) callback(error)
      if (body[0]['success']) {
        eachBridge.username = body[0]['success']['username']
        callback(null, eachBridge)
      }
      else { after() }
    })
  })
}

const findUserBridge = (session, results) => {
  const functionToRetry = async.apply(findBridgePushed, session.dialogData.bridges)
  async.retry({times: 4, interval: 5000}, functionToRetry, (error, bridgePushed) => {
    if (error) {
        results = {error: error }
        session.endDialogWithResult(results)
      }
    //  TODO: use '_.filter' to get array of bridges if multiple bridges are pushed
    else {
      results = { bridge: bridgePushed }
      session.endDialogWithResult(results)
    }
  })
}

bot.dialog('get_user_bridge', [receiveBridges, findUserBridge])

/* end SETUP */

/* COMMANDS */

//Get all lights
//Get and Search for new lights
//Get light attributes
//Set light attributes
//Set light state
//Delete light
//Create group
//Setup schedules

/* NON-DEV */

const getAllLights = (session, callback) => {
  //   Make sure there's at least one bridge to work with
  if (!session.userData.bridgeInfo) {
    session.beginDialog('no_bridge')
  }
  else
  {
    let ipAddress = session.userData.bridgeInfo.internalipaddress
    let username = session.userData.bridgeInfo.username
    let url = 'http://' + ipAddress + '/api/' + username + '/lights'
    request.get(url, (error, response, body) => {
      if (error) {
        console.log('error', error);
        session.send('I ran into problem getting the lights connected to your bridge.')
        return
      }
      //  body contains the list of lights connected to the bridge
      let responseBody = JSON.parse(body)
      let listOflights = {}
      //  save the lights locally as {name: 'name', state: 'on|off' ...}
      _.forEach(responseBody, (value, key) => {
        listOflights[key] = {
          'name': value.name,
          'state': (value.state.on === true) ? 'on' : 'off',
          'id': key
        }
      })
      session.userData.listOflights = listOflights
      callback()
    })
  }
}

const findLight = (session, results, next) => {
  let nameOfLight = results.response
  let listOflights = session.userData.listOflights
  let foundLight;

  _.forEach(listOflights, (lightProps, lightID) => {
    if (foundLight) return false
    foundLight = _.includes(lightProps, nameOfLight) ? lightProps : null
  })
  if (foundLight) {
    session.dialogData.foundLight = foundLight
    next()
  }
  else
  {
    session.send('I don\'t recognize ' + nameOfLight + ' as one of your light.')
    session.endDialog()
  }
}

const showLights = (session) => {
  //  update local listOflights first
  getAllLights(session, () => {
    let listOflights = session.userData.listOflights
    if (!listOflights || _.isEmpty(listOflights)) {
      session.send('There are no lights connected to your Hue bridge.')
      session.endDialog()
    }
    let response = ''
    _.forEach(listOflights, (value, key) => {
      response += value.name + ' is ' + value.state + '\n'
    })
    session.send(response)
  })
}

bot.dialog('showLights', showLights).triggerAction({matches: 'Show Lights'})

const getRequestLight = (session) => {
  getAllLights(session, () => {
    builder.Prompts.text(session, 'What\'s the name of the light you want to know about?')
  })
}

const lightStatus = (session) => {
  session.send(session.dialogData.foundLight.name + ' is ' + session.dialogData.foundLight.state)
}

bot.dialog('light_status', [getRequestLight, findLight, lightStatus]).triggerAction({matches: 'light status'})

const discoverNewLight = (session, callback) => {
  let ipAddress = session.userData.bridgeInfo.internalipaddress
  let username = session.userData.bridgeInfo.username
  let url = 'https://' + ipAddress + 'api/' + username + '/lights'

  //  First, search for new lights
  request.post(url, (error, response, body) => {
    if (error) callback(error)
    // let responseBody = JSON.parse(body)
    if (!_.find(body, 'success')) callback('I ran into problem when searching for new lights')

    callback(null, session)
  })
}

const getNewLights = (error, session) => {
  if (error) {
    session.send('I ran into problem getting new lights.')
    session.endDialog()
  }

  let ipAddress = session.userData.bridgeInfo.internalipaddress
  let username = session.userData.bridgeInfo.username
  let url = 'https://' + ipAddress + 'api/' + username + '/lights/new'

  //  then, get the new lights
  request.get(url, (error, response, body) => {
    if (error) return error

    // let responseBody = JSON.parse(body)
    let newLights = 'I found ' + _.size(body) - 1 + ' new lights.\n'
    _.forEach(body, (value, key) => {
      session.userData.listOflights[key] = { name: value.name }
      newLights += value.name + '\n'
    })
    //  create new connectors for new lights
    if (session.userData.devMode) createConn()
    session.send(newLights)
    session.endDialog()
  })
}

const addNewLights = (session) => {
  if (!session.userData.bridgeInfo) {
    session.beginDialog('no_bridge')
  }
  else
  {
    discoverNewLight(session, getNewLights)
  }
}

bot.dialog('add_new_lights', [addNewLights]).triggerAction({matches: 'New Light'})

const getLightToChange = (session) => {
  // {
  //  '1': { name: 'Hue Lamp 1', state: 'on' },
  // '2': { name: 'Hue Lamp 2', state: 'off' }
  // }
  getAllLights(session, () => {
    builder.Prompts.text(session, 'What\'s the name of the light you want to change?')
  })
}

const getLightNewName = (session) => {
  builder.Prompts.text(session, 'What name do you want to change to?')
}

const setLightNewName = (session, results) => {
  if (session.userData.devMode) return session.beginDialog('dev_change_light_name', session.dialogData.foundLight, results.response)
  let lightID = session.dialogData.foundLight.id
  let ipAddress = session.userData.bridgeInfo.internalipaddress
  let username = session.userData.bridgeInfo.username
  let url = 'http://' + ipAddress + '/api/' + username + '/lights/' + lightID
  let options = {
    method: 'PUT',
    url: url,
    json: {
      "name": results.response
    }
  }
  request(options, (error, response, body) => {
    if (_.find(body, 'success')) {
      session.send('I have successfully change the light\'s name')
    }
    else {
      session.send('I ran into problem while changing the name. Please try again.')
    }
    session.endDialog()
  })
}

bot.dialog('change_light_name', [getLightToChange, findLight, getLightNewName, setLightNewName]).triggerAction({matches: 'Change Light Name'})

const getLightToSwitch = (session) => {
  getAllLights(session, () => {
    builder.Prompts.text(session, 'What\'s the name of the light you want to switch?')
  })
}

const switchLight = (session) => {
  if (session.userData.devMode) session.beginDialog('dev_switch_light', session.dialogData.foundLight)
  let light = session.dialogData.foundLight
  let ipAddress = session.userData.bridgeInfo.internalipaddress
  let username = session.userData.bridgeInfo.username
  let url = 'http://' + ipAddress + '/api/' + username + '/lights/' + light.id + '/state'
  let options = {
    method: 'PUT',
    url: url,
    json: {
      "on": light.state === 'on' ? false : true
    }
  }

  request(options, (error, response, body) => {
    if (_.find(body, 'success')) {
      session.send('I have successfully switched ' + light.name + ' ' + (light.state === 'on' ? 'off' : 'on'))
    }
    else {
      session.send('I ran into problem while switching the light. Please try again.')
    }
    session.endDialog()
  })
}

bot.dialog('switch_light', [getLightToSwitch, findLight, switchLight]).triggerAction({matches: 'Switch Light'})

/* DEV */

const devSwitchLight = (session, foundLight) => {
  if (!foundLight.uuid) {
    session.send('This light is not connected to a connector yet. Let\'s connect it.')
    session.beginDialog('set_connector')
  }
  request.put('https://' + session.userData.UUID + ':' + session.userData.TOKEN + '@meshblu.octoblu.com/devices/' + foundLight.uuid, {json: {desiredState: {on: true}}}, (error, response, body) => {
    if (error) return session.send('I ran into problem switching the light through Octoblu.')
    session.send('I have successfully switched the light ' + foundLight.state === 'on' ? 'off' : 'on')
  })
}

bot.dialog('dev_switch_light', [devSwitchLight])

const devChangeLightName = (session, foundLight, newName) => {
  if (!foundLight.uuid) {
    session.send('This light is not connected to a connector yet. Let\'s connect it.')
    session.beginDialog('set_connector')
  }
  request.put('https://' + session.userData.UUID + ':' + session.userData.TOKEN + '@meshblu.octoblu.com/devices/' + foundLight.uuid, {json: {name: newName}}, (error, response, body) => {
    if (error) return session.send('I ran into problem changing the light\'s name through Octoblu.')
    session.send('I have successfully changed the light\'s name to ' + newName)
  })
}

bot.dialog('dev_change_light_name', [devChangeLightName])
const getOctobluEmail = (session) => {
  builder.Prompts.text(session, 'What\'s your octoblu email?')
}

const activateDevMode = (session, results) => {
  let givenEmail = results.response

  email_validator.validate_async(givenEmail, (error, isValid) => {
    if (error || !isValid) {
      session.send(givenEmail + ' is invalid.')
    }
    else {
      //  TODO: authenticate email with octoblu, if failed -> create new a/c, else -> continue
      session.userData.devMode = true
      session.send('Dev Mode is activated. I need access to a Hue Light connector for each light.')
      session.beginDialog('set_connector')
    }
  })
}

const devModeCommands = (session) => {
  session.send('You can say \'start flow\', \'add new flow\'')
}

bot.dialog('activate_dev_mode', [getOctobluEmail, activateDevMode, devModeCommands]).triggerAction({matches: 'Dev Mode'})
// session.send(' You can create a new one by going to https://connector-factory.octoblu.com/connectors/create/octoblu/meshblu-connector-hue-light')

/* CONNECTOR */

const getLightforConn = (session) => {
  builder.Prompts.text(session, 'What\'s the name of the light you want to set a connector with?')
}

const getConnName = (session) => {
  builder.Prompts.text(session, 'What\'s the name of the connector? Note: case sensitive')
}

const getConn = (session, nameOfConn, foundLight, callback) => {
  request.post('https://' + session.userData.UUID + ':' + session.userData.TOKEN + '@meshblu-http.octoblu.com/search/devices', {json: {type: 'device:hue-light'}}, (error, response, body) => {
    if (error) {
      session.send('I ran into problem finding the connector.')
    }
    let conn = _.find(body, {name: nameOfConn})
    if (!conn) return session.send('I don\'t recognize' + nameOfConn + ' as one of your connectors')
    callback(session, conn, foundLight)
  })
}

const setConn = (session, conn, foundLight) => {
  session.userData.listOflights[foundLight.id].uuid = conn.uuid
  session.userData.listOflights[foundLight.id].token = conn.token
  let opt = {
    method: 'PUT',
    url: 'https://' + session.userData.UUID + ':' + session.userData.TOKEN + '@meshblu.octoblu.com/devices/' + conn.uuid,
    json: {
      "name": foundLight.name,
      "desiredState": {on: foundLight === 'on'},
      "options": {
        "ipAddress": session.userData.bridgeInfo.internalipaddress,
        "apiUsername": session.userData.bridgeInfo.username,
        "lightNumber": parseInt(foundLight.id)
      }
    }
  }
  request(opt, (err, res, body) => {
    if (err) return session.send('I ran into problem setting the connector.')
    session.send('I successfully connected the light to connector')
  })
}

const connectConn = (session, results) => {
  getConn(session, results.response, session.dialogData.foundLight, setConn)
}

bot.dialog('connect_connector', [getLightforConn, findLight, getConnName, connectConn]).triggerAction({matches: 'connect connector'})

const creator = (session, listOflights, callback) => {
  let after = _.after(_.size(listOflights), () => {
    callback(null)
  })
  async.each(listOflights, (eachLight, callback) => {
    if (!eachLight.uuid) {
      let opt = {
        method: 'POST',
        url: 'https://' + session.userData.UUID + ':' + session.userData.TOKEN + '@connector-service.octoblu.com/users/' + session.userData.UUID + '/connectors',
        json: {
          "name": eachLight.name,
          "githubSlug": "octoblu/meshblu-connector-hue-light",
          "type": "device:hue-light",
          "connector": "meshblu-connector-hue-light",
          "registryItem": {
            "_id": "octoblu-meshblu-connector-hue-light",
            "name": "Phillips Hue Light",
            "description": "Philips hue combines brilliant LED light with intuitive technology, then puts it in the palm of your hand. Experiment with shades of white, from invigorating blue/white to cozy yellow/white.",
            "type": "device:hue-light",
            "tags": [ "Home Automation" ]
          }
        }
      }
      request(opt, (err, res, body) => {
        if (err) return callback(err)
        eachLight.uuid = body.uuid
        eachLight.token = body.token
        after()
      })
    }
    else {
      after()
    }
  }, (err) => {
    if (err) return callback(err)
    callback(null, session, listOflights)
  })
}

const setter = (session, listOflights, callback) => {
  let after = _.after(_.size(listOflights), () => {
    callback(null)
  })
  async.each(listOflights, (eachLight, callback) => {
    let opt = {
      method: 'PUT',
      url: 'https://' + session.userData.UUID + ':' + session.userData.TOKEN + '@meshblu.octoblu.com/devices/' + eachLight.uuid,
      json: {
        "desiredState": {on: eachLight.state === 'on'},
        "options": {
          "ipAddress": session.userData.bridgeInfo.internalipaddress,
          "apiUsername": session.userData.bridgeInfo.username,
          "lightNumber": parseInt(eachLight.id)
        }
      }
    }
    request(opt, (err, res, body) => {
      if (err) return callback(err)
      after()
    })
  }, (err) => {
    if (err) return callback(err)
    callback(null)
  })
}

const createConn = (session) => {
  getAllLights(session, () => {
    //  TODO: Hoping that authentication w/ octoblu will return user's UUID
    //  then userUUID = session.userData.UUID

    let apply_creator = async.apply(creator, session, session.userData.listOflights)
    let apply_setter = async.apply(setter, session, session.userData.listOflights)
    async.waterfall([
        apply_creator,
        apply_setter
    ], function (err, result) {
        if (err) return session.send('I ran into problem creating a connector.')
        return session.send('I have successfully created a connector for each light. You can find and download the connector(s) here https://app.octoblu.com/things/my')
    });
  })
}

bot.dialog('create_connector', [createConn])

const hasConn1 = (session) => {
  if (session.userData.devMode) {
    builder.Prompts.confirm(session, 'Do you have an existing Hue connector(s)?')
  }
  else {
    session.send('Developer mode must be activated to use this function. You can say \'Dev Mode\'')
    session.endDialog()
  }
}

const hasConn2 = (session, results) => {
  results.response ? session.beginDialog('connect_connector') : session.beginDialog('create_connector')
}

bot.dialog('set_connector', [hasConn1, hasConn2])

/* FLOW */

const getFlowName = (session) => {
  builder.Prompts.text(session, 'What\'s the name of the flow you want to activate?')
}

const findFlow = (session, results) => {
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
}

const activateFlow = (session) => {
  request.post('https://nanocyte-flow-deploy.octoblu.com/flows/' + session.dialogData.flowID + '/instances', (error, response, body) => {
    if (error) return session.send('I ran into error activating that flow.')
    session.send('I successfully activated the flow')
  })
}

bot.dialog('flow_activation', [getFlowName, activateFlow]).triggerAction({matches: 'Flow'})

// For TESTING
const test = (session) => {

}

bot.dialog('test', [test]).triggerAction({matches: 'Test'})

app.post('/api/messages', connector.listen())

app.listen(3000, function () {
  console.log('BlueHueBot listening on port 3000!')
})
