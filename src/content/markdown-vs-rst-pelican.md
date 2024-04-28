---
title: Markdown vs. reStructuredText for writing about code with Pelican
date: 2014-09-12
tags: python
---

I recently [migrated this blog to Pelican](tech-blog-pelican-git). The static site generator [Pelican]() supports both reStructuredText (RST) and Markdown for post formats, so while I was setting the site up and importing old content, I had to spend some time trying both to see which one I would end up using.

The reason for going with Pelican here was a better workflow for posting code snippets than something like WordPress allows through its web-based post editor. So a lot of my evaluation depended on the process for including code in posts.

## Inline code

Markdown is better with inline code elements. First of all, the syntax is a bit more concise:

    Markdown: `foobar()`
    RST: ``foobar()`` or :code:`foobar()`

But beyond that, the RST-based generator for some odd reason uses `<tt>` for inline code instead of `<code>`. The `tt` element is deprecated (not included in HTML5) and is meant to represent "Teletype text". It does display using a monotype font by default, but I'd rather just use `<code>`.

## Code blocks

Both have reasonable code block support, with highlighting using Pygments. Markdown's syntax is more concise, requiring both less typing and no extra blank line. Both implement a subset of available Pygments options, rather than just passing all options through, and RST supports more options, but not necessarily ones I need.

**Markdown:**

````text
Fenced:

```python
def foo(): pass
````

Indented:

    ::python
    def foo(): pass

````

**RST:**

```text
.. code-block:: python

    def foo(): pass

````

## Familiarity

Although the Python world uses RST more because of `docutils`, The Markdown style is more familiar to me because of StackOverflow and GitHub.

## Error handling

RST seems to have more issues with error handling that affect the auto-reloading development server (`develop_server.sh`). I filed an issue on this already -- whenever there's a syntax error in an RST file, the server keeps on running but completely stops reloading files. I haven't had this issue with Markdown yet, but I'm not sure if it's because the parser is more forgiving or because of some other implementation detail in the respective modules.

## Sublime Text support

Both formats have decent syntax highlighters available, plus some "extras" packages.

- [Markdown Extended](https://sublime.wbond.net/packages/Markdown%20Extended) adds language-specific syntax highlighting of fenced code blocks (but not indented ones) and some other features.

- [Restructued Text (RST) Snippets](<https://sublime.wbond.net/packages/Restructured%20Text%20(RST)%20Snippets>) adds tab-completion for the underlining of headings. Just type `###`, `---`, etc. and then tab.

## Conclusion

Of course, you can mix Markdown and RST files in your Pelican content directory, but after considering all of the above I went with Markdown. Since the whole point of using Pelican in the first place was to make it easier to post code snippets, it made sense to go with the nicest support for that.
