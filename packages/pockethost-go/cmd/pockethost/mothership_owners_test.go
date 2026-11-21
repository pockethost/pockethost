package main

import (
	"encoding/json"
	"strings"
	"testing"

	"ganigeorgiev.com/pocketbase/dbx"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
)

// ownersApp is a bare app with the users and instances fields the owner resolver reads and writes.
func ownersApp(t *testing.T) (core.App, *core.Record) {
	t.Helper()
	t.Setenv("APP_URL", "https://app.example.com")
	app := core.NewBaseApp(core.BaseAppConfig{DataDir: t.TempDir()})
	if err := app.Bootstrap(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { app.ResetBootstrapState() })
	registerOwnerFields(app)

	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		t.Fatal(err)
	}
	users.Fields.Add(&core.TextField{Name: "suspension"}, &core.NumberField{Name: "subscription_quantity"},
		&core.JSONField{Name: "trusted_ips"}, &core.TextField{Name: "nickname"})
	inst := core.NewBaseCollection("instances")
	inst.Fields.Add(&core.TextField{Name: "subdomain"})
	for _, f := range []string{fieldBlocked, fieldSuperusers, fieldTrustedIPs, fieldOwners} {
		inst.Fields.Add(&core.JSONField{Name: f, Hidden: true})
	}
	for _, c := range []*core.Collection{users, inst} {
		if err := app.Save(c); err != nil {
			t.Fatal(err)
		}
	}
	owners := ownersCollection(t, app, inst.Id, users.Id)
	if err := app.Save(owners); err != nil {
		t.Fatal(err)
	}
	u := core.NewRecord(users)
	u.SetEmail("owner@example.com")
	u.SetPassword("password123")
	u.SetVerified(true)
	u.Set("subscription_quantity", 1)
	u.Set("trusted_ips", []string{"198.51.100.7"})
	if err := app.Save(u); err != nil {
		t.Fatal(err)
	}
	return app, u
}

type ownerView struct {
	Blocked    *ownerBlock
	Superusers []ownerLogin
	TrustedIPs []string
	Owners     []string
}

func viewOwner(t *testing.T, app core.App, id string) ownerView {
	t.Helper()
	r, err := app.FindRecordById("instances", id)
	if err != nil {
		t.Fatal(err)
	}
	var v ownerView
	for field, dst := range map[string]any{fieldBlocked: &v.Blocked, fieldSuperusers: &v.Superusers,
		fieldTrustedIPs: &v.TrustedIPs, fieldOwners: &v.Owners} {
		if s := r.GetString(field); s != "" {
			if err := json.Unmarshal([]byte(s), dst); err != nil {
				t.Fatalf("%s: %v (%s)", field, err, s)
			}
		}
	}
	return v
}

// ownersCollection is instance_owners as migration 1796000000 makes it (relations cascade).
func ownersCollection(t *testing.T, app core.App, instancesID, usersID string) *core.Collection {
	t.Helper()
	c := core.NewBaseCollection("instance_owners")
	c.Fields.Add(&core.RelationField{Name: "instance", CollectionId: instancesID, MaxSelect: 1, CascadeDelete: true, Required: true},
		&core.RelationField{Name: "user", CollectionId: usersID, MaxSelect: 1, CascadeDelete: true, Required: true},
		&core.BoolField{Name: "sync_login"})
	c.AddIndex("idx_instance_owners_instance", true, "instance", "")
	return c
}

// saveInstance makes an instance and, when uid is set, its owner row (as the mothership's create handler does: the
// instance first, then the row).
func saveInstance(t *testing.T, app core.App, uid string, syncLogin bool) string {
	t.Helper()
	col, _ := app.FindCollectionByNameOrId("instances")
	r := core.NewRecord(col)
	if err := app.Save(r); err != nil {
		t.Fatal(err)
	}
	if uid != "" {
		oc, _ := app.FindCollectionByNameOrId("instance_owners")
		row := core.NewRecord(oc)
		row.Set("instance", r.Id)
		row.Set("user", uid)
		row.Set("sync_login", syncLogin)
		if err := app.Save(row); err != nil {
			t.Fatal(err)
		}
	}
	return r.Id
}

func updateUser(t *testing.T, app core.App, u *core.Record, change func(*core.Record)) *core.Record {
	t.Helper()
	fresh, err := app.FindRecordById("users", u.Id)
	if err != nil {
		t.Fatal(err)
	}
	change(fresh)
	if err := app.Save(fresh); err != nil {
		t.Fatal(err)
	}
	return fresh
}

func TestOwnerFieldsOnInstanceSave(t *testing.T) {
	app, u := ownersApp(t)
	id := saveInstance(t, app, u.Id, true)
	v := viewOwner(t, app, id)
	if v.Blocked != nil {
		t.Fatalf("a paying, verified owner's instance is not blocked: %+v", v.Blocked)
	}
	if len(v.Owners) != 1 || v.Owners[0] != u.Id {
		t.Errorf("owners: %v", v.Owners)
	}
	if strings.Join(v.TrustedIPs, ",") != "198.51.100.7" {
		t.Errorf("trusted ips: %v", v.TrustedIPs)
	}
	if len(v.Superusers) != 1 || v.Superusers[0].ID != u.Id || v.Superusers[0].Email != "owner@example.com" ||
		!strings.HasPrefix(v.Superusers[0].PasswordHash, "$2") || v.Superusers[0].TokenKey == "" {
		t.Errorf("admin sync login: %+v", v.Superusers)
	}

	noSync := saveInstance(t, app, u.Id, false)
	if v := viewOwner(t, app, noSync); len(v.Superusers) != 0 {
		t.Errorf("no admin sync, no login: %+v", v.Superusers)
	}
	orphan := saveInstance(t, app, "", false)
	if v := viewOwner(t, app, orphan); v.Blocked == nil || v.Blocked.Status != 403 || len(v.Owners) != 0 {
		t.Errorf("no owner: %+v", v)
	}
}

