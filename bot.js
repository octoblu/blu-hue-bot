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

/**
Creates a connection with botframework
*/
const connector = new ChatConnector({
  appId: 'cf720a5c-8f43-4940-82c6-92d3fddbcab1',
  appPassword: 'U1TTm2HqWQ3N34zdEpQAqeS'
})

/**
A new instance of the chat-bot
*/
const bot = new UniversalBot(connector)

bot.recognizer({
  recognize: (context, done) => {
    let intent = {score: 0.0}

    if (context.message.text) {
      switch (context.message.text.toLowerCase()) {
        case 'hello':
          intent = {score: 1.0, intent: 'Intro'}
          break
        case 'setup':
          intent = {score: 1.0, intent: 'Setup'}
          break
        case 'show my lights':
          intent = {score: 1.0, intent: 'Show Lights'}
          break
        case 'test':
          intent = {score: 1.0, intent: 'Test'}
          break;
        case 'change light name':
          intent = {score: 1.0, intent: 'change light name'}
          break;
        default:
      }
      done(null, intent)
    }
  }
})

/**
currentUser is a function that is triggered when the bot is initiated. It checks if a user already exists or not and directs the bot accordingly.
*/
const currentUser = (session) => {
  if (!session.userData.name) {
    // start a new chat if current user doesn't exists
    session.beginDialog('startup')
  }
  else if (!session.userData.bridgeInfo)
  {
    session.beginDialog('no_bridge')
  }
  else
  {
    //  for Testing purpose
    session.userData = null
  }
}

const isSetupSuccessfull = (session, results, next) => {
  if (!results.bridge) session.endDialog()
  else { next() }
}

const displayCommands = (session) => {
  session.send('Here are some commands you can try: \nYou can say \'show my lights\' or \'turn on \'light 1\'\' or \' change light name\' or \' dev mode \'')
}

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
  session.beginDialog('get_bridges')
}

const setUserBridge = (session, results, next) => {
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
      results = {error: error.message}
      session.endDialogWithResult(results)
    }

    const responseBody = JSON.parse(body)

    if (_.isEmpty(responseBody)) {
      results = {error: 'I couldn\'t find any Hue bridge on this WiFi. \n Say \'Setup\' when new bridge is available.'}
      session.endDialogWithResult(results)
    }
    else
    {
      const bridgeIpAddresses = _.filter(responseBody, 'internalipaddress')

      results = {
        bridges: bridgeIpAddresses
      }
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
  builder.Prompts.choice(session, 'Ready to setup one now?', ['Yeah', 'No'])
}

const toSetup = (session, results) => {
  if (results.response.entity === 'Yeah') {
    session.beginDialog('setup')
  }
  else
  {
    session.send('No problem. Just say \'Setup\' when you\'re ready connect a new Hue bridge')
    session.endDialog()
  }
}

bot.dialog('no_bridge', [wannaSetup, toSetup, returnUserBridge])

const receiveBridges = (session, args, next) => {
  session.dialogData.bridges = args.bridges
  session.send('I need you to push the button on your Hue bridge within 30 seconds. This is due to security reasons.')
  next()
}

const somethingDiff = (listOfBridges, callback) => {
  _.forEach(listOfBridges, (eachBridge) => {
    console.log('eachBridge', eachBridge);
    let url = 'http://' + eachBridge.internalipaddress + '/api/'
    console.log('url', url)
    request.post(url, {json: {'devicetype': 'blu-hue-bot#bridge'}}, (error, response, body) => {
      if (error) {
        callback(error)
      }
      if (body[0]['success']) {
        console.log(_.find(body, 'success'))
        eachBridge.username = body[0]['success']['username']
        console.log(eachBridge.username)
        callback(null, eachBridge)
      }
      callback('No bridge pushed')
    })
  })
}

const findUserBridge = (session, results) => {
  let listOfBridges = session.dialogData.bridges
  const thingToRetry = async.apply(somethingDiff, listOfBridges)
  async.retry({times: 4, interval: 5000}, thingToRetry, (error, bridgePushed) => {
    if (error) {
        results = {error: error}
      }
    //  TODO: use '_.filter' to get array of bridges if multiple bridges are pushed
    else {
      results = {
        bridge: bridgePushed
      }
    }
  })
  session.endDialogWithResult(results)
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
    console.log('url', url);
    request.get(url, (error, response, body) => {
      if (error) {
        console.log('error', error);
        session.send('I ran into problem getting the lights connected to your bridge.')
        return
      }
      //  body contains the list of lights connected to the bridge
      let responseBody = JSON.parse(body)
      let listOflights = {}
      //  save the lights locally as {name: 'name', state: 'on|off'}
      _.forEach(responseBody, (value, key) => {
        console.log('value', value);
        listOflights[key] = {
          'name': value.name,
          'state': (value.state.on === true) ? 'on' : 'off'
        }
      })
      session.userData.listOflights = listOflights
      callback()
    })
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
    session.send(error)
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
      session.userData.listOflights[key] = {
        name: value.name
      }
      newLights += value.name + '\n'
    })
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

const findLightToChange = (session, results) => {
  let nameOfLight = results.response
  let listOflights = session.userData.listOflights
  let foundLightID;

  _.forEach(listOflights, (lightProps, lightID) => {
    if (foundLightID) return false
    foundLightID = _.includes(lightProps, nameOfLight) ? lightID : null
    console.log('foundLightID', foundLightID)
  })
  if (foundLightID) {
    session.dialogData.foundLightID = foundLightID
    builder.Prompts.text(session, 'What will the new name be?')
  }
  else
  {
    session.send('I don\'t recognize ' + nameOfLight + ' as one of your light.')
    session.endDialog()
  }
}

const getNewLightName = (session, results) => {
  let newName = results.response
  let lightID = session.dialogData.foundLightID
  let ipAddress = session.userData.bridgeInfo.internalipaddress
  let username = session.userData.bridgeInfo.username
  let url = 'https://' + ipAddress + '/api/' + username + '/lights/' + lightID

  request.put(url, {"name": newName}, (error, response, body) => {
    if (_.find(body, 'success')) {
      session.send('I have successfully change the light\'s name')
    }
    else {
      session.send('I ran into problem while changing the name. Please try again.')
    }
    session.endDialog()
  })
}

bot.dialog('change_light_name', [getLightToChange, findLightToChange, getNewLightName]).triggerAction({matches: 'change light name'})

const switchLight = (session) => {

}

// For TESTING
const test = (session) => {
  console.log('ip address', session.userData.bridgeInfo.internalipaddress);
}

bot.dialog('test', [test]).triggerAction({matches: 'Test'})

app.post('/api/messages', connector.listen())

app.listen(3000, function () {
  console.log('BlueHueBot listening on port 3000!')
})
