---
title: Dynamically embed looping clips from YouTube
date: 2014-11-14
tags: javascript
---

Recently I needed to come up with a way to play short looping video clips on a web site, without the distraction of controls, and muted to prevent them from being annoying. (Similar in a sense to the direction Imgur is taking in replacing the GIF with control-less videos).

A lot is possible with the YouTube Player Tools. You can get most of the way just with [query parameters](https://developers.google.com/youtube/player_parameters), including disabling the controls and setting a start and end timestamp.

However, I encountered multiple roadblocks trying to get this to work properly, and it ended up being Javascript-dependent. The [`embedSWF`](<https://code.google.com/p/swfobject/wiki/api#swfobject.embedSWF(swfUrlStr,_replaceElemIdStr,_widthStr,_height)>) function from [SWFObject](https://code.google.com/p/swfobject/) makes embedding fairly easy, but the callback functions take some finesse.

Here are some issues that need to be worked around:

- Although there are many URL parameters that allow you to configure your embed without Javascript, `mute` is not one of them. So playing an automatically muted video requires Javascript.

- The callback function passed to `embedSWF` is called before the API is initialized, so you have to poll.

- There is also a hardcoded call to a function named `onYouTubePlayerReady()` that happens regardless and is called after the API is ready. But because it is hardcoded by name, there could be conflicts if you have multiple scripts that use the YouTube API, so I used the `embedSWF` callback instead.

- Once you start the video using Javascript and play only a clip, the `loop` argument does not actually loop the video. It can, if you set the `playlist` argument to the video id, but I observed this starting the video from the beginning and re-buffering it. So this requires a Javascript implementation as well, using the `onStateChange` event handler.

- But `onStateChange` does not get passed the identity of the player the event applies to, only the state, and the API's `addEventListener` function does not take a closure, only a string containing the name of a function. So to simulate passing a separate function in for each player, you need dynamically named functions (oh so dirty, but fortunately, not difficult).

Here is the callback function I came up with to handle all of this:

```javascript
function youTubeClipCallback(event) {
  var player = event.ref,
    callbackName = '_youtubeCallback_' + event.id
  if (!player.playVideo) {
    setTimeout(function () {
      youTubeClipCallback(event)
    }, 10)
    return
  }
  player.mute()
  player.playVideo()
  player.addEventListener('onStateChange', callbackName)
  window[callbackName] = function (state) {
    if (state === 0) {
      // 0 is stopped
      player.playVideo()
    }
  }
}
```

This function sets up a simple polling timer to make sure the API has initialized before using it (in this case, muting and then auto-playing the video).

The `onStateChange` handler is then given a unique (global) name by being inserted into the `window` object.

After all this there are still some annoyances:

- If the video has ads, the ad box will come back up every time the video restarts even after being manually closed by the user, which is pretty annoying when you're looping a 5-second clip. But that's on YouTube's end.

- I also have noticed significant skipping some (not all) of the time when the clips restart.

Apart from that, the method works. The clips autoplay and loop, and with controls active you can observe that no more of the video is buffered than necessary.
