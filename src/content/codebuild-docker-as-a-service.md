---
title: Just a single AWS CodeBuild pipeline for unlimited Docker builds
date: 2021-12-26
tags: aws, containers
---

CodeBuild has features, sure. You can use it like a CI service with steps, a YAML config, webhook triggers, etc.

But what I really wanted was just a Docker-as-a-service that would let me run builds on different repos whenever I want, from a separate orchestration system somewhere else. I'm not necessarily sold on the whole AWS Code\* ecosystem as an orchestration layer. But I do like the idea of completely serverless builds.

Serverless is great for image builds because of how spiky the resource needs are. Builds typically happen occasionally, but when they do, they benefit from throwing a bunch of CPU and memory at them. An on-demand service billed by-the-minute with no carry-over and relatively fast provisioning is perfect for this.

Shame about needing to set up a build configuration for every repo you have - or do you?

## GitHub example setup

The source for my builds will be private GitHub repos. CodeBuild has a native GitHub integration that can use an Oauth2 app or a personal access token. I prefer the Oauth2 app because there's no credential living in user-land. This can only be set up when creating a project in the AWS Console, not the API or Terraform. But once you set it up for a given region/account, it will be used for any subsequent projects, which can then be set up in code. In other words, you can start a throw-away project, complete Oauth2, and abandon the project and Oauth2 stays set up.

