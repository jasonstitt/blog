---
title: SQLAlchemy makes union queries on denormalized data easier
date: 2017-02-07
tags: python, database
---

Recently I had a need to modernize an application that selects some records out of a denormalized SQL table. In each row of the table, there are several objects represented, with duplicate columns (numbered one through five) for some values, plus some shared values that apply to all the objects. For various reasons, although I was updating the application layer, I couldn't do anything to the data model.

In order to query for individual objects out of this table, all of the selects were `union`s of several selects, one for each set of columns. All of the `where` clauses and other aspects were duplicated.

It looked something like this (simplifying to 3 sets of data and far fewer columns):

```sql
select
    row_id,
    1 as col_id,
    name_1 as name
from
    strange
where
    appointment_date_1 > now()
union all
select
    row_id,
    2 as col_id,
    name_2 as name
from
    strange
where
    appointment_date_2 > now()
union all
select
    row_id,
    3 as col_id,
    name_3 as name
from
    strange
where
    appointment_date_3 > now()
```

This approach using a raw SQL query works, but it's ugly and repetitive, and it will only get more ugly if there are more columns because they will all be duplicated across all of the select statements. Meanwhile, we have this column aliasing logic that needs to be repeated every time we construct one of these statements, so that we can figure out where the data came from later. And even then, this is a quite simple dummy example.

You have to imagine this with about 12-15 columns, some functions, a half dozen conditions in each where clause, and maybe a subselect or two for each query to see how doing this in raw SQL is awful. (Note, that is what the real example this is based on contained -- well, that and the five individual data sets per row instead of three.)

What if we could clean this up by factoring out all of the repeated logic?

For this application I was using SQLAlchemy (more as a query builder than an ORM). While this isn't a typical query, SQLAlchemy is very flexible and provides all the tools required. Theoretically, you could create a model with all of the columns and create the appropriate `union` from them, however, I decided to use `literal_column` to construct the column names on the fly.

Here is a simplified version, which presupposes the existence of a declarative model `Strange` that maps the table name and the shared fields (such as `row_id`).

```python
query = union_all(*[
    select([
        Strange.row_id,
        literal_column(column_no, type_=Integer).label('col_id'),
        literal_column('name_' + column_no, type_=String).label('name'),
    ]).where(
        literal_column('appointment_date_' + column_no) > datetime.utcnow()
    )
    for column_no in '123'
])
```

Now, each column and where condition only needs to be added to the query once, and the overall structure is easier to scan. There's a bit of cruft from the addition of `column_no` all over the place, but far less than actually duplicating the parts of the query.

Note: you can also use a generator instead of a list comprehension, writing `union_all(*(...))` instead of `union_all(*[...])`. However, if you get a TypeError from any code inside the generator expression, it will bubble up as a `TypeError` that claims you cannot use `*` to unpack a generator, which is actually a false statement. This tripped me up for quite some time while trying to debug an issue with one of my where clauses.

The `type_` arguments are optional for `literal_column`, but useful here in order to treat these like ordinary model columns even though they are not modeled using either a Table or the declarative model.
