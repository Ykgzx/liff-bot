'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatInputProps } from '../../types/chat';
import { validateMessageInput, getValidationErrorMessage } from '../../utils/chat';
import { UI_CONFIG } from '../../config/chat';

/**
 * Chat Input Component
 * 
 * Handles user message input with send button and Enter key submission.
 * Includes enhanced input validation, loading states, and auto-resize functionality.
 * 
 * Requirements: 2.1, 2.2, 2.6, 2.3, 2.4
 */
export default function ChatInput({
  input,
  isLoading,
  onInputChange,
  onSubmit
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight, but constrain to min/max values
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 44), 120);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  // Validate input and update error state
  useEffect(() => {
    if (input.length > 0) {
      const errorMessage = getValidationErrorMessage(input);
      setValidationError(errorMessage);
    } else {
      setValidationError(null);
      setShowValidationError(false);
    }
  }, [input]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
    // Hide validation error when user starts typing
    if (showValidationError) {
      setShowValidationError(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Enter key submission (Requirements 2.2)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAttempt(e);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitAttempt(e);
  };

  const handleSubmitAttempt = (e: React.FormEvent | React.KeyboardEvent) => {
    // Enhanced validation with error display (Requirements 2.3, 2.4)
    if (!validateMessageInput(input)) {
      // Show validation error and maintain input state
      setShowValidationError(true);
      // Focus back to input to maintain user experience
      textareaRef.current?.focus();
      return;
    }

    if (!isLoading) {
      setShowValidationError(false);
      onSubmit(e as React.FormEvent);
    }
  };

  const isInputValid = validateMessageInput(input);
  const isSubmitDisabled = isLoading || !isInputValid;

  return (
    <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 shadow-lg z-50">
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        {/* Input Field */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={UI_CONFIG.INPUT_PLACEHOLDER}
            className={`w-full px-4 py-3 border rounded-2xl resize-none focus:outline-none text-sm transition-all duration-200 ${isFocused
              ? 'border-indigo-500 ring-2 ring-indigo-200'
              : showValidationError && validationError
                ? 'border-red-500 ring-2 ring-red-200'
                : 'border-gray-300 hover:border-gray-400'
              } ${isLoading ? 'bg-gray-50' : 'bg-white'}`}
            rows={1}
            style={{
              minHeight: '44px',
              maxHeight: '120px',
              lineHeight: '1.4'
            }}
            disabled={isLoading}
            aria-label="Type your message"
            aria-describedby="input-help"
            aria-invalid={showValidationError && validationError ? 'true' : 'false'}
          />

          {/* Input validation indicator */}
          {input.length > 0 && !isInputValid && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div
                className={`w-2 h-2 rounded-full ${showValidationError ? 'bg-red-500' : 'bg-gray-400'
                  }`}
                title={validationError || "Message validation required"}
              />
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className={`px-4 py-3 rounded-2xl font-medium text-sm transition-all duration-200 flex items-center justify-center min-w-[52px] ${isSubmitDisabled
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-md hover:shadow-lg'
            }`}
          aria-label={isLoading ? 'Sending message...' : 'Send message'}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </button>
      </form>

      {/* Validation Error Message */}
      {showValidationError && validationError && (
        <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 flex items-center">
            <svg
              className="w-4 h-4 mr-2 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {validationError}
          </p>
        </div>
      )}

      {/* Helper text */}
      <div id="input-help" className="sr-only">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}