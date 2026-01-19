/**
 * Utility functions for AI Chat functionality
 * Based on the design document specifications
 */

import { ChatMessage, Conversation, ChatStorage } from '../types/chat';
import { STORAGE_KEYS, VALIDATION_CONFIG } from '../config/chat';

/**
 * Generate a unique ID for messages and conversations
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new chat message
 */
export function createMessage(
  role: 'user' | 'assistant',
  content: string,
  metadata?: ChatMessage['metadata']
): ChatMessage {
  return {
    id: generateId(),
    role,
    content,
    timestamp: new Date(),
    metadata,
  };
}

/**
 * Create a new conversation
 */
export function createConversation(initialMessage?: ChatMessage): Conversation {
  return {
    id: generateId(),
    messages: initialMessage ? [initialMessage] : [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Validate message input (Requirements 2.3, 2.4)
 * Enhanced validation to ensure robust message validation
 */
export function validateMessageInput(input: string): boolean {
  // Check if input is null, undefined, or not a string
  if (!input || typeof input !== 'string') {
    return false;
  }

  // Check if input is empty or contains only whitespace characters
  const trimmedInput = input.trim();
  if (trimmedInput.length === 0) {
    return false;
  }

  // Check minimum length requirement
  if (trimmedInput.length < VALIDATION_CONFIG.MIN_MESSAGE_LENGTH) {
    return false;
  }

  // Check maximum length requirement
  if (input.length > VALIDATION_CONFIG.MAX_MESSAGE_LENGTH) {
    return false;
  }

  // Check for inputs that are only special whitespace characters
  if (!VALIDATION_CONFIG.ALLOW_ONLY_WHITESPACE) {
    const whitespaceOnlyRegex = /^\s*$/;
    if (whitespaceOnlyRegex.test(input)) {
      return false;
    }
  }

  // Additional validation: check for minimum meaningful content
  if (VALIDATION_CONFIG.REQUIRE_MEANINGFUL_CONTENT) {
    // Reject inputs that are only punctuation or special characters
    const meaningfulContentRegex = /[a-zA-Z0-9\u00C0-\u017F\u0E00-\u0E7F\u4e00-\u9fff]/;
    if (!meaningfulContentRegex.test(trimmedInput)) {
      return false;
    }
  }

  return true;
}

/**
 * Get validation error message for invalid input
 * Provides user-friendly feedback for validation failures
 */
export function getValidationErrorMessage(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return 'Please enter a message';
  }

  if (input.length > VALIDATION_CONFIG.MAX_MESSAGE_LENGTH) {
    return `Message cannot exceed ${VALIDATION_CONFIG.MAX_MESSAGE_LENGTH} characters`;
  }

  // Check for whitespace-only inputs first (before trimming)
  if (!VALIDATION_CONFIG.ALLOW_ONLY_WHITESPACE) {
    const whitespaceOnlyRegex = /^\s*$/;
    if (whitespaceOnlyRegex.test(input)) {
      return 'Message cannot contain only whitespace';
    }
  }

  const trimmedInput = input.trim();
  if (trimmedInput.length === 0) {
    return 'Message cannot be empty';
  }

  if (trimmedInput.length < VALIDATION_CONFIG.MIN_MESSAGE_LENGTH) {
    return `Message must be at least ${VALIDATION_CONFIG.MIN_MESSAGE_LENGTH} character${VALIDATION_CONFIG.MIN_MESSAGE_LENGTH > 1 ? 's' : ''} long`;
  }

  if (VALIDATION_CONFIG.REQUIRE_MEANINGFUL_CONTENT) {
    const meaningfulContentRegex = /[a-zA-Z0-9\u00C0-\u017F\u0E00-\u0E7F\u4e00-\u9fff]/;
    if (!meaningfulContentRegex.test(trimmedInput)) {
      return 'Message must contain meaningful content';
    }
  }

  return null;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(timestamp);
}

/**
 * Get chat storage from localStorage
 */
export function getChatStorage(): ChatStorage {
  const result = getChatStorageWithFallback();
  return result.storage;
}

/**
 * Save chat storage to localStorage with enhanced error handling
 * Implements robust storage quota and error scenario handling (Requirements 4.2, 4.4)
 */
export function saveChatStorage(storage: ChatStorage): { success: boolean; error?: string } {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Server-side rendering environment' };
  }

  try {
    const serializedData = JSON.stringify(storage);

    // Check if we're approaching storage limits before saving
    const estimatedSize = new Blob([serializedData]).size;
    const availableSpace = getAvailableStorageSpace();

    if (availableSpace !== null && estimatedSize > availableSpace) {
      // Attempt to free up space by removing old conversations
      const optimizedStorage = optimizeStorageForSpace(storage);
      const optimizedData = JSON.stringify(optimizedStorage);

      try {
        localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, optimizedData);
        return { success: true };
      } catch (quotaError) {
        // If still failing, fall back to session storage
        return fallbackToSessionStorage(optimizedStorage);
      }
    }

    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, serializedData);
    return { success: true };

  } catch (error) {
    console.error('Error saving chat storage:', error);

    // Handle specific error types
    if (error instanceof DOMException) {
      if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        // Storage quota exceeded - try to optimize and retry
        const optimizedStorage = optimizeStorageForSpace(storage);
        try {
          localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(optimizedStorage));
          return { success: true };
        } catch (retryError) {
          // Fall back to session storage
          return fallbackToSessionStorage(optimizedStorage);
        }
      } else if (error.name === 'SecurityError') {
        return { success: false, error: 'Storage access denied (private browsing mode)' };
      }
    }

    // Generic error - attempt session storage fallback
    return fallbackToSessionStorage(storage);
  }
}

