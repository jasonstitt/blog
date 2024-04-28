---
title: Generators that let you compare adjacent items
date: 2016-06-20
tags: python
---

One of the elegant things about Python is its emphasis on iteration using `for .. in`, almost to the exclusion of index-based loops. There are ways of working around the limitations this imposes, for example, `enumerate()` if you actually need the index, and `zip()` if you need to iterate over more than one thing at a time.

But the `for .. in` loop still tends to concentrate on visiting just one item at a time, which can cause problems if you want to compare adjacent items with each other or aggregate them in some way.

It's tempting to fall back on indexed loops so that you can get `seq[i]`, `seq[i + 1]`, and so forth. But indexed loops in Python are something of a last resort. It's not just that they break up the readability of a good `for .. in` loop -- they also work only for indexable sequences such as lists, while `for .. in` works for any iterator.

In order to compare or aggregate adjacent items in an iterator, we just have to keep a running reference to the previous item (or items). But it would be nice to implement this just once, so let's look at some generator functions.

## Single look-back

First, we'll "look back" only one item. So for example, for the sequence `[1, 2, 3, 4]` we would visit `(1, 2), (2, 3), (3, 4)`.

```python
def adjacent_pairs(seq):
    it = iter(seq)
    prev = next(it)
    for item in it:
        yield (prev, item)
        prev = item
```

Pre-filling `prev` is more efficient than putting a conditional inside the loop to check if we've set `prev` yet. And calling `next()` here is safe because if it raises `StopIteration` (due to an empty input) it will just terminate the `adjacent_pairs` generator, not crash. Wrapping the input in an `iter()` is basically just to allow `next()` to work whether the input is an iterator or a sequence. (You cannot, for example, call `next()` on a list directly).

## Multiple look-back

This is all well and good if we only want to examine two adjacent items at a time. If we want to look at more than that, extending this with more local variables would be suboptimal. We want a data structure that represents several items that shifts or crawls to one side over time. We already have this in the Python standard library in the form of a `deque` (double-ended queue).

```python
from collections import deque
from itertools import islice

def n_adjacent(n, seq):
    it = iter(seq)
    n_items = deque(islice(it, n - 1))
    for item in it:
        n_items.append(item)
        yield tuple(n_items)
        n_items.popleft()
```

One caveat: if the input has fewer than `n` items in it, the iterator will be consumed but `n_adjacent` won't yield anything. It could be modified to return a "short" tuple in that case, or to raise an exception, but this basic implementation will only yield tuples of length `n`. The handling of this edge case is somewhat usage-dependent. Returning a short tuple has the largest chance of causing problems (unpacking, etc.) while raising an exception is the most robust in general.

## Why not multiple iterators?

If we combine `iter` and `zip` we can get two iterators over the same sequence, one offset from the other:

```python
def pairwise(seq):
    a, b = iter(seq), iter(seq)
    next(b)
    yield from zip(a, b)
```

On the surface, this version looks OK. It's shorter, and it uses cool iterator magic and `zip` and all that jazz. Since the call to `next()` puts `b` an item ahead, `zip(a, b)` will contain pairs of adjacent elements, as in our first example.

There's one fairly large problem with this, which is that it only works on sequences that you actually can consume more than once. If your source is a generator that cannot be replayed once consumed, this is not going to work. Since using just one iterator and saving one or more items is more general purpose, I prefer it here.

For the sake of completeness, though, you could also extend this `zip` based method to an arbitrary number of items at a time:

```python
from itertools import islice

def n_adjacent(n, seq):
    iters = (islice(iter(seq), i, None) for i in range(n))
    yield from zip(*iters)
```

Again, if you're iterating over a list, this is not really much of an issue. Having multiple iterators over a list not only works but is computationally cheap. But imagine you're iterating over lines in a file (and do not want to save the whole file in memory at once). In this case, iterating exactly once is a better idea, and using the `deque` approach allows that.
