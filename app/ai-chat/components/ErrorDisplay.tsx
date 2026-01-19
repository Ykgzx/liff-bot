'use client';

import { useState } from 'react';
import { createUserFriendlyErrorMessage } from '../../utils/errorHandling';

interface ErrorDisplayProps {
  error: Error;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryCount?: number;
  className?: string;
}

/**
 * Enhanced Error Display Component
 * 
 * Displays user-friendly error messages with actionable suggestions
 * Implements Requirements 5.2: Display user-friendly error messages
 * Implements Requirements 5.3: Provide options to retry failed operations
 */
export default function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  retryCount = 0,
  className = ''
}: ErrorDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const errorInfo = createUserFriendlyErrorMessage(error);

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorIcon = () => {
    switch (errorInfo.title) {
      case 'Connection Problem':
        return '📡';
      case 'Service Temporarily Unavailable':
        return '🔧';
      case 'Too Many Requests':
        return '⏱️';
      case 'Authentication Error':
        return '🔐';
      case 'Invalid Input':
        return '⚠️';
      case 'Storage Problem':
        return '💾';
      case 'Request Timeout':
        return '⏰';
      default:
        return '❌';
    }
  };

  const getSeverityColor = () => {
    if (!errorInfo.retryable) return 'red';
    if (errorInfo.title.includes('Connection') || errorInfo.title.includes('Timeout')) return 'orange';
    return 'yellow';
  };

  const severityColor = getSeverityColor();
  const colorClasses = {
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      button: 'bg-red-600 hover:bg-red-700 text-white',
      icon: 'text-red-600'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-800',
      button: 'bg-orange-600 hover:bg-orange-700 text-white',
      icon: 'text-orange-600'
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      icon: 'text-yellow-600'
    }
  };

  const colors = colorClasses[severityColor];

  return (
    <div className={`rounded-2xl border ${colors.bg} ${colors.border} p-4 max-w-md mx-auto ${className}`}>
      {/* Main Error Display */}
      <div className="flex items-start space-x-3">
        <div className={`text-2xl ${colors.icon} flex-shrink-0`}>
          {getErrorIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold text-sm ${colors.text}`}>
              {errorInfo.title}
            </h3>
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`${colors.text} hover:opacity-70 text-lg leading-none`}
                aria-label="Dismiss error"
              >
                ×
              </button>
            )}
          </div>
          
          <p className={`text-sm ${colors.text} mt-1 opacity-90`}>
            {errorInfo.message}
          </p>

          {/* Retry Information */}
          {retryCount > 0 && (
            <p className={`text-xs ${colors.text} mt-1 opacity-75`}>
              Retry attempt {retryCount}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 mt-3">
            {errorInfo.retryable && onRetry && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${colors.button} disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1`}
              >
                {isRetrying ? (
                  <>
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    <span>Retrying...</span>
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    <span>Try Again</span>
                  </>
                )}
              </button>
            )}

            {errorInfo.suggestions.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${colors.text} border-current hover:bg-black hover:bg-opacity-5`}
              >
                {isExpanded ? 'Hide Help' : 'Show Help'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Suggestions */}
      {isExpanded && errorInfo.suggestions.length > 0 && (
        <div className={`mt-4 pt-3 border-t ${colors.border}`}>
          <h4 className={`text-xs font-semibold ${colors.text} mb-2`}>
            💡 Suggestions:
          </h4>
          <ul className={`text-xs ${colors.text} space-y-1 opacity-90`}>
            {errorInfo.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-xs opacity-60 mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Technical Details (for development) */}
      {process.env.NODE_ENV === 'development' && (
        <details className={`mt-3 pt-2 border-t ${colors.border}`}>
          <summary className={`text-xs ${colors.text} cursor-pointer opacity-75 hover:opacity-100`}>
            Technical Details
          </summary>
          <pre className={`text-xs ${colors.text} mt-2 opacity-60 whitespace-pre-wrap break-all`}>
            {error.name}: {error.message}
            {error.stack && `\n\nStack trace:\n${error.stack}`}
          </pre>
        </details>
      )}
    </div>
  );
}