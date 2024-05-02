---
title: Find increases, latest values, and cumulative sums in SQL (postgres)
date: 2024-05-02
tags: sql
---

Being able to work with series of values over time in a SQL database will open up many possibilities for you in both analytic and operational use cases.

I'll show you the basics of three core calculations using time series: going from values to changes over time, finding the latest value per sequence, and going from changes over time to cumulative sums (running totals). The cumulative sum example also goes a little further and builds on the result.

## Changes in values over time

There are many reasons you might want to convert a series of values into a series of changes. For example, you might have the average annual temperature and want to know how much it changed every year. Or, you might have a series of valuations of an investment and want to know what the ups and downs were. Or you might have product inventory. Etc.

Here's the set of sample data I'll use in the examples:

```sql
create table value_series as select * from (values
  ('wombat', '2024-01-01'::date, 0.0),
  ('chair', '2024-01-01'::date, 100.0),
  ('tension', '2024-01-01'::date, 228.0),
  ('wombat', '2024-01-28'::date, 10.0),
  ('wombat', '2024-02-03'::date, 18.0),
  ('chair', '2024-02-03'::date, 200.0),
  ('tension', '2024-03-10'::date, 1000.0)
) x (account_name, effective_date, amount);
```

If you want to very quickly generate 10K rows, you can do something like this -- though it won't look very realistic.

```sql
create table value_series as select
  'account' || (floor(random() * 100) + 1)::varchar as account_name,
  generate_series('1995-01-01'::date, '2025-01-01'::date, '1 day') as effective_date,
  floor(random() * 100) + 1 as amount;
```

To find changes from one date to the next, use the `lag()` window function. This returns a value from a previous row. The number of rows to look back, the order, and how they're grouped are all configurable. In this case the `partition by account_name` means we're treating each account as a separate series, and the `order by effective_date` with a lookback of 1 means we're comparing successive dates in each account.

```sql
select
  account_name,
  effective_date,
  amount_change
from (
  select
    account_name,
    effective_date,
    amount - lag(amount, 1, 0) over (partition by account_name order by effective_date) as amount_change
  from value_series
  order by
    effective_date,
    account_name
) x
where
  amount_change not between -0.0001 and 0.0001;
```

There are a few design decisions to note here.

`lag()` is getting a default value of `0`, which means that if the very first value for an account is non-zero, it will be treated as a change.

And instead of `!= 0`, we're looking for changes larger than a chosen absolute value; this will help us deal with float values. If the data type is a fixed-point `decimal`, or an `int`, this is unnecessary.

Next, note that this works properly if we have one value per date, but if we had more than one value per date, we would have to either determine the correct one, or sum or average them, before applying the method above.

The output looks like this:

```txt
 account_name | effective_date | amount_change
--------------+----------------+---------------
 chair        | 2024-01-01     |         100.0
 tension      | 2024-01-01     |         228.0
 wombat       | 2024-01-28     |          10.0
 chair        | 2024-02-03     |         100.0
 wombat       | 2024-02-03     |           8.0
 tension      | 2024-03-10     |         772.0
```

This query benefits from a compound index on `(account_name, effective_date)`.

## Latest value of each sequence

In some use cases, you may have many series of values. For example, you might know the value of each of many different assets as of various dates. Finding the latest values means finding the value of each asset as of the latest known date (which could be the same or a different date for every asset).

Our example dataset is the same as for the previous query.

```sql
select distinct on (account_name)
  account_name,
  effective_date,
  amount
from value_series
order by
  account_name,
  effective_date desc;
```

`select distinct on` relies on the ordering of the query to select the first row for each `account_name`. Since the behavior of `distinct on` is to take the first row and then discard all rows past the first, the `effective_date` and the `amount` will both match and be from the most recent row, based on the `order by`.

As with the previous query, having more than one value per `effective_date` will lead to unpredictable results. When dealing with dirty data like that, if it can't be cleaned up first, at least add the `id` to the `order by` so the result is deterministic (note: deterministic doesn't mean correct, but it does mean predictable, which is at least better than unpredictably incorrect).

Here's the output containing the most recent value for each account:

```txt
 account_name | effective_date | amount
--------------+----------------+--------
 chair        | 2024-02-03     |  200.0
 tension      | 2024-03-10     | 1000.0
 wombat       | 2024-02-03     |   18.0
```

As the `distinct on` is governed mainly by its `order by` clause, this example benefits from the same index on `(account_name, effective_date)`.

## Cumulative sums

Cumulative sums (also known as running totals) are another useful idea -- in a way, they're the inverse what we did at the start with increases over time. For example, if we know how much money we made or lost every month, we might want to know what our balance was after every change.

In this example, we'll take things a step further by using a venture capital scenario.

