### Run CLI

Using Run's command line interface is easy, just invoke `run` followed by an [expression](/docs/reference/expressions).

Examples:

```
run @console print 'Hi there!'
```

```
run . database restore --timestamp=1519032678
```

```
run . \(getUser 123\) sendMessage 'Konnichiwa!'
```

#### Options

For now, the Run CLI has only one option.

##### --@print

The `--@print` option is a convenient way to print the output of an expression.

It is possible to achieve the same thing using the `@print` built-in method, but in some cases, it is more convenient to use the `--@print` option.

For example, to print the output of a method, it might be possible to do:

```
run . (getUser 123) @print
```

Unfortunately, the shell interprets the parentheses for its use, so it is necessary to escape them:

```
run . \(getUser 123\) @print
```

In this case, it is probably easier to use the `--@print` option:

```
run . getUser 123 --@print
```
