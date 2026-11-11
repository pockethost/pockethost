package edge

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/pocker"
)

// Any edge accepts any request (the load balancer sends visitors to the nearest edge). Each instance runs on exactly
// one edge; a request for an instance on another edge is forwarded over the private network straight to that edge,
// after this edge's firewall (peer check, rate limits, CORS). This is the Node firewall's edge routing, in Go.
//
// While the owner edge reported healthy within the last 30 s, a request it can't take right now is held and retried.
// Once it has been silent longer, or announced a clean shutdown, requests fail fast with a 503. The mirror's heartbeat
// time can lag, so before failing fast on a silent edge we ask the edge itself (cached 5 s).

const (
	// ForwardedByHeader marks a request forwarded by another edge. Such a request is never forwarded again.
	ForwardedByHeader = "X-Ph-Forwarded-By"

	edgeHealthyWindow  = 30 * time.Second
	connectTimeout     = 3 * time.Second
	staleProbeTimeout  = 2 * time.Second
	staleProbeTTL      = 5 * time.Second
	edgeUnavailableMsg = "This PocketHost instance is temporarily unavailable. Please retry shortly."
)

// Response headers showing which edge a request entered at and which edge runs the instance.
const (
	HeaderEdgeName     = "X-PocketHost-Edge-Name"
	HeaderEdgeRegion   = "X-PocketHost-Edge-Region"
	HeaderOriginName   = "X-PocketHost-Origin-Name"
	HeaderOriginRegion = "X-PocketHost-Origin-Region"
)

// PoweredBy is the X-Powered-By on every response this edge sends; forwarded responses lose the owner's (Node edges
// send "Express").
const PoweredBy = "Pocker"

// router holds the forwarding state: the transport to other edges, edges with a recent connection failure, and
// cached health probes.
type router struct {
	s         *Source
	transport *http.Transport
	retry     time.Duration
	probe     func(ctx context.Context, internalURL string, timeout time.Duration) bool
	now       func() time.Time

	mu      sync.Mutex
	suspect map[string]bool // edge record id -> a connect failed; wait for its health check before forwarding
	probes  map[string]*probeEntry
}

type probeEntry struct {
	at   time.Time
	done chan struct{}
	ok   bool
}

func newRouter(s *Source) *router {
	retry := 250 * time.Millisecond
	if v, err := strconv.Atoi(os.Getenv("PH_FIREWALL_DAEMON_GRACE_RETRY_MS")); err == nil && time.Duration(v)*time.Millisecond > retry {
		retry = time.Duration(v) * time.Millisecond
	}
	return &router{
		s: s,
		// Not http.DefaultTransport: Pocker's JS egress policy blocks private addresses there.
		transport: &http.Transport{
			// Only the connect is limited (an unreachable edge often drops packets instead of refusing); long
			// responses such as realtime streams are not.
			DialContext:         (&net.Dialer{Timeout: connectTimeout, KeepAlive: 30 * time.Second}).DialContext,
			MaxIdleConnsPerHost: 512,
			IdleConnTimeout:     90 * time.Second,
		},
		retry:   retry,
		probe:   isEdgeReachable,
		now:     time.Now,
		suspect: map[string]bool{},
		probes:  map[string]*probeEntry{},
	}
}

// isEdgeReachable asks an edge's daemon health path directly.
func isEdgeReachable(ctx context.Context, internalURL string, timeout time.Duration) bool {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(internalURL, "/")+DaemonHealthPath, nil)
	if err != nil {
		return false
	}
	res, err := probeClient.Do(req)
	if err != nil {
		return false
	}
	defer res.Body.Close()
	var body struct {
		Status string `json:"status"`
	}
	return res.StatusCode == http.StatusOK && json.NewDecoder(io.LimitReader(res.Body, 64<<10)).Decode(&body) == nil && body.Status == "ok"
}

var probeClient = &http.Client{Transport: &http.Transport{
	DialContext: (&net.Dialer{Timeout: connectTimeout}).DialContext, MaxIdleConnsPerHost: 4, IdleConnTimeout: 30 * time.Second,
}}

// edgeHealthy: online-ish (not "offline") and heard from within the healthy window.
func edgeHealthy(e edgeRec, now time.Time) bool {
	if e.Status == "offline" || e.LastSeen == "" {
		return false
	}
	seen, err := parsePBTime(e.LastSeen)
	return err == nil && now.Sub(seen) <= edgeHealthyWindow
}

