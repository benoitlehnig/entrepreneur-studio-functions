import * as functions from 'firebase-functions'


export const slackInteractivity = functions.https.onRequest(async (request, response) => {
    response
        .status(200)
        .send("✅  Ça arrive !")

    console.log("slackInteractivity", request)
})
