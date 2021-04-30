const {google} = require('googleapis');
import * as functions from 'firebase-functions'
import {db} from '../../common/initFirebase'
let moment = require('moment');

// If modifying these scopes, delete token.json.
const SCOPES = [
'https://www.googleapis.com/auth/drive.metadata.readonly',
'https://www.googleapis.com/auth/drive.file',
'https://www.googleapis.com/auth/drive.install',
'https://www.googleapis.com/auth/drive.appdata',
'https://www.googleapis.com/auth/drive'
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const {googledrive} = functions.config()


export const driveOauth2callback = functions.https.onRequest(async (request:any, response:any) => {
	console.log("driveOauth2callback",  request.query);
	console.log("driveOauth2callback",  JSON.stringify(request.query));
	console.log("driveOauth2callback",  JSON.stringify(request.query.state));

	const projectId= request.query.state.split("_")[0];
	const uid= request.query.state.split("_")[1];
	const code= request.query.code;
	let oAuth2Client = new google.auth.OAuth2(
		googledrive.client_id, 
		googledrive.client_secret, 
		"https://us-central1-entrepeneur-studio.cloudfunctions.net/driveOauth2callback");

	oAuth2Client.getToken(code, (err:any, token:any) => {
		if (err)  {
			console.error('Error retrieving access token', err);
			return "OK"
		}
		else{
			console.log("token,projectId,uid ",token,projectId,uid)
			return saveNewInstallation(token,projectId,uid);
		}
		
	})
	return response.header("Location", `https://entrepreneur-studio.com/project/`+projectId+ '/resources?installApp=Drive').send(302)
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 */
 export const getGoogleDriveAuthenticationUrl = functions.https.onCall( async(data:any, context:any) => {
 	let uid = context.auth.uid;
 	let oAuth2Client = new google.auth.OAuth2(
 		googledrive.client_id, 
 		googledrive.client_secret, 
 		"https://us-central1-entrepeneur-studio.cloudfunctions.net/driveOauth2callback");

 	return oAuth2Client.generateAuthUrl({
 		scope: SCOPES,
 		access_type: 'offline',
 		prompt: 'consent',
 		state:data.projectId+"_"+uid
 	});

 })

 export const saveNewInstallation = async (token: string, projectId:string,uid:string) => {
 	console.log("saveNewInstallation",token, projectId,uid );
 	const project =  await db.doc('projects/'+projectId).get();
 	console.log("saveNewInstallation project", project.exists)
 	if(project.exists){
 		console.log("saveNewInstallation project2", project.exists)

 		let projectData = project?.data() ?? {accessRights: 'any'};
 		var fileMetadata = {
 			'name': 'EntrepreneurStudio - '+projectData.summary.name,
 			'mimeType': 'application/vnd.google-apps.folder'
 		};
 		let oAuth2Client = new google.auth.OAuth2(
 			googledrive.client_id, 
 			googledrive.client_secret, 
 			"https://us-central1-entrepeneur-studio.cloudfunctions.net/driveOauth2callback");

 		oAuth2Client.setCredentials(token);
 		const drive = google.drive({version: 'v3', auth: oAuth2Client});
 		let folderId:string="";
 		let folderIdCreated:string="";
 		return drive.files.create({
 			resource: fileMetadata,
 			fields: 'id'
 		}, async function (err:any, file:any) {
 			if (err) {
 				// Handle error
 				console.error("error 2: ",err);
 				return ""
 			} else {
 				console.log('Folder Id: ', file.data.id);
 				folderIdCreated = file.data.id;
 				console.log("folderId", folderIdCreated);
 				if(folderIdCreated !== undefined){
 					folderId = folderIdCreated;
 				}
 				let resource={
 					CMSId : 'kgazdvl3cgb1hl7cxoo',
 					name : "Google Drive",
 					source :  "EntrepreneurStudio",
 					title  :  "Google Drive",
 					url  :  'https://drive.google.com/drive/my-drive',
 					pictureUrl  :  "https://media.begeek.fr/2017/06/stockage-google-drive-660x385.jpg"
 				}
 				await createPermissions(projectId,folderId, oAuth2Client);
 				await db.collection("projects/"+projectId+"/resources").add(resource).then((result:any)=> {return "ok"})

 				return  db.collection("installations/drive/"+projectId)
 				.doc("settings").set({
 					token: token,
 					folderId:folderId,
 					createdAt: moment().format()
 				})
 			}
 		});
 		
 	}
 	else{
 		return "error";
 	}
 }

 export const createPermissions = async (projectId:string,folderId:string,auth:any) =>{
 	let teamMembers = await db.collection("projects/"+projectId+"/teamMembers").get();
 	console.log(teamMembers);
 	if(!teamMembers.empty){
 		const drive = google.drive({version: 'v3', auth: auth});

 		for(let i=0; i<teamMembers.docs.length; i++){
 			const teamMember = teamMembers.docs[i];
 			let teamMemberData = await teamMember.data();
 			if(teamMemberData.email){
 				drive.permissions.create(
 				{
 					fileId:folderId,
 					resource: {
 						role:'writer',
 						type:'user',
 						emailAddress: teamMemberData.email
 					}
 					
 				}, async function (err:any, permission:any) {
 					if (err) {
 						// Handle error
 						console.error("error 2: ",err);
 						return ""
 					} else { 
 						console.log("permission created", permission);
 						await db.doc('projects/'+projectId+'/teamMembers/'+teamMember.id).update({googleDrivePermissionId: permission.id} ).then(()=>{return " OK"});

 						return permission
 					}
 				});
 			}
 			

 		}
 		return "OK"
 	}
 	else{
 		return "KO"
 	}


 }