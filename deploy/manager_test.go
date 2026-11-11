package deploy

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/pocker"
)

// TestWithPockerManager deploys to a real PocketBase app run by Pocker: hooks change after a restart, a broken hook is
// reported as startError, and pb_public-only deploys don't restart.
func TestWithPockerManager(t *testing.T) {
	root := t.TempDir()
	pbRoot := filepath.Join(root, "instances")
	yaml := filepath.Join(root, "instances.yaml")
	if err := os.WriteFile(yaml, []byte("instances:\n  - id: inst1\n    hosts: [myapp.example.com]\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	quiet := slog.New(slog.NewTextHandler(io.Discard, nil))
	mgr := pocker.NewManager(&pocker.YAMLSource{Path: yaml, Required: true}, pocker.ManagerOptions{PBRoot: pbRoot, Logger: quiet})
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go mgr.Run(ctx)
	defer mgr.Shutdown()

	inst := Instance{ID: "inst1", Subdomain: "myapp", OwnerID: "user1", Power: true}
	be := &fakeBackend{insts: map[string]Instance{"myapp.example.com": inst},
		pats: map[string]PATResult{testPAT: {UserID: "user1", Scopes: []string{"read", "write"}}}}
	api := New(Options{Backend: be, Instances: func() Instances { return mgr }, PBRoot: pbRoot, DataRoot: filepath.Join(root, "deploys"), Logger: quiet})
	srv := httptest.NewServer(api.Wrap(mgr))
	defer srv.Close()
	f := &apiFixture{t: t, root: root, be: be, api: api, srv: srv}

	get := func(path string) string {
		req, _ := http.NewRequest("GET", srv.URL+path, nil)
		req.Host = "myapp.example.com"
		res, err := srv.Client().Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		b, _ := io.ReadAll(res.Body)
		return strings.TrimSpace(string(b))
	}
	hook := func(v string) string { return `routerAdd("GET", "/v", (e) => e.string(200, "` + v + `"))` }

	r := f.deploy(map[string]string{"pb_hooks/main.pb.js": hook("v1"), "pb_public/index.html": "one"}, nil)
	if r.status != 200 || r.body["wasRunning"] != false {
		t.Fatalf("first: %s", r.raw)
	}
	deadline := time.Now().Add(10 * time.Second)
	for get("/v") != "v1" {
		if time.Now().After(deadline) {
			t.Fatal("v1 never served")
		}
		time.Sleep(50 * time.Millisecond)
	}

	r = f.deploy(map[string]string{"pb_hooks/main.pb.js": hook("v2"), "pb_public/index.html": "one"}, nil)
	if r.body["wasRunning"] != true || r.body["restarted"] != true || !mgr.Running("inst1") {
		t.Fatalf("second: %s", r.raw)
	}
	if v := get("/v"); v != "v2" {
		t.Fatalf("after deploy: %q", v)
	}

	r = f.deploy(map[string]string{"pb_hooks/main.pb.js": hook("v2"), "pb_public/index.html": "two"}, nil)
	if r.body["wasRunning"] != false || r.body["restarted"] != false || !mgr.Running("inst1") || get("/index.html") != "two" {
		t.Fatalf("pb_public only: %s", r.raw)
	}

	r = f.deploy(map[string]string{"pb_hooks/main.pb.js": "this is not js (", "pb_public/index.html": "two"}, nil)
	if r.body["restarted"] != false || !strings.Contains(r.body["startError"].(string), "") || r.body["startError"] == "" {
		t.Fatalf("broken: %s", r.raw)
	}
	t.Logf("startError: %v", r.body["startError"])

	r = f.deploy(map[string]string{"pb_hooks/main.pb.js": hook("v3"), "pb_public/index.html": "two"}, nil)
	if r.status != 200 || get("/v") != "v3" {
		t.Fatalf("fixed: %s", r.raw)
	}
}
