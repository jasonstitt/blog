---
title: Test a Python project and an associated library with Tox
date: 2015-09-18
tags: python
---

The problem: You want to test a Python project that specifies its dependencies via a [`requirements.txt`](https://pip.pypa.io/en/stable/user_guide/#requirements-files), and one of those dependencies is an unreleased package. And you want to automate the creation of `virtualenv` testing environments, perhaps across different Python versions, so you're using [Tox](https://tox.readthedocs.org/en/latest/). But how does Tox know how to install your dependency?

First of all, let's go over how to get Tox to use your `requirements.txt` at all. The [basic example](https://tox.readthedocs.org/en/latest/) of Tox usage looks like this:

```ini
## content of: tox.ini , put in same dir as setup.py
[tox]
envlist = py26,py27
[testenv]
deps=pytest       # install pytest in the venvs
commands=py.test  # or 'nosetests' or ...
```

The `deps` argument here is a package name, or list of package names. And you can see from the comment that this is meant to be used with a package that has a `setup.py`. Tox will actually call `setup.py sdist` on your package by default -- but if you're using `requirements.txt` it's probably because you're not making a Python package. Let's change this configuration:

```ini
[tox]
envlist=py27,py34
usesdist=false
[testenv]
deps=
    -r{toxinidir}/requirements.txt
    pytest
commands=py.test
```

Besides changing to a more reasonable list of Python versions (did you spot that?) we're also telling Tox not to bother trying to run `setup.py sdist` (as it doesn't exist) and to read our dependencies from `requirements.txt`. See that `deps` argument? It's actually being passed right through to `pip`, so the `-r` syntax is just the `pip` command-line argument.

But there's still a problem. Remember how we have a dependency on an in-development unreleased package? When `pip` tries to read our `requirements.txt`, it's not going to be able to find that and the whole build will fail.

It turns out that Tox has a feature that saves us here, which I didn't know about until very recently. When you test a package with Tox, it saves a zip file of the distribution to the `$HOME/.tox/distshare/` directory. So if you test your dependency first (with Tox), you can then install that distribution as part of your other project's tests, just by referring to its location using the `{distshare}` variable.

It should look something like this...

```ini
deps=
    {distshare}/mylibrary-*.zip
    -r{toxinidir}/requirements.txt
    pytest
```

... but that won't work.

The reason is that `pip` goes ahead and reads your `requirements.txt` before it installs the first package, so it will still fail. In order to fix this, you need to break out two separate runs of `pip`, like this:

```ini
deps=
    {distshare}/mylibrary-*.zip
    pytest
commands=
    pip install -qr{toxinidir}/requirements.txt
    pytest
```

Now, when `pip` runs the second time, your library is already installed, which means the requirement is already satisfied and won't be searched for in the package index.
