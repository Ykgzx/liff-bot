# Message Component

A dedicated, reusable component for displaying individual chat messages in the AI chat interface.

## Features

- **Visual Distinction**: Clear visual differences between user and AI messages
- **Timestamp Display**: Shows formatted timestamps for each message
- **Metadata Support**: Displays optional metadata like model info, token count, and errors
- **Streaming Indicator**: Shows typing indicator for streaming AI responses
- **Responsive Design**: Optimized for mobile and desktop viewing
- **Text Wrapping**: Proper handling of long messages and formatted text

## Usage

```tsx
import Message from './components/Message';
import { ChatMessage } from '../types/chat';

const message: ChatMessage = {
  id: 'msg-1',
  role: 'user',
  content: 'Hello, AI assistant!',
  timestamp: new Date(),
  metadata: {
    model: 'gpt-3.5-turbo',
    tokens: 25
  }
};

<Message 
  message={message} 
  isStreaming={false} 
/>
```

## Props

### `message: ChatMessage`
The message object containing:
- `id`: Unique message identifier
- `role`: Either 'user' or 'assistant'
- `content`: The message text content
- `timestamp`: When the message was created
- `metadata?`: Optional metadata object

### `isStreaming?: boolean`
Optional flag to show streaming indicator for AI responses (default: false)

## Styling

The component uses Tailwind CSS classes and follows the application's design system:

- **User messages**: Right-aligned with indigo background
- **AI messages**: Left-aligned with white background and border
- **Responsive**: Adjusts max-width based on screen size
- **Typography**: Consistent with application font and sizing

## Requirements Satisfied

- **Requirement 3.5**: Visual distinction between user and AI messages
- **Requirement 4.1**: Individual message rendering with timestamps and metadata

## Testing

The component includes comprehensive unit tests and integration tests:

```bash
npm test -- app/ai-chat/components/__tests__/Message.test.tsx
npm test -- app/ai-chat/__tests__/message-integration.test.tsx
```

## Accessibility

- Streaming indicator includes `aria-label` for screen readers
- Proper semantic HTML structure
- High contrast colors for readability
- Metadata icons include descriptive `title` attributes