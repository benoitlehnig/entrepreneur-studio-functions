import * as functions from 'firebase-functions'
import {verifySlackPostRequest} from './utils/verifySlackPostRequest'
const fetch = require('node-fetch');
import {db} from '../../common/initFirebase'
let moment = require('moment');

export const slackInteractivity = functions.https.onRequest(async (request:any, response:any) => {
    if (!await verifySlackPostRequest(request, response)) {
        return response.status(418).send("I'm a teapot ☕️")
    }
    response
    .status(200)
    .send("✅  Message envoyé !")

   // console.log("slackInteractivity", JSON.stringify(request));

    response.send()

    console.log(`${request.body.team_domain} ${request.body.user_name}`)

    const inputText = request.body.text.trim().toLowerCase()
    await saveComment(inputText, `${request.body.team_id}`,`${request.body.user_name}`).then(()=>{return "ok"})
    const responseUrl = request.body.response_url

    return fetch(responseUrl, {
        method: "POST",
        body: "ok"
    })
})


export const saveComment = async (comment:any,teamId:any, user_name:any)=> {
    console.log("saveComment " , comment)
    const _teamId = await db.doc('installations/slack/teams/'+teamId).get();
    if(_teamId.exists){
        let _teamIdData = _teamId?.data() ?? {projectId: null};
        if(_teamIdData.projectId !==null){
            let newComment ={
                createdAt: moment().format(),
                createdBy:user_name,
                text:comment,
                status:'received',
                source:'slack',
                uid:""
            }
            console.log("saveComment, user_name, projectId", _teamIdData.projectId, JSON.stringify(newComment));
            return db.collection('projects/'+_teamIdData.projectId+'/comments').add(newComment).then(()=>{return "ok"});
        }
    }
   
    return "ok";
}

