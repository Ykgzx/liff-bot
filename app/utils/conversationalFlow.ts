/**
 * Conversational Dialog Flow Manager
 * Handles multi-turn conversations with clarifying questions
 * Does not require external AI services
 */

interface ConversationContext {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  extractedInfo: {
    productType?: string;
    skinType?: string;
    budget?: string;
    allergies?: string[];
    otherNeeds?: string[];
  };
}

const productQuestions: Record<string, { question: string; keywords: string[] }> = {
  skinType: {
    question: 'ใช้ผิวแบบไหนคะ? (แห้ง, มัน, ผสม, หรือปกติ)',
    keywords: ['แห้ง', 'มัน', 'ผสม', 'ปกติ', 'ข้อไข่'],
  },
  budget: {
    question: 'มีงบประมาณเท่าไหร่คะ?',
    keywords: ['บาท', 'ไม่เกิน', 'ประมาณ', 'แค่', 'งบ'],
  },
  allergies: {
    question: 'มีการแพ้สารใดหรือไม่คะ?',
    keywords: ['แพ้', 'อ็อล', 'อลเลอร์', 'allergen'],
  },
  concern: {
    question: 'มีปัญหาผิวเรื่องไหนหรือไม่? (สิว, ริ้ว รวย, ฝ้า, เซ็บ)',
    keywords: ['สิว', 'ริ้ว', 'รวย', 'ฝ้า', 'เซ็บ', 'เหี่ยว', 'แตกแห้ง'],
  },
};

/**
 * Extract product preferences from user message
 */
export function extractProductInfo(
  message: string,
  context: ConversationContext
): Partial<ConversationContext['extractedInfo']> {
  const messageLower = message.toLowerCase();
  const extracted: Partial<ConversationContext['extractedInfo']> = {};

  // Detect skin type
  if (messageLower.includes('แห้ง')) {
    extracted.skinType = 'dry';
  } else if (messageLower.includes('มัน')) {
    extracted.skinType = 'oily';
  } else if (messageLower.includes('ผสม')) {
    extracted.skinType = 'combination';
  } else if (messageLower.includes('ปกติ') || messageLower.includes('ปกะติ')) {
    extracted.skinType = 'normal';
  }

  // Detect budget
  const budgetMatch = message.match(/(\d+)\s*(บาท|บ|k|พัน)?/);
  if (budgetMatch) {
    extracted.budget = budgetMatch[0];
  } else if (messageLower.includes('ไม่เกิน')) {
    extracted.budget = message.match(/ไม่เกิน\s*(\d+)/)?.[1] || 'budget_constrained';
  }

  // Detect skin concerns
  const concernKeywords = ['สิว', 'ริ้ว', 'รวย', 'ฝ้า', 'เซ็บ', 'เหี่ยว'];
  const foundConcerns = concernKeywords.filter(concern => messageLower.includes(concern));
  if (foundConcerns.length > 0) {
    extracted.otherNeeds = foundConcerns;
  }

  return extracted;
}

/**
 * Determine which clarifying question to ask based on conversation context
 */
export function getNextQuestion(context: ConversationContext): string | null {
  const { extractedInfo } = context;

  // Prioritize questions based on what we don't know yet
  const questionPriority = [
    { key: 'skinType', question: productQuestions.skinType.question },
    { key: 'budget', question: productQuestions.budget.question },
    { key: 'concern', question: productQuestions.concern.question },
  ];

  for (const { key, question } of questionPriority) {
    if (!extractedInfo[key as keyof typeof extractedInfo]) {
      return question;
    }
  }

  return null; // All key info gathered
}

/**
 * Generate a conversational response based on context
 */
export function generateConversationalResponse(
  userMessage: string,
  context: ConversationContext
): string {
  // Extract new information
  const newInfo = extractProductInfo(userMessage, context);
  context.extractedInfo = { ...context.extractedInfo, ...newInfo };

  // Get next clarifying question
  const nextQuestion = getNextQuestion(context);

  if (nextQuestion) {
    return nextQuestion;
  }

  // If we have enough info, provide recommendation
  return generateRecommendation(context.extractedInfo);
}

/**
 * Generate product recommendation based on extracted preferences
 */
function generateRecommendation(
  info: ConversationContext['extractedInfo']
): string {
  let recommendation = 'ตามข้อมูลที่คุณให้มา ฉันแนะนำ:\n\n';

  if (info.skinType === 'oily') {
    recommendation += '✓ สำหรับผิวมัน แนะนำเลือกครีมที่:\n';
    recommendation += '  - ไม่ทำให้ผิวมากขึ้น\n';
    recommendation += '  - มี oil control formula\n';
    recommendation += '  - ผลิต matt finish\n\n';
  } else if (info.skinType === 'dry') {
    recommendation += '✓ สำหรับผิวแห้ง แนะนำเลือกครีมที่:\n';
    recommendation += '  - มีส่วนประกอบเลี้ยงให้\n';
    recommendation += '  - ช่วยลดน้ำหาย\n';
    recommendation += '  - มี moisturizing formula\n\n';
  }

  if (info.budget) {
    recommendation += `✓ ตามงบประมาณ ${info.budget} คุณมีตัวเลือกจำนวนหนึ่ง\n`;
  }

  if (info.otherNeeds && info.otherNeeds.length > 0) {
    recommendation += `\n✓ เรื่อง ${info.otherNeeds.join(', ')} แนะนำเลือก ingredient เช่น:\n`;
    if (info.otherNeeds.includes('สิว')) {
      recommendation += '  - Salicylic Acid สำหรับสิว\n';
    }
    if (info.otherNeeds.includes('ริ้ว') || info.otherNeeds.includes('รวย')) {
      recommendation += '  - Retinol หรือ Peptides ต้านริ้วรวย\n';
    }
    if (info.otherNeeds.includes('ฝ้า')) {
      recommendation += '  - Niacinamide หรือ Vitamin C ช่วยลดฝ้า\n';
    }
  }

  recommendation += '\n\nต้องการลองสินค้าใดหรือมีคำถามเพิ่มเติมหรือไม่คะ?';
  return recommendation;
}

/**
 * Process message in conversational context
 */
export function processConversationalMessage(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): { response: string; context: ConversationContext } {
  const context: ConversationContext = {
    messages: conversationHistory,
    extractedInfo: {},
  };

  // Extract information from all previous messages AND current message
  const allUserMessages = conversationHistory.filter(m => m.role === 'user').map(m => m.content);
  allUserMessages.push(userMessage); // Include current message

  for (const msg of allUserMessages) {
    const info = extractProductInfo(msg, context);
    context.extractedInfo = { ...context.extractedInfo, ...info };
  }

  // Generate response for current message
  const response = generateConversationalResponse(userMessage, context);

  return {
    response,
    context,
  };
}
