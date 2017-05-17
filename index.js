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

/**
IntentDialog handles how the bot identifies different intents during a chat
*/
const intents = new IntentDialog()

bot.recognizer({
  recognize: (context, done) => {
    let intent = {score: 0.0}

    if (context.message.text) {
      switch (context.message.text.toLowerCase()) {
        case 'hello':
          intent = {score: 1.0, intent: 'intro'}
          break
        case 'setup':
          intent = {score: 1.0, intent: 'Setup'}
          break
        default:
      }
      done(null, intent)
    }
  }
})

// some specified intents. When intent is triggered, the bot will be directed to corresponding dialog
intents.matches(/^commands/i, '/commands')

/**
currentUser is a function that is triggered when the bot is initiated. It checks if a user already exists or not and directs the bot accordingly.
*/
const currentUser = (session) => {
  if (!session.userData.name) {
    // start a new chat if current user doesn't exists
    session.beginDialog('/intro')
  }
  else {
    session.userData.name = null
    // provided that current user already exists, listen for key words/commands
    // session.beginDialog(intents)
  }
}

bot.dialog('/', currentUser)

/**
A welcome greetings displayed to new users
*/
const intro = (session) => {
  builder.Prompts.text(session, 'Hi there, I\'m HueBot. What\'s your name?')
}

const isDev = (session, results) => {
  session.userData.name = results.response
  session.send('Hi ' + session.userData.name + ', let\'s get you setup.')
  session.sendTyping()
  builder.Prompts.choice(session, 'are you an octoblu developer?', ['what do you mean?', 'I sure am!'])
}

const checkDev = (session, results) => {
  results.response.entity === 'I sure am!' ? session.beginDialog('/octobluDev') : session.beginDialog('/notOctobludev')
}

bot.dialog('/intro', [intro, isDev, checkDev]).triggerAction({matches: 'intro'})

const octobluDev = (session) => {
  session.send('Nice!')
  session.sendTyping()
  session.send('Ok so.. for me to do all the magic octoblu stuff, I need access to a Philips Hue Light connector.')
  session.sendTyping()
  builder.Prompts.choice(session, 'Do you have one installed on a computer?', ['what\'s a connector?', 'Nope! Need help', 'Yup!'])
}

const devSetupCred = (session, results, next) => {
  switch (results.response.entity) {
    case 'what\'s a connector?':
      session.send('A connector allows me to interact with Philips Hue Light through Octoblu')
      session.sendTyping()
      session.send('Let\'s get you setup with one.')
      session.beginDialog('/octobluDevSetup')
      break
    case 'Nope! Need help':
      session.send('I can help with setting up a connector.')
      session.beginDialog('/octobluDevSetup')
      break
    case 'Yup!':
      session.send('Great! Fire some commands at me')
      break
    default:
      //  TODO: call universal intent
  }
  next()
}

const octobluDevCommands = (session, results, next) => {
  session.send('Waiting for commands')
  //  TODO: create intents to match possible commands
}

bot.dialog('/octobluDev', [octobluDev, devSetupCred, octobluDevCommands])

const notOctobludev = (session, results) => {
  session.send('Well, Octoblu is a service programmers use make different devices interact with each other. You find more info https://octoblu.com')
  builder.Prompts.choice(session, 'Are you a programmer?', ['Yes', 'No'])
}

const isProgrammer = (session, results, next) => {
  if (results.response.entity === 'Yes') {
    builder.Prompts.choice(session, 'Would you like to sign up and continue has an Octoblu developer?', ['sure', 'nope'])
  }
  else {
    session.send('Ok. I\'ll search for a Philips Hue bridge.')
    next()
  }
}

const continueHasDev = (session, results, next) => {
  if (results.response && results.response.entity === 'sure') {
    session.replaceDialog('/octobluDev')
  }
  else {
    session.beginDialog('/nonDevSetup')
  }
}

bot.dialog('/notOctobludev', [notOctobludev, isProgrammer, continueHasDev])

