### Value resources

A value resource is a particular kind of resource that can hold a value of a specific type.

To create a value resource, use the `@type` attribute:

```js
{
  "name": {
    "@type": "string" // name is an undefined "string" value resource
  }
}
```

When an actual value (or a default value) is specified, you don't need to indicate the type. It can be inferred from the value:

```js
{
  "name": "Bob", // => "string"
  "age": 25, // => "number"
  "isNice": true // => "boolean"
}
```

For now, the supported types are: `"boolean"`, `"number"`, `"string"`, `"array"`, `"object"` and `"binary"`. More types will come in the future (e.g., `"date"`).

#### Value resource attributes

##### @value

The `@value` attribute allows to specify the value of a value resource.

Example:

```js
{
  "name": {
    "@value": "Bob"
  }
}
```

Most of the time, you don't use the `@value` attribute explicitly. It is much easier to specify an actual value directly:

```js
{
  "name": "Bob"
}
```

##### @default

Just like `@value`, the `@default` attribute gives a value to a value resource, with the bonus that it will be displayed in the auto-generated help.

Example:

```js
{
  "isNice": {
    "@default": true // This default value will appear in the help
  }
}
```
