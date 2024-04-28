---
title: Counting AngularJS watchers on every element
date: 2015-09-19
tags: angular
---

AngularJS makes it easy to make complex web front-ends, but at the cost of a ballooning number of function calls that grind away every time the model-view bindings need to be updated.

While small examples of AngularJS usually only watch a few model values -- an input field here, a "hello world" or username there -- it is not at all difficult to exceed several thousand AngularJS watchers once you start using UI components inside of lists, tables, or grids. Watchers can [sneak up on you](https://www.airpair.com/angularjs/tips-n-tricks/speed-up-your-angular-apps-and-rid-sasqwatches), and scopes might have more watchers than you expect.

Here's a simple example: you have some action buttons like delete, rename, etc. Each action button is a reusable component and there are maybe 3-4 of them per item in a list. Look at just one of these buttons, and the difference between one watcher and a few or a dozen watchers seems minimal. In aggregate, it becomes a large difference. And it's not at all out of the question to have a dozen watchers on one UI button. Maybe it has a few states, each of which is a DOM element with an `ng-hide` (which could be done more efficiently with some DOM manipulation, but this is the "obvious" way to do it with data binding). And each of those has an `ng-class` to determine its proper appearance from model data. And so on. It adds up. Start putting complex UI components into tables and it really adds up.

You can even end up adding hundreds of watchers by using third-party UI components, and need to make sure to keep your dependencies up to date to [make use of new improvements](https://github.com/angular-ui/bootstrap/pull/3770) especially if you are repeating these components multiple times on the page. The linked example is the datepicker widget from Angular Bootstrap UI, which previously [used `ng-class` on every number in a calendar grid to set an "active" class that only one would have at a time](https://github.com/chrisirhc/angular-ui-bootstrap/commit/a14c6dd071677b0844d25fa0997333c007e887fe) and [hid the calendar popup rather than excluding it from the DOM when it wasn't open](https://github.com/angular-ui/bootstrap/commit/b72efed56f68e9e5dbed934df7f47e0b5c94242c).

If you'd like to trim down the number of watchers running during your application's digest cycles, it helps to know where they are. I found a number of variations of code online to [count how many watchers there are](https://medium.com/@kentcdodds/counting-angularjs-watchers-11c5134dc2ef), but I wanted to really dig in and find where they were living, so I came up with some code to walk through the entire DOM and annotate elements with the watcher count of their associated scope.

After running this code, you need to inspect the DOM with your browser's developer tools to see the results. Each element will have a `data-watchers` attribute with two numbers: the first is the watcher count on the scope associated with that element, and the second is the total of all watchers for that element and its children, recursively. This makes it easy to drill down.

I've made this into a bookmarklet: <a href="javascript:(function()%7Bfunction annotateWatchers(elem)%7Belem%3Dangular.element(elem)%3Bvar selfWatchers%3DcountWatchers(elem),totalWatchers%3DselfWatchers%3Bangular.forEach(elem.children(),function(child)%7BtotalWatchers%2B%3DannotateWatchers(child)%3B%7D)%3Belem.attr(%27data-watchers%27,selfWatchers%2B%27,%27%2BtotalWatchers)%3Breturn totalWatchers%3B%7Dfunction countWatchers(elem)%7Bif(!elem%7C%7C!elem.data)%7Breturn 0%3B%7Dreturn countScopeWatchers(elem.data().%24scope)%2BcountScopeWatchers(elem.data().%24isolateScope)%3B%7Dfunction countScopeWatchers(scope)%7Bif(!scope%7C%7C!scope.%24%24watchers)%7Breturn 0%3B%7Dreturn scope.%24%24watchers.length%3B%7DannotateWatchers(document.documentElement)%3B%7D)()%3B">#watchers</a>

And if you'd like to see the code, here it is:

```javascript
function annotateWatchers(elem) {
  elem = angular.element(elem)
  var selfWatchers = countWatchers(elem),
    totalWatchers = selfWatchers
  angular.forEach(elem.children(), function (child) {
    totalWatchers += annotateWatchers(child)
  })
  elem.attr('data-watchers', selfWatchers + ',' + totalWatchers)
  return totalWatchers
}

function countWatchers(elem) {
  if (!elem || !elem.data) {
    return 0
  }
  return countScopeWatchers(elem.data().$scope) + countScopeWatchers(elem.data().$isolateScope)
}

function countScopeWatchers(scope) {
  if (!scope || !scope.$$watchers) {
    return 0
  }
  return scope.$$watchers.length
}

annotateWatchers(document.documentElement)
```

Of course, not all watchers are equal, and you'll need to do some profiling to figure out where your biggest slowdowns are. But this makes it really easy to look through a page and mutter to yourself, "that little thing has 500 watchers on it? Really?" Which is a start.
