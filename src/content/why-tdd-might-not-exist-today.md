---
title: Why test-driven development might not have been created today
date: 2023-09-10
tags: testing
---

Test-driven development was a technical achievement.

That is, people didn't just suddenly value tests more, or change how early they wanted them in the development process, or suddenly get faster at writing them. What improved was the tools.

In one of the original academic papers from 1970 credited with establishing "waterfall", the eternal bugbear of "agile," there's an illustrative line about testing:

> Every bit of an analysis and every bit of code should be subjected to a simple visual scan by a second party who did not do the original analysis or code but who would spot things like dropped minus signs, missing factors of two, jumps to wrong addresses, etc., which are in the nature of proofreading the analysis and code. Do not use the computer to detect this kind of thing - it is too expensive. (_Managing The Development Of Large Software Systems_, Winston Royce)

I'm fascinated by reading old documents about software development, which was simultaneously lower level, but also much more complex to execute.

"It is too expensive" – in other words, we're not talking about a failure to consider using test automation to create a lower cycle time back in the 70s, or even ideological dismissal. It was a tools problem. If it had been cheap it would have happened. But it was expensive so it didn't.

Along comes the 2000s and 2010s, and now we have fast-running unit test frameworks with tons of convenience methods, mocks, filesystem watch, etc. It becomes practical to write tests alongside code under test. Nobody's going to be doing it otherwise. It has to be practical. This is an area where developers show consumer behavior – most will usually not workshop their own test tools, but will use existing ones, and will use them in proportion to how easy they are to use.

If you don't have easy, quickstart, out-of-the-box tools like Mocha, Chai, Jest, Pytest, etc., you don't have TDD.

But now along come distributed systems, full of glue code dealing with HTTP requests and queues and database queries, with micro-logic in between. Mocking & faking get harder. Also, more functionality comes from library dependencies that have opaque behavior and interact with external services, but don't come with their own fakes. Some major libraries have fakes libraries offered by third parties. Most don't.

Fast, easy, iterative testing suffers. End-to-end testing becomes a complex project. If TDD hadn't been established already, I'm not sure it would be created from scratch in this environment – even though its value is still high. Not without better tools.

The solution here is still more technical than anything. If testing is fast and easy, people will do it early and often. Tools development needs to keep pace with systems development.

Whether you work on testing, development, productivity/delivery, or any related area, it's worth thinking about tools and tools development as a way of promoting testing that works to reduce cycle time and keep coverage high. That could include a standard set of third-party tools with well-trod paths to use, or custom built tools and workflows.

Otherwise, the test practice will be less effective – either reducing adoption, or increasing "perfunctory" adoption that occurs when testing is required but not easy.
