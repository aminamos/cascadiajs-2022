let arc = require('@architect/functions')
let parseBody = arc.http.helpers.bodyParser
let data = require('@begin/data')
let crypto = require("crypto")

exports.handler = async function(req) {
  // authenticate the token passed in the header
  let titoSig = req.headers['Tito-Signature'] || req.headers['tito-signature']
  let hash = crypto.createHmac("sha256", process.env.TITO_WEBHOOK_KEY).update(req.body).digest("base64")
  // the hash of the POST body and the value of tito sig don't match, this is a bad request
  if (hash !== titoSig) {
    console.log('ERROR!!! the Tito sig and the calculated hash value did not match ', process.env.TITO_WEBHOOK_KEY, titoSig, hash)
    return {
      statusCode: 401,
      body: JSON.stringify({message: "not authorized"})
    }
  }
  // else, let's process the webhook!
  else {
    let action = req.headers['x-webhook-name'] || req.headers['X-Webhook-Name']
    // payment for the ticket has occurred
    if (action === 'registration.finished') {
      //console.log('processing registration.finished webhook')
      return registrationFinished(req)
    }
    // update the full name associated with ticket(s)
    else if (action === 'ticket.completed' || action === 'ticket.updated') {
      //console.log('processing ticket.completed or ticket.updated webhook')
      return ticketCompletedOrUpdated(req)
    }
    // delete voided tickets
    else if (action === 'ticket.voided') {
      //console.log('processing ticket.voided webhook')
      return ticketVoided(req)
    }
    else {
      console.log('unsupported webhook')
      console.log(parseBody(req))
      return {
        statusCode: 400,
        body: JSON.stringify({message: "unsupported webhook"})
      }
    }
  }
}

async function registrationFinished(req) {
  let titoOrder = parseBody(req)
  let receipt_number = parseInt(titoOrder.receipt.number)
  for (let ticket of titoOrder.tickets) {
    let record = {
      table: 'tickets',
      key: ticket.reference,
      release_slug: ticket.release_slug,
      release_title: ticket.release_title,
      receipt_number
    }
    // write ticket data to the DB
    await data.set(record)
  }

  return {
    statusCode: 201,
    body: JSON.stringify({success: true})
  }
}

async function ticketCompletedOrUpdated(req) {
  let titoTicket = parseBody(req)
  let key = titoTicket.reference
  let fullName = titoTicket.name
  // update the name associated with this ticket
  let doc = await data.get({ table: 'tickets', key })
  await data.set({ ...doc, fullName })
  return {
    statusCode: 200,
    body: JSON.stringify({success: true})
  }
}

async function ticketVoided(req) {
  let titoTicket = parseBody(req)
  let key = titoTicket.reference
  // delete the ticket
  await data.destroy({ table: 'tickets', key })
  return {
    statusCode: 200,
    body: JSON.stringify({success: true})
  }
}