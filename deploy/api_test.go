package deploy

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

const testPAT = "ph_pat_abcdefghij12345_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"

type fakeBackend struct {
	mu        sync.Mutex
	insts     map[string]Instance // by host
	pats      map[string]PATResult
	patCalls  int
	records   []DeployRecord
	recordErr error
	down      bool
}

func (b *fakeBackend) Lookup(host string) (Instance, bool) {
	b.mu.Lock()
	defer b.mu.Unlock()
	i, ok := b.insts[host]
	return i, ok
}

func (b *fakeBackend) VerifyPAT(_ context.Context, token, _ string) (PATResult, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.patCalls++
	if b.down {
		return PATResult{}, errors.New("mothership unreachable")
	}
	r, ok := b.pats[token]
	if !ok {
		return PATResult{}, &AuthError{401, "Invalid or expired token."}
	}
	return r, nil
}

func (b *fakeBackend) VerifyJWT(_ context.Context, token string) (string, error) {
	if token == "jwt-user1" {
		return "user1", nil
	}
	return "", &AuthError{401, "Your login has expired. Run 'pockethost login' or use a token."}
}

func (b *fakeBackend) RecordDeploy(_ context.Context, rec DeployRecord) (string, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.records = append(b.records, rec)
	if b.recordErr != nil {
		return "", b.recordErr
	}
	return fmt.Sprintf("dep%d", len(b.records)), nil
}

func (b *fakeBackend) last() DeployRecord {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.records[len(b.records)-1]
}

type fakeInstances struct {
	mu       sync.Mutex
	dirs     map[string]string
	running  map[string]bool
	stops    int
	starts   int
	startErr error
}

func (f *fakeInstances) Running(id string) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.running[id]
}

func (f *fakeInstances) InstanceDir(id string) (string, bool) {
	f.mu.Lock()
	defer f.mu.Unlock()
	d, ok := f.dirs[id]
	return d, ok
}

func (f *fakeInstances) WithInstanceStopped(_ context.Context, id string, fn func(string) error) error {
	f.mu.Lock()
	f.stops++
	f.running[id] = false
	dir := f.dirs[id]
	f.mu.Unlock()
	return fn(dir)
}

func (f *fakeInstances) StartInstance(_ context.Context, id string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.starts++
	if f.startErr != nil {
		return f.startErr
	}
	f.running[id] = true
	return nil
}

type apiFixture struct {
	t    *testing.T
	root string
	be   *fakeBackend
	mgr  *fakeInstances
	api  *API
	srv  *httptest.Server
}

func newAPIFixture(t *testing.T) *apiFixture {
	root := t.TempDir()
	inst := Instance{ID: "inst1", Subdomain: "myapp", OwnerID: "user1", Power: true}
	be := &fakeBackend{
		insts: map[string]Instance{"myapp.example.com": inst},
		pats:  map[string]PATResult{testPAT: {UserID: "user1", Label: "CI", Scopes: []string{"read", "write"}}},
	}
	mgr := &fakeInstances{dirs: map[string]string{"inst1": filepath.Join(root, "instances", "inst1")}, running: map[string]bool{"inst1": true}}
	api := New(Options{Backend: be, Instances: func() Instances { return mgr }, PBRoot: filepath.Join(root, "instances"),
		DataRoot: filepath.Join(root, "deploys"), Logger: slog.New(slog.NewTextHandler(io.Discard, nil))})
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(299) })
	srv := httptest.NewServer(api.Wrap(next))
	t.Cleanup(srv.Close)
	return &apiFixture{t, root, be, mgr, api, srv}
}

func (f *apiFixture) instFile(rel string) string {
	return filepath.Join(f.root, "instances", "inst1", rel)
}

func (f *apiFixture) put(rel, content string) {
	p := f.instFile(rel)
	_ = os.MkdirAll(filepath.Dir(p), 0o755)
	_ = os.WriteFile(p, []byte(content), 0o644)
}

func (f *apiFixture) read(rel string) string {
	b, _ := os.ReadFile(f.instFile(rel))
	return string(b)
}

type resp struct {
	status int
	body   map[string]any
	raw    []byte
	header http.Header
}

