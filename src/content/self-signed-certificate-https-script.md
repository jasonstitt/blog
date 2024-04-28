---
title: Create a self-signed https certificate with a script
date: 2016-12-03
---

One of the things I always have to Google is how to create a self-signed cert for development. It's hard to remember because it's a bunch of gibberish commands in a row that I only use every so often.

So, here's a script that does all the legwork. This is completely non-interactive, at the cost of not filling in any location or organization information (because of that `yes ""`). The result is a PEM-formatted `.key` and `.crt` file without passcode (which you can combine into a single `.pem` for a server if desired, especially if you don't care about distributing the public key separately).

```bash
#!/bin/sh

BASENAME=${1:-server}

openssl genrsa -des3 -passout pass:x -out $BASENAME.key.passcode.tmp 2048
openssl rsa -passin pass:x -in $BASENAME.key.passcode.tmp -out $BASENAME.key
yes "" | openssl req -new -key $BASENAME.key -out $BASENAME.csr.tmp
openssl x509 -req -sha256 -days 365 -in $BASENAME.csr.tmp -signkey $BASENAME.key -out $BASENAME.crt

rm $BASENAME.key.passcode.tmp
rm $BASENAME.csr.tmp
```
