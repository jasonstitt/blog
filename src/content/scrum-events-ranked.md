---
title: Scrum sprint events ranked from most to least important
date: 2022-08-01
tags: agile
---

Scrum defines a set of events that happen in each sprint. But are they all equally important? Not even close.

Here's my opinionated and unapologetic ranking, from top to bottom tier, of all the sprint events from the Scrum Guide, and one that isn't even there. This is from the perspective of a software developer after having worked with different scrum teams, operating under different org structures, by different leaders, that all somehow shared similar issues and patterns.

## 1. Sprint Review

Scrum is a product delivery framework, and this is the event that's about delivery of the product. More importantly, the process of showing off working software and getting real feedback on it is what justifies doing sprints in the first place. If there's no fast feedback cycle after each one, sprints are just arbitrary time blocks in a much longer actual delivery process, creating theoretical checkpoints that actually don't matter.

In other words, the sprint review is what gives the end of one sprint and the beginning of the next one any actual meaning.

Based on my observations so far, the sprint review may be the most-skipped scrum event, which is a shame since it's the most important.

Why is it skipped?

1. Because there's not enough that's actually done to show -- this should be an immediate sign of impediments to correct.
2. Because the stakeholders are too busy -- this should lead to questioning whether they are the real stakeholders and, if so, if the product's importance to the business is sufficiently clear.
3. Because software developers aren't used to showing their work to non-technical people and act as though they're showing work to each other, which drives stakeholders away -- either the product owner needs to be much more vocal, or developers need coaching, or both.
4. Because the upcoming priorities have already been set and feedback at this point won't matter -- this points to a lack of agility and, again, the sprints being arbitrary time units that don't contribute to de-risking development by allowing for adaptation.

## 2. Sprint Planning

Do a quick Google search for quotes about planning -- it'll save me the trouble of pasting them here. Short version: planning = good.

Think about what we'd be doing if we did only sprint planning and sprint review, and none of the rest. We'd be thinking deliberately about our goals and what to do to accomplish those goals. We'd be making sure that the work we have lined up is clearly understood and will contribute to our success, and getting a good start on determining how we'll do that work. Then we'll be seeing how it went and gathering feedback that directly feeds the next go-round. In other words, these two meetings by themselves can carry the process.

Without a sprint planning, we can still just pull directly off the top of the backlog (Kanban-style). However the sprint as an increment becomes less well defined, we lack a clear unifying goal for what working software to show at the next review, _and_ we depend even more heavily on refinement as a substitute.

## 3. Backlog Refinement (honorable mention)

Refinement meetings are a common practice that the Scrum Guide doesn't specify (but I'm still ranking them higher than some things that are in there).

The importance of refinement, as a practice, is an extension of the importance of sprint planning. One of the things that most determines success in software development is clarity of intent. The clearer the things in the backlog are to everyone who will be working on them, the more likely they will be to be able to deliver working software. A dedicated time period to make things clearer, which is also removed one step from the pressure of having to select a sprint backlog and begin work, therefore contributes directly to quality.

The Scrum Guide does specify that backlog refinement happens, but not as an event. Why should it be one? Because, as an ongoing and forward-looking activity that isn't tied to any specific issue with the team's current work, it's too easy to skip if it isn't scheduled.

## 4. Retrospective

The subject matter of a retrospective is important, and, in a way, that's why the event is less important than others.

The retrospective is meant to be the last event of the sprint and cap it off by discussing everything that happened within, including the review. Some of these things will be very pressing or urgent impediments, while others may be more nice-to-have improvements. This ends up with a pair of problems:

1. The most pressing impediments should already have been discussed before waiting till the scheduled time and can justify a breakout session rather than a recurring one.
2. The nice-to-haves tend to form an issue backlog that grows faster than it is resolved, and continually adding to it isn't very useful.

The event _does_ serve a useful function if it results in adding improvement items directly to the next sprint backlog. Otherwise, it's a general reflection opportunity. It's not that it shouldn't happen, but there may be more productive methods.

## 5. Daily scrum

This may seem like an odd choice for bottom tier because, to many people, Scrum is that thing where you do sprints and standups. How can this iconic event be at the bottom?

Basically, the world has moved on. 20-30 years ago, work was different. A short daily planning meeting solved the problem of team members not having pervasive communication. It helped set a pace to the daily work. A quick meeting to start the day also fit well into the rhythm of local office work. The "fantasy standup" goes like this:

1. Everyone works in the same office.
2. Everyone has the same daily schedule, so arrives around the same time and congregates.
3. First thing in the morning, people meet in a common area to kick off the day together.
4. They then go about their day.

Of course today, the situation looks more like this:

1. Team members work from home, in different time zones, and with flexible work schedules.
2. Everyone is on Slack or equivalent and is constantly and asynchronously discussing plans and impediments.
3. The daily scrum ends up being a random Zoom meeting in the middle of most people's days, not the beginning.
4. Because it's the middle of the day, it's interruptive and the useful subject matter has already been discussed in chat.

The daily scrum is also the meeting that's most prone to micromanagement. At worst, someone other than the developers "runs" the meeting and quizzes everyone about what they did and what they're going to do. But even if that doesn't happen, just making the meeting exist all the time is potentially unnecessary.

## Coda: the importance of face time

In recent years knowledge workers have been talking a lot about two themes: remote or location-independent work, and "that meeting could have been an email." It's possible to go to an extreme of hardly ever interacting synchronously with your coworkers.

In software development I've found that understanding context is one of the most important factors in success. Product context, technical context, and people context are all important. One of the best ways to build that context is to just talk to people. Getting rid of as much face time as possible can make that harder. Then again, a structured meeting doesn't necessarily contain much genuine interpersonal connection. That's why we need a different direction.

Our entire day is now purpose-driven and organized by various technical means. The interactions we need to carve out now are less, not more structured. An agenda-driven meeting and a short timebox where everyone tends to just check in are equally unsuited for this. "Events" may not even be the right idea. What we actually need is a sense of presence, which will probably end up being solved technically by continuing to reduce friction of switching from asynchronous to synchronous interactions at any time.
