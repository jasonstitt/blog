---
title: Install cx_Oracle on OS X
date: 2015-07-01
tags: python
---

[`cx_Oracle`](http://cx-oracle.sourceforge.net/) is a Python client library for Oracle databases. It can be used to run raw SQL statements directly, or as a [connector for SQLAlchemy](http://docs.sqlalchemy.org/en/latest/dialects/oracle.html).

In order to build `cx_Oracle`, you need Oracle client libraries. That's where I ran into a bit of a challenge. Turns out that on OS X, there are a few extra steps to making this work.

## Download an Oracle client

First, download an [Instant Client](http://www.oracle.com/technetwork/topics/intel-macsoft-096467.html) distribution from Oracle. Read the license yourself, but generally it's fine for your own development purposes. You'll need to create account.

Unzip the distribution into a location of your choice. Mine went into `~/Applications/oracle/instantclient_11_2` and I will be referring to this path from now on. Adjust as necessary.

In addition to the "basic" package, you'll also need the SDK for the header files. After unzipping the download, move the `sdk` directory into the `instantclient_11_2` directory.

## Update your environment

In order to both install and import `cx_Oracle` you will need to set the `ORACLE_HOME` and `DYLD_LIBRARY_PATH` environment variables. You can set them e.g. in `.bash_profile`.

    export ORACLE_HOME="$HOME/Applications/oracle/instantclient_11_2"
    export DYLD_LIBRARY_PATH="$ORACLE_HOME:$DYLD_LIBRARY_PATH"

You might get some complaints from e.g. `homebrew doctor` about setting `DYLD_LIBRARY_PATH`, but it's necessary for `cx_Oracle` to find its libraries. If you prefer, you could set the environment variables when invoking a script that uses `cx_Oracle` (and for the installation).

## Alias the dylib

After wrangling with `cx_Oracle` for a while, I found out that, in addition to the environment being set up correctly, you also need to have a symlink to one of the dylibs so that the linker can actually find it. Assuming your `ORACLE_PATH` is set properly, you can use the following command:

    ln -s "$ORACLE_HOME"/libclntsh.dylib.* "$ORACLE_HOME"/libclntsh.dylib

This only needs to be done once per Instant Client download.

## Cross fingers

You should now be able to `pip install cx_Oracle`. Remember that `DYLD_LIBRARY_PATH` still needs to be set in order to `import` the library; it's not enough to set it for the build/install step.

The Instant Client downloads are for a single architecture (32 or 64 bit). If `pip` for some reason tries to build for both architectures, you may run into some trouble and need to set the `ARCHFLAGS` environment variable explicitly, like this (for 64-bit):

    ARCHFLAGS="-arch x86_64" pip install cx_Oracle
