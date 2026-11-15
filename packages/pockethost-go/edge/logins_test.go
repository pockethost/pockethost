package edge

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// A first snapshot with many admin-synced owners fetches their logins in parallel and skips blocked instances, so an
// edge with thousands of owners (sfo-2) gets ready in seconds, not minutes.
func TestSnapshotFetchesOwnerLoginsInParallel(t *testing.T) {
	const served, blocked, delay = 200, 50, 20 * time.Millisecond
	var d dump
	d.Edges = []edgeRec{{ID: "E_SGP", EdgeID: "sgp-1"}}
	for i := 0; i < served+blocked; i++ {
		u := userRec{ID: fmt.Sprintf("u%03d", i), Verified: true, SubscriptionQuantity: 1, Updated: "2026-01-01 00:00:00.000Z"}
		inst := instanceRec{ID: fmt.Sprintf("i%03d", i), Subdomain: fmt.Sprintf("s%03d", i), UID: u.ID, Power: true, Edge: "E_SGP", SyncAdmin: true}
		if i >= served {
			inst.Suspension = "abuse"
		}
		if i == 7 {
			u.ID, inst.UID = "fail", "fail" // its login fetch fails: served without admin sync, fetched once
		}
		d.Users, d.Instances = append(d.Users, u), append(d.Instances, inst)
	}
	var calls, inFlight, peak atomic.Int64
	var mu sync.Mutex
	asked := map[string]int{}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/collections/_superusers/auth-with-password", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]string{"token": "TOKEN"})
	})
	mux.HandleFunc("GET /api/mirror", func(w http.ResponseWriter, r *http.Request) { _ = json.NewEncoder(w).Encode(d) })
	mux.HandleFunc("GET /api/userToken/{id}", func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		n := inFlight.Add(1)
		defer inFlight.Add(-1)
		for p := peak.Load(); n > p && !peak.CompareAndSwap(p, n); p = peak.Load() {
		}
		mu.Lock()
		asked[r.PathValue("id")]++
		mu.Unlock()
		time.Sleep(delay)
		if r.PathValue("id") == "fail" {
			http.Error(w, "nope", 404)
			return
		}
		_ = json.NewEncoder(w).Encode(tokenInfo{Email: "o@x.com", PasswordHash: "$2a$h", TokenKey: "tk"})
	})
	ms := httptest.NewServer(mux)
	defer ms.Close()

	cfg := testCfg
	cfg.MothershipURL, cfg.AdminUser, cfg.AdminPassword = ms.URL, "a", "p"
	s := NewSource(cfg, slog.New(slog.NewTextHandler(io.Discard, nil)))
	t0 := time.Now()
	list, err := s.Snapshot(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	took := time.Since(t0)
	if got := calls.Load(); got != served {
		t.Errorf("login fetches %d, want %d (served instances only, blocked skipped)", got, served)
	}
	if took > served*delay/4 {
		t.Errorf("snapshot took %v: logins weren't fetched in parallel", took)
	}
	if p := peak.Load(); p < 2 || p > loginWorkers {
		t.Errorf("peak concurrent fetches %d, want 2..%d", p, loginWorkers)
	}
	for id, n := range asked {
		if n != 1 {
			t.Errorf("%s fetched %d times", id, n)
		}
	}
	synced := 0
	for _, p := range list {
		if len(p.Superusers) > 0 {
			synced++
			if p.Blocked != nil || strings.HasPrefix(p.ID, "i007") {
				t.Errorf("%s: superuser on a blocked or failed instance", p.ID)
			}
		}
	}
	if synced != served-1 {
		t.Errorf("instances with admin sync %d, want %d", synced, served-1)
	}

	// a resync with unchanged users makes no fetches
	calls.Store(0)
	s.mu.Lock()
	s.diffLocked(context.Background(), nil)
	s.mu.Unlock()
	if calls.Load() != 0 {
		t.Errorf("resync fetched %d logins; want all cached", calls.Load())
	}
}