We'll start with the following sample data. We track investment cash inflows (returns) from our investments. Typically a VC firm will take a "carry," which is a percentage of the returns _after_ they exceed a "hurdle," which usually means returning the initial investment back first before taking a cut. Being "in carry" is therefore being profitable. We're going to figure out what our profits were every step of the way.

Specifically, we run Lemons Fund II LLC, which was given $50 (by a "family office") to invest in neighborhood lemonade stands. Lemons Fund II LLC will get a 20% cut on returns that exceed the initial $50 -- the rest we give back as a return.

New example:

```sql
create table increase_series as select * from (values
  ('lotsa lemons', '2024-01-01'::date, 10.0),
  ('lemoncheap', '2024-02-04'::date, 5.0),
  ('mellowr', '2024-02-05'::date, 22.0),
  ('lemonciorn', '2024-03-20'::date, 438.0),
  ('lemonknow if this is a good idea', '2024-03-20'::date, 1.0),
  ('lemoncheap', '2024-04-10'::date, 5.0)
) x (account_name, effective_date, amount);
```

If you were to sum up all the increases in this example, you'll see they total $481, which means Lemons Fund II LLC is in carry, thanks to Lemonicorn, but we need to be able to figure out when the transition happened, and how much carry we made on each of our returns.

To calculate the overall cumulative sum, we'll take advantage of the default behavior of Postgres window functions with the `over` keyword, which is called `range unbounded preceding` -- that is, by default the sum will be of the previous and current rows, according to the `order by` clause.

```sql
select
  effective_date,
  sum(amount) over (order by effective_date, account_name) as cumsum
from increase_series
order by
  effective_date,
  account_name;
```

Note that in this example, we have two values on the same date (`2024-03-20`). This is a natural characteristic of this data since it concerns multiple accounts. That's why both of the `order by` clauses include `effective_date, account_name` -- so that we can count the change of each account on the same day.

The output is:

```txt
 effective_date | cumsum
----------------+--------
 2024-01-01     |   10.0
 2024-02-04     |   15.0
 2024-02-05     |   37.0
 2024-03-20     |  475.0
 2024-03-20     |  476.0
 2024-04-10     |  481.0
```

If we wanted to count each series separately, we'd use `partition by`:

```sql
select
  effective_date,
  account_name,
  sum(amount) over (partition by account_name order by effective_date) as cumsum
from increase_series
order by
  effective_date,
  account_name;
```

Yielding very different output:

```txt
 effective_date |           account_name           | cumsum
----------------+----------------------------------+--------
 2024-01-01     | lotsa lemons                     |   10.0
 2024-02-04     | lemoncheap                       |    5.0
 2024-02-05     | mellowr                          |   22.0
 2024-03-20     | lemonciorn                       |  438.0
 2024-03-20     | lemonknow if this is a good idea |    1.0
 2024-04-10     | lemoncheap                       |   10.0
```

To calculate carry for Lemons Fund II LLC, we'll start with the total cumulative sum. We need to figure out where it crosses the $50 hurdle and take 20% after that:

```sql
select
  effective_date,
  amount,
  cumsum,
  greatest(0.0, cumsum - 50.0) as over_hurdle,
  least(amount, greatest(0.0, cumsum - 50.0)) as carry_eligible,
  least(amount, greatest(0.0, cumsum - 50.0)) * 0.20 as carry
from (
  select
    effective_date,
    amount,
    sum(amount) over (order by effective_date, account_name) as cumsum
  from increase_series
  order by
    effective_date,
    account_name
) x;
```

This returns:

```txt
 effective_date | amount | cumsum | over_hurdle | carry_eligible | carry
----------------+--------+--------+-------------+----------------+--------
 2024-01-01     |   10.0 |   10.0 |         0.0 |            0.0 |  0.000
 2024-02-04     |    5.0 |   15.0 |         0.0 |            0.0 |  0.000
 2024-02-05     |   22.0 |   37.0 |         0.0 |            0.0 |  0.000
 2024-03-20     |  438.0 |  475.0 |       425.0 |          425.0 | 85.000
 2024-03-20     |    1.0 |  476.0 |       426.0 |            1.0 |  0.200
 2024-04-10     |    5.0 |  481.0 |       431.0 |            5.0 |  1.000
```

There's a bunch going on here but it breaks down simply. For each amount we earn, we figure out the total we've made so far, and how much (if any) that's above $50 total. If a single amount takes us from less than $50 to more than $50 total, we only count the amount it goes over. If we're already over $50, we count the whole amount. That way, we an figure out our cut of each transaction.

## Conclusion

Each of these techniques is a building block that can be part of a bigger assembly, whether it's joining the latest value per account to other account data, finding changes that are outliers, or more complex scenarios.

I hope this gave you some ideas to use next time you have series of values to work with.
