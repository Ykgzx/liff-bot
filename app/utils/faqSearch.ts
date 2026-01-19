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
 * Returns null if Firestore not configured or no match found
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
    // For Thai text, split by spaces but also support substring matching
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    
    // If query is very short (like Thai single word), try to match as substring
    const isSingleWord = queryWords.length === 1 && queryWords[0].length > 0;
    
    let bestMatch: { doc: FAQ; score: number } | null = null;

    for (const doc of docs) {
      let score = 0;

      // Check keywords match
      const docKeywords = (doc.keywords || []).map(k => k.toLowerCase());
      for (const word of queryWords) {
        // Match if word is found in any keyword (supports Thai substring matching)
        if (docKeywords.some(k => k.includes(word) || word.includes(k))) {
          score += 2;
        }
      }

      // Check question match (especially useful for Thai which doesn't have word boundaries)
      const questionLower = doc.question.toLowerCase();
      const answerLower = doc.answer.toLowerCase();
      
      for (const word of queryWords) {
        if (word.length > 0 && questionLower.includes(word)) {
          score += 1;
        }
        // Also check answer for Thai support
        if (word.length > 0 && answerLower.includes(word)) {
          score += 0.5;
        }
      }

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { doc, score };
      }
    }

    // Return match if score threshold met (lower threshold for single-word Thai queries)
    const threshold = isSingleWord && queryWords[0].length >= 2 ? 0.5 : 2;
    if (bestMatch && bestMatch.score >= threshold) {
      return bestMatch.doc;
    }

    return null;
  } catch (error) {
    // Silently fail if Firestore not configured - will fall back to external AI
    if (error instanceof Error && error.message.includes('Firestore not configured')) {
      return null;
    }
    console.error('Error searching FAQ:', error);
    return null;
  }
}
