---
title: Here's how to export your Opensearch index to a table or CSV
date: 2023-08-01
tags: data, python
---

Opensearch (or Elasticsearch) is great for querying individual records. As a search system, it's oriented toward queries looking for the top 10 or even top 100 of something. You can of course set up aggregates and scrolls to analyze data in bulk, but it often feels overly verbose to do ad-hoc.

Sometimes you need to be able to say: _give me all of the records that are in here_. Usually for some kind of administrative or QA purposes. It may be easier to work with the records in a tabular structure, e.g. in a SQL database, or in a CSV that you can import somewhere and share.

I found out that a Python library called [`awswrangler`](https://pypi.org/project/awswrangler/) makes this pretty easy to do:

```
import awswrangler as wr

search_client = wr.opensearch.connect(
    host="my.opensearch.host",
    port=80,
)

results = wr.opensearch.search(
    search_client,
    index="my_index",
    search_body={"query": {"term": {"my_type.keyword": "fact"}}},
    size=10000,
)

results.to_csv("my_index.csv")
```

Behind the scenes, this is wrapping the Opensearch and Pandas libraries and is essentially an easy index-to-dataframe converter. It's an efficient approach. Obviously it'll depend on the size of your index and you may end up needing to stream, but I found it a fast way to dump everything.
