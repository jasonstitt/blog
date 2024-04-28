---
title: Complete AWS SAML setup using Terraform and aws-credful
date: 2021-10-29
tags: aws, terraform
---

When it comes to AWS, it's best to get rid of users. Not the people, necessarily - I'm talking about IAM users, which let you access the AWS console with a username and password or use the API or command-line tools with an access key and secret.

IAM users are probably the most obvious way to authenticate to AWS, so it's easy to understand why many individuals and organizations use them. However, they add more credential management burden and the potential for leaked keys. One cloud security firm surveyed over a thousand customer accounts and found that [60% of access keys were not rotated in the recommended 90 days](https://www.netskope.com/blog/a-real-world-look-at-aws-best-practices-iam-user-accounts). 40% were not even rotated within a year, and they found numerous unused keys and instances of two active access keys for one user (which could mean incomplete rotation).

Single sign-on gives you a way to consistently onboard and offboard developers and give them permissions (hopefully based on groups, depending on your identity provider). It also reduces credential management and makes your API/CLI access credentials temporary rather than long-lasting, which reduces the likelihood and impact of leaks.

If your company uses an identity provider such as Okta, ADFS, Jumpcloud, Google, Onelogin, etc., you can log into the AWS console _and_ obtain command-line access credentials that are temporary by using your existing user account, by setting up an [IAM identity provider](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers.html). You could also use [AWS SSO](https://aws.amazon.com/single-sign-on/) which is a separate service with more features and complexity. AWS SSO could help you with multi-account management and SCIM integration with your identity provider, as well as confusingly also being an identity provider for some non-AWS third-party services.

I'll show you how to set up an IAM identity provider and roles using Terraform so the whole thing will be in code and reusable. You'll need to be able to use Terraform and have a test AWS account to try this out with.

## Set up your identity provider

For the sake of this exercise I'm using a local identity provider for rapid testing without setting up an account somewhere. Because there's more code than a couple of snippets, [I put the whole example project on GitHub](https://github.com/jasonstitt/example-aws-saml).

For commercial providers, each of these has its own configuration style, so if you're the person setting up the IdP, refer to its documentation. [AWS compiles links to documentation for some providers](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_saml_3rd-party.html).

The hardest part of this exercise was finding a local IdP that doesn't require complex setup but can handle AWS's role attribute mappings. Unfortunately, simple but capable SAML implementations are somewhat hard to come by. The core information exchange in SAML is actually quite simple: identity provider creates an assertion of identity and optional attributes, signs it with a private key, sends it to an application, application uses the matching public key to verify it and trusts the assertion. But the rest of SAML bakes layers of complexity around this core, and as a result it tends to be the domain of commercial providers and arcane configuration management.

You could also do this with a local [Shibboleth](https://shibboleth.atlassian.net/wiki/spaces/IDP4/overview) or [Keycloak](https://www.keycloak.org/documentation) server or a free dev account from some of the commercial providers, but what I ended up with was a bit of custom code based on the [`samlp`](https://www.npmjs.com/package/samlp) NPM module that automatically logs in a static user with a couple of roles.

## Configure your AWS account

First, we need to obtain the metadata XML file from the identity provider and put it into the same directory as our Terraform module. This isn't sensitive data as the keys contained are the public keys, and many identity providers make the metadata available on a public URL. The exact download location will vary with every identity provider, however, so refer to documentation.

For the example project, the included script that generates the self-signed key pair also generates a `metadata.xml` file and puts it in the same directory as the Terraform module.

Now we need to set up a SAML provider in Terraform, which just looks like this:

```hcl
resource "aws_iam_saml_provider" "this" {
  name                   = "sso-test"
  saml_metadata_document = file("${path.module}/metadata.xml")
}
```

Next we need an IAM policy that will allow specific IAM roles to be assumed by SAML users.

```hcl
data "aws_iam_policy_document" "this" {
  statement {
    actions = ["sts:AssumeRoleWithSAML"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_saml_provider.this.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "SAML:aud"
      values   = ["https://signin.aws.amazon.com/saml"]
    }
  }
}
```

At this point we can apply the module and see that a SAML provider is set up. However, we won't be able to actually log in, because we need to create roles that users can log in as.

In a multi-account scenario you'll need a SAML provider in each account. This is one of the things that the AWS SSO service can help manage, although if you'd prefer the relative simplicity of the IAM-only approach, you can also put everything into a reusable Terraform module and apply it across accounts.

## Add IAM roles

Users can't get just any role via SAML. The roles themselves need to be defined so they can be assumed using the above policy. Then, the identity provider can specify the specific roles each user can assume. Let's create a couple of roles so we can see role selection in action.

```hcl
resource "aws_iam_role" "sso_readonly" {
  name               = "sso-test-readonly"
  assume_role_policy = data.aws_iam_policy_document.this.json
}

resource "aws_iam_role_policy_attachment" "sso_readonly" {
  role       = aws_iam_role.sso_readonly.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

resource "aws_iam_role" "sso_poweruser" {
  name               = "sso-test-poweruser"
  assume_role_policy = data.aws_iam_policy_document.this.json
}

resource "aws_iam_role_policy_attachment" "sso_poweruser" {
  role       = aws_iam_role.sso_poweruser.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}
```

These example roles are using AWS managed policies to reduce line count. In reality, I customize all role policies - the built in ones are rarely exactly right. A Terraform module therefore becomes the source of truth for the various user roles that can be assumed in AWS accounts.

There's nothing special about the naming of these roles (having `sso-` at the beginning). From AWS's perspective the role names can be whatever. Depending on your IdP configuration, there will often be some kind of group-to-role mapping based on a prefix, so you'll want to count that into your role naming scheme. For example, if you're using ADFS, you might have all your Active Directory groups for AWS prefixed `AWS-` so they can be differentiated from other groups.

You do, however, need to have the `assume_role_policy` configured for all roles used via SAML.

## Log in to the console

Use the sign-in link for AWS from your identity provider. Depending on which provider you use, there's often a user console with a set of links to the different things you have access to.

For the example, simply visit `https://localhost:3000/saml` in a browser and you should see a screen with two roles available.

If something isn't set up right, you'll see a generic error screen saying something like the dreaded "Your request included an invalid SAML response". Check the [AWS troubleshooting tips](https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot_saml.html), but also try installing the [SAML Message Decoder](https://chrome.google.com/webstore/detail/saml-message-decoder/mpabchoaimgbdbbjjieoaeiibojelbhm?hl=en-US) Chrome extension. This will let you easily see the actual SAML message that was sent to AWS.

## Use aws-credful to obtain CLI creds

To get developers to use SSO end-to-end, it has to be convenient to get credentials on the command line. Otherwise you'll end up with SSO for the console and long-lived, infrequently rotated keys for CLI and API access.

For some time now, AWS's official recommendation has been to [use a HTML-scraping script specific to your IdP's login page](https://aws.amazon.com/blogs/security/how-to-implement-a-general-solution-for-federated-apicli-access-using-saml-2-0/). However, this approach is inflexible and may require implementation work if your company changes IdPs or uses a less-common IdP. I've worked through this several times in the past.

[`aws-credful`](https://www.npmjs.com/package/aws-credful) is a tool that lets you easily get credentials via SSO and save them into one or more AWS profiles. It pops up a login window using Electron so it supports any identity provider, not just a specific one like the tools that do HTML scraping. It can even log in once and obtain a profile for every role you have access to in one go.

Install it as a CLI like this:

```bash
npm install -g aws-credful
```

The SSO URL for your setup must be passed in, either on the command line or as an environment variable that you set in your shell profile. For the example:

```bash
aws-credful --url 'http://localhost:3000/saml' --all
```

If all has gone well, you should now have `sso-test-readonly` and `sso-test-poweruser` profiles saved to your `~/.aws/credentials` file. You can switch profiles by setting an environment variable (perhaps using a shell function):

```bash
export AWS_PROFILE=sso-test-readonly
```

For this to work properly with most SDKs, you should make sure you _don't_ have the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables set as they tend to come higher in the credential chain than profiles.

## Inject your credentials for local container development

AWS SDKs will use your currently configured profile when you run your code locally. But if you develop within Docker containers, they run an isolated environment that won't automatically have your credentials. While you might be tempted to go back to access keys in environment variables, there's a way to inject your profile. Here's a simple `docker compose` example:

```yaml
version: '3.9'
services:
  awscli:
    image: amazon/aws-cli
    environment:
      AWS_PROFILE: sso-test-readonly
      AWS_REGION: us-east-1
    volumes:
      - ${HOME}/.aws/credentials:/root/.aws/credentials
    command:
      - sts
      - get-caller-identity
```

Since `docker compose` supports environment variable expansion on the host side, we can make this portable and avoid hardcoding our own home directory. However, the mount target inside the container has to be absolute, so this will vary from image to image, and also depending on what user you're running as inside the image.

Of course, this provides all of your profiles to the container, so only do this with your own code or code you trust. It's also possible to extract a specific access key ID, secret, and token from your `credentials` file and provide them as environment variables, but I don't know of an existing tool that automates this.

## Craft company policy and remove IAM users

When setting up single sign-on, one of the goals should be that everyone logs in this way, and other methods (IAM users) are removed. The technical solution is only one part of this. Internal policy or standards are also needed to indicate when IAM users should and shouldn't be used, whether all human access should be through single sign-on, as well as how often any long-lived credentials should be rotated. There also need to be some follow-up sweeps of IAM users.

The payoff is that all developers/operators can log in using their enterprise credentials, using both the console and CLI, not have to rotate any credentials, and use easily configurable roles.
