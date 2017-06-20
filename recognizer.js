module.exports = {
  recog:(bot, builder, connector) => {
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
              intent = {score: 1.0, intent: 'Change Light Name'}
              break;
            case 'dev mode':
              intent = {score: 1.0, intent: 'Dev Mode'}
              break;
            case 'switch light':
              intent = {score: 1.0, intent: 'Switch Light'}
              break;
            case 'activate flow':
              intent = {score: 1.0, intent: 'Flow'}
            case 'connect connector':
              intent = {score: 1.0, intent: 'connect connector'}
              break;
            default:
          }
          done(null, intent)
        }
      }
    })
  }
};
