package edge

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"time"
)

// CheckReport summarizes how the mirror maps for this edge. Read-only: it fetches the dump and changes nothing.
type CheckReport struct {
	Instances, Users, Edges int
	EdgeRecord              string
	ThisEdge                int
	Blocked                 map[int]int
	Served                  int
	NotServed               int
	// LoginOwners is how many owner logins a start fetches (prefetchLogins); LoginSampleMs is the mean of a few
	// sequential fetches, so LoginOwners*LoginSampleMs/loginWorkers estimates that step.
	LoginOwners   int
	LoginSampleMs float64
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
	uids := s.loginsNeededLocked()
	rep.LoginOwners = len(uids)
	if n := min(len(uids), 10); n > 0 {
		t0 := time.Now()
		for _, uid := range uids[:n] {
			var t tokenInfo
			_ = s.c.do(ctx, http.MethodGet, "/api/userToken/"+uid, nil, &t) // read-only; timing only
		}
		rep.LoginSampleMs = float64(time.Since(t0).Milliseconds()) / float64(n)
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
	if r.LoginOwners > 0 {
		out += fmt.Sprintf("\nowner logins at start: %d (%.0f ms each, ~%.1f s with %d in parallel)", r.LoginOwners, r.LoginSampleMs,
			float64(r.LoginOwners)*r.LoginSampleMs/loginWorkers/1000, loginWorkers)
	}
	return out
}
