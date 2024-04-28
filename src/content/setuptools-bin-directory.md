---
title: Get the bin directory from setuptools in code
date: 2014-07-28
tags: python
---

Python packages can include executable scripts that will be stuck into an appropriate directory when the package is installed (e.g. through `pip`). Sometimes you want to know what that directory is so you can find those scripts. The code for locating this directory is hidden in some large functions in `setuptools` that access various configuration.

In order to find the script path, we can use a custom `install` command and a "fake" distribution. This will put `setuptools` through its paces and make it determine the appropriate directory, without having to dig into its insides too much.

```python
from setuptools import Distribution
from setuptools.command.install import install


class OnlyGetScriptPath(install):
    def run(self):
        self.distribution.install_scripts = self.install_scripts


def get_setuptools_script_dir():
    " Get the directory setuptools installs scripts to for current python "
    dist = Distribution({'cmdclass': {'install': OnlyGetScriptPath}})
    dist.dry_run = True  # not sure if necessary
    dist.parse_config_files()
    command = dist.get_command_obj('install')
    command.ensure_finalized()
    command.run()
    return dist.install_scripts

```

There's an outside possibility that the script directory could somehow change between the installation of a package and your running this code, but it's unlikely. Note, however, that this does depend on being run with the specific `python` version you want to find the bin directory for. If you want to find the directory for a different `python`, you'll probably need to run this through a subprocess.
