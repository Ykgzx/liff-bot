import * as admin from 'firebase-admin';

let db: admin.firestore.Firestore | null = null;

export function getFirestoreDB() {
  if (db) return db;

  // Only initialize if we have credentials
  if (!process.env.FIRESTORE_PROJECT_ID && !process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('Firebase/Firestore not configured. Set FIRESTORE_PROJECT_ID and credentials.');
  }

  if (!admin.apps.length) {
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    const projectId = process.env.FIRESTORE_PROJECT_ID;

    if (serviceAccountBase64) {
      const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf-8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
    } else {
      // Use Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS env var)
      admin.initializeApp({
        projectId,
      });
    }
  }

  db = admin.firestore();
  return db;
}

// Don't export a default — force explicit use of getFirestoreDB()

