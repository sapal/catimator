package catimator

import (
	"strconv"
	"net/http"
	"text/template"
	"encoding/json"
	"time"

	"appengine"
	"appengine/datastore"
)

func init() {
	http.HandleFunc("/player/", htmlPlayer)
	http.HandleFunc("/editor/", htmlEditor)
	http.HandleFunc("/animation/", jsonAnimation)
	http.HandleFunc("/store", storeAnimation)
	http.HandleFunc("/", root)
}

type Animation struct {
	Data []byte
	CreationTime time.Time
	ParentKey *datastore.Key
}

var htmlPlayerTemplate = template.Must(template.ParseFiles("html/player.html"))

func htmlPlayer(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Path[len("/player/"):]
	if err := htmlPlayerTemplate.Execute(w, "/animation/" + id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

var htmlEditorTemplate = template.Must(template.ParseFiles("html/editor.html"))

func htmlEditor(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Path[len("/editor/"):]
	if err := htmlEditorTemplate.Execute(w, "/animation/" + id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

var jsonAnimationTemplate = template.Must(template.New("json").Parse("animation = '{{js .}}';"))

func jsonAnimation(w http.ResponseWriter, r *http.Request) {
	c := appengine.NewContext(r)
	var animation Animation
	id, err := strconv.ParseInt(r.URL.Path[len("/animation/"):], 36, 64)
	if err == nil {
		key := datastore.NewKey(c, "animation", "", id, nil)
		err = datastore.Get(c, key, &animation)
	}
	if err != nil {
		animation.Data = []byte(`{"duration":10, "actors":[
		"{\"id\":\"cat\",\"width\":\"30%\",\"duration\":10,\"keyframes\":[],\"image\":\"/images/cat/cat_left.png\"}",
		"{\"id\":\"mouse\",\"width\":\"20%\",\"duration\":10,\"keyframes\":[],\"image\":\"/images/mouse/mouse_left.png\"}",
		"{\"id\":\"fence\",\"width\":\"70%\",\"duration\":10,\"keyframes\":[],\"image\":\"/images/fence/fence.png\"}"
		]}`)
	}

	w.Header().Set("Content-Type", "application/javascript")
	if err = jsonAnimationTemplate.Execute(w, string(animation.Data)); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func storeAnimation(w http.ResponseWriter, r *http.Request) {
	c := appengine.NewContext(r)
	animationData := []byte(r.FormValue("animation-data"))

	var f interface{}
	if err := json.Unmarshal(animationData, &f) ;err != nil {
		w.Write([]byte("LOL:"))
		w.Write(animationData)
		w.Write([]byte("LOL:"))
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	animation := Animation {
		Data: animationData,
		CreationTime: time.Now(),
		ParentKey: nil,
	}

	key, err := datastore.Put(c, datastore.NewIncompleteKey(c, "animation", nil), &animation)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id := key.IntID()

	http.Redirect(w, r, "/player/" + strconv.FormatInt(id, 36), http.StatusFound)
}

func root(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/editor/", http.StatusFound)
}
