/**
A simple chat-bot that implements IoT with Octoblu services and interacts directly with end-users.
@author Koshin Mariano
@author Olu David
*/

const builder = require('botbuilder')
const { ChatConnector, UniversalBot, IntentDialog } = builder
const request = require('request')
const async = require('async')
const email_validator = require('email-validator')
const path = require('path')

const recog = require('./recognizer')
const auth = require('./auth')
const router = require('./router')

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
  // session.userData.UUID = '7f40525e-981f-4170-9656-95d9076d6466'
  // session.userData.TOKEN = 'c64ef6296776974f56bad7f8c0e6fc7037e71703'
  auth.currentUser( (user) => {
    // force user to login/register if user doesn't exist
    user ? auth.getUserData(user.uid, (userData) => {
      session.userData = userData
      if (!session.userData.name) {
        // start a new chat if current user is a new user
        console.log('HERE');
        session.beginDialog('startup')
      }
      if (!session.userData.bridgeInfo)
      {
        // Make sure there's a Hue bridge to work with
        session.beginDialog('no_bridge')
      }
    }) : router.loginPage()
  })
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

bot.dialog('startup', require('./setup/startup'))

bot.dialog('setup', require('./setup/setup')).triggerAction({matches: 'Setup'})

bot.dialog('get_bridges', require('./setup/getbridges'))

bot.dialog('no_bridge', require('./setup/nobridge'))

bot.dialog('get_user_bridge', require('./setup/getuserbridge'))

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

bot.dialog('showLights', require('./user/showlight')).triggerAction({matches: 'Show Lights'})

bot.dialog('light_status', require('./user/lightstatus')).triggerAction({matches: 'light status'})

bot.dialog('add_new_lights', require('./user/addnewlight')).triggerAction({matches: 'New Light'})

bot.dialog('change_light_name', require('./user/changelightname')).triggerAction({matches: 'Change Light Name'})

bot.dialog('switch_light', require('./user/switchlight')).triggerAction({matches: 'Switch Light'})

/* DEV */

bot.dialog('dev_switch_light', require('./developer/switchlight'))

bot.dialog('dev_change_light_name', require('./developer/changelightname'))

bot.dialog('activate_dev_mode', require('./developer/devmode')).triggerAction({matches: 'Dev Mode'})

// session.send(' You can create a new one by going to https://connector-factory.octoblu.com/connectors/create/octoblu/meshblu-connector-hue-light')

/* CONNECTOR */

bot.dialog('connect_connector', require('./developer/connector/connectconnector')).triggerAction({matches: 'connect connector'})

bot.dialog('create_connector', require('./developer/connector/createconnector'))

bot.dialog('set_connector', require('./developer/connector/setconnector'))

/* end CONNECTOR */

/* FLOW */

bot.dialog('flow_activation', require('./developer/flow/flowactivation')).triggerAction({matches: 'Flow'})

/* end  FLOW */

/* end DEV */

// For TESTING purposes
const test = (session) => {

}

bot.dialog('test', [test]).triggerAction({matches: 'Test'})

//  router
router.listen(connector)
