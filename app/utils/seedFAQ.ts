import { getFirestoreDB } from '@/lib/prisma';

/**
 * Seed 10 electronics FAQ entries to Firestore
 * Run this once to populate the FAQ collection
 */
export async function seedElectronicsFAQ() {
  const db = getFirestoreDB();
  
  const faqs = [
    {
      question: 'What is the warranty period for electronics?',
      answer: 'Most electronics come with a 1-year manufacturer warranty covering defects in materials and workmanship. Extended warranty options up to 3 years are available for purchase.',
      category: 'warranty',
      keywords: ['warranty', 'guarantee', 'protection'],
    },
    {
      question: 'Do you sell refurbished electronics?',
      answer: 'Yes, we offer refurbished electronics at discounted prices. All refurbished items are thoroughly tested, cleaned, and come with a 6-month warranty.',
      category: 'product_type',
      keywords: ['refurbished', 'used', 'second-hand', 'discount'],
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, debit cards, digital wallets (Apple Pay, Google Pay), and bank transfers. Installment payment options are also available for purchases over $500.',
      category: 'payment',
      keywords: ['payment', 'credit card', 'debit', 'installment'],
    },
    {
      question: 'How long is the shipping time for electronics?',
      answer: 'Standard shipping takes 5-7 business days. Express shipping (2-3 days) and next-day delivery are available for premium customers. All items are insured during transit.',
      category: 'shipping',
      keywords: ['shipping', 'delivery', 'express', 'days'],
    },
    {
      question: 'Can I return electronics if I change my mind?',
      answer: 'Yes, we offer a 30-day money-back guarantee on all electronics. Items must be in original condition with all accessories and packaging. Refunds are processed within 5-7 business days.',
      category: 'returns',
      keywords: ['return', 'refund', 'money back', 'exchange'],
    },
    {
      question: 'Are electronics compatible with international power systems?',
      answer: 'Most modern electronics support universal voltage (100-240V). However, you may need a power adapter for different plug types. Check the product specifications or contact support for details.',
      category: 'technical',
      keywords: ['power', 'voltage', 'adapter', 'international'],
    },
    {
      question: 'How do I find the right size or model for my needs?',
      answer: 'Visit our product selector tool on the website. You can filter by brand, specifications, price range, and customer ratings. Our support team can also provide personalized recommendations.',
      category: 'purchasing',
      keywords: ['choose', 'select', 'model', 'size', 'specs'],
    },
    {
      question: 'What is your customer support availability?',
      answer: 'Our customer support team is available 24/7 via email, live chat, and phone. Average response time is under 2 hours. We provide support in multiple languages including English, Thai, and Chinese.',
      category: 'support',
      keywords: ['support', 'customer service', 'help', 'contact'],
    },
    {
      question: 'Do electronics come with setup assistance?',
      answer: 'Yes! We offer free phone/video setup assistance for the first 30 days after purchase. Premium customers get in-home setup services. Detailed instruction manuals and online tutorials are also provided.',
      category: 'service',
      keywords: ['setup', 'installation', 'assistance', 'tutorial'],
    },
    {
      question: 'What are the best-selling electronics this month?',
      answer: 'Our top sellers include wireless headphones, smart home devices, portable chargers, and laptop accessories. Check the "Trending Now" section on our website for real-time bestseller lists and customer reviews.',
      category: 'products',
      keywords: ['bestseller', 'popular', 'trending', 'top'],
    },
  ];

  try {
    const batch = db.batch();
    
    for (const faq of faqs) {
      const docRef = db.collection('FAQ').doc();
      batch.set(docRef, {
        id: docRef.id,
        ...faq,
        createdAt: new Date(),
      });
    }

    await batch.commit();
    console.log('✓ Successfully seeded 10 electronics FAQs to Firestore');
    return { success: true, count: faqs.length };
  } catch (error) {
    console.error('✗ Error seeding FAQs:', error);
    throw error;
  }
}

/**
 * Run this function once to populate the FAQ collection
 * Can be called from a Next.js API route or development script
 */
if (require.main === module) {
  seedElectronicsFAQ()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
