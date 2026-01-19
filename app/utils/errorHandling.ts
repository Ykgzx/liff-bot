/**
 * Comprehensive Error Handling Utilities for AI Chat
 * Implements Requirements 5.1, 5.2, 5.3 - Error Handling and Resilience
 */

import { ErrorState, ErrorHandling } from '../types/chat';
import { ERROR_HANDLING_CONFIG } from '../config/chat';

// Network connectivity state
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let connectivityListeners: Array<(online: boolean) => void> = [];

/**
 * Initialize network connectivity monitoring
 * Requirement 5.1: Handle network connectivity errors
 */
export function initializeNetworkMonitoring(): void {
  if (typeof window === 'undefined') return;

  // Update online status
  const updateOnlineStatus = () => {
    const wasOnline = isOnline;
    isOnline = navigator.onLine;
    
    if (wasOnline !== isOnline) {
      // Notify all listeners of connectivity change
      connectivityListeners.forEach(listener => listener(isOnline));
    }
  };

  // Listen for online/offline events
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // Also monitor for network changes via fetch timeout
  startNetworkHealthCheck();
}

/**
 * Add listener for network connectivity changes
 */
export function addConnectivityListener(listener: (online: boolean) => void): () => void {
  connectivityListeners.push(listener);
  
  // Return cleanup function
  return () => {
    connectivityListeners = connectivityListeners.filter(l => l !== listener);
  };
}

/**
 * Get current network connectivity status
 */
export function isNetworkOnline(): boolean {
  return isOnline;
}

/**
 * Enhanced retry logic with exponential backoff
 * Requirement 5.3: Provide options to retry failed operations
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: Partial<ErrorHandling> = {}
): Promise<T> {
  const config = { ...ERROR_HANDLING_CONFIG, ...options };
  let lastError: Error;
  let retryCount = 0;

  while (retryCount <= config.maxRetries) {
    try {
      // Check network connectivity before attempting
      if (!isNetworkOnline()) {
        throw new NetworkError('No network connectivity');
      }

      return await operation();
    } catch (error) {
      lastError = error as Error;
      retryCount++;

      // Don't retry if we've exceeded max attempts
      if (retryCount > config.maxRetries) {
        break;
      }

      // Don't retry certain types of errors
      if (!isRetryableError(error as Error)) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = config.exponentialBackoff
        ? config.retryDelay * Math.pow(2, retryCount - 1)
        : config.retryDelay;

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;

      console.log(`Retry attempt ${retryCount}/${config.maxRetries} after ${jitteredDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }

  throw lastError!;
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: Error): boolean {
  // Network errors are retryable
  if (error instanceof NetworkError) {
    return true;
  }

  // HTTP errors - some are retryable
  if (error instanceof APIError) {
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    return retryableStatusCodes.includes(error.statusCode);
  }

  // Timeout errors are retryable
  if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
    return true;
  }

  // Connection errors are retryable
  if (error.message.includes('fetch') || error.message.includes('network')) {
    return true;
  }

  return false;
}

/**
 * Custom error classes for better error handling
 */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class APIError extends Error {
  public statusCode: number;
  public response?: Response;

  constructor(message: string, statusCode: number, response?: Response) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Create user-friendly error messages
 * Requirement 5.2: Display user-friendly error messages
 */
export function createUserFriendlyErrorMessage(error: Error): {
  title: string;
  message: string;
  actionable: boolean;
  retryable: boolean;
  suggestions: string[];
} {
  // Network connectivity errors
  if (error instanceof NetworkError || !isNetworkOnline()) {
    return {
      title: 'Connection Problem',
      message: 'Unable to connect to the internet. Please check your connection and try again.',
      actionable: true,
      retryable: true,
      suggestions: [
        'Check your internet connection',
        'Try again in a moment',
        'Switch to a different network if available'
      ]
    };
  }

  // API errors
  if (error instanceof APIError) {
    switch (error.statusCode) {
      case 401:
        return {
          title: 'Authentication Error',
          message: 'There was a problem with authentication. Please refresh the page.',
          actionable: true,
          retryable: false,
          suggestions: ['Refresh the page', 'Clear browser cache if the problem persists']
        };
      
      case 429:
        return {
          title: 'Too Many Requests',
          message: 'You\'re sending messages too quickly. Please wait a moment before trying again.',
          actionable: true,
          retryable: true,
          suggestions: ['Wait a few seconds before sending another message']
        };
      
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          title: 'Service Temporarily Unavailable',
          message: 'The AI service is temporarily unavailable. We\'ll retry automatically.',
          actionable: true,
          retryable: true,
          suggestions: ['The system will retry automatically', 'Try again in a few minutes if the problem persists']
        };
      
      default:
        return {
          title: 'Service Error',
          message: 'There was a problem with the AI service. Please try again.',
          actionable: true,
          retryable: true,
          suggestions: ['Try sending your message again', 'Check your internet connection']
        };
    }
  }

  // Validation errors
  if (error instanceof ValidationError) {
    return {
      title: 'Invalid Input',
      message: error.message,
      actionable: true,
      retryable: false,
      suggestions: ['Please check your message and try again']
    };
  }

  // Storage errors
  if (error instanceof StorageError) {
    return {
      title: 'Storage Problem',
      message: 'Unable to save your conversation. Your messages may not be preserved.',
      actionable: true,
      retryable: false,
      suggestions: [
        'Your conversation will continue but may not be saved',
        'Try clearing some browser data if this persists'
      ]
    };
  }

  // Timeout errors
  if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
    return {
      title: 'Request Timeout',
      message: 'The request took too long to complete. Please try again.',
      actionable: true,
      retryable: true,
      suggestions: ['Try again with a shorter message', 'Check your internet connection']
    };
  }

  // Generic errors
  return {
    title: 'Unexpected Error',
    message: 'Something unexpected happened. Please try again.',
    actionable: true,
    retryable: true,
    suggestions: [
      'Try again in a moment',
      'Refresh the page if the problem persists',
      'Check your internet connection'
    ]
  };
}

