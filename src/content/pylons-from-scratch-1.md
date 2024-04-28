---
date: 2009-08-23
title: 'Pylons from scratch 1: a barebones app'
tags: python
---

Typically when you start a new application using the Python web framework Pylons, you might use `paster create -t pylons <appname>` to do a little code generation for you and create a conventional directory structure.

But in this series, I'll show you how to build a working Pylons app by hand, from scratch.

Why do this? Two reasons:

1. Going behind the scenes, and building from scratch what code-generation tools would do for you, **helps you learn how Pylons works**.

2. You will also find out how to **wrap an existing, non-Pylons WSGI application** so that it can be deployed using `paster` and the same INI configuration files as Pylons applications, potentially easing legacy integration with Pylons apps.

If you do not already have Pylons installed, please `easy_install Pylons==0.9.7`. Or, use the `virtualenv` instructions in the [Pylons installation documentation](http://pylonshq.com/docs/en/0.9.7/gettingstarted/#installing).

## Starting out

First of all, we'll be using setuptools and creating a package structure. Pylons, and particularly the Paste Deploy component, is really set up to work with apps that are packaged as eggs, which requires setuptools and a `setup.py`. So start by creating a few directories and (empty) files, in a structure looking like this:

```text
barebones
|-- barebones
|   |-- __init__.py
|   `-- app.py
|-- development.ini
`-- setup.py

```

Next, let's make an application. This is going to look almost exactly like a "hello, world" WSGI application, but with an extra function. For reference, a basic WSGI application would look like this:

```python
def app(environ, start_response):
    start_response('200 OK', [('Content-Type', 'text/plain')])
    return ['Hello, world']

```

If you're unfamiliar with the functions or concepts used here, read the `WSGI wiki`\_ to understand the spec, `environ`, `start_response`, and returning iterators.

.. \_WSGI wiki: http://wsgi.org/wsgi/

Now, the approach we need to use in order to work with Paste's configuration and deployment system is a "factory," a function that creates a WSGI application. So our `app.py` will actually start out looking like this:

```python
def make_app(global_conf, **app_conf):
    def app(environ, start_response):
        start_response('200 OK', [('Content-Type', 'text/plain')])
        return ['Hello, ', app_conf.get('foo', 'world')]
    return app

```

This is merely a function that takes configuration parameters and returns the WSGI app, which is the same as the one above it except for the use of a setting from `app_conf`.

In a standard Pylons app structure created by `paster create`, this `make_app` function would be in `config/middleware.py` instead. That's an appropriate name, since a lot of middleware is applied in it, but it's also not immediately obvious that it contains the main application factory.

Speaking of configuration, this is the barebones configuration file we'll be using:

```ini
[DEFAULT]
debug = true

[server:main]
use = egg:Paste#http
host = 127.0.0.1
port = 8000

[app:main]
use = egg:barebones

```

It's rather spartan, isn't it? This configuration file is missing a lot of the sections a real Pylons app has, mostly to do with logging, which we can add later. It also does not configure components that we're not actually using yet, like SQLAlchemy and Beaker. This minimal configuration is plenty to satisfy the requirements of `paster serve` and get our application running and serving on `localhost:8000`. Not yet, however. We still need to use setuptools to create an egg for our application with the proper entry point.

By the way, the `global_conf` argument to `make_app` above will be drawn from the `DEFAULT` section, while the keyword arguments present in `app_conf` will be drawn from the `app:main` section.

## Explanation of setup and entry points

The `setup.py` file is what makes your package distributable as an egg, which is what allows `paster serve` to serve your app.

Below is the barebones `setup.py` file. Stock Pylons apps also include a script that automatically installs `setuptools` if it's not found, which I have left out, along with some i18n-related configuration.

The important part of this file to note for future use and changes is the `entry_points` argument, which (explain)

`zip_safe=False` is also important, as it causes your package not to be made into a compressed archive when installed. Instead, it will be installed as directories and files, which means your templates and static files will be accessible.

```python
from setuptools import setup, find_packages

setup(
    name='barebones',
    version='0.1',
    description='',
    author='',
    author_email='',
    url='',
    install_requires=[
        "Pylons>=0.9.7",
    ],
    setup_requires=["PasteScript>=1.6.3"],
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    paster_plugins=['PasteScript', 'Pylons'],
    entry_points="""
    [paste.app_factory]
    main = barebones.app:make_app
    """,
)


```

## Starting the server

With all three of these files saved, run the following command in the project directory:

```text
python setup.py egg_info

```

This will create a directory named `barebones.egg-info`, which is **required for paster serve to work**. Remember, `development.ini` specifies the main application as using `egg:barebones`. It won't work if your app is not packaged as an egg. The `paster create` utility normally does this for you when you create a new Pylons app, though **you sometimes need to re-run this command if you significantly change the structure of your app**, including adding entry points or renaming the package.

Now, at last, you can start your application:

```text
paster serve --reload development.ini

```

If all goes well, you now have a HTTP server running on `localhost:8000` that you can visit in your web browser to see the message `Hello, world`.

## Configuration and next steps

Now, to make sure the configuration file works properly, add the following line to the end, in the `[app:main]` section:

```ini
foo = Pylons

```

If you have left `paster` running while you did this, you should see in its output a message to the effect that it reloaded the app when you saved the new `development.ini` file. This reloading feature is extremely useful for rapid development. **Changes to Python source files in your app and the main INI configuration file will result in a reload, while changes to secondary INI files, templates, and static files will not. Syntax and import errors will cause the server to terminate.**

Visit `localhost:8000` again, and you should see the message `Hello, Pylons`.

## Are we there yet?

**Is this a Pylons app? Not yet.** Pylons is a collection of libraries and tools, one of which is Paste, which we are using. But this app includes very little of what makes Pylons what it is, including the special way it handles controllers and pseudo-global, context-specific variables. Still, it's a start, and **this provides you with a way to create any WSGI application you want in a way that can be configured using INI files and deployed with Paste.**

What's more important is that this is a way for you to **easily package existing WSGI applications** so that they can be served up alongside your Pylons applications, using most of the same configuration and deployment. You'll just need to create a `setup.py` that resembles the one above, create an app factory that returns your WSGI application, and set up your INI file and egg_info.

Using this method, **I successfully converted three existing web sites, which used a mostly homebrew WSGI-based system, to using Paste Deploy** and running alongside my Pylons apps. I then started to convert them into actual Pylons apps at my leisure, knowing that at least I had eliminated extra deployment steps and could manage everything in a consistent way.

So that's the basic setup in a nutshell. In the rest of this series, we'll add the Pylons environment, controllers, Routes, Mako templates, logging, and SQLAlchemy.
