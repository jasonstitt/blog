---
title: Deploying a tech blog with Pelican and git
date: 2014-09-12
tags: python
---

I recently gave this blog a major rework by porting it to [Pelican](http://blog.getpelican.com/), a static site generator (SSG), which takes formatted text files and some templates and turns them into an HTML site.

The main reason I went with Pelican in the end over something like WordPress is that I need to include lots of code samples on this blog, and editing posts in my text editor in something like [Markdown or RST](markdown-vs-rst-pelican) is much better for that than the WordPress editor.

Even with a good code highlighting plugin (which I already had written, and there are a few ok-to-decent ones available online), editing code samples in the WordPress editor is just not nice. Correcting indentation is hard because the `tab` key tabs to the next control on the page, switching to visual editing mode can wreck things, and basically the only way to make it work is to copy and paste code from an external editor and hope nothing bad happens.

I also considered replacing or augmenting the WordPress editor with a browser-based code editor such as [Ace](http://ace.c9.io/), but the existing plugin I found had some issues and I wound up preferring to use an SSG over writing my own.

## Drawbacks

Proponents of SSGs point out that dynamic CMSes are often used to serve up static content, which is a waste of resources. But the reverse situation comes out worse for SSGs. Any dynamic content requires a separate app with its own deployment, co-existing with the static content and its deployment process, as opposed to just adding a plugin to a CMS using a well-defined API.

SSGs also tend toward a DIY approach to deployment in general. With Pelican, I found that although getting a basic test up and running and adding some content took 10 minutes, coming up with an actual, working deployment took hours of work, a lot of reading docs and Googling, and some source diving. (I'm not counting custom theme development, which would have taken time with any platform.)

## Local preview and live reload

Pelican generates a `develop_server.sh` script for you that runs a local server and auto-reloads updated content. This is really helpful for editing both content and themes, and there's no way I would work without it (using a `pelican` command in the terminal after updates). It's also superior to Markdown or RST "preview" plugins for Sublime Text because you can see the actual site, although an extension to automatically reload the most recently updated page in the browser would be neat.

## PHP code

It wasn't long at all before I tried formatting a post on PHP and noticed that PHP snippets were not highlighting correctly unless they had `<?php` at the top. Given that code snippets are often individual lines or functions, they shouldn't all have to have `<?php` in them. I looked around the Web a bit and found various ad-hoc solutions and open bug reports in different projects, ultimately leading to the `startinline` option to Pygments' PHP lexer (which of course defaults to `False`).

Unfortunately, the code blocks in both RST and Markdown only take a subset of available Pygments arguments, and this isn't one of them (boo!)

After looking into the plugin architectures for both Markdown and RST, I ended up just monkey patching the `PhpLexer` class in Pygments to deal with this. I put this into `pelicanconf.py`:

_Note_: I updated this snippet since I first published this article. I think an import statement somewhere changed and thus replacing the class no longer worked.

```python
## Monkey patch to make PHP snippets highlight without <?php
from pygments.lexers.web import PhpLexer
if not hasattr(PhpLexer, '_wrapped_init'):
    PhpLexer._wrapped_init = PhpLexer.__init__
    def new_php_init(self, **options):
        options['_startinline'] = True
        PhpLexer._wrapped_init(self, **options)
    PhpLexer.__init__ = new_php_init


```

## Deploying with a `git` hook

One of the potential perks of SSGs is making use of free hosting and an existing deployment workflow through [GitHub Pages](https://pages.github.com/). Since I'm not using GitHub Pages, I wrote my own update script for my blog and hooked it into my Ansible provisioning script, which I might write about separately. Ansible copies an empty, bare Git repo to the target machine that has a `pre-receive` hook in it so that Pelican can be re-run each time I `git push` some changes. The hook looks like this:

```bash
#!/bin/bash

tempdir=/tmp/pelican
destdir=/usr/share/nginx/html/pelican

while read oldrev newrev refname
do
    if [[ $refname = "refs/heads/master" ]] ; then
        set -e
        mkdir -p "$tempdir/in/" "$tempdir/out/"
        git archive $newrev | tar -x -C "$tempdir/in/"
        pelican -s "$tempdir/in/pelicanconf.py" -o "$tempdir/out/" "$tempdir/in/content/"
        rsync --checksum -r --delete "$tempdir"/out/* "$destdir/"
        rm -rf "$tempdir"
    fi
done

```

Using `pre-receive` instead of `post-receive` allows the `push` to be canceled in case the script exits with a non-zero exit code. Any output also shows up on the client side during the `push`.

`git archive` is a way of exporting the entire repo; in a bare repo it is required because `git checkout-index` will not work.

The `--delete` option to `rsync` is potential trouble, but note that the destination directory is called `pelican` and is specific to these files. This should not be used to "mix" Pelican output and other files. The rationale here is that Pelican itself does not have a strong facility for renaming or deleting individual posts, so to avoid outdated HTML files hanging around we have to just clobber everything.

## Nice URLs

Generating clean URLs for articles on the Pelican side is as simple as putting this in the configuration:

```python
ARTICLE_URL = '{slug}'

```

Types of pages other than articles all require their own config lines. The development server seems to be fine with these URLs as-is, but your web server will need configuration. I did this with `try_files` in `nginx`:

```text
location / {
    try_files $uri $uri.html $uri/ =404;
}

```

## Filenames as slugs

By default, Pelican will generate URLs based on the titles of posts. I don't like this because (a) titles might change, but URLs shouldn't, and (b) my titles are sometimes longer than I want my URLs to be.

You can put a `Slug:` line at the top of every file, but this is probably going to be redundant with the filename anyway, so it's easier to do this in the configuration:

```python
FILENAME_METADATA='(?P<slug>.+)'

```

## Conclusion

Pelican is still pretty new to me, so I can't say yet whether I will stick with it. In general, I don't see SSGs replacing CMSes for real, though they are good for developer blogs and documentation.
