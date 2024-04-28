---
title: Moving this blog to AWS (S3, CloudFront, Route 53)
date: 2016-10-02
tags: aws
---

For the last few years, this blog has been rendered by a static site generator called Pelican. I've thought from time to time about moving it to a true static file hosting environment such as S3, but it's been chugging along happily enough on Linode running a good ol' web server. Over the weekend, I decided to just move it over to AWS and, minus a brief period where this domain just showed a CloudFront error, everything went pretty smoothly.

## S3

However static a site served with Nginx or Apache might seem, S3 is more static than that. I say this because even when serving static files, Nginx/Apache have rules and behaviors they evaluate that affect what gets sent to the client, such as content-type negotiation (or just MIME type rules base on file extensions), rewrite/redirect rules, and anything you can put in using server configuration, plugins, `.htaccess` files, Lua scripts if you're on `lighttpd`, etc.

S3 doesn't have anywhere near as much runtime behavior. You put your files up as objects with paths, and they get served. You can add headers, which are properties of an object, not determined at serve time.

The first thing I tried for uploading was the `aws s3 sync` command from the AWS CLI. It works great for basic use cases, but if you have to handle different file types differently, it's a little too simple, so I'm currently using a custom uploader script I wrote for Node using the `aws-sdk` library. It uses `mime` to set the proper `ContentType` metadata on each object and handles my "clean URLs". If you look at the location bar, you might notice that I serve pages on this site without a file extension. In Nginx this was a simple matter of a `try_files` rule. `try_files` is a good example of how, while the files may be static, the server behavior is not. For S3, I had to write some uploading logic that stripped the extension (on the remote path) for HTML files other than `index.html` (which should keep the extension), while retaining the `ContentType` property of `text/html`.

After getting the uploader figured out, the rest wasn't hard. Once you activate serving a bucket as a web site through the S3 console, it's pretty much live. But there are a few more pieces to put in place.

## Certificate Manager

Since January 2016, Amazon provides free SNI-based SSL/TLS certificates for use with CloudFront and Elastic Load Balancer. Although there isn't much point in securing a static blog, I wanted to try it out, and it'll help if I launch a subdomain later for backend API services for some apps.

The actual process is very easy. I put in my domain name (both `jasonstitt.com` and `*.jasonstitt.com`) and got an e-mail confirmation almost immediately.

I think it's great that between Let's Encrypt and other services like AWS Certificate Manager, SSL/TLS is becoming far more accessible. Major organizations including Google's search arm are pushing for more use of the `https` protocol across the web, and making it not only cheap but easy to get certs is an essential part of that.

## CloudFront

I'm putting CloudFront third because it's helpful to already have the SSL cert set up. Again, I don't really need CloudFront for a small static blog that doesn't get much traffic. But I wanted to set it up, it's pretty cheap, and S3 by itself cannot terminate an SSL/TLS connection (while CloudFront or ELB can).

A new CloudFront distribution takes a while to deploy. Seriously, create it before lunch and check on it later. Also, each change to the distribution configuration (I had to make several) takes another 10-20 minutes to fully propagate.

## Route 53

Route 53 is a DNS service (and domain registrar) that lets you manage general, all-purpose DNS and also specifically allows for ALIAS records to CloudFront distributions and other parts of AWS (including S3 directly, if you prefer).

Route 53 seems a bit pricey for hobby sites. It adds $6 per year per domain just for DNS hosting. That's 50% on top of the cost of the domain. I don't really understand why, when most AWS managed services have completely usage-based and pro-rated pricing, there's a flat fee like this just to host what is essentially a few lines of text. It's required to be able to route DNS to Amazon services like S3 and CloudFront, though.

I didn't switch my domain over to Route 53 just yet, although there's not much reason not to in the future. So I had to just copy the four nameservers over from the Route 53 hosted zone configuration. My TTL is fairly low, so the site switched right over.

Now, that CloudFront error I mentioned at the top that made the site inaccessible -- that was because I simply forgot to enter the CNAME configuration in CloudFront. So the domain was routing to CloudFront properly, and CloudFront was routing to S3 properly... but the host name didn't match so CloudFront wouldn't serve anything. After I updated the CNAME configuration (and waited another 10-15 minutes), everything came right up.

## Disqus

I use Disqus on my site, which allows me to have comments on a fully static blog. What I didn't know is that Disqus treats `http` and `https` URLs as separate, so when I switched the site to `https` none of my comments showed up.

This is fairly simple to fix. You need to go into the Disqus admin, download a CSV file listing all of your URLs in the system, add a second column with the new URLs, and upload that back. The help text says this can take up to 24 hours, which is probably for large sites, but for my little blog it took about a minute.

I also tried their "crawler" approach, which attempts to access the current configured URLs and follow 301 redirects. This resulted in some weird URLs with double slashes (`//`) in them and basically did not work for me.

## Summary

There were a lot of moving parts to getting this all set up. Now that it's running, however, the number of moving parts from my perspective is low because these are managed services. I mostly just have to worry about the custom uploader.

If this were my sole hosting environment, the low cost of S3/CloudFront would easily compensate for the flat cost of Route 53 hosted zones and I would be saving money versus my Linode or even most shared hosting. As it is, I still have things on my Linode so that I can't shut it off, so I'm not saving anything.
