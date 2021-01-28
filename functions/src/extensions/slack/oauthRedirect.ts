import * as functions from 'firebase-functions'
const fetch = require('node-fetch');
const url = require('url');
import {db} from '../../common/initFirebase'
let moment = require('moment');


export const oauthRedirect = functions.https.onRequest(async (request:any, response:any) => {
    const {slack} = functions.config()

    if (!slack || !slack.client_id || !slack.client_secret) {
        console.error("Missing slack credentials (client_id or client_secret)")
        return response.status(501).send("Missing slack credentials")
    }

    if (request.method !== "GET") {
        console.error('Got unsupported ${request.method} request. Expected GET.')
        return response.status(405).send("Only GET requests are accepted")
    }

    // SSL_CHECK by slack to confirm SSL cert
    if (request.query && request.query.ssl_check === "1") {
        console.log("Confirmed SSL Cert")
        return response.status(200).send()
    }

    // @ts-ignore
    if (!request.query && !request.query.code) {
        return response.status(401).send("Missing query attribute 'code'")
    }

    const params = new url.URLSearchParams()
    params.append('code', `${request.query.code}`)
    params.append('client_id', `${slack.client_id}`)
    params.append('client_secret', `${slack.client_secret}`)
    params.append('redirect_uri', `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/oauthRedirect`)

    const result = await fetch("https://slack.com/api/oauth.v2.access", {
        method: "POST",
        body: params
    })

    if (!result.ok) {
        console.error("The request was not ok: " + JSON.stringify(result))
        return response.header("Location", `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com`).send(302)
    }

    const slackResultData = await result.json()
    await saveNewInstallation(slackResultData)

    return response.header("Location", `https://entrepreneur-studio.com/slack/success`).send(302)
})

export const saveNewInstallation = async (slackResultData: {
    team: {
        id: string,
        name: string
    },
    access_token: string,
    incoming_webhook: {
        url: string,
        channel_id: string
    }
}) => {
    return await db.collection("installations/slack/teams")
        .doc(slackResultData.team.id).set({
            token: slackResultData.access_token,
            teamId: slackResultData.team.id,
            teamName: slackResultData.team.name,
            createdAt: moment()
        })
}