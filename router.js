const auth = require('./auth')
const path = require('path')
const bodyParser = require('body-parser')
const express = require('express')
const app = express()

module.exports = {
  listen: (connector) => {
    app.post('/api/messages', connector.listen())
    app.get('/', (request, response) => {
      response.sendFile(path.join(__dirname + '/UI/index.html'))
    })
    app.listen(3000, function () {
      console.log('BlueHueBot listening on port 3000!')
    })
  },
  loginPage: (() => {
    app.get('/login', (request, response) => {
      auth.currentUser( (user) => {
        user ? response.sendFile(path.join(__dirname + '/UI/chat.html')) : response.sendFile(path.join(__dirname + '/UI/login.html'))
      })
    })
  })(),
  beginChat: (() => {
    app.get('/chat', (request, response) => {
      // session.beginDialog('/')
      response.sendFile(path.join(__dirname + '/UI/chat.html'))
    })
  })(),
  prepare: (() => {
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(express.static(path.join(__dirname + '/UI')))
  })(),
  login: (() => {
    app.post('/loginUser', (request, response) => {
      let email = request.body.email
      let password = request.body.password
      auth.login(email, password, (error) => {
        if (error) {
          let errorCode = error.code;
          let errorMessage = error.message;
          if (errorCode === 'auth/wrong-password') {
            console.log(errorMessage);
            response.redirect('/login')
          } else {
            console.log(errorMessage);
          }
          console.log(error);
        }
        else {
          response.redirect('/chat')
        }
      })
    })
  })(),
  register: () => {
    app.post('/registerUser', (request, response) => {
      let email = request.body.email
      let password = request.body.password
      auth.register(email, password)
    })
  }
}