const getBridgeInfoCallback = (session, devSetup, bridgeInfo) => {
  session.userData.username = bridgeInfo.username
  let url = bridgeInfo.url
  let re = /\d+(\.\d+)*/i
  let ipAddress = url.match(re)
  session.userData.ipAddress = ipAddress[0]
  console.log('username: ' + session.userData.username)
  console.log('ipAddress: ' + session.userData.ipAddress)
  if (devSetup === 0) {
    session.beginDialog('/getUserConnInfo')
  }
}

const bridgeError = (session, bridgeInfo) => {
  switch (bridgeInfo.error) {
    case 1:
      session.send('No Hue bridges found on this WiFi. \n Say \'Setup\' when new bridge is connected.')
      break
    case 2:
      session.send('None of the bridges found was pushed.')
      break
    default:
      session.send('An error occured.')
  }
  return
}

const findHueBridgesOnNetwork = (callback) => {
  request.get('https://www.meethue.com/api/nupnp', (error, response, body) => {
    if (error) return callback(new Error(error.message))

    const responseBody = JSON.parse(body)

    if (_.isEmpty(responseBody)) return callback(new Error('No bridges found.'))

    const bridgeIpAddresses = _.filter(responseBody, 'internalipaddress')

    return callback(null, bridgeIpAddresses)
  })
}

const callback = (error, bridges) => {
  if (error) return console.log('error', error)

  async.retry({times: 3, interval: 5000}, (callback, bridges) => {
    async.each(bridges, (bridgeIp, callback) => {
      let url = 'http://' + bridgeIp.internalipaddress + '/api/'
      request.post(url, {json: {'devicetype': 'my_hue_app#iphone peter'}}, (error, response, body) => {
        if (error) {
          callback(error)
        }
        else if (body[0]['success']) {
          console.log(_.filter(body, 'success'))
          bridgeIp.username = body[0]['success']
          callback()
        }
        else {
          callback('No bridge pushed.')
        }
      })
    },(error) => {
      if(error) {
        return callback(error)
      }
      return callback(null, 'Username obtained')
    })
  }, (error, results) => {
    if (error) return console.log(error)
    console.log(results)
    return console.log('Bridges', _.find(bridges, 'username'))
  })
}

const nonDevSetup = (session) => {
  let bridgeInfo = findHueBridgesOnNetwork(callback)
  //  TODO: set userData's bridgeInfo
  session.send('Found a bridge.')
  session.beginDialog('/nonDevCommands')
}

bot.dialog('/nonDevSetup', [nonDevSetup])
/**
Authenticates current user with MeshBlu
@param {object} results holds user's input from previous function in the waterfall call
*/
const authentication = (session, results) => {
  session.userData.email = results.response
  session.send('Your email is ' + session.userData.email)
  //TODO authenticate user's email

  // if (octoblu.auth(session.userData.email)) {
  //   continue with convo
  // }
  // else {
  //   provide link to create new account
  //    Make sure hue is setup with the Philips Hue app
  //    Create new Hue connector (Gateblu) on octoblu
  //    Make user download the connector
  //    Make sure user installs the connector
  //
  //  OR (w/ HUE API)
  //    get IP address of the Hue Brigde from user
  //    create new a/c if none exists
  // }
}

const linkToConnector = (session) => {
  session.send('Go to https://connector-factory.octoblu.com/connectors/create/octoblu/meshblu-connector-hue-light , sign in with your email and password.')
  session.sendTyping()
  builder.Prompts.choice(session, 'Do you see a page showing a list of versions of Philips Hue Light connectors?', ['Yeah, I do.', 'Nope! The link didn\'t work.', 'I\'ve gone past that page.'])
}

const installConnector = (session, results) => {
  switch (results.response.entity) {
    case 'Yeah, I do.':
      session.send('Select a version. Tip: Choose the latest version.')
      break
    case 'Nope! The link didn\'t work.':
      session.send('oh no, something must have gone wrong')
      break
    case 'I\'ve gone past that page.':
      break
    default:
      //TODO:
  }
  // THIS BELOW IS A NIGHTMARE
  // session.send('Next step: install the connector')
  // next()
  builder.Prompts.choice(session, 'Did you install the connector yet?', ['No, I was waiting for you to ask.', 'You bet I did!', 'Still installing'])
}

