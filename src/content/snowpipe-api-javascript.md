---
title: Authenticating with Snowflake's Snowpipe API in JavaScript
date: 2019-08-16
tags: javascript, database
---

Recently I needed to create a reactive process that would load large amounts of generated files into Snowflake's [Snowpipe](https://docs.snowflake.net/manuals/user-guide/data-load-snowpipe.html), an asynchronous data-load service. If you're not familiar, Snowflake is a cloud SQL database using object storage and ephemeral compute instances. The process needed to support concurrently loading several files to keep up with our throughput, and in the background needed to poll some metrics and offer a metrics HTTP endpoint. I ended up putting this together in Node.js for the cheap async concurrency, but since there isn't an official Node.js SDK for Snowpipe, here's how to implement one.

The Snowpipe API endpoints are quite simple, but the authentication method is distinctive. Authenticating with the Snowpipe API requires a JWT that is signed with your private RSA key, but which also includes a hashed string constructed using your public key. The authentication requirements for the Snowpipe API aren't completely [documented](https://docs.snowflake.net/manuals/user-guide/data-load-snowpipe-rest.html), so I got them from the reference implementations available in [Java](https://github.com/snowflakedb/snowflake-ingest-java) and [Python](https://github.com/snowflakedb/snowflake-ingest-python).

The basic sequence of events for hash generation is:

1. Convert the private key into a public key (this saves on configuration, but you could also provide both the keys to your process)
2. Decode the public key into binary DER format
3. Hash the DER using SHA-256
4. Encode the hash using base 64
5. Preprend`"SHA256:"`

## Node 10.x - `node-forge`

At work we adopt only LTS versions of Node, currently 10.x for a while longer. The `crypto` module doesn't have the necessary functions, so we can pull in `node-forge` and implement like this (`pem` is a string with the contents of your private key):

```javascript
const forge = require('node-forge')
const privateKey = forge.pki.privateKeyFromPem(pem)
const publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e)
const publicKeyBytes = forge.asn1.toDer(forge.pki.publicKeyToAsn1(publicKey)).getBytes()
const signature = 'SHA256:' + forge.util.encode64(forge.md.sha256.create().update(publicKeyBytes).digest().getBytes())
```

## Node 12.x - `crypto`

The enhancements to the `crypto` standard library in versions 11-12 of Node make this hash generation even simpler.

```javascript
const crypto = require('crypto')
const publicKeyBytes = crypto.createPublicKey(pem).export({ type: 'spki', format: 'der' })
const signature = 'SHA256:' + crypto.createHash('sha256').update(publicKeyBytes).digest().toString('base64')
```

## JWT generation

With the hash in hand, generate a JWT as follows. (`account` and `username` for Snowflake should be in upper case.)

```javascript
const bearer = jwt.encode(
  {
    iss: `${account}.${username}.${signature}`,
    sub: `${account}.${username}`,
    iat: Math.round(new Date().getTime() / 1000),
    exp: Math.round(new Date().getTime() / 1000 + 60 * 59)
  },
  pem,
  'RS256'
)
```

At this point, the JWT can be used as a normal [bearer token](https://tools.ietf.org/html/rfc6750) until its expiration, before which a new token should be generated the same way.
