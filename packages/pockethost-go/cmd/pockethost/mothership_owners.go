package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"ganigeorgiev.com/pocketbase/dbx"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
)

// What an instance gets from its owner, resolved here so edges never read users: the instance's hidden fields
// blocked, superusers, trusted_ips and owners (migration 1795800000_instance_owner_fields). They're written in the
// instance's own save, rewritten on each of a user's instances when that user changes, and checked once at serve.
const (
	fieldBlocked    = "blocked"
	fieldSuperusers = "superusers"
	fieldTrustedIPs = "trusted_ips"
	fieldOwners     = "owners"
)

// ownerBlock is why an instance doesn't run, decided by its owner's account.
type ownerBlock struct {
	Status  int    `json:"status"`
	Message string `json:"message"`
}

// ownerLogin is the owner's login, synced into the instance as a superuser (syncAdmin).
type ownerLogin struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	TokenKey     string `json:"tokenKey"`
	PasswordHash string `json:"passwordHash"`
}

// ownerFields are an instance's owner-derived values.
type ownerFields struct {
	Blocked    *ownerBlock
	Superusers []ownerLogin
	TrustedIPs json.RawMessage
	Owners     []string
}

// userOwnerFields are the users fields resolveOwner reads; a change to any of them rewrites the user's instances.
var userOwnerFields = []string{"suspension", "subscription_quantity", "verified", "trusted_ips", "email", "tokenKey", "password:hash"}

// resolveOwner works out inst's owner-derived values from owner (nil: no owner, or it's gone). The order of the
// blocks is the edge's from before: suspended, then no paid instances, then not verified.
func resolveOwner(inst, owner *core.Record, appURL string) ownerFields {
	if owner == nil {
		return ownerFields{Blocked: &ownerBlock{Status: http.StatusForbidden, Message: "This instance has no owner."},
			Owners: []string{}, Superusers: []ownerLogin{}}
	}
	f := ownerFields{Owners: []string{owner.Id}, Superusers: []ownerLogin{}}
	if raw := strings.TrimSpace(owner.GetString("trusted_ips")); raw != "" && raw != "null" {
		f.TrustedIPs = json.RawMessage(raw)
	}
	switch {
	case strings.TrimSpace(owner.GetString("suspension")) != "":
		f.Blocked = &ownerBlock{Status: http.StatusForbidden, Message: owner.GetString("suspension")}
	case owner.GetInt("subscription_quantity") == 0:
		f.Blocked = &ownerBlock{Status: http.StatusPaymentRequired,
			Message: fmt.Sprintf("Instances will not run until you <a href=%s/access>upgrade</a>", appURL)}
	case !owner.Verified():
		f.Blocked = &ownerBlock{Status: http.StatusForbidden, Message: fmt.Sprintf("Log in at %s to verify your account.", appURL)}
	}
	if inst.GetBool("syncAdmin") {
		if hash := owner.GetString("password:hash"); hash != "" && owner.Email() != "" {
			f.Superusers = []ownerLogin{{ID: owner.Id, Email: owner.Email(), TokenKey: owner.TokenKey(), PasswordHash: hash}}
		}
	}
	return f
}

// ownerJSON is f as the four fields' JSON.
func ownerJSON(f ownerFields) map[string]string {
	enc := func(v any) string { b, _ := json.Marshal(v); return string(b) }
	trusted := "null"
	if f.TrustedIPs != nil {
		trusted = string(compactJSON(string(f.TrustedIPs)))
	}
	return map[string]string{fieldBlocked: enc(f.Blocked), fieldSuperusers: enc(f.Superusers),
		fieldTrustedIPs: trusted, fieldOwners: enc(f.Owners)}
}

// ownerDiff is the fields of f that differ from what inst holds.
func ownerDiff(inst *core.Record, f ownerFields) map[string]string {
	diff := map[string]string{}
	for field, next := range ownerJSON(f) {
		if !bytes.Equal(compactJSON(inst.GetString(field)), compactJSON(next)) {
			diff[field] = next
		}
	}
	return diff
}

// applyOwner writes f on inst and reports whether anything changed.
func applyOwner(inst *core.Record, f ownerFields) bool {
	diff := ownerDiff(inst, f)
	for field, next := range diff {
		inst.Set(field, json.RawMessage(next))
	}
	return len(diff) > 0
}

// compactJSON normalizes a JSON value for comparison ("" and "null" are the same).
func compactJSON(s string) []byte {
	s = strings.TrimSpace(s)
	if s == "" {
		return []byte("null")
	}
	var b bytes.Buffer
	if json.Compact(&b, []byte(s)) != nil {
		return []byte(s)
	}
	return b.Bytes()
}

// mothershipAppURL is the dashboard's URL for blocked messages: APP_URL, else the app's own URL setting.
func mothershipAppURL(app core.App) string {
	if v := strings.TrimRight(os.Getenv("APP_URL"), "/"); v != "" {
		return v
	}
	return strings.TrimRight(app.Settings().Meta.AppURL, "/")
}

