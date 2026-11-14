package edge

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	firewall "github.com/pockethost/pocketone/ext/firewall"

	"github.com/pockethost/pocketone/ext/pocker"
)

type listSource []pocker.Instance

func (l listSource) Snapshot(context.Context) ([]pocker.Instance, error) { return l, nil }
func (l listSource) Watch(context.Context) (<-chan pocker.Change, error) { return nil, nil }

func pbTime(t time.Time) string { return t.UTC().Format("2006-01-02 15:04:05.000Z") }

// routeSource: this edge is sgp-1; "away" runs on E_SFO.
func routeSource(t *testing.T, sfo edgeRec) *Source {
	t.Helper()
	s := NewSource(testCfg, slog.New(slog.NewTextHandler(io.Discard, nil)))
	s.loadDumpLocked(&dump{
		Users:     []userRec{{ID: "u1", Verified: true, SubscriptionQuantity: 1}},
		Instances: []instanceRec{{ID: "away", Subdomain: "away", UID: "u1", Power: true, Edge: "E_SFO"}},
		Edges:     []edgeRec{{ID: "E_SGP", EdgeID: "sgp-1", Region: "sgp"}, sfo},
	})
	s.diffLocked(context.Background(), nil)
	return s
}

func forward(s *Source, inst pocker.Instance, method string, hdr map[string]string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, "https://Away.pockethost.io:8443/x", nil) // the owner gets the bare hostname
	for k, v := range hdr {
		r.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	s.Forward(w, r, inst)
	return w
}

func TestForwardHealthAndStaleProbe(t *testing.T) {
	var hits atomic.Int32
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == DaemonHealthPath {
			_, _ = w.Write([]byte(`{"status":"ok"}`))
			return
		}
		hits.Add(1)
		if r.Host != "away.pockethost.io" {
			http.Error(w, "host "+r.Host, 404)
			return
		}
		fmt.Fprintf(w, "ok %s xff=%s", r.Header.Get(ForwardedByHeader), r.Header.Get("X-Forwarded-For"))
	}))
	defer up.Close()
	inst := pocker.Instance{ID: "away", Remote: "edge:E_SFO"}

	// healthy in the mirror: forwarded
	s := routeSource(t, edgeRec{ID: "E_SFO", EdgeID: "sfo", InternalURL: up.URL, LastSeen: pbTime(time.Now())})
	if w := forward(s, inst, "GET", nil); w.Code != 200 || !strings.HasPrefix(w.Body.String(), "ok sgp-1 xff=192.0.2.1") {
		t.Fatalf("healthy: %d %q", w.Code, w.Body.String())
	}

	// silent in the mirror but answering its health check: still forwarded (the mirror can lag)
	s = routeSource(t, edgeRec{ID: "E_SFO", EdgeID: "sfo", InternalURL: up.URL, LastSeen: pbTime(time.Now().Add(-time.Hour))})
	if w := forward(s, inst, "GET", nil); w.Code != 200 {
		t.Fatalf("stale but alive: %d %q", w.Code, w.Body.String())
	}

	// announced shutdown: fail fast without asking
	s = routeSource(t, edgeRec{ID: "E_SFO", EdgeID: "sfo", InternalURL: up.URL, Status: "offline", LastSeen: pbTime(time.Now())})
	before := hits.Load()
	if w := forward(s, inst, "GET", nil); w.Code != 503 || w.Header().Get("Retry-After") != "10" || hits.Load() != before {
		t.Fatalf("offline: %d", w.Code)
	}

	// silent and not answering: 503
	dead := freeAddr(t)
	s = routeSource(t, edgeRec{ID: "E_SFO", EdgeID: "sfo", InternalURL: "http://" + dead, LastSeen: pbTime(time.Now().Add(-time.Hour))})
	if w := forward(s, inst, "GET", nil); w.Code != 503 {
		t.Fatalf("dead: %d", w.Code)
	}

	// unknown edge: 503
	if w := forward(s, pocker.Instance{ID: "away", Remote: "edge:E_NOPE"}, "GET", nil); w.Code != 503 {
		t.Fatalf("unknown edge: %d", w.Code)
	}

	// already forwarded once: 421, never a second hop
	if w := forward(s, inst, "GET", map[string]string{ForwardedByHeader: "ams-1"}); w.Code != 421 {
		t.Fatalf("second hop: %d", w.Code)
	}
}

