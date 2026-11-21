package edge

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func writeFile(t *testing.T, p, body string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(p, []byte(body), 0o640); err != nil {
		t.Fatal(err)
	}
}

func readFile(t *testing.T, p string) string {
	t.Helper()
	b, err := os.ReadFile(p)
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}

func TestCopyInstanceDir(t *testing.T) {
	root := t.TempDir()
	src, dst := filepath.Join(root, "src"), filepath.Join(root, "dst")
	writeFile(t, filepath.Join(src, "pb_data", "data.db"), "db")
	writeFile(t, filepath.Join(src, "pb_hooks", "main.pb.js"), "hook")
	writeFile(t, filepath.Join(src, "pb_cache", "deploy", "blobs", "ab", "abc"), "cached upload")
	writeFile(t, filepath.Join(src, ".pb_deploy", "blobs", "ab", "abc"), "cached upload")
	writeFile(t, filepath.Join(src, "pb_public", "pb_cache", "kept.txt"), "x") // only the top-level folder is left out
	if err := os.Symlink("main.pb.js", filepath.Join(src, "pb_hooks", "link.js")); err != nil {
		t.Fatal(err)
	}
	// what a runtime may have left in the new instance's folder (never started, no database)
	writeFile(t, filepath.Join(dst, "pb_hooks", "_ph_lib.js"), "")

	n, err := copyInstanceDir(src, dst)
	if err != nil {
		t.Fatal(err)
	}
	if n != int64(len("db")+len("hook")+len("x")) {
		t.Fatalf("bytes: %d", n)
	}
	if readFile(t, filepath.Join(dst, "pb_data", "data.db")) != "db" || readFile(t, filepath.Join(dst, "pb_hooks", "main.pb.js")) != "hook" {
		t.Fatal("files not copied")
	}
	for _, d := range notCopied {
		if _, err := os.Stat(filepath.Join(dst, d)); !os.IsNotExist(err) {
			t.Fatalf("%s should not be copied: %v", d, err)
		}
	}
	if readFile(t, filepath.Join(dst, "pb_public", "pb_cache", "kept.txt")) != "x" {
		t.Fatal("a nested pb_cache folder is the customer's and must be copied")
	}
	if target, err := os.Readlink(filepath.Join(dst, "pb_hooks", "link.js")); err != nil || target != "main.pb.js" {
		t.Fatalf("symlink: %q %v", target, err)
	}
	if _, err := os.Stat(filepath.Join(dst, "pb_hooks", "_ph_lib.js")); !os.IsNotExist(err) {
		t.Fatal("old folder contents should be replaced")
	}
	if fi, err := os.Stat(filepath.Join(dst, "pb_data", "data.db")); err != nil || fi.Mode().Perm() != 0o640 {
		t.Fatalf("mode: %v %v", fi, err)
	}
	if _, err := os.Stat(dst + ".duplicating"); !os.IsNotExist(err) {
		t.Fatal("temporary folder left behind")
	}

	// never over an instance that already has a database
	writeFile(t, filepath.Join(src, "pb_data", "data.db"), "changed")
	if _, err := copyInstanceDir(src, dst); err == nil || !strings.Contains(err.Error(), "already has data") {
		t.Fatalf("expected refusal, got %v", err)
	}
	if readFile(t, filepath.Join(dst, "pb_data", "data.db")) != "db" {
		t.Fatal("existing data was touched")
	}

	if _, err := copyInstanceDir(filepath.Join(root, "missing"), filepath.Join(root, "x")); err == nil {
		t.Fatal("missing source should fail")
	}
}

// dirInstances is an Instances with plain folders: only what the duplicator uses.
type dirInstances struct {
	Instances
	root    string
	mu      sync.Mutex
	stopped []string
}

func (d *dirInstances) InstanceDir(id string) (string, bool) { return filepath.Join(d.root, id), true }

func (d *dirInstances) WithInstanceStopped(_ context.Context, id string, fn func(string) error) error {
	d.mu.Lock()
	d.stopped = append(d.stopped, id)
	d.mu.Unlock()
	return fn(filepath.Join(d.root, id))
}

