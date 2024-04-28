---
date: 2009-02-15
title: Install Python Imaging Library (PIL) on Intel Mac
tags: python
---

Recently I found the [Python Imaging Library](http://www.pythonware.com/products/pil/) (PIL) would not install properly on my Intel Mac. The error message when trying to install PIL was:

```text
ld: in /Developer/SDKs/MacOSX10.4u.sdk/usr/local/lib/libxml2.2.dylib,
file is not of required architecture for architecture ppc

```

It turned out that `gcc` was being called as `gcc -arch ppc -arch i386`, which is used to build a universal binary on OS X. Since the installed `libxml2` was Intel-only, and `setuptools` did not detect this, the PIL installation failed.

Force `gcc` to build only an Intel binary when you install PIL, rather than a universal binary, by setting an environment variable:

```text
sudo env ARCHFLAGS="-arch i386" python setup.py install

```

Since universal binaries are not needed on Intel Macs unless you are preparing them for distribution, this lets you install PIL normally.
