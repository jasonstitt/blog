---
date: 2011-03-15
title: Add bound methods to instantiated objects in Python
tags: python
---

In Python, as in other dynamic languages, you can add new methods to a class after it's been defined. You can define a function just as you would inside the class body, then assign that function to an attribute of the class:

```python
class C:
    pass # No methods... yet

def foo(self):
    print(self)

C.foo = foo

```

This will result in `foo` being added to the class as if it had been inside the `class` block.

Upon access, in Python 2, it will be wrapped in an `unbound method` object, while in Python 3 it will just be a function. The difference is more than an implementation detail: in Python 3 you can call `C.foo(2)` and it will print `2`, whereas in Python 2 you'll get an exception if the first argument is not a `C` instance.

When you create an instance of `C` and get its `foo` property, what you'll get back is a _bound method_, which is another wrapper object. This means that you can't just add a function to an instance of a class and expect it to work properly.

```python
instance = C()

def bar(self):
    print(self)

instance.bar = bar
instance.bar()  # error, `self` is not passed in
```

Instead, you need to first convert the function into a bound method of the object yourself.

```python
instance.bar = bar.__get__(instance, instance.__class__)

```
