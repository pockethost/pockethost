package edge

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/tools/cron"
)

// Scheduled webhooks (the Node edge's CronService): each instance on this edge may list {endpoint, value} webhooks in
// its mothership record; at each cron time (UTC, minute resolution) the edge GETs the endpoint on the instance,
// in-process (no Cloudflare, no 100 s cut-off), with the instance's backup token, so one pointed at /api/ph/backup
// schedules backups. The result is stored in the webhook's lastFired. A webhook that missed a run while the edge was
// down fires once at start.

const (
	webhookTimeout     = 30 * time.Minute
	webhookConcurrency = 50
	webhookBodyLimit   = 64 << 10
	webhookCatchUpMax  = 7 * 24 * time.Hour
	backupTokenHeader  = "x-ph-backup-token"
)

// webhook is one entry of an instance's webhooks field.
type webhook struct {
	Endpoint  string `json:"endpoint"`
	Value     string `json:"value"`
	LastFired *struct {
		Timestamp int64 `json:"timestamp"`
	} `json:"lastFired,omitempty"`
}

// WebhooksDisabled matches the Node edge: PH_DISABLE_INSTANCE_WEBHOOKS turns them off, PH_ENABLE_INSTANCE_WEBHOOKS wins.
func WebhooksDisabled() bool {
	if b, err := strconv.ParseBool(os.Getenv("PH_ENABLE_INSTANCE_WEBHOOKS")); err == nil && b {
		return false
	}
	b, _ := strconv.ParseBool(os.Getenv("PH_DISABLE_INSTANCE_WEBHOOKS"))
	return b
}

// parseCron accepts PocketBase's 5-field expressions and macros; a 6-field expression (seconds first, as the Node
// cron package allowed) runs at minute resolution.
func parseCron(expr string) (*cron.Schedule, error) {
	f := strings.Fields(expr)
	if len(f) == 6 {
		f = f[1:]
	}
	return cron.NewSchedule(strings.Join(f, " "))
}

// catchUpDue: the first due minute after lastFired has passed. Never-fired webhooks are left alone.
func catchUpDue(s *cron.Schedule, lastFired, now time.Time) bool {
	if lastFired.IsZero() {
		return false
	}
	start := lastFired.UTC().Truncate(time.Minute).Add(time.Minute)
	if now.Sub(start) > webhookCatchUpMax {
		start = now.Add(-webhookCatchUpMax).Truncate(time.Minute)
	}
	for t := start; !t.After(now); t = t.Add(time.Minute) {
		if s.IsDue(cron.NewMoment(t)) {
			return true
		}
	}
	return false
}

// Scheduler fires instance webhooks through the Manager.
type Scheduler struct {
	s       *Source
	manager func() Instances
	now     func() time.Time
	sem     chan struct{}

	mu      sync.Mutex
	parsed  map[string]*cron.Schedule // expression -> schedule (nil = invalid)
	running map[string]bool           // instance id + endpoint + value: a call in flight
	wg      sync.WaitGroup
}

// NewScheduler creates the webhook scheduler; manager returns the running Manager (nil until started).
func (s *Source) NewScheduler(manager func() Instances) *Scheduler {
	return &Scheduler{s: s, manager: manager, now: time.Now, sem: make(chan struct{}, webhookConcurrency),
		parsed: map[string]*cron.Schedule{}, running: map[string]bool{}}
}

// Run fires due webhooks each minute until ctx is done, after a catch-up pass once the mirror has loaded.
func (sc *Scheduler) Run(ctx context.Context) {
	for !sc.ready() {
		select {
		case <-ctx.Done():
			return
		case <-time.After(time.Second):
		}
	}
	sc.tick(ctx, sc.now(), true)
	for {
		now := sc.now()
		next := now.Truncate(time.Minute).Add(time.Minute)
		select {
		case <-ctx.Done():
			sc.wg.Wait()
			return
		case <-time.After(next.Sub(now)):
			sc.tick(ctx, next, false)
		}
	}
}

