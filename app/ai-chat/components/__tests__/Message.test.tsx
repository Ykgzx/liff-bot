import { render, screen } from '@testing-library/react';
import Message from '../Message';
import { ChatMessage } from '../../../types/chat';

// Mock the formatTimestamp utility
jest.mock('../../../utils/chat', () => ({
  formatTimestamp: jest.fn((date: Date) => '12:34 PM'),
}));

describe('Message Component', () => {
  const mockUserMessage: ChatMessage = {
    id: 'user-1',
    role: 'user',
    content: 'Hello, AI!',
    timestamp: new Date('2024-01-01T12:34:00Z'),
  };

  const mockAIMessage: ChatMessage = {
    id: 'ai-1',
    role: 'assistant',
    content: 'Hello! How can I help you today?',
    timestamp: new Date('2024-01-01T12:35:00Z'),
  };

  it('renders user message with correct styling', () => {
    render(<Message message={mockUserMessage} />);
    
    const messageContent = screen.getByText('Hello, AI!');
    expect(messageContent).toBeInTheDocument();
    
    const timestamp = screen.getByText('12:34 PM');
    expect(timestamp).toBeInTheDocument();
    
    // Check for user message styling (should be right-aligned with indigo background)
    const messageContainer = messageContent.closest('div')?.parentElement?.parentElement;
    expect(messageContainer).toHaveClass('justify-end');
    
    const messageBox = messageContent.closest('div')?.parentElement;
    expect(messageBox).toHaveClass('bg-indigo-600', 'text-white');
  });

  it('renders AI message with correct styling', () => {
    render(<Message message={mockAIMessage} />);
    
    const messageContent = screen.getByText('Hello! How can I help you today?');
    expect(messageContent).toBeInTheDocument();
    
    // Check for AI message styling (should be left-aligned with white background)
    const messageContainer = messageContent.closest('div')?.parentElement?.parentElement;
    expect(messageContainer).toHaveClass('justify-start');
    
    const messageBox = messageContent.closest('div')?.parentElement;
    expect(messageBox).toHaveClass('bg-white', 'text-gray-900');
  });

  it('displays streaming indicator for AI messages', () => {
    render(<Message message={mockAIMessage} isStreaming={true} />);
    
    const streamingIndicator = screen.getByLabelText('AI is typing');
    expect(streamingIndicator).toBeInTheDocument();
    expect(streamingIndicator).toHaveClass('animate-pulse');
  });

  it('does not display streaming indicator when not streaming', () => {
    render(<Message message={mockAIMessage} isStreaming={false} />);
    
    const streamingIndicator = screen.queryByLabelText('AI is typing');
    expect(streamingIndicator).not.toBeInTheDocument();
  });

  it('displays message metadata when available', () => {
    const messageWithMetadata: ChatMessage = {
      ...mockAIMessage,
      metadata: {
        model: 'gpt-3.5-turbo',
        tokens: 150,
        error: 'Rate limit exceeded',
      },
    };

    render(<Message message={messageWithMetadata} />);
    
    // Check for metadata icons
    const modelIcon = screen.getByTitle('Model: gpt-3.5-turbo');
    expect(modelIcon).toBeInTheDocument();
    
    const tokensIcon = screen.getByTitle('Tokens: 150');
    expect(tokensIcon).toBeInTheDocument();
    
    const errorIcon = screen.getByTitle('Error: Rate limit exceeded');
    expect(errorIcon).toBeInTheDocument();
  });

  it('handles long messages with proper text wrapping', () => {
    const longMessage: ChatMessage = {
      ...mockUserMessage,
      content: 'This is a very long message that should wrap properly when displayed in the chat interface without causing horizontal overflow issues.',
    };

    render(<Message message={longMessage} />);
    
    const messageContent = screen.getByText(longMessage.content);
    expect(messageContent).toBeInTheDocument();
    expect(messageContent).toHaveClass('whitespace-pre-wrap', 'break-words');
  });

  it('uses current date when timestamp is not provided', () => {
    const messageWithoutTimestamp = {
      id: 'test-1',
      role: 'user' as const,
      content: 'Test message',
      timestamp: undefined as any,
    };

    render(<Message message={messageWithoutTimestamp} />);
    
    // Should still display timestamp (mocked to return '12:34 PM')
    const timestamp = screen.getByText('12:34 PM');
    expect(timestamp).toBeInTheDocument();
  });
});