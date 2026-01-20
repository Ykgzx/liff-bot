'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatMessage as ChatMessageType, Conversation } from '../types/chat';
import { 
  validateMessageInput, 
  createMessage, 
  getCurrentConversation,
  addMessageToConversation,
  getChatStorageWithFallback,
  checkStorageHealth
} from '../utils/chat';
import { 
  initializeNetworkMonitoring,
  enhancedFetch,
  createUserFriendlyErrorMessage,
  createErrorState,
  queueMessageForRetry,
  getQueuedMessages,
  processQueuedMessages,
  isNetworkOnline,
  addConnectivityListener,
  NetworkError,
  APIError
} from '../utils/errorHandling';
import { UI_CONFIG, ERROR_HANDLING_CONFIG } from '../config/chat';
import Message from './components/Message';
import ChatInput from './components/ChatInput';
import ConversationManager from './components/ConversationManager';
import ErrorDisplay from './components/ErrorDisplay';
import NetworkStatus from './components/NetworkStatus';

export default function ChatPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string; createdAt?: Date }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [storageSource, setStorageSource] = useState<'localStorage' | 'sessionStorage' | 'default'>('localStorage');
  const [isOnline, setIsOnline] = useState(true);
  const [queuedMessageCount, setQueuedMessageCount] = useState(0);

  // Initialize with welcome message and load conversation history
  useEffect(() => {
    if (!isInitialized) {
      // Initialize network monitoring
      initializeNetworkMonitoring();
      
      // Set up connectivity listener
      const cleanup = addConnectivityListener((online) => {
        setIsOnline(online);
        
        // Auto-process queued messages when coming back online
        if (online && queuedMessageCount > 0) {
          handleProcessQueuedMessages();
        }
      });

      loadCurrentConversation();
      setIsInitialized(true);

      return cleanup;
    }
  }, [isInitialized, queuedMessageCount]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update queued message count
  useEffect(() => {
    const interval = setInterval(() => {
      setQueuedMessageCount(getQueuedMessages().length);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadCurrentConversation = () => {
    // Check storage health and load conversation with enhanced error handling
    const storageHealth = checkStorageHealth();
    const conversationResult = getCurrentConversation();
    
    // Set storage warnings if any
    if (conversationResult.warning) {
      setStorageWarning(conversationResult.warning);
    }
    
    // Get storage source information
    const storageInfo = getChatStorageWithFallback();
    setStorageSource(storageInfo.source);
    
    // Display storage recommendations if needed
    if (storageHealth.recommendations.length > 0) {
      console.warn('Storage recommendations:', storageHealth.recommendations);
      if (!conversationResult.warning) {
        setStorageWarning(storageHealth.recommendations[0]);
      }
    }
    
    // Set current conversation and convert messages for UI
    setCurrentConversation(conversationResult.conversation);
    const uiMessages = conversationResult.conversation.messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.timestamp
    }));
    
    setMessages(uiMessages);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: UI_CONFIG.SCROLL_BEHAVIOR 
    });
  };

  const handleInputChange = (value: string) => {
    setInput(value);
  };

  const handleConversationChange = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    
    // Convert messages for UI display
    const uiMessages = conversation.messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.timestamp
    }));
    
    setMessages(uiMessages);
    setError(null);
    setRetryCount(0);
  };

  const handleClearHistory = () => {
    // Reload the current conversation (which will be empty after clearing)
    loadCurrentConversation();
    setError(null);
    setRetryCount(0);
  };

  const handleRetry = async () => {
    if (!error || !input.trim()) return;
    
    setError(null);
    setRetryCount(prev => prev + 1);
    
    // Retry the last failed operation
    await handleSubmit(new Event('submit') as any);
  };

  const handleProcessQueuedMessages = async () => {
    try {
      await processQueuedMessages(async (content: string) => {
        // This will send the queued message
        await sendMessageToAPI(content, true);
      });
    } catch (error) {
      console.error('Failed to process queued messages:', error);
    }
  };

  const sendMessageToAPI = async (messageContent: string, isQueuedMessage: boolean = false): Promise<string> => {
    if (!currentConversation) {
      throw new Error('No current conversation available');
    }

    // Check network connectivity
    if (!isNetworkOnline()) {
      if (!isQueuedMessage) {
        // Queue the message for later
        queueMessageForRetry(messageContent);
        throw new NetworkError('No network connectivity - message queued for retry');
      } else {
        throw new NetworkError('No network connectivity');
      }
    }

    try {
      // Enhanced API call with retry logic and better error handling
      const response = await enhancedFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: messageContent }].map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      }, {
        maxRetries: ERROR_HANDLING_CONFIG.maxRetries,
        retryDelay: ERROR_HANDLING_CONFIG.retryDelay,
        exponentialBackoff: ERROR_HANDLING_CONFIG.exponentialBackoff
      });

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body received');
      }

      const decoder = new TextDecoder();
      let assistantContent = '';

      // Create assistant message for streaming
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: '',
        createdAt: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const data = JSON.parse(line.slice(2));
              if (data.type === 'text-delta' && data.textDelta) {
                assistantContent += data.textDelta;
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                );
              }
            } catch (e) {
              // Ignore parsing errors for partial chunks
            }
          }
        }
      }

      return assistantContent;

    } catch (error) {
      // Enhanced error handling with specific error types
      if (error instanceof Response) {
        const errorData = await error.json().catch(() => ({}));
        throw new APIError(
          errorData.message || `HTTP ${error.status}: ${error.statusText}`,
          error.status,
          error
        );
      }
      
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced validation with better error handling (Requirements 2.3, 2.4)
    if (!validateMessageInput(input)) {
      // Maintain input state on validation failure - do not clear input
      // The ChatInput component will show the validation error
      return;
    }

    if (!currentConversation) {
      console.error('No current conversation available');
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: input,
      createdAt: new Date()
    };

    // Add user message to UI
    setMessages(prev => [...prev, userMessage]);
    
    // Save user message to local storage with enhanced error handling
    const userChatMessage = createMessage('user', input);
    const saveResult = addMessageToConversation(currentConversation.id, userChatMessage);
    
    // Handle storage warnings
    if (saveResult.warning && saveResult.warning !== storageWarning) {
      setStorageWarning(saveResult.warning);
    }

    // Clear input and set loading only after successful validation
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Send message with comprehensive error handling
      const assistantContent = await sendMessageToAPI(currentInput);

      // Save AI response to local storage with enhanced error handling
      const aiChatMessage = createMessage('assistant', assistantContent);
      const aiSaveResult = addMessageToConversation(currentConversation.id, aiChatMessage);
      
      // Handle storage warnings for AI response
      if (aiSaveResult.warning && aiSaveResult.warning !== storageWarning) {
        setStorageWarning(aiSaveResult.warning);
      }

      // Reset retry count on success
      setRetryCount(0);

    } catch (err) {
      console.error('Chat error:', err);
      
      // Create appropriate error based on error type
      let displayError = err as Error;
      
      // Handle network errors specially
      if (err instanceof NetworkError) {
        if (err.message.includes('queued')) {
          // Message was queued, show success message instead of error
          setMessages(prev => [...prev, {
            id: `system-${Date.now()}`,
            role: 'assistant' as const,
            content: '📡 Your message has been queued and will be sent when connection is restored.',
            createdAt: new Date()
          }]);
          return; // Don't show error or restore input
        }
      }
      
      setError(displayError);
      
      // Restore input on error to maintain user input state (Requirements 5.4)
      setInput(currentInput);
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-3">
            <span className="text-white text-sm">🤖</span>
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">AI Assistant</h1>
            <p className="text-xs text-gray-500">
              {isLoading ? 'Typing...' : isOnline ? 'Online' : 'Offline'}
              {storageSource !== 'localStorage' && (
                <span className="ml-2 text-amber-600">
                  • {storageSource === 'sessionStorage' ? 'Session only' : 'No persistence'}
                </span>
              )}
              {queuedMessageCount > 0 && (
                <span className="ml-2 text-amber-600">
                  • {queuedMessageCount} queued
                </span>
              )}
            </p>
          </div>
          
          {/* Conversation Management Button */}
          <ConversationManager
            currentConversationId={currentConversation?.id || null}
            onConversationChange={handleConversationChange}
            onClearHistory={handleClearHistory}
          />
        </div>
        
        {/* Storage Warning Banner */}
        {storageWarning && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <span className="text-amber-600 text-sm mr-2">⚠️</span>
              <div className="flex-1">
                <p className="text-xs text-amber-800">{storageWarning}</p>
                {storageSource === 'sessionStorage' && (
                  <p className="text-xs text-amber-700 mt-1">
                    Conversations will be lost when you close the browser.
                  </p>
                )}
              </div>
              <button
                onClick={() => setStorageWarning(null)}
                className="text-amber-600 hover:text-amber-800 text-xs ml-2"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Network Status */}
      <NetworkStatus 
        onRetryQueuedMessages={handleProcessQueuedMessages}
        className="px-4 pt-2"
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-20">
        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="flex justify-center">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 max-w-xs text-center">
              <div className="text-2xl mb-2">👋</div>
              <p className="text-sm text-gray-600">{UI_CONFIG.WELCOME_MESSAGE}</p>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {messages.map((message) => (
          <Message 
            key={message.id} 
            message={{
              id: message.id,
              role: message.role,
              content: message.content,
              timestamp: message.createdAt || new Date()
            }} 
            isStreaming={isLoading && message.role === 'assistant' && message === messages[messages.length - 1]}
          />
        ))}

        {/* Loading Indicator */}
        {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 max-w-xs">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Error Display */}
        {error && (
          <ErrorDisplay
            error={error}
            onRetry={handleRetry}
            onDismiss={() => setError(null)}
            retryCount={retryCount}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput
        input={input}
        isLoading={isLoading}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}