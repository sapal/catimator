"use strict";

var player = null;

window.addEventListener("load", function() {
  var camera = document.getElementById("camera");
  var progress = document.getElementById("progress");
  var bar = document.getElementById("bar");
  player = new Player(camera, bar, 10);

  document.addEventListener("click", function() {
    player.playPause();
  });
  document.addEventListener("keydown", function(e) {
    var keyCode = e.keyCode || e.which; 
    if (keyCode ===  32) { // Space
      player.playPause();
    }
  });

  player.deserialize(animation);
});