func parsePBTime(v string) (time.Time, error) {
	v = strings.Replace(strings.TrimSpace(v), " ", "T", 1)
	for _, layout := range []string{"2006-01-02T15:04:05.999Z07:00", "2006-01-02T15:04:05.999Z", time.RFC3339Nano} {
		if t, err := time.Parse(layout, v); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("bad time %q", v)
}

// ownerEdgeOf resolves a Remote value ("edge:<record id>" / "edge:@<edge_id>") to the edge record.
func (s *Source) ownerEdgeOf(remote string) (edgeRec, bool) {
	ref := strings.TrimPrefix(remote, remoteEdgePrefix)
	s.mu.Lock()
	defer s.mu.Unlock()
	if strings.HasPrefix(ref, "@") {
		for _, e := range s.edges {
			if e.EdgeID == ref[1:] {
				return e, true
			}
		}
		return edgeRec{}, false
	}
	e, ok := s.edges[ref]
	return e, ok
}

// edgeByRecord returns an edge record by id.
func (s *Source) edgeByRecord(id string) (edgeRec, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.edges[id]
	return e, ok
}

// alive: healthy per the mirror, or silent in the mirror (but not shut down) and answering its own health check.
func (rt *router) alive(ctx context.Context, e edgeRec) bool {
	if edgeHealthy(e, rt.now()) {
		return true
	}
	if e.Status == "offline" || e.InternalURL == "" {
		return false
	}
	ok := rt.cachedProbe(ctx, e)
	if ok {
		rt.s.log.Debug("pockethost: edge is stale in the mirror but answers its health check", "edge", e.EdgeID)
	}
	return ok
}

// cachedProbe shares one in-flight probe per edge and reuses its result for staleProbeTTL.
func (rt *router) cachedProbe(ctx context.Context, e edgeRec) bool {
	rt.mu.Lock()
	p := rt.probes[e.ID]
	if p == nil || rt.now().Sub(p.at) >= staleProbeTTL {
		p = &probeEntry{at: rt.now(), done: make(chan struct{})}
		rt.probes[e.ID] = p
		go func(url string) {
			p.ok = rt.probe(context.Background(), url, staleProbeTimeout)
			close(p.done)
		}(e.InternalURL)
	}
	rt.mu.Unlock()
	select {
	case <-p.done:
		return p.ok
	case <-ctx.Done():
		return false
	}
}

// holdFor waits until the owner answers its health check. False once it is no longer alive or the client left.
func (rt *router) holdFor(r *http.Request, edgeID string) bool {
	logged := false
	for {
		if r.Context().Err() != nil {
			return false
		}
		e, ok := rt.s.edgeByRecord(edgeID)
		if !ok || !rt.alive(r.Context(), e) {
			return false
		}
		if rt.probe(r.Context(), e.InternalURL, rt.retry) {
			rt.mu.Lock()
			delete(rt.suspect, edgeID)
			rt.mu.Unlock()
			return true
		}
		if !logged {
			rt.s.log.Info("pockethost: edge unreachable; holding requests while it is within its healthy window", "edge", e.EdgeID)
			logged = true
		}
		select {
		case <-r.Context().Done():
			return false
		case <-time.After(rt.retry):
		}
	}
}

func edgeUnavailable(w http.ResponseWriter) {
	w.Header().Set("Retry-After", "10")
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusServiceUnavailable)
	_, _ = io.WriteString(w, edgeUnavailableMsg)
}

// isUnreachable: the connection to the other edge failed (refused, reset, timed out) before a response.
func isUnreachable(err error) bool {
	var ne net.Error
	if errors.Is(err, syscall.ECONNREFUSED) || errors.Is(err, syscall.ECONNRESET) || errors.Is(err, syscall.EPIPE) ||
		errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF) || (errors.As(err, &ne) && ne.Timeout()) {
		return true
	}
	var op *net.OpError
	return errors.As(err, &op) && op.Op == "dial"
}

var idempotent = map[string]bool{http.MethodGet: true, http.MethodHead: true, http.MethodOptions: true}

