import * as functions from 'firebase-functions'

const sgMail = require('@sendgrid/mail');
const sendGrid_API_KEY = functions.config().sendgrid.key;
sgMail.setApiKey(sendGrid_API_KEY);

export const newPartnerRequest =  functions.https.onCall((data:any, context:any) => {
	console.log("newPartnerRequest", data);
	return 'OK'
});


export const sendFeedbackEmail  = functions.firestore.document('feedback/{docId}').onCreate((snap:any, contexta:any) => {
	// Get an object representing the document
	// e.g. {'name': 'Marie', 'age': 66}
	const newValue = snap.data();

	const templateId = "d-2b2f03404c394eee976ffe85a9bb7863";
	const msg={
		"personalizations": [
		{
			"to": [
			{
				"email": "pr.mathieu@gmail.com",
				"name": "entrepreneur studio"
			}
			],
			"dynamic_template_data": {
				"feedback": newValue
			},
		}
		],
		"from": "contact@entrepreneur-studio.com",
		"reply_to": "contact@entrepreneur-studio.com",
		"template_id": templateId
	}
	console.log("send message",newValue);
	sgMail.send(msg);	
	return "OK";
});