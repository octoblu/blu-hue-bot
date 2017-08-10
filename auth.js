const firebase = require('firebase')

module.exports = {
  getUserData: (uid, callback) => {
     firebase.database().ref('/users/' + uid).once('value').then((snapshot) => {
       return callback(snapshot.val().session.userData)
     }).catch((error) => {
       console.log('error: ', error);
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
