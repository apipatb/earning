/**
 * Example test file to verify Jest configuration
 */

describe('Example Test Suite', () => {
  test('should perform basic arithmetic', () => {
    expect(2 + 2).toBe(4);
  });

  test('should work with strings', () => {
    const greeting = 'Hello, Jest!';
    expect(greeting).toContain('Jest');
  });

  test('should work with async/await', async () => {
    const promise = Promise.resolve('success');
    const result = await promise;
    expect(result).toBe('success');
  });

  test('should work with objects', () => {
    const user = { name: 'John', age: 30 };
    expect(user).toEqual({ name: 'John', age: 30 });
  });

  test('should work with arrays', () => {
    const numbers = [1, 2, 3, 4, 5];
    expect(numbers).toContain(3);
    expect(numbers.length).toBe(5);
  });
});
