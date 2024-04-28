---
title: First impressions of Node debugging tools
date: 2016-09-24
tags: javascript
---

I've recently started getting more into Node.js programming. While I've worked with it before, the ecosystem is moving along -- for example, most of ES6 is implemented without flags in Node 6, which will be an LTS version starting in October. That's pretty exciting.

In reading about other developers' experiences with switching to Node or doing larger scale projects in it, debugging keeps coming up as an issue. This is partly down to the relative difficulty of conceptualizing and stepping through async code. I don't find this too bad and I've been doing it in browser code for ages. But it can get annoying, especially when it's so easy to end up in framework code when stepping into anything.

The other part of the debugging puzzle is tools. I wanted to dive in and get a better sense of how I would actually debug code.

## node-inspector

[`node-inspector`](https://github.com/node-inspector/node-inspector) is a common choice. It runs a local web app that acts like Chrome developer tools and allows similar debugging and profiling capabilities. It looks pretty solid, except that it's currently [broken on newer releases of Node 6](https://github.com/node-inspector/node-inspector/issues/905). Several bugs have been filed on the same problem, so I know it's not just something I'm running into.

Besides that, I like the interface all right. It's somewhat inconvenient to have to run the server in one shell, the Node app in another, and then go to a URL. But the URL is bookmarkable and I suppose I could make the server a `launchd` item and just keep it running.

## devtool

Next I tried [`devtool`](https://github.com/Jam3/devtool), which pops up an Electron developer tools window. My first impression was that it pretty much just works, and it's nice that it is self-contained in that it both runs the app and launches the debug window with one command. But there are some issues. First of all, it's running Electron, not Node, which could lead to subtle differences in execution which are exactly what you don't want to have to deal with when debugging. Second, unlike `node-inspector`, it doesn't add source files in the current directory to the browsable source tree -- you only see files that have been required already. This makes it hard to set breakpoints.

## node --inspect

Node 6 has a new `--inspect` flag which looks like it's trying to build what third-party tools are doing into the platform. When I ran it, I got a warning that it's an experimental feature that could change at any time. Still, it appears to be mostly working.

Like `devtool`, the source tree only shows files that have been required so far, which makes breakpoints unnecessarily difficult. Breakpoints appear to be saved between executions, so you can set some, then restart/reload, and even though you can't see any of the files the breakpoints are theoretically still there. The popup file palette (⌘O on Mac) also does not show other source files from the app directory.

The Profiles tab has been blank whenever I looked at it with an app loaded.

As with `node-inspector`, `node --inspect` makes you visit a URL in your browser. It appears to be bookmarkable. There's a hash in the URL, but so far it's been the same for each file I've tried to debug. If it turns out to change in a way that breaks bookmarks, that would be annoying, since you otherwise have to copy and paste the URL out of the terminal.

This inspector also adds an extra step to your debugging. Node wraps modules in IIFEs, and the `node --inspect` debugger, unlike the others, reveals this to you. This means that if you run `node --inspect --debug-brk` to break on the first line of the program (which is advisable if you want to be able to define any other breakpoints in the tool), you actually start execution on the IIFE definition rather than the first line of your code. Stepping over will run the whole thing, and stepping in will end you up deep in Node's `internal/module.js`. To actually get to your code you need to right-click and "Continue to here" or set another breakpoint.

## node debug

Node also ships with a [command-line debugger](https://nodejs.org/api/debugger.html). I'm not a huge fan of these. They're technically usable, but it's annoying to see source a snippet at a time and not be able to browse easily, and setting breakpoints is more of a pain than it needs to be.

## Conclusion

If `node-inspector` gets fixed with latest Node 6.x versions, I'll probably use it, at least until the built-in inspector in Node is a bit further along. It's been a bit frustrating trying to find a single tool that gets all the basics down and just works. I'll also be giving WebStorm a try, but of course it's a commercial tool (and unlike PyCharm, lacks a community version).
