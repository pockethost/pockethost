package main

import (
	"crypto/sha256"
	"encoding/hex"
	"slices"
	"strings"
	"testing"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/types"
	apitokens "pocketone.dev/ext/api-tokens"
)

// tokensApp is a bare app with the mothership's users, instances and old api_tokens collections, and ext/api-tokens
// registered as the mothership registers it.
func tokensApp(t *testing.T) (core.App, *apitokens.Tokens, *core.Record) {
	t.Helper()
	app := core.NewBaseApp(core.BaseAppConfig{DataDir: t.TempDir()})
	if err := app.Bootstrap(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { app.ResetBootstrapState() })
	tk := registerTokens(app)
	if err := apitokens.EnsureSchema(app); err != nil {
		t.Fatal(err)
	}
	inst := core.NewBaseCollection("instances")
	old := core.NewBaseCollection("api_tokens")
	old.Fields.Add(&core.TextField{Name: "user"}, &core.TextField{Name: "label"}, &core.TextField{Name: "secret_hash"},
		&core.JSONField{Name: "scopes"}, &core.BoolField{Name: "all_instances"}, &core.JSONField{Name: "instances"},
		&core.DateField{Name: "expires"})
	for _, c := range []*core.Collection{inst, old} {
		if err := app.Save(c); err != nil {
			t.Fatal(err)
		}
	}
	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		t.Fatal(err)
	}
	if err := app.Save(ownersCollection(t, app, inst.Id, users.Id)); err != nil {
		t.Fatal(err)
	}
	u := core.NewRecord(users)
	u.SetEmail("owner@example.com")
	u.SetPassword("password123")
	if err := app.Save(u); err != nil {
		t.Fatal(err)
	}
	return app, tk, u
}

func newInstance(t *testing.T, app core.App, uid string) string {
	t.Helper()
	return saveInstance(t, app, uid, false)
}

// newPAT writes an api_tokens row the way the old JS did and returns its secret (ph_pat_<id>_<secret>).
func newPAT(t *testing.T, app core.App, uid string, scopes []string, all bool, instances []string, expires time.Time) (string, string) {
	t.Helper()
	secret := strings.Repeat("A", 40) + string(rune('a'+len(scopes))) + string(rune('a'+len(instances))) + "Z"
	if all {
		secret = secret[:42] + "Y"
	}
	if !expires.IsZero() {
		secret = secret[:42] + "X"
	}
	col, _ := app.FindCollectionByNameOrId("api_tokens")
	r := core.NewRecord(col)
	sum := sha256.Sum256([]byte(secret))
	r.Set("user", uid)
	r.Set("label", "ci")
	r.Set("secret_hash", hex.EncodeToString(sum[:]))
	r.Set("scopes", scopes)
	r.Set("all_instances", all)
	r.Set("instances", instances)
	if !expires.IsZero() {
		dt, _ := types.ParseDateTime(expires.UTC())
		r.Set("expires", dt)
	}
	if err := app.Save(r); err != nil {
		t.Fatal(err)
	}
	return "ph_pat_" + r.Id + "_" + secret, r.Id
}

func rowGone(app core.App, id string) bool {
	_, err := app.FindRecordById("api_tokens", id)
	return err != nil
}

func TestImportLegacyToken(t *testing.T) {
	app, tk, u := tokensApp(t)
	a, b := newInstance(t, app, u.Id), newInstance(t, app, u.Id)
	gone := "zzzzzzzzzzzzzzz" // an instance that was deleted

	t.Run("write on every instance", func(t *testing.T) {
		pat, row := newPAT(t, app, u.Id, []string{"read", "write"}, true, nil, time.Time{})
		if err := importLegacyToken(app, tk, pat); err != nil {
			t.Fatal(err)
		}
		info, err := tk.Verify(pat)
		if err != nil {
			t.Fatalf("Verify after import: %v", err)
		}
		if info.Owner.Id != u.Id || !slices.Equal(info.Scopes, []string{"instances"}) || info.Token.GetString("name") != "ci" {
			t.Fatalf("imported as %s %v %q", info.Owner.Id, info.Scopes, info.Token.GetString("name"))
		}
		if !rowGone(app, row) {
			t.Fatal("the api_tokens row should be deleted")
		}
		if err := importLegacyToken(app, tk, pat); err != nil { // its next check: already imported
			t.Fatal(err)
		}
	})

	t.Run("read on some instances, deleted ones dropped", func(t *testing.T) {
		pat, _ := newPAT(t, app, u.Id, []string{"read"}, false, []string{a, gone, b}, time.Now().Add(48*time.Hour))
		if err := importLegacyToken(app, tk, pat); err != nil {
			t.Fatal(err)
		}
		info, err := tk.Verify(pat)
		if err != nil {
			t.Fatal(err)
		}
		want := []string{"instances:read=" + a, "instances:read=" + b}
		slices.Sort(want)
		if !slices.Equal(info.Scopes, want) {
			t.Fatalf("scopes = %v, want %v", info.Scopes, want)
		}
		if info.Token.GetDateTime("expires").IsZero() {
			t.Fatal("the expiry should carry over")
		}
	})

	for name, c := range map[string]struct {
		scopes    []string
		all       bool
		instances []string
		expires   time.Time
		mangle    func(string) string
	}{
		"wrong secret":        {scopes: []string{"write"}, all: true, mangle: func(s string) string { return s[:len(s)-1] + "Q" }},
		"expired":             {scopes: []string{"write"}, instances: []string{a}, expires: time.Now().Add(-time.Hour)},
		"only gone instances": {scopes: []string{"write"}, instances: []string{gone}},
	} {
		t.Run(name, func(t *testing.T) {
			expires := c.expires
			pat, row := newPAT(t, app, u.Id, c.scopes, c.all, c.instances, time.Time{})
			if !expires.IsZero() { // saved directly: newPAT can't write a past expiry through a fresh secret
				r, _ := app.FindRecordById("api_tokens", row)
				dt, _ := types.ParseDateTime(expires.UTC())
				r.Set("expires", dt)
				if err := app.Save(r); err != nil {
					t.Fatal(err)
				}
			}
			if c.mangle != nil {
				pat = c.mangle(pat)
			}
			if err := importLegacyToken(app, tk, pat); err != nil {
				t.Fatal(err)
			}
			if _, err := tk.Verify(pat); err == nil {
				t.Fatal("should not have been imported")
			}
			if rowGone(app, row) {
				t.Fatal("the api_tokens row should stay")
			}
		})
	}

	if err := importLegacyToken(app, tk, "pbt_"+strings.Repeat("a", 40)); err != nil {
		t.Fatal("a pbt_ token is not ours to import:", err)
	}
}

func TestTokensNeedAScope(t *testing.T) {
	app, tk, u := tokensApp(t)
	if _, _, err := tk.Create(u, apitokens.CreateOptions{Name: "everything"}); err == nil {
		t.Fatal("a token without scopes would have full rights on the mothership")
	}
	if _, _, err := tk.Create(u, apitokens.CreateOptions{Name: "ci", Scopes: []string{"instances:read"}}); err != nil {
		t.Fatal(err)
	}
	id := newInstance(t, app, u.Id)
	if _, _, err := tk.Create(u, apitokens.CreateOptions{Scopes: []string{"instances=" + id}}); err != nil {
		t.Fatal(err)
	}
	if _, _, err := tk.Create(u, apitokens.CreateOptions{Scopes: []string{"instances=someoneelses1234"}}); err == nil {
		t.Fatal("a token for an instance the owner doesn't have")
	}
}
