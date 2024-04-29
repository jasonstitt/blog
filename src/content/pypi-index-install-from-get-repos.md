---
title: A PyPI-style index on top of tagged Git repositories
date: 2015-07-03
tags: python
---

The [Python Package Index](https://pypi.python.org/) or PyPI is fantastic for publicly available libraries and frameworks. But there isn't as obvious of a single solution for managing private package dependencies within an organization.

You can install from Git repositories, which requires copying long, cumbersome URIs all over the place. Or you can push a bunch of zip files for deployment, but that isn't nearly as convenient for development and prototyping.

You can also run a private PyPI-style package server such as [`devpi`](http://doc.devpi.net/latest/) or [`pyshop`](https://pypi.python.org/pypi/pyshop). But running a full PyPI-style server adds additional processes for you or your team. There's user management to take care of (depending on your setup, look into [`devpi-ldap`](https://github.com/devpi/devpi-ldap), and there is apparently some LDAP support in `pyshop`.) There's the additional step of uploading each new package version, and the possibility that changes will get pushed to Git but not put into the package index.

An alternative approach is to create a PyPI style index, but not a full server. The index only needs to point package names and version numbers to the correct location to download the package, which could be an existing hosted Git repo or other server.

In other words, instead of this:

```
pip install git+https://github.com/user/repo@1.0.0#egg=package-1.0.0
```

We want to be able to do this:

```
pip install package==1.0.0
```

But the package will still be downloaded and installed from the tag in the repository.

## The index format

A barebones index is extremely simple. It needs an index view that lists packages, and a package view that lists versions. If you go to https://pypi.python.org/simple/ you can see how little is actually required, and even some of what's there (like titles) is for human consumption.

The index view should contain a link to each package's page.

```html
<a href="packagename/">packagename</a>
```

The package view should contain links to the actual download for each available version, with a version string in the package name. These links take this form:

```html
<a href="/link/to/package-1.0.0.tar.gz">package-1.0.0</a>
```

The link does not have to be to a file. It can also be a Git repository URI, which is going to look something like this:

```html
<a href="git+https://github.com/user/repo@1.0.0#egg=package-1.0.0">package-1.0.0</a>
```

Note that I'm making a distinction here between repo and package name. There is no requirement for the name of the Git repository to be the same as the name of the Python package. For example, the repo could be called `pylibrary` and the package just `library`.

## Using the index

There are several ways to install packages from a custom PyPI-style index.

You can give `pip install` the `--index-url` option to change its index from PyPI to your custom one, or `--extra-index-url` to use your custom one in addition to PyPI.

To save repetition, it's also worth considering just setting the `PIP_EXTRA_INDEX_URL` environment variable to the URL of your custom index. This will add the argument to each invocation of `pip`.

In a `requirements.txt` file, you can add a line at the top, e.g. `--extra-index-url http://example.com`, to bring in your custom index.

## Generating the index

The process for generating the index will differ based on whether you want to do so with a dynamic web application or a script, and based on where your packages actually exist.

You can get lists of tags in a repo, without cloning it, from the [GitHub API](https://developer.github.com/v3/git/tags/) and the [GitLab API](http://doc.gitlab.com/ce/api/repositories.html#list-project-repository-tags), which could be used to generate the package view.

Assuming you use semantic versioning and put the version in release tags, generating the package view in the index is then just a matter of going through the tags and generating links formatted as in the above snippets. Many people prepend `v` to the versions in their tags, e.g. using `v1.0.0` instead of `1.0.0`, so you may want to strip that.

You also have to decide whether you're only supporting release tags on `master`, or also want to support development or release-candidate versions.

Once all of this is set up, however, you have a system that lets you use not only use `pip install` in a normal way, but also indicate dependencies in `setup.py` without hardcoding your Git repo URIs. This can help encourage the use of more internal packages (meaning, more encapsulation and code reuse) while normalizing your package definitions.
