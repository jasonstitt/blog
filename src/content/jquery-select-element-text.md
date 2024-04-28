---
title: Select text with one click with jQuery
date: 2010-07-19
tags: javascript
---

Quick selection and copy-to-clipboard actions are a convenience for your visitors. This jQuery snippet selects text (outside of an input or textarea, which uses a different method) with a single click.

It's good for URLs, including shareable or trackback URLs, as well as any snippet that needs to be copied easily (but for which you don't want to implement a Flash-based solution for copying directly to the clipboard).

```javascript
$(function () {
  function selectText(field) {
    if (document.createRange) {
      var range = document.createRange()
      range.selectNodeContents(field)
      window.getSelection().removeAllRanges()
      window.getSelection().addRange(range)
    } else if (field.createTextRange) {
      var range = field.createTextRange()
      range.moveToElementText(field)
      range.select()
    }
    field.focus()
  }
  $('.quick-select').click(function () {
    selectText(this)
  })
})
```
