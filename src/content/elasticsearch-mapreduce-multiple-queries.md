---
title: Elasticsearch mapreduce aggregations that correlate multiple queries
date: 2020-06-04
tags: database
---

Besides document search and log analysis, Elasticsearch can excel at fast aggregations for dashboards. But once your analysis starts getting more complex than simple numbers or graphs, performance can start to be a real challenge.

A great example of this that I worked on is comparing or combining different queries. It can get expensive to do this using regular filters and aggregations, especially if you need to compare more than two or three queries. On the other hand, pulling record sets out of Elasticsearch to analyze in code is basically impractical for performance reasons. So we want a way to ask analytic questions about multiple subqueries that is performed entirely in the Elasticsearch engine and uses a minimum of round trips.

Some of the questions we can ask this way are:

- _Overlap_: How much overlap is there among combinations of several complex subqueries?
- _First-group_: How many documents match each of an ordered set of subqueries, excluding the matches of all previous subqueries?
- _Exclusive_: How many documents match exactly one of multiple subqueries, excluding all overlaps?

You could think of more. This is just a start.

The tool that Elasticsearch gives us for more complicated questions than we can answer with a simple query is [scripted metric aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-scripted-metric-aggregation.html), a.k.a. MapReduce. Using scripted metrics aggregations, we can apply a map script to each document matched by our query, then aggregate all of our results together using whatever method we like. However, the map script has only limited access to the fields of the document, and we want to run potentially complex subqueries using all of the different types of filters we have available in Elasticsearch. That's the interesting part I want to show you.

## First, a few things that don't work

The brute force answer to this type of question is multiple queries. For example, take each of your overlaps and run it as a separate boolean query. As you add more subqueries, this approach really starts to pile up as you have to run more and more queries, and each one has more and more boolean clauses in it. I had to implement "first-group" with up to 20 queries in a row. The brute force approach was lagging hard after the first several.

There's also a blunt MapReduce approach that won't work. You could perform a map-reduce on all records (`"match_all": {}`) and perform all filtering within Painless code. This doesn't use the inverted index properly and does very expensive field data lookups. It won't perform.

You might wonder if this is a facets use case. Not quite — facets are typically simple attribute counts, whereas this approach involves arbitrarily complex subqueries. Facets also look at independent overlaps of field values with the current search query, not multiple overlaps of subqueries.

