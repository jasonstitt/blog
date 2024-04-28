---
title: You can't deliver a story point
date: 2021-10-24
tags: agile
---

"We delivered 30 story points last sprint."

Let's think about this.

## What are story points anyway?

Story points are an abstraction of cost. The need for story points emerged from the inherent imprecision of software estimation, which leads to endless hand-wringing over how many hours a task will take, usually leading to an estimate that's wrong anyway. Story points allow for a method of estimation based on two things: the law of averages and empiricism.

Story points lean into imprecision, asking developers to quickly estimate medium-to-small chunks of work using a numeric scale that's relative to work they've done before. Although each individual estimate is likely to be wrong, on average the inaccuracies should even out, leading to a reasonable estimate over the course of multiple sprints of work.

The empirical layer is the measurement of "velocity" (bad name, but what it's called). This is the number of story points that were successfully completed in prior time intervals, which can be averaged and then used to predict an upcoming time interval. This means that, even though story points are imprecise and inaccurate on a per-story basis, and have a variable conversion to time, they can still result in a reasonable prediction.

Story points aren't part of Scrum, but they are often used with it, meaning the stories go into sprints and the velocity is per-sprint. Actually [they emerged from XP, and their possible creator regrets how they have been misapplied](https://ronjeffries.com/articles/019-01ff/story-points/Index.html).

Story points often follow a Fibonacci sequence, meaning the values used are 1, 2, 3, 5, 8, 13, and maybe 21. Besides being nerdy, the reason for this is that the numbers get further apart as they get bigger, which creates an inherent margin of error. Given that we're leaning into imprecision, it's not useful to spend time debating whether something is an 8 or a 9. That will wash out.

## Don't deliver costs

There's one simple problem with "delivering" story points: they're a cost-side metric, and we should be delivering value, not costs. If you spend a day painting a house, you didn't deliver a day, you spent a day and delivered a painted house. And if a different painter spent two days to paint the same house, they didn't deliver twice as much as you did.

The number of story points completed isn't even that interesting in determining real costs, because points represent a relative, not absolute value. The actual opex cost of running a development team is based on their compensation which is steady over time, so any week or month is going to have a constant cost, except when there's a personnel change. The number of story points completed each interval adds up to a fixed cost, regardless of how many points that was, so the dollar cost per point varies.

So if you deliver points, you're really just saying "we worked for X weeks" because that's what the total number adds up to.

What's really interesting when talking about delivery is what items you completed and what value they inherently bring, not how much relative effort they were.

If you want to talk about value delivery numerically, there are a couple of options. One, figure out actual dollars, if your product metrics allow for that. Two, assign some sort of value points to stories based on customer interviews, surveys, and research. This could also be useful for value-based prioritization. Otherwise, value should be framed qualitatively in terms of the useful product increment that was delivered (the painted house).

## Velocity isn't productivity

Bonus question: "How can we increase our velocity?"

Simple! Adjust the relative scale used for estimation upward so that everything gets more points. This will increase velocity with no effort.

Of course the real answer is that it's the wrong question. Story points represent cost, not value, so it's senseless to ask how to get more of them. Also they are relative, not absolute, so the total number of them always adds up to the same dollar cost. When you realize that story points represent a proportion, the idea of "increasing velocity" should disappear. What you really want to do is increase value delivered.

Furthermore, there's another reason that higher story point totals aren't a positive. Story points are going to be different for more and less skilled teams because they basically represent how daunting the team finds a story to complete. So an inexperienced development team could rate something an 8 because they find it quite daunting, but an experienced team that knows how to do it might rate it a 3 or a 2. This is the same work, the same value, and the more experienced team might even do a better job, increasing value further, but they're doing it in a fraction of the story points.

So there are two things that could happen as value delivery increases: points-per-story decreases while velocity remains flat, or points-per-story remains flat while velocity increases. Both are possible because points are relative and not a fixed unit. Both are the same good outcome.

We shouldn't look at "number of points" as something to be increased over time.

Unfortunately, the name "velocity" makes people think the number indicates how fast we're moving, but it literally doesn't have the ability to do that. Everyone working with velocity, especially managers, needs to come to terms with this. Probably we'd all be better off if it had been named something relatively uninteresting like "rolling abstract work average" instead so people didn't think it was inherently valuable.

## How to use story points

Story points and velocity have one primary use: to predict capacity for upcoming time intervals. If you keep a running average of points worth of stories completed over time, you can project that forward. It's also probably a good idea to monitor the variance over time. If you're doing drastically different point numbers at different times, that means your predictive ability is pretty low.

Another thing these metrics can be used for is figuring out proportionally where your efforts are going. So if you tag your stories with categories or other information, and divide points per category by points per sprint, you can get percentages by category. Remember, story points are relative, so while counting points is a no-go, dividing them by the total points in a sprint or other interval is OK because you get a proportion.

In some organizations this is also used for capex/opex tracking. Multiply team cost per sprint (in dollars) by percentage of capitalizable work. This can prevent the need for hours tracking, which may prevent some good developers from quitting.

## Delivering more value

Hopefully by this point, I've persuaded you that story points aren't value and velocity isn't productivity. There are numerous ways we could get at the actual value delivered, from the qualitative, itemizing working features, to the quantitative, such as customer satisfaction, sales, or utilization metrics. All have their own complexities and limitations, but even just a bullet list of features is better than estimation points.
