---
title: Prometheus counters don't exist (and what they really do)
date: 2023-05-13
tags: observability, python
---

A bit of cursory research into the [types of Prometheus metrics](https://prometheus.io/docs/concepts/metric_types/) reveals that they include:

- Gauges, which are the current state of something updated over time
- Counters, which are incremented over time
- Histograms, which count different samples in buckets

This is all true. It's also false, and I've found that this can cause some confusion with developers who are trying to implement their own Prometheus metrics for their services.

More precisely, counters and histograms are both client-side concepts that, from the perspective of the actual Prometheus metric series themselves, and the Prometheus server, are really just ways of using and organizing gauges. A counter is, server-side, a gauge. The increment is handled entirely client-side (on the sending side).

## Example

Let's look at an example. Here's some Prometheus client code that publishes a gauge and a counter:

```python
from prometheus_client import start_http_server, Gauge, Counter
import time

start_http_server(8000)

g = Gauge('metric1', 'first metric')
c = Counter('metric2', 'second metric')

g.set(1)
c.inc()
```

And here are the published metrics:

```txt
## HELP metric1 first metric
## TYPE metric1 gauge
metric1 1.0
## HELP metric2_total second metric
## TYPE metric2_total counter
metric2_total 1.0
```

Let's update the gauge and add to the counter:

```python
g.set(2)
c.inc()
```

Now here are the published metrics:

```txt
## HELP metric1 first metric
## TYPE metric1 gauge
metric1 2.0
## HELP metric2_total second metric
## TYPE metric2_total counter
metric2_total 2.0
```

Try to find a difference in how the published metrics look. While the comments tell you that the metrics are of differnet type, the metrics themselves look the same. The counter is a gauge wrapper. The Python client is tracking the state of the counter in memory and publishing the current total.

Since the counter is tracked in memory, what happens to the counter state when the process restarts? It isn't saved. It goes back to 0. But here's where Prometheus does something special. Part of the definition of a counter is that it's supposed to only increase, never decrease. Which means that if a counter resets to 0, that doesn't mean the value decreased, it just means the series restarted, so you just keep adding from there.

In practice, this is handled query-side in PromQL by the implementation of the `increase()` and `rate()` functions. For example, the way we'd typically query a counter to produce a line graph in Prometheus or Grafana is:

```
sum(rate(metric2_total[5m]))
```

The `rate()` and `increase()` functions will take care of resets for you; you don't actually have to deal with them.

## Short-lived processes

Somewhere this really starts to matter is serverless functions, cron jobs, or other short-lived processes. You want to be able to count things like the number of records processed by functions or jobs.

Since Prometheus is based on a pull model (scrapes) vs. a push model, it's great for long-lived service processes, but a process that might terminate before the next scrape interval might not finish updating its metrics. Not to mention that a function that doesn't publish an HTTP endpoint won't have a way to be scraped.

What prometheus offers for this is a [push gateway](https://github.com/prometheus/pushgateway), which is a service that stores metrics for you (using a push model) and then publishes them for Prometheus to scrape (using its pull model).

Unfortunately, the regular push gateway doesn't handle counters from ephemeral processes, because, remember, counters are a client-side concept.

> The Pushgateway is explicitly not an aggregator or distributed counter but rather a metrics cache. It does not have statsd-like semantics. The metrics pushed are exactly the same as you would present for scraping in a permanently running program. If you need distributed counting, you could either use the actual statsd in combination with the Prometheus statsd exporter, or have a look at the prom-aggregation-gateway.

The only way to handle counters in jobs would be to publish a separate label value (i.e. a new metric series) for every single job run (or serverless function execution), which could add up to a huge number of separate series and violate Prometheus' expectation of labels having relatively low cardinality.

So the solution to this is the [aggregation gateway](https://github.com/zapier/prom-aggregation-gateway) – basically a database that persists counters for you separate from your application code.

Unfortunately, the aggregation gateway doesn't support gauges. In the readme's own words:

> Gauges are also added up (but this may not make any sense)

(I take issue with the word "may" here.)

So you'd need to run both gateways. At this point I'm half-convinced it may be better to just store metrics that need a push pattern in a database and run a simple exporter that exposes the database counts, rather than try to use off-the-shelf gateways.

However, there's yet another open-source project that seeks to solve all these problems which is the [Gravel gateway](https://github.com/sinkingpoint/prometheus-gravel-gateway). Gravel is specifically oriented toward the use cases I'm talking about here and it adds counters and histograms while replacing gauges. The author's post, [I Think Prometheus Is Impossible for FAAS Applications](https://blog.colindou.ch/posts/prometheus-for-faas/), is also a good read on this topic.

## Note on histograms

A histogram is basically a collection of counters (labeled with different "buckets") which, as we've now discovered, is just a collection of gauges server-side. For example, this histogram definition:

```py
h = Histogram('metric3', 'third metric', buckets=(1, 10, 100, float('inf')))
h.observe(5)
```

Results in this metric export:

```txt
## HELP metric3 third metric
## TYPE metric3 histogram
metric3_bucket{le="1.0"} 0.0
metric3_bucket{le="10.0"} 1.0
metric3_bucket{le="100.0"} 1.0
metric3_bucket{le="+Inf"} 1.0
metric3_count 1.0
metric3_sum 5.0
```

That means the overall semantics are the same as counters, and so are the aggregation implications.
