---
title: Organize WordPress themes by keeping code out of functions.php
date: 2013-05-03
---

One of the first things you learn about WordPress themes is that the two required files are `styles.css` and `functions.php`, the latter being where you put all the functions, filters, etc., that customize your plugin.

But if your code is of any size at all, it's time to start making it modular. And the cleanest way to do this is to not put any code into `functions.php` except for your `require`s.

By moving all custom PHP library code into a `lib/` directory in separate modules, it can be kept much more organized. This is facilitated with this little helper function:

```php
function req()
{
    require_once locate_template(func_get_arg(0));
}
```

This function does a couple of things. First, it's shorter to type than `require_once locate_template` every time. Second, it prevents the injection of any global variables into the included file.

In PHP, any locally scoped variables at the time of an `include`/`require` statement are given to the included file as global variables. This works fine when you're pulling together some HTML snippets (e.g. you set `$title = 'foo'` and then include a file that references `$title`) but is not good practice for application programming. Global variables are not great in general, and variables that are supposed to be local and just happen to be made into globals _somewhere else_ are worse.

By moving your `require_once` into a function, the local scope contains nothing except for the arguments and locals inside the function itself -- and this function has no named argument, since it uses `func_get_arg`. If it _did_ have a named argument, that argument would become a global variable in the included file.

Example usage:

```php
req('lib/editing.php');
req('lib/noswitch.php');
req('lib/paths.php');
req('lib/comments.php');
// ... etc ...

```

There are some alternate approaches (e.g. Roots.io loops over an array of include paths) but I like this one as it is very direct and clean.
