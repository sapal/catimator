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
var selectedId = 0;
var camera = null;
var animations = {};
var progress = null;
var players = {};
var progressPlayer = null;
var duration = 15;
var keyframes = {};
var recordedKeyframes = {};

var playAnimation = function() {
  started = true;
  for (var i = 0; i < animatedObjects.length; i++) {
    var o = animatedObjects[i];
    players[o.id].paused = false;
  }
  progressPlayer.paused = false;
};

var resetAnimation = function() {
  started = false;
  animations = {};
  for (var i = 0; i < animatedObjects.length; i++) {
    var o = animatedObjects[i];
    updateKeyframes(o);
    var animation = generateAnimation(o, keyframes[o.id], duration);
    if (players[o.id] && players[o.id].source) {
      players[o.id]._deregisterFromTimeline();
      players[o.id].paused = true;
      players[o.id].source = null;
    }
    players[o.id] = document.timeline.play(animation);
    players[o.id].paused = true;
  }
  progressPlayer = document.timeline.play(new Animation(bar, [
    {offset: 0.0, width: "0%"},
    {offset: 1.0, width: "100%"},
  ], duration));
  progressPlayer.paused = true;
};

var updateKeyframes = function(object) {
  keyframes[object.id] = addRecordedKeyframes(keyframes[object.id], recordedKeyframes[object.id]);
  var frames = {};
  for (var i = 0; i < keyframes[object.id].length; i++) {
    var keyframe = keyframes[object.id][i];
    if (keyframe.offset === 0 || keyframe.offset === 1) {
      frames[keyframe.offset] = keyframe;
    }
  }
  keyframes[object.id] = keyframes[object.id].filter(function(k) {
    if (k.offset === 0 || k.offset === 1) {
      return frames[k.offset].lenght === 0 || k === frames[k.offset];
    }
    return true;
  });
  recordedKeyframes[object.id] = [];
};

var addRecordedKeyframes = function(keyframes, recordedKeyframes) {
  if (recordedKeyframes.length == 0) return keyframes;
  var minTime = recordedKeyframes[0].offset;
  var maxTime = minTime;
  for (var i = 0; i < recordedKeyframes.length; i++) {
    var time = recordedKeyframes[i].offset;
    minTime = Math.min(minTime, time);
    maxTime = Math.max(maxTime, time);
  }
  var result = keyframes.filter(function(x) { 
    return x.offset < minTime || x.offset > maxTime;
  });
  return result.concat(recordedKeyframes);
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
  if (element.style._clearAnimatedProperty) {
    element.style._clearAnimatedProperty("webkitTransform");
  }
  element.style.transform = transform;
  element.style.webkitTransform = transform;
  element.style.mozTransform = transform;
}

var removeObject = function(object_id) {
  for (var i = 0; i < animatedObjects.length; ++i) {
    if (animatedObjects[i].id === object_id) {
      if (selectedId > i) {
        selectedId--;
      }
      animatedObjects.splice(i,1);
    }
  }
  delete animations[object_id];
  delete keyframes[object_id];
  delete recordedKeyframes[object_id];
  document.getElementById(object_id).remove();
}

var initObject = function(o) {
  var cancelDrag = function(e) {
    e.preventDefault();
    return false;
  };
  animatedObjects.push(o);
  o.addEventListener("dragstart", cancelDrag);
  keyframes[o.id] = [];
  recordedKeyframes[o.id] = [];
}

var addObject = function(object_id, img_source, width) {
  var o = document.createElement("img");
  o.src = img_source;
  o.style.width = width;
  o.alt = object_id;
  o.classList.add("animated-object");
  o.draggable = false;
  initObject(o);
  camera.appendChild(o);
}

window.addEventListener("load", function() {
  camera = document.getElementById("camera");
  progress = document.getElementById("progress");
  
  var animated = [{
    "id": "cat-left",
    "src": "../images/cat/cat_left.png",
    "width": "30%"
  },{
    "id": "cat-right",
    "src": "../images/cat/cat_right.png",
    "width": "30%"
  },{
    "id": "mouse-left",
    "src": "../images/mouse/mouse_left.png",
    "width": "30%"
  },{
    "id": "mouse-right",
    "src": "../images/mouse/mouse_right.png",
    "width": "30%"
  },{
    "id": "fence",
    "src": "../images/fence/fence.png",
    "width": "75%"
  }]
  
  animatedObjects = [];
  for (var i = 0; i < animated.length; i++) {
    var o = animated[i];
    addObject(o["id"], o["src"], o["width"]);
  }
  
  document.addEventListener("mousemove", function(e) {
    if (selectedId == animatedObjects.length) {
      return;
    }
    var object = animatedObjects[selectedId];
    var position = 0.0;
    if (progressPlayer !== null) {
      position = progressPlayer.currentTime;
      if (position > duration) position = duration;
    }
    var x = e.pageX;
    var y = e.pageY;
    if (isMouseButtonDown(e)) {
      if (players[object.id] && players[object.id].source) {
        players[object.id]._deregisterFromTimeline(); 
        players[object.id].paused = true;
        players[object.id].source = null;
      }
      var xFraction = (x - camera.offsetLeft) / object.width - 0.5;
      var yFraction = (y - camera.offsetTop) / object.height - 0.5;
      var xPercent = 100 * xFraction;
      var yPercent = 100 * yFraction;
      setTransform(object, "translate(" + xPercent + "%, " + yPercent + "%)");
      var offset = position / duration;
      recordedKeyframes[object.id].push(new Keyframe(offset, new Position(xFraction, yFraction)));
    } else if (players[object.id] !== undefined && players[object.id].source === null && started) {
      updateKeyframes(object);
      animations[object.id] = generateAnimation(object, keyframes[object.id], duration);
      players[object.id] = document.timeline.play(animations[object.id]);
      players[object.id].currentTime += position;
    }
  })
  
  var playPause = function() {
    var startedBefore = started;
    resetAnimation();
    if (!startedBefore) {
      playAnimation();
    }
  };
  progress.addEventListener("click", playPause);
  document.addEventListener("keydown", function(e) {
    var keyCode = e.keyCode || e.which; 
    if (keyCode ===  32) {
      playPause();
    }
  });
  
  selectedId = animatedObjects.length;
  document.addEventListener("keydown", function(e) {
    var keyCode = e.keyCode || e.which; 
    if (keyCode === 9) {
      if (selectedId < animatedObjects.length) {
        animatedObjects[selectedId].classList.remove("selected");
      }
      selectedId = (selectedId + 1) % (animatedObjects.length + 1);
      if (selectedId < animatedObjects.length) {
        animatedObjects[selectedId].classList.add("selected");
      }
      e.preventDefault();
    }
  });
  
  document.addEventListener("keydown", function(e) {
    var keyCode = e.keyCode || e.which;
    if (keyCode === 83 && e.ctrlKey) {
      saveToFile(serialize(keyframes), "animation.txt");
      e.preventDefault();
      return false;
    }
    return true;
  });
  
  var editor = document.getElementById('editor');
  editor.addEventListener('drop', function(e) {
    e.stopPropagation();
    e.preventDefault();
    
    var file = e.dataTransfer.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
      keyframes = deserialize(e.target.result);
      resetAnimation();
    };
    reader.readAsText(file);
  }, false);
  editor.addEventListener('dragover', function(e) {
    e.stopPropagation();
    e.preventDefault();
  });
});
