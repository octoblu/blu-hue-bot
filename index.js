/**
A simple chat-bot that implements IoT with Octoblu services and interacts directly with end-users.
@author Koshin Mariano
@author Olu David
*/

const builder = require('botbuilder');
const { ChatConnector, UniversalBot, IntentDialog } = builder;
const express = require('express')
const app = express()
const request = require('request')

/**
Creates a connection with botframework
*/
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

// some specified intents. When intent is triggered, the bot will be directed to corresponding networks
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

const isDev = (session, results) => {
  session.userData.name = results.response;
  session.send('Hi ' + session.userData.name + ', let\'s get you setup.');
  session.sendTyping();
  builder.Prompts.choice(session, "are you an octoblu developer?", ["what do you mean?", "I sure am!"]);
  results.response == "I sure am!" ? session.beginDialog('/octobluDev') : session.beginDialog('/notOctobludev');
}

const octobluDev = (session) => {
  session.send("Nice!")
  session.send("Ok so.. for me to do all the magic octoblu stuff, I need a currently running computer and access to a Philips Hue Light connector");
  session.sendTyping();
  builder.Prompts.choice(session, "Do you have those?", ["what's a connector?", "Yeah, but let me install a connector first", "Yup! I have a computer and a connector installed on it."])
}

const devSetupCred = (session, results) => {
  switch (results.response) {
    case "what's a connector?":
      session.send("A connector allows me to interact with Philips Hue Light through Octoblu");
      session.sendTyping();
      session.send("Let's get you setup with one.");
      session.beginDialog('/octobluDevSetup');
      break;
    case "Yeah, but let me install a connector first":
      builder.Prompts.choice(session, "Well, I can help with that!", ["No thanks", "yes please"])
      results.response == "No thanks" ? next() : session.beginDialog('/octobluDevSetup');
      break;
    case "Yup! I have a computer and a connector installed on it.":
      session.send("Great! Fire some commands at me");
      next();
      break;
    default:
      //TODO: call universal intent
  }
}

const octobluDevCommands = (session, results) => {
  //TODO: create intents to match possible commands
}

const notOctobludev = (session) => {
  session.send("Well, Octoblu is a service programmers use make different devices interact with each other. You find more info https://octoblu.com");
  next();
}

const isProgrammer = (session) => {
  session.sendTyping();
  builder.Prompts.choice(session, "Are you a programmer?", ["Yes", "No"]);
  results.response == "Yes" ? session.beginDialog('/becomeOctobluDev') : session.beginDialog('/nonDevSetup');
}

const nonDevSetup = (session) => {
  session.send("No problem. Let's connect your Philips Hue with me.")
  session.sendTyping();
  //TODO: get the IP address automatically using UPnP
  session.send("All I need is your Hue's Brigde IP address.")
  builder.Prompts.choice(session, "Do you know how to get it?", ["duh! I do.", "Not really"])
}

const getBridgeIPAddress = (session, results) => {
  switch (results.response) {
    case "duh! I do.":
      builder.Prompts.number(session, "Great! What is it?")
      session.dialogData.brigdeIpAddress = results.response;
      break;
    case "Not really":
      session.send("ok. I can help you find it.")
      session.beginDialog('/findBrigdeIPAddress');
      break;
    default:
      //TODO:
  }
  //TODO: make get request to confirm IP address
}