func TestForwardHoldsWhileOwnerRestarts(t *testing.T) {
	// the owner is healthy in the mirror but its port is closed for a moment (restart): GETs are held and retried
	addr := freeAddr(t)
	s := routeSource(t, edgeRec{ID: "E_SFO", EdgeID: "sfo", InternalURL: "http://" + addr, LastSeen: pbTime(time.Now())})
	inst := pocker.Instance{ID: "away", Remote: "edge:E_SFO"}
	go func() {
		time.Sleep(600 * time.Millisecond)
		ln, err := net.Listen("tcp", addr)
		if err != nil {
			return
		}
		_ = http.Serve(ln, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == DaemonHealthPath {
				_, _ = w.Write([]byte(`{"status":"ok"}`))
				return
			}
			_, _ = w.Write([]byte("back"))
		}))
	}()
	start := time.Now()
	if w := forward(s, inst, "GET", nil); w.Code != 200 || w.Body.String() != "back" {
		t.Fatalf("held GET: %d %q", w.Code, w.Body.String())
	}
	if time.Since(start) < 500*time.Millisecond {
		t.Fatal("expected the GET to wait for the owner")
	}

	// a POST isn't replayed while the owner is suspect: 503 right away
	s2 := routeSource(t, edgeRec{ID: "E_SFO", EdgeID: "sfo", InternalURL: "http://" + freeAddr(t), LastSeen: pbTime(time.Now())})
	r := httptest.NewRequest(http.MethodPost, "http://away.pockethost.io/x", strings.NewReader("body"))
	w := httptest.NewRecorder()
	s2.Forward(w, r, inst)
	if w.Code != 503 {
		t.Fatalf("POST to a down owner: %d", w.Code)
	}
}

func TestForwardCORSPolicy(t *testing.T) {
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Vary", "Accept-Encoding")
		_, _ = w.Write([]byte("hi"))
	}))
	defer up.Close()
	s := routeSource(t, edgeRec{ID: "E_SFO", EdgeID: "sfo", InternalURL: up.URL, LastSeen: pbTime(time.Now())})
	inst := pocker.Instance{ID: "away", Remote: "edge:E_SFO", Access: pocker.Access{CORSOrigins: []string{"https://*.example.com"}}}

	w := forward(s, inst, "GET", map[string]string{"Origin": "https://app.example.com"})
	if w.Header().Get("Access-Control-Allow-Origin") != "https://app.example.com" || w.Header().Get("Access-Control-Allow-Credentials") != "" ||
		!strings.Contains(w.Header().Get("Vary"), "Origin") {
		t.Fatalf("allowed origin: %v", w.Header())
	}
	w = forward(s, inst, "GET", map[string]string{"Origin": "https://evil.test"})
	if w.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("other origin must get no allow header: %v", w.Header())
	}
	w = forward(s, inst, "OPTIONS", map[string]string{"Origin": "https://app.example.com", "Access-Control-Request-Headers": "authorization"})
	if w.Code != 204 || w.Header().Get("Access-Control-Allow-Headers") != "authorization" || w.Body.Len() != 0 {
		t.Fatalf("preflight answered here: %d %v", w.Code, w.Header())
	}
	// no policy: the owner's headers pass through
	w = forward(s, pocker.Instance{ID: "away", Remote: "edge:E_SFO"}, "GET", map[string]string{"Origin": "https://evil.test"})
	if w.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Fatalf("no policy: %v", w.Header())
	}
}

