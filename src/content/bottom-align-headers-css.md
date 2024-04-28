---
title: Bottom-align headers with CSS without a container
date: 2014-12-05
tags: css
---

<style>
.block {
    height: 100px;
    font-size: 18pt;
    background: #ddd;
    box-sizing: border-box;
    padding: 15px;
}
.bottom {
    display: table;
    width: 100%;
}

.bottom:before {
    display: table-row;
    height: 100%;
    content: "";
}
</style>

When you place text in a block element in HTML with a defined `height`, the text normally ends up at the top of the block. In some cases you may want to change this; for example, maybe a heading or caption will have a background image and should align to the bottom of the box for aesthetic purposes.

In other words, we want to go from this:

<div class="block">Some text</div>

To this:

<div class="block bottom">Some text</div>

It would also be great not to require additional HTML elements to make this work. Fortunately, it's possible, albeit with some hackish use of `before` and `display: table`.

```css
.bottom {
  height: 100px;
  background: #eee;
  display: table;
  width: 100%;
  box-sizing: border-box;
  padding: 15px;
}

.bottom:before {
  display: table-row;
  height: 100%;
  content: '';
}
```

Tested on current versions of Chrome, Safari, Firefox, and IE, and even back to IE 8.
