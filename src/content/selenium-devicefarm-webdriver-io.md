---
title: Selenium with Device Farm and Webdriver.io (easier & cheaper than alternatives?)
date: 2021-12-28
tags: aws, testing, javascript
---

Here's how to quickly set up serverless Selenium testing using [AWS Device Farm](https://docs.aws.amazon.com/devicefarm/index.html) and [Webdriver.io](https://webdriver.io/docs/gettingstarted). This is a pretty strong combo as the Webdriver.io framework handles some of the low-level requirements of working with Selenium and lets you focus on writing tests, while Device Farm is completely pay-as-you-go (for web browser based testing) with no concurrency limits.

## Set up Device Farm

Device Farm is only available in the `us-west-2` (Oregon) region. This could be an issue if you're testing web applications on other continents, due to latency. However, since Device Farm only tests publicly available URLs anyway, it's not necessarily an issue to have Device Farm in a different region to your other resources, apart from latency.

```bash
export AWS_REGION=us-west-2
```

You'll need a "test grid project". Setup is minimal:

```bash
aws devicefarm create-test-grid-project --name example --query testGridProject.arn --output text
```

Save the ARN output for later.

## Set up Webdriver.io

Webdriver.io publishes some project scaffolding. Run the following:

```bash
npm init wdio device-farm-example
cd device-farm-example
npm i -D wdio-aws-device-farm-service
```

During `init`, you'll have to answer some questions about what frameworks and file locations to use for your project. These are basically just installing dependencies and setting up a boilerplate `wdio.conf.js` file.

The first question, "Where is your automation backend located?", doesn't have a good answer right now because Device Farm is a third-party plugin and isn't part of the default options. Go ahead and choose the defaults for everything, including "On my local machine" for execution.

Now, edit `wdio.conf.js`. Up at the top, import the Device Farm service:

```js
const { launcher } = require('wdio-aws-device-farm-service')
```

Find the `services` key. If you chose all the defaults, it will say `services: ['chromedriver']`. Replace it with:

```js
services: [
  [
    launcher,
    {
      projectArn: '...'
    }
  ]
]
```

Fill in the ARN you saved earlier, from the `create-test-grid-project` command.

Assuming you allowed `init` to add example files, run:

```bash
npm run wdio
```

You should see a successful execution. Along the way there will be a log like `@wdio/devicefarm-service: Created device farm test grid`.

## Multiple configs

In reality you may want to be able to switch between local and remote execution while developing test scripts.

The `wdio` CLI takes the name of a config file as an argument. If you look in the generated `package.json`, `init` set this up for you by default:

```json
"scripts": {
  "wdio": "wdio run wdio.conf.js"
}
```

But you can set up whatever config files you want. For example, to derive a local config off the main config, put this in `wdio-local.conf.js`:

```js
const { config } = require('./wdio.conf.js')

exports.config = {
  ...config,
  services: ['chromedriver']
}
```

Then add another script to `package.json`, or run:

```bash
npx wdio wdio-local.conf.js
```

## Cost

I compared the cost of Device Farm to [SauceLabs](https://saucelabs.com/pricing) and found that, for desktop browser testing alone, Device Farm comes out ahead. (Real mobile devices are a different situation).

SauceLabs charges monthly based on maximum parallelism, a pricing model I'm not super fond of. If you want to occasionally burst (use more test slots than normal), you either pay through the nose for unused capacity or you just don't bother. For example, if you normally run 1-2 tests at a time, but you want to run a weekly full re-test with 10 runners at a time, you would have to pay for 10 runners all the time, and that use case just isn't worth $2,000 a month.

Compared to about $200 per month per slot for SauceLabs (paying month-to-month), Device Farm's desktop browser testing costs $0.005 per minute. The break-even (where this costs $200) is just over 663 hours of test execution (which means actually running tests for approximately 90% of the hours in a month). So for this use case you come out ahead on Device Farm unless you're literally running tests all the time. And you can burst if you need to.
