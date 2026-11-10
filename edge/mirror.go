package edge

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"reflect"
	"strings"
	"sync"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/pocker"
)

// Source is a pocker.InstanceSource backed by PocketHost's mothership mirror: a full dump at start and after every
// reconnect, PocketBase realtime for changes, and a periodic drift poll as a safety net. It also receives Pocker's
// instance events and reports status back (pocker.EventSink).
type Source struct {
	cfg Config
	c   *client
	log *slog.Logger

	mu        sync.Mutex
	users     map[string]userRec
	instances map[string]instanceRec
	edges     map[string]edgeRec
	myEdge    string
	logins    map[string]loginCache      // by user id
	emitted   map[string]pocker.Instance // what Pocker currently has
	claims    map[string]string          // host -> instance id, by the Node edge's priority (cname > subdomain > id)
	lastDrift time.Time

	out chan pocker.Change
}

type loginCache struct {
	updated string
	info    *tokenInfo
}

// NewSource creates the mothership source.
func NewSource(cfg Config, log *slog.Logger) *Source {
	if log == nil {
		log = slog.Default()
	}
	return &Source{
		cfg: cfg, c: newClient(cfg.MothershipURL, cfg.AdminUser, cfg.AdminPassword), log: log,
		users: map[string]userRec{}, instances: map[string]instanceRec{}, edges: map[string]edgeRec{},
		logins: map[string]loginCache{}, emitted: map[string]pocker.Instance{}, claims: map[string]string{},
		out: make(chan pocker.Change, 256),
	}
}

type dump struct {
	Users     []userRec     `json:"users"`
	Instances []instanceRec `json:"instances"`
	Edges     []edgeRec     `json:"edges"`
}

func (s *Source) fetchDump(ctx context.Context) (*dump, error) {
	var d dump
	if err := s.c.do(ctx, http.MethodGet, "/api/mirror", nil, &d); err != nil {
		return nil, err
	}
	return &d, nil
}

// loadDumpLocked replaces the mirror state.
func (s *Source) loadDumpLocked(d *dump) {
	s.users = make(map[string]userRec, len(d.Users))
	for _, u := range d.Users {
		s.users[u.ID] = u
	}
	s.instances = make(map[string]instanceRec, len(d.Instances))
	for _, i := range d.Instances {
		s.instances[i.ID] = i
	}
	s.edges = make(map[string]edgeRec, len(d.Edges))
	for _, e := range d.Edges {
		s.edges[e.ID] = e
	}
	s.resolveMyEdgeLocked()
	s.rebuildClaimsLocked()
}

func (s *Source) resolveMyEdgeLocked() bool {
	prev := s.myEdge
	s.myEdge = ""
	for _, e := range s.edges {
		if e.EdgeID == s.cfg.EdgeID {
			s.myEdge = e.ID
		}
	}
	return prev != s.myEdge
}

// ownerLogin fetches (and caches per user version) the owner's login for superuser sync. Called with s.mu held;
// only for this edge's instances with syncAdmin, so it's a handful of calls.
func (s *Source) ownerLoginLocked(ctx context.Context) func(uid string) *tokenInfo {
	return func(uid string) *tokenInfo {
		u := s.users[uid]
		if c, ok := s.logins[uid]; ok && c.updated == u.Updated {
			return c.info
		}
		var t tokenInfo
		if err := s.c.do(ctx, http.MethodGet, "/api/userToken/"+uid, nil, &t); err != nil {
			s.log.Warn("pockethost: owner login not available; admin sync skipped", "uid", uid, "error", err)
			return nil
		}
		s.logins[uid] = loginCache{updated: u.Updated, info: &t}
		return &t
	}
}

// computeLocked maps one mothership instance (ok=false: not served).
func (s *Source) computeLocked(ctx context.Context, id string) (pocker.Instance, bool) {
	inst, ok := s.instances[id]
	if !ok {
		return pocker.Instance{}, false
	}
	var owner *userRec
	if u, ok := s.users[inst.UID]; ok {
		owner = &u
	}
	p, ok := mapInstance(s.cfg, inst, owner, s.myEdge, s.ownerLoginLocked(ctx))
	if ok {
		// keep only the hosts this instance wins (two instances can claim one name, e.g. a subdomain equal to
		// another instance's id)
		kept := p.Hosts[:0]
		for _, h := range p.Hosts {
			if s.claims[h] == id {
				kept = append(kept, h)
			}
		}
		p.Hosts = kept
	}
	return p, ok
}

