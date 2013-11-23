package catimator

import (
	"net/http"
	"text/template"
	"encoding/json"
)

func init() {
	http.HandleFunc("/player", htmlPlayer)
	http.HandleFunc("/editor", htmlEditor)
	http.HandleFunc("/animation", jsonAnimation)
}

var htmlPlayerTemplate = template.Must(template.ParseFiles("html/player.html"))

func htmlPlayer(w http.ResponseWriter, r *http.Request) {
	if err := htmlPlayerTemplate.Execute(w, "/animation"); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

var htmlEditorTemplate = template.Must(template.ParseFiles("html/editor.html"))

func htmlEditor(w http.ResponseWriter, r *http.Request) {
	if err := htmlEditorTemplate.Execute(w, "/animation"); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

var jsonAnimationTemplate = template.Must(template.New("json").Parse("animation = '{{js .}}';"))

func jsonAnimation(w http.ResponseWriter, r *http.Request) {
	animation := `{"duration":10, "actors":["{\"id\":\"cat\",\"image\":\"../images/cat/cat_left.png\",\"width\":\"30%\"}"]}`
	var f interface{}
	if err := json.Unmarshal([]byte(animation), &f) ;err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/javascript")
	if err := jsonAnimationTemplate.Execute(w, animation); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