/**
 * Get default chat storage structure
 */
function getDefaultChatStorage(): ChatStorage {
  return {
    conversations: [],
    currentConversationId: null,
    settings: {
      theme: 'light',
      fontSize: 'medium',
    },
  };
}

/**
 * Add message to conversation and update storage with error handling
 * Returns success status and any storage warnings
 */
export function addMessageToConversation(
  conversationId: string,
  message: ChatMessage
): { success: boolean; warning?: string } {
  const storage = getChatStorage();
  const conversationIndex = storage.conversations.findIndex(
    (conv) => conv.id === conversationId
  );

  if (conversationIndex >= 0) {
    storage.conversations[conversationIndex].messages.push(message);
    storage.conversations[conversationIndex].updatedAt = new Date();

    const saveResult = saveChatStorage(storage);
    return {
      success: saveResult.success,
      warning: saveResult.error
    };
  }

  return { success: false, warning: 'Conversation not found' };
}

/**
 * Create or get current conversation with enhanced persistence
 * Ensures conversation state is maintained across navigation
 */
export function getCurrentConversation(): {
  conversation: Conversation;
  warning?: string
} {
  const result = getChatStorageWithFallback();
  const storage = result.storage;

  if (storage.currentConversationId) {
    const existing = storage.conversations.find(
      (conv) => conv.id === storage.currentConversationId
    );
    if (existing) {
      return {
        conversation: existing,
        warning: result.warning
      };
    }
  }

  // Create new conversation
  const newConversation = createConversation();
  storage.conversations.push(newConversation);
  storage.currentConversationId = newConversation.id;

  const saveResult = saveChatStorage(storage);

  return {
    conversation: newConversation,
    warning: saveResult.error || result.warning
  };
}

/**
 * Clear chat history with confirmation and error handling
 * Implements conversation management feature for clearing history (Requirements 4.5)
 */
export function clearChatHistory(): { success: boolean; error?: string } {
  const storage = getDefaultChatStorage();
  const result = saveChatStorage(storage);

  if (result.success) {
    // Also clear from sessionStorage if it exists
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
      }
    } catch (error) {
      console.warn('Failed to clear sessionStorage:', error);
    }
  }

  return result;
}

/**
 * Get all conversations ordered by most recent activity
 * Provides conversation ordering functionality (Requirements 4.1)
 */
