### Sharing a resource

Creating some resources is good, but sharing them is even better. Whether publicly to the developer community or privately to your colleagues, resources benefit from sharing.

To do this, Run can use a resource registry. The first to be developed is [Resdir](${RESDIR_WEBSITE_URL}), which was created by the same [guy](https://mvila.me) who initiated Run. Although it is still in an early stage of development, you might be quite happy to use it.

#### Signing up

The easiest way to access the default registry is to use the built-in command `@registry`:

```shell
run @registry
```

It should be displayed the in-line help. To sign up, just do the following:

```shell
run @registry signUp
```

After verifying your email address, you will be asked to choose a namespace. This choice is important because most of your published resources will reside in this namespace. For example, if your namespace is `"aturing"`, you will be able to publish a resource using `"aturing/nice-tool"` as the identifier. Later on, you will have the possibility to create namespaces for organizations and communities, but this is another topic.

#### Publishing a resource

Now that you're registered, let's publish the first resource you created at the beginning of this introduction – the legendary ["Hello, World!"](/docs/introduction/getting-started).

First, you must `@import` Resdir's base resource:

```json
{
  "@import": "resdir/resource#^0.1.0"
}
```

In the resource specifier `"resdir/resource#^0.1.0"`, there are a resource identifier (`"resdir/resource"`) and a version range (`"^0.1.0"`). Don't worry too much about the version range for the moment; just remember that it is good practice to always specify it. This ensures that your resource will keep working if there are breaking changes in the resources you rely on.

Now that your resource is inheriting from `"resdir/resource"`, you can check the in-line help to discover what possibilities are available to you. To do so, just invoke Run without any commands:

```shell
run .
```

You can see all of the available attributes, and among them, there are two that are mandatory: `id` and `version`. So let's add them:

```json
{
  "@import": "resdir/resource^0.1.0",
  "id": "aturing/nice-tool",
  "version": "1.0.0"
}
```

Finally, complete your resource by writing the actual "implementation":

```json
{
  "@import": "resdir/resource^0.1.0",
  "id": "aturing/nice-tool",
  "version": "1.0.0",
  "hello": {
    "@type": "method",
    "@run": "@console print 'Hello, World!'"
  }
}
```

Your resource is ready to be published. So let's go:

```shell
run . publish
```

Voila! Your resource is now stored in the resource registry. To consume it, just reference it by its identifier. You can `@load` or `@import` it from another resource, or simply invoke it from the CLI:

```shell
run aturing/nice-tool hello
```

There is one last word. By default, the resources you publish are private, so only you have access to them. To make a resource publicly available, set its `isPublic` attribute to `true`.
