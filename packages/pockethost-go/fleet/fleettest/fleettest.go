// Package fleettest runs a PocketHost mothership for tests: the instances and edges collections (the fields the
// fleet resolver reads), the fleet resolver and PocketOne's watch server, on a local HTTP server.
package fleettest

import (
	"net/http/httptest"
	"testing"

	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tests"

	"github.com/pockethost/pockethost/packages/pockethost-go/fleet"
	"pocketone.dev/ext/extkit"
	p1mothership "pocketone.dev/ext/mothership"
)

// The superuser edges log in with.
const (
	Email    = "ms@test.local"
	Password = "pw-12345678"
)

// Mothership is a running test mothership.
type Mothership struct {
	App *tests.TestApp
	URL string
	srv *httptest.Server
}

// Close drops every connection (edges see their stream end) and stops the server.
func (m *Mothership) Close() { m.srv.CloseClientConnections(); m.srv.Close() }

// CloseClientConnections drops every connection: edges see their stream end and reconnect.
func (m *Mothership) CloseClientConnections() { m.srv.CloseClientConnections() }

// New starts a mothership. routes, if set, adds routes (PocketHost's JS ones a test needs, such as the heartbeat).
func New(t testing.TB, cfg fleet.Config, routes func(se *core.ServeEvent)) *Mothership {
	t.Helper()
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(app.Cleanup)
	edges := core.NewBaseCollection("edges")
	edges.Fields.Add(
		&core.TextField{Name: "edge_id"}, &core.TextField{Name: "internal_url"}, &core.TextField{Name: "region"},
		&core.TextField{Name: "status"}, &core.DateField{Name: "last_seen"},
		&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
	)
	if err := app.Save(edges); err != nil {
		t.Fatal(err)
	}
	inst := core.NewBaseCollection("instances")
	inst.Fields.Add(
		&core.TextField{Name: "subdomain"}, &core.TextField{Name: "cname"}, &core.BoolField{Name: "power"},
		&core.TextField{Name: "suspension"}, &core.BoolField{Name: "dev"}, &core.TextField{Name: "edge"},
		&core.TextField{Name: "version"}, &core.JSONField{Name: "secrets"}, &core.JSONField{Name: "firewall"},
		&core.JSONField{Name: "webhooks"}, &core.BoolField{Name: "autoVacuum"},
		&core.TextField{Name: "duplicateOf"}, &core.TextField{Name: "duplicateStatus"}, &core.TextField{Name: "duplicateError"},
		&core.TextField{Name: "status"},
		&core.JSONField{Name: "blocked"}, &core.JSONField{Name: "superusers"}, &core.JSONField{Name: "trusted_ips"},
		&core.JSONField{Name: "owners"},
		&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
	)
	inst.AddIndex("idx_instances_subdomain", true, "subdomain", "subdomain != ''")
	if err := app.Save(inst); err != nil {
		t.Fatal(err)
	}
	sc, _ := app.FindCollectionByNameOrId(core.CollectionNameSuperusers)
	su := core.NewRecord(sc)
	su.SetEmail(Email)
	su.SetPassword(Password)
	if err := app.Save(su); err != nil {
		t.Fatal(err)
	}
	on := true
	extkit.MustRegister(app, fleet.Extension{Cfg: cfg}, &p1mothership.Server{Enabled: &on})
	router, err := apis.NewRouter(app)
	if err != nil {
		t.Fatal(err)
	}
	m := &Mothership{App: app}
	err = app.OnServe().Trigger(&core.ServeEvent{App: app, Router: router}, func(e *core.ServeEvent) error {
		if routes != nil {
			routes(e)
		}
		mux, err := e.Router.BuildMux()
		if err != nil {
			return err
		}
		m.srv = httptest.NewServer(mux)
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	m.URL = m.srv.URL
	t.Cleanup(m.Close)
	return m
}

// Save creates (id "") or updates a record with fields.
func (m *Mothership) Save(t testing.TB, coll, id string, fields map[string]any) *core.Record {
	t.Helper()
	var r *core.Record
	if id != "" {
		r, _ = m.App.FindRecordById(coll, id)
	}
	if r == nil {
		c, err := m.App.FindCollectionByNameOrId(coll)
		if err != nil {
			t.Fatal(err)
		}
		r = core.NewRecord(c)
		if id != "" {
			r.Id = id
		}
	}
	for k, v := range fields {
		r.Set(k, v)
	}
	if err := m.App.Save(r); err != nil {
		t.Fatalf("save %s: %v", coll, err)
	}
	return r
}