export function getConversationsOrderedByActivity(): Conversation[] {
  const storage = getChatStorage();

  return [...storage.conversations].sort((a, b) => {
    // Sort by updatedAt timestamp, most recent first
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

/**
 * Get conversation summary for display
 * Generates conversation titles and metadata for management
 */
export function getConversationSummary(conversation: Conversation): {
  title: string;
  messageCount: number;
  lastActivity: Date;
  preview: string;
} {
  const messageCount = conversation.messages.length;
  const lastActivity = conversation.updatedAt;

  // Generate title from first user message or use default
  let title = 'New Conversation';
  let preview = 'No messages yet';

  if (messageCount > 0) {
    const firstUserMessage = conversation.messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      // Use first 30 characters of first user message as title
      title = firstUserMessage.content.length > 30
        ? firstUserMessage.content.substring(0, 30) + '...'
        : firstUserMessage.content;
    }

    // Use last message as preview
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    preview = lastMessage.content.length > 50
      ? lastMessage.content.substring(0, 50) + '...'
      : lastMessage.content;
  }

  return {
    title,
    messageCount,
    lastActivity,
    preview
  };
}

/**
 * Create a new conversation and set it as current
 * Enhanced conversation creation with proper ordering
 */
export function createNewConversation(): {
  conversation: Conversation;
  success: boolean;
  warning?: string
} {
  const storage = getChatStorage();
  const newConversation = createConversation();

  // Add to conversations list
  storage.conversations.push(newConversation);

  // Set as current conversation
  storage.currentConversationId = newConversation.id;

  const saveResult = saveChatStorage(storage);

  return {
    conversation: newConversation,
    success: saveResult.success,
    warning: saveResult.error
  };
}

/**
 * Switch to a different conversation
 * Enables conversation navigation and management
 */
export function switchToConversation(conversationId: string): {
  conversation: Conversation | null;
  success: boolean;
  warning?: string;
} {
  const storage = getChatStorage();
  const conversation = storage.conversations.find(conv => conv.id === conversationId);

  if (!conversation) {
    return {
      conversation: null,
      success: false,
      warning: 'Conversation not found'
    };
  }

  // Update current conversation ID
  storage.currentConversationId = conversationId;

  const saveResult = saveChatStorage(storage);

  return {
    conversation,
    success: saveResult.success,
    warning: saveResult.error
  };
}

/**
 * Delete a specific conversation
 * Provides conversation management functionality
 */
export function deleteConversation(conversationId: string): {
  success: boolean;
  warning?: string;
  newCurrentConversation?: Conversation;
} {
  const storage = getChatStorage();
  const conversationIndex = storage.conversations.findIndex(conv => conv.id === conversationId);

  if (conversationIndex === -1) {
    return {
      success: false,
      warning: 'Conversation not found'
    };
  }

  // Remove the conversation
  storage.conversations.splice(conversationIndex, 1);

  // If this was the current conversation, switch to another one or create new
  let newCurrentConversation: Conversation | undefined;
  if (storage.currentConversationId === conversationId) {
    if (storage.conversations.length > 0) {
      // Switch to the most recent conversation
      const orderedConversations = storage.conversations.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      storage.currentConversationId = orderedConversations[0].id;
      newCurrentConversation = orderedConversations[0];
    } else {
      // No conversations left, create a new one
      const newConv = createConversation();
      storage.conversations.push(newConv);
      storage.currentConversationId = newConv.id;
      newCurrentConversation = newConv;
    }
  }

  const saveResult = saveChatStorage(storage);

  return {
    success: saveResult.success,
    warning: saveResult.error,
    newCurrentConversation
  };
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: delay = baseDelay * 2^attempt
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Get available localStorage space (approximate)
 * Returns null if unable to determine
 */
function getAvailableStorageSpace(): number | null {
  if (typeof window === 'undefined') return null;

  try {
    // Test with increasingly large strings to find the limit
    const testKey = '__storage_test__';
    let size = 1024; // Start with 1KB
    let lastSuccessfulSize = 0;

    while (size < 10 * 1024 * 1024) { // Max 10MB test
      try {
        const testData = 'x'.repeat(size);
        localStorage.setItem(testKey, testData);
        localStorage.removeItem(testKey);
        lastSuccessfulSize = size;
        size *= 2;
      } catch (e) {
        break;
      }
    }

    return lastSuccessfulSize;
  } catch (error) {
    return null;
  }
}

/**
 * Optimize storage by removing old conversations to free up space
 * Keeps the most recent conversations and current conversation
 */
function optimizeStorageForSpace(storage: ChatStorage): ChatStorage {
  const maxConversations = 5; // Keep only the 5 most recent conversations

  // Sort conversations by updatedAt (most recent first)
  const sortedConversations = [...storage.conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // Keep current conversation and most recent ones
  const currentConvId = storage.currentConversationId;
  const optimizedConversations = sortedConversations.slice(0, maxConversations);

  // Ensure current conversation is included
  if (currentConvId && !optimizedConversations.find(c => c.id === currentConvId)) {
    const currentConv = storage.conversations.find(c => c.id === currentConvId);
    if (currentConv) {
      optimizedConversations.pop(); // Remove oldest to make room
      optimizedConversations.push(currentConv);
    }
  }

  return {
    ...storage,
    conversations: optimizedConversations,
  };
}

/**
 * Fallback to sessionStorage when localStorage fails
 * Provides graceful degradation for storage errors
 */
function fallbackToSessionStorage(storage: ChatStorage): { success: boolean; error?: string } {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Server-side rendering environment' };
  }

  try {
    sessionStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(storage));
    return {
      success: true,
      error: 'Using session storage (data will not persist after browser close)'
    };
  } catch (error) {
    console.error('Session storage fallback failed:', error);
    return {
      success: false,
      error: 'Unable to save conversation history'
    };
  }
}

/**
 * Enhanced chat storage retrieval with fallback mechanisms
 * Handles storage errors and provides robust conversation state restoration
 */
export function getChatStorageWithFallback(): {
  storage: ChatStorage;
  source: 'localStorage' | 'sessionStorage' | 'default';
  warning?: string;
} {
  if (typeof window === 'undefined') {
    return {
      storage: getDefaultChatStorage(),
      source: 'default'
    };
  }

  // Try localStorage first
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const storage = {
        ...parsed,
        conversations: parsed.conversations.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        })),
      };
      return { storage, source: 'localStorage' };
    }
  } catch (error) {
    console.warn('localStorage retrieval failed, trying sessionStorage:', error);
  }

  // Fallback to sessionStorage
  try {
    const stored = sessionStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const storage = {
        ...parsed,
        conversations: parsed.conversations.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        })),
      };
      return {
        storage,
        source: 'sessionStorage',
        warning: 'Conversation history loaded from session storage (temporary)'
      };
    }
  } catch (error) {
    console.warn('sessionStorage retrieval failed:', error);
  }

  // Return default storage
  return {
    storage: getDefaultChatStorage(),
    source: 'default',
    warning: 'Unable to load conversation history'
  };
}

