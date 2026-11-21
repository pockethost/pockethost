package fleet_test

import (
	"context"
	"io"
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/pockethost/pockethost/packages/pockethost-go/fleet"
	"github.com/pockethost/pockethost/packages/pockethost-go/fleet/fleettest"
	"pocketone.dev/ext/cache"
	cachev1 "pocketone.dev/ext/contracts/cache/v1"
	resolvev1 "pocketone.dev/ext/contracts/instance/resolve/v1"
	sourcev1 "pocketone.dev/ext/contracts/instance/source/v1"
	"pocketone.dev/ext/mothership/client"
)

var cfg = fleet.Config{ApexDomain: "pockethost.io", HTTPProtocol: "https:", AppURL: "https://app.pockethost.io", DocURL: "https://pockethost.io/docs"}

var quiet = slog.New(slog.NewTextHandler(io.Discard, nil))

func resolve(t *testing.T, r resolvev1.Resolver, edge, host string) *sourcev1.Instance {
	t.Helper()
	res, err := r.Resolve(context.Background(), resolvev1.Query{Edge: edge, Host: host})
	if err != nil {
		t.Fatal(err)
	}
	return res.Instance
}

// Host claims follow the Node edge's priority: custom domain > subdomain > <id>.<apex>; the newest record wins a tie.
func TestHostClaimsFollowNodePriority(t *testing.T) {
	m := fleettest.New(t, cfg, nil)
	sgp := m.Save(t, "edges", "", map[string]any{"edge_id": "sgp-1"})
	m.Save(t, "instances", "aaaaaaaaaaaaaaa", map[string]any{"subdomain": "shop", "power": true, "edge": sgp.Id})
	// subdomain equal to the other instance's id: the subdomain wins that host
	m.Save(t, "instances", "bbbbbbbbbbbbbbb", map[string]any{"subdomain": "aaaaaaaaaaaaaaa", "power": true, "edge": sgp.Id})
	// two claims on one custom domain: the most recently updated wins
	m.Save(t, "instances", "ccccccccccccccc", map[string]any{"subdomain": "c-old", "cname": "dup.example.com", "power": true, "edge": sgp.Id})
	time.Sleep(5 * time.Millisecond)
	m.Save(t, "instances", "ddddddddddddddd", map[string]any{"subdomain": "d-new", "cname": "dup.example.com", "power": true, "edge": sgp.Id})
	// a custom domain stored before the mothership lowercased them still routes
	m.Save(t, "instances", "eeeeeeeeeeeeeee", map[string]any{"subdomain": "mixed", "cname": "Mixed.Example.com", "power": true, "edge": sgp.Id})
	r := &fleet.Resolver{App: m.App, Cfg: cfg}

	if e := resolve(t, r, "sgp-1", "mixed.example.com"); e == nil || e.ID != "eeeeeeeeeeeeeee" {
		t.Errorf("a mixed-case custom domain should match its lowercase host: %+v", e)
	}
	a := resolve(t, r, "sgp-1", "shop.pockethost.io")
	if a == nil || a.ID != "aaaaaaaaaaaaaaa" || strings.Join(a.Hosts, ",") != "shop.pockethost.io" {
		t.Errorf("a keeps its subdomain only: %+v", a)
	}
	b := resolve(t, r, "sgp-1", "aaaaaaaaaaaaaaa.pockethost.io")
	if b == nil || b.ID != "bbbbbbbbbbbbbbb" || strings.Join(b.Hosts, ",") != "aaaaaaaaaaaaaaa.pockethost.io,bbbbbbbbbbbbbbb.pockethost.io" {
		t.Errorf("b wins a's id host through its subdomain: %+v", b)
	}
	if d := resolve(t, r, "sgp-1", "dup.example.com"); d == nil || d.ID != "ddddddddddddddd" {
		t.Errorf("custom domain should go to the newer instance: %+v", d)
	}
	if c := resolve(t, r, "sgp-1", "c-old.pockethost.io"); c == nil || strings.Contains(strings.Join(c.Hosts, ","), "dup.example.com") {
		t.Errorf("c lost the custom domain: %+v", c)
	}
	if n := resolve(t, r, "sgp-1", "nope.pockethost.io"); n != nil {
		t.Errorf("unknown host: %+v", n)
	}
	if n := resolve(t, r, "sgp-1", "x.y.pockethost.io"); n != nil {
		t.Errorf("a deeper name is no subdomain: %+v", n)
	}
	// placement: another edge's view
	if a := resolve(t, r, "ams-1", "shop.pockethost.io"); a == nil || a.Remote != "edge:"+sgp.Id || a.Secrets != nil {
		t.Errorf("another edge forwards: %+v", a)
	}
}

