/*
 *   Microservice to download individual audio clips and stitch them together (transcoding each file). 
 *   The output is a homogenous audio file wth consistent codec, bitrate and frame rate.
 *
 *   Author: Josh Perry
 *   25 February 2019
 */

// Includes
let AudioManager = require('./audio-handling/audio_manager');
let SessionMetrics = require('./audio-handling/session_metrics');
const API_KEY = require('./config/api_key');

exports.handler = async (event, context, callback) => {
    console.log(`ROOT: Received request to process radcast`);
    
    // Get event parameters - can either come in the form of AWS SNS message or through API gateway 
    let payload = event.Records ? JSON.parse(event.Records[0].Sns.Message) : event;
    let apiKey  = payload.apiKey;

    // Auth from legitimate source
    if (apiKey !== API_KEY.PRIVATE_KEY) {
        console.warn('INDEX: Received API request from un-authorized source');
        console.log(payload);
        return callback(null, {
            statusCode: 403,
            body: 'Permission denied'
        });
    }

    // Send response that work will start
    // NOTE: This doesn't actually send a response, Lambda is conifugred to only send the res when the function completes
    callback(null, {
        statusCode: 200,
        body: `Creating stitched audio file`
    });

    // Gather request data
    let audioURLs = payload.audioURLs;
    let writeStream = payload.writeStream;

    // Start audio processing with timeout catch failure just before the instance is shut down
    let sessionMetrics = new SessionMetrics();
    let audioManager = new AudioManager(audioURLs, writeStream, sessionMetrics);
    let result = await audioManager.startAudioProcessing();
    console.log(result);
};