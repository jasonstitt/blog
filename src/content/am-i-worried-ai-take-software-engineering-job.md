---
title: Am I worried about generative AI taking my software engineering job?
date: 2024-01-06
updated: 2024-05-31
tags: llm
---

It "should" take general AI to fully replace me as a software engineer – and if I'm being stuffed into an amniotic pod and harvested for my life essence to serve a machine empire, the last thing I'll be worried about is my job, I suppose.

But, given how the last year has gone, it would be weird not to be a little nervous about AI taking jobs. It's certainly the intent of a lot of people to replace jobs with AI. What's less clear is in which cases they will succeed. The tension between technological innovation and job disruption is nothing new. But it does feel like something's changing – like we're cresting the hill of creative destruction.

_Creative destruction_ is an idea associated with Joseph Schumpeter, an Austrian-American economist. In the 1940s, he described capitalist economies as being in a state of continual disruption, a cycle of innovation and obsolescence, which is painful in the short term for those whose livelihoods are affected, but is vital for long-term economic growth and improvement in living standards.

The idea wrapped up in this and other strains of techno-optimism is that we've replaced lots of jobs with technology already, and we still have jobs for people now, so this will likely continue in the future. The inductive argument is attractive. Past job destruction didn't result in high unemployment today, therefore current job destruction won't lead to high unemployment later.

It's worth questioning, however, whether the job fountain can never run dry. AI is different from previous job-replacing innovations in terms of the sheer number of different tasks it can automate and its ability to be rapidly extended to take on new tasks, versus the more special-purpose machines that replaced jobs in the past.

## Is software safe?

Here's how I see it. If we're building custom software in the first place, some things have to be true. We're not just using existing off-the-shelf, so we must need something fairly specific, and want control over the decisions that we make.

Software is made of decisions, not code. Not just leadership or product decisions. Anywhere from hundreds to thousands of picky little fine-grained decisions go into an application, and make it different from other applications. Somebody has to make all those decisions. The code is just how we _encode_ the decisions we make.

So far, LLMs are showing themselves to be strongest at rephrasing, slightly extending, or remixing existing content and ideas. When they appear to make "decisions," they're actually predicting output based on siuational averages and probabilities. Based on the progress LLMs have made and the enduring issues such as hallucinations, I think we'll continue to find that high-quality remixes and "typical" output can be generated, but anything original requires substantial human guidance.

Of course, software has a lot of boilerplate code involved, and generative AI is surprisingly good at writing it, which I'm fine with, because then I don't have to. But we've been eating away at boilerplate _the whole time_, with libraries, frameworks, and higher-level languages. It's not like we're trying to keep that stuff around.

On the other hand, I have to acknowledge that not all software we build is truly differentiated. Sometimes we just want something that almost already exists — "X, but with Y." It's possible that generative AI will start taking over these use cases and reduce the demand for custom software development.

## But what about agents?

Agents are an emerging pattern that seek to turn LLMs into end-to-end workflow automation by chaining together queries in order to create something that can approximate decision-making and self-reflection. I say approximate — I'm not sure, honestly, whether it's an approximation or the real thing. I don't know, and I'm not sure if it is known.

My intuition, which could well be wrong, is that a language function alone, combined with a smoothed-over average of published human knowledge, can approximate things like decision making and cognition. That there's a ghost in the machine – a flicker on the wall where we see well-constructed language and think there must be an intelligence behind it, even if it's a clever average and recombination of existing text.

Therefore I still see these agents as mere tools. But we'll see.

I'll return to my point above: the fact you're writing new software means you've already decided not to use existing software, which means you want something pretty specific. That implies specific decisions and design, whereas LLMs are better equipped to create remixes, averages, or "normal". You won't always want a remix.

Then again, some applications are just recombinations of existing ideas. Spending less human time on those is probably not a bad thing in the long run.

I'll also point out that we've been here already with no-code tools. As a software engineer, I've been told that projects were going to be done "without engineering effort" due to no-code tools. I've also been called in on those same projects, because it turns out that the complicated thing isn't just writing code, it's getting a system to work and solve a problem, regardless of whether code is involved.

## But what about junior devs?

A traditional approach to junior devs is that they work on subproblems carved out for them by more senior devs. Perhaps writing a function that solves a specific and fairly well-defined problem.

That's exactly what LLMs are good at. Writing a function that solves a specific and fairly well-defined problem is core LLM territory. They'll do it faster and cheaper, and although they don't always get the answer right the first time, they take feedback well, arguably better than many people on average.

For example, I recently had GPT-4 implement a niche use case for me, using Pandas to do random selection, with replacement, of hundreds of groups of elements in an array. That is, it randomly picked groups of records in which the grouped records stay together, while maintaining a high iteration throughput. There probably aren't a lot of published posts with this specific function.

The first two solutions it gave me performed at less than a quarter of the needed throughput, but after taking two directional suggestions from me, the third was exactly what I needed. And the first two ran and were accurate, they just weren't fast. The whole chat took 20 minutes, including testing. That's the kind of thing that might have made an interesting junior dev assignment. It wouldn't have taken 20 minutes.

I haven't figured it all out, but here's my suggestion.

Junior devs need to do the same things as senior devs, but at a smaller scale.

So if LLMs change what we do, if they push us further toward being problem-solving decision makers vs. coders (something that, remember, frameworks and tools have already been doing), then they need to change what we all do. So the profession changes, but we can't jeopardize the idea of bringing up early-career talent (and producing new seniors.) At least, that's an idea.

## Where are we on the hype cycle anyway?

LLMs have a hype cycle like a sine wave, propelled by the speed of development so far on the one hand, and by overinflated claims about AGI and public mistakes on the other.

I'm fairly convinced that AGI talk is just to keep LLM companies in the news cycle, for which it's working, with the longer term consequence that people are entering the trough of disillusionment more quickly as they pull back the curtain and realize there isn't a fully formed brain here.

Thing is, even as people are becoming disillusioned (by, for example, being told by the best efforts of a multi-billion-dollar company to put glue on pizza), more and more functional LLM features are being added to products.

What's been wrought with LLMs isn't fake. Code generation works. It doesn't work perfectly. But the genie's bottle has been uncorked. And unlike random, general factual questions, code generation can be functionally verified and refined, so I have to believe it will get better (faster, even, than general-purpose answerbots). And that means more changes ahead.
