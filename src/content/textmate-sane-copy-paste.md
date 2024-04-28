---
title: Make TextMate's copy and paste indent "correctly"
date: 2010-05-27
---

One of the things that has bugged me about TextMate, otherwise a really great editor, is how it handles copying and pasting indented text.

Rather than indent the pasted text based on the cursor's position, it matches the indent level to that of the previous line (the last one that contains some text). For certain programming languages, this works out OK. But in either plain-text notes or Python, it's very frequently wrong.

Furthermore, it's quite easy to change the indentation of the cursor. Selecting and re-indenting a large block of text after pasting it is much less convenient.

I wasn't sure whether TextMate would let me override a basic key combination like Command-V and assign it to a command, but it did.

The next problem was getting the clipboard contents, which TextMate doesn't make available to commands via an environment variable. Instead, I used `pbcopy` and `pbpaste`, a pair of OS X-specific command-line utilities that work with the OS X clipboard.

(This is now available as a [TextMate bundle on GitHub](https://github.com/countergram/copypaste.tmbundle), so you don't have to copy and paste from below.)

## The copy command

Create a command with an input of Selected Text or Nothing, output of Discard, and key equivalent of Command-C.

```python
#!/usr/bin/env python
from sys import stdin
from subprocess import Popen, PIPE
from os import environ
environ['__CF_USER_TEXT_ENCODING'] = '0x1F5:0x8000100:0x8000100'

sel = stdin.read()
if sel:
    spaces = int(environ['TM_INPUT_START_LINE_INDEX'])
    sel = sel.splitlines()
    if len(sel) > 1:
        spaces = min(spaces, len(sel[1]) - len(sel[1].lstrip()))
        sel[1:] = [l[:spaces].lstrip() + l[spaces:] for l in sel[1:]]
    sel = "\n".join(sel)
    Popen('pbcopy', stdin=PIPE).communicate(sel)

```

For a short script, there's a fair amount going on here. First of all, the text-encoding environment variable is a hack I picked up from a [Mac OS X Hints article](http://www.macosxhints.com/article.php?story=20081231012753422). Without setting that variable in the copy and paste commands, `pbcopy` and `pbpaste` won't handle non-ASCII characters correctly.

`TM_INPUT_START_LINE_INDEX` is an undocumented environment variable that will tell us what column the start of the selection is in. The next few lines of code de-indent the remaining lines of the selection, if any, by that amount. Finally, the result is copied to the clipboard.

## The paste command

Create a command with an input of None, an output of Insert as Snippet, and a key equivalent of Command-V.

```python
#!/usr/bin/env python
from sys import stdout
from commands import getoutput
from os import environ
environ['__CF_USER_TEXT_ENCODING'] = '0x1F5:0x8000100:0x8000100'
stdout.write(getoutput('pbpaste'))

```

Using the output mode Insert as Snippet is critical. If you choose Insert as Text, it won't replace a selection. If you choose Replace Selection, using it without a selection will end up with the cursor at the beginning rather than the end of the insertion. Insert as Snippet works "normally."

Also, Insert as Snippet automatically indents lines after the first, so you don't have to add any padding to lines two and after if the paste position is indented, which you would have to do in Insert as Text mode.

## The cut command

Duplicate the copy command using the "double plus sign" icon at the bottom of the Bundle Editor. Change the key equivalent to Command-X and the output to Replace Selected Text.

## Notes

I've been using this for a while now, and it seems to work well. It's not perfect, since it makes some assumptions that may not be correct in every case, but the behavior is seldom bad.

Since this technique depends on replacing copy as well as paste to work, pasting text from outside sources can result in needing to re-indent. But this is true for the built-in paste as well!

If you start a selection in the middle of a line, the de-indent will be large enough to get rid of any indentation of the following line, but the `min()` call prevents the entire indentation structure of the block from being lost.
