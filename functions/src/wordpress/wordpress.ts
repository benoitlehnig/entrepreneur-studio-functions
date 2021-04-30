const WPAPI = require( 'wpapi' );
import * as functions from 'firebase-functions'

const wp = new WPAPI({ endpoint: 'https://firebasecms.wordpress.com/wp-json' });

export const retrievePosts = functions.https.onCall(async (data:any, context:any) => {

	wp.posts().then(function( posts:any ) {
		return posts
	}).catch(function( err:any ) {
		throw new functions.https.HttpsError("unknown", "error: "+err);
	});
})