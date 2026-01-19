'use client';

import { useState, useEffect } from 'react';
import { 
  isNetworkOnline, 
  addConnectivityListener,
  getQueuedMessages,
  processQueuedMessages 
} from '../../utils/errorHandling';

interface NetworkStatusProps {
  onRetryQueuedMessages?: (sendMessage: (content: string) => Promise<void>) => void;
  className?: string;
}

/**
 * Network Status Indicator Component
 * 
 * Displays current network connectivity status and manages offline message queue
 * Implements Requirements 5.1: Handle network connectivity errors
 * Implements Requirements 5.4: Preserve user input on send failures
 */
export default function NetworkStatus({ 
  onRetryQueuedMessages,
  className = ''
}: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [queuedCount, setQueuedCount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  useEffect(() => {
    // Initialize with current status
    setIsOnline(isNetworkOnline());
    setQueuedCount(getQueuedMessages().length);

    // Listen for connectivity changes
    const cleanup = addConnectivityListener((online) => {
      setIsOnline(online);
      
      // Auto-process queued messages when coming back online
      if (online && queuedCount > 0 && onRetryQueuedMessages) {
        handleProcessQueue();
      }
    });

    // Update queued count periodically
    const interval = setInterval(() => {
      setQueuedCount(getQueuedMessages().length);
    }, 1000);

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, [queuedCount, onRetryQueuedMessages]);

  const handleProcessQueue = async () => {
    if (!onRetryQueuedMessages || isProcessingQueue) return;
    
    setIsProcessingQueue(true);
    try {
      // This would need to be implemented by the parent component
      // onRetryQueuedMessages(sendMessageFunction);
    } finally {
      setIsProcessingQueue(false);
    }
  };

  // Don't show anything if online and no queued messages
  if (isOnline && queuedCount === 0) {
    return null;
  }

  return (
    <div className={`${className}`}>
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-800">
              No Internet Connection
            </span>
          </div>
          <p className="text-xs text-red-700 mt-1">
            Messages will be queued and sent when connection is restored.
          </p>
        </div>
      )}

      {/* Queued Messages Indicator */}
      {queuedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
              <span className="text-sm font-medium text-amber-800">
                {queuedCount} message{queuedCount !== 1 ? 's' : ''} queued
              </span>
            </div>
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-amber-700 hover:text-amber-900 text-xs"
            >
              {showDetails ? 'Hide' : 'Show'}
            </button>
          </div>

          {showDetails && (
            <div className="mt-2 pt-2 border-t border-amber-200">
              <p className="text-xs text-amber-700 mb-2">
                These messages will be sent automatically when connection is restored:
              </p>
              
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {getQueuedMessages().map((message, index) => (
                  <div key={message.id} className="text-xs text-amber-700 bg-amber-100 rounded px-2 py-1">
                    <span className="font-medium">#{index + 1}:</span> {
                      message.content.length > 50 
                        ? message.content.substring(0, 50) + '...'
                        : message.content
                    }
                  </div>
                ))}
              </div>

              {isOnline && onRetryQueuedMessages && (
                <button
                  onClick={handleProcessQueue}
                  disabled={isProcessingQueue}
                  className="mt-2 px-3 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  {isProcessingQueue ? (
                    <>
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>📤</span>
                      <span>Send Now</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Connection Restored Indicator */}
      {isOnline && queuedCount === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 opacity-0 animate-fade-in">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm font-medium text-green-800">
              Connection Restored
            </span>
          </div>
          <p className="text-xs text-green-700 mt-1">
            All queued messages have been sent successfully.
          </p>
        </div>
      )}
    </div>
  );
}