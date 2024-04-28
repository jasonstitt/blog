---
title: 5 new ways to use generators - none of them start with sequences
date: 2017-10-02
tags: python
---

Iterators are a central part of Python, to the point of the basic `for` loop being exclusively a for-each. Generator functions are also a key idiom. Any function that `yield`s values is a generator. It's common for a generator to loop over an input iterator and yield new values based on the inputs (a map/filter scenario), but it's also perfectly reasonable for the input not to be sequential at all.

Here are several useful scenarios for generators that take non-iterable arguments and make them into something iterable.

## Ancestry (bottom up)

Hierarchies can be implemented in a number of ways. Let's say we have objects with a `parent` reference, which can refer to another object or `None`. This may be found in ORM objects because it's the typical way to represent hierarchy in a relational database table.

```python
def ancestry(node):
    while node:
        yield node
        node = node.parent
```

This makes walking upward from a child node to the root as simple as `for item in ancestry(leaf): ...`

## Hierarchy (top down)

Walking a hierarchy from the top down is implemented in standard library functions like `os.walk` and `ast.walk`. As an alternative to an object having a `parent` reference, let's say each object has a `children` list, which is empty at leaf nodes.

```python
from collections import deque

def walk_depth(node):
    yield node
    for child in node.children:
        yield from walk_depth(child)

def walk_breadth(node):
    visit = deque()
    visit.append(node)
    while visit:
        node = visit.popleft()
        yield node
        visit.extend(node.children)
```

Now we `for item in walk_depth(parent): ...` or `for item in walk_breadth(parent): ...` for a search of the tree.

## Corners of a rectangle or grid adjacency

There is no rule that a generator function has to have a loop in it. You can also yield a fixed number of things. This is useful when calculating the same relationships over and over again, such as points of a shape or around a coordinate. Granted, in high-performance, low-level code these operations would likely be unrolled and inlined, but for readability it's much nicer to enable iteration.

```python
def corners(rect):
    yield (rect.x, rect.y)
    yield (rect.x + rect.width, rect.y)
    yield (rect.x, rect.y + rect.height)
    yield (rect.x + rect.width, rect.y + rect.height)

def adjacent(x, y):
    yield (x + 1, y)
    yield (x, y + 1)
    yield (x - 1, y)
    yield (x, y - 1)
```

Now instead of repeatedly coding multiple statements every time you want to search adjacent grids, you can just type `for x2, y2 in adjacent(x, y): ...`

## Running at intervals

There are various use cases for running a `while True:` loop inside of a generator. A very simple one is to abstract the idea of doing something forever but waiting in between.

```python
import time

def interval(seconds):
    while True:
        yield
        time.sleep(seconds)
```

This can be used as `for _ in interval(5): ...`

## Polling for changes

Another case for looping forever is to poll something. Let's say we have an endpoint at `https://example.com/temperature` that gives us the current temperature in Exampleland. Assuming we want to check it repeatedly and take action only when it changes, we could do this:

```python
import requests

def poll_changes(url, seconds=1):
    text = None
    for _ in interval(seconds):
        response = requests.get(url)
        if response.text != text:
            yield response.text
            text = response.text
```

Now you can `for text in poll_changes('https://example.com/temperature'): ...`