/**
 * Enhanced fetch wrapper with error handling and retries
 * Requirement 5.1, 5.2, 5.3: Comprehensive error handling for API calls
 */
export async function enhancedFetch(
  url: string,
  options: RequestInit = {},
  retryOptions: Partial<ErrorHandling> = {}
): Promise<Response> {
  return retryWithBackoff(async () => {
    // Check network connectivity
    if (!isNetworkOnline()) {
      throw new NetworkError('No network connectivity');
    }

    // Set timeout for the request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        const errorMessage = await response.text().catch(() => 'Unknown error');
        throw new APIError(
          errorMessage || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          response
        );
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError('Network request failed');
      }
      
      throw error;
    }
  }, retryOptions);
}

/**
 * Start periodic network health checks
 */
function startNetworkHealthCheck(): void {
  if (typeof window === 'undefined') return;

  const checkNetworkHealth = async () => {
    try {
      // Try to fetch a small resource to test connectivity
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      const wasOnline = isOnline;
      isOnline = response.ok;
      
      if (wasOnline !== isOnline) {
        connectivityListeners.forEach(listener => listener(isOnline));
      }
    } catch (error) {
      const wasOnline = isOnline;
      isOnline = false;
      
      if (wasOnline !== isOnline) {
        connectivityListeners.forEach(listener => listener(isOnline));
      }
    }
  };

  // Check every 30 seconds
  setInterval(checkNetworkHealth, 30000);
}

/**
 * Create error state object for component state management
 */
export function createErrorState(
  error: Error,
  retryCount: number = 0
): ErrorState {
  let type: ErrorState['type'] = 'service';
  
  if (error instanceof NetworkError || !isNetworkOnline()) {
    type = 'network';
  } else if (error instanceof ValidationError) {
    type = 'validation';
  } else if (error instanceof StorageError) {
    type = 'storage';
  }

  return {
    type,
    message: error.message,
    retryable: isRetryableError(error),
    retryCount
  };
}

/**
 * Queue messages for retry when offline
 * Requirement 5.4: Preserve user input on send failures
 */
interface QueuedMessage {
  id: string;
  content: string;
  timestamp: Date;
  retryCount: number;
}

let messageQueue: QueuedMessage[] = [];

export function queueMessageForRetry(content: string): string {
  const messageId = `queued-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  messageQueue.push({
    id: messageId,
    content,
    timestamp: new Date(),
    retryCount: 0
  });

  return messageId;
}

export function getQueuedMessages(): QueuedMessage[] {
  return [...messageQueue];
}

export function removeQueuedMessage(messageId: string): void {
  messageQueue = messageQueue.filter(msg => msg.id !== messageId);
}

export function clearMessageQueue(): void {
  messageQueue = [];
}

/**
 * Process queued messages when connectivity is restored
 */
export async function processQueuedMessages(
  sendMessage: (content: string) => Promise<void>
): Promise<PromiseSettledResult<void>[]> {
  const messages = [...messageQueue];
  messageQueue = []; // Clear queue immediately to prevent duplicates

  return Promise.allSettled(
    messages.map(async (message) => {
      try {
        await sendMessage(message.content);
      } catch (error) {
        // Re-queue failed messages with incremented retry count
        if (message.retryCount < ERROR_HANDLING_CONFIG.maxRetries) {
          messageQueue.push({
            ...message,
            retryCount: message.retryCount + 1
          });
        }
        throw error;
      }
    })
  );
}