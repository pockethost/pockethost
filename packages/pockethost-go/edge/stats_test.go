package edge

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/pockethost/pocketone/ext/core/multisite-stats"
)

// fakeStats is a mothership with just the login and the instance_stats records API.
type fakeStats struct {
	mu   sync.Mutex
	rows map[string]map[string]any // row id → fields
	n    int
}

func (f *fakeStats) handler(t *testing.T) http.Handler {
	quoted := regexp.MustCompile(`^(edge|instance)="([^"]*)"$`)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f.mu.Lock()
		defer f.mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		switch {
		case strings.HasSuffix(r.URL.Path, "/auth-with-password"):
			_, _ = io.WriteString(w, `{"token":"t"}`)
		case r.Method == http.MethodGet && r.URL.Path == "/api/collections/instance_stats/records":
			m := quoted.FindStringSubmatch(r.URL.Query().Get("filter"))
			if m == nil {
				t.Errorf("unexpected filter %q", r.URL.Query().Get("filter"))
			}
			var items []map[string]any
			for _, row := range f.rows {
				if row[m[1]] == m[2] {
					items = append(items, row)
				}
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"items": items, "totalPages": 1})
		case r.Method == http.MethodPost && r.URL.Path == "/api/collections/instance_stats/records":
			var row map[string]any
			_ = json.NewDecoder(r.Body).Decode(&row)
			f.n++
			row["id"] = fmt.Sprintf("row%d", f.n)
			f.rows[row["id"].(string)] = row
			_ = json.NewEncoder(w).Encode(row)
		case r.Method == http.MethodPatch && strings.HasPrefix(r.URL.Path, "/api/collections/instance_stats/records/"):
			id := strings.TrimPrefix(r.URL.Path, "/api/collections/instance_stats/records/")
			var patch map[string]any
			_ = json.NewDecoder(r.Body).Decode(&patch)
			for k, v := range patch {
				f.rows[id][k] = v
			}
			_ = json.NewEncoder(w).Encode(f.rows[id])
		default:
			t.Errorf("unexpected %s %s", r.Method, r.URL.String())
			http.NotFound(w, r)
		}
	})
}

func TestInstanceStatsSink(t *testing.T) {
	f := &fakeStats{rows: map[string]map[string]any{
		// written earlier by this edge, and by another edge before "moved" came here
		"old1": {"id": "old1", "instance": "kept", "edge": "E1", "disk_bytes": 10, "disk_measured": "2026-11-13 05:00:00.000Z"},
		"old2": {"id": "old2", "instance": "moved", "edge": "E2", "disk_bytes": 99, "disk_measured": "2026-11-12 05:00:00.000Z"},
	}}
	srv := httptest.NewServer(f.handler(t))
	defer srv.Close()
	s := NewSource(Config{MothershipURL: srv.URL, AdminUser: "a@b.c", AdminPassword: "x", EdgeID: "e1"}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	s.myEdge = "E1"
	sink := s.InstanceStats()
	ctx := context.Background()

	facts, err := sink.Load(ctx)
	if err != nil || len(facts) != 1 || facts[0].Instance != "kept" || facts[0].DiskBytes != 10 || facts[0].MeasuredAt.IsZero() {
		t.Fatalf("load (this edge's rows only): %+v %v", facts, err)
	}

	now := time.Date(2026, 11, 14, 5, 0, 0, 0, time.UTC)
	err = sink.Report(ctx, []stats.Facts{
		{Instance: "kept", DiskBytes: 20, MeasuredAt: now},
		{Instance: "moved", DiskBytes: 30, MeasuredAt: now, LastActive: now},
		{Instance: "fresh", DiskBytes: 0, MeasuredAt: now},
	})
	if err != nil {
		t.Fatal(err)
	}
	// a second report updates the same rows (no duplicates)
	if err := sink.Report(ctx, []stats.Facts{{Instance: "fresh", DiskBytes: 5, MeasuredAt: now}}); err != nil {
		t.Fatal(err)
	}
	byInstance := map[string]map[string]any{}
	for _, row := range f.rows {
		if _, dup := byInstance[row["instance"].(string)]; dup {
			t.Fatalf("two rows for %s", row["instance"])
		}
		byInstance[row["instance"].(string)] = row
	}
	if len(byInstance) != 3 {
		t.Fatalf("rows: %+v", f.rows)
	}
	if r := byInstance["kept"]; r["disk_bytes"] != float64(20) || r["edge"] != "E1" {
		t.Fatalf("kept: %+v", r)
	}
	if r := byInstance["moved"]; r["id"] != "old2" || r["edge"] != "E1" || r["last_active"] != "2026-11-14 05:00:00.000Z" {
		t.Fatalf("moved here: its row is taken over: %+v", r)
	}
	if r := byInstance["fresh"]; r["disk_bytes"] != float64(5) || r["disk_measured"] != "2026-11-14 05:00:00.000Z" {
		t.Fatalf("fresh: %+v", r)
	}
}