// Forward serves a request for an instance another edge runs (pocker.Server.Forward).
func (s *Source) Forward(w http.ResponseWriter, r *http.Request, inst pocker.Instance) {
	rt := s.routerOnce()
	host := normalizeRequestHost(r.Host)
	if r.Header.Get(ForwardedByHeader) != "" {
		// the forwarding edge's mirror says it's ours, ours says it isn't: answer like the Node daemon, don't bounce
		http.Error(w, host+" is served by another PocketHost edge", http.StatusMisdirectedRequest)
		return
	}
	owner, ok := s.ownerEdgeOf(inst.Remote)
	if !ok || owner.InternalURL == "" || !rt.alive(r.Context(), owner) {
		s.log.Debug("pockethost: owner edge unavailable", "host", host, "remote", inst.Remote, "known", ok)
		edgeUnavailable(w)
		return
	}

	policy := corsPolicy(inst.Access.CORSOrigins, r)
	if policy != nil {
		policy.apply(w.Header())
		if r.Method == http.MethodOptions {
			policy.preflight(w.Header(), r)
			w.WriteHeader(http.StatusNoContent)
			return
		}
	}

	rt.mu.Lock()
	suspect := rt.suspect[owner.ID]
	rt.mu.Unlock()
	if suspect && !rt.holdFor(r, owner.ID) {
		edgeUnavailable(w)
		return
	}

	for {
		e, _ := s.edgeByRecord(owner.ID)
		if e.InternalURL == "" {
			e = owner
		}
		target, err := url.Parse(strings.TrimRight(e.InternalURL, "/"))
		if err != nil || target.Host == "" {
			s.log.Warn("pockethost: bad internal_url", "edge", e.EdgeID, "url", e.InternalURL)
			edgeUnavailable(w)
			return
		}
		var failed error
		proxy := &httputil.ReverseProxy{
			Rewrite: func(pr *httputil.ProxyRequest) {
				pr.SetURL(target)
				pr.Out.Host = host // the owner routes by Host (bare hostname: no port, no trailing dot)
				pr.SetXForwarded()
				pr.Out.Header.Set(ForwardedByHeader, s.cfg.EdgeID)
			},
			Transport: rt.transport,
			ModifyResponse: func(res *http.Response) error {
				res.Header.Del("X-Powered-By") // Front already set ours; the proxy would add the owner's next to it
				if policy != nil {
					policy.rewriteUpstream(res.Header)
				}
				return nil
			},
			ErrorHandler: func(_ http.ResponseWriter, _ *http.Request, err error) { failed = err },
		}
		proxy.ServeHTTP(w, r)
		if failed == nil {
			return
		}
		if r.Context().Err() != nil {
			return // client went away
		}
		if !isUnreachable(failed) {
			s.log.Warn("pockethost: edge proxy error", "edge", e.EdgeID, "host", host, "error", failed)
			http.Error(w, "Bad gateway", http.StatusBadGateway)
			return
		}
		rt.mu.Lock()
		rt.suspect[owner.ID] = true
		rt.mu.Unlock()
		// a request with a body may already be partly sent; only replay ones without
		if !idempotent[r.Method] || !rt.holdFor(r, owner.ID) {
			edgeUnavailable(w)
			return
		}
	}
}

func (s *Source) routerOnce() *router {
	s.routeInit.Do(func() { s.rt = newRouter(s) })
	return s.rt
}

func normalizeRequestHost(h string) string {
	h = strings.ToLower(strings.TrimSpace(h))
	if host, _, err := net.SplitHostPort(h); err == nil {
		h = host
	}
	return strings.TrimSuffix(h, ".")
}

// IsRemote reports whether another edge runs the instance host names (unknown hosts are local).
func (s *Source) IsRemote(host string) bool {
	host = normalizeRequestHost(host)
	s.mu.Lock()
	defer s.mu.Unlock()
	id, ok := s.claims[host]
	if !ok {
		return false
	}
	inst, ok := s.instances[id]
	return ok && !isMine(inst, s.myEdge, s.cfg.EdgeID)
}

// edgeLabels: this edge, and the edge that runs host's instance (this edge for local or unknown hosts; ok=false when
// the owner is unknown).
func (s *Source) edgeLabels(host string) (me, origin [2]string, ok bool) {
	me = [2]string{s.cfg.EdgeID, s.cfg.Region}
	host = normalizeRequestHost(host)
	s.mu.Lock()
	defer s.mu.Unlock()
	id, found := s.claims[host]
	inst, known := s.instances[id]
	if !found || !known || isMine(inst, s.myEdge, s.cfg.EdgeID) {
		return me, me, true
	}
	ref := ownerEdge(inst)
	if strings.HasPrefix(ref, "@") {
		for _, e := range s.edges {
			if e.EdgeID == ref[1:] {
				return me, [2]string{e.EdgeID, e.Region}, true
			}
		}
		return me, origin, false
	}
	if e, ok := s.edges[ref]; ok {
		return me, [2]string{e.EdgeID, e.Region}, true
	}
	return me, origin, false
}

// FirewallHealthPath is what the load balancer monitor checks (the Node firewall's health route).
const FirewallHealthPath = "/api/firewall/health"