/**
 * Check storage health and available space
 * Provides diagnostics for storage-related issues
 */
export function checkStorageHealth(): {
  localStorage: { available: boolean; space?: number };
  sessionStorage: { available: boolean };
  recommendations: string[];
} {
  const result = {
    localStorage: { available: false, space: undefined as number | undefined },
    sessionStorage: { available: false },
    recommendations: [] as string[]
  };

  if (typeof window === 'undefined') {
    result.recommendations.push('Storage not available in server environment');
    return result;
  }

  // Check localStorage
  try {
    const testKey = '__storage_health_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    result.localStorage.available = true;
    const availableSpace = getAvailableStorageSpace();
    result.localStorage.space = availableSpace || undefined;
  } catch (error) {
    result.recommendations.push('localStorage unavailable (private browsing mode?)');
  }

  // Check sessionStorage
  try {
    const testKey = '__session_storage_health_test__';
    sessionStorage.setItem(testKey, 'test');
    sessionStorage.removeItem(testKey);
    result.sessionStorage.available = true;
  } catch (error) {
    result.recommendations.push('sessionStorage unavailable');
  }

  // Add recommendations based on findings
  if (result.localStorage.space && result.localStorage.space < 1024 * 1024) {
    result.recommendations.push('Low localStorage space available');
  }

  if (!result.localStorage.available && !result.sessionStorage.available) {
    result.recommendations.push('No storage available - conversations will not persist');
  } else if (!result.localStorage.available) {
    result.recommendations.push('Using sessionStorage - conversations will not persist after browser close');
  }

  return result;
}

/**
 * Migrate data between storage types if needed
 * Helps recover from storage issues
 */
export function migrateStorageData(from: 'localStorage' | 'sessionStorage', to: 'localStorage' | 'sessionStorage'): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const sourceStorage = from === 'localStorage' ? localStorage : sessionStorage;
    const targetStorage = to === 'localStorage' ? localStorage : sessionStorage;

    const data = sourceStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    if (data) {
      targetStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, data);
      return true;
    }
  } catch (error) {
    console.error('Storage migration failed:', error);
  }

  return false;
}