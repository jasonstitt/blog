---
title: Taming asynchronous processes in Node.js
date: 2015-05-12
tags: javascript
---

Recently I wrote a Node-based tool that, among other things, used [`gm`](https://github.com/aheckmann/gm) (GraphicsMagick wrapper) to process a bunch of images in a directory. `gm` offers a `write()` method that is asynchronous, and does not offer a `writeSync()` as well. Given that `gm` spawns an external process, looping through a hundred items in a directory and making an async `write()` call on all of them would bog down the machine with a hundred processes.

The solution to this is to synchronize the calls so they run one at a time. (Or, really, to run one process at a time per core, but just synchronizing them would be good.)

There are various approaches to this, but I wanted to first show one without library support (e.g. `async`). Say we have some asynchronous method to call, like:

```javascript
function someAsyncFunction(item, callback) {
  console.log(item)
  setTimeout(callback, 0)
}
```

This one doesn't do anything (or cause errors), but it will be a dummy that stands in for a "heavy" async method like `gm.write()` that does something external, like spawn a process.

We want to call this function with each of the items from a list, but in sequence not in parallel. One way of doing this is to create a function that uses itself as a callback.

```javascript
var items = ['foo', 'bar', 'baz']
var i = -1
function syncLoop(err) {
  if (err) {
    // This is for the "previous" item
    console.log(err)
  }
  // Incrementing here means the error handler could see previous i value
  if (++i < items.length) {
    someAsyncFunction(items[i], syncLoop)
  } else if (i == items.length) {
    // Checking equal prevents multiple loops from all printing Done!
    console.log('Done!')
  }
}
syncLoop()
```

First, note the `if(err)` block at the top. The convention for callbacks in Node/JavaScript is for the first argument to be an error. The error applies to the call that we got the callback from, i.e. the previous item in the list in this case.

The items list and loop variable are both in the outer scope, which allows the function to be a closure around them and therefore be able to update `i` on successive executions. Initializing `i` to `-1` and using a pre-increment is slightly unusual for a loop, but it allows the value of `i` from the previous call to be preserved at the top of the function for the error handler.

Finally, what does "multiple loops" mean in the "done" check? Well, since running something like `gm` with one process per core would be a good idea and save a lot of time, we can simply call `syncLoop()` two or more times in a row in order to get that many parallel loops going. Since Node itself is running single-threaded, there is no contention over the value of `i`, but we do need to only log "Done!" once as `i` will get incremented one or more times past the end of the list.

## Now, do it with the `async` module

That was how to implement the pattern in pure JavaScript, but what about [`async`](https://github.com/caolan/async)? Use `async.series()` and `async.parallelLimit()`. Easy! Done. But it's nice to look under the hood sometimes.

In order to use either `series()` or `parallelLimit()`, you'll need to take your array of items (e.g. jobs or tasks to complete, or images to resize) and make an array of functions that operate on those items.

Also, there is actually a bit of an issue with both functions, which is that they will stop running immediately if any step passes an error to its callback. If you want to log errors but not stop for them, there isn't an argument for that, so you'll need another wrapper function to trap errors.

For example:

```javascript
var async = require('async')
var items = ['foo', 'bar', 'baz']
var taskFunctions = []
// Won't it be nice when there are array comprehensions?
items.forEach(function (item, i) {
  taskFunctions.push(function (callback) {
    // If we just passed callback directly, errors would be fatal
    someAsyncFunction(item, function (err) {
      if (err) {
        console.log(err)
      }
      // Deliberately do not pass args to callback
      callback()
    })
  })
})
async.parallelLimit(taskFunctions, require('os').cpus().length, function () {
  console.log('Done!')
})
```

Although in this trivial example the amount of code is about the same as the other way, and it is more nested, on the other hand we've eliminated some possible off-by-one errors in the previous example and have an easier time switching between different ways of running the tasks (e.g. in series vs. parallel). Furthermore, if the `items` array is being built in code somewhere from some other data source, we could just go ahead and build the task functions we need instead.
