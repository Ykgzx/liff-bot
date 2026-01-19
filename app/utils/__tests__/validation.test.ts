/**
 * Tests for input validation logic
 * Validates Requirements 2.3, 2.4
 */

import { validateMessageInput, getValidationErrorMessage } from '../chat';

describe('Input Validation', () => {
  describe('validateMessageInput', () => {
    // Test empty and null inputs
    test('should reject null and undefined inputs', () => {
      expect(validateMessageInput(null as any)).toBe(false);
      expect(validateMessageInput(undefined as any)).toBe(false);
    });

    test('should reject non-string inputs', () => {
      expect(validateMessageInput(123 as any)).toBe(false);
      expect(validateMessageInput({} as any)).toBe(false);
      expect(validateMessageInput([] as any)).toBe(false);
    });

    test('should reject empty strings', () => {
      expect(validateMessageInput('')).toBe(false);
    });

    // Test whitespace-only inputs
    test('should reject whitespace-only inputs', () => {
      expect(validateMessageInput(' ')).toBe(false);
      expect(validateMessageInput('   ')).toBe(false);
      expect(validateMessageInput('\t')).toBe(false);
      expect(validateMessageInput('\n')).toBe(false);
      expect(validateMessageInput('\r\n')).toBe(false);
      expect(validateMessageInput(' \t \n ')).toBe(false);
    });

    // Test inputs with only special characters
    test('should reject inputs with only punctuation/special characters', () => {
      expect(validateMessageInput('!!!')).toBe(false);
      expect(validateMessageInput('...')).toBe(false);
      expect(validateMessageInput('???')).toBe(false);
      expect(validateMessageInput('---')).toBe(false);
      expect(validateMessageInput('***')).toBe(false);
    });

    // Test valid inputs
    test('should accept valid text inputs', () => {
      expect(validateMessageInput('Hello')).toBe(true);
      expect(validateMessageInput('Hello world')).toBe(true);
      expect(validateMessageInput('123')).toBe(true);
      expect(validateMessageInput('Hello!')).toBe(true);
      expect(validateMessageInput('What is 2+2?')).toBe(true);
    });

    // Test inputs with meaningful content but some whitespace
    test('should accept inputs with meaningful content and whitespace', () => {
      expect(validateMessageInput(' Hello ')).toBe(true);
      expect(validateMessageInput('\tHello world\n')).toBe(true);
      expect(validateMessageInput('  123  ')).toBe(true);
    });

    // Test unicode characters
    test('should accept unicode characters', () => {
      expect(validateMessageInput('Héllo')).toBe(true);
      expect(validateMessageInput('你好')).toBe(true);
      expect(validateMessageInput('café')).toBe(true);
    });

    // Test Thai language
    test('should accept Thai language text', () => {
      expect(validateMessageInput('สวัสดี')).toBe(true);
      expect(validateMessageInput('อยากได้ครีม')).toBe(true);
      expect(validateMessageInput('ขอบคุณครับ')).toBe(true);
    });

    // Test Thai language
    test('should accept Thai language text', () => {
      expect(validateMessageInput('สวัสดี')).toBe(true);
      expect(validateMessageInput('อยากได้ครีม')).toBe(true);
      expect(validateMessageInput('ขอบคุณครับ')).toBe(true);
    });
  });

  describe('getValidationErrorMessage', () => {
    test('should return appropriate error messages', () => {
      expect(getValidationErrorMessage(null as any)).toBe('Please enter a message');
      expect(getValidationErrorMessage('')).toBe('Please enter a message');
      expect(getValidationErrorMessage('   ')).toBe('Message cannot contain only whitespace');
      expect(getValidationErrorMessage('!!!')).toBe('Message must contain meaningful content');
    });

    test('should return null for valid inputs', () => {
      expect(getValidationErrorMessage('Hello')).toBe(null);
      expect(getValidationErrorMessage('Hello world')).toBe(null);
      expect(getValidationErrorMessage('123')).toBe(null);
    });
  });
});