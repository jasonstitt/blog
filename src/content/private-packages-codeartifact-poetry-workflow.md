---
title: Private packages with CodeArtifact and Poetry, a complete workflow
date: 2021-12-27
tags: python, aws
---

AWS [CodeArtifact](https://docs.aws.amazon.com/codeartifact/) acts as a private package repository for several languages - including a private PyPI service. With a little bit of setup, it can be an almost maintenance-free Python package repository for all your internal libraries.

[Poetry](https://python-poetry.org/docs/) has been emerging as a strong contender in the Python packaging space, with relatively mature functionality and support for both libraries and applications (a traditional divide in Python packaging that doesn't have to be, and probably should never have been, so separate).

Here's how to combine the two and both publish and require libraries, including in container builds.

## Should you use CodeArtifact?

The main disadvantage of CodeArtifact is its very limited package support so far — just Python, Javascript, Java, and .NET. I have to imagine that a full product development team would be able to build out more package types at a decent clip, but AWS roadmaps can be mysterious. As it is, the service launched in June, 2020, and in a year and a half since then has launched one package type, so it's not clear at all when more might be coming. I would particularly like Helm chart support.

If those are the package types you need, however, there are some substantial benefits. CodeArtifact is completely serverless and almost free (unless you publish very large packages). And of course it uses IAM, which is convenient if you're already bought into AWS as you don't need any additional user or token management. The use of temporary tokens is also really convenient for some build scenarios.

## Setup

A minimal setup requires a domain and a repository. A domain can contain multiple repositories, each of which can contain multiple packages (of different types).

For a basic setup, one domain with one repository is plenty. Reasons to launch more would be:

- Separate authorization for different teams' packages
- Repositories that proxy public upstreams like NPM or PyPI - each repo can only have one public upstream, so you need to create a small graph of repos in this scenario.

Here's the Terraform to create a sample repo:

```hcl
resource "aws_codeartifact_domain" "example" {
  domain = "example"
}

resource "aws_codeartifact_repository" "example" {
  repository = "example"
  domain     = aws_codeartifact_domain.example.domain
}
```

Your repo will have a base URL with a path to use for each type of package. Remember, multiple package types are supported in one repo, but each type will have a different subpath.

The URLs look like this:

```text
https://<domain>-<account>.d.codeartifact.<region>.amazonaws.com/<format>/<repository>
```

To get all that pre-filled, you can fetch a URL with the AWS CLI:

```bash
aws codeartifact get-repository-endpoint --domain example --repository example \
    --format pypi --query repositoryEndpoint --output text
```

## Authentication & authorization

CodeArtifact uses IAM permissions, but uses tokens to be able to support various package management tools. For a large and especially multi-language environment, I suggest picking an environment variable to use everywhere for this token, such as `CODEARTIFACT_TOKEN`. The token can be fetched like this:

```bash
export CODEARTIFACT_TOKEN=$(aws codeartifact get-authorization-token \
    --domain example --query authorizationToken --output text)
```

The token inherits your IAM permissions, so you'll want a role for your CI system that has full read/write, plus usage roles that can read and download packages. I'll assume you're using an administrator user for testing this out.

To make it as easy as possible to use your private packages, consider using organization-based permissions. This gives any role in the entire org the ability to get a CodeArtifact token and read and download packages.

```hcl
data "aws_organizations_organization" "this" {}

resource "aws_codeartifact_domain_permissions_policy" "example" {
  domain          = aws_codeartifact_domain.example.domain
  policy_document = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "codeartifact:Describe*",
        "codeartifact:Get*",
        "codeartifact:List*",
        "codeartifact:Read*"
      ],
      "Effect": "Allow",
      "Principal": "*",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:PrincipalOrgID": [
            "${data.aws_organizations_organization.this.id}"
          ]
        }
      }
    }
  ]
}
EOF
}
```

## Publishing

First, let's create a very simple Python package, using Poetry, that we'll import from another Python project:

```bash
pip3 install -U poetry
mkdir sample-lib
cd sample-lib
poetry init --no-interaction
mkdir sample_lib
echo 'PI = 3.14' > sample_lib/__init__.py
```

A `pyproject.toml` file will have been created by `poetry init`. The following block needs to be added to `pyproject.toml` to enable us to use CodeArtifact:

```toml
[[tool.poetry.source]]
name = "artifact"
url = "<your-repo-endpoint>"
secondary = true
```

Finally, if all has gone well (and we have a `CODEARTIFACT_TOKEN` with permission to publish) we can push `sample-lib` to the repository like so:

```bash
export POETRY_HTTP_BASIC_ARTIFACT_USERNAME=aws
export POETRY_HTTP_BASIC_ARTIFACT_PASSWORD=$CODEARTIFACT_TOKEN
poetry build
poetry publish --repository artifact
```

Check that the package exists:

```bash
aws codeartifact list-packages --domain example --repository example
```

If you try to run `poetry publish` again right away, you'll get `HTTP Error 409`. This is expected. Package versions are immutable and you can't publish over an existing version. You'll need to increment the version number to publish again.

## Requiring

In a separate directory, set up a new project that will depend on `sample-lib`:

```bash
mkdir sample-app
cd sample-app
poetry init --no-interaction
```

Add this block to `pyproject.toml`. Note that this isn't exactly the same block. When requiring packages, Poetry won't be able to discover them unless you add `simple` to the end of the repo endpoint.

```toml
[[tool.poetry.source]]
name = "artifact"
url = "<your-repo-endpoint>/simple"
secondary = true
```

Now add `sample-lib` as a dependency:

```bash
poetry add sample-lib --source artifact
```

The option `--source artifact` is necessary here for two reasons.

First, we specified CodeArtifact as a secondary, rather than default, source. With a little more configuration, we could use CodeArtifact as a proxy of public PyPI and also publish our private packages to it, and then we could replace `secondary = true` with `default = true` and use it for all packages.

Second, there's a package in public PyPI already called `sample-lib` (go figure). We've shadowed the name with our private package. If we omitted `--source artifact`, while using CodeArtifact as a secondary source, Poetry would prefer to install from public PyPI instead.

## Team considerations

CodeArtifact tokens are temporary, so any person or CI system who installs dependencies this way will need to have an active token and have set up the correct environment variables. In a team environment, I suggest distributing some scripting used by both devs and CI systems to handle this consistently.

I also suggest standardizing the source name used in `pyproject.toml` across projects (`artifact` in this case, though it's a completely arbitrary naming decision) so that the scripting is zero-configuration.

As an alternative to environment variables, Poetry also supports a CLI command that stores credentials in a local file, which can get around needing shell `export` statements and last between shell sessions:

```sh
poetry config http-basic.artifact aws $(aws codeartifact get-authorization-token \\
    --domain example --query authorizationToken --output text)
```

## Container image builds

To build images with private package dependencies, pass the CodeArtifact token as a build argument. For example:

```
docker build -t sample-app --build-arg CODEARTIFACT_TOKEN .
```

Inside your `Dockerfile`, specify `ARG CODEARTIFACT_TOKEN` and proceed to treat it as an environment variable.

Because tokens are temporary, you don't have to worry about using separate build images in your `Dockefile` just to keep the token out of layer history, as you do with permanent credentials. Your CI system can even set the duration of the token to something low, like 10 minutes, just to account for when the build runs.

If you have a mono-Python or heavily Python environment, you might also just pass in `POETRY_HTTP_BASIC_ARTIFACT_USERNAME` and `POETRY_HTTP_BASIC_ARTIFACT_PASSWORD` directly. In a multi-language environment, maybe stick with `CODEARTIFACT_TOKEN`. This is another reason to internally standardize on that environment variable name — so the build system can be zero-configuration here as well.
