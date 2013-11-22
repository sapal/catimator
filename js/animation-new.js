"use strict";

var Position = function(x, y) {
  if (x === undefined && y === undefined) {
    x = 0;
    y = 0;
  }
  this.x = x;
  this.y = y;
};
Position.prototype = {};
Position.fromObject = function(o) {
  return new Position(o.x, o.y);
};
Position.prototype.tranfsormText = function() {
  return "translate(" + (this.x * 100) + "%, " + (this.y * 100) + "%)";
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
  return new Keyframe(o.offset, Keyframes.types[type].fromObject(o.value));
};
Keyframe.ofType = function(offset, type) {
  return new Keyframe(offset, Keyframes.types[type]());
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

var Actor = function(id, image, width) {
  this.id = id;
  this.image = image;
  this.width = width;
  this.rootElement = null;
  this.keyframes = {};
  this.elements = {};
  this.animations = {};
  this.players = {};
  for (var i = 0; i < Keyframe.types.length; ++i) {
    var type = Keyframe.types[i];
    this.keyframes[type] = [];
  }
};
Actor.prototype = {};
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
Actor.prototype.generateAnimation = function(duration) {
  for (var i = 0; i < Keyframe.types.length; ++i) {
    var type = Keyframe.types[i];
    var transforms = [];
    var croppedKeyframes = keyframes.slice(0);
    croppedKeyframes.sort(function(k1, k2) {return k1.offset - k2.offset;});
    for (var i = 0; i < croppedKeyframes.length; ++i) {
      croppedKeyframes[i].crop();
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
        transform: keyframe.value.tranfsormText(),
      });
    }
    animations[type] = new Animation(elements[type], transforms, {duration: duration});
  }
};
Actor.prototype.pause = function() {
  for (var i = 0; i < Keyframe.types.length; ++i) {
    var type = Keyframe.types[i];
    if (this.players[type]) {
      this.players[type].paused = true;
    }
  }
};
Actor.prototype.unpause = function() {
  for (var i = 0; i < Keyframe.types.length; ++i) {
    var type = Keyframe.types[i];
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
  for (var i = 0; i < Keyframe.types.length; ++i) {
    var type = Keyframe.types[i];
    this.stopType(type);
  }
};
Actor.prototype.playType = function(type) {
  this.players[type] = document.timeline.play(this.animations[type]);
}
Actor.prototype.play = function() {
  for (var i = 0; i < Keyframe.types.length; ++i) {
    var type = Keyframe.types[i];
    this.playType(type);
  }
};
Actor.prototype.startRecording = function(type) {
  this.recordedKeyframes = [];
  this.recordedType = type;
  this.stopType(type);
};
Actor.prototype.recordKeyframe = function(keyframe) {
  this.recordedKeyframes.push(keyframe);
};
Actor.prototype.endRecording = function(type, offset) {
  this.updateAnimation(type, recordedKeyframes);
  this.playType(type);
  this.seekType(type, offset);
};
Actor.prototype.select = function(selected) {
  if (selected) {
    this.rootElement.classList.add("selected");
  } else {
    this.rootElement.classList.remove("selected");
  }
};

var Player = function(cameraElement, progressElement) {
  this.actors = [];
  this.selected = 0;
  this.cameraElement = cameraElement;
  this.progressElement = progressElement;
  this.player = null;
};
Player.prototype = {};
Player.prototype.playing = function() {
  return this.player && this.player.paused == false;
};
Player.prototype.addActor = function(id, image, width) {
  var a = new Actor(id, image, width);
  a.createElements(this.cameraElement);
  this.actors.push(a);
  if (this.selected === this.actors.length) {
    this.selected++;
  }
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
  this.selected = (this.selected + 1) % (this.actors.length + 1);
  this._updateSelected();
};

var player = null;

window.addEventListener("load", function() {
  var camera = document.getElementById("camera");
  var progress = document.getElementById("progress");
  player = new Player(camera, progress);

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
});