// Front is the edge's outer middleware (the Node firewall's job, in front of the instances): the load balancer
// health route, the peer allowlist, and the edge routing headers. Instance routing, rate limits and forwarding
// happen in Pocker's Manager behind it.
func (s *Source) Front(fw func() *pocker.Firewall, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Powered-By", PoweredBy)
		if r.URL.Path == FirewallHealthPath {
			openCORSHeaders(w, r)
			w.Header().Set("Content-Type", "application/json")
			_, _ = io.WriteString(w, `{"status":"firewall ok","code":200}`)
			return
		}
		if f := fw(); f != nil && !f.AllowPeer(r) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		if r.URL.Path != DaemonHealthPath && r.URL.Path != pocker.HealthPath && r.Header.Get(ForwardedByHeader) == "" {
			me, origin, ok := s.edgeLabels(r.Host)
			h := w.Header()
			h.Set(HeaderEdgeName, me[0])
			h.Set(HeaderEdgeRegion, me[1])
			if ok {
				h.Set(HeaderOriginName, origin[0])
				h.Set(HeaderOriginRegion, origin[1])
			}
		}
		next.ServeHTTP(w, r)
	})
}

func openCORSHeaders(w http.ResponseWriter, r *http.Request) {
	h := w.Header()
	h.Set("Access-Control-Allow-Origin", "*")
	h.Set("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS")
	if v := r.Header.Get("Access-Control-Request-Headers"); v != "" {
		h.Set("Access-Control-Allow-Headers", v)
	}
}

// cors is an instance's CORS policy for a forwarded request (the Node firewall's PH_CORS_ORIGINS handling): this
// edge answers preflights and its Access-Control-Allow-Origin is the only one the browser sees.
type cors struct {
	allowOrigin string
}

// corsPolicy returns nil when the instance has no origin list (the owner's own CORS answers).
func corsPolicy(origins []string, r *http.Request) *cors {
	if len(origins) == 0 {
		return nil
	}
	return &cors{allowOrigin: resolveAllowOrigin(origins, r.Header.Get("Origin"))}
}

func (c *cors) apply(h http.Header) {
	appendVary(h, "Origin")
	if c.allowOrigin != "" {
		h.Set("Access-Control-Allow-Origin", c.allowOrigin)
	}
}

func (c *cors) preflight(h http.Header, r *http.Request) {
	if c.allowOrigin == "" {
		return
	}
	appendVary(h, "Access-Control-Request-Method")
	appendVary(h, "Access-Control-Request-Headers")
	h.Set("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE")
	if v := r.Header.Get("Access-Control-Request-Headers"); v != "" {
		h.Set("Access-Control-Allow-Headers", v)
	}
}

// rewriteUpstream drops the owner's Access-Control-Allow-* headers (ours are already set) and keeps Origin in Vary.
func (c *cors) rewriteUpstream(h http.Header) {
	for k := range h {
		if strings.HasPrefix(strings.ToLower(k), "access-control-allow-") {
			h.Del(k)
		}
	}
	if v := h.Get("Vary"); v != "" {
		hasOrigin := false
		for _, p := range strings.Split(v, ",") {
			p = strings.TrimSpace(p)
			if strings.EqualFold(p, "origin") || p == "*" {
				hasOrigin = true
			}
		}
		if !hasOrigin {
			h.Set("Vary", v+", Origin")
		}
	}
}

func appendVary(h http.Header, v string) {
	var parts []string
	seen := map[string]bool{}
	for _, p := range strings.Split(strings.Join(h.Values("Vary"), ","), ",") {
		if p = strings.TrimSpace(p); p != "" && !seen[p] {
			seen[p] = true
			parts = append(parts, p)
		}
	}
	if !seen[v] {
		parts = append(parts, v)
	}
	h.Set("Vary", strings.Join(parts, ", "))
}

// resolveAllowOrigin mirrors PocketBase's origin matching: first match in list order wins; "*" allows any origin and
// is echoed as "*"; an exact match is echoed; "*"/"?" inside an entry are wildcards and echo the request origin.
func resolveAllowOrigin(origins []string, origin string) string {
	if origin == "" {
		return ""
	}
	for _, o := range origins {
		if o == "*" {
			return "*"
		}
		if o == origin {
			return origin
		}
	}
	if len(origin) <= 253+3+5 && strings.Contains(origin, "://") {
		for _, o := range origins {
			if strings.ContainsAny(o, "*?") && wildcardRE(o).MatchString(origin) {
				return origin
			}
		}
	}
	return ""
}

func wildcardRE(pattern string) *regexp.Regexp {
	q := regexp.QuoteMeta(pattern)
	q = strings.ReplaceAll(q, `\*`, ".*")
	q = strings.ReplaceAll(q, `\?`, ".")
	return regexp.MustCompile("^" + q + "$")
}