CodeBuild has a limited set of native sources available. If you want to use something else, like GitLab ([see this disappointingly long issue](https://gitlab.com/gitlab-org/gitlab/-/issues/19081)), you can create a build with no source and just invoke `git` from the build script after getting credentials from Secrets Manager. Or provide the code in another way, like saving it to S3.

Next, I'll create my actual repo on GitHub. For me this will be `jasonstitt/test-ecr`. The repo contains this `Dockerfile`:

```dockerfile
FROM public.ecr.aws/docker/library/node:16-alpine
WORKDIR /src
RUN echo "console.log('hello, world')" > index.js
CMD ["index.js"]
```

Note that I'm getting the base `node` image from `public.ecr.aws` rather than from Dockerhub. Since CodeBuild uses a shared IP pool, it'll practically never be able to download from Dockerhub unless you authenticate with a user account. On the other hand, ECR Public is rate-limited from outside of AWS but unlimited inside it.

## Base project: GitHub to ECR

I'll use Terraform to create the [CodeBuild project](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codebuild_project) for my image builds. Of course you can create it through the console, but this is more explicit about what resources exist.

First we need an IAM role for the project:

```hcl
resource "aws_iam_role" "codebuild" {
  name = "codebuild"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codebuild.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}
```

This role needs to be able to use CloudWatch Logs and ECR. (This is also where you'd put permissions for S3, VPC subnets, etc. which we're not using in this case):

```hcl
resource "aws_iam_role_policy" "codebuild" {
  role = aws_iam_role.codebuild.name

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Resource": [
        "*"
      ],
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
    },
    {
      "Effect": "Allow",
      "Resource": [
        "*"
      ],
      "Action": [
        "ecr:List*",
        "ecr:Describe*",
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:CompleteLayerUpload",
        "ecr:GetAuthorizationToken",
        "ecr:GetDownloadUrlForLayer",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ]
    }
  ]
}
EOF
}
```

Finally, the project:

```hcl
resource "aws_codebuild_project" "flex" {
  name          = "codebuild-flex"
  build_timeout = "5"
  service_role  = aws_iam_role.codebuild.arn

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:5.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true
  }

  logs_config {
    cloudwatch_logs {
      group_name = "codebuild-flex"
    }
  }

  source {
    type            = "GITHUB"
    location        = "https://github.com/placeholder/placeholder"
    git_clone_depth = 1
    buildspec       = <<EOF
version: 0.2
env:
  shell: bash
phases:
  build:
    commands:
      - >
        aws ecr get-login-password --region $REGION
        | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com
      - docker build -t $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/$TAG .
      - docker push $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/$TAG
EOF
  }

  source_version = "main"
}
```

There are several interesting things about this project definition.

The `environment` block includes `privileged_mode = true`, which is what allows the job to access the underlying Docker server to run image builds. Fortunately, CodeBuild runs jobs on isolated VMs, which limits the risk of privileged mode (vs. running builds on shared infrastructure).

The `location` field has to be filled with something valid, but since we're just going to override it later, the value doesn't actually matter. I referenced a `placeholder/placeholder` repo here, but you could set it to a default repo of your own if you want.

We have a `buildspec` built into the project. This could also be a file within each repo. But since we're trying to dynamically build any repo we want, we don't necessarily want to copy that file into all the repos, so we provide it once, centrally, here, and rely on environment variables that can be set at build time.

Of course, in your project you could update the build spec to parameterize more than this, like:

- Working directory
- Git branch
- Alternate Dockerfile name or location
- Build args
- Multiple builds per repo

Finally, I've configured a small instance type here, but take a look at the [available instance types](https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-compute-types.html) and pick one that suits your needs.

## Parameterize the build

To actually run our build, we need to provide the actual GitHub repo URL and values for the environment variables (`TAG`, `REGION`, and `ACCOUNT`). For this quick and dirty example, I'll show this using the AWS CLI rather than an SDK.

First create a `build.json` file like the below and fill in your own values for all the environment variables and source location:

```json
{
  "projectName": "codebuild-flex",
  "environmentVariablesOverride": [
    {
      "name": "TAG",
      "value": "test-ecr:latest",
      "type": "PLAINTEXT"
    },
    {
      "name": "REGION",
      "value": "<region>",
      "type": "PLAINTEXT"
    },
    {
      "name": "ACCOUNT",
      "value": "<account-id>",
      "type": "PLAINTEXT"
    }
  ],
  "sourceLocationOverride": "https://github.com/jasonstitt/test-ecr2"
}
```

Next run this command:

```bash
aws codebuild start-build --cli-input-json file://build.json --query 'build.id' --output text
```

If all the project setup went well, you'll get back a build ID that looks something like this:

```text
codebuild-flex:efc6f51c-2f80-4261-b54b-c7bfec6c8d0f
```

This is the ID that can be used to check build status and other attributes.

## Get status and logs

We can get all the status info on our build like this:

```bash
aws codebuild batch-get-builds --ids codebuild-flex:efc6f51c-2f80-4261-b54b-c7bfec6c8d0f
```

This returns a lot of info and really needs to be machine-parsed. A simple way to narrow the output could be:

```bash
aws codebuild batch-get-builds --query 'builds[0] | [currentPhase, buildStatus]' --output text \
    --ids codebuild-flex:efc6f51c-2f80-4261-b54b-c7bfec6c8d0f
```

Logs are another matter. For quick access from the CLI, we can tail the log group:

```bash
aws logs tail codebuild-flex --follow
```

However, this doesn't isolate to a particular build. Based on the way this project is set up, all builds will use the same log group but different streams. The stream ID is available from `batch-get-builds`, but only after the job has entered the `PROVISIONING` step, not right away. One example of stringing this together is:

```bash
BUILD=codebuild-flex:efc6f51c-2f80-4261-b54b-c7bfec6c8d0f
STREAM=$(aws codebuild batch-get-builds --query 'builds[0].logs.streamName' --output text --ids $BUILD)
aws logs get-log-events --start-from-head --log-group-name codebuild-flex --log-stream-name $STREAM
```

Again, the output really needs some machine parsing and formatting. In reality, I would script all this, but the exact steps depend on how the build fits into your overall orchestration setup.

## Security

Privileged mode does, of course, allow the CodeBuild job itself to escape its container and run on the host machine. This is a basic characteristic of container architectures (privileged = root on host).

I recommend reading [Escaping CodeBuild - The compromise that wasn't](https://onecloudplease.com/blog/security-september-escaping-codebuild) for more detailed information on this. The response from AWS was that they implement isolation of the underlying VM, so there isn't a horizontal escalation path to other resources. This makes it substantially better from a security perspective to farm image builds out to a service like CodeBuild than to run them on a container infrastructure shared with anything else.
