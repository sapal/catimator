"use strict";

var player = null;

window.addEventListener("load", function() {
  var camera = document.getElementById("camera");
  var control = document.getElementById("control");
  var playPauseButton = document.getElementById("play-pause");
  var fullscreenButton = document.getElementById("fullscreen");
  var bar = document.getElementById("bar");
  var progress = document.getElementById("progress");
  var hide = function() {
    control.classList.add("hidden");
  };
  var hideTimeout = null;
  var updateHideTimeout = function() {
    if (hideTimeout != null) {
      window.clearTimeout(hideTimeout);
    }
    if (player.playing()) {
      hideTimeout = setTimeout(hide, 2000);
    } else {
      control.classList.remove("hidden");
    }
  };
  var show = function() {
    control.classList.remove("hidden");
    updateHideTimeout();
  };
  var playPause = function() {
    player.playPause();
    playPauseButton.classList.remove("ended");
    if (player.paused()) {
      playPauseButton.classList.add("paused");
    } else {
      playPauseButton.classList.remove("paused");
    }
    updateHideTimeout();
  };
  
  player = new Player(camera, bar, 10);

  document.addEventListener("keydown", function(e) {
    var keyCode = e.keyCode || e.which; 
    if (keyCode ===  32) { // Space
      playPause();
    }
  });
  document.addEventListener("mousemove", show);
  document.addEventListener("touch", show);
  document.addEventListener("click", show);
  player.addEventListener("end", show);
  player.addEventListener("end", function() {
    playPauseButton.classList.add("ended");
  });
  playPauseButton.addEventListener("click", function(e) {
    playPause();
    e.stopPropagation();
    return false;
  }, true);
  fullscreenButton.addEventListener("click", function() {
    fullscreenButton.classList.toggle("fullscreen");
    if (fullscreenButton.classList.contains("fullscreen")) {
      requestFullScreen();
    } else {
      cancelFullScreen();
    }
  });

  progress.addEventListener("click", function(e) {
    player.seek(e.offsetX / progress.clientWidth * player.duration);
    e.stopPropagation();
    return false;
  }, true);
  document.addEventListener("click", playPause);
  player.deserialize(animation);
});

