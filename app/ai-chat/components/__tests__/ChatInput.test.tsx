import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatInput from '../ChatInput';

// Mock the chat utilities
jest.mock('../../../utils/chat', () => ({
  validateMessageInput: jest.fn((input: string) => input.trim().length > 0),
}));

// Mock the chat config
jest.mock('../../../config/chat', () => ({
  UI_CONFIG: {
    INPUT_PLACEHOLDER: 'Type your message here...',
  },
}));

describe('ChatInput Component', () => {
  const defaultProps = {
    input: '',
    isLoading: false,
    onInputChange: jest.fn(),
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders input field with placeholder', () => {
      render(<ChatInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox', { name: /type your message/i });
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute('placeholder', 'Type your message here...');
    });

    it('renders send button', () => {
      render(<ChatInput {...defaultProps} />);
      
      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).toBeInTheDocument();
    });

    it('displays loading state correctly', () => {
      render(<ChatInput {...defaultProps} isLoading={true} />);
      
      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /sending message/i });
      
      expect(textarea).toBeDisabled();
      expect(sendButton).toBeDisabled();
      expect(screen.getByRole('button')).toHaveClass('bg-gray-200');
    });
  });

  describe('Input Handling', () => {
    it('calls onInputChange when typing', () => {
      render(<ChatInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Hello world' } });
      
      expect(defaultProps.onInputChange).toHaveBeenCalledWith('Hello world');
      expect(defaultProps.onInputChange).toHaveBeenCalledTimes(1);
    });

    it('reflects input value correctly', () => {
      render(<ChatInput {...defaultProps} input="Test message" />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('Test message');
    });

    it('handles Enter key submission', () => {
      render(<ChatInput {...defaultProps} input="Valid message" />);
      
      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
      
      expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
    });

    it('prevents Enter submission when Shift is held', () => {
      render(<ChatInput {...defaultProps} input="Valid message" />);
      
      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
      
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it('prevents Enter submission with invalid input', () => {
      render(<ChatInput {...defaultProps} input="   " />); // whitespace only
      
      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
      
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Button Submission', () => {
    it('calls onSubmit when send button is clicked', () => {
      render(<ChatInput {...defaultProps} input="Valid message" />);
      
      const sendButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(sendButton);
      
      expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
    });

    it('prevents submission with empty input', () => {
      render(<ChatInput {...defaultProps} input="" />);
      
      const sendButton = screen.getByRole('button');
      expect(sendButton).toBeDisabled();
      expect(sendButton).toHaveClass('bg-gray-200');
    });

    it('prevents submission with whitespace-only input', () => {
      render(<ChatInput {...defaultProps} input="   " />);
      
      const sendButton = screen.getByRole('button');
      expect(sendButton).toBeDisabled();
    });

    it('enables submission with valid input', () => {
      render(<ChatInput {...defaultProps} input="Valid message" />);
      
      const sendButton = screen.getByRole('button');
      expect(sendButton).not.toBeDisabled();
      expect(sendButton).toHaveClass('bg-indigo-600');
    });
  });

  describe('Loading States', () => {
    it('disables input and button when loading', () => {
      render(<ChatInput {...defaultProps} isLoading={true} />);
      
      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button');
      
      expect(textarea).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });

    it('shows loading spinner when loading', () => {
      render(<ChatInput {...defaultProps} isLoading={true} />);
      
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('prevents submission when loading even with valid input', () => {
      render(<ChatInput {...defaultProps} input="Valid message" isLoading={true} />);
      
      const sendButton = screen.getByRole('button');
      fireEvent.click(sendButton);
      
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<ChatInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox', { name: /type your message/i });
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      expect(textarea).toHaveAttribute('aria-label', 'Type your message');
      expect(sendButton).toHaveAttribute('aria-label', 'Send message');
    });

    it('has helper text for screen readers', () => {
      render(<ChatInput {...defaultProps} />);
      
      const helperText = screen.getByText('Press Enter to send, Shift+Enter for new line');
      expect(helperText).toHaveClass('sr-only');
    });

    it('updates button aria-label when loading', () => {
      render(<ChatInput {...defaultProps} isLoading={true} />);
      
      const sendButton = screen.getByRole('button', { name: /sending message/i });
      expect(sendButton).toHaveAttribute('aria-label', 'Sending message...');
    });
  });

  describe('Visual States', () => {
    it('shows focus styles when input is focused', () => {
      render(<ChatInput {...defaultProps} />);
      
      const textarea = screen.getByRole('textbox');
      fireEvent.focus(textarea);
      
      waitFor(() => {
        expect(textarea).toHaveClass('border-indigo-500');
      });
    });

    it('shows validation indicator for invalid input', () => {
      render(<ChatInput {...defaultProps} input="   " />);
      
      const indicator = document.querySelector('.bg-gray-400.rounded-full');
      expect(indicator).toBeInTheDocument();
    });

    it('does not show validation indicator for empty input', () => {
      render(<ChatInput {...defaultProps} input="" />);
      
      const indicator = document.querySelector('.bg-gray-400.rounded-full');
      expect(indicator).not.toBeInTheDocument();
    });

    it('does not show validation indicator for valid input', () => {
      render(<ChatInput {...defaultProps} input="Valid message" />);
      
      const indicator = document.querySelector('.bg-gray-400.rounded-full');
      expect(indicator).not.toBeInTheDocument();
    });
  });
});