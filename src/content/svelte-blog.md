---
date: 2024-04-28
title: Did switching to Svelte make my blog better?
tags: javascript, frontend
---

No, but Svelte is pretty cool.

## Replacing my static blog generator

For the last 10 years, this blog was built with Pelican, a Python-based static site generator, with Markdown content and Pygments for highlighting code examples. This worked well, but I started thinking about replacing it with a JavaScript framework that would support component-based frontend development and adding some more app-like functionality when I feel like it.

There are various choices in this space, such as Gatsby, but I decided to step out of the React world and built myself a Svelte site based on my existing Markdown content.

Svelte is a relatively easy to learn preprocessor and component framework that feels pretty fluid to work with. It's been gaining currency as the "most loved" frontend framework since 2021. The [2023 StackOverflow survey](https://survey.stackoverflow.co/2023/#section-admired-and-desired-web-frameworks-and-technologies) still ranks Svelte as more "admired" than almost any other framework (narrowly beat by Phoenix, an even more niche Elixir framework), while being a hair more popular than Angular (which I admit surprised me).

In building the project, I referenced [_Let's learn SvelteKit by building a static Markdown blog from scratch
_](https://joshcollinsworth.com/blog/build-static-sveltekit-markdown-blog) by Josh Collinsworth and [_Build And Deploy A SvelteKit Markdown Blog
_](https://www.youtube.com/watch?v=RhScu3uqGd0) on YouTube by Joy of Code. I decided to do a few things differently, however, starting with building on Svelte 5 (which is still in preview, and required me to install `mdsvex` with `--legacy-peer-deps`) and also avoiding the API routes concept entirely since I'm only ever going to do static builds.

I pushed the site up to GitHub ([`jasonstitt/blog`](https://github.com/jasonstitt/blog)) -- it's not directly reusable, but some of it could be instructive.

## Svelte versus React

The last 8 years of my professional life have featured React (following a stint with Angular & AngularJS, which followed various things that shall not be named). Svelte and React are based on quite different ideas, so they feel different to work in. Although both have components that can be used as HTML elements, the way they get there is distinctive.

React is based on functional composition and on nesting HTML and JavaScript within each other. It's also based on replacements of immutable state, but in a way, that emerges from the functional compositon.

Svelte leans hard into being a preprocessor. It seeks to extend JavaScript with new primitives and to recontextualize basic HTML and JavaScript ideas using compilation.

Overall, I've thoroughly enjoyed the Svelte approach to web development. Putting `<style>` blocks in components, using normal CSS, and having it all automatically component-scoped, is dreamlike when compared to translating CSS into JSON, with property renames, and using hooks and callback-based theming.

However, the data flow in Svelte can feel a bit too magic. In a way, it reminds me of Ruby on Rails. In both frameworks, data defined in one place can just show up somewhere else, based on things like file naming conventions. The saving grace with Svelte is that it tends to do a decent job with _locality_, that is, the implicit data flow tends to be between adjacent files versus cross-project.

[_Understand How Data Flows In SvelteKit_](https://joyofcode.xyz/sveltekit-data-flow) at Joy of Code is a pretty good rapid overview of the data flows between files.

## Svelte + mdsvex versus Pelican

Comparing Pelican to Svelte isn't fair, since Pelican is a static site generator that happens to have templating, while the new site I built is a from-scratch Svelte project that happens to load Markdown files.

That being said, I expected not having a dedicated site generator to be a bigger deal, and it really wasn't. I'm sure it would have taken fewer hours to put this together if I'd had one, but the end result was pretty simple, espeically given that I like to customize and tweak heavily.

The biggest time impact on my migration was actually making my Markdown content, particularly my older posts, work on `mdsvex`. There were all kinds of issues. Some fun ones:

**Fenced code blocks**: Over the last 15 years I used 3 different code block styles in Markdown. The newer ones were all fenced (` ``` `), but some of the older ones used double colons (` ::python`), while others were simply indented blocks with no markup (for plain text `pre` blocks). All of these worked equally with the Python Markdown library I was using with Pelican, but to work with`mdsvex` I had to migrate all of them to fences.

The really fun part was, the error messages I was getting weren't just "you used the wrong formatting," they were implying that code in my code examples was failing to _execute_ when loading the Markdown file. That's what you get for using `import` as a loading mechanism rather than `fs`...

**Continuation backslashes**: I used a `\` at the end of a line in a `bash` code block. After converting to `mdsvex`, I noticed that the code was being rendered in the blog as a single line -- i.e. the prior Markdown parser was treating the `\` as content, while `mdsvex` was treating it as an escape within the Markdown itself.

**Title escaping**: Markdown for `mdsvex` has a preamble that looks like this:

```
---
title: Some great title
---
```

Titles sometimes have colons in them. This breaks the preamble parsing in `mdsvex` which appears not to be simply splitting on the first colon in the line. The fix is to quote the title. This of course requires also escaping quotes, which is done with doubled single quotes (`''`), not with slashes (`\'`):

```
---
title: 'Some great title: it''s more than just plain text'
---
```

## Weirdness: the `export let data` idiom

Overall, Svelte's preprocessor approach leads to some pretty elegant ideas (such as `<style>` blocks in components), but there are some oddities.

In order to make `{data}` available in my page component's HTML in `+page.svelte`, I put this script at the top:

```svelte
<script>
  export let data
</script>
```

Under the hood, Svelte is calling a `load` function defined in `+page.ts`. This `export` statement is then required in `+page.svelte` to expose the return value of `load` as `data` within the HTML template. (The mapping from a function named `load` to a field called `data` is framework magic).

This breaks from the usual semantics of `export`. The word `export` normally means to make something in the current file available to other files. But `export let data` in Svelte is making something from another file available to the current file. At the same time, it's also magically adding data to a variable that is declared without ever having an R-value.

This feels like a hack you would only find in a preprocessor-based framework. But it actually makes sense (just not intuitive sense) if you think through what's going on under the hood.

The `export` isn't there to let another module read the value of `data`. It's there to let another module _write_ the value of `data`. This is both why `export` must be used, and also why `let` is used over `const`.

## More weirdness: `.svelte-kit`

Another thing that started bothering me about SvelteKit was the way it treated its generated `.svelte-kit/` directory in source control.

Creating the site with Svelte generated a bunch of code, plus a `tsconfig.json`, under `.svelte-kit/`. It also automatically added `/.svelte-kit` to the `.gitignore` file. But it _also_ put this in the project's `tsconfig.json` file:

```json
  "extends": "./.svelte-kit/tsconfig.json",
```

In other words, the main config that is source controlled has a direct file path reference to some config that is not source controlled.

This is documented at the bottom of SvelteKit's [project structure](https://kit.svelte.dev/docs/project-structure#other-files-svelte-kit) doc.

> As you develop and build your project, SvelteKit will generate files in a .svelte-kit directory (configurable as outDir). You can ignore its contents, and delete them at any time (they will be regenerated when you next dev or build).

This is true, with the caveat that when you first check out a repo, or delete `.svelte-kit/`, your `tsconfig` will be different until you next run a command that regenerates the directory. This causes errors to show up in the IDE.

Looking through the content in `.svelte-kit/tsconfig.json`, it's unclear why it has to be dynamically generated, or which parts of it could vary over time -- i.e. if there would be any reason not to simply inline the config within `/tsconfig.json`.

Granted, the relationship status between Svelte and Typescript is "it's complicated." But Typescript is still a top-level option in SvelteKit, so I'd love to see the docs describe this more explicitly.

## Timezone issues with post dates

Non-datetime dates in client-side JavaScript have always been a source of problems. The date gets converted to a datetime at time 00:00, which then can be timezone-adjusted if not handled strictly in UTC, potentially shifting the date by a day when displayed.

This is a common issue, but I thought I would avoid it by statically prerendering all the content. However, when I built my site, I found that the dates all flashed and rolled back a fraction of a second after page load, meaning that they were being initally set by the static build and then rehydrating on the client side. The _reason_ static exports didn't avoid this issue is that I had to use a `+page.ts` rather than a `+page.server.ts` for my posts, which in turn is because the imported Markdown post objects weren't serializable.

The fix is simple enough -- set `timeZone: 'UTC'` in `toLocaleDateString` -- but it's an example of how even static sites aren't that simple under the hood now.
