---
date: 2010-04-19
title: Show your IP address using a Lua/Lighttpd script
---

Sometimes it's useful to be able to determine your external WAN IP address from a script. There are web sites that will tell you your IP, but they're formatted for human readership and might go away or change their HTML format at any time. You could access the HTML administration interface of your router, but that's subject to changes in router brand or login information.

Another way is to set up a script on your own web server that reports the IP of the client accessing it.

There are tons of ways to do this... a CGI script, a web application in your language of choice, a PHP file even if it's not your main development environment. But here's one you might not have thought of. If you're using Lighttpd, you can use its Lua scripting support to do this extremely simply, without much setup and without involving any of your (possibly more complex) web development environments.

I don't even have CGI or PHP enabled on this web server, and my primary web-application development style based on long-running processes and frameworks is a bit "heavy" for a single-purpose script like this. And I didn't want to add it as a view to an existing app, as there would be no meaningful relationship between the two.

So, Lua it was. Here's `remote_ip.lua`:

```lua
lighty.content = { lighty.env["request.remote-ip"] }
return 200
```

And here's the Lighttpd configuration required (adapt to your domain/URL structure):

```txt
server.modules = (
    "mod_lua"
)

## ...

$HTTP["host"] =~ "^ip.example.com$" {
    magnet.attract-physical-path-to = ( "/path/to/remote_ip.lua" )
}
```

Simple enough.
