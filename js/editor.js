"use strict";

var Toolbox = function(rootElement, player) {
  this.rootElement = rootElement;
  this.player = player;
  this.buttons = rootElement.children;
  this.selected = 0;
  this.select(0);
  var toolbox = this;
  for (var i = 0; i < this.buttons.length; ++i) {
    (function(idx) {
      var button = toolbox.buttons[idx];
      button.addEventListener("mousedown", function(e) {
        e.stopPropagation();
        return false;
      });
      button.addEventListener("click", function(e) {
        toolbox.select(idx);
        e.stopPropagation();
        return false;
      });
      document.addEventListener("keypress", function(e) {
        var keyCode = e.keyCode || e.which;
        if (toolbox.toolSelected() && keyCode === button.id.charCodeAt(0)) {
          toolbox.select(idx);
          e.stopPropagation();
          return false;
        }
        return true;
      });
    })(i);
  }
  document.getElementById("add-button").addEventListener("click", function(e) {
    toolbox.player.addActor("custom-actor", document.getElementById("add-input").value, "50%");
  });
};
Toolbox.prototype = {};
Toolbox.prototype.toolSelected = function() {
  return !this.buttons[this.selected].classList.contains("button");
};
Toolbox.prototype.select = function(idx) {
  if (this.toolSelected()) {
    this.player.endRecording();
  }
  this.buttons[this.selected].classList.remove("selected");
  this.selected = idx;
  this.buttons[this.selected].classList.add("selected");
};
Toolbox.prototype.tool = function() {
  return this.buttons[this.selected].id;
};
Toolbox.prototype.keyframeValue = function(tool, actor, startX, startY, mouseX, mouseY) {
  var start = actor.relativePosition(startX, startY);
  var mouse = actor.relativePosition(mouseX, mouseY);
  var delta = actor.relativePosition(mouseX - startX, mouseY - startY);
  var position = actor.position();
  if (tool === "translation") {
    return mouse;
  } else if (tool === "scale") {
    return new Scale(Math.exp(-delta.y));
  } else if (tool === "rotation") {
    return new Rotation(90-Math.atan2(- mouse.y + position.y, mouse.x - position.x) / Math.PI * 180);
  } else if (tool === "opacity") {
    return new Opacity(1-delta.y);
  }
};

var player = null;
var toolbox = null;

window.addEventListener("load", function() {
  var mouseX = 0;
  var mouseY = 0;
  var camera = document.getElementById("camera");
  var progress = document.getElementById("progress");
  var bar = document.getElementById("bar");
  player = new Player(camera, bar, 10);
  toolbox = new Toolbox(document.getElementById("toolbox"), player);

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
    var startX = mouseX;
    var startY = mouseY;
    if (toolbox.toolSelected()) {
      player.startRecording(toolbox.tool(), function() {
        var offset = player.position();
        var selected = player.selectedActor();
        var value = toolbox.keyframeValue(toolbox.tool(), selected,
          startX - camera.offsetLeft, startY - camera.offsetTop,
          mouseX - camera.offsetLeft, mouseY - camera.offsetTop);
        player.recordKeyframe(new Keyframe(offset, value));
      });
    }
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

  progress.addEventListener("mousedown", function(e) {
    e.stopPropagation();
    return false;
  });
  progress.addEventListener("click", playPause);
  document.addEventListener("keydown", function(e) {
    var keyCode = e.keyCode || e.which; 
    if (toolbox.toolSelected() && keyCode ===  32) { // Space
      playPause();
    }
  });
  document.addEventListener("keydown", function(e) {
    var keyCode = e.keyCode || e.which; 
    if (toolbox.toolSelected() && keyCode ===  46) { // Delete
      player.removeSelectedActor();
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
  cat.startRecording("rotation");
  cat.recordKeyframe(new Keyframe(0.1, new Rotation(90)));
  cat.recordKeyframe(new Keyframe(0.2, new Rotation(-90)));
  cat.endRecording(0.0);
  cat.startRecording("scale");
  cat.recordKeyframe(new Keyframe(0.0, new Scale(2.5)));
  cat.recordKeyframe(new Keyframe(0.1, new Scale(0.5)));
  cat.recordKeyframe(new Keyframe(0.2, new Scale(2)));
  cat.endRecording(0.0);
  cat.startRecording("opacity");
  cat.recordKeyframe(new Keyframe(0.0, new Opacity(0.1)));
  cat.recordKeyframe(new Keyframe(0.1, new Opacity(1)));
  cat.recordKeyframe(new Keyframe(0.2, new Opacity(0.2)));
  cat.endRecording(0.0);
  player.deserialize(player.serialize());
});

