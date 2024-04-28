---
date: 2009-03-19
title: YouTube video embedding in reStructuredText
tags: python
---

The reStructuredText markup language is used in a variety of ways, including as a documentation format for Python applications and a general markup language for web content, in the same vein as Textile or Markdown. It's also extensible in Python: by adding new functions as "directives" to the `doctools` module, you can implement new commands. In this article, I'll show you how to implement a `youtube` directive so that a line like the following in your reStructured Text file will become an embedded YouTube video when it's rendered to HTML:

```text
.. youtube:: <video-id>

```

The outline of what we're going to do is simple: create a `youtube` function that returns a document node list, then register this function with `docutils`' `directives` list. (By the way, I'm using the XHTML-valid approach that uses only an `object` element, not `embed`.) The specifics are a little more involved. The following code listing shows how I did it:

```python
from docutils import nodes
from docutils.parsers.rst import directives

CODE = """\
<object type="application/x-shockwave-flash"
        width="%(width)s"
        height="%(height)s"
        class="youtube-embed"
        data="http://www.youtube.com/v/%(yid)s">
    <param name="movie" value="http://www.youtube.com/v/%(yid)s"></param>
    <param name="wmode" value="transparent"></param>%(extra)s
</object>
"""

PARAM = """\n    <param name="%s" value="%s"></param>"""

def youtube(name, args, options, content, lineno,
            contentOffset, blockText, state, stateMachine):
    """ Restructured text extension for inserting youtube embedded videos """
    if len(content) == 0:
        return
    string_vars = {
        'yid': content[0],
        'width': 425,
        'height': 344,
        'extra': ''
        }
    extra_args = content[1:] # Because content[0] is ID
    extra_args = [ea.strip().split("=") for ea in extra_args] # key=value
    extra_args = [ea for ea in extra_args if len(ea) == 2] # drop bad lines
    extra_args = dict(extra_args)
    if 'width' in extra_args:
        string_vars['width'] = extra_args.pop('width')
    if 'height' in extra_args:
        string_vars['height'] = extra_args.pop('height')
    if extra_args:
        params = [PARAM % (key, extra_args[key]) for key in extra_args]
        string_vars['extra'] = "".join(params)
    return [nodes.raw('', CODE % (string_vars), format='html')]
youtube.content = True
directives.register_directive('youtube', youtube)

```

Much of this code is unnecessary if you only want to implement the single-line version of the command I used above. But this code also allows you to customize the width and height and add other `param` elements:

    .. youtube:: asdfjkl
        width=600
        height=400
        someOtherParam=value

## Quick code walk-through

1. The argument signature of the `youtube` function is the same as you would use for any directive of this type (i.e. a block directive, as opposed to something inserted into running text.)

2. The only argument actually used here is `content`, which would contain everything from `asdfjkl` through `400` in the above example.

3. `content` is a list of lines.

4. The code involving `extra_args` simply splits each line after the first on the equals sign and makes a dictionary out of the (key, value) pairs, treating width and height specially.

5. The return value is a list of nodes. The `nodes.raw` function used to create the (single) node here takes three parameters: the raw source for the element, which is not really used in this case and can be left blank; the string to output; and the format, which in this case is HTML.

## How to render

If you're using reStructured Text seriously on your web site, your content management system probably already has a renderer for it. But just in case, here's how to render it to HTML manually:

```python
source = """\
This is some text.

.. youtube:: 2A2XBoxtcUA

This is some more text.
"""

from docutils.core import publish_parts

doc_parts = publish_parts(source,
    settings_overrides={'output_encoding': 'utf8',
                        'initial_header_level': 2},
    writer_name="html")

print doc_parts['html_body']

```

The `initial_header_level` override is useful if you want your section headings to start as `h2` elements, rather than `h1` elements. On this site, I store the title attribute of each article separately from the body, and render it as a `h1` element separately. The reStructuredText documents begin with body text. If you place the title of your documents in reStructuredText, you will still need to use the `initial_header_level` setting, because the default `doctools` behavior is to use `h1` elements for both the title and the top-level section headings.

And that's it. Now embedding videos is a one-line statement, and you can make other helpful extensions using the same technique.
