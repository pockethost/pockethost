package edge

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	firewall "pocketone.dev/ext/firewall"

	ceedge "pocketone.dev/ext/edge"

	"pocketone.dev/ext/pocker"
)

// Any edge accepts any request (the load balancer sends visitors to the nearest edge). Each instance runs on exactly
// one edge; a request for an instance on another edge is forwarded over the private network straight to that edge,
// after this edge's firewall (peer check, rate limits, CORS). The forwarding itself is PocketOne's ext/edge;
// this edge's mirror is its EdgeSource (see [Source.Resolve]), configured the PocketHost way by [RouteConfig].

const (
	// ForwardedByHeader marks a request forwarded by another edge. Such a request is never forwarded again.
	ForwardedByHeader = "X-Ph-Forwarded-By"

	edgeUnavailableMsg = "This PocketHost instance is temporarily unavailable. Please retry shortly."
)

// Response headers showing which edge a request entered at and which edge runs the instance.
const (
	HeaderEdgeName     = "X-PocketHost-Edge-Name"
	HeaderEdgeRegion   = "X-PocketHost-Edge-Region"
	HeaderOriginName   = "X-PocketHost-Origin-Name"
	HeaderOriginRegion = "X-PocketHost-Origin-Region"
)

// PoweredBy is the X-Powered-By on responses a Pocker edge fulfills (Node edges send "PocketHost"). An edge on another
// runtime sets none: the instance's own server names itself (the PocketOne binary says "PocketOne", upstream
// PocketBase says nothing). A forwarded response keeps the owner's value (or none), so the header names who fulfilled
// the request, not the edge it entered at. It carries the PocketOne version Pocker runs ("Pocker 0.0.2").
var PoweredBy = "Pocker " + pocker.Version()

