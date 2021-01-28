// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const API_KEY = functions.config().sendgrid.key;
sgMail.setApiKey(API_KEY);
const urlMetadata = require('url-metadata')

const fetch = require('node-fetch');
import { URLSearchParams } from 'url';

let moment = require('moment');


//unsplash
import { createApi } from 'unsplash-js';
const unsplash = createApi({
	accessKey: '1tvDFsKncEDi7VPBlZUlh0mEgd6h-xQ0umd04AkWOkA',
	fetch: fetch,
});

//SLACK


admin.initializeApp();

exports.createUser = functions.https.onCall((data:any, context:any) => {
	console.log("createUser", data, data.email);
	let profileData = {
		given_name:"",
		family_name:"",
		email:data.email
	}

	if(data.profileData.given_name !== null && data.profileData.given_name !== undefined){
		profileData.given_name = data.profileData.given_name
	}

	if(data.profileData.family_name !== null && data.profileData.family_name !== undefined){
		profileData.family_name = data.profileData.family_name
	}
	if(data.profileData.email !== null && data.profileData.email !== undefined){
		profileData.email = data.profileData.email
	}
	let photoUrl = null;
	if(data.photoURL ){
		photoUrl =data.photoURL
	}
	console.log("createUser >> role", data.role )
	if(data.role ==='incubator'){
		console.log("createUser >> incubator", data.role )
		admin.auth().setCustomUserClaims( data.uid, {incubator: true, entrepreneur:false})
	}
	if(data.role ==='entrepreneur'){
		console.log("createUser >> entrepreneur", data.role )

		admin.auth().setCustomUserClaims( data.uid, {incubator: false, entrepreneur:true}).then(
			()=>{
				console.log("createUser >> entrepreneur >> claims DONE", data.role )
			});
	}

	if(profileData !== null) {
		admin.firestore().collection('users').doc(data.uid).set(
			{role:data.role, projects:[],firstName:profileData.given_name, lastName:profileData.family_name, email:profileData.email,photoUrl:photoUrl });
	}
});

exports.initiateUser = functions.auth.user().onCreate((user:any) => {
	console.log("initiateUser", "onCreate",user );
	console.log('invites/'+user.email+'/projectIds');
	if(user.email){
		admin.firestore().collection('invites/'+user.email+'/projectIds').get()
		.then(function(querySnapshot:any) {
			querySnapshot.forEach(function(doc:any) {
				// doc.data() is never undefined for query doc snapshots
				console.log("data" , doc.data(),doc.id)
				console.log(doc.id, " => ", doc.data());
				admin.firestore().collection('users/'+user.uid+'/projects').add({projectId:doc.id})
			});
		})
		.catch(function(error:any) {
			console.log("Error getting documents: ", error);
		});
	}
	
});

exports.updateUserPhotoUrl = functions.https.onCall((data:any, context:any) => {
	if(data.photoUrl !== undefined){
		admin.firestore().collection('users').doc(data.uid).update({photoUrl:data.photoUrl}, {merge: true});
	}
});

exports.createProject =  functions.https.onCall((data:any, context:any) => {
	console.log("createProject", data,   context.auth.uid);
	data.ownerUid = context.auth.uid;
	return admin.firestore().collection('projects').add(data).then(function(res:any){
		console.log(res.id);
	


		admin.firestore().collection('users/'+context.auth.uid+ '/projects').add({projectId:res.id})
		return {id:res.id, data: data};
	});
});
exports.onUpdateProject = functions.firestore.document('projects/{projectId}').onUpdate((snap:any, context:any) => {
	
	const currentDateTime = moment();
	console.log("onUpdateProject", snap, context,currentDateTime);
	/*
	const projectId = context.params.projectId;
	admin.firestore().doc('projects/'+projectId).update({lastUpdateDateTime: currentDateTime}, {merge:true});
	return {"project updated": "done"}
	*/

});
exports.newPartnerRequest =  functions.https.onCall((data:any, context:any) => {
	console.log("newPartnerRequest", data);
	return 'OK'
});

exports.createTool =  functions.https.onCall((data:any, context:any) => {
	console.log("createTool", data,   context.auth.uid);
	return admin.firestore().collection('tools').add(data).then(function(res:any){
		console.log(res.id);
		return {id:res.id, data: data};
	});
});

