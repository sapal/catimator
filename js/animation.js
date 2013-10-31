"use strict";

var Position = function(x, y) {
  this.x = x;
  this.y = y;
};

Position.fromObject = function(o) {
  return new Position(o.x, o.y);
};

var Keyframe = function(offset, position) {
  this.offset = offset;
  this.position = position;
};

Keyframe.fromObject = function(o) {
  return new Keyframe(o.offset, Position.fromObject(o.position));
};
Keyframe.prototype = {};
Keyframe.prototype.copy = function() {
  return new Keyframe(this.offset, this.position);
};

var serialize = function(keyframes) {
  return JSON.stringify(keyframes);
};

var deserialize = function(string) {
  var keyframes = JSON.parse(string);
  for (var id in keyframes) {
    keyframes[id] = keyframes[id].map(function(o) {
      return Keyframe.fromObject(o);
    });
  }
  return keyframes;
};

var saveToFile = function(data, filename) {
  var link = document.createElement("a");
  link.href = window.URL.createObjectURL(new Blob([data], {type:'text/plain'}));
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

var animatedObjects = null;
var started = false;
var duration = 10;
var selectedId = 0;
var cat = null;
var fence = null;
var camera = null;
var animations = {};
var progress = null;
var players = {};
var progressPlayer = null;
var duration = 15;
var keyframes = {};

var restartAnimation = function() {
  started = true;
  animations = {};
  for (var i = 0; i < animatedObjects.length; i++) {
    var o = animatedObjects[i];
    var animation = generateAnimation(o, keyframes[o.id], duration);
    players[o.id] = document.timeline.play(animation);
  }
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
  animatedObjects = document.getElementsByClassName("animated-object");
  for (var i = 0; i < animatedObjects.length; i++) {
    animatedObjects[i].addEventListener("dragstart", cancelDrag);
    keyframes[animatedObjects[i].id] = [];
  }
  
  document.addEventListener("mousemove", function(e) {
    var object = animatedObjects[selectedId];
    var position = 0.0;
    if (progressPlayer !== null) {
      position = progressPlayer.currentTime;
      if (position > duration) position = duration;
    }
    var x = e.pageX;
    var y = e.pageY;
    if (isMouseButtonDown(e)) {
      if (players[object.id] !== undefined) {
        players[object.id].paused = true;
        players[object.id].source = null;
      }
      var xFraction = (x - camera.offsetLeft) / object.width - 0.5;
      var yFraction = (y - camera.offsetTop) / object.height - 0.5;
      var xPercent = 100 * xFraction;
      var yPercent = 100 * yFraction;
      setTransform(object, "translate(" + xPercent + "%, " + yPercent + "%)");
      var offset = position / duration;
      if (offset == 0 || offset == duration) {
        for (var i = 0; i < keyframes[object.id].length; i++) {
          if (keyframes[object.id][i].offset == offset) {
            keyframes[object.id].splice(i, 1);
          }
        }
      }
      keyframes[object.id].push(new Keyframe(offset, new Position(xFraction, yFraction)));
    } else if (players[object.id] !== undefined && players[object.id].source === null) {
      animations[object.id] = generateAnimation(object, keyframes[object.id], duration);
      players[object.id] = document.timeline.play(animations[object.id]);
      players[object.id].currentTime += position;
    }
  })
  
  progress.addEventListener("click", function() {
    restartAnimation();
  });
  
  animatedObjects[selectedId].classList.toggle("selected");
  document.addEventListener("keydown", function(e) {
    var keyCode = e.keyCode || e.which; 
    if (keyCode === 9) {
      animatedObjects[selectedId].classList.toggle("selected");
      selectedId = (selectedId + 1) % animatedObjects.length;
      animatedObjects[selectedId].classList.toggle("selected");
      e.preventDefault();
    }
  });
  
  document.addEventListener("keydown", function(e) {
    var keyCode = e.keyCode || e.which;
    if (keyCode === 83 && e.ctrlKey) {
      saveToFile("lol", "lol.txt");
      e.preventDefault();
      return false;
    }
    return true;
  });
});
