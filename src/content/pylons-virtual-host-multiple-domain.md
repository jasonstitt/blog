---
date: 2009-10-17
title: Pylons multiple-domain (virtual hosting) configuration
tags: python
---

The conventional approach to Python web-application frameworks such as Pylons is to run multiple Python processes when multiple apps need to be deployed on the same physical server. This would also often apply to serving up more than one domain.

This works fine, especially if you use a process manager such as [Supervisor to manage the web-app processes](/pylons-supervisor), but in some cases, you may want to pack more than one domain into the same process space, effectively moving your virtual hosts into the Python app configuration. This article will show you how.

## Reasons to run Pylons apps in the same process

- Save lots of memory: In memory-constrained environments such as virtual private servers (VPS), using one process for multiple apps may be a requirement.
- Share: In some cases, you may want multiple apps to be able to share database connections or other resources.

## Reasons not to

- Global state may conflict.
- Specifically, SQLAlchemy models (which have some global state) may conflict.
- A syntax or import error in one app, or another error that triggers on initialization rather than on a page view, will take down the other apps.
- The apps will use the same server thread pool, so fewer threads will be available per site on average.

## Using Paste#urlmap for multiple domains

You've probably seen `Paste#urlmap` used to route different paths on the same domain to different applications. It's the main [example of composite applications in the Paste Deploy documentation](http://pythonpaste.org/deploy/#composite-applications), where it looks something like this:

```ini
[composite:main]
use = egg:Paste#urlmap
/ = mainapp
/files = staticapp

```

But an apparently as-yet undocumented syntax also allows you to run apps on different domains:

```ini
[composite:main]
use = egg:Paste#urlmap
domain example.com / = mainapp
domain files.example.com / = staticapp

```

The syntax is `domain <hostname> <path> = <appname>`; the inclusion of `<path>` means that you can also set up apps on several paths under the same domain.

## Setting `cache_dir`

Whenever you have multiple Pylons applications running from config files that are in the same directory, whether the same file or multiple files, you must be careful to set the `cache_dir` for each application separately.

The default created by `paster` looks like this:

```ini
cache_dir = %(here)s/data

```

`%(here)s` will be filled in with the directory where the configuration file is located. If two applications are configured in the same file, or in files in the same directory, and `cache_dir` is left as-is, their cache directories will overlap. They will overwrite or, worse, share each other's cached data. For example, Mako stores compiled templates in the cache directory, so one application will end up using the other's templates.

To avoid this, always set `cache_dir` to different values for applications whose configuration is in the same directory, using either relative or absolute paths:

```ini
#relative
cache_dir = %(here)s/appname-data

#absolute
cache_dir = /tmp/pylons-cache/appname

```

## Serving an app on more than one path

When you set up the same application on multiple paths or domains using `urlmap`, it will be initialized multiple times. For example:

```ini
[composite:main]
use = egg:Paste#urlmap
domain foo.example.com / = app1
domain example.com /foo = app1

```

This will cause `app1` to be loaded and initialized twice, which will cause problems if, for example, you create any models inside the `init_model()` function. (You'll get an exception because they're being created twice in the same Python process).

It's probably best, in this case, to place the app behind a web server such as Apache or Lighttpd and configure the web server to direct multiple hosts or URLs to the same application.

## Global data

As I mentioned earlier, running multiple Pylons apps in the same process will cause potential conflicts in module-global data.

The `init_model()` conflict mentioned in the previous section is one; SQLAlchemy models are stored globally, and trying to declare the same models more than once can cause errors. In order to facilitate this, you will need a separate piece of code for model creation that checks whether the shared models are already in existence before creating them.

Some builtin Python modules also use global state, including `locale` and `timezone`.

## Alternative to this approach

If your use-case involves a number of very similar sites or apps, with small configuration differences, you could use the approach described above. Or, you could use just one app and handle multiple domains inside the app itself.

For example, if you have a number of small content sites with identical structure, you could use just one app, with different template directories for each site, and a database column that indicates which site each content item belongs to.
