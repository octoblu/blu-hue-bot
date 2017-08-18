const firebase = require('firebase')

module.exports = {
  updateUserData: (session, callback) => {
    module.exports.currentUser( (user) => {
      firebase.database().ref('/users/' + user.uid + '/session/userData').update(session.userData).then(() => {
        return callback(null)
      }).catch((error) => {
        console.log('error: ', error);
        return callback('Failed to update database.')
      })
    })
  },
  getUserData: (uid, callback) => {
     firebase.database().ref('/users/' + uid).once('value').then((snapshot) => {
       return callback(null, snapshot.val().session.userData)
     }).catch((error) => {
       console.log('error: ', error);
       return callback('Failed to read data from database')
     })
   },
   currentUser: (callback) => {
     firebase.auth().onAuthStateChanged((user) => {
       return callback(user)}
     )
   },
   login: (email, password, callback) => {
    firebase.auth().signInWithEmailAndPassword(email, password).then( () => {
      return callback()
    }).catch( (error) => {
      return callback(error)
    });
   },
   register: (email, password) => {
    //
  },
   init: (() => {
     let config = {
       apiKey: 'AIzaSyAPY3yNUMgPD1aHq-tio6GCpy4SgIqHtfo',
       authDomain: "blu-hue-bot.firebaseapp.com",
       databaseURL: "https://blu-hue-bot.firebaseio.com",
       projectId: "blu-hue-bot",
       storageBucket: "blu-hue-bot.appspot.com",
       messagingSenderId: '548368913964'
     };
     firebase.initializeApp(config);
   })()
 }
