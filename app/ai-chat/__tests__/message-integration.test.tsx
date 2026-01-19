import { render, screen } from '@testing-library/react';
import Message from '../components/Message';
import { ChatMessage } from '../../types/chat';

// Mock the chat utilities
jest.mock('../../utils/chat', () => ({
  formatTimestamp: jest.fn((date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }),
}));

describe('Message Integration Tests', () => {
  it('displays messages in conversation order with proper visual distinction', () => {
    const messages: ChatMessage[] = [
      {
        id: 'user-1',
        role: 'user',
        content: 'What is the weather like?',
        timestamp: new Date('2024-01-01T10:00:00Z'),
      },
      {
        id: 'ai-1',
        role: 'assistant',
        content: 'I can help you with weather information. Could you please specify your location?',
        timestamp: new Date('2024-01-01T10:00:30Z'),
      },
      {
        id: 'user-2',
        role: 'user',
        content: 'New York City',
        timestamp: new Date('2024-01-01T10:01:00Z'),
      },
    ];

    const { container } = render(
      <div className="space-y-4">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
      </div>
    );

    // Verify all messages are rendered
    expect(screen.getByText('What is the weather like?')).toBeInTheDocument();
    expect(screen.getByText('I can help you with weather information. Could you please specify your location?')).toBeInTheDocument();
    expect(screen.getByText('New York City')).toBeInTheDocument();

    // Verify visual distinction between user and AI messages
    const userMessages = container.querySelectorAll('.bg-indigo-600');
    const aiMessages = container.querySelectorAll('.bg-white');
    
    expect(userMessages).toHaveLength(2); // Two user messages
    expect(aiMessages).toHaveLength(1); // One AI message
  });

  it('handles streaming state correctly for the latest AI message', () => {
    const streamingMessage: ChatMessage = {
      id: 'ai-streaming',
      role: 'assistant',
      content: 'The weather in New York City is currently',
      timestamp: new Date(),
    };

    render(<Message message={streamingMessage} isStreaming={true} />);

    // Verify streaming indicator is present
    const streamingIndicator = screen.getByLabelText('AI is typing');
    expect(streamingIndicator).toBeInTheDocument();
    expect(streamingIndicator).toHaveClass('animate-pulse');
  });

  it('maintains consistent timestamp formatting across messages', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: 'First message',
        timestamp: new Date('2024-01-01T09:30:00Z'),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Second message',
        timestamp: new Date('2024-01-01T14:45:00Z'),
      },
    ];

    render(
      <div>
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
      </div>
    );

    // Both timestamps should be formatted consistently
    const timestamps = screen.getAllByText(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    expect(timestamps).toHaveLength(2);
  });

  it('handles message content with various text formatting', () => {
    const formattedMessage: ChatMessage = {
      id: 'formatted-msg',
      role: 'assistant',
      content: 'Here is some formatted text:\n\n• Point 1\n• Point 2\n\nAnd a new paragraph.',
      timestamp: new Date(),
    };

    render(<Message message={formattedMessage} />);

    // Use a more flexible matcher for multiline text
    const messageContent = screen.getByText((content, element) => {
      return element?.textContent === formattedMessage.content;
    });
    expect(messageContent).toBeInTheDocument();
    expect(messageContent).toHaveClass('whitespace-pre-wrap'); // Preserves formatting
  });
});