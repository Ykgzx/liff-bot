/**
 * Configuration settings for AI Chat functionality
 * Based on the design document specifications
 */

import { ChatConfig, OpenAIConfig, ErrorHandling } from '../types/chat';

// Default chat configuration
export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  maxMessages: 100, // Maximum messages to keep in memory
  retryAttempts: 3, // Number of retry attempts for failed requests
  streamingEnabled: true, // Enable streaming responses
  persistHistory: true, // Persist conversation history in localStorage
};

// OpenAI configuration (API key loaded from environment)
export const OPENAI_CONFIG: Omit<OpenAIConfig, 'apiKey'> = {
  model: 'gpt-3.5-turbo', // Default model
  temperature: 0.7, // Response creativity (0-1)
  maxTokens: 1000, // Maximum tokens per response
};

// Error handling configuration
export const ERROR_HANDLING_CONFIG: ErrorHandling = {
  maxRetries: 3, // Maximum retry attempts
  retryDelay: 1000, // Initial retry delay in milliseconds
  exponentialBackoff: true, // Use exponential backoff for retries
  fallbackBehavior: 'queue', // Queue messages when offline
};

// Local storage keys
export const STORAGE_KEYS = {
  CHAT_HISTORY: 'ai-chat-history',
  CHAT_SETTINGS: 'ai-chat-settings',
  CURRENT_CONVERSATION: 'ai-chat-current-conversation',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  CHAT: '/api/chat',
} as const;

// UI configuration
export const UI_CONFIG = {
  MESSAGE_ANIMATION_DURATION: 300, // Animation duration for new messages
  SCROLL_BEHAVIOR: 'smooth' as ScrollBehavior,
  INPUT_PLACEHOLDER: 'Type your message here...',
  WELCOME_MESSAGE: 'Hello! I\'m your AI assistant. How can I help you today?',
} as const;

// Input validation configuration
export const VALIDATION_CONFIG = {
  MIN_MESSAGE_LENGTH: 1, // Minimum meaningful characters
  MAX_MESSAGE_LENGTH: 4000, // Maximum message length
  ALLOW_ONLY_WHITESPACE: false, // Whether to allow whitespace-only messages
  REQUIRE_MEANINGFUL_CONTENT: true, // Whether to require alphanumeric content
} as const;

// Performance thresholds (from requirements)
export const PERFORMANCE_THRESHOLDS = {
  PAGE_LOAD_TIME: 2000, // 2 seconds
  MESSAGE_PROCESSING_TIME: 500, // 500ms
  AI_RESPONSE_TIME: 3000, // 3 seconds
} as const;