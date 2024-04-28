---
title: 'Namespacing PHP & WordPress: classes, prefixes, namespaces, and closures'
date: 2015-02-12
---

Any PHP program, especially one meant to be shared as a library or plugin, needs to take care not to pollute the global namespace and to avoid conflicts with other code. Particularly with WordPress plugins, there are some very common patterns found in articles and distributed packages that essentially work, though they have some catches. Pitfalls abound, however, when straying from the traditional approach of classes in package namespaces.

There are several different approaches I'd like to cover, including classes, prefixed functions, namespaces by themselves, and anonymous functions (closures). I'll also mention the immediately invoked function expression (IIFE) pattern from JavaScript, which has some use in PHP but not as much as you might expect.

## Classes

Most languages have an inclination toward certain patterns, and I would say modern PHP, despite supporting some module-based and functional programming, inclines toward classes.

I say classes rather than OOP because there are common uses of static or single-instance classes in PHP (e.g. for plugin definitions) that are barely object-oriented but are used to get around the weaknesses of namespacing in PHP. Oftentimes, however, people will call anything that involves classes OOP, so you'll see the term used frequently.

For example, a simple plugin that adds a setup action could look like this:

```php
namespace MyProject;

class Plugin
{
    public function __construct()
    {
        add_action("after_setup_theme", array($this, "setup"));
    }

    private function setup()
    {
        //
    }
}

// Ideally don't mix declaration and instantiation, but these are
// frequently found in the same file.
new Plugin();

```

Note the immediate, anonymous instantiation and the use of the constructor to add hooks - which you would not want to be duplicated, meaning you only want one instance of the class. That's why I say this is more of a namespacing pattern and less OOP, although the rest of the project could very well be OOP.

Really, if we're going by a modern coding standard such as [PSR](http://www.php-fig.org/psr/psr-1/), declaration and instantiation are not supposed to be mixed. So if we are using this approach we could put the class into `Plugin.php` and just stick the instantiation into the actual plugin entry point. However, the anonymous-function approach below could also be helpful.

## Prefixes

Prefixes are a very old means of namespacing. They are very common in C and also in a fair amount of non-class-based PHP code. Simply by putting the name of the project/application (and possibly module) at the beginning of every function, global variable, or constant name, different projects are kept (hopefully) non-overlapping.

The cost of this is that all non-local names can get really long. Sometimes really, really long. There is a large amount of duplication with this approach in terms of typing and reading the prefix over and over again.

You've probably seen this approach if you've read the code for a few plugins. It might look like this:

```php
function foo_project_setup()
{
    //
}

function foo_project_create_widgets()
{
    //
}

function foo_project_add_widget_to_machine()
{
    //
}

```

It's a workable approach, but not fantastic.

## Namespaces (without classes)

Although PHP namespaces are commonly used in conjunction with classes to create a package structure, they can also stand on their own, to an extent.

One issue with namespaces without classes is that they leak variables. Namespaces in PHP are not like modules in another language like Python, containing everything within the file. They apply to classes, functions, and constants, but variables will remain truly global.

```php
namespace MyProject;

// MyProject\setup
function setup()
{
    //
}

// MyProject\VALUE
const VALUE = 123;

// Not MyProject\$foo - $foo is global!
$foo = 456;

```

Complicating matters, constants in PHP are quite limited and cannot be arrays or objects. Think of how many applications in other languages have array/list constants in them for options, or colors, or something else. In PHP these have to either be returned by a function, or put into variables that are constant by convention. And due to the global namespace rule, those variables should probably be static class members. So we are back to classes.

## Anonymous functions (closures)

Anonymous functions can potentially stop some parts of the code from adding to any namespace.

For example, this is (still) a very common example of adding an action in WordPress, which we could improve:

```php
add_action("after_setup_theme", "my_blog_setup");
function my_blog_setup()
{
    // Do stuff.
}

```

This is the prefixing approach (with `my_blog` as the prefix). But given that PHP has had anonymous functions for years, this can be shortened:

```php
add_action("after_setup_theme", function() {
    // Do stuff.
})

```

Not only is this shorter, but it also more clearly makes the association between the action name and the function body, saves you from having to decide whether `add_action` goes above or below the function, and prevents the function from needing a name (ergo, no possible namespace conflicts and no need for a long, prefixed function name).

Of course, you will want to have some other functions that are not actions, filters, etc., and this pattern does not, by itself, work well for them. So those functions will probably end up in classes.

## Bonus: the IIFE and why PHP isn't JavaScript

An IIFE or immediately invoked function expression is an anonymous function that is called right after it is created. This puts its contents into a local/function scope while executing them immediately and then vanishing without a trace - except possibly for its return value and side effects.

While this is a popular technique for modularizing JavaScript code, it can also be used in PHP, like this:

```php
call_user_func(function() {
    // Do stuff.
});

```

Unfortunately, while the namespaces-without-classes approach leaks variables, this approach leaks functions!

Although PHP has added some functional programming features, functions overall are still different from other objects and have different rules, including scoping. Here's an example:

```php
call_user_func(function() {
    // $func1 is local and will be inaccessible from outside this block
    $func1 = function() {
        //
    };
    // func2 is global.
    function func2() {
        //
    }
});

```

Even though `func2` is declared inside the scope of another function, it'll still be added to the global function table, or to a namespace if you have one declared.

In JavaScript, the IIFE pattern is more flexible because `foo = function () {};` and `function foo () {}` will both put a reference named `foo` into the current scope. But this ain't JavaScript.
