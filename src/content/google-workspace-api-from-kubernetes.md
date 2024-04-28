---
title: Google didn't make it easy to use workspace APIs from Kubernetes, but here's how
date: 2024-04-06
tags: aws, gcp, python
---

Using the Google Workspace APIs has always been a little more complex than it feels like it should be. While technically they're separate APIs and services from Google Cloud, the authentication runs through not just Google Cloud projects, but _service accounts_ – you can't just hit Google Workspace APIs "directly" with a user.

After creating my Google Cloud service account, rather than download a secret key file from Google Cloud (which would need to be manually rotated), I used federated workload identity to trade a Kubernetes service account for Google Cloud service account creds, [as I wrote about previously](/google-vertex-aws-federated-workload-identity).

But of course, it wasn't that simple, because using Google Workspace APIs depends on delegated access from the Google Cloud service account to the Google Workspace user, and there was a problem combining this with federated workload identity.

Locally, after I downloaded a service account key file and pointed the `GOOGLE_APPLICATION_CREDS` env var at it, auth was a simple matter of:

```python
import os
import google.auth

SCOPES = [
    "https://www.googleapis.com/auth/admin.directory.user",
    "https://www.googleapis.com/auth/admin.directory.group",
]
delegated_user = os.getenv("DELEGATED_USER")
credentials, project = google.auth.default()
credentials = credentials.with_subject(delegated_user).with_scopes(SCOPES)
```

The `with_subject` method here is responsible for taking the Google Cloud service account and making it usable on behalf of a given Google Workspace username (email address).

As soon as I deployed to Kubernetes, however, the code threw an `AttributeError` because, it turns out, the credentials object no longer had a `with_subject` method.

The problem here is that the Google Cloud auth libraries don't present a clean abstraction. I'm more used to AWS, and I'm fairly certain that although your AWS creds can come from different providers, and some might be temporary vs. long-lived, once you have your creds, they behave the same. With Google Cloud auth, on the other hand, we have a difference between creds sourced from different credential providers that actually behave differently (have different methods defined), and we have to do some form of type detection.

I found part of the solution in [this StackOverflow answer](https://stackoverflow.com/a/57092533). However, it was either incomplete or something changed in the last few years.

After a couple hours, I was unable to find a way to coerce my creds into a form that didn't require two separate code branches. I was, however, able to solve the problem in this way:

```python
import google.auth
import google.auth.iam
import google.auth.transport
from google.oauth2 import service_account


def get_credentials(username, scopes):
    delegation_scopes = ["https://www.googleapis.com/auth/iam"]
    token_url = "https://accounts.google.com/o/oauth2/token"
    credentials, project = google.auth.default()
    if hasattr(credentials, "with_subject"):
        return credentials.with_subject(username).with_scopes(scopes)
    request = google.auth.transport.requests.Request()
    credentials = credentials.with_scopes(delegation_scopes)
    credentials.refresh(request)
    signer = google.auth.iam.Signer(
        request, credentials, credentials.service_account_email
    )
    return service_account.Credentials(
        signer,
        credentials.service_account_email,
        token_url,
        scopes=scopes,
        subject=username,
    )
```

The happy case up front is for local credentials. If that doesn't work, we fall back to the workaround used to generate a new service account token. The two different scope assignments are an important part of the solution that I had trouble finding documented anywhere.

Also, this method requires that your federated principal has the Service Account Token Creator role so that it can create a new service account token (which is able to be used with a Google Workspace subject, unlike the service account token provided to your process).
