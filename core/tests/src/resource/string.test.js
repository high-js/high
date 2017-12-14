import StringResource from '../../../dist/resource/string';

describe('StringResource', () => {
  test('creation', async () => {
    expect(await StringResource.$create()).toBeInstanceOf(StringResource);
    expect((await StringResource.$create()).$value).toBeUndefined();
    expect((await StringResource.$create({'@value': ''})).$value).toBe('');
    expect((await StringResource.$create({'@value': 'green'})).$value).toBe('green');
    expect((await StringResource.$create('blue')).$value).toBe('blue');
    await expect(StringResource.$create({'@value': 123})).rejects.toBeInstanceOf(Error);
    await expect(StringResource.$create(123)).rejects.toBeInstanceOf(Error);
  });

  test('serialization', async () => {
    expect((await StringResource.$create()).$serialize()).toBeUndefined();
    expect((await StringResource.$create({'@aliases': ['colour']})).$serialize()).toEqual({
      '@aliases': ['colour']
    });
    expect((await StringResource.$create({'@aliases': ['colour'], '@value': 'green'})).$serialize()).toEqual({
      '@aliases': ['colour'],
      '@value': 'green'
    });
    expect((await StringResource.$create({'@value': 'green'})).$serialize()).toBe('green');
  });
});