func parsePBTime(v string) (time.Time, error) {
	v = strings.Replace(strings.TrimSpace(v), " ", "T", 1)
	for _, layout := range []string{"2006-01-02T15:04:05.999Z07:00", "2006-01-02T15:04:05.999Z", time.RFC3339Nano} {
		if t, err := time.Parse(layout, v); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("bad time %q", v)
}

// RouteConfig is ext/edge configured like the Node firewall: PocketHost's forwarded-by header, the daemon health
// path other edges probe, and PocketHost's 503 message. Edges is left for the caller.
func RouteConfig(log *slog.Logger) ceedge.RouterConfig {
	retry := 250 * time.Millisecond
	return ceedge.RouterConfig{
		ForwardedByHeader:  ForwardedByHeader,
		HealthPath:         DaemonHealthPath,
		HealthyWindow:      30 * time.Second,
		Retry:              retry,
		UnavailableMessage: edgeUnavailableMsg,
		MisdirectedSuffix:  "is served by another PocketHost edge",
		Logger:             log,
	}
}

var _ ceedge.EdgeSource = (*Source)(nil)

// Self implements ext/edge's EdgeSource: this edge's id.
func (s *Source) Self() string { return s.cfg.EdgeID }

// Resolve implements ext/edge's EdgeSource: a Remote value ("edge:<record id>" / "edge:@<edge_id>") to the edge,
// from the edges the mothership's stream sent.
func (s *Source) Resolve(remote string) (ceedge.Edge, bool) { return s.fleet.Resolve(remote) }

// Edges implements ext/edge's EdgeSource: every edge the mothership's stream sent.
func (s *Source) Edges() []ceedge.Edge { return s.fleet.Edges() }

// Forward serves a request for an instance another edge runs, with this edge's mirror as the only edge source
// (pocker.Server.Forward; `pockethost edge serve` passes Edges instead, so YAML edges can sit next to the mirror).
func (s *Source) Forward(w http.ResponseWriter, r *http.Request, inst pocker.Instance) {
	s.routeInit.Do(func() {
		cfg := RouteConfig(s.log)
		cfg.Edges = s
		s.rt = ceedge.NewRouter(cfg)
	})
	s.rt.Forward(w, r, inst)
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
	inst, ok := s.lookup(context.Background(), host)
	return ok && inst.Remote != ""
}

// edgeLabels: this edge, and the edge that runs host's instance (this edge for local instances; ok=false when no
// instance has that host or its owner edge is unknown, so no origin headers are sent).
func (s *Source) edgeLabels(ctx context.Context, host string) (me, origin [2]string, ok bool) {
	me = [2]string{s.cfg.EdgeID, s.cfg.Region}
	inst, found := s.lookup(ctx, host)
	if !found {
		return me, origin, false
	}
	if inst.Remote == "" {
		return me, me, true
	}
	if e, ok := s.fleet.Resolve(inst.Remote); ok {
		return me, [2]string{e.ID, e.Region}, true
	}
	return me, origin, false
}

// edgeTimingEntries is this edge's part of Server-Timing, after the entries from inside it (Pocker's origin and
// wake, or the owner edge's whole list when forwarded), matching the Node edge:
//   - fwd   (forwarded to the owner edge) time waiting on it, desc "me>owner"
//   - edge  (served here) this edge's total, desc = edge name
//   - entry (the request came from Cloudflare, not another edge) this edge's total, desc = edge name
func edgeTimingEntries(me string, forwarded bool, mark *ceedge.Mark, elapsed time.Duration, now time.Time) []pocker.TimingEntry {
	var out []pocker.TimingEntry
	if mark != nil && mark.To != "" {
		out = append(out, pocker.TimingEntry{Name: "fwd", Dur: now.Sub(mark.Start), Desc: me + ">" + mark.To})
	} else {
		out = append(out, pocker.TimingEntry{Name: "edge", Dur: elapsed, Desc: me})
	}
	if !forwarded {
		out = append(out, pocker.TimingEntry{Name: "entry", Dur: elapsed, Desc: me})
	}
	return out
}

// FirewallHealthPath is what the load balancer monitor checks (the Node firewall's health route).
const FirewallHealthPath = "/api/firewall/health"

// Front is the edge's outer middleware (the Node firewall's job, in front of the instances): the load balancer
// health route, the peer allowlist, and the edge routing headers. Instance routing, rate limits and forwarding
// happen in Pocker's Manager behind it. ready reports whether the Manager has loaded the instance list; until it
// does, the health route answers 503 so the load balancer keeps traffic away (nil means always ready). poweredBy is
// the X-Powered-By this edge sets (PoweredBy for Pocker, "" when the instances' own servers name themselves).
func (s *Source) Front(fw *firewall.Firewall, ready func() bool, poweredBy string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		forwarded := r.Header.Get(ForwardedByHeader) != ""
		ctx, mark := ceedge.WithMark(r.Context())
		r = r.WithContext(ctx)
		pocker.Timing(r.Context(), func() []pocker.TimingEntry { // reported by the servertiming extension
			return edgeTimingEntries(s.cfg.EdgeID, forwarded, mark, time.Since(start), time.Now())
		})
		if poweredBy != "" {
			w.Header().Set("X-Powered-By", poweredBy)
		}
		if r.URL.Path == FirewallHealthPath {
			ceedge.OpenCORSHeaders(w, r)
			w.Header().Set("Content-Type", "application/json")
			if ready != nil && !ready() {
				w.WriteHeader(http.StatusServiceUnavailable)
				_, _ = io.WriteString(w, `{"status":"starting","code":503}`)
				return
			}
			_, _ = io.WriteString(w, `{"status":"firewall ok","code":200}`)
			return
		}
		if fw != nil && !fw.AllowPeer(r) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		if r.URL.Path != DaemonHealthPath && r.URL.Path != pocker.HealthPath && r.Header.Get(ForwardedByHeader) == "" {
			me, origin, ok := s.edgeLabels(r.Context(), r.Host)
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
