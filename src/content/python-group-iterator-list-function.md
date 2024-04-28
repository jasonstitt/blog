---
title: Group a list into chunks in Python
date: 2014-06-01
tags: python
---

More than once I've had to take a list of items and group them. For instance, maybe I have a flat list of key-value pairs in alternation, like this:

    [key1, value1, key2, value2, key3, value3]

It could have been that they were easier to enter that way (fewer parentheses or brackets), or maybe that's just how they come from an outside source. Nevertheless, to actually use them, it would be better to have them in tuples:

    [(key1, value1), (key2, value2), (key3, value3)]

That way, I could make them into a dictionary, `urlencode` them, etc.

There is an idiom for this in Python using `zip`:

```python
grouped = list(zip(*[iter(sequence)] * chunk_size))

```

But this is one of those cases where "idiom" is more of a synonym for "clever hack" than anything else. Don't get me wrong: it works, and it is clever. What it's not is a clear declaration of grouping a list into chunks.

In case you're curious and don't already know how this works, `zip` is going to create each chunk by calling `next()` on each of a list of `chunk_size` references to the same `iter` object. Since they're all references to the same object, it's really just getting the next `chunk_size` elements from the sequence. The only reason for creating a list is that the length of the list represents the chunk size.

Frankly, it reminds me of doing something like `x + x++ + x` in Java, except less readable.

Of course, we could just alias this idiom to a sensible function:

```python
def grouplen(sequence, chunk_size):
    return list(zip(*[iter(sequence)] * chunk_size))

```

And that would seem to solve all our woes. But given that the idiom is quite short, and the function will have to be stuck in a file somewhere in the project and imported, it's tempting to just use the idiom instead. This is something I wish were in `itertools`, as the natural opposite to `chain`.