Finally, how about named queries? Can we use `_name` on our subqueries and somehow recover those counts? Well, no. Elasticsearch does support named subqueries, so it would be great to be able to actually do something with those. Unfortunately, [named query outcomes aren't available in scripts and this would require Lucene changes](https://discuss.elastic.co/t/terms-aggregation-on-named-queries/62595). So making use of the names would require pulling the documents out of Elasticsearch to analyze elsewhere, and this won't perform.

## The solution: score as a bitset

Somehow, our map script needs to learn about what subqueries our documents match. Although we can't get access to named queries, and looking up field data is very slow, there's one thing that always comes through that we can play with: the score. [Score is a value that Lucene calculates](https://lucene.apache.org/core/3_5_0/scoring.html). Normally, it's based on how well the document matches the query, and is meant to be used for ordering results best-first. But what if we threw all that out the window?

In this solution I'm going to be using two different features to manipulate score: `constant_score` and `should`. The first does what it sounds like: it boosts the document score by a fixed amount if the filter query matches (and 0 if it doesn't match). The `should` clause of a `bool` is used to implement a boolean `or`, but what it actually does is sum the scores of its children. This effectively acts like a boolean `or`, since a bunch of 0 scores will result in a 0, and any positive score will result in a positive. But it's important that it's doing an actual sum, not producing a fixed result.

Combining these two features, each of our subqueries will be in a separate `constant_score` block, all of which will be inside a `should` that will sum their scores. So that we can recover the individual query matches later, each score boost will set a bit: 1, 2, 4, 8... etc. The `score` will then stop being a ranking value and become a bitset of subquery matches.

This whole example is [available in a GitHub repo](https://github.com/jasonstitt/elasticsearch-score-bitset). I'll be showing the highlights here, but the example code includes things like script deployment to the local instance.

## A test dataset

Let's run an Elasticsearch server locally:

```text
docker run --name bitset_example -d -p 9200:9200 -e discovery.type=single-node elasticsearch:7.6.2
```

Now, we want some sample data that will have significant overlap among some different values that we can query:

```python
from itertools import permutations
from elasticsearch import Elasticsearch, helpers

def sample_data(n):
    for apples, bananas, pears in permutations(range(n), 3):
        yield {'_index': 'bitset_example', 'apples': apples, 'bananas': bananas, 'pears': pears}

for _ in helpers.parallel_bulk(Elasticsearch(), sample_data(100)):
    pass
```

This test dataset, while overly simplistic, will give us some overlapping values to work with. In a real use case I'd be expecting to filter on multiple attributes and perhaps nesteds and joins as well. Here, we'll simply filter on some combination of these numeric values, but keep in mind that this method should support arbitrary queries.

## The query

The query below shows some very simple subqueries, and only three, but keep in mind that the `range` filters could be replaced by `bool`s with however many other filters in them. This query template is actually going to be the same for all of the types of questions above; what changes is the content of the scripts.

```json
{
  "size": 0,
  "query": {
    "bool": {
      "minimum_should_match": 1,
      "should": [
        {
          "constant_score": {
            "boost": 1,
            "filter": {
              "range": {
                "apples": {
                  "gte": 50
                }
              }
            }
          }
        },
        {
          "constant_score": {
            "boost": 2,
            "filter": {
              "range": {
                "bananas": {
                  "gte": 50
                }
              }
            }
          }
        },
        {
          "constant_score": {
            "boost": 4,
            "filter": {
              "range": {
                "pears": {
                  "gte": 50
                }
              }
            }
          }
        }
      ]
    }
  },
  "aggs": {
    "exclusive": {
      "scripted_metric": {
        "init_script": {
          "id": "bitset_example_init"
        },
        "map_script": {
          "id": "bitset_example_map"
        },
        "combine_script": {
          "id": "bitset_example_combine"
        },
        "reduce_script": {
          "id": "bitset_example_reduce"
        }
      }
    }
  }
}
```

## The scripts

This example shows the "exclusive" case.

These scripts are stored in Elasticsearch using the [stored scripts API](https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-scripting-using.html#modules-scripting-stored-scripts). (See the [example code]() for a deployment technique).

The `bitset_example_init` script merely needs to set up a data structure. In "real life" this will likely need to be dynamically sized.

```groovy
state.resultBuckets = [0, 0, 0];
```

Next is `bitset_example_map`, which has the biggest job. It unpacks the score bits and performs analysis. (In this case, looking for exclusive matches).

```groovy
int score = (int)(_score + 0.1);
int numQueries = 3;

for (int i = 0; i < numQueries; ++i) {
  int mask = 1 << i;
  if ((score & mask) > 0 && (score - mask) == 0) {
    state.resultBuckets[i]++;
    break;
  }
}
```

`bitset_example_combine` is simple again. If `map` produced a collection, this is where you would aggregate the collection, but it's less interesting when using counters. Note, the Elasticsearch docs actually say that combine is optional, but it's not. It's been required for a while.

```groovy
return state.resultBuckets;
```

Finally, `bitset_example_reduce` is a simple aggregator of all the individual shard result sets.

```groovy
ArrayList resultBuckets = [0, 0, 0];
int numQueries = 3;

for (shardResults in states) {
  for (int i = 0; i < numQueries; ++i) {
    resultBuckets[i] += shardResults[i];
  }
}

return resultBuckets;
```

And that's it! If you run the example code from GitHub, you'll see that it spits out three matching values (they're the same because the sample data is symmetrical). The value also matches a "brute force" style check of doing a single aggregate using a filter query.

## From here

For production code, plan on taking an array of subqueries, generating the query and constant scores dynamically, and not using any fixed-length lists. The example code is using a fixed 3-length list for simplicity of showing the concept.

The `score` field from Lucene is represented as a `double`. In theory this means you will invalidate your results due to loss of precision with over 53 subqueries. In practice you probably will not get to that many subqueries for other reasons.
