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
      if (!button.classList.contains("button")) {
        document.addEventListener("keypress", function(e) {
          var keyCode = e.keyCode || e.which;
          if (toolbox.toolSelected() && keyCode === button.id.charCodeAt(0)) {
            toolbox.select(idx);
            e.stopPropagation();
            return false;
          }
          return true;
        });
      }
    })(i);
  }
  document.getElementById("select-button").addEventListener("click", function(e) {
    player.selectNextActor();
  });
  document.getElementById("delete-button").addEventListener("click", function(e) {
    player.removeSelectedActor();
  });
  document.getElementById("play-button").addEventListener("click", function() {
    player.playPause();
  });
  document.getElementById("add-image-button").addEventListener("click", function(e) {
    var image = document.getElementById("add-image-input").value;
    var match = /([^.\/]*)\.[^\/]*/.exec(image)
    var id = "custom-actor-image";
    if (match !== null) {
      id = match[1];
    }
    toolbox.player.addActor(id, {"type": "image", "image": image}, "50%");
  });
  document.getElementById("add-text-button").addEventListener("click", function(e) {
    var text = document.getElementById("add-text-input").value;
    var id = text;
    var style = document.getElementById("add-text-type").value;
    toolbox.player.addActor(id, {"type": "text", "text": text, "style": style}, "40%");
  });
  document.getElementById("share-button").addEventListener("click", function(e) {
    document.getElementById("animation-data").value = player.serialize();
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
Toolbox.prototype.keyframeValueMouse = function(tool, actor, startX, startY, mouseX, mouseY) {
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
Toolbox.prototype.keyframeValueTouch = function(tool, actor, touchX, touchY) {
  if (tool === "translation") {
    return actor.relativePosition(touchX, touchY);
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
        var value = toolbox.keyframeValueMouse(toolbox.tool(), selected,
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

  progress.addEventListener("mousedown", function(e) {
    e.stopPropagation();
    return false;
  });
  progress.addEventListener("click", function() {
    player.playPause();
  });
  document.addEventListener("keydown", function(e) {
    var keyCode = e.keyCode || e.which; 
    if (toolbox.toolSelected() && keyCode ===  32) { // Space
      player.playPause();
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
  
  if ("ontouchstart" in window) {
    var splashscreen = document.getElementById("splashscreen");
    var script = document.createElement("script");
    script.src = "/js/lib/hammer.js";
    splashscreen.appendChild(script);
    splashscreen.style.display = "block";
    splashscreen.addEventListener("click", function() {
      splashscreen.style.display = "none";
      var prefix = ["moz", "webkit", ""];
      for (var i = 0; i < prefix.length; ++i) {
        var name = prefix[i] + "RequestFullScreen";
        name = name.charAt(0).toLowerCase() + name.slice(1);
        console.log(name);
        if (name in document.body) {
          document.body[name]();
          break;
        }
      }
    });
    script.addEventListener("load", function() {
      var hammer = Hammer(editor, {
        transform_always_block: true,
        transform_min_scale: 1,
        drag_block_horizontal: true,
        drag_block_vertical: true,
        drag_min_distance: 0
      });
      var touchX = 0, touchY = 0;
      hammer.on("touch", function(e) {
        console.log("TOUCH");
        console.log(e);
        if (toolbox.toolSelected()) {
          player.startRecording(toolbox.tool(), function() {
            if (!toolbox.toolSelected()) {
              player.endRecording();
              return;
            }
            console.log("KEYFRAME: "+touchX +", "+touchY + "  "+toolbox.tool());
            var offset = player.position();
            var selected = player.selectedActor();
            var value = toolbox.keyframeValueTouch(toolbox.tool(), selected,
              touchX - camera.offsetLeft, touchY - camera.offsetTop);
            player.recordKeyframe(new Keyframe(offset, value));
          });
        }
      });
      hammer.on("drag", function(e) {
        console.log("DRAG");
        console.log(e);
        var center = e.gesture.center;
        touchX = center.pageX;
        touchY = center.pageY;
      });
      hammer.on("release", function(e) {
        console.log("RELEASE");
        console.log(e);
        if (player.recording()) {
          player.endRecording();
        }
      });
    });
  }
  player.deserialize(animation);
});

