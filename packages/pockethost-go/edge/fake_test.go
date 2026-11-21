package edge

import (
	"context"
	"io"
	"log/slog"
	"time"

	lookupv1 "pocketone.dev/ext/contracts/instance/lookup/v1"
	ceedge "pocketone.dev/ext/edge"
	"pocketone.dev/ext/multisite"
	"pocketone.dev/ext/pocker"
)

// edgeRec is an edge as a test describes it (the stream sends the same facts).
type edgeRec struct {
	ID, EdgeID, Region, InternalURL, Status, LastSeen string
}

// fakeFleet stands in for the lazy mirror in unit tests: instances by hostname, the edges, the standing set.
type fakeFleet struct {
	insts    []pocker.Instance
	edges    []edgeRec
	standing []pocker.Instance
	self     string
}

func (f *fakeFleet) Lookup(_ context.Context, host string) (lookupv1.Result, error) {
	host = multisite.NormalizeHost(host)
	for _, i := range f.insts {
		for _, h := range i.Hosts {
			if h == host {
				return lookupv1.Result{Found: true, Instance: i}, nil
			}
		}
	}
	return lookupv1.Result{}, nil
}

func (f *fakeFleet) Self() string { return "sgp-1" }

func (f *fakeFleet) Resolve(remote string) (ceedge.Edge, bool) {
	ref := remote
	if len(ref) > 5 && ref[:5] == "edge:" {
		ref = ref[5:]
	}
	for _, e := range f.edges {
		if e.ID == ref || "@"+e.EdgeID == ref || e.EdgeID == ref {
			return toTestEdge(e), true
		}
	}
	return ceedge.Edge{}, false
}

func (f *fakeFleet) Edges() []ceedge.Edge {
	out := make([]ceedge.Edge, 0, len(f.edges))
	for _, e := range f.edges {
		out = append(out, toTestEdge(e))
	}
	return out
}

func toTestEdge(e edgeRec) ceedge.Edge {
	seen, _ := time.Parse("2006-01-02 15:04:05.000Z", e.LastSeen)
	return ceedge.Edge{ID: e.EdgeID, InternalURL: e.InternalURL, Region: e.Region, Status: e.Status, LastSeen: seen}
}

// fakeSource is a Source whose instances, edges and standing set come from f instead of a mothership's stream.
func fakeSource(cfg Config, f *fakeFleet) *Source {
	s := NewSource(cfg, slog.New(slog.NewTextHandler(io.Discard, nil)))
	s.look, s.fleet = f, f
	s.standing = func() []pocker.Instance { return f.standing }
	s.selfRec = func() string { return f.self }
	return s
}

// local is an instance this edge runs, as the mothership maps it (the Private facts the edge reads).
func local(id, subdomain string, private map[string]string, hosts ...string) pocker.Instance {
	p := map[string]string{"subdomain": subdomain, "power": "true"}
	for k, v := range private {
		p[k] = v
	}
	return pocker.Instance{ID: id, Hosts: append([]string{subdomain + ".pockethost.io", id + ".pockethost.io"}, hosts...), Private: p}
}
