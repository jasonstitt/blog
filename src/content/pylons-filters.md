---
date: 2009-08-20
title: 'Create Pylons filters: middleware the configurable way'
tags: python
---

If you're familiar with the use of WSGI middleware in Python web applications, you know that it's a potentially powerful way to modify both requests and responses without changing any code in the WSGI application wrapped by the middleware. But without something like the "filters" of Paste Deploy, used by Pylons and discussed here, the middleware must itself be instantiated in code.

**This article will show you how to package a WSGI middleware component so it can be added to your application using only configuration and no code, assuming you are using Pylons (or at least Paste Deploy).**

Here's a simple piece of WSGI middleware that adds a value to the WSGI environment. It's about as simple as middleware gets.

```python
class AddValue(object):
    def __init__(self, app, key, value):
        self.app = app
        self.key = key
        self.value = value

    def __call__(self, environ, start_response):
        environ = dict(environ)
        environ[self.key] = self.value
        return self.app(environ, start_response)

```

To use this middleware class as it is, we would have to instantiate it in code. For example, if `app` is an existing WSGI application, we could write `app = AddValue(app, 'foo', 4)`. Then, for the wrapped application, `environ['foo']` would equal 4.

## Creating the filter

Converting this middleware into a filter will allow it to be applied using configuration only, with no code changes. Filters are added to Pylons applications in the INI configuration file, and are themselves configurable. The downside is that **middleware applied in this way can only be applied to the "outside" of an application**, not in between other middleware in its internal stack.

Creating a filter is not hard at all, but can look confusing at first because there are three layers:

1. The middleware component itself (The `AddValue` class, defined above, which will remain unchanged)

2. The filter function, which takes a WSGI application as an argument and returns a WSGI application that has had the middleware applied

3. The filter factory function, which takes configuration as its arguments and returns the filter function.

**What you need to deploy a filter in practice is a filter factory function, in a package deployed as an egg, with extra lines in the package's `setup.py` to make it usable from a configuration file.**

Here's a filter factory that applies our `AddValue` middleware class:

```python
def addvalue_filter_factory(global_conf, key, value):
    def filter(app):
        return AddValue(app, key, value)
    return filter

```

The `key` and `value` arguments here come from the INI configuration file. Since they are specified as arguments individually, they are required. To make them optional, we would rephrase the code like this:

```python
def addvalue_filter_factory(global_conf, **app_conf):
    def filter(app):
        return AddValue(app,
            app_conf.get('key', 'default'),
            app_conf.get('value', 'defaultvalue'))
    return filter

```

## Deployment

The `addvalue_filter_factory` function is not meant to be used directly. Instead, it should be part of a package deployed as an egg using `setuptools`, and the following should be placed in the `setup.py`:

```python
setup(
    # ...
    entry_points="""
    [paste.filter_factory]
    addvalue = modulename:addvalue_filter_factory
    """
    # ...
    )

```

This sets up an entry point named `addvalue` that points to the function. Note that the punctuation between the module name and the function name is a colon, not a dot.

Assuming this package is built as an egg and available on the Python path, the filter can now be used by adding something like this to the INI file for the Pylons application:

```ini
[app:main]
## ...
filter-with = myvalue

[filter:myvalue]
use = egg:modulename#addvalue
key = foo
value = 4

```

## Conclusion

It seems like more work up front to create a filter rather than just a plain middleware component. For many types of middleware, however, the ability to easily drop in a component using configuration and no code is valuable. It can ease deployment, and makes the conditional application of middleware for different configurations easier.

An example of a useful filter might be an authorization filter. Although it's generally more powerful to build authorization into an app, authorization could be added on top of an app that doesn't have any using a filter that assigns certain required roles to any part of the app under certain paths. The configuration might look something like this:

```ini
[filter:auth]
use = egg:myauth#rolebased
/admin = admin
/edit = writer,editor

```

Implementation is left as an exercise for the reader!
