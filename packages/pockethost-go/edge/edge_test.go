package edge

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	firewall "pocketone.dev/ext/firewall"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"github.com/pockethost/pockethost/packages/pockethost-go/fleet"
	"github.com/pockethost/pockethost/packages/pockethost-go/fleet/fleettest"
	"golang.org/x/crypto/bcrypt"
	"pocketone.dev/ext/cache"
	cachev1 "pocketone.dev/ext/contracts/cache/v1"
	"pocketone.dev/ext/pocker"
	"pocketone.dev/ext/servertiming"
	"pocketone.dev/ext/standard"
)

var testCfg = Config{ApexDomain: "pockethost.io", HTTPProtocol: "https:", AppURL: "https://app.pockethost.io",
	DocURL: "https://pockethost.io/docs", EdgeID: "sgp-1", BackupTokenSecret: "s3cret",
	HeartbeatInterval: 50 * time.Millisecond, DriftCheckInterval: time.Hour}

func raw(s string) json.RawMessage { return json.RawMessage(s) }

func freeAddr(t *testing.T) string {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	return ln.Addr().String()
}

// recorder keeps what an edge sends the mothership's JS routes (heartbeats, POST /api/mirror statuses).
type recorder struct {
	mu         sync.Mutex
	heartbeats []map[string]any
	statuses   []string
}

func (f *recorder) routes(se *core.ServeEvent) {
	se.Router.POST("/api/edge/heartbeat", func(e *core.RequestEvent) error {
		var body map[string]any
		_ = e.BindBody(&body)
		f.mu.Lock()
		f.heartbeats = append(f.heartbeats, body)
		f.mu.Unlock()
		return e.JSON(200, map[string]any{})
	})
	se.Router.POST("/api/mirror", func(e *core.RequestEvent) error {
		var body struct {
			Instances []map[string]string `json:"instances"`
		}
		_ = e.BindBody(&body)
		f.mu.Lock()
		for _, i := range body.Instances {
			f.statuses = append(f.statuses, i["id"]+"="+i["status"])
		}
		f.mu.Unlock()
		return e.JSON(200, map[string]any{"updated": 1})
	})
}

