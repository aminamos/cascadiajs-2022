let arc = require('@architect/functions')
let data = require('@begin/data')
let getSpeakerData = require('@architect/shared/get-speaker-data')
let StreamView = require('@architect/views/live/stream')
let ExpoView = require('@architect/views/live/expo')
let JobsView = require('@architect/views/live/jobs')
let EmbedView = require('@architect/views/live/embed')
let WebInputView = require('@architect/views/live/web-input')
let NotFoundView = require('@architect/views/404')

async function getPlaybackId(req) {
  // enable override of the playbackId for testing purposes
  let playbackIdOverride = req.queryStringParameters.playbackId
  let setting = await data.get( {table: 'settings', key: 'playbackId' })
  return playbackIdOverride || (setting ? setting.value : undefined)
}

async function getWebInputPlaybackId(req) {
  // enable override of the playbackId for testing purposes
  let playbackIdOverride = req.queryStringParameters.playbackId
  let setting = await data.get( {table: 'settings', key: 'webInputPlaybackId' })
  return playbackIdOverride || (setting ? setting.value : undefined)
}

// render the form
async function unauthenticated(req) {
  let { view } = req.params
  let { ticketRef } = req.session
  if (view === 'web-input') {
    let playbackId = await getPlaybackId(req)
    return WebInputView({ playbackId })
  }
  else if (view === 'embed') {
    let webInputPlaybackId = await getWebInputPlaybackId(req)
    return EmbedView({ webInputPlaybackId })
  }
  else if (!ticketRef) {
    return { location: `/home/login?message=${ encodeURIComponent("Please log-in") }`}
  }
}

async function Live(req) {
  let { view } = req.params
  let ticket
  if (req.session.ticketRef) {
    ticket = await data.get({ table: 'tickets', key: req.session.ticketRef })
  }
  let speakerData = await getSpeakerData(req)
  let speakers = speakerData.speakers
  //let links = await data.get( {table: 'links', limit: 100 })

  if (view === 'stream') {
    let playbackId = await getPlaybackId(req)
    return StreamView({ speakers, ticket, playbackId })
  }
  else if (view === 'expo') {
    return ExpoView()
  }
  else if (view === 'jobs') {
    return JobsView()
  }
  else {
    return
  }
}

exports.handler = arc.http.async(unauthenticated, Live, NotFoundView)