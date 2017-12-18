import {isAbsolute} from 'path';
import {isEmpty, isPlainObject, difference} from 'lodash';
import {takeProperty, findProperty} from '@resdir/util';
import {catchContext, formatString, formatCode} from '@resdir/console';
import {
  parseExpression,
  handleParsedExpression,
  makePositionalArgumentKey,
  getPositionalArgument,
  shiftPositionalArguments,
  getSubArgumentsKey
} from '@resdir/expression';

import Resource from '../resource';
import EnvironmentResource from './environment';
import Value from './value';

export class MethodResource extends Resource {
  static $RESOURCE_TYPE = 'method';

  async $construct(definition, options) {
    definition = {...definition};

    const input = takeProperty(definition, '@input');
    const runExpression = takeProperty(definition, '@run');
    const beforeExpression = takeProperty(definition, '@before');
    const afterExpression = takeProperty(definition, '@after');
    const listenedEvents = takeProperty(definition, '@listen');
    const unlistenedEvents = takeProperty(definition, '@unlisten');

    await super.$construct(definition, options);

    await catchContext(this, async () => {
      if (input !== undefined) {
        await this.$setInput(input);
      }
      if (runExpression !== undefined) {
        this.$runExpression = runExpression;
      }
      if (beforeExpression !== undefined) {
        this.$beforeExpression = beforeExpression;
      }
      if (afterExpression !== undefined) {
        this.$afterExpression = afterExpression;
      }
      if (listenedEvents !== undefined) {
        this.$listenedEvents = listenedEvents;
      }
      if (unlistenedEvents !== undefined) {
        this.$unlistenedEvents = unlistenedEvents;
      }
    });
  }

  $getInput() {
    return this._getInheritedValue('_input');
  }

  async $setInput(input) {
    this._input = undefined;
    if (input === undefined) {
      return;
    }
    if (!isPlainObject(input)) {
      throw new Error(`${formatCode('@input')} property must be an object`);
    }
    this._input = await Resource.$create(input, {
      directory: this.$getCurrentDirectory({throwIfUndefined: false})
    });
  }

  get $runExpression() {
    return this._getInheritedValue('_runExpression');
  }

  set $runExpression(runExpression) {
    if (typeof runExpression === 'string') {
      runExpression = [runExpression];
    }
    this._runExpression = runExpression;
  }

  get $beforeExpression() {
    return this._beforeExpression;
  }

  set $beforeExpression(beforeExpression) {
    if (typeof beforeExpression === 'string') {
      beforeExpression = [beforeExpression];
    }
    this._beforeExpression = beforeExpression;
  }

  $getAllBeforeExpressions() {
    const expression = [];
    this.$forSelfAndEachBase(
      method => {
        if (method._beforeExpression) {
          expression.unshift(...method._beforeExpression);
        }
      },
      {deepSearch: true}
    );
    return expression;
  }

  get $afterExpression() {
    return this._afterExpression;
  }

  set $afterExpression(afterExpression) {
    if (typeof afterExpression === 'string') {
      afterExpression = [afterExpression];
    }
    this._afterExpression = afterExpression;
  }

  $getAllAfterExpressions() {
    const expression = [];
    this.$forSelfAndEachBase(
      method => {
        if (method._afterExpression) {
          expression.push(...method._afterExpression);
        }
      },
      {deepSearch: true}
    );
    return expression;
  }

  get $listenedEvents() {
    return this._listenedEvents;
  }

  set $listenedEvents(events) {
    if (!Array.isArray(events)) {
      events = [events];
    }
    this._listenedEvents = events;
  }

  get $unlistenedEvents() {
    return this._unlistenedEvents;
  }

  set $unlistenedEvents(events) {
    if (!Array.isArray(events)) {
      events = [events];
    }
    this._unlistenedEvents = events;
  }

  $getAllListenedEvents() {
    const listenedEvents = [];
    const unlistenedEvents = [];
    this.$forSelfAndEachBase(
      method => {
        if (method._listenedEvents) {
          for (const event of method._listenedEvents) {
            if (!listenedEvents.includes(event)) {
              listenedEvents.push(event);
            }
          }
        }
        if (method._unlistenedEvents) {
          for (const event of method._unlistenedEvents) {
            if (!unlistenedEvents.includes(event)) {
              unlistenedEvents.push(event);
            }
          }
        }
      },
      {deepSearch: true}
    );
    return difference(listenedEvents, unlistenedEvents);
  }

