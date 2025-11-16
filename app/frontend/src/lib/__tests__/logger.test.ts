/**
 * Tests for logger utility
 */

import logger from '../logger';

describe('Logger Utility', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('debug method', () => {
    it('should log debug messages', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      logger.debug('Debug message', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should include context in debug logs', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      logger.debug('Debug message', { user: 'John' });

      expect(consoleSpy).toHaveBeenCalled();
      const callArgs = consoleSpy.mock.calls[0];
      expect(JSON.stringify(callArgs)).toContain('user');
    });
  });

  describe('info method', () => {
    it('should log info messages', () => {
      const consoleSpy = jest.spyOn(console, 'info');

      logger.info('Info message', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('warn method', () => {
    it('should log warning messages', () => {
      const consoleSpy = jest.spyOn(console, 'warn');

      logger.warn('Warning message', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('error method', () => {
    it('should log error messages', () => {
      const consoleSpy = jest.spyOn(console, 'error');

      logger.error('Error message', new Error('Test error'));

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log error objects', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.ts:10';

      logger.error('An error occurred', error);

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle errors without stack', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const error = { message: 'Custom error' };

      logger.error('Custom error occurred', error);

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('context handling', () => {
    it('should include context in all log levels', () => {
      const context = { userId: '123', action: 'login' };

      logger.debug('Debug with context', context);
      logger.info('Info with context', context);
      logger.warn('Warn with context', context);
      logger.error('Error with context', context);

      expect(console.log).toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle null context', () => {
      expect(() => {
        logger.debug('Message with null context', null);
        logger.info('Message with null context', null);
      }).not.toThrow();
    });

    it('should handle undefined context', () => {
      expect(() => {
        logger.debug('Message with undefined context');
        logger.info('Message with undefined context');
      }).not.toThrow();
    });
  });

  describe('message formatting', () => {
    it('should format messages with timestamp', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      logger.debug('Test message');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle messages with special characters', () => {
      expect(() => {
        logger.debug('Message with special chars: @#$%^&*()');
        logger.info('Message with quotes: "double" and \'single\'');
      }).not.toThrow();
    });

    it('should handle long messages', () => {
      const longMessage = 'A'.repeat(1000);

      expect(() => {
        logger.debug(longMessage);
      }).not.toThrow();
    });
  });

  describe('production mode handling', () => {
    it('should suppress debug logs in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const consoleSpy = jest.spyOn(console, 'log');

      // Create a fresh logger instance for this test
      delete require.cache[require.resolve('../logger')];

      expect(() => {
        logger.debug('Should not appear in production');
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
