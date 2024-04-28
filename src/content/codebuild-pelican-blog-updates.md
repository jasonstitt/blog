---
date: 2017-01-25
title: This post brought to you by CodeBuild
tags: python, aws
---

Not long ago, I [moved this blog to AWS](https://jasonstitt.com/moving-this-blog-to-aws), specifically an S3/CloudFront completely static setup. There have been a few iterations, mostly on the deployment side. The blog is still backed by [Pelican](https://jasonstitt.com/tech-blog-pelican-git) and [Markdown](https://jasonstitt.com/markdown-vs-rst-pelican). Initially, I had it updated by a Git hook on my server, then, after moving to S3, I had an upload script that I ran manually after rebuilding the content.

Deployments based on Git hooks are convenient because they package up a lot of the process. I don't need to upload content from a machine that has the script (or the access key!), though I do still need a Git checkout. But since I moved to a purely static hosting situation, a bit of extra infrastructure was required.

Enter CodeBuild (and CodeCommit... and eventually CodePipeline, too).

CodeBuild is a fully managed Docker task runner specialized for build jobs. You can select a prebuilt Docker image (I picked a Python 3.x one) or provide your own image hosted in ECR or elsewhere. A CodeBuild project can be set up to automatically pull your code out of CodeCommit (which is just hosted Git, with no frills) and then run your build process. Your process is specified in a `buildspec.yml` file within the repo itself (or attached to your CodeBuild project).

My blog is already stored in a Git repo. The basic organization looks like this:

```yaml
content/
theme/
static/
templates/
pelicanconf.py
```

I created an empty CodeCommit repo, set it as an upstream on my local checkout, and pushed everything I had so far. (That's the easy part.) From there, it was a matter of getting CodeBuild to run Pelican and ship the output over to S3.

## Building out the CodeBuild config

My initial attempt at a `buildspec.yml` went something like this:

```yaml
version: 0.1

phases:
  install:
    commands:
      - pip install -U pelican typogrify Markdown
  build:
    commands:
      - pelican -s pelicanconf.py -o output content
  post_build:
    commands:
      - echo Build completed on `date`
artifacts:
  files:
    - output/**/*
```

Nothing is ever quite so simple, so I immediately saw my `UPLOAD_ARTIFACTS` step fail with the following error:

> Failed to upload artifacts: The bucket you are attempting to access must be addressed using the specified endpoint. Please send all future requests to this endpoint.

This is a bad error message, given that I didn't see an endpoint specified anywhere.

I searched for this error and didn't find anything CodeBuild related (really? Well, now there is.) but what I did find suggested it was because the test bucket I was using was in a different region from my CodeBuild project. The documentation does mention this early on, which I overlooked the first time around.

Next problem: The output in the S3 bucket was under a folder called `output`, whereas I need it in the root. CodeBuild has an option called `discard-paths`, but it appears to completely flatten a directory structure rather than just taking out the top level. Not only that, but CodeBuild itself wants a folder name as a configuration parameter and does not seem to accept a blank one, so the normal output was be two levels deep.

My next thought was to try to `s3 sync` the files from the `post_build` step. I also found a another blog post on [Automated static website deployments via AWS and GitHub | dadoune.com](https://www.dadoune.com/blog/aws-codepipeline-cloudbuild-static-s3-website/) that suggested this. To get `s3 sync` to work, I had to edit the service role that was automatically generated for my build and add a policy covering my S3 bucket that allowed `s3:ListObjects`. The default policy only allows `s3:PutObject` within the bucket.

After mucking around with IAM, I ended up with a sync command in my `post_build` step:

```yaml
post_build:
  commands:
    - aws s3 sync output s3://mybucket
```

As a bonus, `s3 sync` doesn't care what region my bucket is in, unlike whatever process CodeBuild uses.

## Extensionless URLs

The above is all fine for transferring output files as-is, with an extension of `.html` on all the pages. However, for my blog I like to have clean, extensionless URLs. This not only looks nicer, but makes the backend easily portable between some form of CMS and static HTML files.

Chopping off all the extensions in the `post_build` step before `s3 sync` would not be hard. However, in this case `s3 sync` will not know how to determine the file type, so all of the pages will be delivered as binary files. I need to set the `ContentType` property of each file uploaded to S3, which requires custom scripting.

Since I already chose a Python build container (to run Pelican), it made the most sense to write the upload script in Python as well, using the excellent `boto3`. The IAM role situation is unaffected; if run on an Amazon-hosted instance without being given a specific access key, `boto3` will automatically use the IAM role credentials, if available, as with all the Amazon SDKs.

## My sync script

```python
import os
import boto3
import mimetypes
from multiprocessing.pool import ThreadPool

bucket = 'bucketname'
s3 = boto3.resource('s3')
os.chdir('output')
filepaths = (os.path.join(root, filename)[2:] for root, dirs, files in os.walk('.') for filename in files)

def put_file(filepath):
    key = filepath
    content_type = mimetypes.guess_type(filepath)[0] or 'text/plain'
    if filepath.endswith('.html') and filepath != 'index.html':
        key = filepath[:-len('.html')]
    s3.Object(bucket, key).put(
        Body=open(filepath, 'rb'),
        ContentType=content_type,
        CacheControl='max-age=3600',
    )

ThreadPool(10).map(put_file, filepaths)
```

## CodePipeline

Just with CodeCommit and CodeBuild, I can have a serverless process that builds my blog and puts it into S3. But I have to log in and push a button. Logging in to things and pushing buttons is hard.

In comes the next service: CodePipeline, which handles hooks/triggers in the `Code*` service ecosystem.

Basic setup via console is pretty easy. Select the CodeCommit repo and branch as the source, and the CodeBuild project as the build provider, and... oh, wait.

> Choose a build project that specifies a build output artifact.

I'm not sure why it cares, but CodePipeline wants your CodeBuild to have an artifact, which I already decided not to do because it doesn't work for me. According to an [AWS Developer Forums](https://forums.aws.amazon.com/thread.jspa?threadID=244486) post, doing away with this is on the roadmap and the official Amazon recommendation is to use a dummy artifact.

Back to CloudBuild for a moment. I added back the output bucket configuration (with a path of, literally, "dummy") and added an `artifacts` section back to the `buildspec.yml`:

```yaml
artifacts:
  files:
    - output/index.html
```

It's not ideal, and I now have a random copy of my front page, but it made CodePipeline agree to do business with me. Also, don't bother trying to go to `/dummy/output/index.html` on my web site -- you'll get an error because the object is automatically set to use server-side encryption.

So I went through the CodePipeline setup process again, choosing "No Deployment" (as CodeDeploy is not required in this workflow) and allowing CodePipeline to create an over-permissive IAM service role for itself that I'll go back and fix later. (It thinks it needs OpsWorks permissions -- among other things).

After finishing the pipeline setup I tried a test commit, and the pipeline view in the AWS console immediately switched to "In Progress".

## The final `buildspec.yml`

```yaml
version: 0.1

phases:
  install:
    commands:
      - pip install -U pelican typogrify Markdown boto3
  build:
    commands:
      - pelican -s pelicanconf.py -o output content
  post_build:
    commands:
      - python sync.py
artifacts:
  files:
    - output/index.html
```

## Save a dollar

Beyond the first CodePipeline (which is free tier even after 12 months), each CodePipeline costs $1 per month if it has at least one usage. Although it is not much money, this feels odd given the minor role it plays in this workflow. Literally all it is doing is triggering another service that is actually doing the work, and that service (CodeBuild) costs about 1-2 cents per build. (Note, CodeBuild includes 100 free minutes per month on small instances). I suppose it's necessary for pipelines to pay their own way in the world since they are a separate service, but if this were built into either CodeCommit (as a hook) or CodeBuild (as a trigger), it's hard to imagine it costing anything at all.

However, a similar thing can be accomplished with a Lambda that will also cost practically nothing. CodeCommit can trigger a Lambda function, and [triggering CodeBuild is just an API call](http://boto3.readthedocs.io/en/latest/reference/services/codebuild.html#CodeBuild.Client.start_build).

## Satisfactions and critiques

It's definitely nicer to have a CD process triggered off a master branch than to have to run a script on my laptop, make sure the correct keys are configured to access the account, and hope everything works.

That being said, the overall process and integration between services seems to need a bit more baking. The artifact output is limited in flexibility, and the IAM policy parts could use some refinement (and felt oddly different in the console UI between the two products -- not that that's unusual for AWS).

It's interesting that CodeBuild is presented as such a specialized service when it is a pricing model change away from being a very general and potentially much more useful service. It's essentially a way to rent compute on a fully managed ECS cluster by the minute. Or in other words, it's spot instances for Docker. Or Serverless AWS Batch.

Unfortunately, the price is such a large multiple over that of EC2 instances that it's not practical to use heavily. At half a cent per minute for a "small" runner with 3 Gb of memory and 2 vCPUs, you're paying $0.30 per hour, which is in between the on-demand costs of an m3.xlarge and and r3.xlarge (15-30 Gb memory, 4 vCPUs, instance storage, and EBS optimized). With current spot pricing, you're talking closer to an m4.10xlarge for that rate (your mileage may vary).

For that matter, I did think about just using Lambda for the entire process. But that would require using Lambda to check out a Git repo -- and that's a story for another day.
