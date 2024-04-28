---
title: Use a WebSocket client to exec commands in a Kubernetes pod
date: 2018-06-20
tags: kubernetes, javascript
---

Running command on Kubernetes containers from scripts or applications has many use cases, like configuration updates, checking on processes, sending graceful restart signals to web servers, and more.

You'd normally use `kubectl exec` to run a command on a pod. However, it can be useful to have a native code solution in an app rather than running a child process. This is more direct as `kubectl` is its own layer over the Kubernetes API that adds various behaviors. With just a little code you can make a JavaScript client that does what `kubectl exec` does.

## A basic Minikube demonstration setup

To follow along with the examples, you'll want [Minikube](https://kubernetes.io/docs/tasks/tools/install-minikube/). Once Minikube is installed, these commands will start a local Kubernetes cluster and create a single, unmanaged pod named `example`:

```
minikube start
kubectl run example --restart=Never --image=alpine -- tail -f /dev/null
```

Next, get the IP address of the local Kuberentes API server:

```
minikube ip
```

Mine was `192.168.99.101`, and the local API server listens on port `8443`, so I've used those values below.

## What does `kubectl` actually do?

The `kubectl` utility does quite a lot under the hood to facilitate using the Kubernetes management API. It's not just a plain wrapper around API calls like, for example, the AWS CLI. Most usages of `kubectl` make multiple API calls and may transform inputs and outputs. An example is `apply`, which is not a Kubernetes API method but a `GET` followed by either a `POST` or a `PATCH` depending on whether the `GET` returns an object. Another example is `exec`, which requires some HTTP upgrade machinery. Let's try it out using `--v=8`, which shows verbose output of all API calls that `kubectl` makes:

```
kubectl exec --v=8 example echo foo
```

You should see over 20 lines of output. First there's a GET request to make sure the pod is actually there. This isn't strictly necessary, but `kubectl` usually sends a GET first for validation. Then there's a POST. Note how the URL path is to a child resource under the pod, `/api/v1/namespaces/default/pods/example/exec`.

Finally, there's something like this:

```
Response Status: 101 Switching Protocols in 302 milliseconds
Response Headers:
    Connection: Upgrade
    Upgrade: SPDY/3.1
    X-Stream-Protocol-Version: v4.channel.k8s.io
```

Aha! To stream the output of the command we ran with `exec`, we just need a SPDY client. But put a pin in that that for a moment. As it turns out, and I spent a while figuring this out, SPDY is not super well supported in libraries and is basically a deprecated experiment, which [Chrome dropped support for in 2016](https://venturebeat.com/2016/02/11/google-chrome-will-drop-spdy-support-on-may-15-2016/) signaling a move away from SPDY to HTTP/2.

The Kubernetes API supports more than just SPDY, although it's what `kubectl` uses. It [doesn't yet support HTTP/2, but it does support WebSockets](https://github.com/kubernetes/kubernetes/issues/7452).

## Using WebSockets

WebSockets are well-supported in JavaScript, and I chose to use the `ws` library as a client.

Minikube uses client certificates for authorization, normally located in `$HOME/.minikube/`. Use `kubectl config view` to find the exact file paths of the `cert` and `key` used. In live Kubernetes clusters, there may be certificate, basic, or token authentication in use which could require different parameters.

The following script will run `echo foo` on the `example` pod and print the output:

```javascript
const fs = require('fs')
const WebSocket = require('ws')

url =
  'wss://192.168.99.101:8443/api/v1/namespaces/default/pods/example/exec?command=echo&command=foo&stderr=true&stdout=true'

sock = new WebSocket(url, {
  ca: fs.readFileSync(`${process.env.HOME}/.minikube/ca.crt`),
  cert: fs.readFileSync(`${process.env.HOME}/.minikube/client.crt`),
  key: fs.readFileSync(`${process.env.HOME}/.minikube/client.key`)
})

sock.on('upgrade', (x) => console.log('upgrade', x.headers.upgrade))
sock.on('open', () => console.log('open'))
sock.on('message', (x) => console.log('message', JSON.stringify(x.toString())))
sock.on('close', () => console.log('close'))
```

And the output you should get:

```
upgrade websocket
open
message "\u0001"
message "\u0001foo\n"
close
```

Everything here is reasonably self-explanatory, except for those `\u0001` characters. That's the file descriptor for `stdout`. Try changing the query string to:

```
?command=cat&command=notafile&stderr=true&stdout=true
```

This should change the output to:

```
upgrade websocket
open
message "\u0001"
message "\u0002cat: can't open 'notafile': No such file or directory\n"
message "\u0003command terminated with non-zero exit code: Error executing in Docker Container: 1"
close
```

This command has produced error output, and 2 is the file descriptor for `stderr`. There's also an additional descriptor 3 being used for an error that came from `exec` itself and was not transmitted from the pod.

Anything handling the `message` events for real should be reading the first byte from each event and using it to dispatch to separate buffers if needed.

## Getting ready for production

This is functionally all you need to execute code on Kubernetes pods from a script, but there are some additional considerations.

If you're running the code from a Kubernetes pod, you should use a `serviceaccount` which will give you a bearer token stored in `/var/run/secrets/kubernetes.io/serviceaccount/token` instead of a client certificate, and the CA will be at `/var/run/secrets/kubernetes.io/serviceaccount/ca.crt`.

Pod names generally can't be configured directly, because they normally contain random hashes when managed by deployments. Use the pods API to obtain the names of one or more pods based on a a label or other value.

With that, you should be prepared to start running commands. If it's not clear what a specific `kubectl exec` command does, go back to using `--v=8` to skim the URLs used.
