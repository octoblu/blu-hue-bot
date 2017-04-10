/**
A simple chat-bot that implements IoT with Octoblu services and interacts directly with end-users.
@author Koshin Mariano
@author Olu David
*/

/**
Dependencies
*/
const builder = require('botbuilder');
const { ChatConnector, UniversalBot, IntentDialog } = builder;
const express = require('express')
const app = express()

const connector = new ChatConnector({
  appId: 'cf720a5c-8f43-4940-82c6-92d3fddbcab1',
  appPassword: 'U1TTm2HqWQ3N34zdEpQAqeS'
});

/**
A new instance of the chat-bot
*/
const bot = new UniversalBot(connector);

/**
IntentDialog handles how the bot identifies different intents during a chat
*/
const intents = new IntentDialog();

// some specified intents. When the specified is found, the bot will be directed to corresponding networks
intents.matches(/^commands/i, '/commands');
intents.matches(/^setup/i, '/authentication');

/**
currentUser is a function that is triggered when the bot is initiated. It checks if a user already exists or not and directs the bot accordingly.
*/
const currentUser = (session) => {
  if (!session.userData.name) {
    // start a new chat if current user doesn't exists
    session.beginDialog('/intro')
  }
  else {
    // provided that current user already exists, listen for key words/commands
    session.beginDialog(intents);
  }
}

/**
A welcome greetings displayed to new users
*/
const intro = (session) => {
  builder.Prompts.text(session, "Hi there, I'm HueBot. What's your name?")
}

/**
Get new user's credentials
@param {object} results holds user's input from previous function in the waterfall call
*/
const getCred = (session, results) => {
  session.userData.name = results.response;
  builder.Prompts.text(session, 'Hi ' + session.userData.name + ', let\'s get you setup.\n What\'s your email?')
}

/**
Authenticates current user with MeshBlu
@param {object} results holds user's input from previous function in the waterfall call
*/
const authentication = (session, results) => {
  session.userData.email = results.response;
  session.send("Your email is " + session.userData.email)
  //TODO authenticate user's email

  // if (octoblu.auth(session.userData.email)) {
  //   continue with convo
  // }
  // else {
  //   provide link to create new account
  // }
}

/**
Displays possible commands users can ask the bot to perform
*/
const commands = (session) => {
  //TODO display a list of commands in a "bot-like" manner
  session.send("")
}

bot.dialog('/', currentUser);
bot.dialog('/intro',[intro, getCred, authentication, commands] )

const health = (req, res) => {
  res.status(200).send({"online": "true"})
};

// Just a tester.
//app.get('/health', health)

app.post('/api/messages', connector.listen())


app.listen(3000, function () {
  console.log('BlueHueBot listening on port 3000!')
})
