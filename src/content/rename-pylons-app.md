---
date: 2009-08-18
title: Rename your Pylons app without going mad
tags: python
---

Eventually, it happens: You realize that the name you gave your Pylons app conflicts with another package, or just needs to be changed. Unfortunately, you've now got a bunch of references to the old name to change. Not only that, but they come in different contexts: import statements, expressions, configuration, strings, etc.

Here's how to rename that Pylons app.

First, and perhaps, most important, **delete** the `dist`, `build`, and any `.egg-info` directories in your project directory.

If you leave these directories laying around, they can hold old information that references the previous name of your project, which will cause problems whether you are running your app from the project directory or installing it. Running `python setup.py clean` will not necessarily fix this problem, so delete the directories.

Next, you need to start replacing references to your project in code and configuration files. But you can't simply do a global search-and-replace, because your project name might be used in multiple contexts; for example, maybe you named your project `foo` because it would be running on `foo.com`, and now you want it to be named `foo_site` to avoid a naming conflict. But a global search-and-replace could end up replacing `foo.com` with `foo_site.com` in your templates.

Instead, try doing global search-and-replace on `from foo` and `import foo`.

Of course, you'll also need to change any references to `foo` in your own code. But here's a list of places in a stock Pylons app, created by `paster create -t pylons`, where your app name appears, **other than import statements**:

- Config file (e.g. `development.ini`, `foo/config/deployment.ini_tmpl`): `use` under `[app:main]`, `keys` under `[loggers]`, and the `[logger_foo]` section.

- `foo/config/environment.py`: `config.init_app` call, `config['pylons.h']` assignment.

- `MANIFEST.in`

- `setup.py`: `name`, `package_data`, and `entry_points` arguments.

- Documentation.

Finally, change the project directory name and module directory name, which are usually identical. In other words, if this is your project directory layout, you'll want to change both `foo` directory names:

```text
foo
|-- foo
|   |-- __init__.py
|   |-- config
|   |-- controllers
|   |-- ...
|   `-- websetup.py
|-- development.ini
`-- setup.py

```

Once you're pretty sure you've changed all references to `foo`, run `python setup.py egg_info` to regenerate the `.egg-info` directory you deleted earlier.

Also check your system's `site-packages` directory or other directories on your Python path, to make sure there is not still an installed version of the package with the previous name.

Now you're ready to test. If all goes well, your app should run under its new name. If you see any `ImportError` exceptions or other unexpected errors, you missed one.

Finally, run `python setup.py install` (unless you have a reason not to want your app in `site-packages`) to make sure the packaging works.

Done.
