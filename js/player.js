"use strict";

var player = null;

window.addEventListener("load", function() {
  var camera = document.getElementById("camera");
  var control = document.getElementById("control");
  var playPauseButton = document.getElementById("play-pause");
  var fullscreenButton = document.getElementById("fullscreen");
  var bar = document.getElementById("bar");
  var progress = document.getElementById("progress");
  var edit = document.getElementById("edit");
  var scene = document.getElementById("scene");
  
  var hide = function(doHide) {
    var elements = [control, edit, scene];
    for (var i = 0; i < elements.length; ++i){
      var element = elements[i];
      if (doHide) {
        element.classList.add("hidden");
      } else {
        element.classList.remove("hidden");
      }
    }
  };
  var hideTimeout = null;
  var updateHideTimeout = function() {
    if (hideTimeout != null) {
      window.clearTimeout(hideTimeout);
    }
    if (player.playing()) {
      hideTimeout = setTimeout(function() {hide(true);}, 2000);
    } else {
      hide(false);
    }
  };
  var show = function() {
    hide(false);
    updateHideTimeout();
  };
  var updatePlayButton = function() {
    if (player.ended) {
      playPauseButton.classList.remove("paused");
      playPauseButton.classList.add("ended");
      playPauseButton.title = "Rewind";
    } else {
      playPauseButton.classList.remove("ended");
      if (player.paused()) {
        playPauseButton.classList.add("paused");
        playPauseButton.title = "Play";
      } else {
        playPauseButton.classList.remove("paused");
        playPauseButton.title = "Pause";
      }
    }
  };
  
  var playPause = function() {
    player.playPause();
    updatePlayButton();
    updateHideTimeout();
  };
  
  player = new Player(camera, bar, 10);

  document.addEventListener("keydown", function(e) {
    var keyCode = e.keyCode || e.which; 
    if (keyCode ===  32) { // Space
      playPause();
    }
  });
  
  /* Workaround for chrome bug:
  https://code.google.com/p/chromium/issues/detail?id=103041
  */
  var lastMouseMove = {x: 0, y: 0};
  document.addEventListener("mousemove", function(e) {
    if (e.x !== undefined && e.x == lastMouseMove.x &&
      e.y == lastMouseMove.y) {
      return;
    } else {
      lastMouseMove.x = e.x;
      lastMouseMove.y = e.y;
    }
    show();
  });
  document.addEventListener("touch", show);
  document.addEventListener("click", show);
  player.addEventListener("end", show);
  player.addEventListener("end", updatePlayButton);
  playPauseButton.addEventListener("click", function(e) {
    playPause();
    e.stopPropagation();
    return false;
  }, true);
  
  fullscreenButton.title = "Fullscreen";
  fullscreenButton.addEventListener("click", function(e) {
    fullscreenButton.classList.toggle("fullscreen");
    if (fullscreenButton.classList.contains("fullscreen")) {
      fullscreenButton.title = "Exit fullscreen";
      requestFullScreen();
    } else {
      fullscreenButton.title = "Fullscreen";
      cancelFullScreen();
    }
    e.stopPropagation();
    return false;
  }, true);

  progress.addEventListener("click", function(e) {
    var x = e.offsetX===undefined ? e.layerX : e.offsetX;
    player.seek(x / progress.clientWidth * player.duration);
    updatePlayButton();
    e.stopPropagation();
    return false;
  }, true);
  document.addEventListener("click", playPause);
  player.deserialize(animation);
});

