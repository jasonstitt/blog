---
title: Perfect Python test setup? Live coverage with pytest and VS Code
date: 2023-03-25
tags: python, testing
---

As developers, we're given more and more opportunities to "shift left" by finding out as much about the outcomes and quality of our work as possible, as early as possible. I've started using a Python unit test setup with live coverage that blows away web-based coverage interfaces. Sure, you can see a color coded HTML tree of your code. Or you can just see coverage while working on your code. Let's do that.

## The VS Code side: Coverage Gutter

[Coverage Gutters](https://marketplace.visualstudio.com/items?itemName=ryanluker.vscode-coverage-gutters) is a nifty Visual Studio Code extension that allows you to see code coverage in real-time in VS Code as you write tests. It highlights the lines of code that are covered by your tests, making it easy to identify the untested parts of your code.

To get started, open the Extensions pane to search for and install Coverage Gutters.

Coverage Gutters comes with reasonable configuration out of the box, but you may want to open up its settings to customize things like colors (especially if you need to adjust for red/green colorblindness) and whether the entire line is highlighted or just the gutter. You might choose to use blue and yellow instead of the default red and green. Additionally, you may find that highlighting the entire line is more eye-catching and helpful, or prefer a subtler approach of highlighting only the gutter.

Apart from style, I prefer not to customize the functionality of the extension too much. I would rather set up the project so that anybody with a default installation can use it. This is especially important for usage by a team.

## Viewing pytest coverage in VS Code

After installing the extension, the next step is to generate a coverage report. You can do this with `coverage`, but I'm so used to [`pytest`](https://docs.pytest.org/) at this point that I jump straight to `pytest-cov`:

```bash
pip3 install pytest-cov
```

Let's set up a simple Python project with a basic structure. To start with, all of these will be empty files:

```txt
pyproject.toml
livecov/code.py
test/__init__.py
test/test_code.py
```

Now we use `pyproject.toml` to configure our coverage for our source code:

```toml
## pyproject.toml
[tool.coverage.run]
source = ["livecov"]
```

Now we can run:

```
pytest --cov
```

We'll get a warning about there not being anything to cover. Fine, all the files are empty. Add some basic code:

```py
## livecov/code.py
def add(x, y):
    return x + y
```

```py
## test/test_code.py
from livecov import code
```

Now you'll get some sensible output, showing no coverage of your code.

## The right coverage filename

But wait... Coverage Gutters complains about our setup. You can try activating the extension by invoking `Coverage Gutters: Display Coverage` in the command palette, only to see an error message:

> Could not find a Coverage file! Searched for lcov.info, cov.xml, coverage.xml, jacoco.xml, coverage.cobertura.xml

There are several options here. It's easy to generate an `lcov` report like this:

```
pytest --cov --cov-report=lcov:lcov.info
```

Now you should be able to see coverage in your `livecov/code.py`. If you haven't changed the settings, it should look like green and red bars in the left gutter of the file.

A better setup is to put default arguments into `pyproject.toml` which should be extended like this:

```toml
## pyproject.toml
[tool.coverage.run]
source = ["livecov"]

[tool.pytest.ini_options]
addopts = "--cov --cov-report=lcov:lcov.info --cov-report=term"
```

Now you can just type `pytest` and will both see the console output and save an `lcov.info` file for Coverage Gutters.

## Making pytest update live

But wait... there's more. We still need to make this live.

First, Coverage Gutters itself has a watch mode. Invoke `Coverage Gutters: Watch` in the command palette and you'll find that you can browse your project and see coverage when you open new files. It'll also update when you rerun tests.

I combined this with another project, `pytest-watch`, a plugin that implements filesystem watch for `pytest`.

```bash
pip3 install pytest-watch
```

Now, run it like this:

```bash
ptw
```

Since it runs `pytest` behind the scenes, it'll automatically pick up all of your existing settings and run coverage on every code update.

Better yet, every time `pytest-watch` reruns the tests, it outputs a new `lcov.info`, which Coverage Gutters picks up and immediately updates the highlighting.

Add another function - it immediately shows as uncovered.

Add a test - the coverage updates.

## RIP web interfaces

Although there's still a reason to have a coverage service, something that hooks into your continuous integration system and tracks coverage over time, the need for standalone web interfaces is diminishing. As we integrate more tools into our development environments, we're able to access data immediately. This faster feedback and real-time adjustments can lead to better code quality and maintainability.

This then allows the coverage service to be simpler - maybe just a database exposing repo and coverage information to SQL. That's my next project.
