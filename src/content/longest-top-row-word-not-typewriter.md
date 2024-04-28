---
title: The longest word made of the QWERTY top row isn't typewriter
date: 2021-12-25
tags: python
---

What's the longest English word you can type with just the top row of a QWERTY keyboard?

If you believe Google, it's _typewriter_, which is a pleasingly self-referential answer because hey, that's where QWERTY came from, right?

![Google featured snippet says typewriter is the longest word with top row of qwerty](/images/typewriter.png)

This answer also appears in various articles, quizzes, etc. as a cute factoid.

Google's wrong, though.

## The search

(There's going to be some code -- if you got here just looking for the actual longest words, keep scrolling.)

Let's do a little search and let Python do the work. First we need a word list. We can download one, but most Linux distros and MacOS come with one preinstalled at `/usr/share/dict/words`.

```python
letters = set('qwertyuiop')
with open('/usr/share/dict/words') as wordfile:
    words = [x for x in wordfile if not set(x.strip().lower()) - letters]
words.sort(key=len)
print(''.join(words))
```

To filter the word list down, we're using sets. Set arithmetic is a great Python feature for writing code that's both performant and expressive.

When we subtract the `letters` set from the set made from each word in the dictionary file, the resulting set will contain any leftover letters that aren't from the top keyboard row. If that set is empty it means all the word's letters are from the top row. The empty set will be falsy and trip our `not` condition.

Sets are fast relative to interpreted python loops and conditionals, because their implementation is all in C and they use an efficient hash implementation.

## The actual longest words

This search finds three words longer than typewriter: _rupturewort_, _proprietory_, and _proterotype_.

**Rupturewort** is a decorative ground cover that was also used as a medicinal herb in the 1500s. [Merriam-Webster has it](https://www.merriam-webster.com/dictionary/rupturewort). I even found it in the official [Scrabble word finder](https://blog.collinsdictionary.com/scrabble/scrabble-word-finder/) (it's worth 16 points). [Online Etymology Dictionary mentions it](https://www.etymonline.com/word/rupture#etymonline_v_16657) under "rupture" which referred to hernias (which the herb was meant to treat).

**Proprietory** is an alternate spelling of proprietary that seems pretty rare. [Merriam-Webster has it](https://www.merriam-webster.com/dictionary/proprietory) but I had trouble finding it elsewhere.

**Proterotype** is defined in many dictionaries I checked as simply "a primary type", but it's a bit more specific than that. In biology, a type is a physical _specimen_ (or collection) that serves as the reference example of a species. In the [Online Dictionary of Invertebrate Zoology](https://digitalcommons.unl.edu/onlinedictinvertzoology/) ([letter P](https://digitalcommons.unl.edu/cgi/viewcontent.cgi?article=1008&context=onlinedictinvertzoology), page 48 — find doesn't work) it's defined as "The original primary type, including all the material upon which the original description is based." So there you go - a proterotype is the OG specimen.
