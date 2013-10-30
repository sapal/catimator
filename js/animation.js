"use strict";

var Position = function(x, y) {
  this.x = x;
  this.y = y;
};

var Keyframe = function(offset, position) {
  this.offset = offset;
  this.position = position;
};
Keyframe.prototype = {};
Keyframe.prototype.copy = function() {
  return new Keyframe(this.offset, this.position);
};

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
var keyframes = [];

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
  var newKeyframes = keyframes.slice(0);
  newKeyframes.sort(function(k1, k2) {return k1.offset - k2.offset;});
  for (var i = 0; i < newKeyframes.length; i++) {
    var keyframe = newKeyframes[i];
    keyframe.offset = Math.max(0.0, Math.min(keyframe.offset, 1.0));
  }
  if (newKeyframes.length === 0) {
    newKeyframes.push(new Keyframe(0, new Position(0, 0)));
  }
  if (newKeyframes[0].offset !== 0) {
    newKeyframes = [newKeyframes[0].copy()].concat(newKeyframes);
    newKeyframes[0].offset = 0;
  }
  if (newKeyframes[newKeyframes.length - 1].offset !== 1) {
    newKeyframes.push(newKeyframes[newKeyframes.length - 1].copy());
    newKeyframes[newKeyframes.length - 1].offset = 1;
  }
  for (var i = 0; i < newKeyframes.length; i++) {
    var keyframe = newKeyframes[i];
    keyframe.offset = Math.max(0.0, Math.min(keyframe.offset, 1.0));
    var xPercent = (keyframe.position.x * 100) + "%";
    var yPercent = (keyframe.position.y * 100) + "%";
    transforms.push({
      offset: keyframe.offset, 
      transform: "translate(" + xPercent + ", " + yPercent + ")",
    });
  }
  return new Animation(object, transforms, {duration: duration});
}

var isMouseButtonDown = function(e) {
  var button = e.which;
  if (e.buttons !== undefined) {
    button = e.buttons;
  }
  return (button & 1) != 0;
}

var setTransform = function(element, transform) {
  element.style.transform = transform;
  element.style.webkitTransform = transform;
  element.style.mozTransform = transform;
}

window.addEventListener("load", function() {
  cat = document.getElementById("cat");
  camera = document.getElementById("camera");
  fence = document.getElementById("fence");
  progress = document.getElementById("progress");
  var cancelDrag = function(e) {
    e.preventDefault();
    return false;
  };
  cat.addEventListener("dragstart", cancelDrag);
  fence.addEventListener("dragstart", cancelDrag);
  //restartAnimation();
  
  document.addEventListener("mousemove", function(e) {
    var position = 0.0;
    if (progressPlayer !== null) {
      position = progressPlayer.currentTime; // - progressPlayer.startTime;
      if (position > duration) position = duration;
    }
    var x = e.pageX;
    var y = e.pageY;
    if (isMouseButtonDown(e)) {
      if (player !== null) {
        player.paused = true;
        player.source = null;
      }
      var xFraction = (x - camera.offsetLeft) / cat.width - 0.5;
      var yFraction = (y - camera.offsetTop) / cat.height - 0.5;
      var xPercent = 100 * xFraction;
      var yPercent = 100 * yFraction;
      setTransform(cat, "translate(" + xPercent + "%, " + yPercent + "%)");
      var offset = position / duration;
      if (offset == 0 || offset == duration) {
        for (var i = 0; i < keyframes.length; i++) {
          if (keyframes[i].offset == offset) {
            keyframes.splice(i, 1);
          }
        }
      }
      keyframes.push(new Keyframe(offset, new Position(xFraction, yFraction)));
    } else if (player !== null && player.source === null) {
      animation = generateAnimation(cat, keyframes, duration);
      player = document.timeline.play(animation);
      player.currentTime += position;
    }
  })
  
  progress.addEventListener("click", function() {
    restartAnimation();
  });
});
