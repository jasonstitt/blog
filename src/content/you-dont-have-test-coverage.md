---
title: Why you don’t really have test coverage
date: 2023-07-09
tags: testing
---

So your test coverage is 80%. Great. What does that mean?

First of all, you do want test coverage. It's useful because it makes sure your tests are sufficient (right?) But when a minimum coverage level is chosen – and 80% is a common enough number, though some teams will choose a higher or lower one – what actually makes that percentage sufficient?

Here are some of the complicating factors in test coverage:

## Baseline coverage

The first thing you need to know about coverage is that you get a certain amount of it just by importing your modules, without calling anything. I've seen this amount be around 15-20%, give or take, depending on the codebase and language. This includes any declaration code – imports, functions, constants, and so on.

Interestingly, if you split your code up into a larger number of smaller functions (which to an extent can improve testability and readability), this baseline coverage will increase because all of the function declarations count as lines on import.

Because a certain amount of line coverage is free, it discounts the "value" of your final coverage number. Not necessarily to the point where it's worthwhile to subtract anything out of the final number, but it should lead to questions about what an 80% or any other non-100% number actually indicates.

## Core logic coverage

In any given codebase, some of the code will be the really core logic while the rest will be supporting code.

Let's say there's an important proprietary algorithm that runs your business. That should be tested every which way, right? But it might be under 100 lines of code. Whereas all the input/output, data formatting, and boilerplate surrounding it could be thousands of lines, especially with a UI. So you could cover everything except the core algorithm with tests and end up with 80-95% coverage. The score is good, but the result is not.

Coverage reports don't know one part of your code from another. Well, except for the filenames. But coverage reporting is typically aggregated at the repo level anyway.

The only way to address this is to be familiar with your codebase and ensure that tests exist for core logic. The percentage in the report isn't going to do it for you (again, unless you go with 100% as your standard – which I managed to make happen on one team I led, but just one… and it may not be worthwhile for other reasons.)

## Assertions

Coverage shows that the code ran during the test, but not that the code's output was verified in any way. It's possible to "exercise" the code without assertions and get a high coverage score.

I've even seen test suites where up to half of the tests didn't assert anything. They effectively just tested that the code didn't crash. But the line coverage met and even exceeded the defined standards.

Again, the quantitative measurement (coverage %) is helpful but not a substitute for understanding the codebase.

## Database queries and other callouts

A database query can count for as little as one statement, while having the complexity of a function, including potentially multiple "branches" via case expressions or left joins.

Unit testing isn't that effective for database queries, so it's more important to understand that this is happening than to try to fix it, per se.

If you want to maximize the benefit of line coverage to your database code, I think the way to do that is to separate as much query code as possible into a data access layer (DAL) while the logic on top exists in fully tested functions. However, if your service is really dependent on the database you'll probably want to tear away from the purity of unit testing and run a local database for the tests anyway.

## Branch vs line

Line coverage is kind of the "default," but branch coverage deserves some consideration as well. It helps you focus on whether you're testing all of the paths through your code, rather than just the main one.

Branch coverage isn't perfect, though. It only counts things that are explicitly considered branching statements/expressions in your language.

For example, consider a line of code like:

```python
foo = bar.baz()
```

That's one branch. Except that in languages that don't have null-safe type systems, there's a hidden "branch" here where `bar` is null. Your branch coverage can be 100% with no null checks.

## Coverage summary

(See what I did there?)

Coverage monitoring is one tool in the toolbox. It's necessary but not sufficient for ensuring your tests matter. Even 100% line and branch coverage doesn't ensure you have assertions, for example.

What we're really trying to do with tests is make a prediction. We predict that production will work correctly based on information from everything pre-production. You can't do that if the tests don't exercise the code, but it's the qualitative working knowledge of your code that's going to give you the edge in making that prediction successfully.