// findOwner is inst's owner record, or nil.
func findOwner(app core.App, inst *core.Record) *core.Record {
	uid := inst.GetString("uid")
	if uid == "" {
		return nil
	}
	u, err := app.FindRecordById("users", uid)
	if err != nil {
		return nil
	}
	return u
}

// registerOwnerFields keeps every instance's owner-derived fields current.
func registerOwnerFields(app core.App) {
	resolve := func(e *core.RecordEvent) error {
		applyOwner(e.Record, resolveOwner(e.Record, findOwner(e.App, e.Record), mothershipAppURL(e.App)))
		return e.Next()
	}
	app.OnRecordCreate("instances").BindFunc(resolve)
	app.OnRecordUpdate("instances").BindFunc(resolve)

	app.OnRecordAfterUpdateSuccess("users").BindFunc(func(e *core.RecordEvent) error {
		if ownerFieldsChanged(e.Record) {
			if n, err := refreshOwnerInstances(e.App, e.Record); err != nil {
				e.App.Logger().Error("mothership: rewrite the owner's instances", "user", e.Record.Id, "error", err)
			} else if n > 0 {
				e.App.Logger().Debug("mothership: owner changed; instances rewritten", "user", e.Record.Id, "instances", n)
			}
		}
		return e.Next()
	})
	// a deleted owner leaves its instances (if any survive the cascade) blocked
	app.OnRecordAfterDeleteSuccess("users").BindFunc(func(e *core.RecordEvent) error {
		if _, err := refreshOwnerInstances(e.App, nil, e.Record.Id); err != nil {
			e.App.Logger().Error("mothership: block the deleted owner's instances", "user", e.Record.Id, "error", err)
		}
		return e.Next()
	})
}

func ownerFieldsChanged(u *core.Record) bool {
	o := u.Original()
	for _, f := range userOwnerFields {
		if fmt.Sprint(o.Get(f)) != fmt.Sprint(u.Get(f)) {
			return true
		}
	}
	return false
}

// refreshOwnerInstances rewrites the owner-derived fields of owner's instances (uid given when owner is nil) and
// saves the ones that changed, so edges get them as instance updates. It returns how many it saved.
func refreshOwnerInstances(app core.App, owner *core.Record, uid ...string) (int, error) {
	id := ""
	if owner != nil {
		id = owner.Id
	} else if len(uid) > 0 {
		id = uid[0]
	}
	if id == "" {
		return 0, nil
	}
	insts, err := app.FindAllRecords("instances", dbx.HashExp{"uid": id})
	if err != nil {
		return 0, err
	}
	appURL, n := mothershipAppURL(app), 0
	for _, inst := range insts {
		if !applyOwner(inst, resolveOwner(inst, owner, appURL)) {
			continue
		}
		if err := app.SaveNoValidate(inst); err != nil {
			return n, err
		}
		n++
	}
	return n, nil
}

// syncOwnerFields checks every instance's owner-derived fields and writes the ones that drifted, in one transaction.
// It runs at serve before the server listens and writes the columns directly (no record hooks, no realtime): no edge
// is subscribed yet, the first deploy's backfill (every instance) reaches the edges through their dump, and the
// mothership's JS instance hooks don't run 20k times on its one VM.
func syncOwnerFields(app core.App) (checked, saved int, err error) {
	users, err := app.FindAllRecords("users")
	if err != nil {
		return 0, 0, err
	}
	byID := make(map[string]*core.Record, len(users))
	for _, u := range users {
		byID[u.Id] = u
	}
	insts, err := app.FindAllRecords("instances")
	if err != nil {
		return 0, 0, err
	}
	appURL := mothershipAppURL(app)
	err = app.RunInTransaction(func(tx core.App) error {
		for _, inst := range insts {
			checked++
			diff := ownerDiff(inst, resolveOwner(inst, byID[inst.GetString("uid")], appURL))
			if len(diff) == 0 {
				continue
			}
			params := dbx.Params{}
			for field, v := range diff {
				params[field] = v
			}
			if _, err := tx.DB().Update("instances", params, dbx.HashExp{"id": inst.Id}).Execute(); err != nil {
				return fmt.Errorf("instance %s: %w", inst.Id, err)
			}
			saved++
		}
		return nil
	})
	return checked, saved, err
}

// syncOwnerFieldsAtServe is syncOwnerFields with a log line; a failure is logged, not fatal (the hooks still keep
// every instance that changes current).
func syncOwnerFieldsAtServe(app core.App) {
	t0 := time.Now()
	checked, saved, err := syncOwnerFields(app)
	if err != nil {
		log.Printf("owner fields: sync failed after %s: %v", time.Since(t0).Round(time.Millisecond), err)
		return
	}
	log.Printf("owner fields: %d instances checked, %d updated (%s)", checked, saved, time.Since(t0).Round(time.Millisecond))
}
