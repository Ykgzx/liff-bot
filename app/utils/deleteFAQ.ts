import { getFirestoreDB } from '@/lib/prisma';

/**
 * Delete all FAQ entries from Firestore
 * Use this before reseeding to ensure fresh data
 */
export async function deleteAllFAQ() {
  try {
    const db = getFirestoreDB();
    const snapshot = await db.collection('FAQ').get();
    
    let count = 0;
    const batch = db.batch();
    
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      count++;
    }
    
    if (count > 0) {
      await batch.commit();
    }
    
    return { success: true, count };
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    throw error;
  }
}
