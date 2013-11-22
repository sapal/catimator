"use strict";

var saveToFile = function(data, filename) {
  var link = document.createElement("a");
  link.href = window.URL.createObjectURL(new Blob([data], {type:'text/plain'}));
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

var stableSort = function(a, cmp) {
  var b = a.map(function(el, i) {
    return {idx: i, el: el};
  });
  b.sort(function(v1, v2) {
    var c = cmp(v1.el, v2.el);
    if (c === 0) {
      return v1.idx - v2.idx;
    } else {
      return c;
    }
  });
  return b.map(function(el) {
    return el.el;
  });
};

var Position = function(x, y) {
  if (x === undefined && y === undefined) {
    x = 0.5;
    y = 0.5;
  }
  this.x = x;
  this.y = y;
};
Position.prototype = {};
Position.fromObject = function(o) {
  return new Position(o.x, o.y);
};
Position.prototype.transformText = function() {
  return "translate(" + ((this.x - 0.5) * 100) + "%, " + ((this.y - 0.5) * 100) + "%)";
};

var Rotation = function(r) {
  if (r === undefined) {
    r = 0;
  }
  this.r = r;
};
Rotation.prototype = {};
Rotation.fromObject = function(o) {
  return new Rotation(o.r);
};
Rotation.prototype.transformText = function() {
  return "rotate(" + this.r + "deg)";
};

var Keyframe = function(offset, value) {
  this.offset = offset;
  this.value = value;
};
Keyframe.prototype = {};
Keyframe.types = {
  "translation" : Position,
  "rotation" : Rotation,
};
Keyframe.fromObject = function(type, o) {
  return new Keyframe(o.offset, Keyframe.types[type].fromObject(o.value));
};
Keyframe.ofType = function(offset, type) {
  return new Keyframe(offset, new Keyframe.types[type]());
};
Keyframe.prototype.copy = function(offset) {
  if (offset === undefined) {
    offset = this.offset;
  }
  return new Keyframe(offset, this.value);
};
Keyframe.prototype.crop = function() {
  this.offset = Math.max(0.0, Math.min(1.0, this.offset));
};

var Actor = function(id, image, width, duration) {
  this.id = id;
  this.image = image;
  this.width = width;
  this.duration = duration;
  this.recordedKeyframes = [];
  this.recordedType = null;
  this.rootElement = null;
  this.keyframes = {};
  this.elements = {};
  this.animations = {};
  this.players = {};
  for (var type in Keyframe.types) {
    this.keyframes[type] = [];
  }
};
Actor.prototype = {};
Actor.prototype.serialize = function() {
  return JSON.stringify({
    "id" : this.id,
    "image" : this.image,
    "width" : this.width,
    "duration" : this.duration,
    "keyframes" : this.keyframes,
  });
};
Actor.deserialize = function(string, camera) {
  var o = JSON.parse(string);
  var a = new Actor(o.id, o.image, o.width, o.duration);
  a.createElements(camera);
  for (var type in o.keyframes) {
    var k = o.keyframes[type].map(function(k) { return Keyframe.fromObject(type, k); });
    a.keyframes[type] = k;
    if (k.length > 0) {
      a.setTransform(type, k[0].value.transformText());
    }
  }
  a.generateAnimation();
  return a;
};
Actor.prototype.createElements = function(camera) {
  var t = document.createElement("div");
  var r = document.createElement("div");
  var i = document.createElement("img");
  t.style.width = this.width;
  i.style.width = "100%";
  i.src = this.image;
  i.alt = this.id;
  t.classList.add("animated-object");
  t.dgraggable = false;
  t.addEventListener("dragstart", function(e) {
    e.preventDefault();
    return false;
  });
  t.appendChild(r);
  r.appendChild(i);
  camera.appendChild(t);
  this.rootElement = t;
  this.elements["translation"] = t;
  this.elements["rotation"] = r;
};
Actor.prototype.deleteElements = function() {
  this.rootElement.remove();
};
Actor.prototype.generateAnimationType = function(type) {
  var transforms = [];
  var sortedKeyframes = stableSort(
      this.keyframes[type],
      function(k1, k2) {return k1.offset - k2.offset;});
  var croppedKeyframes = [];
  for (var i = 0; i < sortedKeyframes.length; ++i) {
    sortedKeyframes[i].crop();
  }
  for (var i = 0; i < sortedKeyframes.length; ++i) {
    var keyframe = sortedKeyframes[i];
    if (i === sortedKeyframes.length - 1 || sortedKeyframes[i+1].offset !== keyframe.offset) {
      croppedKeyframes.push(keyframe);
    }
  }
  if (croppedKeyframes.length === 0) {
    croppedKeyframes.push(Keyframe.ofType(0.0, type));
  }
  var first = croppedKeyframes[0];
  var last = croppedKeyframes[croppedKeyframes.length - 1];
  if (first.offset !== 0.0) {
    croppedKeyframes.unshift(first.copy(0.0));
  }
  if (last.offset !== 1.0) {
    croppedKeyframes.push(last.copy(1.0));
  }
  for (var i = 0; i < croppedKeyframes.length; ++i) {
    var keyframe = croppedKeyframes[i];
    transforms.push({
      offset: keyframe.offset,
      transform: keyframe.value.transformText(),
    });
  }
  this.animations[type] = new Animation(this.elements[type], transforms, {duration: this.duration});
};
Actor.prototype.generateAnimation = function() {
  for (var type in Keyframe.types) {
    this.generateAnimationType(type);
  }
};
Actor.prototype.saveRecordedKeyframes = function() {
  if (this.recordedKeyframes.length === 0) {
    return;
  }
  var minTime = this.recordedKeyframes[0].offset;
  var maxTime = minTime;
  for (var i = 0; i < this.recordedKeyframes.length; ++i) {
    var time = this.recordedKeyframes[i].offset;
    minTime = Math.min(minTime, time);
    maxTime = Math.max(maxTime, time);
  }
  var result = this.keyframes[this.recordedType].filter(function(k) {
    return k.offset < minTime || maxTime < k.offset;
  });
  this.keyframes[this.recordedType] = result.concat(this.recordedKeyframes);
  this.generateAnimationType(this.recordedType);
};
Actor.prototype.pause = function() {
  for (var type in Keyframe.types) {
    if (this.players[type]) {
      this.players[type].paused = true;
    }
  }
};
Actor.prototype.unpause = function() {
  for (var type in Keyframe.types) {
    if (this.players[type]) {
      this.players[type].paused = false;
    }
  }
};
Actor.prototype.stopType = function(type) {
  if (this.players[type]) {
    var player = this.players[type];
    player._deregisterFromTimeline();
    player.paused = true;
    player.source = null;
    this.players[type] = null;
  }
}
Actor.prototype.stop = function() {
  for (var type in Keyframe.types) {
    this.stopType(type);
  }
};
Actor.prototype.playType = function(type) {
  if (this.animations[type]) {
    this.players[type] = document.timeline.play(this.animations[type]);
  }
};
Actor.prototype.play = function() {
  for (var type in Keyframe.types) {
    this.playType(type);
  }
};
Actor.prototype.startRecording = function(type) {
  this.recordedType = type;
  this.stopType(type);
};
Actor.prototype.setTransform = function(type, transform) {
  var element = this.elements[type];
  if (element.style._clearAnimatedProperty) {
    element.style._clearAnimatedProperty("webkitTransform");
  }
  element.style.transform = transform;
  element.style.webkitTransform = transform;
  element.style.mozTransform = transform;
};
Actor.prototype.recordKeyframe = function(keyframe) {
  this.recordedKeyframes.push(keyframe);
  var transform = keyframe.value.transformText();
  this.setTransform(this.recordedType, transform);
};
Actor.prototype.recording = function() {
  return this.recordedType !== null;
};
Actor.prototype.endRecording = function(offset, play) {
  if (!this.recording()) {
    return;
  }
  this.saveRecordedKeyframes();
  if (play) {
    this.playType(this.recordedType);
    this.seekType(this.recordedType, offset);
  }
  this.recordedType = null;
  this.recordedKeyframes = [];
};
Actor.prototype.seekType = function(type, offset) {
  if (this.players[type]) {
    this.players[type].currentTime += offset * this.duration;
  }
};
Actor.prototype.select = function(selected) {
  if (selected) {
    this.rootElement.classList.add("selected");
  } else {
    this.rootElement.classList.remove("selected");
  }
};
Actor.prototype.relativePosition = function(x, y) {
  var e = this.elements["translation"];
  return new Position(x / e.clientWidth, y / e.clientHeight);
};

var Player = function(cameraElement, progressElement, duration) {
  this.actors = [];
  this.selected = 0;
  this.cameraElement = cameraElement;
  this.progressElement = progressElement;
  this.duration = duration;
  this.progressPlayer = null;
  this.recordingTimer = null;
};
Player.prototype = {};
Player.prototype.playing = function() {
  return this.progressPlayer && this.progressPlayer.paused == false;
};
Player.prototype.addActor = function(id, image, width) {
  var a = new Actor(id, image, width, this.duration);
  a.createElements(this.cameraElement);
  if (this.selected === this.actors.length) {
    this.selected++;
  }
  this.actors.push(a);
};
Player.prototype._getActorIdx = function(id) {
  for (var i = 0; i < this.actors.length; ++i) {
    if (this.actors[i].id == id) return i;
  }
  console.log("Error: no such actor: " + id);
  return -1;
};
Player.prototype.removeActor = function(id) {
  var idx = this._getActorIdx(id);
  this.actors[idx].deleteElements();
  this.actors.splice(idx, 1);
  if (idx < this.selected) {
    this.selected--;
  }
  this._updateSelected();
};
Player.prototype.getActor = function(id) {
  return this.actors[this._getActorIdx(id)];
};
Player.prototype._updateSelected = function() {
  for (var i = 0; i < this.actors.length; ++i) {
    this.actors[i].select(i === this.selected);
  }
};
Player.prototype.selectNextActor = function() {
  this.endRecording();
  this.selected = (this.selected + 1) % (this.actors.length + 1);
  this._updateSelected();
};
Player.prototype._withSelected = function(f) {
  if (this.selected === this.actors.length) {
    return;
  }
  return f(this.actors[this.selected]);
};
Player.prototype.startRecording = function(type, callback) {
  this._withSelected(function(a) {
    a.startRecording(type);
  });
  this.recordingTimer = window.setInterval(callback, 25);
};
Player.prototype.recordKeyframe = function(keyframe) {
  this._withSelected(function(a) {
    a.recordKeyframe(keyframe);
  });
};
Player.prototype.endRecording = function() {
  var position = this.position();
  var playing = this.playing();
  this._withSelected(function(a) {
    a.endRecording(position, playing);
  });
  window.clearInterval(this.recordingTimer);
  this.recordingTimer = null;
};
Player.prototype.play = function() {
  if (this.playing()) {
    return;
  }
  this.progressPlayer = document.timeline.play(new Animation(
        this.progressElement, [
          {offset: 0.0, width: "0%"},
          {offset: 1.0, width: "100%"},
        ], this.duration));
  for (var i = 0; i < this.actors.length; ++i) {
    this.actors[i].play();
  }
};
Player.prototype.stop = function() {
  if (this.progressPlayer === null) {
    return;
  }
  this.progressPlayer._deregisterFromTimeline(); 
  this.progressPlayer.paused = true;
  this.progressPlayer.source = null;
  this.progressPlayer = null;
  for (var i = 0; i < this.actors.length; ++i) {
    this.actors[i].stop();
  }
};
Player.prototype.pause = function() {
  if (this.progressPlayer && !this.paused()) {
    this.progressPlayer.paused = true;
  }
  for (var i = 0; i < this.actors.length; ++i) {
    this.actors[i].pause();
  }
};
Player.prototype.unpause = function() {
  if (this.progressPlayer && this.paused()) {
    this.progressPlayer.paused = false;
  }
  for (var i = 0; i < this.actors.length; ++i) {
    this.actors[i].unpause();
  }
};
Player.prototype.paused = function() {
  return (this.progressPlayer && this.progressPlayer.paused === true);
};
Player.prototype.position = function() {
  if (!this.progressPlayer) {
    return 0.0;
  }
  return Math.min(1.0, this.progressPlayer.currentTime / this.duration);
};
Player.prototype.recording = function() {
  return this._withSelected(function(a) {
    return a.recording();
  });
};
Player.prototype.positionForSelected = function(x, y) {
  return this._withSelected(function(a) {
    return a.relativePosition(x, y);
  });
};
Player.prototype.deleteActors = function() {
  this.stop();
  this.endRecording();
  for (var i = 0; i < this.actors.length; ++i) {
    this.actors[i].deleteElements();
  }
  this.actors = [];
  this.selected = 0;
};
Player.prototype.serialize = function() {
  var actors = this.actors.map(function(a) {
    return a.serialize();
  });
  return JSON.stringify({
    "duration" : this.duration,
    "actors" : actors,
  });
};
Player.prototype.deserialize = function(string) {
  this.deleteActors();
  var o = JSON.parse(string);
  this.duration = o.duration;
  var camera = this.cameraElement;
  this.actors = o.actors.map(function(s) {
    var a = Actor.deserialize(s, camera);
    return a;
  });
  this.selected = this.actors.length;
};

var player = null;

var isMouseButtonDown = function(e) {
  var button = e.buttons || e.which;
  return (button & 1) !== 0;
};

window.addEventListener("load", function() {
  var mouseX = 0;
  var mouseY = 0;
  var camera = document.getElementById("camera");
  var progress = document.getElementById("progress");
  var bar = document.getElementById("bar");
  player = new Player(camera, bar, 15);

  var someActors = [{
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
  }];

  for (var i = 0; i < someActors.length; ++i) {
    var a = someActors[i];
    player.addActor(a["id"], a["src"], a["width"]);
  }

  document.addEventListener("keydown", function(e) {
    var keyCode = e.keyCode || e.which;
    if (keyCode === 9) { // Tab
      player.selectNextActor();
      e.preventDefault();
    }
  });

  document.addEventListener("mousedown", function(e) {
    player.startRecording("translation", function() {
      var offset = player.position();
      var position = player.positionForSelected(mouseX - camera.offsetLeft, mouseY - camera.offsetTop);
      player.recordKeyframe(new Keyframe(offset, position));
    });
  });

  document.addEventListener("mousemove", function(e) {
    mouseX = e.pageX;
    mouseY = e.pageY;
  });

  document.addEventListener("mouseup", function(e) {
    if (player.recording()) {
      player.endRecording();
    }
  });

  var playPause = function() {
    if (player.paused()) {
      player.unpause();
    } else {
      if (player.position() === 0) {
        player.play();
      } else if (player.position() === 1) {
        player.stop();
      } else {
        player.pause();
      }
    }
  };

  progress.addEventListener("click", playPause);
  document.addEventListener("keydown", function(e) {
    var keyCode = e.keyCode || e.which; 
    if (keyCode ===  32) {
      playPause();
    }
  });

  document.addEventListener("keydown", function(e) {
    var keyCode = e.keyCode || e.which;
    if (keyCode === 83 && e.ctrlKey) { // Ctrl + S
      saveToFile(player.serialize(), "animation.txt");
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
      player.deserialize(e.target.result);
    };
    reader.readAsText(file);
  }, false);
  editor.addEventListener('dragover', function(e) {
    e.stopPropagation();
    e.preventDefault();
  });

  var cat = player.getActor("cat-right");
  cat.startRecording("translation");
  cat.recordKeyframe(new Keyframe(0.1, new Position(0, 0.9)));
  cat.recordKeyframe(new Keyframe(0.2, new Position(3.5, 2)));
  cat.endRecording(0.0);
  player.deserialize(player.serialize());
});

