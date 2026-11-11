package edge

import (
	"context"
	"net"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/pockethost/pocketbase/ext/pocker"
)

// InstanceEvent implements pocker.EventSink: instance status goes back to the mothership, like the Node edge did.
func (s *Source) InstanceEvent(e pocker.Event) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		var err error
		switch e.Kind {
		case pocker.EventStarted:
			err = s.c.do(ctx, http.MethodPost, "/api/mirror",
				map[string]any{"instances": []map[string]string{{"id": e.InstanceID, "status": "running"}}, "dump": false}, nil)
		case pocker.EventFailed:
			err = s.c.do(ctx, http.MethodPatch, "/api/collections/instances/records/"+e.InstanceID, map[string]string{"status": "failed"}, nil)
		default:
			return
		}
		if err != nil {
			s.log.Warn("pockethost: status report failed", "id", e.InstanceID, "kind", e.Kind, "error", err)
		}
	}()
}

// Stats counts requests for the edge heartbeat, in the shape the mothership's edge view expects.
type Stats struct {
	mu        sync.Mutex
	requests  int
	errors    int
	hosts     map[string]int
	ips       map[string]int
	countries map[string]int
}

// NewStats returns empty stats.
func NewStats() *Stats { s := &Stats{}; s.reset(); return s }

func (s *Stats) reset() {
	s.requests, s.errors = 0, 0
	s.hosts, s.ips, s.countries = map[string]int{}, map[string]int{}, map[string]int{}
}

type statusRecorder struct {
	http.ResponseWriter
	code int
}

func (r *statusRecorder) WriteHeader(code int) { r.code = code; r.ResponseWriter.WriteHeader(code) }
func (r *statusRecorder) Flush() {
	if f, ok := r.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}
func (r *statusRecorder) Unwrap() http.ResponseWriter { return r.ResponseWriter }

// Middleware counts every request (pocker.Server.Wrap).
func (s *Stats) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rec := &statusRecorder{ResponseWriter: w, code: http.StatusOK}
		next.ServeHTTP(rec, r)
		ip := r.Header.Get("CF-Connecting-IP")
		if ip == "" {
			ip, _, _ = net.SplitHostPort(r.RemoteAddr)
		}
		host := strings.ToLower(r.Host)
		if h, _, err := net.SplitHostPort(host); err == nil {
			host = h
		}
		s.mu.Lock()
		s.requests++
		if rec.code >= 500 {
			s.errors++
		}
		s.hosts[host]++
		s.ips[ip]++
		if c := r.Header.Get("CF-IPCountry"); c != "" {
			s.countries[c]++
		}
		s.mu.Unlock()
	})
}

func top(m map[string]int, n int) [][2]any {
	type kv struct {
		k string
		v int
	}
	var list []kv
	for k, v := range m {
		list = append(list, kv{k, v})
	}
	sort.Slice(list, func(i, j int) bool { return list[i].v > list[j].v || list[i].v == list[j].v && list[i].k < list[j].k })
	if len(list) > n {
		list = list[:n]
	}
	out := make([][2]any, len(list))
	for i, e := range list {
		out[i] = [2]any{e.k, e.v}
	}
	return out
}

// flush returns the window's snapshot and starts a new window.
func (s *Stats) flush() map[string]any {
	s.mu.Lock()
	defer s.mu.Unlock()
	snap := map[string]any{"requests": s.requests, "errors": s.errors,
		"hosts": top(s.hosts, 10), "ips": top(s.ips, 10), "countries": top(s.countries, 10)}
	s.reset()
	return snap
}

// Heartbeat registers this edge with the mothership and keeps it marked online (every HeartbeatInterval). The first
// beat is sent before it returns, so the edge record exists before the mirror is loaded.
func (s *Source) Heartbeat(ctx context.Context, stats *Stats) {
	beat := func() {
		body := map[string]any{"edge_id": s.cfg.EdgeID, "label": s.cfg.EdgeID, "region": s.cfg.Region,
			"internal_url": s.cfg.InternalURL, "status": "online", "stats": stats.flush()}
		c, cancel := context.WithTimeout(ctx, 10*time.Second)
		defer cancel()
		if err := s.c.do(c, http.MethodPost, "/api/edge/heartbeat", body, nil); err != nil {
			s.log.Warn("pockethost: heartbeat failed", "error", err)
		}
	}
	beat()
	go func() {
		t := time.NewTicker(s.cfg.HeartbeatInterval)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				beat()
			}
		}
	}()
}