const installationHelp = (session, results) => {
  switch (results.response.entity) {
    case 'No, I was waiting for you to ask.':
      session.send('funny!')
      break
    case 'You bet I did!':
      session.send('Good!')
      break
    case 'Still installing':
      session.send('ok')
      break
    default:
    //TODO:
  }
  builder.Prompts.choice(session, 'do you need me to walk you through installation?', 'yes|no')
}

const walkThruInstallation = (session, results, next) => {
  if (results.response.entity == 'yes') {
    session.beginDialog('/installationWalkThru')
  }
  else {
    next()
  }
}

const getUserUUID = (session) => {
  session.send('Then, I need three things: your account\'s uuid, connector\'s uuid and connector\'s token. Don\'t worry,')

  builder.Prompts.text(session, 'What\'s your account\'s uuid? You can find it here https://app.octoblu.com/profile')
}

const getConnUUID = (session, results) => {
  session.userData.uuid = results.response
  builder.Prompts.text(session, 'What\'s your connector\'s uuid?')
}

const getConnToken = (session, results) => {
    session.userData.connectorUuid = results.response
    builder.Prompts.text(session, 'What\'s your connector\'s token? Tip: click \'Generate Token\'')
}

const gotUserConnInfo = (session, results) => {
  session.userData.connectorToken = results.response
  session.endDialog()
}

bot.dialog('/getUserConnInfo', [getUserUUID, getConnUUID, getConnToken, gotUserConnInfo])

const collectBridgeInfo = (session, results) => {
  session.send('Let\'s configure the connector in Octoblu.')
  session.send('First, I need you to push the button on your Hue Bridge within the next 5 seconds.')
  let bridgeInfo = findHueBridgesOnNetwork(callback)
  //  TODO: set userData's bridgeInfo
}

const confirmConnector = (session) => {
  let isOwner = false
  let confirmConnector = {
    method: 'GET',
    url: 'https://meshblu.octoblu.com/devices/' + session.userData.connectorUuid,
    headers: {
      'meshblu_auth_uuid' : session.userData.connectorUuid,
      'meshblu_auth_token' : session.userData.connectorToken
    }
  }
  do {
    request(confirmConnector, (err, res, body) => {
      if (err) {
        session.send('I ran into problem with the credentials you gave. Please, make sure they are valid.')
        //TODO: getUserConnInfo again
        // session.beginDialog('/getUserConnInfo')
      }
      else {
        let vBody = JSON.parse(body)
        let owneruuid = vBody['devices'][0]['owner']
        if (owneruuid === session.userData.uuid) {
          session.send('I\'ve confirmed the connector.')
          isOwner = true
        }
        else {
          session.send('It seems that you\'re not the owner of the connector you provided.')
        }
      }
    })
  } while (!isOwner)
}

const connectorConfiguration = (session) => {
  let configCred = {
    method: 'PUT',
    url: 'https://meshblu.octoblu.com/devices/' + session.userData.connectorUuid,
    headers: {
      'meshblu_auth_uuid' : session.userData.connectorUuid,
      'meshblu_auth_token' : session.userData.connectorToken
    },
    //TODO: pass brigde username
    json: {options: {ipAddress: session.userData.ipAddress}}
  }

  request(configCred, (err, res, body) => {
    if (err) {
      session.send('I ran into some problem while configuring your connector')
    }
    else {
      session.endDialog()
    }
  })
}

// bot.dialog('/octobluDevSetup', [linkToConnector, installConnector, installationHelp, collectBridgeInfo, confirmConnector, connectorConfiguration]).triggerAction({matches: 'Setup'})
bot.dialog('/octobluDevSetup', [collectBridgeInfo, confirmConnector, connectorConfiguration]).triggerAction({matches: 'Setup'})
/**
Displays possible commands users can ask the bot to perform
*/
const commands = (session) => {
  //TODO display a list of commands in a 'bot-like' manner
  //(w/ Hue Api)
    //Get all lights
    //Get and Search for new lights
    //Get light attributes
    //Set light attributes
    //Set light state
    //Delete light
    //Create group
    //Setup schedules
    //
  session.send('')
}

bot.dialog('installationWalkThru', [])

app.post('/api/messages', connector.listen())


app.listen(3000, function () {
  console.log('BlueHueBot listening on port 3000!')
})
