"use strict";

var player = null;

window.addEventListener("load", function() {
  var camera = document.getElementById("camera");
  var progress = document.getElementById("progress");
  var bar = document.getElementById("bar");
  player = new Player(camera, bar, 10);

  var playPause = function() {
    if (player.paused()) {
      player.unpause();
    } else {
      if (player.position() === 0 || player.position() === 1) {
        player.stop();
        player.play();
      } else {
        player.pause();
      }
    }
  };

  document.addEventListener("click", playPause);
  document.addEventListener("keydown", function(e) {
    var keyCode = e.keyCode || e.which; 
    if (keyCode ===  32) { // Space
      playPause();
    }
  });

  player.deserialize(animation);
});