func TestDuplicatorSweep(t *testing.T) {
	var mu sync.Mutex
	patches := map[string]map[string]string{}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case strings.HasSuffix(r.URL.Path, "/auth-with-password"):
			_, _ = io.WriteString(w, `{"token":"t"}`)
		case r.Method == http.MethodPatch && strings.HasPrefix(r.URL.Path, "/api/collections/instances/records/"):
			var body map[string]string
			_ = json.NewDecoder(r.Body).Decode(&body)
			mu.Lock()
			patches[strings.TrimPrefix(r.URL.Path, "/api/collections/instances/records/")] = body
			mu.Unlock()
			_, _ = io.WriteString(w, `{}`)
		default:
			t.Errorf("unexpected %s %s", r.Method, r.URL.Path)
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	s := NewSource(Config{MothershipURL: srv.URL, AdminUser: "a@b.c", AdminPassword: "x", EdgeID: "e1"}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	s.myEdge = "E1"
	s.instances["orig"] = instanceRec{ID: "orig", Edge: "E1"}
	s.instances["copy"] = instanceRec{ID: "copy", Edge: "E1", DuplicateOf: "orig", DuplicateStatus: duplicateCopying}
	s.instances["orphan"] = instanceRec{ID: "orphan", Edge: "E1", DuplicateOf: "gone", DuplicateStatus: duplicateCopying}
	s.instances["away"] = instanceRec{ID: "away", Edge: "E1", DuplicateOf: "other", DuplicateStatus: duplicateCopying}
	s.instances["other"] = instanceRec{ID: "other", Edge: "E2"}
	s.instances["theirs"] = instanceRec{ID: "theirs", Edge: "E2", DuplicateOf: "other", DuplicateStatus: duplicateCopying}

	root := t.TempDir()
	writeFile(t, filepath.Join(root, "orig", "pb_data", "data.db"), "db")
	rt := &dirInstances{root: root}
	d := s.NewDuplicator(func() Instances { return rt })
	ctx := context.Background()

	d.Sweep(ctx)
	if readFile(t, filepath.Join(root, "copy", "pb_data", "data.db")) != "db" {
		t.Fatal("copy not made")
	}
	if p := patches["copy"]; p["duplicateStatus"] != duplicateReady || p["duplicateError"] != "" {
		t.Fatalf("copy: %+v", p)
	}
	if p := patches["orphan"]; p["duplicateStatus"] != duplicateFailed || !strings.Contains(p["duplicateError"], "no longer exists") {
		t.Fatalf("orphan: %+v", p)
	}
	if p := patches["away"]; p["duplicateStatus"] != duplicateFailed || !strings.Contains(p["duplicateError"], "another server") {
		t.Fatalf("away: %+v", p)
	}
	if _, ok := patches["theirs"]; ok {
		t.Fatal("another edge's copy was touched")
	}
	if strings.Join(rt.stopped, ",") != "copy,orig" {
		t.Fatalf("both instances held stopped, copy first: %v", rt.stopped)
	}

	// reported but the mirror hasn't caught up: no second copy
	delete(patches, "copy")
	d.Sweep(ctx)
	if _, again := patches["copy"]; again {
		t.Fatal("copied twice")
	}
}

func TestMapInstanceBlocksUnfinishedCopies(t *testing.T) {
	cfg := Config{ApexDomain: "pockethost.io", EdgeID: "e1"}
	for status, want := range map[string]string{duplicateCopying: "still being copied", duplicateFailed: "could not be copied"} {
		p, ok := mapInstance(cfg, instanceRec{ID: "i", Subdomain: "s", Power: true, Edge: "E1", DuplicateStatus: status}, "E1")
		if !ok || p.Blocked == nil || p.Blocked.Status != http.StatusServiceUnavailable || !strings.Contains(p.Blocked.Message, want) {
			t.Fatalf("%s: %+v", status, p.Blocked)
		}
	}
	p, _ := mapInstance(cfg, instanceRec{ID: "i", Subdomain: "s", Power: true, Edge: "E1", DuplicateStatus: duplicateReady}, "E1")
	if p.Blocked != nil {
		t.Fatalf("ready copy blocked: %+v", p.Blocked)
	}
}
