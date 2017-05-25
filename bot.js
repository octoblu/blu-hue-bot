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
    session.userData.name = null
  }
}

const isSetupSuccessfull = (session, results, next) => {
  if (results.error) session.endDialog()
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
  session.beginDialog('getBridges')
}

const setUserBridge = (session, results, next) => {
  if (results.error) {
    session.send(results.error)
    session.endDialogWithResult(results)
  }
  else
  {
    session.userData.bridgeInfo = results.bridge
    session.endDialog()
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

bot.dialog('getBridges', [getBridges, returnUserBridge])

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
  session.dialogData.bridges = args
  session.send('I need you to push the button on your Hue bridge within 30 seconds. This is due to security reasons.')
  next()
}

const findUserBridge = (session, results) => {
  let listOfBridges = session.dialogData.bridges

  async.retry({times: 4, interval: 5000}, (callback, listOfBridges) => {
    async.each(listOfBridges, (eachBridge, callback) => {
      let url = 'http://' + eachBridge.internalipaddress + '/api/'
      request.post(url, {json: {'devicetype': 'blu-hue-bot#' + session.userData.name + ' bridge'}}, (error, response, body) => {
        if (error) {
          callback(error)
        }
        else if (body[0]['success']) {
          console.log(_.filter(body, 'success'))
          eachBridge.username = body[0]['success']
          callback()
        }
        else
        {
          callback('No bridge pushed.')
        }
      })
    }, (error) => {
      if(error) return callback(error)
      return callback(null, 'Username obtained')
    })
  }, (error, results) => {
    if (error) {
      results = {error: error}
      session.endDialogWithResult(results)
    }
    //  TODO: use '_.filter' to get array of bridges if multiple bridges are pushed
    results = {
      bridge: _.find(listOfBridges, 'username')
    }
    session.endDialogWithResult(results)
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

const getAllLights = (session, callback) => {
  //   Make sure there's at least one bridge to work with
  if (!session.userData.bridgeInfo) {
    session.beginDialog('no_bridge')
  }
  else
  {
    let ipAddress = session.userData.bridgeInfo.internalipaddress
    let username = session.userData.bridgeInfo.username
    let url = 'https://' + ipAddress + 'api/' + username + '/lights'

    request.get(url, (error, response, body) => {
      if (error) {
        session.send(error)
        return
      }
      //  body contains the list of lights connected to the bridge
      // let responseBody = JSON.parse(body)
      let listOflights = {}
      //  save the lights locally as {name: 'name', state: 'on|off'}
      _.forEach(body, (value, key) => {
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
  if (error) return error

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

const getNewLightName = (session, args) => {
  let lightID = args
  builder.Prompts.text(session, 'What will the new name be?')
}

const changeToNewName = (session, results) => {

}

bot.dialog('get_new_light_name', [getNewLightName])

const getLightToChange = (session) => {
  // {
  //  '1': { name: 'Hue Lamp 1', state: 'on' },
  // '2': { name: 'Hue Lamp 2', state: 'off' }
  // }
  builder.Prompts.text(session, 'What\'s the name of the light you want to change?')
}

const changeLightName = (session, results) => {
  let nameOfLight = results.response
  let listOflights = session.userData.listOflights
  let lightID;
  _.forEach(listOflights, (value, key) => {
    lightID = _.find(value, {name: nameOfLight}) === 'undefined' ? null : key
  })
  if (lightID) {
    session.beginDialog('get_new_light_name', lightID)
  }
  else
  {
    session.send('I don\'t recognize ' + nameOfLight + ' as one of your light.')
  }
}

bot.dialog('change_light_name', [getLightToChange, changeLightName]).triggerAction({matches: 'change light name'})

const switchLight = (session) => {

}


// For TESTING
const test2 = (error, listOflights) => {
  let nameOfLight = 'Hue Lamp 1'
  let found;

}

const test1 = (session, callback) => {
  session.send(session.userData.name)
  // session.userData.name = 'Doe'
  let testBody = {
    "1": {
        "state": {
            "on": true,
            "bri": 144,
            "hue": 13088,
            "sat": 212,
            "xy": [0.5128,0.4147],
            "ct": 467,
            "alert": "none",
            "effect": "none",
            "colormode": "xy",
            "reachable": true
        },
        "type": "Extended color light",
        "name": "Hue Lamp 1",
        "modelid": "LCT001",
        "swversion": "66009461",
        "pointsymbol": {
            "1": "none",
            "2": "none",
            "3": "none",
            "4": "none",
            "5": "none",
            "6": "none",
            "7": "none",
            "8": "none"
        }
    },
    "2": {
        "state": {
            "on": false,
            "bri": 0,
            "hue": 0,
            "sat": 0,
            "xy": [0,0],
            "ct": 0,
            "alert": "none",
            "effect": "none",
            "colormode": "hs",
            "reachable": true
        },
        "type": "Extended color light",
        "name": "Hue Lamp 2",
        "modelid": "LCT001",
        "swversion": "66009461",
        "pointsymbol": {
            "1": "none",
            "2": "none",
            "3": "none",
            "4": "none",
            "5": "none",
            "6": "none",
            "7": "none",
            "8": "none"
        }
    }
  }
  let listOflights = {}
  _.forEach(testBody, (value, key) => {
    listOflights[key] = {
      'name': value.name,
      'state': (value.state.on === true) ? 'on' : 'off'
    }
  })
  console.log(listOflights)
  callback(null, listOflights)
}

const test = (session) => {
  session.userData.name = 'Dae'
  test1(session, test2)
}

bot.dialog('test', [test]).triggerAction({matches: 'Test'})

app.post('/api/messages', connector.listen())

app.listen(3000, function () {
  console.log('BlueHueBot listening on port 3000!')
})
