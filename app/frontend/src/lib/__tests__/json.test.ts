/**
 * Tests for JSON utility functions
 */

import { safeJsonParse, safeJsonStringify } from '../json';

describe('JSON Utilities', () => {
  describe('safeJsonParse', () => {
    it('should parse valid JSON string', () => {
      const json = '{"name":"John","age":30}';
      const result = safeJsonParse(json);

      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should parse JSON arrays', () => {
      const json = '[1,2,3,4,5]';
      const result = safeJsonParse(json);

      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should parse primitive values', () => {
      expect(safeJsonParse('"string"')).toBe('string');
      expect(safeJsonParse('123')).toBe(123);
      expect(safeJsonParse('true')).toBe(true);
      expect(safeJsonParse('null')).toBeNull();
    });

    it('should return default value for invalid JSON', () => {
      const defaultValue = { fallback: true };
      const result = safeJsonParse('invalid json', defaultValue);

      expect(result).toEqual(defaultValue);
    });

    it('should return null for invalid JSON without default', () => {
      const result = safeJsonParse('not json');

      expect(result).toBeNull();
    });

    it('should handle nested objects', () => {
      const json =
        '{"user":{"name":"John","address":{"city":"NYC","zip":"10001"}}}';
      const result = safeJsonParse(json);

      expect(result).toEqual({
        user: {
          name: 'John',
          address: { city: 'NYC', zip: '10001' },
        },
      });
    });

    it('should handle empty string', () => {
      const result = safeJsonParse('');

      expect(result).toBeNull();
    });

    it('should handle whitespace', () => {
      const json = '  {"name":"John"}  ';
      const result = safeJsonParse(json);

      expect(result).toEqual({ name: 'John' });
    });

    it('should handle undefined', () => {
      const result = safeJsonParse(undefined);

      expect(result).toBeNull();
    });

    it('should handle null string literal', () => {
      const result = safeJsonParse('null');

      expect(result).toBeNull();
    });
  });

  describe('safeJsonStringify', () => {
    it('should stringify objects', () => {
      const obj = { name: 'John', age: 30 };
      const result = safeJsonStringify(obj);

      expect(result).toBe('{"name":"John","age":30}');
      expect(JSON.parse(result)).toEqual(obj);
    });

    it('should stringify arrays', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = safeJsonStringify(arr);

      expect(result).toBe('[1,2,3,4,5]');
      expect(JSON.parse(result)).toEqual(arr);
    });

    it('should stringify primitive values', () => {
      expect(safeJsonStringify('string')).toBe('"string"');
      expect(safeJsonStringify(123)).toBe('123');
      expect(safeJsonStringify(true)).toBe('true');
      expect(safeJsonStringify(null)).toBe('null');
    });

    it('should return default value for circular references', () => {
      const obj: any = { name: 'John' };
      obj.self = obj; // Create circular reference

      const defaultValue = '{}';
      const result = safeJsonStringify(obj, defaultValue);

      expect(result).toBe(defaultValue);
    });

    it('should return empty object string for circular references without default', () => {
      const obj: any = { name: 'John' };
      obj.self = obj;

      const result = safeJsonStringify(obj);

      expect(result).toBe('{}');
    });

    it('should handle undefined values', () => {
      const result = safeJsonStringify(undefined);

      expect(result).toBe('{}');
    });

    it('should handle nested structures', () => {
      const obj = {
        user: {
          name: 'John',
          address: {
            city: 'NYC',
            zip: '10001',
          },
        },
      };
      const result = safeJsonStringify(obj);

      expect(JSON.parse(result)).toEqual(obj);
    });

    it('should handle objects with null values', () => {
      const obj = { name: 'John', email: null };
      const result = safeJsonStringify(obj);

      expect(JSON.parse(result)).toEqual(obj);
    });

    it('should handle formatting with indent', () => {
      const obj = { name: 'John', age: 30 };
      const result = safeJsonStringify(obj, '{}', 2);

      expect(result).toContain('\n');
      expect(JSON.parse(result)).toEqual(obj);
    });
  });

  describe('Round-trip conversion', () => {
    it('should stringify and parse correctly', () => {
      const original = { name: 'John', age: 30, active: true };
      const stringified = safeJsonStringify(original);
      const parsed = safeJsonParse(stringified);

      expect(parsed).toEqual(original);
    });

    it('should handle complex nested structures', () => {
      const original = {
        users: [
          { id: 1, name: 'John', tags: ['admin', 'user'] },
          { id: 2, name: 'Jane', tags: ['user'] },
        ],
        metadata: {
          total: 2,
          page: 1,
        },
      };

      const stringified = safeJsonStringify(original);
      const parsed = safeJsonParse(stringified);

      expect(parsed).toEqual(original);
    });
  });
});
