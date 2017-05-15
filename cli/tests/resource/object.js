import ObjectResource from '../../src/resource/object';
import StringResource from '../../src/resource/string';
import NumberResource from '../../src/resource/number';

describe('ObjectResource', () => {
  test('can define simple properties', async () => {
    const person = await ObjectResource.$create({
      name: {
        $type: '$string',
        $value: 'Manu'
      }
    });
    expect(person.$getProperty('name')).toBeDefined();
    expect(person.$getProperty('name')).toBeInstanceOf(StringResource);
    expect(person.$getProperty('name').$value).toBe('Manu');
    expect(person.name).toBe('Manu');
    person.name = 'Manuel';
    expect(person.name).toBe('Manuel');
  });

  test('can define properties from literals', async () => {
    const person = await ObjectResource.$create({name: 'Manu', age: 44, address: {city: 'London'}});
    expect(person.$getProperty('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    expect(person.$getProperty('age')).toBeInstanceOf(NumberResource);
    expect(person.age).toBe(44);
    expect(person.$getProperty('address')).toBeInstanceOf(ObjectResource);
    expect(person.address.city).toBe('London');
  });

  test('can define composed properties', async () => {
    const person = await ObjectResource.$create({
      address: {
        $type: {
          city: {$type: '$string'}
        }
      }
    });
    expect(person.address).toBeDefined();
    expect(person.address).toBeInstanceOf(ObjectResource);
    expect(person.address.$getProperty('city')).toBeDefined();
    expect(person.address.city).toBeUndefined();
    person.address.city = 'Paris';
    expect(person.address.city).toBe('Paris');
    person.address = {city: 'Tokyo'};
    expect(person.address).toBeInstanceOf(ObjectResource);
    expect(person.address.city).toBe('Tokyo');
    expect(() => {
      person.address = 'New York';
    }).toThrow();
  });

  test('can inherit properties', async () => {
    const person = await ObjectResource.$create({
      $type: {$id: 'person', name: {$type: '$string', $value: 'anonymous'}}
    });
    const parent = person.$findParent(() => true);
    expect(parent.name).toBe('anonymous');
    expect(person.$getProperty('name')).toBeDefined();
    expect(person.$getProperty('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('anonymous');
    person.name = 'Manu';
    expect(person.name).toBe('Manu');
    expect(parent.name).toBe('anonymous');
  });

  test('can set value of inherited properties', async () => {
    const person = await ObjectResource.$create({
      $type: {$id: 'person', name: {$type: '$string', $value: 'anonymous'}},
      name: 'Manu'
    });
    const parent = person.$findParent(() => true);
    expect(parent.name).toBe('anonymous');
    expect(person.name).toBe('Manu');
    person.name = 'Manuel';
    expect(person.name).toBe('Manuel');
    expect(parent.name).toBe('anonymous');
  });

  test('is serializable', async () => {
    async function testSerialization(definition, expected = definition) {
      expect((await ObjectResource.$create(definition)).$serialize()).toEqual(expected);
    }
    await testSerialization(undefined);
    await testSerialization({color: 'green'});
    await testSerialization({name: 'Manu', address: {city: 'Tokyo'}});
    await testSerialization({$type: '$object'});
    await testSerialization({$type: {$id: 'person', name: 'anonymous'}});
    await testSerialization({$type: {$id: 'person', name: 'anonymous'}, name: 'Manu'});
  });
});