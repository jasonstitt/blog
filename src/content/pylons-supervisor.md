---
date: 2009-08-28
title: Managing multiple Pylons apps with Supervisor
tags: python
---

Wouldn't it be nice if your long-running processes, such as web applications and even HTTP servers, could be managed from one place?

There are a number of tools, including [Supervisor](http://supervisord.org/), daemontools, and runit, that will launch processes, allow them to be configured in various ways, and restart them if they stop unexpectedly. This means you only have to make sure one process is started upon system startup, and it will take care of the rest. This article concentrates on how to manage Pylons web applications using Supervisor, which is fairly easy to configure.

This is something of a whistle-stop tour, aimed at getting you started with a working configuration. Supervisor is quite flexible, and it's a good idea to read the [manual](http://supervisord.org/manual/current/index.html).

Assuming you have `easy_install` (and if you're using Pylons you almost certainly do) but not `supervisor` yet, here's how to get started. Note that Supervisor does not work on Windows, so this is a Linux/BSD/OS X/etc. tutorial.

```text Console
easy_install supervisor
mkdir /apps
cd /apps
paster create -t pylons app1
paster create -t pylons app2
```

I don't necessarily expect you to create `/apps` in the root of your filesystem. Create it where you like, but substitute your directory when I talk about `/apps`, which I'm using for simplicity in this article, later on.

After executing these commands, you'll have two Pylons applications. They won't do much, but they'll serve as a demonstration. Use real apps instead if you like.

## Configuring Supervisor

The Supervisor configuration file should be located at `/etc/supervisord.conf`. If you would like to place it elsewhere for deployment purposes, I strongly recommend creating a symlink at `/etc/supervisord.conf` as that seems to be where Supervisor will look for configuration when restarted, even if you gave it a different initial configuration file.

I'll show you the necessary configuration for Supervisor in several parts. Here's the first configuration block:

```ini
[supervisord]
logfile = /tmp/supervisord.log
logfile_maxbytes = 50MB
logfile_backups=10
loglevel = info
pidfile = /tmp/supervisord.pid
nodaemon = false
minfds = 1024
minprocs = 200
umask = 022
identifier = supervisor
directory = /tmp
nocleanup = true
childlogdir = /tmp
strip_ansi = false

```

Supervisor uses an INI-style configuration file, which is divided into sections. Each section has a name enclosed in square brackets. This section sets up some basic parameters that you can adjust if you want.

Now, let's talk about permissions. If run as root with this configuration, Supervisor will retain root permissions. You can then configure a user for each program that Supervisor runs, and it will drop root permissions for those specific programs. This is useful if some of the programs you manage need to run as root. For example, if you manage lighttpd as well as your Pylons apps, you may need lighttpd to run as root while your apps run as a non-root user.

If you want Supervisord to drop root permissions across the board, add a `user = <username>` line to the `[supervisord]` section of the configuration file.

If you allow Supervisord to remain root, make sure the configuration file is writable only by root!

Next, let's set up `supervisorctl`, which is a command-line utility that lets you see the status and output of processes and start, stop, and restart them.

```ini
[unix_http_server]
file = /tmp/supervisord.sock

[supervisorctl]
serverurl = unix:///tmp/supervisord.sock

[rpcinterface:supervisor]
supervisor.rpcinterface_factory = supervisor.rpcinterface:make_main_rpcinterface

```

With this configuration, `supervisorctl` will only be available from the command line on the local machine, because it's using a file-based socket. Supervisor also supports HTTP and has a web interface, but I'm leaving it disabled for security reasons.

After saving `supervisord.conf`, you should be able to run `supervisord`, followed by `supervisorctl`, and end up in an interactive shell. There are no processes running, so it's not very interesting, but you can type `help` for a list of options, and `exit` to leave.

Finally, let's add some processes. Open that config file back up.

```ini
[program:app1]
user = <yourusername>
command = paster serve --reload /apps/app1/development.ini
environment = PYTHONPATH=/apps/app1/,PYTHON_EGG_DIR=/tmp/python-eggs/

[program:app2]
user = <yourusername>
command = paster serve --reload /apps/app2/development.ini
environment = PYTHONPATH=/apps/app2/,PYTHON_EGG_DIR=/tmp/python-eggs/

```

Although in this example the names of the `program` blocks are the same as the names of the applications, they don't have to be. For example, if your application was named `reallylongappname`, your Supervisor configuration could read `[program:rla]`, or whatever you like. The name in the `program` heading is what will appear in `supervisorctl`.

The environment can be set individually for each process. Here, the Python path is set because we're in development and have not installed the applications as packages.

After saving `supervisord.conf`, either type `supervisorctl update`, or type `supervisorctl` to enter the interactive shell and type `update`. Either style works, so it's a matter of whether you want to leave a shell open for convenience.

Now, type `supervisorctl status`, or in the interactive shell type `status`. You should see two items, `app1` and `app2`, both marked `RUNNING`. If they instead show an error or exit condition, something went wrong.

Say `app1` failed to start. The best thing to do is `supervisorctl tail app1 stderr`, which will show you the last log messages that `app1` printed. You can also add a `-f` switch after `tail`, just as with the real `tail` utility, to see live updates of an application's output.

## Where to go from here

It's up to you which programs you would like to manage using Supervisor, and which are better off being managed by your operating system's init system of choice, such as `init.d`, `rc.d`, or `launchd`.

It can be useful, however, to run your HTTP server, such as `lighttpd`, under Supervisor. This makes it easy to restart the server without `su` or `sudo`, since the Supervisor process is running as root (if configured as above &mdash; and remember to make the configuration file writable only by root to prevent abuse).

```ini
[program:http]
command = /usr/sbin/lighttpd -D -f /etc/lighttpd.conf

```

(Remember that `-D` argument, which prevents `lighttpd` from daemonizing itself.)

If necessary, you can even run multiple HTTP servers on different ports, which gives you more flexibility than a system-wide startup script.
