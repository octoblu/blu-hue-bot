const _ = require('lodash')
const request = require('request');
const async = require('async');

module.exports = {
  findLight: (session, results, next) => {
    let nameOfLight = results.response
    let listOflights = session.userData.listOflights
    let foundLight;

    _.forEach(listOflights, (lightProps, lightID) => {
      if (foundLight) return false
      foundLight = _.includes(lightProps, nameOfLight) ? lightProps : null
    })
    if (foundLight) {
      session.dialogData.foundLight = foundLight
      next()
    }
    else
    {
      session.send('I don\'t recognize ' + nameOfLight + ' as one of your light.')
      session.endDialog()
    }
  },
  getAllLights: (session, callback) => {
    //   Make sure there's at least one bridge to work with
    if (!session.userData.bridgeInfo) {
      session.beginDialog('no_bridge')
    }
    else
    {
      let ipAddress = session.userData.bridgeInfo.internalipaddress
      let username = session.userData.bridgeInfo.username
      let url = 'http://' + ipAddress + '/api/' + username + '/lights'
      request.get(url, (error, response, body) => {
        if (error) {
          console.log('error', error);
          session.send('I ran into problem getting the lights connected to your bridge.')
          return
        }
        //  body contains the list of lights connected to the bridge
        let responseBody = JSON.parse(body)
        let listOflights = {}
        //  save the lights locally as {name: 'name', state: 'on|off' ...}
        _.forEach(responseBody, (value, key) => {
          listOflights[key] = {
            'name': value.name,
            'state': (value.state.on === true) ? 'on' : 'off',
            'id': key
          }
        })
        session.userData.listOflights = listOflights
        callback()
      })
    }
  },
  discoverNewLight: (session, callback) => {
    let ipAddress = session.userData.bridgeInfo.internalipaddress
    let username = session.userData.bridgeInfo.username
    let url = 'https://' + ipAddress + 'api/' + username + '/lights'

    //  First, search for new lights
    request.post(url, (error, response, body) => {
      if (error) callback(error)
      // let responseBody = JSON.parse(body)
      if (!_.find(body, 'success')) callback('I ran into problem when searching for new lights')

      callback(null, session)
    })
  },
  getNewLights: (error, session) => {
    if (error) {
      session.send('I ran into problem getting new lights.')
      session.endDialog()
    }

    let ipAddress = session.userData.bridgeInfo.internalipaddress
    let username = session.userData.bridgeInfo.username
    let url = 'https://' + ipAddress + 'api/' + username + '/lights/new'

    //  then, get the new lights
    request.get(url, (error, response, body) => {
      if (error) return error

      // let responseBody = JSON.parse(body)
      let newLights = 'I found ' + _.size(body) - 1 + ' new lights.\n'
      _.forEach(body, (value, key) => {
        session.userData.listOflights[key] = { name: value.name }
        newLights += value.name + '\n'
      })
      //  create new connectors for new lights
      if (session.userData.devMode) session.beginDialog('create_connector')
      session.send(newLights)
      session.endDialog()
    })
  },
  findBridgePushed: (listOfBridges, callback) => {
    //  call callback after _.forEach runs on each bridge
    let after = _.after(_.size(listOfBridges), () => {
      callback('None of the bridges I found was pushed.')
    })
    _.forEach(listOfBridges, (eachBridge) => {
      if (_.find(eachBridge, 'username')) return false
      let url = 'http://' + eachBridge.internalipaddress + '/api/'
      request.post(url, {json: {'devicetype': 'blu-hue-bot#bridge'}}, (error, response, body) => {
        if (error) callback(error)
        if (body[0]['success']) {
          eachBridge.username = body[0]['success']['username']
          callback(null, eachBridge)
        }
        else { after() }
      })
    })
  },
  getConn: (session, nameOfConn, foundLight, callback) => {
    request.post('https://' + session.userData.UUID + ':' + session.userData.TOKEN + '@meshblu-http.octoblu.com/search/devices', {json: {type: 'device:hue-light'}}, (error, response, body) => {
      if (error) {
        session.send('I ran into problem finding the connector.')
      }
      let conn = _.find(body, {name: nameOfConn})
      if (!conn) return session.send('I don\'t recognize' + nameOfConn + ' as one of your connectors')
      callback(session, conn, foundLight)
    })
  },
  setConn: (session, conn, foundLight) => {
    session.userData.listOflights[foundLight.id].uuid = conn.uuid
    session.userData.listOflights[foundLight.id].token = conn.token
    let opt = {
      method: 'PUT',
      url: 'https://' + session.userData.UUID + ':' + session.userData.TOKEN + '@meshblu.octoblu.com/devices/' + conn.uuid,
      json: {
        "name": foundLight.name,
        "desiredState": {on: foundLight === 'on'},
        "options": {
          "ipAddress": session.userData.bridgeInfo.internalipaddress,
          "apiUsername": session.userData.bridgeInfo.username,
          "lightNumber": parseInt(foundLight.id)
        }
      }
    }
    request(opt, (err, res, body) => {
      if (err) return session.send('I ran into problem setting the connector.')
      session.send('I successfully connected the light to connector')
    })
  },
  setter: (session, listOflights, callback) => {
    let after = _.after(_.size(listOflights), () => {
      callback(null)
    })
    async.each(listOflights, (eachLight, callback) => {
      let opt = {
        method: 'PUT',
        url: 'https://' + session.userData.UUID + ':' + session.userData.TOKEN + '@meshblu.octoblu.com/devices/' + eachLight.uuid,
        json: {
          "desiredState": {on: eachLight.state === 'on'},
          "options": {
            "ipAddress": session.userData.bridgeInfo.internalipaddress,
            "apiUsername": session.userData.bridgeInfo.username,
            "lightNumber": parseInt(eachLight.id)
          }
        }
      }
      request(opt, (err, res, body) => {
        if (err) return callback(err)
        after()
      })
    }, (err) => {
      if (err) return callback(err)
      callback(null)
    })
  },
  creator: (session, listOflights, callback) => {
    let after = _.after(_.size(listOflights), () => {
      callback(null)
    })
    async.each(listOflights, (eachLight, callback) => {
      if (!eachLight.uuid) {
        let opt = {
          method: 'POST',
          url: 'https://' + session.userData.UUID + ':' + session.userData.TOKEN + '@connector-service.octoblu.com/users/' + session.userData.UUID + '/connectors',
          json: {
            "name": eachLight.name,
            "githubSlug": "octoblu/meshblu-connector-hue-light",
            "type": "device:hue-light",
            "connector": "meshblu-connector-hue-light",
            "registryItem": {
              "_id": "octoblu-meshblu-connector-hue-light",
              "name": "Phillips Hue Light",
              "description": "Philips hue combines brilliant LED light with intuitive technology, then puts it in the palm of your hand. Experiment with shades of white, from invigorating blue/white to cozy yellow/white.",
              "type": "device:hue-light",
              "tags": [ "Home Automation" ]
            }
          }
        }
        request(opt, (err, res, body) => {
          if (err) return callback(err)
          eachLight.uuid = body.uuid
          eachLight.token = body.token
          after()
        })
      }
      else {
        after()
      }
    }, (err) => {
      if (err) return callback(err)
      callback(null, session, listOflights)
    })
  }
}
