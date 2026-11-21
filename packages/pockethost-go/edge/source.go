package edge

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	lookupv1 "pocketone.dev/ext/contracts/instance/lookup/v1"
	ceedge "pocketone.dev/ext/edge"
	mclient "pocketone.dev/ext/mothership/client"
	"pocketone.dev/ext/pocker"
)

// Source is the edge's link to PocketHost's mothership. Instances come from PocketOne's lazy mirror
// (ext/mothership/client): each hostname is asked for the first time a request names it, then followed on one
// stream; the mothership maps the records (package fleet). Source adds PocketHost's own calls on top: the heartbeat,
// status reports, the deploy API's questions, webhooks, vacuum, duplicates, usage stats. It also receives Pocker's
// instance events and reports status back (pocker.EventSink).
type Source struct {
	cfg Config
	c   *client
	log *slog.Logger

	// Lazy is the PocketOne client: the host's instance.source/v1 and instance.lookup/v1, and the edges.
	Lazy *mclient.Client

	look     lookupv1.Lookup
	fleet    ceedge.EdgeSource
	standing func() []pocker.Instance
	selfRec  func() string

	routeInit sync.Once
	rt        *ceedge.Router
}

// NewSource creates the mothership source. Register s.Lazy on the host (it's a multisite.Extension) so the host
// takes its instances from it.
func NewSource(cfg Config, log *slog.Logger) *Source {
	if log == nil {
		log = slog.Default()
	}
	lazy := mclient.New(mclient.Config{
		URL: cfg.MothershipURL, Email: cfg.AdminUser, Password: cfg.AdminPassword, Self: cfg.EdgeID,
		Heartbeat: -1, // PocketHost's own heartbeat (POST /api/edge/heartbeat) registers and marks the edge
		Logger:    log,
	})
	s := &Source{cfg: cfg, c: newClient(cfg.MothershipURL, cfg.AdminUser, cfg.AdminPassword), log: log, Lazy: lazy}
	s.look, s.fleet, s.standing, s.selfRec = lazy, lazy, lazy.Standing, lazy.SelfRecord
	return s
}

// lookup answers what host serves (from the lazy mirror's cache, or by asking), bounded so a request's extras never
// wait long on the mothership.
func (s *Source) lookup(ctx context.Context, host string) (pocker.Instance, bool) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	res, err := s.look.Lookup(ctx, normalizeRequestHost(host))
	if err != nil || !res.Found {
		return pocker.Instance{}, false
	}
	return res.Instance, true
}

// myEdge is this edge's record id at the mothership ("" until the first stream).
func (s *Source) myEdge() string { return s.selfRec() }

// webhookHost is the hostname scheduled calls and vacuum lookups use for an instance: its subdomain, else its id,
// under the apex.
func (s *Source) webhookHost(id, subdomain string) string {
	if subdomain = strings.TrimSpace(subdomain); subdomain != "" {
		return subdomain + "." + s.cfg.ApexDomain
	}
	return id + "." + s.cfg.ApexDomain
}

// localRec is one of this edge's instance records, with the few fields background jobs read.
type localRec struct {
	ID         string          `json:"id"`
	Subdomain  string          `json:"subdomain"`
	Webhooks   json.RawMessage `json:"webhooks"`
	AutoVacuum *bool           `json:"autoVacuum"`
}

// localInstances lists this edge's instance records at the mothership (only fields), narrowed by extra (a PocketBase
// filter; "" for all). Background jobs use it instead of a mirror of every instance: the webhook scheduler each
// minute (instances with webhooks, a few hundred at most), the vacuum once a night.
func (s *Source) localInstances(ctx context.Context, extra, fields string) ([]localRec, error) {
	mine := ""
	if rec := s.myEdge(); rec != "" {
		mine = fmt.Sprintf("edge = %q", rec)
	}
	if s.cfg.EdgeID == legacyEdgeID { // instances without an edge predate edges and run on sfo
		mine = strings.TrimPrefix(mine+` || edge = ""`, " || ")
	}
	if mine == "" {
		return nil, errors.New("this edge's record isn't known yet")
	}
	filter := "(" + mine + ")"
	if extra != "" {
		filter += " && (" + extra + ")"
	}
	var all []localRec
	for page := 1; ; page++ {
		var out struct {
			Items []localRec `json:"items"`
		}
		q := url.Values{"filter": {filter}, "fields": {fields}, "perPage": {"500"}, "page": {fmt.Sprint(page)}, "skipTotal": {"1"}, "sort": {"id"}}
		if err := s.c.do(ctx, http.MethodGet, "/api/collections/instances/records?"+q.Encode(), nil, &out); err != nil {
			return nil, err
		}
		all = append(all, out.Items...)
		if len(out.Items) < 500 {
			return all, nil
		}
	}
}

// legacyEdgeID owns instances that have no edge (they predate edges).
const legacyEdgeID = "sfo"
