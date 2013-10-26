"use strict";

window.addEventListener("load", function() {
  var cat = document.getElementById("cat");
  document.timeline.play(new SeqGroup([
    new Animation(cat, {transform: "translate(400%, 100%)"}, {duration: 0}),
    new Animation(cat, {transform: "translate(150%, 80%)"}, {duration: 2}),
    new Animation(cat, {transform: "translate(-100%, 100%)"}, {duration: 3}),
  ]));
});
