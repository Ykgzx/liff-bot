/**
 * Unit tests for chat utility functions
 * Validates core functionality for AI Chat feature including enhanced localStorage integration
 */

import {
  generateId,
  createMessage,
  createConversation,
  validateMessageInput,
  formatTimestamp,
  saveChatStorage,
  getChatStorage,
  getChatStorageWithFallback,
  addMessageToConversation,
  getCurrentConversation,
  clearChatHistory,
  checkStorageHealth,
} from '../chat';
import { ChatStorage } from '../../types/chat';

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

// Mock window object for storage tests
Object.defineProperty(window, 'localStorage', {
  value: mockStorage(),
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockStorage(),
  writable: true,
});

describe('Chat Utilities', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    (window.localStorage as any).clear();
    (window.sessionStorage as any).clear();
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('createMessage', () => {
    it('should create a valid message object', () => {
      const content = 'Hello, world!';
      const message = createMessage('user', content);

      expect(message).toMatchObject({
        role: 'user',
        content,
        timestamp: expect.any(Date),
        id: expect.any(String),
      });
    });

    it('should include metadata when provided', () => {
      const metadata = { tokens: 10, model: 'gpt-3.5-turbo' };
      const message = createMessage('assistant', 'Response', metadata);

      expect(message.metadata).toEqual(metadata);
    });
  });

  describe('createConversation', () => {
    it('should create an empty conversation', () => {
      const conversation = createConversation();

      expect(conversation).toMatchObject({
        id: expect.any(String),
        messages: [],
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should create conversation with initial message', () => {
      const message = createMessage('user', 'Hello');
      const conversation = createConversation(message);

      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0]).toBe(message);
    });
  });

  describe('validateMessageInput', () => {
    it('should validate non-empty messages', () => {
      expect(validateMessageInput('Hello')).toBe(true);
      expect(validateMessageInput('  Hello  ')).toBe(true);
    });

    it('should reject empty or whitespace-only messages', () => {
      expect(validateMessageInput('')).toBe(false);
      expect(validateMessageInput('   ')).toBe(false);
      expect(validateMessageInput('\t\n')).toBe(false);
    });
  });

  describe('formatTimestamp', () => {
    it('should format timestamp correctly', () => {
      const date = new Date('2024-01-15T14:30:00');
      const formatted = formatTimestamp(date);

      expect(formatted).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/);
    });
  });

  describe('Enhanced localStorage Integration', () => {
    describe('saveChatStorage', () => {
      it('should save storage successfully', () => {
        const storage: ChatStorage = {
          conversations: [],
          currentConversationId: null,
          settings: { theme: 'light', fontSize: 'medium' },
        };

        const result = saveChatStorage(storage);
        
        expect(result.success).toBe(true);
        expect(window.localStorage.setItem).toHaveBeenCalledWith(
          'ai-chat-history',
          JSON.stringify(storage)
        );
      });

      it('should handle localStorage quota exceeded error', () => {
        const storage: ChatStorage = {
          conversations: [],
          currentConversationId: null,
          settings: { theme: 'light', fontSize: 'medium' },
        };

        // Mock quota exceeded error
        (window.localStorage.setItem as jest.Mock).mockImplementation(() => {
          const error = new DOMException('Quota exceeded', 'QuotaExceededError');
          error.name = 'QuotaExceededError';
          throw error;
        });

        const result = saveChatStorage(storage);
        
        // Should attempt fallback to sessionStorage
        expect(window.sessionStorage.setItem).toHaveBeenCalled();
      });

      it('should handle security errors gracefully', () => {
        const storage: ChatStorage = {
          conversations: [],
          currentConversationId: null,
          settings: { theme: 'light', fontSize: 'medium' },
        };

        // Mock both localStorage and sessionStorage to fail with security errors
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

        const result = saveChatStorage(storage);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Unable to save');
      });
    });

    describe('getChatStorageWithFallback', () => {
      it('should load from localStorage when available', () => {
        const testStorage = {
          conversations: [],
          currentConversationId: null,
          settings: { theme: 'light', fontSize: 'medium' },
        };

        (window.localStorage.getItem as jest.Mock).mockReturnValue(
          JSON.stringify(testStorage)
        );

        const result = getChatStorageWithFallback();
        
        expect(result.source).toBe('localStorage');
        expect(result.storage).toMatchObject(testStorage);
      });

      it('should fallback to sessionStorage when localStorage fails', () => {
        const testStorage = {
          conversations: [],
          currentConversationId: null,
          settings: { theme: 'light', fontSize: 'medium' },
        };

        // localStorage fails
        (window.localStorage.getItem as jest.Mock).mockImplementation(() => {
          throw new Error('localStorage error');
        });

        // sessionStorage succeeds
        (window.sessionStorage.getItem as jest.Mock).mockReturnValue(
          JSON.stringify(testStorage)
        );

        const result = getChatStorageWithFallback();
        
        expect(result.source).toBe('sessionStorage');
        expect(result.warning).toContain('session storage');
      });

      it('should return default storage when both fail', () => {
        // Both storages fail
        (window.localStorage.getItem as jest.Mock).mockImplementation(() => {
          throw new Error('localStorage error');
        });
        (window.sessionStorage.getItem as jest.Mock).mockImplementation(() => {
          throw new Error('sessionStorage error');
        });

        const result = getChatStorageWithFallback();
        
        expect(result.source).toBe('default');
        expect(result.warning).toContain('Unable to load');
      });
    });

    describe('addMessageToConversation', () => {
      it('should add message and handle storage warnings', () => {
        // Setup existing conversation
        const conversation = createConversation();
        const storage: ChatStorage = {
          conversations: [conversation],
          currentConversationId: conversation.id,
          settings: { theme: 'light', fontSize: 'medium' },
        };

        (window.localStorage.getItem as jest.Mock).mockReturnValue(
          JSON.stringify(storage)
        );

        // Reset localStorage.setItem to succeed for this test
        (window.localStorage.setItem as jest.Mock).mockImplementation(() => {
          // Success - no error thrown
        });

        const message = createMessage('user', 'Test message');
        const result = addMessageToConversation(conversation.id, message);

        expect(result.success).toBe(true);
        expect(window.localStorage.setItem).toHaveBeenCalled();
      });

      it('should handle conversation not found', () => {
        const result = addMessageToConversation('nonexistent-id', createMessage('user', 'Test'));
        
        expect(result.success).toBe(false);
        expect(result.warning).toBe('Conversation not found');
      });
    });

    describe('getCurrentConversation', () => {
      it('should return existing conversation with warnings', () => {
        const conversation = createConversation();
        const storage: ChatStorage = {
          conversations: [conversation],
          currentConversationId: conversation.id,
          settings: { theme: 'light', fontSize: 'medium' },
        };

        (window.localStorage.getItem as jest.Mock).mockReturnValue(
          JSON.stringify(storage)
        );

        const result = getCurrentConversation();
        
        expect(result.conversation.id).toBe(conversation.id);
      });

      it('should create new conversation when none exists', () => {
        (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

        const result = getCurrentConversation();
        
        expect(result.conversation).toBeDefined();
        expect(result.conversation.messages).toHaveLength(0);
      });
    });

    describe('checkStorageHealth', () => {
      it('should report healthy storage', () => {
        // Reset mocks to default behavior for this test
        (window.localStorage.setItem as jest.Mock).mockImplementation((key, value) => {
          // Simulate successful storage
        });
        (window.localStorage.removeItem as jest.Mock).mockImplementation((key) => {
          // Simulate successful removal
        });
        (window.sessionStorage.setItem as jest.Mock).mockImplementation((key, value) => {
          // Simulate successful storage
        });
        (window.sessionStorage.removeItem as jest.Mock).mockImplementation((key) => {
          // Simulate successful removal
        });

        const health = checkStorageHealth();
        
        expect(health.localStorage.available).toBe(true);
        expect(health.sessionStorage.available).toBe(true);
      });

      it('should detect localStorage issues', () => {
        (window.localStorage.setItem as jest.Mock).mockImplementation(() => {
          throw new Error('Storage error');
        });

        const health = checkStorageHealth();
        
        expect(health.localStorage.available).toBe(false);
        expect(health.recommendations).toContain('localStorage unavailable (private browsing mode?)');
      });
    });

    describe('clearChatHistory', () => {
      it('should clear history and return success status', () => {
        const result = clearChatHistory();
        
        expect(result.success).toBe(true);
        expect(window.localStorage.setItem).toHaveBeenCalled();
      });
    });
  });
});