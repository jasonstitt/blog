---
title: Import a cat picture as a Python module
date: 2021-12-24
tags: python
---

Although Python is known for being a "batteries included" language with rich capabilities, one of Python's weaknesses is its inability to import cat pictures. Fortunately, Python exposes enough of its machinery that we can customize the import process and solve this glaring issue.

First, we'll need to place executable Python code into our cat picture. Then, we'll need a custom importer that can first find our image, then extract the code from it and run it.

## Hide a module in a cat

[Steganography](https://en.wikipedia.org/wiki/Steganography) hides data in an unrelated file, such as an image. Typically it does this by piggy-backing the hidden data into less-significant bits of the image in a way that isn't perceptible to the human eye, because the color variation is so slight and just seems like a tiny amount of noise. The data to be hidden in this case is the text of our Python module.

Various steganography libraries exist for Python. For this example I've picked up [`stegano`](https://pypi.org/project/stegano/), which is a pure-Python implementation with a simple interface and no dependency on a separate imaging library. This particular library doesn't work on JPEGs, so we're going to pick up a unique cat picture from [This Cat Does Not Exist](https://thiscatdoesnotexist.com/) and re-save it as `cat-original.png`.

Let's save some code in this image:

```py
import stegano

code = """\
def meow():
    print("meow wrrrld")
"""

stegano.lsb.hide('./cat-original.png', code).save('./cat.png')
```

There's now a `cat.png` which contains the code for our module. Ideally, we could `import cat` and have it find this file. To do that, we're going to have to write a custom extension to Python's import implementation.

## Customize the import machinery

Python exposes the process for importing modules in the [`importlib`](https://docs.python.org/3/library/importlib.html) package in the standard library. One of the things you can do with this module is create a custom importer which can find a module in a different way than the standard importer, or even create a module from nothing.

There are two main callbacks we need to create: one to locate the module and create a spec for it, and one to execute the module's code to set it up. We'll start with creating the module spec, which looks like this:

```python
import sys
from importlib.machinery import ModuleSpec
from pathlib import Path
from itertools import product
import stegano

EXT_SUPPORTED = ['png']


class ImageFinder:
    @staticmethod
    def find_spec(fullname, paths, target=None):
        module_name = fullname.rsplit('.', 1)[-1]
        search_filenames = (module_name + '.' + ext for ext in EXT_SUPPORTED)
        search_dirs = (pathobj for x in (paths or sys.path) if (pathobj := Path(x)).is_dir())
        for search_dir, filename in product(search_dirs, search_filenames):
            check_path = search_dir / filename
            if check_path.is_file():
                return ModuleSpec(fullname, ImageLoader, origin=str(check_path))


sys.meta_path.append(ImageFinder)
```

This implementation fits an interface defined by the `importlib` module. The `find_spec()` method is a callback that will be invoked to try to find a module to import. The parameters are:

- `fullname` - the qualified module name, including dot separators, such as `mypackage.mymodule` or just `mypackage`. In this case we're only interested in the final module name, since we're going to use `paths` to narrow where we look for it in the case of a submodule.
- `paths` - a list of absolute filesystem paths to check, which may or may not be directories (e.g. they could be compressed archives, which we're ignoring here — zip cats are an exercise for the reader). In the case of a submodule it should already be narrowed to the right directory.
- `target` - might be used in the case of a module reload, but we'll ignore it here.

What we're going to do here is make an iterable of all the possible paths for this module, then return a `ModuleSpec` for the first one we find. A `ModuleSpec` is an interface for the `importlib` module to proceed to the next step, which is loading. We're passing in a custom loader, `ImageLoader`, which is defined next. Assuming an appropriate path is found, the `importlib` machinery will want to use our `ImageLoader` to set up the module. It looks like this:

```python
class ImageLoader:
    @staticmethod
    def create_module(spec):
        return None  # Default module creation

    @staticmethod
    def exec_module(module):
        filename = module.__spec__.origin
        code = stegano.lsb.reveal(filename)
        exec(compile(code, filename, 'exec'), module.__dict__, module.__dict__)
```

This is another callback interface defined by `importlib`. We can potentially customize how the module itself is created and added to `sys.path` - but we don't want to, so we'll return `None` from `create_module()`. This will make `importlib` create an empty module object. The module will also have the right name and file path, which we passed in using the `ModuleSpec` earlier.

The behavior we do want to customize is how we execute the code in the module, which we do with the `exec_module()` callback. Here it helps to know a bit about how dynamic code evaluation works in Python.

## Execution and scopes

`exec()` dynamically evaluates Python code inside the currently running process. Without any optional arguments, it does so in the current scope - almost as if the code were put in place of the `exec` call itself. For example:

```python
exec('x = 1')
print(x)
```

The name `x` will be available in the current local scope. Furthermore, the executed code will have access to the current scope:

```python
y = 2
exec('print(y)')
```

However, this is only the default. We can pass in any global and local scope we like, and these scopes are just plain dictionaries. The `globals` and `locals` builtins represent the current scope on a given line. Call `type()` on either one to see that they're an ordinary `dict` type. What's more, the scopes for `exec` don't have to be initialized with anything, meaning we can execute code in an isolated scope:

```python
global_scope, local_scope = {}, {}
code = """\
greeting = 'hello'
def greet(what='world'):
    print(f'{greeting}, {what}')
"""
exec(code, global_scope, local_scope)
```

At this point we have the following dictionaries:

- `list(global_scope.keys())` → `['__builtins__']`
- `list(local_scope.keys())` → `['greeting', 'greet']`

The names defined in our code string have been added to the `local_scope` dict, where we can now use them how we like. Also, `__builtins__` has been injected into the global scope because it wasn't there already (we can actually provide this key to limit access to builtins if we want).

Earlier, in the loader class, we said:

```
exec(compile(code, filename, 'exec'), module.__dict__, module.__dict__)
```

What we're doing here is executing the code in the context of the module. A Python module is an object, not just a namespace, so just like any class object it has a `__dict__` containing its members. So the result of this execution is that the names defined in the module's code end up as members of the module.

`compile()` is optional, but it provides a way to tie the filename to the code for tracebacks. (You know, in case you want to look up a line number in `cat.png`.)

## Running and wrap-up

We should now be able to use our `steg_import` module to import our cat picture. Of course the module that sets up the custom importer has to be imported first.

```python
import steg_import
import cat

cat.meow()
```

Unfortunately, a picture isn't necessarily worth a thousand lines of code. However, this does give you an opportunity to make all those cat pictures functionally useful.
