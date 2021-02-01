import * as functions from 'firebase-functions';

const { IncomingWebhook } = require('@slack/webhook');

export const slackProjectGoPublic  = functions.firestore.document('projects/{projectId}').onUpdate((snap:any, context:any) => {

	const project = snap.after.data();
	const projectBefore = snap.before.data();
	console.log("projectGoPublic", project.sharingStatus);
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