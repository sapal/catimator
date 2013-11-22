"use strict";

var Position = function(x, y) {
  this.x = x;
  this.y = y;
};
Position.prototype = {};
Position.fromObject = function(o) {
  return new Position(o.x, o.y);
};

var Rotation = function(r) {
  this.r = r;
};
Rotation.prototype = {};
Rotation.fromObject = function(o) {
  return new Rotation(o.r);
}

var Keyframe = function(offset, value) {
  this.offset = offset;
  this.value = value;
};
Keyframe.prototype = {};
Keyframe.fromObject = function(type, o) {
  var types = {
    "translation" : Position,
    "rotation" : Rotation,
  };
  return new Keyframe(o.offset, types[type].fromObject(o.value));
};

var Actor = function(id, image, width) {
  this.id = id;
  this.image = image;
  this.width = width;
  this.keyframes = {
    "translation" : [],
    "rotation" : [],
  };
  this.rootElement = null;
  this.elements = {
    "translation" : null,
    "rotation" : null,
  };
  this.animations = {
    "translation" : null,
    "rotation" : null,
  };
  this.players = {
    "translation" : null,
    "rotation" : null,
  };
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

};

var Player = function(cameraElement, progressElement) {
  this.actors = [];
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
};
Player.prototype.getActor = function(id) {
  return this.actors[this._getActorIdx(id)];
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
});