// rebuildClaimsLocked decides which instance owns each host: a custom domain beats a subdomain, which beats
// <id>.<apex>; between equals, the most recently updated instance wins. Returns the ids whose hosts changed.
func (s *Source) rebuildClaimsLocked() map[string]bool {
	type claim struct {
		id, updated string
		rank        int
	}
	best := map[string]claim{}
	offer := func(host string, c claim) {
		if b, ok := best[host]; !ok || c.rank > b.rank || c.rank == b.rank && (c.updated > b.updated || c.updated == b.updated && c.id < b.id) {
			best[host] = c
		}
	}
	for id, inst := range s.instances {
		if c := strings.ToLower(strings.TrimSpace(inst.Cname)); c != "" {
			offer(c, claim{id, inst.Updated, 3})
		}
		if inst.Subdomain != "" {
			offer(inst.Subdomain+"."+s.cfg.ApexDomain, claim{id, inst.Updated, 2})
		}
		offer(id+"."+s.cfg.ApexDomain, claim{id, inst.Updated, 1})
	}
	changed := map[string]bool{}
	next := make(map[string]string, len(best))
	for h, c := range best {
		next[h] = c.id
		if s.claims[h] != c.id {
			changed[c.id] = true
			if prev := s.claims[h]; prev != "" {
				changed[prev] = true
			}
		}
	}
	for h, id := range s.claims {
		if _, ok := next[h]; !ok {
			changed[id] = true
		}
	}
	s.claims = next
	return changed
}

// diffLocked recomputes the given instance ids (nil = all) and returns the changes against what Pocker has.
func (s *Source) diffLocked(ctx context.Context, ids []string) []pocker.Change {
	if ids == nil {
		seen := map[string]bool{}
		for id := range s.instances {
			ids = append(ids, id)
			seen[id] = true
		}
		for id := range s.emitted {
			if !seen[id] {
				ids = append(ids, id)
			}
		}
	}
	var changes []pocker.Change
	for _, id := range ids {
		next, ok := s.computeLocked(ctx, id)
		prev, had := s.emitted[id]
		switch {
		case ok && (!had || !reflect.DeepEqual(prev, next)):
			s.emitted[id] = next
			changes = append(changes, pocker.Change{Kind: pocker.Upsert, Instance: next})
		case !ok && had:
			delete(s.emitted, id)
			changes = append(changes, pocker.Change{Kind: pocker.Delete, Instance: pocker.Instance{ID: id}})
		}
	}
	return changes
}

// Snapshot implements pocker.InstanceSource.
func (s *Source) Snapshot(ctx context.Context) ([]pocker.Instance, error) {
	d, err := s.fetchDump(ctx)
	if err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.loadDumpLocked(d)
	s.emitted = map[string]pocker.Instance{}
	s.diffLocked(ctx, nil)
	s.lastDrift = time.Now()
	list := make([]pocker.Instance, 0, len(s.emitted))
	mine := 0
	for _, inst := range s.emitted {
		list = append(list, inst)
		if inst.Blocked == nil || inst.Blocked.Status != http.StatusMisdirectedRequest {
			mine++
		}
	}
	s.log.Info("pockethost: mirror loaded", "instances", len(list), "this_edge", mine, "edge", s.cfg.EdgeID, "edge_record", s.myEdge)
	return list, nil
}

// Watch implements pocker.InstanceSource: realtime with reconnects (each followed by a full resync) plus a drift poll.
func (s *Source) Watch(ctx context.Context) (<-chan pocker.Change, error) {
	go s.realtimeLoop(ctx)
	go s.driftLoop(ctx)
	return s.out, nil
}

func (s *Source) emit(ctx context.Context, changes []pocker.Change) {
	for _, c := range changes {
		select {
		case s.out <- c:
		case <-ctx.Done():
			return
		}
	}
}

type realtimeMessage struct {
	Action string          `json:"action"`
	Record json.RawMessage `json:"record"`
}

