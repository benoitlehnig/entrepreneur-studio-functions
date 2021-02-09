import * as functions from 'firebase-functions';
import {db} from '../../common/initFirebase'
let moment = require('moment');

const { IncomingWebhook } = require('@slack/webhook');

export const slackProjectGoPublic  = functions.firestore.document('projects/{projectId}').onUpdate((snap:any, context:any) => {

	const project = snap.after.data();
	const projectBefore = snap.before.data();
	console.log("projectGoPublic", project.sharingStatus);

	//sharing status
	if(project.sharingStatus ==='public' && projectBefore.sharingStatus ==='private'){
		const {slack} = functions.config()
		console.log("slack", slack)
		const webhook = new IncomingWebhook(slack.slack_webhook_url);

		console.log(" webhook");
		let logoUrl = "https://entrepreneur-studio.com/assets/images/previewWebPage.png";
		if( project.summary.logoUrl !==''){
			logoUrl= project.summary.logoUrl;
		}
		return webhook.send(
		{
			"blocks": [
			{
				"type": "section",
				"text": {
					"type": "mrkdwn",
					"text": "Un nouveau projet vient d'etre rendu public ! Venez le decouvrir ! "
				}
			},
			{
				"type": "divider"
			},
			{
				"type": "section",
				"text": {
					"type": "mrkdwn",
					"text": "*"+ project.summary.name+"*\n" + project.summary.elevatorPitch
				},
				"accessory": {
					"type": "image",
					"image_url": logoUrl,
					"alt_text": project.summary.name
				}
			},
			{
				"type": "actions",
				"elements": [
				{
					"type": "button",
					"text": {
						"type": "plain_text",
						"text":  "Decouvrez " + project.summary.name ,
						"emoji": true
					},
					"value": "click_me_123",
					"url": "https://entrepreneur-studio.com/project/"+ context.params.projectId
				}
				]
			}

			]
		})

		
	}

});

export const slackProjectTimelineProgress  = functions.firestore.document('projects/{projectId}/timeline/{timelineElementId}').onUpdate(async (snap:any, context:any) => {

	const timelineStatusAfter = snap.after.data();
	const timelineStatusBefore = snap.before.data();
	console.log("slackProjectTimelineProgress", timelineStatusAfter.status, timelineStatusBefore.status);

	if( timelineStatusAfter.status !== timelineStatusBefore.status){
		const _teamId = await db.collection('installations/slack/teams/').where('projectId', '==', context.params.projectId).get();
		const timelineElement = await db.doc('timeline/'+timelineStatusBefore.id).get();
		let stepName ="";
		if(timelineElement.exists){
			let timelineData = timelineElement?.data() ?? {title: ""};
			stepName = timelineData.title
		}
		let emoji=":muscle:";
		if( timelineStatusAfter.status ==='done'){
			emoji=":white_check_mark:";
		}
		if(!_teamId.empty){
			_teamId.forEach((doc) => {
				console.log(doc.id, ' => ', doc.data());
				const webhook = new IncomingWebhook(doc.data().incoming_webhook.url);
				return webhook.send(
				{
					"blocks": [
					{
						"type": "section",
						"text": {
							"type": "mrkdwn",
							"text": emoji+ " "+ stepName +" : "+ timelineStatusAfter.status
						}
					}

					]
				})
			});

		}
	}
	
});

export const slackNewUser  = functions.firestore.document('users/{userId}').onCreate(async (snap:any, context:any) => {
	const user = snap.data();
	const {slack} = functions.config()
	console.log("slack", slack)
	const webhook = new IncomingWebhook(slack.slack_webhook_url);

	console.log(" webhook");
	if(user.firstName ===""){
		user.firstName = "Un nouvel utilisateur"; 
	}

	return webhook.send(
	{
		"blocks": [
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": ":clap: "+ user.firstName+" vient de rejoindre la communaute !! Welcome !"
			}
		}

		]
	})

});

export const slackNewSkillSearch = functions.firestore.document('projects/{projectId}/skillSearches/{skillSearchId}').onCreate(async (snap:any, context:any) => {
	console.log("slackNewSkillSearch", context.params.projectId,context.params.skillSearchId)
	const skillSearch = snap.data();
	console.log("slackNewSkillSearch", context.params.projectId,context.params.skillSearchId, JSON.stringify(skillSearch))

	const projectId = context.params.projectId;
	let profileType="associé";
	if(skillSearch.type ==='partner'){profileType ="partnenaire"};
	if(skillSearch.type ==='contributor'){profileType ="contributeur"};
	const project =  await db.doc('projects/'+projectId).get();
	console.log("slackNewSkillSearch project", project.exists)
	if(project.exists){
		console.log("slackNewSkillSearch project2", project.exists)

		let projectData = project?.data() ?? {accessRights: 'any'};
		
		
		if(skillSearch.systemDNotificationRequest === true){
			console.log("slackNewSkillSearch systemDNotificationRequest",skillSearch.systemDNotificationRequest )

			const {slack} = functions.config()
			console.log("skillSearch", JSON.stringify(skillSearch))
			const webhook = new IncomingWebhook(slack.slack_webhook_url);
			if(skillSearch.type !=='associate' ){
				let payload={
					"blocks": [
					{
						"type": "section",
						"text": {
							"type": "mrkdwn",
							"text": ":clap: *"+ projectData.summary.name +"* recherche un/une "+ profileType +".\n "+skillSearch.freeText
						}
					}

					]
				}
				return webhook.send(payload)
			}
			if(skillSearch.type ==='associate' ){
				let payload2 ={
					"blocks": [
					{
						"type": "section",
						"text": {
							"type": "mrkdwn",
							"text": ":clap: "+ projectData.summary.name +" recherche un/une "+ profileType +" avec les compétences suivantes : "+skillSearch.skills + ".\n "+skillSearch.freeText
						},
						"accessory": {
							"type": "button",
							"text": {
								"type": "plain_text",
								"emoji": true,
								"text": "Interessé-e ! "
							},
							"action_id": "interested",
							"value":  projectId+"_"+context.params.skillSearchId
						}

					}


					]
				}
				console.log(JSON.stringify(payload2));
				return webhook.send(payload2).

			}
			
		}
		else{
			return "done";
		}
	}

});

export const slackInteractiveEndPoint = functions.https.onRequest(async (request:any, response:any) => {
	//console.log("slackInteractiveEndPoint", request	);
	console.log("slackInteractiveEndPoint", JSON.stringify(request.body.payload));
	const action = JSON.parse(request.body.payload);
	console.log(action.user.name)
	//response.sendStatus(200);
	if(action.actions[0].action_id ==='interested'){
		const projectId_searchRequestId = action.actions[0].value;
		const projectId=projectId_searchRequestId.split("_")[0];
		const searchRequestId=projectId_searchRequestId.split("_")[1];
		const responseSearchRequest = {
			user:action.user, 
			container:action.container,
			creationDate:moment().format()
		};
		return db.collection('projects/' +projectId+ '/skillSearches/'+searchRequestId+'/responses').add(responseSearchRequest).then(()=>{return response.sendStatus(200);});
	}else{
		return response.sendStatus(200);
	}


	//return db.collection('pro/'+context.auth.uid+ '/projects').add({projectId:res.id}).then(()=> {return {id:res.id, data: data}})

});