func (f *apiFixture) do(method, path string, body any, opts ...func(*http.Request)) resp {
	f.t.Helper()
	var rd io.Reader
	switch b := body.(type) {
	case nil:
	case []byte:
		rd = bytes.NewReader(b)
	default:
		j, _ := json.Marshal(b)
		rd = bytes.NewReader(j)
	}
	req, _ := http.NewRequest(method, f.srv.URL+path, rd)
	req.Host = "myapp.example.com"
	req.Header.Set("Authorization", "Bearer "+testPAT)
	for _, o := range opts {
		o(req)
	}
	res, err := f.srv.Client().Do(req)
	if err != nil {
		f.t.Fatal(err)
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	out := resp{status: res.StatusCode, raw: raw, header: res.Header}
	_ = json.Unmarshal(raw, &out.body)
	return out
}

func withToken(tok string) func(*http.Request) {
	return func(r *http.Request) {
		if tok == "" {
			r.Header.Del("Authorization")
		} else {
			r.Header.Set("Authorization", "Bearer "+tok)
		}
	}
}

func withHost(h string) func(*http.Request) { return func(r *http.Request) { r.Host = h } }

func files(m map[string]string) (map[string]string, [][]byte) {
	out := map[string]string{}
	var blobs [][]byte
	for p, c := range m {
		out[p] = sha(c)
		blobs = append(blobs, []byte(c))
	}
	return out, blobs
}

func (f *apiFixture) deploy(content map[string]string, extra map[string]any) resp {
	f.t.Helper()
	m, blobs := files(content)
	body := map[string]any{"files": m, "commit": "deadbeef", "uploadedCount": len(blobs)}
	for k, v := range extra {
		body[k] = v
	}
	chk := f.do("POST", Prefix+"/check", body)
	if chk.status != 200 {
		f.t.Fatalf("check: %d %s", chk.status, chk.raw)
	}
	if missing := chk.body["missing"].([]any); len(missing) > 0 {
		var up [][]byte
		want := map[string]bool{}
		for _, h := range missing {
			want[h.(string)] = true
		}
		for _, b := range blobs {
			if want[sha(string(b))] {
				up = append(up, b)
				delete(want, sha(string(b)))
			}
		}
		if r := f.do("POST", Prefix+"/blobs", encodeBundle(up...)); r.status != 200 {
			f.t.Fatalf("blobs: %d %s", r.status, r.raw)
		}
	}
	return f.do("POST", Prefix+"/commit", body)
}

func num0(v any) int { f, _ := v.(float64); return int(f) }

func TestAPIEndToEnd(t *testing.T) {
	f := newAPIFixture(t)
	f.put("pb_data/data.db", "REMOTE DB")
	f.put("pb_hooks/old.pb.js", "old")

	who := f.do("GET", Prefix+"/whoami", nil)
	if who.status != 200 || who.body["via"] != "pat" || who.body["token"] != "CI" || who.body["instance"].(map[string]any)["subdomain"] != "myapp" {
		t.Fatalf("whoami: %d %s", who.status, who.raw)
	}

	r := f.deploy(map[string]string{"pb_hooks/main.pb.js": "routerAdd()", "pb_public/index.html": "<h1>v1</h1>", "package.json": "{}"}, nil)
	if r.status != 200 {
		t.Fatalf("commit: %d %s", r.status, r.raw)
	}
	if r.body["deployId"] != "dep1" || num0(r.body["writtenCount"]) != 3 || num0(r.body["deletedCount"]) != 1 ||
		r.body["wasRunning"] != true || r.body["restarted"] != true || r.body["nothingChanged"] != false {
		t.Fatalf("commit body: %s", r.raw)
	}
	if _, ok := r.body["startError"]; ok {
		t.Fatal("startError should be absent")
	}
	if f.read("pb_hooks/main.pb.js") != "routerAdd()" || f.read("pb_data/data.db") != "REMOTE DB" {
		t.Fatal("files")
	}
	rec := f.be.last()
	if rec.Status != "success" || rec.FileCount != 3 || rec.Commit != "deadbeef" || rec.UploadedCount != 3 || rec.TokenLabel != "CI" || rec.TotalBytes != int64(len("routerAdd()<h1>v1</h1>{}")) {
		t.Fatalf("record: %+v", rec)
	}
	if _, err := os.Stat(filepath.Join(f.root, "deploys", "inst1", "manifests", "dep1.json")); err != nil {
		t.Fatal("manifest not recorded")
	}

	// pb_public-only: no stop
	stops := f.mgr.stops
	r = f.deploy(map[string]string{"pb_hooks/main.pb.js": "routerAdd()", "pb_public/index.html": "<h1>v2</h1>", "package.json": "{}"}, nil)
	if r.status != 200 || f.mgr.stops != stops || r.body["restarted"] != false || num0(r.body["writtenCount"]) != 1 {
		t.Fatalf("pb_public deploy: %s stops=%d", r.raw, f.mgr.stops)
	}

	// nothing changed: no record, deployId null
	n := len(f.be.records)
	r = f.deploy(map[string]string{"pb_hooks/main.pb.js": "routerAdd()", "pb_public/index.html": "<h1>v2</h1>", "package.json": "{}"}, nil)
	if r.body["nothingChanged"] != true || r.body["deployId"] != nil || len(f.be.records) != n {
		t.Fatalf("no-op: %s", r.raw)
	}

	// a broken start is reported
	f.mgr.startErr = errors.New("hook syntax error")
	r = f.deploy(map[string]string{"pb_hooks/main.pb.js": "broken(", "package.json": "{}"}, nil)
	if r.body["restarted"] != false || r.body["startError"] != "hook syntax error" {
		t.Fatalf("startError: %s", r.raw)
	}

	// the mothership can't record: a local id
	f.mgr.startErr = nil
	f.be.recordErr = errors.New("down")
	r = f.deploy(map[string]string{"pb_hooks/main.pb.js": "ok", "package.json": "{}"}, nil)
	if id, _ := r.body["deployId"].(string); !strings.HasPrefix(id, "local-") {
		t.Fatalf("local id: %s", r.raw)
	}
}

func TestAPICommitBeforeUpload(t *testing.T) {
	f := newAPIFixture(t)
	m, _ := files(map[string]string{"pb_hooks/a.pb.js": "A"})
	r := f.do("POST", Prefix+"/commit", map[string]any{"files": m})
	if r.status != 409 || r.body["missing"].([]any)[0] != sha("A") || r.body["message"] != "1 file(s) must be uploaded first" {
		t.Fatalf("%d %s", r.status, r.raw)
	}
}

func TestAPIAuth(t *testing.T) {
	f := newAPIFixture(t)
	ro := "ph_pat_readonly0000000000_CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"
	other := "ph_pat_otheruser000000000_DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD"
	scoped := "ph_pat_scoped00000000000_EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE"
	f.be.pats[ro] = PATResult{UserID: "user1", Scopes: []string{"read"}}
	f.be.pats[other] = PATResult{UserID: "user2", Scopes: []string{"read", "write"}}
	f.be.pats[scoped] = PATResult{UserID: "user1", Scopes: []string{"read", "write"}, InstanceIDs: []string{"other"}}
	check := func(name string, r resp, status int, msg string) {
		t.Helper()
		if r.status != status || !strings.Contains(fmt.Sprint(r.body["message"]), msg) || num0(r.body["status"]) != status {
			t.Fatalf("%s: %d %s", name, r.status, r.raw)
		}
	}
	body := map[string]any{"files": map[string]any{}}
	check("missing", f.do("POST", Prefix+"/check", body, withToken("")), 401, "Missing token. Set POCKETHOST_TOKEN")
	check("bad", f.do("POST", Prefix+"/check", body, withToken("ph_pat_nope")), 401, "Invalid or expired token.")
	check("other owner", f.do("POST", Prefix+"/check", body, withToken(other)), 404, "myapp.example.com not found")
	check("scope", f.do("POST", Prefix+"/check", body, withToken(scoped)), 404, "myapp.example.com not found")
	check("read-only", f.do("POST", Prefix+"/check", body, withToken(ro)), 403, "This token is read-only.")
	if r := f.do("GET", Prefix+"/whoami", nil, withToken(ro)); r.status != 200 || r.body["token"] != nil {
		t.Fatalf("read-only whoami: %s", r.raw)
	}
	if r := f.do("GET", Prefix+"/whoami", nil, withToken("jwt-user1")); r.status != 200 || r.body["via"] != "jwt" {
		t.Fatalf("jwt: %s", r.raw)
	}
	check("bad jwt", f.do("GET", Prefix+"/whoami", nil, withToken("jwt-nope")), 401, "Your login has expired")
	check("unknown host", f.do("GET", Prefix+"/whoami", nil, withHost("nope.example.com")), 404, "nope.example.com not found")

	// failures are cached; outages aren't
	calls := f.be.patCalls
	f.do("GET", Prefix+"/whoami", nil, withToken("ph_pat_nope"))
	if f.be.patCalls != calls {
		t.Fatal("refusal not cached")
	}
	f.be.down = true
	check("outage", f.do("GET", Prefix+"/whoami", nil, withToken("ph_pat_outage")), 500, "mothership unreachable")
	check("outage again", f.do("GET", Prefix+"/whoami", nil, withToken("ph_pat_outage")), 500, "mothership unreachable")
	f.be.down = false

	// suspensions (owner first), other edge
	inst := f.be.insts["myapp.example.com"]
	inst.Suspension, inst.OwnerSuspension = "instance hold", "account hold"
	f.be.insts["myapp.example.com"] = inst
	check("owner suspension", f.do("GET", Prefix+"/whoami", nil), 403, "account hold")
	inst.OwnerSuspension = ""
	f.be.insts["myapp.example.com"] = inst
	check("instance suspension", f.do("GET", Prefix+"/whoami", nil), 403, "instance hold")
	inst.Suspension, inst.Elsewhere = "", "myapp.example.com is served by another PocketHost edge"
	f.be.insts["myapp.example.com"] = inst
	check("elsewhere", f.do("GET", Prefix+"/whoami", nil), 421, "another PocketHost edge")

	// unknown deploy route is a JSON 404; other paths go to the instance
	check("route", f.do("GET", Prefix+"/nope", nil), 404, "Not found")
	if r := f.do("GET", "/api/health", nil); r.status != 299 {
		t.Fatalf("passthrough: %d", r.status)
	}
}

func TestAPIScopeReverify(t *testing.T) {
	f := newAPIFixture(t)
	now := time.Now()
	f.api.auth.now = func() time.Time { return now }
	scoped := "ph_pat_scoped00000000000_EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE"
	f.be.pats[scoped] = PATResult{UserID: "user1", Scopes: []string{"read", "write"}, InstanceIDs: []string{"other"}}
	if r := f.do("GET", Prefix+"/whoami", nil, withToken(scoped)); r.status != 404 {
		t.Fatal(r.status)
	}
	// the owner widens the token in the dashboard; within 2 s the cache answers, after that a fresh check
	f.be.pats[scoped] = PATResult{UserID: "user1", Scopes: []string{"read", "write"}, InstanceIDs: []string{"other", "inst1"}}
	if r := f.do("GET", Prefix+"/whoami", nil, withToken(scoped)); r.status != 404 {
		t.Fatal("re-verified too soon", r.status)
	}
	now = now.Add(3 * time.Second)
	if r := f.do("GET", Prefix+"/whoami", nil, withToken(scoped)); r.status != 200 {
		t.Fatalf("not re-verified: %d %s", r.status, r.raw)
	}
}

func TestAPIBadInput(t *testing.T) {
	f := newAPIFixture(t)
	if r := f.do("POST", Prefix+"/check", map[string]any{"files": map[string]any{"pb_data/data.db": sha("x")}}); r.status != 400 || !strings.Contains(r.body["message"].(string), "outside the deployable set") {
		t.Fatalf("%d %s", r.status, r.raw)
	}
	if r := f.do("POST", Prefix+"/blobs", []byte("junk")); r.status != 400 || !strings.HasPrefix(r.body["message"].(string), "Could not decompress bundle") {
		t.Fatalf("%d %s", r.status, r.raw)
	}
	if r := f.do("POST", Prefix+"/blobs", []byte{}); r.status != 400 || r.body["message"] != "Empty upload" {
		t.Fatalf("%d %s", r.status, r.raw)
	}
	if r := f.do("POST", Prefix+"/check", []byte("{nope")); r.status != 400 {
		t.Fatalf("%d %s", r.status, r.raw)
	}
	if r := f.do("POST", Prefix+"/check", bytes.Repeat([]byte(" "), maxJSONBytes+1)); r.status != 413 || r.body["message"] != "Request too large" {
		t.Fatalf("%d %s", r.status, r.raw)
	}
	if r := f.do("POST", Prefix+"/check", map[string]any{"files": map[string]any{"pb_hooks/node_modules/x.js": sha("x")}}); r.status != 400 {
		t.Fatalf("%d %s", r.status, r.raw)
	}
}

func TestAPIFailedApply(t *testing.T) {
	f := newAPIFixture(t)
	f.put("pb_hooks/a.pb.js", "A")
	f.put("pb_public/blocker/node_modules/x.js", "kept")
	r := f.deploy(map[string]string{"pb_hooks/a.pb.js": "A2", "pb_public/blocker": "X"}, nil)
	if r.status != 409 || f.read("pb_hooks/a.pb.js") != "A" {
		t.Fatalf("%d %s", r.status, r.raw)
	}
	if rec := f.be.last(); rec.Status != "failed" || !strings.Contains(rec.Error, "pb_public/blocker is a directory") {
		t.Fatalf("%+v", rec)
	}
}

func TestAPINodeModules(t *testing.T) {
	f := newAPIFixture(t)
	f.put("node_modules/old/index.js", "old")
	r := f.deploy(map[string]string{"pb_hooks/main.pb.js": "h"}, map[string]any{"nodeModules": true})
	if r.status != 200 || num0(r.body["deletedCount"]) != 1 || r.body["restarted"] != true {
		t.Fatalf("%s", r.raw)
	}
	if _, err := os.Stat(f.instFile("node_modules/old")); err == nil {
		t.Fatal("old package kept")
	}
}

func TestAPIInstanceUnknownToManager(t *testing.T) {
	// e.g. an unverified owner: the instance isn't served, but its owner can still deploy files to it
	f := newAPIFixture(t)
	delete(f.mgr.dirs, "inst1")
	r := f.deploy(map[string]string{"pb_hooks/main.pb.js": "h"}, nil)
	if r.status != 200 || r.body["wasRunning"] != false || f.read("pb_hooks/main.pb.js") != "h" {
		t.Fatalf("%s", r.raw)
	}
}

func TestAPIFiles(t *testing.T) {
	f := newAPIFixture(t)
	f.put("pb_hooks/main.pb.js", "hook")
	f.put("pb_data/data.db", "db")
	f.put("notes.txt", "hidden")
	f.put("pb_public/x.ph-upload", "partial")

	r := f.do("GET", Prefix+"/files?recursive=1", nil)
	var paths []string
	for _, e := range r.body["entries"].([]any) {
		paths = append(paths, e.(map[string]any)["path"].(string))
	}
	if strings.Join(paths, ",") != "pb_data,pb_hooks,pb_hooks/main.pb.js,pb_public" {
		t.Fatalf("list: %v", paths)
	}
	r = f.do("GET", Prefix+"/files/raw?path=pb_hooks/main.pb.js", nil)
	if r.status != 200 || string(r.raw) != "hook" || r.header.Get("X-PH-Mtime") == "" {
		t.Fatalf("raw: %d %s", r.status, r.raw)
	}
	if r = f.do("GET", Prefix+"/files/raw?path=pb_data/data.db", nil); r.status != 409 {
		t.Fatalf("pb_data while on: %d", r.status)
	}
	if r = f.do("GET", Prefix+"/files/raw?path=notes.txt", nil); r.status != 400 {
		t.Fatalf("outside: %d", r.status)
	}

	// chunked upload
	put := func(q string, body string) resp { return f.do("PUT", Prefix+"/files/raw?"+q, []byte(body)) }
	if r = put("path=pb_hooks/new.js&offset=0", "abc"); r.status != 200 || num0(r.body["size"]) != 3 {
		t.Fatalf("%s", r.raw)
	}
	if r = put("path=pb_hooks/new.js&offset=5", "x"); r.status != 409 || !strings.Contains(r.body["message"].(string), "server has 3 bytes, got offset 5") {
		t.Fatalf("%s", r.raw)
	}
	if r = put("path=pb_hooks/new.js&offset=3&final=1", "def"); r.status != 200 || r.body["final"] != true || f.read("pb_hooks/new.js") != "abcdef" {
		t.Fatalf("%s", r.raw)
	}
	if r = put("path=pb_hooks/new.js&offset=-1", "x"); r.status != 400 {
		t.Fatal(r.status)
	}

	// pb_data when powered off
	inst := f.be.insts["myapp.example.com"]
	inst.Power = false
	f.be.insts["myapp.example.com"] = inst
	if r = put("path=pb_data/data.db&final=1", "new db"); r.status != 200 || f.read("pb_data/data.db") != "new db" {
		t.Fatalf("%s", r.raw)
	}

	// deletes
	if r = f.do("DELETE", Prefix+"/files?path=pb_hooks", nil); r.status != 400 {
		t.Fatal(r.status)
	}
	if r = f.do("DELETE", Prefix+"/files?path=pb_hooks/sub", nil); r.status != 404 {
		t.Fatal(r.status)
	}
	f.put("pb_hooks/sub/a.js", "a")
	if r = f.do("DELETE", Prefix+"/files?path=pb_hooks/sub", nil); r.status != 409 {
		t.Fatal(r.status)
	}
	if r = f.do("DELETE", Prefix+"/files?path=pb_hooks/sub&recursive=1", nil); r.status != 200 || r.body["deleted"] != true {
		t.Fatal(r.status)
	}

	// symlinks out of the instance
	_ = os.Symlink(f.root, f.instFile("pb_public/out"))
	if r = f.do("GET", Prefix+"/files/raw?path=pb_public/out/deploys", nil); r.status != 400 || !strings.Contains(r.body["message"].(string), "symbolic link") {
		t.Fatalf("%d %s", r.status, r.raw)
	}

	// read-only tokens can't write
	f.be.pats["ph_pat_ro"] = PATResult{UserID: "user1", Scopes: []string{"read"}}
	if r = f.do("PUT", Prefix+"/files/raw?path=pb_hooks/x.js", []byte("x"), withToken("ph_pat_ro")); r.status != 403 {
		t.Fatal(r.status)
	}
}

func TestAPILogs(t *testing.T) {
	old := logPoll
	logPoll = 20 * time.Millisecond
	defer func() { logPoll = old }()
	f := newAPIFixture(t)
	f.put("logs/exec.log", `{"message":"one","stream":"stdout","time":"t1"}`+"\n"+`{"message":"two","stream":"stderr","time":"t2"}`+"\n")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, "GET", f.srv.URL+Prefix+"/logs?n=1", nil)
	req.Host = "myapp.example.com"
	req.Header.Set("Authorization", "Bearer "+testPAT)
	res, err := f.srv.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.Header.Get("Content-Type") != "text/event-stream; charset=UTF-8" {
		t.Fatal(res.Header)
	}
	sc := bufio.NewScanner(res.Body)
	next := func() map[string]any {
		t.Helper()
		for sc.Scan() {
			if line := sc.Text(); strings.HasPrefix(line, "data: ") {
				var e map[string]any
				_ = json.Unmarshal([]byte(strings.TrimPrefix(line, "data: ")), &e)
				return e
			}
		}
		t.Fatal("stream ended")
		return nil
	}
	if e := next(); e["message"] != "two" {
		t.Fatalf("replay: %v", e)
	}
	lf, _ := os.OpenFile(f.instFile("logs/exec.log"), os.O_APPEND|os.O_WRONLY, 0)
	_, _ = lf.WriteString(`{"message":"three","stream":"stdout","time":"t3"}` + "\nplain text\n")
	lf.Close()
	if e := next(); e["message"] != "three" {
		t.Fatalf("follow: %v", e)
	}
	if e := next(); e["message"] != "plain text" || e["stream"] != "stdout" {
		t.Fatalf("plain: %v", e)
	}
	// rotation: exec.log → exec.log.1, new exec.log
	_ = os.Rename(f.instFile("logs/exec.log"), f.instFile("logs/exec.log.1"))
	f.put("logs/exec.log", `{"message":"after rotate","stream":"stdout","time":"t4"}`+"\n")
	if e := next(); e["message"] != "after rotate" {
		t.Fatalf("rotate: %v", e)
	}
}

func TestAPILogsBeforeFileExists(t *testing.T) {
	old := logPoll
	logPoll = 20 * time.Millisecond
	defer func() { logPoll = old }()
	f := newAPIFixture(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, "GET", f.srv.URL+Prefix+"/logs", nil)
	req.Host = "myapp.example.com"
	req.Header.Set("Authorization", "Bearer "+testPAT)
	res, err := f.srv.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	time.Sleep(50 * time.Millisecond)
	f.put("logs/exec.log", `{"message":"first","stream":"stdout","time":"t"}`+"\n")
	sc := bufio.NewScanner(res.Body)
	for sc.Scan() {
		if strings.Contains(sc.Text(), `"first"`) {
			return
		}
	}
	t.Fatal("no entry")
}
