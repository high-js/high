import Resource from '../../src/resources';
import ObjectResource from '../../src/resources/object';

describe('MethodResource', () => {
  test('can be invoked', async () => {
    const Person = await ObjectResource.$load('./fixtures/person', {directory: __dirname});
    const person = Person.$instantiate({name: 'Manu', age: 44});
    expect(person.getGreeting()).toBe('Hi Manu!');
    person.age++;
    expect(person.getGreeting()).toBe('Hello Manu!');
  });

  test('is serializable', async () => {
    expect((await Resource.$create({$type: 'method'})).$serialize()).toEqual({$type: 'method'});
  });
});