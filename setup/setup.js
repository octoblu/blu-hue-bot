module.exports = [
  // request bridges
  (session) => {
    // find all the bridges within the current WiFi
    session.beginDialog('get_bridges')
  },
  // Set User's Bridge
  (session, results) => {
    if (results.bridge) {
      session.userData.bridgeInfo = results.bridge
      session.send('I found your bridge.')
      session.endDialog()
    }
    else
    {
      session.send(results.error)
      session.endDialogWithResult(results)
    }
  }
]
