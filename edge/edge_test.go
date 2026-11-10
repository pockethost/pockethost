package edge

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
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
	"testing"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/pocker"
	"golang.org/x/crypto/bcrypt"
)

var testCfg = Config{ApexDomain: "pockethost.io", HTTPProtocol: "https:", AppURL: "https://app.pockethost.io",
	DocURL: "https://pockethost.io/docs", EdgeID: "sgp-1", BackupTokenSecret: "s3cret",
	HeartbeatInterval: 50 * time.Millisecond, DriftCheckInterval: time.Hour}

func raw(s string) json.RawMessage { return json.RawMessage(s) }

func TestMapInstance(t *testing.T) {
	owner := &userRec{ID: "u1", Verified: true, SubscriptionQuantity: 1, TrustedIPs: raw(`["203.0.113.0/24"]`)}
	inst := instanceRec{ID: "abc123", Subdomain: "shop", UID: "u1", Power: true, Edge: "E_SGP", Cname: "Shop.Example.com",
		Secrets:  raw(`{"STRIPE_KEY":"sk","PH_CORS_ORIGINS":"https://a.com, https://b.com,https://a.com","PB_ENCRYPTION_KEY":"k32"}`),
		Firewall: raw(`"{\"ip_hourly\": 2000, \"ip_concurrent\": 1.5, \"instance_hourly\": -1}"`), SyncAdmin: true}
	login := func(uid string) *tokenInfo {
		return &tokenInfo{Email: "o@x.com", PasswordHash: "$2a$hash", TokenKey: "tk"}
	}

	p, ok := mapInstance(testCfg, inst, owner, "E_SGP", login)
	if !ok || p.Blocked != nil {
		t.Fatalf("own instance: ok=%v %+v", ok, p.Blocked)
	}
	if strings.Join(p.Hosts, ",") != "shop.pockethost.io,abc123.pockethost.io,shop.example.com" {
		t.Errorf("hosts: %v", p.Hosts)
	}
	if p.Secrets["STRIPE_KEY"] != "sk" || p.Secrets["PH_CORS_ORIGINS"] != "" || p.Secrets["PB_ENCRYPTION_KEY"] != "" {
		t.Errorf("secrets must lose the reserved names: %v", p.Secrets)
	}
	if p.Secrets["PH_APP_NAME"] != "shop" || p.Secrets["PH_INSTANCE_URL"] != "https://shop.pockethost.io" {
		t.Errorf("platform env: %v", p.Secrets)
	}
	if p.EncryptionKey != "k32" || strings.Join(p.Access.CORSOrigins, ",") != "https://a.com,https://b.com" {
		t.Errorf("explicit fields: key=%q cors=%v", p.EncryptionKey, p.Access.CORSOrigins)
	}
	if strings.Join(p.Access.TrustedIPs, ",") != "203.0.113.0/24" {
		t.Errorf("owner trusted_ips: %v", p.Access.TrustedIPs)
	}
	if p.Limits.RateLimits == nil || p.Limits.RateLimits.IPHourly != 2000 || p.Limits.RateLimits.IPConcurrent != 0 || p.Limits.RateLimits.InstanceHourly != 0 {
		t.Errorf("firewall overrides (positive integers only): %+v", p.Limits.RateLimits)
	}
	if len(p.Superusers) != 1 || p.Superusers[0].Email != "o@x.com" || p.Superusers[0].ID != "u1" {
		t.Errorf("admin sync: %+v", p.Superusers)
	}
	mac := hmac.New(sha256.New, []byte("s3cret"))
	mac.Write([]byte("backup-token:abc123"))
	if p.Private["backup_token"] != base64.RawURLEncoding.EncodeToString(mac.Sum(nil)) {
		t.Error("backup token must match the Node edge's formula")
	}

	// placement
	if p, _ := mapInstance(testCfg, inst, owner, "E_OTHER", login); p.Blocked == nil || p.Blocked.Status != 421 || p.Secrets != nil {
		t.Errorf("other edge: %+v", p)
	}
	legacy := inst
	legacy.Edge = ""
	if p, _ := mapInstance(testCfg, legacy, owner, "E_SGP", login); p.Blocked == nil || p.Blocked.Status != 421 {
		t.Error("an instance without an edge belongs to sfo, not sgp-1")
	}
	sfo := testCfg
	sfo.EdgeID = "sfo"
	if p, _ := mapInstance(sfo, legacy, owner, "E_SFO", login); p.Blocked != nil {
		t.Errorf("legacy instance on sfo: %+v", p.Blocked)
	}

	// blocked rules, in the Node edge's order
	cases := []struct {
		name   string
		mutate func(*instanceRec, *userRec)
		status int
	}{
		{"owner suspended", func(i *instanceRec, u *userRec) { u.Suspension = "abuse"; i.Suspension = "x" }, 403},
		{"instance suspended", func(i *instanceRec, u *userRec) { i.Suspension = "abuse" }, 403},
		{"unpaid", func(i *instanceRec, u *userRec) { u.SubscriptionQuantity = 0; i.Power = false }, 402},
		{"powered off", func(i *instanceRec, u *userRec) { i.Power = false }, 503},
		{"unverified", func(i *instanceRec, u *userRec) { u.Verified = false }, 403},
	}
	for _, c := range cases {
		i2, u2 := inst, *owner
		c.mutate(&i2, &u2)
		p, _ := mapInstance(testCfg, i2, &u2, "E_SGP", login)
		if p.Blocked == nil || p.Blocked.Status != c.status {
			t.Errorf("%s: %+v", c.name, p.Blocked)
		}
	}
	if _, ok := mapInstance(testCfg, inst, nil, "E_SGP", login); ok {
		t.Error("unknown owner: not served")
	}
}

