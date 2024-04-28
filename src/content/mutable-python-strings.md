---
title: 'Things not to do: mutable Python strings'
date: 2016-01-17
tags: python
---

There are the things you do because they're effective. There are the things you do because they're secure. And there are the things you do because you can.

One of the basic rules of Python is that strings are immutable. That is, any operations on strings such as adding them together, slicing them, or substituting characters create new objects and leave the old ones behind. This makes references to strings safer, in a sense, from unexpected changes at a distance. It makes them safe to share between threads. It also lets them have a consistent hash.

Like most rules in software, this rule is not completely true. All memory is mutable. Some of it is just harder to get at. Although "firm" abstractions such as the immutability of strings are very useful, let's not make too many assumptions about how firm they really are.

Start with this:

```python
from ctypes import sizeof, c_void_p, c_char, c_long

bytes_header_size = sizeof(c_void_p) * 3 + sizeof(c_long)

def bytes_obj_memory(obj):
    return (c_char * len(obj)).from_address(id(obj) + bytes_header_size)
```

Python is a high-level language that makes everything simple and easy and takes away all the low-level stuff. But really, the C implementation of Python is just a giant switch statement that runs C code. What makes it high-level is that nearly everything is dispatched dynamically at runtime and the syntax is readable and expressive above all. But as you can see here, it doesn't take that much to start messing around inside the machine.

The `ctypes` module lets you use shared libraries written in C or with C-style ABI. But it does quite a bit more. Here, the `from_address` method is creating a read/writeable view directly on memory given an address and a length. (The length being provided by multiplying `c_char`; this is effectively creating a char array type).

Objects are structs. You can find the layout of these structs in [the `.h` files for the Python interpreter](https://github.com/python/cpython/tree/master/Include) -- oh yes, all of this is CPython specific -- starting with `object.h`. Every object gets a reference count and a type (two pointer size fields, so 8 bytes each on a 64-bit architecture). Variable-length objects like strings get a length (another pointer size). `bytes` objects additionally get a hash (a `long`, coincidentally also 8 bytes here).

This is for the Python 3 `bytes` object. Python 2 `str` also has an `int` flag representing whether it's been interned. Interned strings are shared objects. For example, if you say `x = 'a'` and somewhere else `y = 'a'`, then `x` and `y` will both point to the same object, to save memory. Python 3 `str` has several additional flags.

So that explains `byte_header_size`. It's entirely CPython 3 implementation specific, but I threw a bone to cross-platform support by not just using the magic number `32`.

What can we do with this? Well, calling it on a `bytes` object gets us a view of the actual characters in memory:

```python
x = b'hello'
print(bytes_obj_memory(x)[:])  # b'hello'
```

And this view is writable:

```python
bytes_obj_memory(x)[1] = b'a'
print(x)  # b'hallo'
```

So there you go: mutable byte strings.

Now, could we do this with Unicode strings (Python 3 `str`)? As I said, the struct for that has a few more flags, so we basically just add `sizeof(c_int) * 4` to `byte_header_size` to get the new start index. But Unicode strings are more than just bytes in memory... or are they?

Let's revamp things a little:

```python
from ctypes import c_int

str_header_size = bytes_header_size + sizeof(c_int) * 4

def obj_memory(obj, header_size):
    return (c_char * len(obj)).from_address(id(obj) + header_size)

y = 'hello'

print(obj_memory(y, str_header_size)[:])  # hello
```

Now, wait a second. Where's my Unicode? This prints `hello`, meaning that those bytes are indeed stored just so in memory, as single-byte-wide characters. The Python Unicode string implementation is supposed to be based on 2-byte characters! Well, except when it isn't. One of those extra flags in the struct representing a Unicode string is a `compact` flag, which indicates that the string only contains ASCII characters and is being stored using 1-byte characters to save memory.

So our hypothetical mutable string engine (that will never see the light of production) has a bit more work to do. And that I will leave as an exercise for the reader -- not because you should, but because you can.
