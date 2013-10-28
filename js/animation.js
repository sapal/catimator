"use strict";


var Position = function(x, y) {
  this.x = x;
  this.y = y;
}

var Keyframe = function(offset, position) {
  this.offset = offset;
  this.position = position;
}

var started = false;
var duration = 10;
var cat = null;
var fence = null;
var camera = null;
var animation = null;
var progress = null;
var player = null;
var progressPlayer = null;
var duration = 15;
var keyframes = [
    new Keyframe(0.0, new Position(4, 1)),
    new Keyframe(1.0, new Position(-1, 1)),
    new Keyframe(0.4, new Position(1.5, 0.8)),
  ];

var restartAnimation = function() {
  started = true;
  animation = generateAnimation(cat, keyframes, duration);
  player = document.timeline.play(animation);
  progressPlayer = document.timeline.play(new Animation(bar, [
    {offset: 0.0, width: "0%"},
    {offset: 1.0, width: "100%"},
  ], duration));
};

var generateAnimation = function(object, keyframes, duration) {
  var transforms = [];
  keyframes.sort(function(k1, k2) {return k1.offset - k2.offset;});
  for (var i = 0; i < keyframes.length; i++) {
    var keyframe = keyframes[i];
    if (keyframe.offset > 1) break;
    var xPercent = (keyframe.position.x * 100) + "%";
    var yPercent = (keyframe.position.y * 100) + "%";
    transforms.push({
      offset: keyframe.offset, 
      transform: "translate(" + xPercent + ", " + yPercent + ")",
    });
  }
  return new Animation(object, transforms, {duration: duration});
}

window.addEventListener("load", function() {
  cat = document.getElementById("cat");
  camera = document.getElementById("camera");
  fence = document.getElementById("fence");
  progress = document.getElementById("progress");
  var cancelDrag = function() {return false;};
  cat.addEventListener("dragstart", cancelDrag);
  fence.addEventListener("dragstart", cancelDrag);
  //restartAnimation();
  
  document.addEventListener("mousemove", function(e) {
    if (!started) return;
    var x = e.pageX;
    var y = e.pageY;
    var position = progressPlayer.currentTime - progressPlayer.startTime;
    if (e.which != 0) {
      player.paused = true;
      player.source = null;
      var xFraction = (x - camera.offsetLeft) / cat.width;
      var yFraction = (y - camera.offsetTop) / cat.height;
      var xPercent = 100 * xFraction;
      var yPercent = 100 * yFraction;
      cat.style.webkitTransform =  "translate(" + xPercent + "%, " + yPercent + "%)";
      var offset = position / duration;
      keyframes.push(new Keyframe(offset, new Position(xFraction, yFraction)));
    } else if (player.source === null) {
      animation = generateAnimation(cat, keyframes, duration);
      player = document.timeline.play(animation);
      player.currentTime += position;
    }
  })
  
  progress.addEventListener("click", function() {
    restartAnimation();
  });
});