// The edge against a real mothership (PocketHost's collections, the fleet resolver and PocketOne's watch server, in
// process): instances are looked up as requests name them and followed on one stream.
func TestEdgeAgainstMothership(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("owner-password"), 4)
	f := &recorder{}
	m := fleettest.New(t, fleet.Config{ApexDomain: testCfg.ApexDomain, HTTPProtocol: testCfg.HTTPProtocol, AppURL: testCfg.AppURL, DocURL: testCfg.DocURL}, f.routes)
	// the owner's login (admin sync), resolved by the mothership
	login := []pocker.Superuser{{ID: "u1", Email: "owner@example.com", PasswordHash: string(hash), TokenKey: "tk"}}
	unpaidBlock := map[string]any{"status": 402, "message": "Instances will not run until you upgrade"}
	// the edge that runs blog.pockethost.io (sfo): its daemon health and an echo
	sfoDaemon := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == DaemonHealthPath {
			_, _ = w.Write([]byte(`{"status":"ok"}`))
			return
		}
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("X-Powered-By", "PocketHost")
		w.Header().Set("Server-Timing", `origin;dur=1.0, wake;dur=0.0, edge;dur=2.0;desc="sfo"`) // as the Node daemon sends
		fmt.Fprintf(w, "sfo %s %s %s by=%s", r.Method, r.Host, r.URL.Path, r.Header.Get(ForwardedByHeader))
	}))
	defer sfoDaemon.Close()
	sgp := m.Save(t, "edges", "", map[string]any{"edge_id": "sgp-1", "region": "sgp"})
	sfo := m.Save(t, "edges", "", map[string]any{"edge_id": "sfo", "region": "sfo", "internal_url": sfoDaemon.URL, "last_seen": time.Now().UTC()})
	const mine1, elsewhere1, unpaid1 = "mine11111111111", "elsewhere111111", "unpaid111111111"
	m.Save(t, "instances", mine1, map[string]any{"subdomain": "shop", "power": true, "edge": sgp.Id, "owners": []string{"u1"}, "superusers": login,
		"secrets": map[string]string{"API_KEY": "v1", "PH_CORS_ORIGINS": "https://shop.example.com"},
		// hourly backup that missed its last run while the edge was down: fires once at start
		"webhooks": raw(fmt.Sprintf(`[{"endpoint":"api/ph/backup","value":"0 * * * *","lastFired":{"timestamp":%d}},{"endpoint":"/never","value":"0 0 1 1 *"}]`,
			time.Now().Add(-3*time.Hour).UnixMilli()))})
	m.Save(t, "instances", elsewhere1, map[string]any{"subdomain": "blog", "owners": []string{"u1"}, "power": true, "edge": sfo.Id})
	m.Save(t, "instances", unpaid1, map[string]any{"subdomain": "cheap", "owners": []string{"u2"}, "power": true, "edge": sgp.Id, "blocked": unpaidBlock})

	cfg := testCfg
	cfg.MothershipURL, cfg.AdminUser, cfg.AdminPassword = m.URL, fleettest.Email, fleettest.Password
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	source := NewSource(cfg, logger)
	bucket, err := cache.New(cache.Config{}).Host(nil).Bucket("mothership.hosts", cachev1.Options{})
	if err != nil {
		t.Fatal(err)
	}
	source.Lazy.UseBucket(bucket)
	stats := NewStats()
	ctx, cancel := context.WithCancel(context.Background())
	source.Heartbeat(ctx, stats)

	addr := freeAddr(t)
	pcfg := pocker.DefaultConfig()
	pcfg.Listen, pcfg.PBRoot = addr, t.TempDir()
	hooksDir := filepath.Join(pcfg.PBRoot, mine1, "pb_hooks")
	if err := os.MkdirAll(hooksDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(hooksDir, "main.pb.js"), []byte(`routerAdd("GET", "/key", (e) => e.string(200, $os.getenv("API_KEY")))`), 0o644); err != nil {
		t.Fatal(err)
	}
	var running atomic.Pointer[pocker.Manager]
	fw := &firewall.Firewall{}
	srv := &pocker.Server{Standard: standard.New(), Config: pcfg, Source: source.Lazy, SetupApp: Setup(cfg), Logger: logger, Forward: source.Forward,
		Gates: []pocker.Gate{fw}, Extensions: []pocker.Extension{servertiming.New(), source.Lazy, source.Statuses()},
		Wrap: func(h http.Handler) http.Handler {
			return source.Front(fw, func() bool { m := running.Load(); return m != nil && m.Ready() }, PoweredBy, NodeCompat(stats.Middleware(h)))
		},
		OnStart: running.Store}
	go source.NewScheduler(func() Instances {
		if m := running.Load(); m != nil {
			return m
		}
		return nil
	}).Run(ctx)
	done := make(chan error, 1)
	go func() { done <- srv.Run(ctx) }()
	defer func() { cancel(); <-done }()

	client := &http.Client{Transport: &http.Transport{}}
	call := func(method, host, path, body string, hdr map[string]string) (int, string) {
		t.Helper()
		var rd io.Reader
		if body != "" {
			rd = strings.NewReader(body)
		}
		req, _ := http.NewRequest(method, "http://"+addr+path, rd)
		req.Host = host
		if body != "" {
			req.Header.Set("Content-Type", "application/json")
		}
		for k, v := range hdr {
			req.Header.Set(k, v)
		}
		res, err := client.Do(req)
		if err != nil {
			return 0, err.Error()
		}
		defer res.Body.Close()
		b, _ := io.ReadAll(res.Body)
		return res.StatusCode, string(b)
	}
	waitFor := func(what string, cond func() bool) {
		t.Helper()
		deadline := time.Now().Add(10 * time.Second)
		for !cond() {
			if time.Now().After(deadline) {
				t.Fatalf("timed out waiting for %s", what)
			}
			time.Sleep(20 * time.Millisecond)
		}
	}
	waitFor("server", func() bool { c, _ := call("GET", "shop.pockethost.io", "/api/health", "", nil); return c == 200 })

	// every instance has the standard extensions: MCP and its OAuth sign-in, on the instance's public origin
	if c, b := call("GET", "shop.pockethost.io", "/.well-known/oauth-protected-resource/mcp", "", map[string]string{"X-Forwarded-Proto": "https"}); c != 200 ||
		!strings.Contains(b, `"resource":"https://shop.pockethost.io/mcp"`) || !strings.Contains(b, `"authorization_servers":["https://shop.pockethost.io"]`) {
		t.Fatalf("MCP metadata on an instance: %d %s", c, b)
	}
	if c, _ := call("POST", "shop.pockethost.io", "/mcp", `{"jsonrpc":"2.0","id":1,"method":"ping"}`, nil); c != 401 {
		t.Fatalf("/mcp without a token: want 401, got %d", c)
	}

	// own instance: hooks folder, secrets, platform routes, admin sync, CORS from PH_CORS_ORIGINS
	if c, b := call("GET", mine1+".pockethost.io", "/api/health", "", nil); c != 200 {
		t.Fatalf("by id host: %d %s", c, b)
	}
	if c, b := call("POST", "shop.pockethost.io", "/api/collections/_superusers/auth-with-password",
		`{"identity":"owner@example.com","password":"owner-password"}`, nil); c != 200 {
		t.Errorf("owner login as superuser: %d %s", c, b)
	}
	if c, _ := call("GET", "shop.pockethost.io", "/api/ph/backup", "", nil); c != 401 {
		t.Errorf("backup without token: %d", c)
	}
	// the start-up catch-up webhook (below) may be taking a backup right now: a 409 means try again
	var bc int
	var bb string
	waitFor("backup with token", func() bool {
		bc, bb = call("GET", "shop.pockethost.io", "/api/ph/backup", "", map[string]string{"x-ph-backup-token": backupToken("s3cret", mine1)})
		return bc != http.StatusConflict
	})
	if bc != 200 || !strings.Contains(bb, "@auto_pb_backup_ph_") {
		t.Errorf("backup with token: %d %s", bc, bb)
	}

	// the Node firewall's daemon health check
	srvCompat := NodeCompat(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte(r.URL.Path)) }))
	rec := httptest.NewRecorder()
	srvCompat.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, DaemonHealthPath, nil))
	if rec.Body.String() != pocker.HealthPath {
		t.Errorf("daemon health path should map to Pocker's health, got %q", rec.Body.String())
	}

	// placement: another edge's instance is forwarded to it, once
	if c, b := call("GET", "blog.pockethost.io", "/api/health", "", nil); c != 200 || b != "sfo GET blog.pockethost.io /api/health by=sgp-1" {
		t.Errorf("other edge: %d %s", c, b)
	}
	if c, b := call("GET", "blog.pockethost.io", "/api/health", "", map[string]string{ForwardedByHeader: "ams-1"}); c != 421 || !strings.Contains(b, "another PocketHost edge") {
		t.Errorf("already forwarded: %d %s", c, b)
	}
	// the dashboard's log stream for another edge's instance goes there too
	rec = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "http://blog.pockethost.io/logs", strings.NewReader(`{}`))
	source.DeployBackend().DashboardLogs(nil, source.IsRemote)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte("next")) })).ServeHTTP(rec, req)
	if rec.Body.String() != "next" {
		t.Errorf("remote /logs should pass through: %q", rec.Body.String())
	}
	// load balancer health and the edge headers
	if c, b := call("GET", "anything.example.com", FirewallHealthPath, "", nil); c != 200 || b != `{"status":"firewall ok","code":200}` {
		t.Errorf("firewall health: %d %s", c, b)
	}
	// a response this edge fulfills says Pocker; a forwarded one (below) keeps the owner edge's value
	if res, err := client.Get("http://" + addr + FirewallHealthPath); err != nil || res.Header.Get("X-Powered-By") != PoweredBy {
		t.Errorf("own response X-Powered-By: %v %v", res, err)
	} else {
		res.Body.Close()
	}
	hreq, _ := http.NewRequest("GET", "http://"+addr+"/api/health", nil)
	hreq.Host = "blog.pockethost.io"
	if res, err := client.Do(hreq); err != nil || res.Header.Get(HeaderEdgeName) != "sgp-1" || res.Header.Get(HeaderOriginName) != "sfo" || res.Header.Get(HeaderOriginRegion) != "sfo" ||
		strings.Join(res.Header.Values("X-Powered-By"), ",") != "PocketHost" {
		t.Errorf("edge headers: %v %v", res, err)
	} else {
		res.Body.Close()
	}

	// Server-Timing: inner entries first, then this edge's (fwd when forwarded, else edge; entry unless another edge sent it)
	timing := func(host, path string, hdr map[string]string) string {
		req, _ := http.NewRequest("GET", "http://"+addr+path, nil)
		req.Host = host
		for k, v := range hdr {
			req.Header.Set(k, v)
		}
		res, err := client.Do(req)
		if err != nil {
			t.Errorf("timing %s%s: %v", host, path, err)
			return ""
		}
		_, _ = io.Copy(io.Discard, res.Body)
		res.Body.Close()
		var names []string
		for _, part := range strings.Split(res.Header.Get("Server-Timing"), ",") {
			fields := strings.Split(strings.TrimSpace(part), ";")
			name := fields[0]
			for _, f := range fields[1:] {
				if d, ok := strings.CutPrefix(f, "desc="); ok {
					name += "(" + strings.Trim(d, `"`) + ")"
				}
			}
			names = append(names, name)
		}
		return strings.Join(names, ",")
	}
	for _, c := range []struct {
		host, path string
		hdr        map[string]string
		want       string
	}{
		{"blog.pockethost.io", "/api/health", nil, "origin,wake,edge(sfo),fwd(sgp-1>sfo),entry(sgp-1)"},
		{"shop.pockethost.io", "/api/health", nil, "origin,wake,edge(sgp-1),entry(sgp-1)"},
		{"shop.pockethost.io", "/api/health", map[string]string{ForwardedByHeader: "sfo"}, "origin,wake,edge(sgp-1)"},
		{"anything.example.com", FirewallHealthPath, nil, "edge(sgp-1),entry(sgp-1)"},
	} {
		if got := timing(c.host, c.path, c.hdr); got != c.want {
			t.Errorf("Server-Timing %s%s %v = %s, want %s", c.host, c.path, c.hdr, got, c.want)
		}
	}

	// the missed hourly backup webhook ran at start and its result went back to the mothership
	waitFor("webhook result", func() bool {
		rec, err := m.App.FindRecordById("instances", mine1)
		if err != nil {
			return false
		}
		w := rec.GetString("webhooks")
		return strings.Contains(w, `"status":200`) && strings.Contains(w, "@auto_pb_backup_ph_")
	})
	if rec, _ := m.App.FindRecordById("instances", mine1); strings.Count(rec.GetString("webhooks"), "response") != 1 {
		t.Errorf("only the missed webhook fires: %s", rec.GetString("webhooks"))
	}
	if c, b := call("GET", "cheap.pockethost.io", "/api/health", "", nil); c != 402 || !strings.Contains(b, "upgrade") {
		t.Errorf("unpaid: %d %s", c, b)
	}
	if c, _ := call("GET", "nope.pockethost.io", "/", "", nil); c != 404 {
		t.Errorf("unknown: %d", c)
	}

	// status, heartbeat, subscriptions
	waitFor("running status", func() bool {
		f.mu.Lock()
		defer f.mu.Unlock()
		for _, s := range f.statuses {
			if s == mine1+"=running" {
				return true
			}
		}
		return false
	})
	waitFor("heartbeat with traffic", func() bool {
		f.mu.Lock()
		defer f.mu.Unlock()
		for _, h := range f.heartbeats {
			if st, ok := h["stats"].(map[string]any); ok && h["edge_id"] == "sgp-1" && st["requests"].(float64) > 0 {
				return true
			}
		}
		return false
	})
	// realtime: a rotated secret restarts the app with the new value
	if c, b := call("GET", "shop.pockethost.io", "/key", "", nil); c != 200 || b != "v1" {
		t.Fatalf("before rotation: %d %q", c, b)
	}
	m.Save(t, "instances", mine1, map[string]any{"secrets": map[string]string{"API_KEY": "v2"}})
	waitFor("rotated secret", func() bool { _, b := call("GET", "shop.pockethost.io", "/key", "", nil); return b == "v2" })

	// the owner's plan lapses (the mothership rewrites the owner's instances with the block)
	m.Save(t, "instances", mine1, map[string]any{"blocked": unpaidBlock})
	waitFor("owner downgrade applied", func() bool { c, _ := call("GET", "shop.pockethost.io", "/api/health", "", nil); return c == 402 })

	// instance moved to this edge: served here now
	m.Save(t, "instances", elsewhere1, map[string]any{"edge": sgp.Id})
	waitFor("moved instance served", func() bool { c, _ := call("GET", "blog.pockethost.io", "/api/health", "", nil); return c == 200 })

	// deleted instance: gone
	gone, _ := m.App.FindRecordById("instances", elsewhere1)
	if err := m.App.Delete(gone); err != nil {
		t.Fatal(err)
	}
	waitFor("deleted instance gone", func() bool { c, _ := call("GET", "blog.pockethost.io", "/api/health", "", nil); return c == 404 })
}