func (sc *Scheduler) ready() bool {
	m := sc.manager()
	if m == nil || !m.Ready() {
		return false // a catch-up call now would only get "starting"
	}
	sc.s.mu.Lock()
	defer sc.s.mu.Unlock()
	return len(sc.s.instances) > 0 && sc.s.myEdge != ""
}

func (sc *Scheduler) schedule(expr string) *cron.Schedule {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	if s, ok := sc.parsed[expr]; ok {
		return s
	}
	s, err := parseCron(expr)
	if err != nil {
		s = nil
	}
	sc.parsed[expr] = s
	return s
}

type dueWebhook struct {
	instanceID, host string
	hook             webhook
	catchUp          bool
}

// due lists this edge's webhooks due at the minute of t (catchUp: those that missed a run instead).
func (sc *Scheduler) due(t time.Time, catchUp bool) []dueWebhook {
	var out []dueWebhook
	moment := cron.NewMoment(t.UTC())
	sc.s.mu.Lock()
	defer sc.s.mu.Unlock()
	for id, inst := range sc.s.instances {
		if len(inst.Webhooks) == 0 || string(inst.Webhooks) == "null" || !isMine(inst, sc.s.myEdge, sc.s.cfg.EdgeID) {
			continue
		}
		var hooks []webhook
		if json.Unmarshal(inst.Webhooks, &hooks) != nil {
			continue
		}
		host := ""
		for _, h := range hosts(inst, sc.s.cfg.ApexDomain) {
			if sc.s.claims[h] == id {
				host = h
				break
			}
		}
		if host == "" {
			continue
		}
		for _, h := range hooks {
			if strings.TrimSpace(h.Value) == "" || strings.TrimSpace(h.Endpoint) == "" {
				continue
			}
			s := sc.schedule(h.Value)
			if s == nil {
				continue
			}
			if catchUp {
				if h.LastFired == nil || !catchUpDue(s, time.UnixMilli(h.LastFired.Timestamp), t) {
					continue
				}
			} else if !s.IsDue(moment) {
				continue
			}
			out = append(out, dueWebhook{instanceID: id, host: host, hook: h, catchUp: catchUp})
		}
	}
	return out
}

func (sc *Scheduler) tick(ctx context.Context, t time.Time, catchUp bool) {
	for _, d := range sc.due(t, catchUp) {
		key := d.instanceID + "\x00" + d.hook.Endpoint + "\x00" + d.hook.Value
		sc.mu.Lock()
		busy := sc.running[key]
		if !busy {
			sc.running[key] = true
		}
		sc.mu.Unlock()
		if busy {
			continue // the previous run is still going (calls may take up to 30 minutes)
		}
		if catchUp {
			sc.s.log.Info("pockethost: catching up missed webhook", "instance", d.instanceID, "endpoint", logPath(d.hook.Endpoint), "cron", d.hook.Value)
		}
		sc.wg.Add(1)
		go func(d dueWebhook) {
			defer sc.wg.Done()
			defer func() {
				sc.mu.Lock()
				delete(sc.running, key)
				sc.mu.Unlock()
			}()
			select {
			case sc.sem <- struct{}{}:
			case <-ctx.Done():
				return
			}
			defer func() { <-sc.sem }()
			sc.fire(ctx, d)
		}(d)
	}
}

// webhookPath normalizes an endpoint to "/a/b?q" like the Node edge.
func webhookPath(endpoint string) string {
	var parts []string
	for _, p := range strings.Split(endpoint, "/") {
		if p != "" {
			parts = append(parts, p)
		}
	}
	return "/" + strings.Join(parts, "/")
}

// logPath: query strings can carry secrets, so logs show the path only.
func logPath(endpoint string) string {
	p, _, _ := strings.Cut(webhookPath(endpoint), "?")
	return p
}

