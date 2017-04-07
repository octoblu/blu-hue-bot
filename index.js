const builder = require('botbuilder');
const { ChatConnector, UniversalBot } = builder;
const express = require('express')
const app = express()


const connector = new ChatConnector({
  appId: 'cf720a5c-8f43-4940-82c6-92d3fddbcab1',
  appPassword: 'U1TTm2HqWQ3N34zdEpQAqeS'
});

const bot = new UniversalBot(connector);
bot.dialog('/', (session) => {
    session.send("Hello World");
});

const health = (req, res) => {
  res.status(200).send({"online": "true"})
};

app.get('/health', health)
app.post('/api/messages', connector.listen())


app.listen(3000, function () {
  console.log('BlueHueBot listening on port 3000!')
})
