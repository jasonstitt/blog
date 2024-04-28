---
title: Using Google Vertex AI, but from AWS (federated auth)
date: 2023-11-19
tags: aws, gcp, llm
---

Things are pretty interesting right now for people developing any software that might benefit from LLMs, which is a lot of software. New announcements are constantly coming out, models are leapfrogging each other, and it feels like nobody knows what we'll all be doing with LLMs next month.

Therefore, I've been trying to make sure that our dev teams at work have the option to use a number of different supported models and that we don't over-specialize on one model or one vendor. At the same time, we don't want a free-for-all and want to make sure that things like authentication are well-managed and working smoothly.

Part of this tapestry was setting up [workload identity federation](https://cloud.google.com/iam/docs/workload-identity-federation) so that services running on AWS could easily use Google Cloud APIs – particularly Vertex AI – without developers having to manage service account JSON files by hand. Instead, a trust relationship allows services to authenticate using their existing AWS IAM role or Kubernetes service account.

## IAM role federation

The first type of workload identity federaiton I set up mapped AWS IAM roles to Gogle Cloud service accounts.

This is a flexible approach because wherever you can get an AWS IAM role, you should be able to use the credentials with Google Cloud (with an important caveat -- see below).

I used something similar to the following Terraform resources on the Google Cloud side:

```hcl
locals {
  aws_accounts = {
    "xxxxxxxxxxxx" = "dev"
  }
}

resource "google_iam_workload_identity_pool" "aws" {
  workload_identity_pool_id = "aws"
  display_name              = "AWS federation"
  description               = "Workload identity federation pool for AWS"
}

resource "google_iam_workload_identity_pool_provider" "aws" {
  for_each = local.aws_accounts

  workload_identity_pool_id          = google_iam_workload_identity_pool.aws.workload_identity_pool_id
  workload_identity_pool_provider_id = "aws-${each.value}"
  display_name                       = "AWS ${each.value}"
  description                        = "Identity pool provider for AWS account ${each.key} (${each.value})"
  attribute_mapping = {
    "google.subject"        = "assertion.arn"
    "attribute.aws_account" = "assertion.account"
    "attribute.aws_role"    = "assertion.arn.extract('assumed-role/{role}/')"
  }
  aws {
    account_id = each.key
  }
}

resource "google_service_account" "aws_test" {
  account_id   = "aws-test-account"
  display_name = "AWS federation test account"
}

resource "google_service_account_iam_binding" "aws_test" {
  service_account_id = google_service_account.aws_test.name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "principal://iam.googleapis.com/${google_iam_workload_identity_pool.aws.name}/subject/arn:aws:sts::xxxxxxxxxxxx:assumed-role/my-aws-role-name",
  ]
}
```

I had to mount the Kubernetes service account in the pod in a specific way, rather than relying on the default mount, so the audience for the token points to Google Cloud:

```yaml
## ...
volumes:
  - name: gcp-token
    projected:
      sources:
        - serviceAccountToken:
            audience: https://iam.googleapis.com/projects/<project-id>/locations/global/workloadIdentityPools/aws/providers/aws-dev
            expirationSeconds: 3600
            path: token
    # ...
    volumeMounts:
      - name: gcp-token
        mountPath: '/var/run/gcp'
        readOnly: true
## ...
```

The service running on AWS then required a Google Cloud credentials JSON file that looks like this:

```json
{
  "type": "external_account",
  "audience": "//iam.googleapis.com/projects/<project-id>/locations/global/workloadIdentityPools/aws/providers/aws-dev",
  "subject_token_type": "urn:ietf:params:oauth:token-type:jwt",
  "token_url": "https://sts.googleapis.com/v1/token",
  "credential_source": {
    "file": "/var/run/gcp/token",
    "format": {
      "type": "text"
    }
  },
  "service_account_impersonation_url": "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/aws-test-account:generateAccessToken"
}
```

Set the environment variable `GOOGLE_APPLICATION_CREDS` to the path of this file. In reality, since aspects of this including the provider name and service account name need to be parameterized, I mounted the JSON using a `ConfigMap` and inserted Helm values.

Unfortunately, there's a catch (isn't there usually?) After getting most of the way through implementing federated workload identity, I found out that the Google Cloud SDK lacks full support for the AWS default credentials chain, and specifically won't get an AWS IAM role from an EKS service account token. There's a [bug on the public issue tracker](https://issuetracker.google.com/issues/238911014), which has been open for 16 months.

As a result, when running on EKS it's necessary to first use the AWS SDK to call AssumeRole, obtain the key, secret, and session token, and hoist them into environment variables or another form that the Google Cloud SDK will be willing to use. There also needs to be an expiration and refresh based on the timeout of the AWS credentials' session token.

While arguably still superior to slinging around GCP service account keys in JSON files and manually rotating them, this is… less than convenient. I looked into an alternative approach.

## Kubernetes service account federation

GCP service accounts can be accessed directly by mapping Kubernetes service accounts as principals. This is in a sense more direct than the previous approach because it goes directly from Kubernetes to Google Cloud without any AWS IAM in between. Of course, it also loses the flexibility of being able to be used with AWS credentials in non-Kubernetes circumstances, and it's also therefore harder to use an equivalent approach in local testing.

I started on the Google Cloud side by setting up the new federation (alongside the example above):

```hcl
locals {
  kube_clusters = {
    "dev"  = "https://oidc.eks.<region>.amazonaws.com/id/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  }
}

resource "google_iam_workload_identity_pool_provider" "kube" {
  for_each = local.kube_clusters

  workload_identity_pool_id          = google_iam_workload_identity_pool.aws.workload_identity_pool_id
  workload_identity_pool_provider_id = "kube-${each.key}"
  display_name                       = "kube-${each.key}"
  description                        = "Identity pool provider for Kubernetes cluster ${each.key}"
  attribute_mapping = {
    "google.subject"                 = "assertion.sub"
    "attribute.namespace"            = "assertion['kubernetes.io']['namespace']",
    "attribute.service_account_name" = "assertion['kubernetes.io']['serviceaccount']['name']",
    "attribute.pod"                  = "assertion['kubernetes.io']['pod']['name']"
  }
  oidc {
    issuer_uri = each.value
  }
}
```

The principal mapping changed to look like this:

```hcl
resource "google_service_account_iam_binding" "aws_test" {
  service_account_id = google_service_account.aws_test.id
  role               = "roles/iam.workloadIdentityUser"
  members = [
    "principal://${google_iam_workload_identity_pool.aws.name}/subject/system:serviceaccount:my-namespace:my-serviceaccount-name",
  ]
}
```

The Kubernetes service account no longer needs the role annotation. The token volume mount and the JSON file both look the same, but remember to swap out the name of the identity pool provider from the AWS role one to the Kubernetes service account one (`aws-dev` and `kube-dev` in this example).

This all worked. The main problem here is that I can't find any way to support wildcards in Google Cloud principal definitions, so you have to add every individual Kubernetes service account directly. This can be inconvenient if you deploy workloads dynamically, for example, off of feature branches in a dev environment. This can be dealt with by sharing Kubernetes service accounts among deployments in these cases.