func TestFrontPeerCheckAndHealth(t *testing.T) {
	s := routeSource(t, edgeRec{ID: "E_SFO", EdgeID: "sfo", Region: "sfo"})
	fw, err := firewall.NewFirewall(firewall.Config{AllowCIDRs: []string{"173.245.48.0/20"}})
	if err != nil {
		t.Fatal(err)
	}
	ready := false
	h := s.Front(fw, func() bool { return ready }, PoweredBy, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte("in")) }))
	do := func(path, peer string) *httptest.ResponseRecorder {
		r := httptest.NewRequest("GET", "http://away.pockethost.io"+path, nil)
		r.RemoteAddr = peer + ":1234"
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		return w
	}
	if w := do(FirewallHealthPath, "198.51.100.7"); w.Code != 503 || !strings.Contains(w.Body.String(), "starting") {
		t.Fatalf("health before the instance list loads: %d %s", w.Code, w.Body.String())
	}
	ready = true
	if w := do(FirewallHealthPath, "198.51.100.7"); w.Code != 200 || !strings.Contains(w.Body.String(), "firewall ok") {
		t.Fatalf("health is open to any peer (the Node firewall's order): %d", w.Code)
	}
	if w := do("/", "198.51.100.7"); w.Code != 403 {
		t.Fatalf("non-Cloudflare peer: %d", w.Code)
	}
	if got := do(FirewallHealthPath, "198.51.100.7").Header().Get("X-Powered-By"); got != PoweredBy {
		t.Fatalf("a Pocker edge's X-Powered-By: %q", got)
	}
	silent := s.Front(fw, nil, "", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	sw := httptest.NewRecorder()
	silent.ServeHTTP(sw, httptest.NewRequest("GET", "http://away.pockethost.io"+FirewallHealthPath, nil))
	if got := sw.Header().Values("X-Powered-By"); len(got) != 0 {
		t.Fatalf("a docker edge sets no X-Powered-By of its own: %v", got)
	}
	w := do("/", "173.245.48.10")
	if w.Code != 200 || w.Header().Get(HeaderEdgeName) != "sgp-1" || w.Header().Get(HeaderOriginName) != "sfo" {
		t.Fatalf("allowed peer: %d %v", w.Code, w.Header())
	}
}

func TestFirewallFromEnv(t *testing.T) {
	t.Setenv("IPCIDR_LIST", "173.245.48.0/20, 2400:cb00::/32")
	t.Setenv("PH_USER_PROXY_IPS", "203.0.113.9")
	fw := firewall.Config{AllowCIDRs: []string{"10.88.0.0/24"}, TrustedProxies: []string{"10.88.0.0/24"}}
	FirewallFromEnv(&fw)
	if strings.Join(fw.AllowCIDRs, ",") != "10.88.0.0/24,173.245.48.0/20,2400:cb00::/32,127.0.0.0/8,::1/128" ||
		strings.Join(fw.TrustedProxies, ",") != "10.88.0.0/24,173.245.48.0/20,2400:cb00::/32" ||
		strings.Join(fw.TrustedClients, ",") != "203.0.113.9,127.0.0.0/8,::1/128" {
		t.Fatalf("%+v", fw)
	}
	if fw.RateLimitHeaderPrefix != "X-PocketHost-RateLimit" {
		t.Errorf("header prefix: %q", fw.RateLimitHeaderPrefix)
	}
	if _, err := firewall.NewFirewall(fw); err != nil {
		t.Fatal(err)
	}
}

