---
title: I turned on Aurora I/O Optimized and started sleeping at night
date: 2023-06-20
tags: aws, data
---

$0.20 per million I/O operations. It sounds like one of those tiny cloud costs that's practically a token and barely worth worrying about, due to words like "cents" and "million" being involved. This is what AWS Aurora normally charges for I/O, on top of runtime and storage costs.

I have to say, Aurora has been good to me overall. It's a fully managed database, Postgres-compatible in my case, that separates storage from compute, replicates 6 ways, and supports a dynamically sized pool of reader instances, cloning, detailed performance stats, point-in-time restore… etc. It holds up under query pressure and keeps trucking even when the metrics start looking iffy.

It's even generally worth the cost as long as you can put enough usage on it – it's best for either a mid- to large application or a shared service.

But this I/O line item was the bane of my existence.

## The problem...

It wasn't that this line item was always high – in a smallish cluster I maintained, it was often around $1 a day. But when devs deployed badly tuned queries that ran in data pipelines or other high-volume applications, it could shoot up to $50 or even over $100 per day instantly and stay there until fixed. (Needless to say, pre-deployment testing wasn't catching all of these, some of which depended on specific ingest patterns).

No small organization wants an extra $3,000 a month in their infra budget for no reason.

Since devs didn't have direct visibility into the cost problem, I had to catch it and then get the fix prioritized before it lasted too long and caused a budget issue. And since AWS's built-in budget anomaly alerts would only kick in after about 2-3 days of increased costs, I had to build some of my own notifications and be prepared to be very responsive.

Then, in May, AWS released a new mode called I/O Optimized – the latest entry in the approximately 100 ways you can alter, juggle, or move around costs using AWS. (Reserved instances _and_ savings plans? Why, I feel spoiled for choice.)

I/O Optimized mode is a tradeoff. The base (fixed) costs are higher, but the cost per I/O operation is eliminated. The official AWS recommendation focuses on workloads in which I/O costs are more than 25% of total costs, however, the thing about these I/O costs is that they're variable – in some cases, highly variable.

## So we tried it...

We turned on I/O Optimized mode, and the cost peaks disappeared. I carefully watched the average monthly cost, and lo and behold, it was lower as well. That might not be true for everyone, but it was for us.

In theory, the mistuned queries could have moved on to causing CPU or memory problems instead of cost problems, but in practice, for us, this was somewhat true but didn't rise to the level of causing degraded service – indicating to me that I/O was the real issue – and provided us with more leeway to solve the problems.

Granted, I/O optimized mode comes with higher fixed costs, and depending on your workload, the increased fixed costs could exceed the variable costs they eliminate. But it did give me something valuable: sleep.