  $defaultAutoUnboxing = true;

  $unbox() {
    return this.$getFunction();
  }

  $getFunction() {
    const methodResource = this;

    return async function (input, environment, ...rest) {
      const {normalizedInput, extractedEnvironment} = await methodResource._normalizeInput(input);

      let normalizedEnvironment = await methodResource._normalizeEnvironement(environment);
      if (extractedEnvironment) {
        normalizedEnvironment = await normalizedEnvironment.$extend(extractedEnvironment, {
          parse: true
        });
      }

      if (rest.length !== 0) {
        throw new TypeError(`A resource method must be invoked with a maximum of two arguments (${formatCode('input')} and ${formatCode('environment')})`);
      }

      const implementation = methodResource._getImplementation(this);
      if (!implementation) {
        throw new Error(`Can't find implementation for ${formatCode(methodResource.$getKey())}`);
      }

      const beforeExpression = methodResource.$getAllBeforeExpressions();
      if (beforeExpression.length) {
        await methodResource._run(beforeExpression, normalizedInput, {parent: this});
      }

      const result = await implementation.call(this, normalizedInput, normalizedEnvironment);

      const afterExpression = methodResource.$getAllAfterExpressions();
      if (afterExpression.length) {
        await methodResource._run(afterExpression, normalizedInput, {parent: this});
      }

      return result;
    };
  }

  async _normalizeInput(input = {}) {
    if (input instanceof Resource) {
      // TODO: Handle the case where an incompatible resource is passed
      return {normalizedInput: input};
    }

    if (!isPlainObject(input)) {
      throw new TypeError(`A resource method must be invoked with an 'input' argument of type Resource, plain object or undefined (${formatString(typeof input)} received)`);
    }

    input = {...input};

    const isParsedExpression = handleParsedExpression(input);

    let normalizedInput = this.$getInput();
    if (normalizedInput !== undefined) {
      normalizedInput = await normalizedInput.$extend();
    } else {
      normalizedInput = await Resource.$create(input, {
        directory: this.$getCurrentDirectory({throwIfUndefined: false})
      });
    }

    for (const child of normalizedInput.$getChildren()) {
      const childKey = child.$getKey();
      if (!isParsedExpression) {
        if (childKey in input) {
          const value = input[childKey];
          delete input[childKey];
          await normalizedInput.$setChild(childKey, value);
        }
      } else {
        const {foundKeys, value} = findArgument(input, child);
        if (foundKeys.length) {
          for (const key of foundKeys) {
            delete input[key];
          }
          await normalizedInput.$setChild(childKey, value, {parse: true});
        }
      }
    }

    let extractedEnvironment;

    if (isParsedExpression) {
      const environmentChildren = (await getEnvironment()).$getChildren({
        includeNativeChildren: true
      });
      for (const child of environmentChildren) {
        if (!(child instanceof Value)) {
          // Ignore native methods and getters
          continue;
        }
        const childKey = child.$getKey();
        const {foundKeys, value} = findArgument(input, child);
        if (foundKeys.length) {
          for (const key of foundKeys) {
            delete input[key];
          }
          if (extractedEnvironment === undefined) {
            extractedEnvironment = {};
          }
          extractedEnvironment[childKey] = value;
        }
      }
    }

    const remainingKeys = Object.keys(input);
    if (remainingKeys.length) {
      throw new Error(`Invalid method input key: ${formatCode(remainingKeys[0])}.`);
    }

    return {normalizedInput, extractedEnvironment};
  }

  async _normalizeEnvironement(environment) {
    if (environment instanceof Resource) {
      // TODO: Handle the case where an incompatible resource is passed
      return environment;
    }

    let normalizedEnvironment = await getEnvironment();

    if (environment !== undefined) {
      if (!isPlainObject(environment)) {
        throw new TypeError(`A resource method must be invoked with an 'environment' argument of type Resource, plain object or undefined (${formatString(typeof environment)} received)`);
      }
      normalizedEnvironment = await normalizedEnvironment.$extend(environment);
    }

    return normalizedEnvironment;
  }

  _getImplementation(parent) {
    const expression = this.$runExpression;
    if (expression) {
      const methodResource = this;
      return function (input) {
        return methodResource._run(expression, input, {parent: this});
      };
    }

    if (this.$getIsNative()) {
      return parent[this.$getKey()];
    }

    let implementation;
    parent.$forSelfAndEachBase(
      resource => {
        const proto = resource.constructor.prototype;
        implementation = proto[this.$getKey()];
        if (implementation) {
          return false;
        }
      },
      {deepSearch: true}
    );
    return implementation;
  }

