/**
 * TypeScript interfaces for AI Chat functionality
 * Based on the design document specifications
 */

// Core message interface
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    tokens?: number;
    model?: string;
    error?: string;
  };
}

// Chat state interface for component state management
export interface ChatState {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  error: string | null;
}

// Conversation model for persistence
export interface Conversation {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  title?: string;
}

// Chat configuration interface
export interface ChatConfig {
  maxMessages: number;
  retryAttempts: number;
  streamingEnabled: boolean;
  persistHistory: boolean;
}

// Local storage schema
export interface ChatStorage {
  conversations: Conversation[];
  currentConversationId: string | null;
  settings: {
    theme: 'light' | 'dark';
    fontSize: 'small' | 'medium' | 'large';
  };
}

// API request/response interfaces
export interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

// OpenAI configuration interface
export interface OpenAIConfig {
  apiKey: string;
  model: 'gpt-3.5-turbo' | 'gpt-4';
  temperature: number;
  maxTokens: number;
}

// Error handling interfaces
export interface ErrorState {
  type: 'network' | 'service' | 'validation' | 'storage';
  message: string;
  retryable: boolean;
  retryCount: number;
}

export interface ErrorHandling {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  fallbackBehavior: 'queue' | 'discard' | 'notify';
}

// Component prop interfaces
export interface MessageProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export interface ChatPageProps {}

// Navigation item interface for bottom nav integration
export interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}