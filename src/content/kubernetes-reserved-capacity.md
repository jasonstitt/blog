---
title: Over-provision your Kubernetes cluster so things start faster
date: 2021-12-29
tags: kubernetes
---

The [Cluster Autoscaler](https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler) on your Kubernetes cluster will try to shut off unused nodes to keep the cluster efficient. Of course, it won't manage to get rid of all the unused capacity because of imperfect bin-packing. But overall, there won't be reliable warm capacity for new pods, which means that starting up pods with substantial resource requirements will probably end up waiting on a cluster scale-up.

There's a fine line to walk here between performance and cost efficiency. For cost efficiency, you don't want to run unused capacity. But it's good to be able to spin up a large pod without waiting a couple minutes for a new node, and a moderate amount of unused warm capacity in a cluster is probably a good thing.

We can accomplish this by reserving a certain amount of resources with low-priority pods.

First, we need a [`PriorityClass`](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/) that can be preempted by any other pod:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: overprovisioning
value: -1
globalDefault: false
preemptionPolicy: Never
description: 'Priority class used by overprovisioning.'
```

Priority values are normally positive, and the higher the value, the higher the priority. So a -1 priority will give way to any other normal workload on the cluster.

Next, we need to run one or more pods with this low priority. The pods do nothing (just wait and block), but are configured to request the amount of resources we want to be reserved on the cluster.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: overprovisioning
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: overprovisioning
  template:
    metadata:
      labels:
        app: overprovisioning
    spec:
      priorityClassName: overprovisioning
      containers:
        - name: pause
          image: k8s.gcr.io/pause
          resources:
            requests:
              cpu: 2000m
              memory: 8Gi
```

The `k8s.gcr.io/pause` image does nothing... efficiently. So, it's perfect for just taking up space.

Set the `replicas`, `cpu`, and `memory` based on how much warm capacity you want to reserve on your cluster. The values above are just samples. The requests, of course, can't be bigger than what will fill an entire node — after the system and daemonsets. So to reserve multiple nodes, arrange the requests to fill a node and then increase `replicas`.

As soon as another pod needs to be scheduling using the resources that an `overprovisioning` pod is taking up, it will be evicted in favor of the new pod. The `overprovisioning` pod will then come back, possibly triggering a cluster scale-up event and taking up a new node.