// capture is a ResponseWriter that keeps the status and the start of the body.
type capture struct {
	h      http.Header
	status int
	body   bytes.Buffer
}

func (c *capture) Header() http.Header { return c.h }
func (c *capture) WriteHeader(code int) {
	if c.status == 0 {
		c.status = code
	}
}
func (c *capture) Write(b []byte) (int, error) {
	if c.status == 0 {
		c.status = http.StatusOK
	}
	if room := webhookBodyLimit - c.body.Len(); room > 0 {
		c.body.Write(b[:min(len(b), room)])
	}
	return len(b), nil
}
func (c *capture) Flush() {}

// call runs one GET through the Manager, as if from the edge itself (127.0.0.1).
func (sc *Scheduler) call(ctx context.Context, d dueWebhook) (int, string, error) {
	m := sc.manager()
	if m == nil {
		return 0, "", fmt.Errorf("edge not ready")
	}
	ctx, cancel := context.WithTimeout(ctx, webhookTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://"+d.host+webhookPath(d.hook.Endpoint), http.NoBody)
	if err != nil {
		return 0, "", err
	}
	req.Host = d.host
	req.RemoteAddr = "127.0.0.1:0"
	req.Header.Set("X-Forwarded-Proto", "https")
	if tok := backupToken(sc.s.cfg.BackupTokenSecret, d.instanceID); tok != "" {
		req.Header.Set(backupTokenHeader, tok)
	}
	w := &capture{h: http.Header{}}
	m.ServeHTTP(w, req)
	if ctx.Err() == context.DeadlineExceeded {
		return 0, "", fmt.Errorf("timed out after %ds", int(webhookTimeout/time.Second))
	}
	if w.status == 0 {
		w.status = http.StatusOK
	}
	return w.status, w.body.String(), nil
}

func (sc *Scheduler) fire(ctx context.Context, d dueWebhook) {
	status, body, err := sc.call(ctx, d)
	if ctx.Err() != nil && err == nil && status == 0 {
		return
	}
	m := sc.manager()
	if err != nil {
		sc.s.log.Warn("pockethost: webhook failed", "instance", d.instanceID, "endpoint", logPath(d.hook.Endpoint), "error", err)
		if m != nil {
			m.LogInstance(d.instanceID, "stderr", fmt.Sprintf("Webhook %s failed: %s", d.hook.Endpoint, err))
		}
		status, body = 500, err.Error()
	} else if status < 200 || status >= 300 {
		if m != nil {
			m.LogInstance(d.instanceID, "stderr", fmt.Sprintf("Webhook %s returned HTTP %d: %s", d.hook.Endpoint, status, body))
		}
	}
	if err := sc.recordLastFired(ctx, d, status, body); err != nil {
		sc.s.log.Warn("pockethost: could not save webhook result", "instance", d.instanceID, "error", err)
	}
}

// recordLastFired stores {timestamp, response} on the matching webhook of the instance's current record.
func (sc *Scheduler) recordLastFired(ctx context.Context, d dueWebhook, status int, body string) error {
	sc.s.mu.Lock()
	raw := sc.s.instances[d.instanceID].Webhooks
	sc.s.mu.Unlock()
	var hooks []map[string]any
	if json.Unmarshal(raw, &hooks) != nil {
		return fmt.Errorf("webhooks changed")
	}
	found := false
	for _, h := range hooks {
		if h["endpoint"] == d.hook.Endpoint && h["value"] == d.hook.Value {
			h["lastFired"] = map[string]any{"timestamp": sc.now().UnixMilli(), "response": map[string]any{"status": status, "body": body}}
			found = true
		}
	}
	if !found {
		return nil // removed meanwhile
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 15*time.Second)
	defer cancel()
	return sc.s.c.do(ctx, http.MethodPatch, "/api/collections/instances/records/"+d.instanceID, map[string]any{"webhooks": hooks}, nil)
}
