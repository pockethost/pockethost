package edge

import (
	"context"
	"net"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	statusv1 "pocketone.dev/ext/contracts/instance/status/v1"
	"pocketone.dev/ext/multisite"
)

// StatusResync is how often the edge sends the mothership every instance it runs again, so a mothership that
// restarted (and reset every instance to idle) shows them within a minute.
const StatusResync = time.Minute

// Statuses reports instance status to the mothership from the host's supervisor (instance.status/v1): starting and
// running go to POST /api/mirror, idle and failed to the instance record. Register it on the host (it's a
// multisite.Extension); changes are sent in order, one at a time, and every StatusResync the full picture again.
func (s *Source) Statuses() multisite.Extension { return &statusReporter{s: s, resync: StatusResync} }

type statusReporter struct {
	s      *Source
	resync time.Duration
}

func (r *statusReporter) Name() string { return "pockethost-status" }

func (r *statusReporter) RegisterHost(h *multisite.Host) error {
	st := h.Statuses()
	changes := make(chan statusv1.Status, 1024)
	full := make(chan struct{}, 1)
	cancel := st.Subscribe(func(x statusv1.Status) {
		select {
		case changes <- x:
		default: // a backlog (the mothership is down): the next full resync sends what's true then
			select {
			case full <- struct{}{}:
			default:
			}
		}
	})
	h.Background = append(h.Background, func(ctx context.Context) {
		defer cancel()
		r.correctStale(ctx, st)
		t := time.NewTicker(r.resync)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case x := <-changes:
				r.send(ctx, x)
			case <-full:
				r.sendAll(ctx, st.Current())
			case <-t.C:
				r.sendAll(ctx, st.Current())
			}
		}
	})
	return nil
}

// correctStale runs once at startup: instances the mothership shows starting or running on this edge that this edge
// isn't running are set idle. A Pocker edge's instances stop when it restarts, and a container that stopped while a
// Docker edge was down isn't adopted, and nothing else would tell the mothership.
func (r *statusReporter) correctStale(ctx context.Context, st statusv1.Statuses) {
	var marked []localRec
	for i := 0; ; i++ { // this edge's record id is known once the mirror has loaded
		var err error
		if marked, err = r.s.localInstances(ctx, `status = "running" || status = "starting"`, "id"); err == nil {
			break
		}
		if i == 60 {
			r.s.log.Warn("pockethost: stale status check skipped", "error", err)
			return
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(time.Second):
		}
	}
	live := map[string]bool{}
	for _, x := range st.Current() { // read after the list: an instance started meanwhile isn't corrected
		live[x.InstanceID] = true
	}
	n := 0
	for _, rec := range marked {
		if !live[rec.ID] {
			r.send(ctx, statusv1.Status{InstanceID: rec.ID, State: statusv1.Idle})
			n++
		}
	}
	r.s.log.Info("pockethost: stale statuses corrected", "marked", len(marked), "idle", n)
}

func (r *statusReporter) send(ctx context.Context, x statusv1.Status) {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	var err error
	switch x.State {
	case statusv1.Starting, statusv1.Running:
		err = r.s.c.do(ctx, http.MethodPost, "/api/mirror",
			map[string]any{"instances": []map[string]string{{"id": x.InstanceID, "status": string(x.State)}}, "dump": false}, nil)
	case statusv1.Idle, statusv1.Failed: // /api/mirror only takes starting/running
		err = r.s.c.do(ctx, http.MethodPatch, "/api/collections/instances/records/"+x.InstanceID, map[string]string{"status": string(x.State)}, nil)
	default:
		return
	}
	if err != nil {
		r.s.log.Warn("pockethost: status report failed", "id", x.InstanceID, "state", x.State, "error", err)
	}
}

// sendAll sends every starting and running instance in one call (idle and failed ones are already on their records).
func (r *statusReporter) sendAll(ctx context.Context, all []statusv1.Status) {
	var list []map[string]string
	for _, x := range all {
		if x.State == statusv1.Starting || x.State == statusv1.Running {
			list = append(list, map[string]string{"id": x.InstanceID, "status": string(x.State)})
		}
	}
	if len(list) == 0 {
		return
	}
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	if err := r.s.c.do(ctx, http.MethodPost, "/api/mirror", map[string]any{"instances": list, "dump": false}, nil); err != nil {
		r.s.log.Warn("pockethost: status resync failed", "instances", len(list), "error", err)
	}
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
