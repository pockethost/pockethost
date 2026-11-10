package edge

import (
	"context"
	"fmt"
	"net/http"
	"sort"
)

// CheckReport summarizes how the mirror maps for this edge. Read-only: it fetches the dump and changes nothing.
type CheckReport struct {
	Instances, Users, Edges int
	EdgeRecord              string
	ThisEdge                int
	Blocked                 map[int]int
	Served                  int
	NotServed               int
}

// Check fetches the mirror once and maps it for cfg.EdgeID, without heartbeats, subscriptions or status writes.
func Check(ctx context.Context, cfg Config) (*CheckReport, error) {
	s := NewSource(cfg, nil)
	d, err := s.fetchDump(ctx)
	if err != nil {
		return nil, err
	}
	s.loadDumpLocked(d)
	rep := &CheckReport{Instances: len(d.Instances), Users: len(d.Users), Edges: len(d.Edges), EdgeRecord: s.myEdge, Blocked: map[int]int{}}
	for _, inst := range d.Instances {
		var owner *userRec
		if u, ok := s.users[inst.UID]; ok {
			owner = &u
		}
		p, ok := mapInstance(cfg, inst, owner, s.myEdge, nil) // no owner-login fetches; host claims don't matter here
		if !ok {
			rep.NotServed++
			continue
		}
		if p.Blocked == nil || p.Blocked.Status != http.StatusMisdirectedRequest {
			rep.ThisEdge++
		}
		if p.Blocked != nil {
			rep.Blocked[p.Blocked.Status]++
		} else {
			rep.Served++
		}
	}
	return rep, nil
}

func (r *CheckReport) String() string {
	codes := make([]int, 0, len(r.Blocked))
	for c := range r.Blocked {
		codes = append(codes, c)
	}
	sort.Ints(codes)
	out := fmt.Sprintf("mirror: %d instances, %d users, %d edges; edge record %q\nthis edge: %d instances (%d served, the rest blocked)\nnot served (unknown owner): %d\nblocked:",
		r.Instances, r.Users, r.Edges, r.EdgeRecord, r.ThisEdge, r.Served, r.NotServed)
	for _, c := range codes {
		out += fmt.Sprintf(" %d×%d", r.Blocked[c], c)
	}
	return out
}