const findBrigdeIPAddress = (session) => {
  session.send("To get the IP address, you need the official Philips Hue app.")
  builder.Prompts.choice(session, "Do you have the app?", "yes|no")
  if (results.response == "yes") {
    session.send("That's good! Now go to the settings menu in the app. Go to My Bridge. Go to Network settings. Switch off the DHCP toggle. The IP address of the bridge will show.")
    builder.Prompts.choice(session, "did you find it?", ["yup! that was easy", "no! I'm lost"])
    if (results.response == "yup! that was easy") {
      builder.Prompts.number(session, "Sweeet! what's the address?")
      session.dialogData.brigdeIpAddress = results.response;
      session.endDialogWithResult(session.dialogData.brigdeIpAddress);
    }
    else {
      session.send("Please make sure you follow the instructions closely")
      session.sendTyping();
      builder.Prompts.number(session, "What's the address?")
      session.dialogData.brigdeIpAddress = results.response;
      session.endDialogWithResult(session.dialogData.brigdeIpAddress);
    }
  }
  else {
    session.send("Download the official and make sure your phone is connected to the same network as the Hue bridge")
    builder.Prompts.choice("have you downloaded it?", ["yup!", "Nope"])
    if (results.response == "yup!") {
      session.send("That's good! Now go to the settings menu in the app. Go to My Bridge. Go to Network settings. Switch off the DHCP toggle. The IP address of the bridge will show.")
      builder.Prompts.choice(session, "did you find it?", ["yup! that was easy", "no! I'm lost"])
      if (results.response == "yup! that was easy") {
        builder.Prompts.number(session, "Sweeet! what's the address?")
        session.dialogData.brigdeIpAddress = results.response;
        session.endDialogWithResult(session.dialogData.brigdeIpAddress);
      }
      else {
        session.send("Please make sure you follow the instructions closely")
        session.sendTyping();
        builder.Prompts.number(session, "What's the address?")
        session.dialogData.brigdeIpAddress = results.response;
        session.endDialogWithResult(session.dialogData.brigdeIpAddress);
      }
    }
    else {
      builder.Prompts.choice(session, "ok, let me know when you've downloaded it", "Done!")
      if (results.response == "Done!") {
        session.send("That's good! Now go to the settings menu in the app. Go to My Bridge. Go to Network settings. Switch off the DHCP toggle. The IP address of the bridge will show.")
        builder.Prompts.choice(session, "did you find it?", ["yup! that was easy", "no! I'm lost"])
        if (results.response == "yup! that was easy") {
          builder.Prompts.number(session, "Sweeet! what's the address?")
          session.dialogData.brigdeIpAddress = results.response;
          session.endDialogWithResult(session.dialogData.brigdeIpAddress);
        }
        else {
          session.send("Please make sure you follow the instructions closely")
          session.sendTyping();
          builder.Prompts.number(session, "What's the address?")
          session.dialogData.brigdeIpAddress = results.response;
          session.endDialogWithResult(session.dialogData.brigdeIpAddress);
        }
      }
    }
  }
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

const checkCred = (session) => {
  builder.Prompts.choice(session, "I can walk you through installing a connector. Do you have the email and password associated with octoblu account? No worries! I won't be using your email or password.", "Yes|No");
}

const linkToConnector = (session, results) => {
  if (results.response == "Yes") {
    session.send("Perfect! Go to https://connector-factory.octoblu.com/connectors/create/octoblu/meshblu-connector-hue-light , sign in with your email and password.");
    session.sendTyping();
    builder.Prompts.choice(session, "Do you see a page showing a list of versions of Philips Hue Light connectors?", ["Yeah, I do.", "Nope! The link didn't work.", "I've gone past that page."]);
  }
  else {
    //TODO: user doesn't have email and/or password
    session.send("hmmm")
  }
}

const installConnector = (session, results) => {
  switch (results.response) {
    case "Yeah, I do.":
      session.send("Select a version. Tip: Be a smart one. Choose the latest version.")
      session.sendTyping();
      builder.Prompts.choice(session, "Next step: install the connector", ["Ok, but why again?", "No probs"]);
      break;
    case "Nope! The link didn't work.":
      session.send("oh no, something must have gone wrong");
      break;
    case "I've gone past that page.":
      builder.Prompts.choice(session, "Did you install the connector yet?", ["No, I was waiting for you to ask.", "You bet I did!", "Still installing"]);
      break;
    default:
      //TODO:
  }
}

const installationHelp = (session, results) => {
  switch (results.response) {
    case "Ok, but why again?":
      session.send("cos I need it. duh!")
      break;
    case "No probs":
      session.send("Good!")
      break;
    case "No, I was waiting for you to ask.":
      session.send("funny!")
      break;
    case "You bet I did!":
      session.send("Good!")
      break;
    case "Still installing":
      session.send("ok")
      break;
    default:
    //TODO:
  }
  builder.Prompts.choice(session, "do you need me to walk you through installation?", "yes|no")
}

const walkThruInstallation = (session, results) => {
  if (results.response == "yes") {
    session.beginDialog('/installationWalkThru');
  }
  else {
    next();
  }
}
const connectorConfiguration = (session, results) => {
  session.send("Let's configure the connector in Octoblu. I need four things: Brigde IP address of your Hue Light, your account's uuid, connector's uuid and connector's token.");
  builder.Prompts.text(session, "What's your Philips Hue Light Brigde IP address?")
  session.dialogData.brigdeIpAddress = results.response;
  builder.Prompts.text(session, "What's your account's uuid?")
  session.dialogData.userUuid = results.response;
  builder.Prompts.text(session, "What's your connector's uuid?")
  session.dialogData.uuid = results.response;
  builder.Prompts.text(session, "What's your connector's token? Tip: click 'Generate Token'")
  session.dialogData.token = results.response;

  //TODO: confirm uuid & token
  let confirmConnector = {
    url: 'https://meshblu.octoblu.com/devices/' + session.dialogData.uuid,
    headers: {
      'meshblu_auth_uuid' : session.dialogData.uuid,
      'meshblu_auth_token' : session.dialogData.token
    }
  }

  let isOwner = false;

  request.get(confirmConnector, (err, res, body) => {
    if (err) {
      console.log(err)
    }
    else {
      //TODO parse body and check if user's uuid matches connector's owner uuid
    }
  })

  //TODO: configure using MeshBlu
  let configCred = {
    method: 'PUT',
    url: 'https://meshblu.octoblu.com/devices/' + session.dialogData.uuid,
    headers: {
      'meshblu_auth_uuid' : session.dialogData.uuid,
      'meshblu_auth_token' : session.dialogData.token
    },
    //TODO: pass brigdeIpAddress
  }

  if (isOwner) {
    request.put(configCred, (err, res, body) => {
      //TODO: successful??
    })
    //TODO: if successful, endDialog(); else
  }
  else {
    session.send("You are not the owner of the uuid you provided")
    //TODO: ask for new uuid and token
  }
}

/**
Displays possible commands users can ask the bot to perform
*/
const commands = (session) => {
  //TODO display a list of commands in a "bot-like" manner
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
  session.send("")
}

bot.dialog('/', currentUser);
//bot.dialog('/intro',[intro, getCred, authentication, commands] )
bot.dialog('/intro', [intro, isDev]);
bot.dialog('/octobluDev', [octobluDev, devSetupCred, octobluDevCommands])
bot.dialog('/notOctobludev', [notOctobludev, isProgrammer])
bot.dialog('/octobluDevSetup', [checkCred, linkToConnector, installConnector, installationHelp, walkThruInstallation, connectorConfiguration])
bot.dialog('installationWalkThru', []);
bot.dialog('/nonDevSetup', [nonDevSetup, getBridgeIPAddress])
bot.dialog('/findBrigdeIPAddress', [findBrigdeIPAddress])

const health = (req, res) => {
  res.status(200).send({"online": "true"})
};

// Just a tester.
//app.get('/health', health)

app.post('/api/messages', connector.listen())


app.listen(3000, function () {
  console.log('BlueHueBot listening on port 3000!')
})
