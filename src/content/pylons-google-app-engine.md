---
date: 2009-10-11
title: Pylons apps on Google App Engine
tags: python
---

This will show you how to get a Pylons web app running on Google App Engine (GAE) in about 15 minutes, assuming you already have your GAE account and a familiarity with Pylons and `virtualenv`.

(Otherwise, start out with the [Google App Engine](http://code.google.com/appengine/docs/whatisgoogleappengine.html) docs and the [Pylons](http://pylonshq.com) docs).

The approach described here is focused on using as "normal" a process as possible for creating a Pylons app, with minimal modifications for GAE. It uses a stock `virtualenv`, and a stock `paster create` template, instead of an entirely different setup just for GAE. Several manual edits are required (but fewer now!)

This means that you could use an existing app or an existing virtualenv, with a few modifications. This is up to you, as I don't know what your exact setup looks like, but most of the steps below should apply.

## Getting started

To begin, run the following commands in an appropriate directory, replacing $MYPROJ and $MYAPP with whatever values you like (they can be the same, though if they are the directory structure can end up slightly confusing. `paster create` will make two directories named $MYAPP as it is.)

```text
virtualenv --python=python2.5 --no-site-packages --unzip-setuptools $MYPROJ
cd $MYPROJ
pip install -U -E . pylons
touch ./lib/python2.5/site-packages/paste/__init__.py
rm -f ./lib/python2.5/site-packages/simplejson*/_speedups*
./bin/paster create -t pylons $MYAPP template_engine=mako sqlalchemy=False

```

You'll then need to create `app.yaml` and `app.py` in the current directory. Replace `$REGNAME` with the name of your application as registered with Google. For example, if your hosted URL is myapp.appspot.com, the registered name is myapp. And don't forget to replace `$MYAPP` in `app.py` with whatever you gave to `paster create`.

_`app.yaml`:_

```yaml
application: $REGNAME
version: 1
runtime: python
api_version: 1

handlers:
  - url: /.*
    script: app.py

skip_files: |
  ^(.*/)?(
  (bin/.*)|
  (include/.*)|
  (.*/docs/.*)|
  (.*/(ez_)?setup.py)|
  (.*/(MANIFEST.in|README.txt|setup.cfg))|
  (lib/python2\.\d/[^/]*\.py)|
  (lib/python2\.\d/(lib-dynload|config|distutils|encodings)/.*)|
  (.*\.pth)|
  (app\.yaml)|
  (app\.yml)|
  (index\.yaml)|
  (index\.yml)|
  (#.*#)|
  (.*~)|
  (.*\.py[co])|
  (.*/RCS/.*)|
  (\..*)|
  )$
```

_`app.py`:_

```python
import sys
import os

## Change to the directory name of your app (what you gave to paster create)
appdir = '$MYAPP'

## Change the version number if necessary
libdir = "lib/python2.5/site-packages"

## If you used pip, you can shorten this to [appdir, libdir]
## The rest is necessary if you used easy_install
sys.path = [appdir, libdir] + ['%s/%s' % (libdir, n) for n in os.listdir(libdir) if n.endswith('.egg')] + sys.path

## Workaround for latest setuptools importing mkdir
os.mkdir = lambda *x:None

from paste.deploy import loadapp
from google.appengine.ext.webapp.util import run_wsgi_app

## To switch between development and deployment versions,
## edit this line or have multiple versions of this file
run_wsgi_app(loadapp('config:development.ini', relative_to=appdir))

```

Finally, in your Pylons app's `environment.py`, comment out or delete the line beginning `module_directory=` in the instantiation of `TemplateLookup`. GAE does not have a writable filesystem, so Mako's file-based template caching will not work on it. If you are using a different template system, you'll have to figure out what is required to stop it from trying to write any files.

## Python versions other than 2.5

GAE runs Python 2.5. As long as your code runs on 2.5, you can use whatever (2.x) version of Python you want locally. You'll need to change all instances of `python2.5` in the script above, and also edit the value of `libdir` in `app.py`.

## Running locally

You can run your app locally in a GAE environment using the `Google App Engine SDK/Launcher <http://code.google.com/appengine/downloads.html>`\_. It's fairly simple, and documentation is available and beyond the scope of this article, but here are a few tips:

- In the GUI version of the SDK/Launcher, be sure to use `File->Add Existing Application` rather than `File->New Application`. The path to use is the _directory_ that contains `app.yaml` and `app.py` (i.e. $MYPROJ).

- Using the command-line version, `dev_appserver.py`, _don't_ run it from within the `virtualenv`; it won't be able to find the Google libraries.

- The SDK/Launcher has a primitive (compared to `paster serve`) reloading capability. In order to force an "automatic" reload while your app is running, you'll need to edit (or `touch`) `app.py`.

## Deploying

There are two ways to deploy your application: the Google App Engine SDK/Launcher application, or the `appcfg.py` command-line script.

The SDK/Launcher application gives you a nice push-button GUI, while `appcfg.py` is more flexible with various options such as verbose mode (`-v`), which prints a list of which files are being uploaded, and which are being skipped.

## File count

When I deployed a barebones Pylons app in this way, with the included `skip_list`, the file count came out to 821 using `pip` and 814 using `easy_install`, both, well under the 3,000-file limit. Your "base" file count will probably vary slightly as new library versions come out.

If you are using `easy_install` (but apparently _not_ if you are using `pip`), you can reduce the file count by excluding EGG-INFO directories from being uploaded. This will _probably_ not break anything (but see below), unless part of your code depends on entry points of modules other than your app. You'll need to add a line to the middle of the `skip_list` regex in your `app.yaml`, as follows:

    (.*/site-packages/.*\.egg/EGG-INFO/.*)|

For me, this reduced the "base" file count to 691, a savings of about 120 files. Unfortunately, excluding `.egg-info` directories when using `pip` breaks the setup.

If you do this, you must also add `template_engine=None` as a keyword argument to the `config.init_app` function call in your Pylons app's `environment.py`. Otherwise, some legacy code in Pylons (supporting the outdated Buffet template system) will break because it can't find some egg info.

## Notes on workarounds, for the curious

- GAE does not appear to use `.pth` files, which are files that are placed on the Python path and contain additions to the path. This is why `sys.path` must be set up in `app.py`. Also, `easy_install` uses its `easy_install.pth` file to make sure only the latest installed version of each package is on the path. This is why you have to manually delete duplicate packages using this GAE method.

- The provided `app.py` has a rather odd line: `os.mkdir = lambda *x:None`. The latest version of `setuptools` (as of 0.6c11) attempts to import `mkdir` from `os`, and `mkdir` does not exist on GAE. This monkey-patch allows `setuptools` to be imported.

- The provided `app.yaml` has a `skip_list` that prevents files that are part of the `virtualenv` but useless on GAE, such as binary shared objects, from being uploaded.

- The "speedups" part of `simplejson` (`_speedups.py` and `_speedups.so`) uses a C extension, which is not supported by GAE. But the package is set up so that it will still work if these files are missing.

- Paste uses a wonky system to allow separate packages (Paste, Paste Deploy, Paste Script) to inhabit the same `paste` namespace. When installed using `pip`, this system is dependent on several `.pth` files, which don't work on GAE. But sticking an `__init__.py` in makes it work normally.

## Conclusion

At this point, you should be up and running and see the Pylons welcome page when you visit your local server run by the SDK. There are still more steps to a real GAE app, of course, such as familiarizing yourself with Google's datastore models.

I can't provide "support" on any of this, _per se_, but if the steps here don't work for you, please e-mail me and I'll try to correct or amend the article.
