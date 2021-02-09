import {db} from '../../../common/initFirebase'

export const getAppToken = async (teamId: string): Promise<string | null> => {
    const docSnapshot = await db.collection("installations/slack/teams").doc(teamId).get()

    if (docSnapshot.exists) {
        // @ts-ignore
        return docSnapshot.data().token
    }
    return null
}