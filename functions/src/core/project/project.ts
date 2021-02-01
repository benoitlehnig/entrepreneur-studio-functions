import * as functions from 'firebase-functions'
import {db,auth} from '../../common/initFirebase'
const fetch = require('node-fetch');



const sgMail = require('@sendgrid/mail');
const sendGrid_API_KEY = functions.config().sendgrid.key;
sgMail.setApiKey(sendGrid_API_KEY);
let moment = require('moment');

import { createApi } from 'unsplash-js';
const unsplash = createApi({
	accessKey: functions.config().unsplash.accesskey,
	fetch: fetch,
});


export const createProject =  functions.https.onCall((data:any, context:any) => {	
	console.log("createProject", data,   context.auth.uid);
	data.ownerUid = context.auth.uid;
	return db.collection('projects').add(data).then(function(res:any){
		console.log(res.id);
		return db.collection('users/'+context.auth.uid+ '/projects').add({projectId:res.id}).then(()=> {return {id:res.id, data: data}})
	});
});
export const onUpdateProject = functions.firestore.document('projects/{projectId}').onUpdate((snap:any, context:any) => {
	
	const currentDateTime = moment();
	console.log("onUpdateProject", snap, context,currentDateTime);
	/*
	const projectId = context.params.projectId;
	db.doc('projects/'+projectId).update({lastUpdateDateTime: currentDateTime}, {merge:true});
	return {"project updated": "done"}
	*/

});



export const inviteTeamMember =  functions.https.onCall((data:any, context:any) => {
	console.log("inviteTeamMember",  context.auth.uid);
	let email = data.email;
	let projectId = data.projectId;
	let teamMemberId = data.teamMemberId;
	console.log("email", email ,"projectId",projectId );
	//knowing if the team member already exists
	return auth.getUserByEmail(email).then(function(userRecord:any) {
		console.log("member exists",  userRecord.uid);
		return db.collection('users/'+userRecord.uid+'/projects').add({projectId:projectId}).then(()=>{return "OK"})
		return db.doc('projects/'+projectId+'/teamMembers/'+teamMemberId).update({uid:userRecord.uid}).then(()=>{return "OK"})
		return "ok";
	})
	.catch(function(error:any) {
		console.log('Error fetching user data:', error);
	});

	return db.collection('invites/'+email+'/projectIds').add({projectId:projectId}).then(function(res:any){
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



export const getBackgroundPictures = functions.https.onCall((data:any, context:any) => {
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
			console.log('success:  ', result.response);
			const photo = result.response;
			return{photo};
		}
	});
})


export const getProjectAccess = functions.https.onCall(async (data:any, context:any) => {
	console.log(" getProjectAccess" , data.projectId, context.auth);
	let accessRights= {read:false, write:false};
	const projectId = data.projectId;
	const project = await db.doc('projects/'+projectId).get();
	if(project.exists){
		console.log(" project exists" );
		let projectData = project?.data() ?? {accessRights: 'any'};
		console.log(" projectData,", projectData.accessRights  );

		if(projectData.sharingStatus ==='public'){
			accessRights.read =true;
		}
		
		if(context.auth !== undefined){
			const projectUid = await db.collection('users/'+context.auth.uid+'/projects').where('projectId', '==', projectId).get();
			console.log(" projectData projectUid,",projectUid  );

			if(!projectUid.empty){
				accessRights.write =true;
				accessRights.read =true;
			}
		}


	}
	return accessRights;

});