func TestOwnerChangesRewriteInstances(t *testing.T) {
	app, u := ownersApp(t)
	id := saveInstance(t, app, u.Id, true)
	before := viewOwner(t, app, id).Superusers[0].PasswordHash

	cases := []struct {
		name   string
		change func(*core.Record)
		status int
		msg    string
	}{
		{"suspended", func(r *core.Record) { r.Set("suspension", "abuse") }, 403, "abuse"},
		{"suspension wins over unpaid", func(r *core.Record) { r.Set("subscription_quantity", 0) }, 403, "abuse"},
		{"unpaid", func(r *core.Record) { r.Set("suspension", "") }, 402, "https://app.example.com/access"},
		{"unverified", func(r *core.Record) { r.Set("subscription_quantity", 2); r.SetVerified(false) }, 403, "verify your account"},
		{"back in good standing", func(r *core.Record) { r.SetVerified(true) }, 0, ""},
	}
	for _, c := range cases {
		u = updateUser(t, app, u, c.change)
		v := viewOwner(t, app, id)
		switch {
		case c.status == 0 && v.Blocked != nil:
			t.Errorf("%s: %+v", c.name, v.Blocked)
		case c.status != 0 && (v.Blocked == nil || v.Blocked.Status != c.status || !strings.Contains(v.Blocked.Message, c.msg)):
			t.Errorf("%s: %+v", c.name, v.Blocked)
		}
	}

	u = updateUser(t, app, u, func(r *core.Record) { r.Set("trusted_ips", []string{"203.0.113.0/24"}); r.SetPassword("another-one") })
	v := viewOwner(t, app, id)
	if strings.Join(v.TrustedIPs, ",") != "203.0.113.0/24" {
		t.Errorf("trusted ips change: %v", v.TrustedIPs)
	}
	if len(v.Superusers) != 1 || v.Superusers[0].PasswordHash == before {
		t.Errorf("a new password reaches the instance's login: %+v", v.Superusers)
	}

	// a change the resolver doesn't read leaves the instances alone
	if ownerFieldsChanged(func() *core.Record {
		r, _ := app.FindRecordById("users", u.Id)
		r.Set("nickname", "pat")
		return r
	}()) {
		t.Error("nickname isn't an owner field")
	}

	// sync_login off: the login leaves the instance
	row, err := app.FindFirstRecordByFilter("instance_owners", "instance = {:id}", dbx.Params{"id": id})
	if err != nil {
		t.Fatal(err)
	}
	row.Set("sync_login", false)
	if err := app.Save(row); err != nil {
		t.Fatal(err)
	}
	if v := viewOwner(t, app, id); len(v.Superusers) != 0 {
		t.Errorf("sync_login off keeps the login: %+v", v.Superusers)
	}
	// owner row removed: the instance has no owner
	if err := app.Delete(row); err != nil {
		t.Fatal(err)
	}
	if v := viewOwner(t, app, id); v.Blocked == nil || !strings.Contains(v.Blocked.Message, "no owner") || len(v.Owners) != 0 {
		t.Errorf("owner row removed: %+v", v)
	}
}

// Deleting a user deletes their instances (instances.uid's cascade did before ownership moved to instance_owners).
func TestDeletedUserTakesTheirInstances(t *testing.T) {
	app, u := ownersApp(t)
	a := saveInstance(t, app, u.Id, true)
	b := saveInstance(t, app, u.Id, false)
	orphan := saveInstance(t, app, "", false)
	if err := app.Delete(u); err != nil {
		t.Fatal(err)
	}
	for _, id := range []string{a, b} {
		if _, err := app.FindRecordById("instances", id); err == nil {
			t.Errorf("instance %s outlived its owner", id)
		}
	}
	if _, err := app.FindRecordById("instances", orphan); err != nil {
		t.Errorf("an instance with no owner isn't touched: %v", err)
	}
	if n, _ := app.CountRecords("instance_owners"); n != 0 {
		t.Errorf("owner rows left: %d", n)
	}
}

func TestSyncOwnerFieldsFixesDrift(t *testing.T) {
	app, u := ownersApp(t)
	a := saveInstance(t, app, u.Id, true)
	saveInstance(t, app, u.Id, false)
	// rows written before the fields existed (the first deploy), or behind the hooks' back
	if _, err := app.DB().Update("instances", dbx.Params{fieldBlocked: "", fieldSuperusers: "", fieldOwners: ""},
		dbx.HashExp{"id": a}).Execute(); err != nil {
		t.Fatal(err)
	}
	checked, saved, err := syncOwnerFields(app)
	if err != nil || checked != 2 || saved != 1 {
		t.Fatalf("sync: checked=%d saved=%d err=%v", checked, saved, err)
	}
	if v := viewOwner(t, app, a); len(v.Owners) != 1 || len(v.Superusers) != 1 {
		t.Errorf("after sync: %+v", v)
	}
	if _, saved, _ := syncOwnerFields(app); saved != 0 {
		t.Errorf("a second sync changes nothing, saved %d", saved)
	}
}