// fakeMothership speaks the current mothership's edge protocol.
type fakeMothership struct {
	t  *testing.T
	mu sync.Mutex
	d  dump

	sse        chan string // realtime events to push ("event\ndata")
	heartbeats []map[string]any
	statuses   []string
	subscribed []string
	hash       string
}

func (f *fakeMothership) handler() http.Handler {
	mux := http.NewServeMux()
	auth := func(h http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if r.Header.Get("Authorization") != "TOKEN" {
				http.Error(w, "unauthorized", 401)
				return
			}
			h(w, r)
		}
	}
	mux.HandleFunc("POST /api/collections/_superusers/auth-with-password", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]string{"token": "TOKEN"})
	})
	mux.HandleFunc("GET /api/mirror", auth(func(w http.ResponseWriter, r *http.Request) {
		f.mu.Lock()
		defer f.mu.Unlock()
		_ = json.NewEncoder(w).Encode(f.d)
	}))
	mux.HandleFunc("POST /api/mirror", auth(func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Instances []map[string]string `json:"instances"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		f.mu.Lock()
		for _, i := range body.Instances {
			f.statuses = append(f.statuses, i["id"]+"="+i["status"])
		}
		f.mu.Unlock()
		_, _ = w.Write([]byte(`{"updated":1}`))
	}))
	mux.HandleFunc("PATCH /api/collections/instances/records/{id}", auth(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]string
		_ = json.NewDecoder(r.Body).Decode(&body)
		f.mu.Lock()
		f.statuses = append(f.statuses, r.PathValue("id")+"="+body["status"])
		f.mu.Unlock()
		_, _ = w.Write([]byte(`{}`))
	}))
	mux.HandleFunc("GET /api/collections/{c}/records", auth(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"items":[],"totalPages":0}`))
	}))
	mux.HandleFunc("GET /api/userToken/{id}", auth(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(tokenInfo{Email: "owner@example.com", PasswordHash: f.hash, TokenKey: "tk"})
	}))
	mux.HandleFunc("POST /api/edge/heartbeat", auth(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		f.mu.Lock()
		f.heartbeats = append(f.heartbeats, body)
		f.mu.Unlock()
		_, _ = w.Write([]byte(`{}`))
	}))
	mux.HandleFunc("GET /api/realtime", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		fl := w.(http.Flusher)
		fmt.Fprint(w, "id:c1\nevent:PB_CONNECT\ndata:{\"clientId\":\"c1\"}\n\n")
		fl.Flush()
		for {
			select {
			case <-r.Context().Done():
				return
			case ev := <-f.sse:
				name, data, _ := strings.Cut(ev, "\n")
				fmt.Fprintf(w, "event:%s\ndata:%s\n\n", name, data)
				fl.Flush()
			}
		}
	})
	mux.HandleFunc("POST /api/realtime", auth(func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Subscriptions []string `json:"subscriptions"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		f.mu.Lock()
		f.subscribed = body.Subscriptions
		f.mu.Unlock()
		w.WriteHeader(204)
	}))
	return mux
}

func (f *fakeMothership) push(collection, action string, record any) {
	b, _ := json.Marshal(map[string]any{"action": action, "record": record})
	f.sse <- collection + "/*\n" + string(b)
}

func freeAddr(t *testing.T) string {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	return ln.Addr().String()
}

func TestEdgeAgainstFakeMothership(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("owner-password"), 4)
	f := &fakeMothership{t: t, sse: make(chan string, 16), hash: string(hash)}
	owner := userRec{ID: "u1", Email: "owner@example.com", Verified: true, SubscriptionQuantity: 1}
	unpaidOwner := userRec{ID: "u2", Verified: true, SubscriptionQuantity: 0}
	mine := instanceRec{ID: "mine1", Subdomain: "shop", UID: "u1", Power: true, Edge: "E_SGP", SyncAdmin: true,
		Secrets: raw(`{"API_KEY":"v1","PH_CORS_ORIGINS":"https://shop.example.com"}`)}
	f.d = dump{
		Users: []userRec{owner, unpaidOwner},
		Instances: []instanceRec{mine,
			{ID: "elsewhere1", Subdomain: "blog", UID: "u1", Power: true, Edge: "E_SFO"},
			{ID: "unpaid1", Subdomain: "cheap", UID: "u2", Power: true, Edge: "E_SGP"}},
		Edges: []edgeRec{{ID: "E_SGP", EdgeID: "sgp-1", Region: "sgp"}, {ID: "E_SFO", EdgeID: "sfo", Region: "sfo"}},
	}
	ms := httptest.NewServer(f.handler())
	defer ms.Close()

	cfg := testCfg
	cfg.MothershipURL, cfg.AdminUser, cfg.AdminPassword = ms.URL, "admin@x", "pw"
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	source := NewSource(cfg, logger)
	stats := NewStats()
	ctx, cancel := context.WithCancel(context.Background())
	source.Heartbeat(ctx, stats)

	addr := freeAddr(t)
	pcfg := pocker.DefaultConfig()
	pcfg.Listen, pcfg.PBRoot, pcfg.MemorySoftLimit = addr, t.TempDir(), -1
	hooksDir := filepath.Join(pcfg.PBRoot, "mine1", "pb_hooks")
	if err := os.MkdirAll(hooksDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(hooksDir, "main.pb.js"), []byte(`routerAdd("GET", "/key", (e) => e.string(200, $os.getenv("API_KEY")))`), 0o644); err != nil {
		t.Fatal(err)
	}
	srv := &pocker.Server{Config: pcfg, Source: source, SetupApp: Setup(cfg), Wrap: stats.Middleware, Logger: logger,
		OnEvent: func(e pocker.Event) {}}
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

	// own instance: hooks folder, secrets, platform routes, admin sync, CORS from PH_CORS_ORIGINS
	if c, b := call("GET", "mine1.pockethost.io", "/api/health", "", nil); c != 200 {
		t.Fatalf("by id host: %d %s", c, b)
	}
	if c, b := call("POST", "shop.pockethost.io", "/api/collections/_superusers/auth-with-password",
		`{"identity":"owner@example.com","password":"owner-password"}`, nil); c != 200 {
		t.Errorf("owner login as superuser: %d %s", c, b)
	}
	if c, _ := call("GET", "shop.pockethost.io", "/api/ph/backup", "", nil); c != 401 {
		t.Errorf("backup without token: %d", c)
	}
	if c, b := call("GET", "shop.pockethost.io", "/api/ph/backup", "", map[string]string{"x-ph-backup-token": backupToken("s3cret", "mine1")}); c != 200 || !strings.Contains(b, "@auto_pb_backup_ph_") {
		t.Errorf("backup with token: %d %s", c, b)
	}

	// the Node firewall's daemon health check
	srvCompat := NodeCompat(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte(r.URL.Path)) }))
	rec := httptest.NewRecorder()
	srvCompat.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, DaemonHealthPath, nil))
	if rec.Body.String() != pocker.HealthPath {
		t.Errorf("daemon health path should map to Pocker's health, got %q", rec.Body.String())
	}

	// placement and blocked rules
	if c, b := call("GET", "blog.pockethost.io", "/api/health", "", nil); c != 421 || !strings.Contains(b, "another PocketHost edge") {
		t.Errorf("other edge: %d %s", c, b)
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
			if s == "mine1=running" {
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
	f.mu.Lock()
	subs := strings.Join(f.subscribed, ",")
	f.mu.Unlock()
	if subs != "instances/*,users/*,edges/*" {
		t.Errorf("subscriptions: %q", subs)
	}

	// realtime: a rotated secret restarts the app with the new value
	if c, b := call("GET", "shop.pockethost.io", "/key", "", nil); c != 200 || b != "v1" {
		t.Fatalf("before rotation: %d %q", c, b)
	}
	rotated := mine
	rotated.Secrets = raw(`{"API_KEY":"v2"}`)
	rotated.Updated = "later"
	f.push("instances", "update", rotated)
	waitFor("rotated secret", func() bool { _, b := call("GET", "shop.pockethost.io", "/key", "", nil); return b == "v2" })

	// realtime: the owner's plan lapses
	unpaid := owner
	unpaid.SubscriptionQuantity = 0
	f.push("users", "update", unpaid)
	waitFor("owner downgrade applied", func() bool { c, _ := call("GET", "shop.pockethost.io", "/api/health", "", nil); return c == 402 })

	// instance moved to this edge: served here now
	moved := instanceRec{ID: "elsewhere1", Subdomain: "blog", UID: "u1", Power: true, Edge: "E_SGP"}
	unpaid.SubscriptionQuantity = 1
	f.push("users", "update", unpaid)
	f.push("instances", "update", moved)
	waitFor("moved instance served", func() bool { c, _ := call("GET", "blog.pockethost.io", "/api/health", "", nil); return c == 200 })

	// deleted instance: gone
	f.push("instances", "delete", moved)
	waitFor("deleted instance gone", func() bool { c, _ := call("GET", "blog.pockethost.io", "/api/health", "", nil); return c == 404 })
}

func TestLoadEnvFileInlineComments(t *testing.T) {
	p := filepath.Join(t.TempDir(), ".env")
	_ = os.WriteFile(p, []byte("A_PORT=8080 # FIXME 80\nB_URL=\"http://x # not a comment\"\n# whole line\nC=plain\n"), 0o644)
	for _, k := range []string{"A_PORT", "B_URL", "C"} {
		_ = os.Unsetenv(k)
	}
	if err := LoadEnvFile(p); err != nil {
		t.Fatal(err)
	}
	if os.Getenv("A_PORT") != "8080" || os.Getenv("B_URL") != "http://x # not a comment" || os.Getenv("C") != "plain" {
		t.Fatalf("got %q %q %q", os.Getenv("A_PORT"), os.Getenv("B_URL"), os.Getenv("C"))
	}
}