func (s *Source) realtimeLoop(ctx context.Context) {
	backoff := time.Second
	first := true
	for ctx.Err() == nil {
		events, err := s.c.subscribe(ctx, []string{"instances/*", "users/*", "edges/*"})
		if err != nil {
			s.log.Warn("pockethost: realtime unavailable; retrying", "error", err, "in", backoff)
			select {
			case <-time.After(backoff):
			case <-ctx.Done():
				return
			}
			backoff = min(backoff*2, 30*time.Second)
			continue
		}
		backoff = time.Second
		if !first {
			// anything published while disconnected was missed: resync from a full dump
			if d, err := s.fetchDump(ctx); err == nil {
				s.mu.Lock()
				s.loadDumpLocked(d)
				changes := s.diffLocked(ctx, nil)
				s.mu.Unlock()
				s.emit(ctx, changes)
				s.log.Info("pockethost: realtime reconnected; mirror resynced", "changes", len(changes))
			}
		}
		first = false
		for ev := range events {
			s.applyEvent(ctx, ev)
		}
	}
}

func (s *Source) applyEvent(ctx context.Context, ev realtimeEvent) {
	var msg realtimeMessage
	if ev.Name == "PB_CONNECT" || json.Unmarshal(ev.Data, &msg) != nil {
		return
	}
	s.mu.Lock()
	var changes []pocker.Change
	switch ev.Name {
	case "instances/*", "instances":
		var r instanceRec
		if json.Unmarshal(msg.Record, &r) != nil || r.ID == "" {
			break
		}
		if msg.Action == "delete" {
			delete(s.instances, r.ID)
		} else {
			s.instances[r.ID] = r
		}
		ids := []string{r.ID}
		for id := range s.rebuildClaimsLocked() {
			if id != r.ID {
				ids = append(ids, id)
			}
		}
		changes = s.diffLocked(ctx, ids)
	case "users/*", "users":
		var r userRec
		if json.Unmarshal(msg.Record, &r) != nil || r.ID == "" {
			break
		}
		if msg.Action == "delete" {
			delete(s.users, r.ID)
		} else {
			s.users[r.ID] = r
		}
		changes = s.diffLocked(ctx, s.instanceIDsOfLocked(r.ID))
	case "edges/*", "edges":
		var r edgeRec
		if json.Unmarshal(msg.Record, &r) != nil || r.ID == "" {
			break
		}
		if msg.Action == "delete" {
			delete(s.edges, r.ID)
		} else {
			s.edges[r.ID] = r
		}
		if s.resolveMyEdgeLocked() {
			changes = s.diffLocked(ctx, nil)
		}
	}
	s.mu.Unlock()
	s.emit(ctx, changes)
}

func (s *Source) instanceIDsOfLocked(uid string) []string {
	var ids []string
	for id, inst := range s.instances {
		if inst.UID == uid {
			ids = append(ids, id)
		}
	}
	for id := range s.emitted {
		if _, ok := s.instances[id]; !ok {
			ids = append(ids, id)
		}
	}
	return ids
}

// driftLoop catches events realtime missed: records updated since the last check (with 10s grace).
func (s *Source) driftLoop(ctx context.Context) {
	t := time.NewTicker(s.cfg.DriftCheckInterval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}
		s.mu.Lock()
		since := s.lastDrift.Add(-10 * time.Second)
		s.mu.Unlock()
		started := time.Now()
		insts, err1 := s.c.listUpdatedSince(ctx, "instances", since)
		users, err2 := s.c.listUpdatedSince(ctx, "users", since)
		if err1 != nil || err2 != nil {
			s.log.Warn("pockethost: drift check failed; will retry", "instances_error", err1, "users_error", err2)
			continue
		}
		s.mu.Lock()
		var ids []string
		for _, raw := range insts {
			var r instanceRec
			if json.Unmarshal(raw, &r) == nil && r.ID != "" {
				s.instances[r.ID] = r
				ids = append(ids, r.ID)
			}
		}
		for _, raw := range users {
			var r userRec
			if json.Unmarshal(raw, &r) == nil && r.ID != "" {
				s.users[r.ID] = r
				ids = append(ids, s.instanceIDsOfLocked(r.ID)...)
			}
		}
		for id := range s.rebuildClaimsLocked() {
			ids = append(ids, id)
		}
		changes := s.diffLocked(ctx, ids)
		s.lastDrift = started
		s.mu.Unlock()
		if len(changes) > 0 {
			s.log.Info("pockethost: drift check applied changes", "changes", len(changes))
		}
		s.emit(ctx, changes)
	}
}
