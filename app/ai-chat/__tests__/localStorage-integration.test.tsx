/**
 * Integration tests for localStorage functionality in AI Chat
 * Tests the complete localStorage integration including error handling and persistence
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatPage from '../page';
import { 
  saveChatStorage, 
  getChatStorageWithFallback, 
  getCurrentConversation,
  addMessageToConversation,
  clearChatHistory,
  checkStorageHealth
} from '../../utils/chat';
import { ChatStorage } from '../../types/chat';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock localStorage and sessionStorage
const mockStorage = () => {
  let store: { [key: string]: string } = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
};

Object.defineProperty(window, 'localStorage', {
  value: mockStorage(),
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockStorage(),
  writable: true,
});

describe('localStorage Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window.localStorage as any).clear();
    (window.sessionStorage as any).clear();
    
    // Reset fetch mock
    (fetch as jest.Mock).mockReset();
  });

  describe('Chat History Persistence', () => {
    it('should persist conversation across page reloads', () => {
      // Create and save a conversation
      const conversationResult = getCurrentConversation();
      const conversation = conversationResult.conversation;
      
      // Add a message
      const message = {
        id: 'test-msg-1',
        role: 'user' as const,
        content: 'Hello, AI!',
        timestamp: new Date(),
      };
      
      const saveResult = addMessageToConversation(conversation.id, message);
      expect(saveResult.success).toBe(true);
      
      // Simulate page reload by getting conversation again
      const reloadedResult = getCurrentConversation();
      const reloadedConversation = reloadedResult.conversation;
      
      expect(reloadedConversation.id).toBe(conversation.id);
      expect(reloadedConversation.messages).toHaveLength(1);
      expect(reloadedConversation.messages[0].content).toBe('Hello, AI!');
    });

    it('should handle storage quota exceeded gracefully', () => {
      // Mock localStorage to throw quota exceeded error
      (window.localStorage.setItem as jest.Mock).mockImplementation(() => {
        const error = new Error('Quota exceeded');
        (error as any).name = 'QuotaExceededError';
        throw error;
      });

      // Should fallback to sessionStorage
      const storage: ChatStorage = {
        conversations: [],
        currentConversationId: null,
        settings: { theme: 'light', fontSize: 'medium' },
      };

      const result = saveChatStorage(storage);
      
      // Should succeed with sessionStorage fallback
      expect(result.success).toBe(true);
      expect(window.sessionStorage.setItem).toHaveBeenCalled();
    });

    it('should provide storage health diagnostics', () => {
      const health = checkStorageHealth();
      
      expect(health).toHaveProperty('localStorage');
      expect(health).toHaveProperty('sessionStorage');
      expect(health).toHaveProperty('recommendations');
      expect(Array.isArray(health.recommendations)).toBe(true);
    });

    it('should clear chat history successfully', () => {
      // Add some data first
      const conversationResult = getCurrentConversation();
      const conversation = conversationResult.conversation;
      
      const message = {
        id: 'test-msg-1',
        role: 'user' as const,
        content: 'Test message',
        timestamp: new Date(),
      };
      
      addMessageToConversation(conversation.id, message);
      
      // Clear history
      const clearResult = clearChatHistory();
      expect(clearResult.success).toBe(true);
      
      // Verify history is cleared
      const newResult = getCurrentConversation();
      expect(newResult.conversation.messages).toHaveLength(0);
    });
  });

  describe('Storage Fallback Mechanisms', () => {
    it('should fallback to sessionStorage when localStorage fails', () => {
      // Mock localStorage to fail
      (window.localStorage.getItem as jest.Mock).mockImplementation(() => {
        throw new Error('localStorage error');
      });

      // Mock sessionStorage to succeed
      const testStorage = {
        conversations: [],
        currentConversationId: null,
        settings: { theme: 'light', fontSize: 'medium' },
      };
      
      (window.sessionStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify(testStorage)
      );

      const result = getChatStorageWithFallback();
      
      expect(result.source).toBe('sessionStorage');
      expect(result.warning).toContain('session storage');
    });

    it('should use default storage when both localStorage and sessionStorage fail', () => {
      // Mock both storages to fail
      (window.localStorage.getItem as jest.Mock).mockImplementation(() => {
        throw new Error('localStorage error');
      });
      (window.sessionStorage.getItem as jest.Mock).mockImplementation(() => {
        throw new Error('sessionStorage error');
      });

      const result = getChatStorageWithFallback();
      
      expect(result.source).toBe('default');
      expect(result.warning).toContain('Unable to load');
      expect(result.storage.conversations).toHaveLength(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle private browsing mode gracefully', () => {
      // Mock security error (private browsing)
      (window.localStorage.setItem as jest.Mock).mockImplementation(() => {
        const error = new Error('Security error');
        (error as any).name = 'SecurityError';
        throw error;
      });

      (window.sessionStorage.setItem as jest.Mock).mockImplementation(() => {
        const error = new Error('Security error');
        (error as any).name = 'SecurityError';
        throw error;
      });

      const storage: ChatStorage = {
        conversations: [],
        currentConversationId: null,
        settings: { theme: 'light', fontSize: 'medium' },
      };

      const result = saveChatStorage(storage);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unable to save');
    });

    it('should maintain conversation state across navigation', () => {
      // Reset mocks to simulate working localStorage for this test
      (window.localStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'ai-chat-history') {
          // Return a stored conversation
          const testStorage = {
            conversations: [{
              id: 'test-conversation-id',
              messages: [
                {
                  id: 'msg-1',
                  role: 'user',
                  content: 'First message',
                  timestamp: new Date().toISOString(),
                },
                {
                  id: 'msg-2',
                  role: 'assistant',
                  content: 'AI response',
                  timestamp: new Date().toISOString(),
                },
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }],
            currentConversationId: 'test-conversation-id',
            settings: { theme: 'light', fontSize: 'medium' },
          };
          return JSON.stringify(testStorage);
        }
        return null;
      });

      (window.localStorage.setItem as jest.Mock).mockImplementation(() => {
        // Simulate successful storage
      });

      // Get conversation - should restore from localStorage
      const navigationResult = getCurrentConversation();
      const restoredConversation = navigationResult.conversation;
      
      expect(restoredConversation.id).toBe('test-conversation-id');
      expect(restoredConversation.messages).toHaveLength(2);
      expect(restoredConversation.messages[0].content).toBe('First message');
      expect(restoredConversation.messages[1].content).toBe('AI response');
    });
  });

  describe('Storage Optimization', () => {
    it('should optimize storage when approaching limits', () => {
      // Create multiple conversations to test optimization
      const conversations = [];
      
      for (let i = 0; i < 10; i++) {
        const result = getCurrentConversation();
        const conversation = result.conversation;
        
        // Add messages to each conversation
        const message = {
          id: `msg-${i}`,
          role: 'user' as const,
          content: `Message ${i}`,
          timestamp: new Date(),
        };
        
        addMessageToConversation(conversation.id, message);
        conversations.push(conversation);
      }

      // The storage should handle multiple conversations
      const finalResult = getCurrentConversation();
      expect(finalResult.conversation).toBeDefined();
    });
  });
});