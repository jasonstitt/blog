---
title: WordPress with Composer and Git
date: 2015-01-18
---

[Composer](https://getcomposer.org/) is a modern package manager for PHP. Using Composer with WordPress makes it easier to keep [WordPress](https://wordpress.org/) projects in version control because your repository can include only your own files and a description of dependencies (`composer.json`), and not WordPress or third party plugins and themes. Submodules are an alternative, but they have their own inconveniences, and I find it easier to get the directory structure to play nice by using Composer.

The basic usage pattern goes like this. You'll need to install `composer` using the package manager for your platform or from its web site, then create a `composer.json` as described below in a new (empty, for now) directory. Running `composer update` will then create another file, `composer.lock`, which describes the exact versions of dependencies to be installed (and generally should be checked into source contorl along with `composer.json`). Finally, `composer install` will download all needed packages.

The way the `composer.json` below is set up, your WordPress installation will go into a directory called `webroot/` under the root directory of your project, while non-WordPress-related dependencies will by default go into a directory called `vendor/`.

You can then put site-specific custom plugins and themes directly into the `wp-content/plugins` and `wp-content/themes` directories and track them in source control, while ignoring all of the third-party files using the `.gitignore` approach below.

I do want to acknowledge an alternate approach, [documented at roots.io](http://roots.io/using-composer-with-wordpress/). That approach uses a third-party installer and puts the WordPress core into a subdirectory, which requires extra fiddling. This approach only uses the official `composer/installers` package (with a small workaround) and keeps the normal WordPress directory structure (with `.gitignore` rules to keep the core out of the repo).

## The base composer.json file

`composer.json` is a file that describes a package installable by Composer and/or a list of packages (dependencies) that Composer should install. Our project needs a `composer.json` that identifies WordPress as a dependency, plus any plugins, themes, or other vendor libraries to install.

WordPress does not have its own `composer.json`, so we will also need to add a custom package definition for it, plus some rules about install locations.

There is a [very long discussion on a WordPress ticket](https://core.trac.wordpress.org/ticket/23912) about whether the project should actually include a `composer.json` file, which some view as being for libraries rather than applications. Personally I find that when developing fully customized sites, WordPress is more of a framework than an application and using Composer to manage it as a dependency works better for me than a submodule or just downloading a zip.

Here is the base `composer.json` for installing just WordPress. Update the version numbers as needed.

```json
{
  "require": {
    "wordpress": "*"
  },
  "repositories": [
    {
      "type": "package",
      "package": {
        "name": "wordpress",
        "type": "wordpress-plugin",
        "version": "4.1",
        "dist": {
          "url": "https://github.com/WordPress/WordPress/archive/4.1.zip",
          "type": "zip"
        },
        "require": {
          "composer/installers": "~1.0"
        }
      }
    }
  ],
  "extra": {
    "installer-paths": {
      "webroot": ["wordpress"],
      "webroot/wp-content/plugins/{$name}/": ["type:wordpress-plugin"],
      "webroot/wp-content/themes/{$name}/": ["type:wordpress-theme"]
    }
  }
}
```

The need to identify WordPress core as a `wordpress-plugin` is unfortunate, but stems from `composer/installers` only having support for a set list of types.

## Installation

Run `composer install` the first time to generate a `composer.lock` file with specific installed versions, download WordPress and unpack it into `webroot/`.

In the future, you'll need to run `composer update` (or delete `composer.lock`) after making changes such as adding plugins.

## Adding plugins and themes from the official site

[WordPress Packagist](http://wpackagist.org/) provides a full mirror of the WordPress plugin and theme collections for use with Composer.

First, add the following as an item in the `"repositories"` object:

```json
{
  "type": "composer",
  "url": "http://wpackagist.org"
}
```

Since the `installer-paths` for both plugins and themes are both already set up in the base example, you then only have to add lines to the `"require"` section. For example:

```txt
"wpackagist-plugin/akismet": "*",
"wpackagist-theme/Responsive": "*"
```

Using the `wpackagist-plugin/` and `wpackagist-theme/` prefixes, you can pull in any plugin or theme you find on the main WordPress site.

## Adding GitHub or other repositories

Now, say you want to pull in a package that is on GitHub and not in `wpackagist`. You'll need to add an item to the `"repositories"` list for each repository, like this:

```json
{
  "type": "vcs",
  "url": "https://github.com/USER/REPO"
}
```

Then add a line to `"require"`:

```
"USER/REPO": "*"
```

Or, if you want to pull in version numbers that Composer considers too early to be in production:

```
"USER/REPO": "*@dev"
```

## .gitignore rules

Because we're pulling in so many third-party files here and then mixing them together with our own, it makes sense to use a whitelist-style `.gitignore` file.

This file starts out by ignoring all paths, then selectively including the ones that are actually part of the project.

```txt
*
!*/
!/.gitignore
!/composer.json
!/composer.lock
!/webroot/wp-config.php
!/webroot/favicon.ico
!/webroot/robots.txt
```

You'll need to add more rules for whatever other files are going into your `webroot`, such as other icons, Google Webmaster Tools verification files, etc.

You may want to include themes and plugins in the repository. Typically this would apply to custom themes and plugins that are specifically for the site your are developing (reusable ones can be brought in through Composer or as Git submodules).

This can be done in `.gitignore` using wildcards:

```txt
!/webroot/wp-content/plugins/myplugin/**
!/webroot/wp-content/themes/mytheme/**
```
