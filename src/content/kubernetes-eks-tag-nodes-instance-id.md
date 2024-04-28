---
title: Always know what EC2 instance runs your EKS node with custom labels
date: 2021-12-30
tags: aws, kubernetes
---

Here's a quick tip for making AWS EKS clusters a little easier to work with.

There's some friction between the Kubernetes nodes list and the EC2 instances list in a typical out-of-box implementation. Nodes end up being named by IP address. EC2 instances can be looked up that way, but it's not the most convenient, especially since the punctuation is usually different.

When it comes to SSM, particularly session manager, EC2 instance ID is the main way to select an instance for a shell session.

For this reason it's a good call to label nodes by EC2 instance ID.

Following this tip requires editing the user data for your EKS nodes. Any label you like can be added when the node joins the cluster, by adding `kubelet` arguments. Assuming you're using the `bootstrap.sh` that comes with EKS AMIs, this is done using the `--kubelet-extra-args` flag.

Here's what it looks like in user data:

```bash
INSTANCE_ID=$(curl http://169.254.169.254/latest/meta-data/instance-id)
KARGS="--node-labels=instance=$INSTANCE_ID"
/etc/eks/bootstrap.sh <cluster_name> --kubelet-extra-args "$KARGS"
```

Now, listing nodes with `kubectl get nodes --show-labels` will bring in the instance ID for all your nodes.
