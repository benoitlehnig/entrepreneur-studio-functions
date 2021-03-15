import * as functions from 'firebase-functions'
import {db,auth} from '../../common/initFirebase'

export const createUser = functions.https.onCall(async (data:any, context:any) => {
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
		await auth.setCustomUserClaims( data.uid, {incubator: true, entrepreneur:false}).then(()=>{return "OK"})
	}
	if(data.role ==='entrepreneur'){
		console.log("createUser >> entrepreneur", data.role )
		await auth.setCustomUserClaims( data.uid, {incubator: false, entrepreneur:true}).then(
			()=>{
				console.log("createUser >> entrepreneur >> claims DONE", data.role );
				return "OK"
			});
	}

	if(profileData !== null) {
		console.log("profileData", JSON.stringify(profileData));
		await db.collection('users').doc(data.uid).set(
			{role:data.role,firstName:profileData.given_name, lastName:profileData.family_name, email:profileData.email,photoUrl:photoUrl })
		.then(()=>{
			return  incrementUserCount(data.role);
		})
	}
	return "OK";
});

export const incrementUserCount =  async (role: string) => {
	const docRef =db.doc('ApplicationParameters/statistics').get();
	return docRef.then((doc:any) => {
		if (!doc.exists) {
			console.log('statistics:No such document!');
			return "KO";
		} 
		else{
			if(role ==='incubator'){
				let conseilUsersCount = Number(doc.data().conseilUsersCount);
				conseilUsersCount++;
				return db.doc('ApplicationParameters/statistics').update({conseilUsersCount: conseilUsersCount}).then(()=>{return " OK"});	
			}
			else{
				let entrepreneurUsersCount = Number(doc.data().entrepreneurUsersCount);
				entrepreneurUsersCount++;
				return db.doc('ApplicationParameters/statistics').update({entrepreneurUsersCount: entrepreneurUsersCount}).then(()=>{return " OK"});	
			}
		}
	});
}

export const initiateUser = functions.auth.user().onCreate((user:any) => {
	console.log("initiateUser", "onCreate",user );
	console.log('invites/'+user.email+'/projectIds');
	if(user.email){
		return db.collection('invites/'+user.email+'/projectIds').get()
		.then(function(querySnapshot:any) {
			querySnapshot.forEach(function(doc:any) {
				// doc.data() is never undefined for query doc snapshots
				console.log("data" , doc.data(),doc.id)
				console.log(doc.id, " => ", doc.data());
				return db.collection('users/'+user.uid+'/projects').add({projectId:doc.id}).then(()=>{return "OK"})
			});
			return "OK"
		})
		.catch(function(error:any) {
			console.log("Error getting documents: ", error);
			return "KO"
		});
	}
	else{
		return "KO"
	}
	
});

export const updateUserPhotoUrl = functions.https.onCall((data:any, context:any) => {
	if(data.photoUrl !== undefined){
		return db.collection('users').doc(data.uid).update({photoUrl:data.photoUrl}).then(()=>{return "OK"})
	}
	else{
		return "KO";
	}
});

export const setAdmin = functions.https.onCall(async (data:any, context:any) => {
	console.log("setAdmin >> entrepreneur >> claims DONE", JSON.stringify(data) );

	if(data.role ==='incubator'){
		console.log("setAdmin >> incubator", data.role )
		await auth.setCustomUserClaims( data.uid, {incubator: true, entrepreneur:false, admin:true}).then(()=>{return "OK"})
	}
	if(data.role ==='entrepreneur' || data.role === undefined || data.role === null){
		console.log("setAdmin >> entrepreneur", data.role )
		await auth.setCustomUserClaims( data.uid, {incubator: false, entrepreneur:true, admin:true}).then(
			()=>{
				console.log("setAdmin >> entrepreneur >> claims DONE", data.role );
				return "OK"
			});
	}

});