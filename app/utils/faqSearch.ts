import { getFirestoreDB } from '@/lib/prisma';

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
}

/**
 * Search FAQ collection for matching questions/answers
 * Returns the best matching answer if similarity score exceeds threshold
 */
export async function searchFAQ(query: string): Promise<FAQ | null> {
  try {
    const db = getFirestoreDB();
    const snapshot = await db.collection('FAQ').get();
    
    if (snapshot.empty) {
      return null;
    }

    const docs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as FAQ[];

    // Simple keyword matching with scoring
    const queryWords = query.toLowerCase().split(/\s+/);
    
    let bestMatch: { doc: FAQ; score: number } | null = null;

    for (const doc of docs) {
      let score = 0;

      // Check keywords match
      const docKeywords = (doc.keywords || []).map(k => k.toLowerCase());
      for (const word of queryWords) {
        if (docKeywords.some(k => k.includes(word) || word.includes(k))) {
          score += 2;
        }
      }

      // Check question match
      const questionLower = doc.question.toLowerCase();
      for (const word of queryWords) {
        if (questionLower.includes(word)) {
          score += 1;
        }
      }

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { doc, score };
      }
    }

    // Return match if score threshold met (adjust threshold as needed)
    if (bestMatch && bestMatch.score >= 2) {
      return bestMatch.doc;
    }

    return null;
  } catch (error) {
    console.error('Error searching FAQ:', error);
    return null;
  }
}
