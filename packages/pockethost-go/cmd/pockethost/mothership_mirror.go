package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"sync"

	"ganigeorgiev.com/pocketbase/dbx"
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
)

// mirrorDump is what an edge loads at boot and after every realtime reconnect (GET /api/mirror): every verified user,
// the instances they own and the edges, each as the record's public export. Instances add `edge`, which is hidden from
// customers but routes them.
type mirrorDump struct {
	Users     []map[string]any `json:"users"`
	Instances []map[string]any `json:"instances"`
	Edges     []map[string]any `json:"edges"`
}

// buildMirrorDump reads the dump. It runs in Go, not in the mothership's one JS VM: the JS version took ~8.5 s of VM
// time per call, so edges reconnecting together queued behind each other (and past the VM's wait limit).
func buildMirrorDump(app core.App) (*mirrorDump, error) {
	users, err := app.FindRecordsByFilter("users", "verified = true", "", 0, 0)
	if err != nil {
		return nil, err
	}
	instances, err := app.FindAllRecords("instances", dbx.NewExp("instances.uid in (select id from users where verified = 1)"))
	if err != nil {
		return nil, err
	}
	edges, err := app.FindAllRecords("edges")
	if err != nil {
		return nil, err
	}
	d := &mirrorDump{
		Users:     make([]map[string]any, 0, len(users)),
		Instances: make([]map[string]any, 0, len(instances)),
		Edges:     make([]map[string]any, 0, len(edges)),
	}
	for _, r := range users {
		d.Users = append(d.Users, r.PublicExport())
	}
	for _, r := range instances {
		m := r.PublicExport()
		m["edge"] = r.GetString("edge")
		d.Instances = append(d.Instances, m)
	}
	for _, r := range edges {
		d.Edges = append(d.Edges, r.PublicExport())
	}
	return d, nil
}

// mirrorFlight shares one dump between requests that overlap: after a mothership restart every edge asks at the same
// moment, and each full dump holds a few hundred MB while it's built. A request that joins a build already running
// gets that build's bytes. That's safe for an edge: it subscribes to realtime before it asks, and applies the
// changes it was sent after loading the dump.
type mirrorFlight struct {
	mu   sync.Mutex
	call *mirrorCall
}

// errMirrorAborted is what requests waiting on a build get when it panicked.
var errMirrorAborted = errors.New("mirror dump aborted")

type mirrorCall struct {
	done chan struct{}
	body []byte
	err  error
}

// do returns the bytes of a build run by this call or of one already in flight.
func (f *mirrorFlight) do(build func() ([]byte, error)) ([]byte, error) {
	f.mu.Lock()
	if c := f.call; c != nil {
		f.mu.Unlock()
		<-c.done
		return c.body, c.err
	}
	c := &mirrorCall{done: make(chan struct{}), err: errMirrorAborted}
	f.call = c
	f.mu.Unlock()
	defer func() { // even on a panic, so no request waits forever
		f.mu.Lock()
		f.call = nil
		f.mu.Unlock()
		close(c.done)
	}()

	c.body, c.err = build()
	return c.body, c.err
}

// registerMirror serves GET /api/mirror to superusers (the edges log in as one), gzipped. POST /api/mirror (an edge
// reporting its live instances) stays in the JS hooks.
func registerMirror(e *core.ServeEvent) {
	var flight mirrorFlight
	e.Router.GET("/api/mirror", func(re *core.RequestEvent) error {
		body, err := flight.do(func() ([]byte, error) {
			d, err := buildMirrorDump(re.App)
			if err != nil {
				return nil, err
			}
			return json.Marshal(d)
		})
		if err != nil {
			return re.InternalServerError("mirror dump failed", err)
		}
		return re.Blob(http.StatusOK, "application/json", body)
	}).Bind(apis.Gzip(), apis.RequireSuperuserAuth())
}
