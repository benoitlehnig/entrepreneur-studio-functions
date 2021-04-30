import * as functions from 'firebase-functions'
import {db} from '../../common/initFirebase'
let moment = require('moment');

export const conseilCreated = functions.firestore.document('conseils/{conseilId}').onCreate((snap:any, context:any) => {
	console.log("conseilCreated", snap, context);
	if( snap.data().isPublic ===true){
		return updateConseilCount(true)
	}
	else{
		return "no update"
	}
});

export const updateConseilCount =  async (increment: boolean) => {
	const docRef =db.doc('ApplicationParameters/statistics').get();
	return docRef.then((doc:any) => {
		if (!doc.exists) {
			console.log('statistics:No such document!');
			return "KO";
		} 
		else{
			let conseilsCount = Number(doc.data().conseilsCount);
			if(increment ===true){
				conseilsCount++;
			}
			else{
				conseilsCount--;
			}
			return db.doc('ApplicationParameters/statistics').update({conseilsCount: conseilsCount} ).then(()=>{return " OK"});
		}
	});
}


export const conseilUpdated = functions.firestore.document('conseils/{conseilId}').onUpdate((snap:any, context:any) => {
	console.log("conseilUpdated", snap, context);
	if( snap.after.data().isPublic ===true &&  snap.before.data().isPublic === false){
		return updateConseilCount(true)
	}
	else if( snap.after.data().isPublic ===false &&  snap.before.data().isPublic === true){
		return updateConseilCount(false)
	}
	else{
		return "no update"
		
	}
});

export const conseilDeleted = functions.firestore.document('conseils/{conseilId}').onDelete((snap:any, context:any) => {
	console.log("conseilDeleted", snap, context);
	return updateConseilCount(false)

});

export const createConseilFromUser =  functions.https.onCall((data:any, context:any) => {	
	console.log("createConseil", data,   context.auth.uid);
	data.creationDateTime = moment().format();
	console.log("createConseil data",JSON.stringify(data));
	

	return db.collection('conseils').add(data).then(function(res:any){
		console.log("createConseil conseil id", res.id);
		return db.doc('users/'+context.auth.uid).update({conseilCMSID:res.id}).then(()=> {return "OK"})
	});
	
});