// The standing set: this edge's unfinished copies, their originals, and the problems the edge can't fix.
func TestStanding(t *testing.T) {
	m := fleettest.New(t, cfg, nil)
	sgp := m.Save(t, "edges", "", map[string]any{"edge_id": "sgp-1"})
	ams := m.Save(t, "edges", "", map[string]any{"edge_id": "ams-1"})
	m.Save(t, "instances", "orig11111111111", map[string]any{"subdomain": "orig", "power": true, "edge": sgp.Id})
	m.Save(t, "instances", "copy11111111111", map[string]any{"subdomain": "copy", "power": true, "edge": sgp.Id,
		"duplicateOf": "orig11111111111", "duplicateStatus": fleet.DuplicateCopying})
	m.Save(t, "instances", "away11111111111", map[string]any{"subdomain": "away", "power": true, "edge": ams.Id})
	m.Save(t, "instances", "copy22222222222", map[string]any{"subdomain": "copy2", "power": true, "edge": sgp.Id,
		"duplicateOf": "away11111111111", "duplicateStatus": fleet.DuplicateCopying})
	m.Save(t, "instances", "done11111111111", map[string]any{"subdomain": "done", "power": true, "edge": sgp.Id,
		"duplicateOf": "orig11111111111", "duplicateStatus": fleet.DuplicateReady})
	r := &fleet.Resolver{App: m.App, Cfg: cfg}
	st, err := r.Standing(context.Background(), "sgp-1")
	if err != nil {
		t.Fatal(err)
	}
	got := map[string]sourcev1.Instance{}
	for _, i := range st.Instances {
		got[i.ID] = i
	}
	if len(got) != 3 {
		t.Fatalf("want copy, copy2 and orig: %v", got)
	}
	if c := got["copy11111111111"]; c.Private[fleet.PrivateDuplicateOf] != "orig11111111111" || c.Private[fleet.PrivateDuplicateProblem] != "" || c.Blocked == nil {
		t.Errorf("copy: %+v", c)
	}
	if _, isCopy := got["orig11111111111"].Private[fleet.PrivateDuplicateOf]; isCopy {
		t.Error("the original is no copy")
	}
	if c := got["copy22222222222"]; !strings.Contains(c.Private[fleet.PrivateDuplicateProblem], "moved") {
		t.Errorf("a copy of another edge's instance: %+v", c.Private)
	}
	if st, _ := r.Standing(context.Background(), "ams-1"); len(st.Instances) != 0 {
		t.Errorf("ams-1 has no copies: %+v", st.Instances)
	}
}

// End to end: an edge's lazy mirror (PocketOne's client) against the watch server with this resolver. Answers
// arrive on the stream; owner blocks, renames and the standing set follow writes.
func TestFleetThroughWatchServer(t *testing.T) {
	m := fleettest.New(t, cfg, nil)
	sgp := m.Save(t, "edges", "", map[string]any{"edge_id": "sgp-1"})
	shop := m.Save(t, "instances", "shop11111111111", map[string]any{"subdomain": "shop", "power": true, "edge": sgp.Id,
		"secrets": map[string]string{"API_KEY": "v1"}, "owners": []string{"u1"}})

	c := client.New(client.Config{URL: m.URL, Email: fleettest.Email, Password: fleettest.Password, Self: "sgp-1",
		Heartbeat: -1, HelloWait: 5 * time.Second, AskTimeout: 5 * time.Second, Logger: quiet})
	b, err := cache.New(cache.Config{}).Host(nil).Bucket(client.BucketName, cachev1.Options{})
	if err != nil {
		t.Fatal(err)
	}
	c.UseBucket(b)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if _, err := c.Snapshot(ctx); err != nil {
		t.Fatal(err)
	}
	if c.SelfRecord() != sgp.Id {
		t.Fatalf("self record %q", c.SelfRecord())
	}
	look := func(host string) (sourcev1.Instance, bool) {
		t.Helper()
		lctx, lcancel := context.WithTimeout(ctx, 5*time.Second)
		defer lcancel()
		res, err := c.Lookup(lctx, host)
		if err != nil {
			t.Fatalf("lookup %s: %v", host, err)
		}
		return res.Instance, res.Found
	}
	waitFor := func(what string, ok func() bool) {
		t.Helper()
		for deadline := time.Now().Add(5 * time.Second); !ok(); time.Sleep(10 * time.Millisecond) {
			if time.Now().After(deadline) {
				t.Fatalf("%s: not within 5s", what)
			}
		}
	}

	if i, ok := look("shop.pockethost.io"); !ok || i.Secrets["API_KEY"] != "v1" || i.Blocked != nil {
		t.Fatalf("shop: %+v %v", i, ok)
	}
	// the owner's plan lapses: the mothership writes the block on the instance; it arrives on the stream
	m.Save(t, "instances", shop.Id, map[string]any{"blocked": map[string]any{"status": 402, "message": "upgrade"}})
	waitFor("owner block", func() bool { i, _ := look("shop.pockethost.io"); return i.Blocked != nil && i.Blocked.Status == 402 })
	// renamed: the old name stops, the new one answers
	m.Save(t, "instances", shop.Id, map[string]any{"subdomain": "store"})
	waitFor("rename", func() bool { _, ok := look("shop.pockethost.io"); return !ok })
	if i, ok := look("store.pockethost.io"); !ok || i.ID != shop.Id {
		t.Fatalf("new name: %+v %v", i, ok)
	}
	// a duplicate on this edge joins the standing set without any request
	m.Save(t, "instances", "copy11111111111", map[string]any{"subdomain": "copy", "power": true, "edge": sgp.Id,
		"duplicateOf": shop.Id, "duplicateStatus": fleet.DuplicateCopying})
	waitFor("standing copy", func() bool {
		for _, i := range c.Standing() {
			if i.ID == "copy11111111111" {
				return true
			}
		}
		return false
	})
	m.Save(t, "instances", "copy11111111111", map[string]any{"duplicateStatus": fleet.DuplicateReady})
	waitFor("copy done", func() bool {
		for _, i := range c.Standing() {
			if i.ID == "copy11111111111" {
				return false
			}
		}
		return true
	})
}