func TestCronCatchUpAndParse(t *testing.T) {
	s, err := parseCron("0 * * * *")
	if err != nil {
		t.Fatal(err)
	}
	now := time.Date(2026, 11, 11, 10, 30, 0, 0, time.UTC)
	if !catchUpDue(s, now.Add(-2*time.Hour), now) {
		t.Error("missed an hourly run")
	}
	if catchUpDue(s, now.Add(-20*time.Minute), now) {
		t.Error("fired at 10:10, next is 11:00")
	}
	if catchUpDue(s, time.Time{}, now) {
		t.Error("never-fired webhooks don't run early")
	}
	if _, err := parseCron("30 0 * * * *"); err != nil {
		t.Errorf("6-field (seconds first) expressions are accepted: %v", err)
	}
	if _, err := parseCron("nope"); err == nil {
		t.Error("invalid expression")
	}
	if webhookPath("api//ph/backup?x=1") != "/api/ph/backup?x=1" || logPath("/a?secret=1") != "/a" {
		t.Error("paths")
	}
}

func TestVacuumCompactsWhileHeld(t *testing.T) {
	root := t.TempDir()
	dir := filepath.Join(root, "mine1", "pb_data")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	dbPath := filepath.Join(dir, "data.db")
	db, err := sql.Open("sqlite", "file:"+dbPath+"?_pragma=journal_mode(WAL)")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec("CREATE TABLE keep(v TEXT); CREATE TABLE junk(v BLOB); INSERT INTO keep VALUES ('precious')"); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 40; i++ {
		if _, err := db.Exec("INSERT INTO junk VALUES (randomblob(100000))"); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := db.Exec("DELETE FROM junk; PRAGMA wal_checkpoint(TRUNCATE)"); err != nil {
		t.Fatal(err)
	}
	db.Close()
	before := fileSize(dbPath)

	cfg := testCfg
	s := NewSource(cfg, slog.New(slog.NewTextHandler(io.Discard, nil)))
	off := false
	s.loadDumpLocked(&dump{
		Users: []userRec{{ID: "u1", Verified: true, SubscriptionQuantity: 1}},
		Instances: []instanceRec{{ID: "mine1", Subdomain: "shop", UID: "u1", Power: true, Edge: "E_SGP"},
			{ID: "optout", Subdomain: "o", UID: "u1", Power: true, Edge: "E_SGP", AutoVacuum: &off}},
		Edges: []edgeRec{{ID: "E_SGP", EdgeID: "sgp-1"}},
	})
	s.diffLocked(context.Background(), nil)
	m := pocker.NewManager(listSource{{ID: "mine1", Hosts: []string{"shop.pockethost.io"}}, {ID: "optout", Hosts: []string{"o.pockethost.io"}}}, pocker.ManagerOptions{PBRoot: root, Logger: slog.New(slog.NewTextHandler(io.Discard, nil))})
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go m.Run(ctx)
	defer m.Shutdown()
	// the app runs (it has the database open) before the sweep
	deadline := time.Now().Add(10 * time.Second)
	for {
		w := httptest.NewRecorder()
		m.ServeHTTP(w, httptest.NewRequest("GET", "http://shop.pockethost.io/api/health", nil))
		if w.Code == 200 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("app did not start: %d %s", w.Code, w.Body.String())
		}
		time.Sleep(20 * time.Millisecond)
	}
	opts := DefaultVacuumOptions()
	opts.DiscordURL = ""
	sum := s.NewVacuumer(func() Instances { return m }, opts).Sweep(ctx)
	after := fileSize(dbPath)
	if sum.Vacuumed != 1 || sum.SavedBytes <= 0 || after >= before/2 || len(sum.Failed) != 0 {
		t.Fatalf("sweep: %+v before=%d after=%d", sum, before, after)
	}
	if !m.Running("mine1") {
		t.Error("a running instance is started again after its vacuum")
	}
	db, _ = sql.Open("sqlite", "file:"+dbPath+"?mode=ro")
	var v string
	if err := db.QueryRow("SELECT v FROM keep").Scan(&v); err != nil || v != "precious" {
		t.Fatalf("data kept: %q %v", v, err)
	}
	db.Close()
	// nothing to reclaim the second time: no stop at all
	if sum := s.NewVacuumer(func() Instances { return m }, opts).Sweep(ctx); sum.Vacuumed != 0 {
		t.Fatalf("second sweep: %+v", sum)
	}
}
