'use client';

import { MessageProps } from '../../types/chat';
import { formatTimestamp } from '../../utils/chat';

/**
 * Message Display Component
 * 
 * Renders individual chat messages with visual distinction between user and AI messages.
 * Supports message timestamps, metadata, and streaming indicators.
 * 
 * Requirements: 3.5, 4.1
 */
export default function Message({ message, isStreaming = false }: MessageProps) {
  const isUser = message.role === 'user';
  const timestamp = message.timestamp || new Date();

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
        isUser 
          ? 'bg-indigo-600 text-white' 
          : 'bg-white text-gray-900 border border-gray-100'
      }`}>
        {/* Message Content */}
        <div className="text-sm whitespace-pre-wrap break-words">
          {message.content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" aria-label="AI is typing"></span>
          )}
        </div>
        
        {/* Message Metadata */}
        <div className={`text-xs mt-1 flex items-center justify-between ${
          isUser ? 'text-indigo-200' : 'text-gray-500'
        }`}>
          <span>{formatTimestamp(timestamp)}</span>
          
          {/* Display metadata if available */}
          {message.metadata && (
            <div className="flex items-center space-x-2">
              {message.metadata.model && (
                <span className="opacity-75" title={`Model: ${message.metadata.model}`}>
                  🤖
                </span>
              )}
              {message.metadata.tokens && (
                <span className="opacity-75" title={`Tokens: ${message.metadata.tokens}`}>
                  📊
                </span>
              )}
              {message.metadata.error && (
                <span className="text-red-400" title={`Error: ${message.metadata.error}`}>
                  ⚠️
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}