  async _run(expressionProperty, input, {parent} = {}) {
    let result;

    for (const expression of expressionProperty) {
      const parsedExpression = parseExpression(expression);
      result = await this._runParsedExpression(parsedExpression, {parent});
    }

    return result;
  }

  async _runParsedExpression(expression, {parent}) {
    const firstArgument = getPositionalArgument(expression, 0);
    if (
      firstArgument !== undefined &&
      (firstArgument.startsWith('.') || firstArgument.includes('/') || isAbsolute(firstArgument))
    ) {
      // The fist arguments looks like a resource identifier
      parent = await Resource.$load(firstArgument, {
        directory: this.$getCurrentDirectory({throwIfUndefined: false})
      });
      expression = {...expression};
      shiftPositionalArguments(expression);
    }
    return await parent.$invoke(expression);
  }

  async $invoke(expression, {parent} = {}) {
    const fn = this.$getFunction();
    return await fn.call(parent, expression);
  }

  $serialize(options) {
    let definition = super.$serialize(options);

    if (definition === undefined) {
      definition = {};
    }

    const input = this._input;
    if (input !== undefined) {
      definition['@input'] = input.$serialize();
    }

    const runExpression = this._runExpression;
    if (runExpression !== undefined) {
      if (runExpression.length === 1) {
        definition['@run'] = runExpression[0];
      } else if (runExpression.length > 1) {
        definition['@run'] = runExpression;
      }
    }

    const beforeExpression = this._beforeExpression;
    if (beforeExpression !== undefined) {
      if (beforeExpression.length === 1) {
        definition['@before'] = beforeExpression[0];
      } else if (beforeExpression.length > 1) {
        definition['@before'] = beforeExpression;
      }
    }

    const afterExpression = this._afterExpression;
    if (afterExpression !== undefined) {
      if (afterExpression.length === 1) {
        definition['@after'] = afterExpression[0];
      } else if (afterExpression.length > 1) {
        definition['@after'] = afterExpression;
      }
    }

    let listenedEvents = this._listenedEvents;
    if (listenedEvents && listenedEvents.length) {
      if (listenedEvents.length === 1) {
        listenedEvents = listenedEvents[0];
      }
      definition['@listen'] = listenedEvents;
    }

    let unlistenedEvents = this._unlistenedEvents;
    if (unlistenedEvents && unlistenedEvents.length) {
      if (unlistenedEvents.length === 1) {
        unlistenedEvents = unlistenedEvents[0];
      }
      definition['@unlisten'] = unlistenedEvents;
    }

    if (isEmpty(definition)) {
      definition = undefined;
    }

    return definition;
  }
}

let _environment;
async function getEnvironment() {
  if (!_environment) {
    _environment = await EnvironmentResource.$create();
  }
  return _environment;
}

function findArgument(expression, child) {
  const foundKeys = [];
  let value;

  const childKey = child.$getKey();
  const result = findProperty(expression, childKey, child.$aliases);
  if (result) {
    foundKeys.push(result.foundKey);
    value = result.value;
  }

  const position = child.$position;
  if (position !== undefined) {
    const positionalArgumentKey = makePositionalArgumentKey(position);
    if (positionalArgumentKey in expression) {
      foundKeys.push(positionalArgumentKey);
      value = expression[positionalArgumentKey];
    }
  }

  if (child.$isVariadic) {
    let position = child.$position;
    if (position === undefined) {
      throw new Error(`A ${formatCode('@isVariadic')} attribute must be paired with a ${formatCode('@position')} attribute`);
    }
    value = value !== undefined ? [value] : [];
    while (true) {
      position++;
      const positionalArgumentKey = makePositionalArgumentKey(position);
      if (!(positionalArgumentKey in expression)) {
        break;
      }
      foundKeys.push(positionalArgumentKey);
      value.push(expression[positionalArgumentKey]);
    }
    if (!value.length) {
      value = undefined;
    }
  }

  if (child.$isSubInput) {
    const subArgumentsKey = getSubArgumentsKey();
    if (subArgumentsKey in expression) {
      foundKeys.push(subArgumentsKey);
      value = expression[subArgumentsKey];
    }
  }

  return {foundKeys, value};
}

export default MethodResource;
