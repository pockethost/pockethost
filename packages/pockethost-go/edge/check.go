package edge

import (
	"context"
	"fmt"
	"net/http"
	"sort"
)

// CheckReport summarizes how the mirror maps for this edge. Read-only: it fetches the dump and changes nothing.
type CheckReport struct {
	Instances, Edges int
	EdgeRecord       string
	ThisEdge         int
	Blocked          map[int]int
	Served           int
}

// Check fetches the mirror once and maps it for cfg.EdgeID, without heartbeats, subscriptions or status writes.
func Check(ctx context.Context, cfg Config) (*CheckReport, error) {
	s := NewSource(cfg, nil)
	d, err := s.fetchDump(ctx)
	if err != nil {
		return nil, err
	}
	s.loadDumpLocked(d)
	rep := &CheckReport{Instances: len(d.Instances), Edges: len(d.Edges), EdgeRecord: s.myEdge, Blocked: map[int]int{}}
	for _, inst := range d.Instances {
		p, _ := mapInstance(cfg, inst, s.myEdge) // host claims don't matter here
		if p.Remote != "" {
			rep.Blocked[http.StatusMisdirectedRequest]++ // forwarded to their edge
			continue
		}
		rep.ThisEdge++
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
	out := fmt.Sprintf("mirror: %d instances, %d edges; edge record %q\nthis edge: %d instances (%d served, the rest blocked)\nblocked:",
		r.Instances, r.Edges, r.EdgeRecord, r.ThisEdge, r.Served)
	for _, c := range codes {
		out += fmt.Sprintf(" %d×%d", r.Blocked[c], c)
	}
	return out
}
