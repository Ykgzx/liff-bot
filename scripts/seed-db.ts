/**
 * Seed script to import data from JSON to Firestore
 * Usage: npx ts-node --project tsconfig.json scripts/seed-db.ts
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
function initFirebase() {
    if (admin.apps.length) return admin.firestore();

    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    const projectId = process.env.FIRESTORE_PROJECT_ID;

    if (!serviceAccountBase64 && !projectId) {
        throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_BASE64 or FIRESTORE_PROJECT_ID');
    }

    if (serviceAccountBase64) {
        const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf-8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id || projectId,
        });
    } else {
        admin.initializeApp({ projectId });
    }

    return admin.firestore();
}

// Convert timestamp objects from JSON format to Firestore Timestamp
function convertTimestamps(data: any): any {
    if (data === null || data === undefined) return data;

    if (typeof data === 'object') {
        // Check if it's a timestamp object
        if (data._type === 'Timestamp' && data._value) {
            return admin.firestore.Timestamp.fromDate(new Date(data._value));
        }

        // Recursively process arrays
        if (Array.isArray(data)) {
            return data.map(convertTimestamps);
        }

        // Recursively process objects
        const result: any = {};
        for (const [key, value] of Object.entries(data)) {
            result[key] = convertTimestamps(value);
        }
        return result;
    }

    return data;
}

async function seedCollection(
    db: admin.firestore.Firestore,
    collectionName: string,
    documents: Array<{ id: string; data: any }>
) {
    console.log(`\n📦 Seeding collection: ${collectionName} (${documents.length} documents)`);

    // Firestore batch limit is 500
    const batchSize = 400;
    let processedCount = 0;

    for (let i = 0; i < documents.length; i += batchSize) {
        const batch = db.batch();
        const chunk = documents.slice(i, i + batchSize);

        for (const doc of chunk) {
            const docRef = db.collection(collectionName).doc(doc.id);
            const convertedData = convertTimestamps(doc.data);
            batch.set(docRef, convertedData);
        }

        await batch.commit();
        processedCount += chunk.length;
        console.log(`   ✓ Committed ${processedCount}/${documents.length}`);
    }

    console.log(`   ✅ Done: ${collectionName}`);
}

async function main() {
    console.log('🚀 Starting Firestore seed...\n');

    // Load environment variables
    require('dotenv').config();

    const db = initFirebase();

    // Read seed data from backup file
    const dataPath = path.join(__dirname, '..', 'firestore-backup-2026-01-15_01-27-21-744Z.json');
    if (!fs.existsSync(dataPath)) {
        console.error('❌ firestore-backup-2026-01-15_01-27-21-744Z.json not found!');
        process.exit(1);
    }

    const seedData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const collections = seedData.collections;

    if (!collections) {
        console.error('❌ No collections found in seed data');
        process.exit(1);
    }

    console.log(`📊 Found ${Object.keys(collections).length} collections to seed`);

    for (const [collectionName, collectionData] of Object.entries(collections) as any) {
        await seedCollection(db, collectionName, collectionData.documents);
    }

    console.log('\n🎉 Seed completed successfully!');
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    });
