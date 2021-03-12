const {google} = require('googleapis');
import * as functions from 'firebase-functions'
import {db} from '../../common/initFirebase'

// If modifying these scopes, delete token.json.
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const {googledrive} = functions.config()

const oAuth2Client = new google.auth.OAuth2(
	googledrive.client_id, 
	googledrive.client_secret, 
	"https://us-central1-entrepeneur-studio.cloudfunctions.net/driveOauth2callback");

export const driveListFiles = functions.https.onCall( async(data:any, context:any) => {
	const projectId = data.projectId;
	const installation = await db.doc('installations/drive/'+projectId+"/settings").get();
	if(installation.exists){
		let installationData = installation?.data() ?? {token: null};

		if(installationData.token !==null){
			console.log("installationData", JSON.stringify(installationData));
			oAuth2Client.setCredentials(installationData.token);
			const drive = google.drive({version: 'v3', auth: oAuth2Client});

			if(installationData.folderId!==null){
				let query =  "'"+String(installationData.folderId)+"' in parents";
				console.log("q", query);
				
				const queryFolders = (driveImplementation:any) => {
					// Return the Promise result after completing its task
					return new Promise((resolve, reject) => { driveImplementation.files.list({
						pageSize: 300,
						fields: 'nextPageToken, files(id, name, mimeType,description,iconLink,webViewLink,thumbnailLink,modifiedTime )',
						q:query
					}, (err:any, res:any) => {
						if (err) {
							console.log('The API returned an error: ' + err);
							reject(err)		
						}
						else{
							const files = res.data.files;
							resolve(files)
						}

					});
				})
				};
				return queryFolders(drive);	
			}
			else{
				throw new functions.https.HttpsError("unavailable", "No folder Id associated");
			}

		}
		else{
			throw new functions.https.HttpsError("unavailable", "Drive is not installed");
		}
	}
	else{
		throw new functions.https.HttpsError("unavailable", "Drive is not installed");
	}

})

export const driveTeamMemberOnCreate = functions.firestore.document('projects/{projectId}/teamMembers/{teamMembersId}').onCreate(async (snap:any, context:any) => {
	console.log("driveTeamMemberOnCreate", snap, context);
	const installation = await db.doc('installations/drive/'+context.params.projectId+"/settings").get();
	if(!installation.exists){
		console.log('Drive is not installed');
		throw new functions.https.HttpsError("unavailable", "Drive is not installed");
	} 
	else{
		console.log("Drive is installed, adding the new team member as writer");
		const teamMemberData = 	snap.data();
		if(teamMemberData.email){
			let installationData = installation?.data() ?? {token: null};
			if(installationData.token !==null){
				oAuth2Client.setCredentials(installationData.token);
				const drive = google.drive({version: 'v3', auth: oAuth2Client});
				drive.permissions.create(
				{
					fileId:installationData.folderId,
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
						console.log("permission created", permission.data, permission.data.id);
						await db.doc('projects/'+context.params.projectId+'/teamMembers/'+context.params.teamMembersId).update({googleDrivePermissionId: permission.data.id} ).then(()=>{return " OK"});

						return permission
					}
				});
			}
			else{
				throw new functions.https.HttpsError("unavailable", "Drive is not installed");
			}
		}
		else{
			throw new functions.https.HttpsError("invalid-argument", "No email associated");
		}
	}

});
export const driveTeamMemberOnDelete = functions.firestore.document('projects/{projectId}/teamMembers/{teamMembersId}').onDelete(async (snap:any, context:any) => {
	console.log("driveTeamMemberOnDelete", snap, context);
	const teamMemberData = 	snap.data();
	if(teamMemberData.googleDrivePermissionId){
		const installation = await db.doc('installations/drive/'+context.params.projectId+"/settings").get();
		if(!installation.exists){
			console.log('Drive is not installed');
			throw new functions.https.HttpsError("unavailable", "Drive is not installed");
		}
		else{
			console.log("Drive is installed, removing the new team member as writer");
			let installationData = installation?.data() ?? {token: null};

			oAuth2Client.setCredentials(installationData.token);
			const drive = google.drive({version: 'v3', auth: oAuth2Client});
			drive.permissions.delete(
			{
				fileId:installationData.folderId,
				permissionId: teamMemberData.googleDrivePermissionId
			}, async function (err:any, permission:any) {
				if (err) {
					// Handle error
					console.error("error 2: ",err);
					throw new functions.https.HttpsError("unavailable", err);
				} else { 
					console.log("permission delete")
					return "OK"
				}
			});
		}


	}
	else{
		throw new functions.https.HttpsError("unavailable", "Google Drive is not installed or user did not have googel Drive permission");
	}


});