---
title: Effective .gitignore whitelisting patterns
date: 2015-03-04
tags: git
---

Whitelisting with `.gitignore` is a technique for dealing with source trees that can have various different untracked local files such as generated output, packages installed through package managers, "working" files, config for individual developers, etc. Rather than trying to come up with some master list of all possible untracked files and add them to `.gitignore`, it can be easier to start by ignoring everything and then add specific directories back.

Here are some configuration patterns I've found to be effective.

## Ignore everything, then add specific subtrees

    # Ignore everything
    *
    # But descend into directories
    !*/
    # Recursively allow files under subtree
    !/subtree/**
    # You can be specific with these rules
    !/some/other/deep/path/**
    !.gitignore

The `!*/` rule un-ignores all directories. But Git does not track directories, only files, so `!*/` by itself will only allow descent into the full directory tree; it won't actually allow anything into the repo. With that rule in place, you only need one rule using the `**` recursive wildcard in order to include a subtree.

If you didn't use `!*/`, you would need additional rules to un-ignore `/subtree/` and its child directories.

Not everyone likes `!*/` because it means that if any other rule allows a filename pattern found inside some directory you don't want in the repo, the directory itself will not be blocked. You need to use specific rules for files to include with this one.

## Ignore the root directory, then add whole subtrees

    # Ignore everything in the root
    /*
    # Un-ignore all of subtree
    !/subtree/
    !.gitignore

This pattern is somewhat coarser than the previous one. The `/*` rule will only ignore items in the root of the repo's directory structure, so as soon as you whitelist a directory, all of the directory's contents will be allowed as well, even without using the `*` or `**` wildcards.

## Ignore everything in a directory, but keep the empty directory

    *
    !.gitignore

Git does not want to include an empty directory in a repo, because it tracks files. Put a hidden file (such as `.gitignore`) into the directory, and it will be saved. But to keep the directory empty, even if you have files in there for testing/development purposes, it's a good idea to ignore everything except for the `.gitignore` file itself.
