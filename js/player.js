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
  player = new Player(camera, bar, 10);

  wireControlPanel(player, playPauseButton, progress, bar,
    fullscreenButton, [document], [control, edit, scene]);
  player.deserialize(animation);
});

