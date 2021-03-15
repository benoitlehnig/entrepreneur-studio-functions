import * as functions from 'firebase-functions'
import {db} from '../../common/initFirebase'

const sgMail = require('@sendgrid/mail');
const sendGrid_API_KEY = functions.config().sendgrid.key;
sgMail.setApiKey(sendGrid_API_KEY);


export const suggestTool = functions.https.onCall((data:any, context:any) => {
	console.log("suggestTool", data, context.auth.email)
	const templateId = "d-02fb4318db9b4b6798224e23cb187b0b";
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
				"tool": data,
				"user": context.auth.email
			},
		}
		],
		"from": "contact@entrepreneur-studio.com",
		"reply_to": "contact@entrepreneur-studio.com",
		"template_id": templateId
	}
	console.log("send message",msg);
	sgMail.send(msg);	
	return "OK";
});

export const toolCreated = functions.firestore.document('tools/{toolId}').onCreate((snap:any, context:any) => {
	console.log("toolCreated", snap, context);
	const docRef =db.doc('ApplicationParameters/statistics').get();
	return docRef.then((doc:any) => {
		if (!doc.exists) {
			console.log('toolsNumber:No such document!');
			return "KO";
		} 
		else{
			let toolNumbers = Number(doc.data().toolsCount);
			toolNumbers++;
			return db.doc('ApplicationParameters/statistics').update({toolsCount: toolNumbers} ).then(()=>{return " OK"});
			
		}

	});
	
});
export const toolDeleted = functions.firestore.document('tools/{toolId}').onDelete((snap:any, context:any) => {
	console.log("toolDeleted", snap, context);
	const docRef =db.doc('ApplicationParameters/statistics').get();
	return docRef.then((doc:any) => {
		if (!doc.exists) {
			console.log('toolsNumber:No such document!');
			return "KO";
		} 
		else{
			let toolNumbers = Number(doc.data().toolsCount);
			toolNumbers--;
			return db.doc('ApplicationParameters/statistics').update({toolsCount: toolNumbers}).then(()=>{return " OK"});			
		}

	});
	
});
export const toolLiked = functions.firestore.document('users/{userID}/toolLikes/{toolId}').onCreate((snap:any, context:any) => {
	console.log("toolLiked", JSON.stringify(context.params.toolId));
	const docRef =db.doc('/tools/'+context.params.toolId).get();
	return docRef.then((doc:any) => {
		if (!doc.exists) {

			console.log('toolLiked:No such document!');
			return "KO";

		} 
		else{
			let likes =0;
			if(doc.data().likes){
				likes = Number(doc.data().likes) +1;
			}
			else{
				likes =1;
			}
			console.log("likes to be updated", likes)
			return db.doc('tools/'+context.params.toolId).update({likes: likes} ).then(()=>{return " OK"});
			
		}

	});
});
export const toolUnLiked = functions.firestore.document('users/{userID}/toolLikes/{toolId}').onDelete((snap:any, context:any) => {
	console.log("toolUnLiked", snap, context);
	const docRef =db.doc('/tools/'+context.params.toolId).get();
	return docRef.then((doc:any) => {
		if (!doc.exists) {
			console.log('toolLiked:No such document!');
						return "KO";

		} 
		else{
			console.log('toolLiked: such document!');
			console.log('toolLiked: such document!',doc.data().likes );
			let likes =0;
			if(doc.data().likes){
				likes = Number(doc.data().likes) -1;
				if(likes <0){
					likes = 0;
				}
			}
			console.log("likes to be updated", likes)
			return db.doc('tools/'+context.params.toolId).update({likes: likes}).then(()=>{return " OK"});

		}
	});
});
