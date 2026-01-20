const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function runStandalone() {
    try {
        console.log('Project ID:', process.env.FIRESTORE_PROJECT_ID);
        const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

        if (!serviceAccountBase64) {
            console.error('Missing FIREBASE_SERVICE_ACCOUNT_BASE64 env');
            return;
        }

        const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf-8'));
        console.log('Service Account Project:', serviceAccount.project_id);

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }

        const db = admin.firestore();
        console.log('Querying "products" collection...');
        const snapshot = await db.collection('products').get();

        if (snapshot.empty) {
            console.log('Collection "products" is EMPTY!');
        } else {
            console.log(`Found ${snapshot.size} docs in "products":`);
            snapshot.docs.forEach(d => console.log(`- [${d.id}] ${d.data().name}`));
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

runStandalone();