exports.inviteTeamMember =  functions.https.onCall((data:any, context:any) => {
	console.log("inviteTeamMember",  context.auth.uid);
	let email = data.email;
	let projectId = data.projectId;
	let teamMemberId = data.teamMemberId;
	console.log("email", email ,"projectId",projectId );
	//knowing if the team member already exists
	admin.auth().getUserByEmail(email).then(function(userRecord:any) {
		console.log("member exists",  userRecord.uid);
		admin.firestore().collection('users/'+userRecord.uid+'/projects').add({projectId:projectId})
		admin.firestore().doc('projects/'+projectId+'/teamMembers/'+teamMemberId).update({uid:userRecord.uid}, {merge:true});

	})
	.catch(function(error:any) {
		console.log('Error fetching user data:', error);
	});

	return admin.firestore().collection('invites/'+email+'/projectIds').add({projectId:projectId}).then(function(res:any){
		console.log(res.id);
		let templateId = "d-d1e9d23c8ced465eb9c2bfdf03834f83";
		let msg={
			"personalizations": [
			{
				"to": [
				{
					"email": email,
					"name": email
				}
				],
				"dynamic_template_data": {
					"projectId": projectId,
					"project": data.project
				},
			}
			],
			"from": "contact@entrepreneur-studio.com",
			"reply_to": "contact@entrepreneur-studio.com",
			"template_id": templateId
		}
		console.log("send message", JSON.stringify(msg));
		sgMail.send(msg);	
		return {id:res.id, data: data, msg:msg};
	});
});

exports.getMetadata =  functions.https.onCall((data:any, context:any) => {
	console.log("getMetadata", data.url)
	return urlMetadata(data.url).then(
		function (metadata:any) { // success handler
			return JSON.stringify(metadata);
		},
		function (error:any) { // failure handler
			console.log(error)
			return error
		})
});

exports.sendFeedbackEmail = functions.firestore.document('feedback/{docId}').onCreate((snap:any, contexta:any) => {
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
exports.suggestTool = functions.https.onCall((data:any, context:any) => {
	console.log("suggestTool", JSON.stringify(data))
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
				"tool": data.tool,
				"email": data.email
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

exports.toolCreated = functions.firestore.document('tools/{toolId}').onCreate((snap:any, context:any) => {
	console.log("toolCreated", snap, context);
	const docRef =admin.firestore().doc('ApplicationParameters/tools').get();
	docRef.then((doc:any) => {
		if (!doc.exists) {
			console.log('toolsNumber:No such document!');
		} 
		else{
			let toolNumbers = Number(doc.data().number);
			toolNumbers++;
			admin.firestore().doc('ApplicationParameters/tools').update({number: toolNumbers}, {merge:true});
		}

	});
});
exports.toolDeleted = functions.firestore.document('tools/{toolId}').onDelete((snap:any, context:any) => {
	console.log("toolDeleted", snap, context);
	const docRef =admin.firestore().doc('ApplicationParameters/tools').get();
	docRef.then((doc:any) => {
		if (!doc.exists) {
			console.log('toolsNumber:No such document!');
		} 
		else{
			let toolNumbers = Number(doc.data().number);
			toolNumbers--;
			admin.firestore().doc('ApplicationParameters/tools').update({number: toolNumbers}, {merge:true});
		}

	});
});
exports.toolLiked = functions.firestore.document('users/{userID}/toolLikes/{toolId}').onCreate((snap:any, context:any) => {
	console.log("toolLiked", JSON.stringify(context.params.toolId));
	const docRef =admin.firestore().doc('/tools/'+context.params.toolId).get();
	docRef.then((doc:any) => {
		if (!doc.exists) {
			console.log('toolLiked:No such document!');
		} 
		else{
			console.log('toolLiked: such document!');
			console.log('toolLiked: such document!',doc.data().likes );
			let likes =0;
			if(doc.data().likes){
				likes = Number(doc.data().likes) +1;
			}
			else{
				likes =1;
			}
			console.log("likes to be updated", likes)
			admin.firestore().doc('tools/'+context.params.toolId).update({likes: likes}, {merge:true});
		}

	});
});
exports.toolUnLiked = functions.firestore.document('users/{userID}/toolLikes/{toolId}').onDelete((snap:any, context:any) => {
	console.log("toolUnLiked", snap, context);
	const docRef =admin.firestore().doc('/tools/'+context.params.toolId).get();
	docRef.then((doc:any) => {
		if (!doc.exists) {
			console.log('toolLiked:No such document!');
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
			admin.firestore().doc('tools/'+context.params.toolId).update({likes: likes}, {merge:true});
		}

	});
});

exports.getBackgroundPictures = functions.https.onCall((data:any, context:any) => {
	return unsplash.search.getPhotos({
		query: 'landscape',
		page: 1,
		perPage: 12,
		color: 'blue',
		orientation: 'landscape',
	}).then(result => {
		switch (result.type) {
			case 'error':
			console.log('error occurred: ', result.errors[0]);
			case 'success':
			const photo = result.response;
			return{photo};
		}
	});
})

exports.oauthRedirect = functions.https.onRequest(async (request:any, response:any) => {
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

    const params = new URLSearchParams();
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

    return response.header("Location", `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com/slack/success`).send(302)
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
    return await admin.firestore().collection("installations")
        .doc(slackResultData.team.id).set({
            token: slackResultData.access_token,
            teamId: slackResultData.team.id,
            teamName: slackResultData.team.name,
            createdAt: moment()
        })
}