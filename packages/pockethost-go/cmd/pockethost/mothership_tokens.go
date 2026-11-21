package main

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"regexp"
	"slices"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"github.com/pockethost/pockethost/packages/pockethost-go/edge"
	apitokens "pocketone.dev/ext/api-tokens"
	apitokensv1 "pocketone.dev/ext/contracts/api-tokens/v1"
	verifyv1 "pocketone.dev/ext/contracts/api-tokens/verify/v1"
	"pocketone.dev/ext/extkit"
)

// legacyPrefix starts the personal access tokens the mothership issued before ext/api-tokens
// (`ph_pat_<record id>_<secret>`, rows of the api_tokens collection).
const legacyPrefix = "ph_pat_"

// registerTokens gives the mothership PocketHost's API tokens: ext/api-tokens (pbt_...), owned by users only, and
// the two scopes the dashboard creates them with. Their values are instance ids ("instances=abc123"); the bare name
// covers every instance the owner has. The scopes reach no route on the mothership itself: edges check a token
// with api-tokens.verify/v1 (as superuser) and apply the scopes to the instance a request is for.
//
// Old ph_pat_ tokens move over on their next use (their prefix is registered): the edge's verify call imports a valid one (checked against the
// api_tokens row, whose hash is of the secret part only) with the same rights, and deletes the row. Customers' CI
// secrets keep working unchanged.
func registerTokens(app core.App) *apitokens.Tokens {
	tk := apitokens.MustRegister(app, apitokens.Config{
		Collections: []string{"users"},
		OAuth:       apitokens.OAuthConfig{Disabled: true},
	})
	if err := tk.RegisterPrefix(legacyPrefix); err != nil {
		panic(err)
	}
	owns := func(owner *core.Record, id string) error {
		inst, err := app.FindRecordById("instances", id)
		if err != nil || inst.GetString("uid") != owner.Id {
			return errors.New("not one of your instances")
		}
		return nil
	}
	values := &apitokens.ScopeValues{Description: "an instance id", Check: owns}
	tk.MustRegisterScope(apitokens.Scope{Name: edge.ScopeInstances, Collections: []string{"users"}, Values: values,
		Description: "Deploy to your instances, read their files and logs, and restart them"})
	tk.MustRegisterScope(apitokens.Scope{Name: edge.ScopeInstancesRead, Collections: []string{"users"}, Values: values,
		Description: "Read your instances' files and logs"})

	// A token without scopes would have its owner's full rights on the mothership (billing, keys, other tokens):
	// PocketHost tokens always carry an instance scope.
	app.OnRecordCreate(apitokens.CollectionId).BindFunc(func(e *core.RecordEvent) error {
		if len(e.Record.GetStringSlice("scopes")) == 0 {
			return errors.New("choose what the token may do: instances or instances:read")
		}
		return e.Next()
	})

	verifyv1.OnVerify(app, func(e *extkit.CallEvent, in *verifyv1.Input) error {
		if err := importLegacyToken(app, tk, in.Token); err != nil {
			app.Logger().Warn("tokens: import a ph_pat_ token", "error", err)
		}
		return e.Next()
	})
	return tk
}

var legacyRE = regexp.MustCompile(`^ph_pat_([a-z0-9]{15})_([0-9A-Za-z]{43})$`)

// importLegacyToken moves a valid, not yet imported ph_pat_ token onto ext/api-tokens and deletes its api_tokens row.
// Anything else (a pbt_ token, an imported one, an unknown or expired one) is left alone: verify then answers for it
// as usual. An error is only a failure to import a token that checked out.
func importLegacyToken(app core.App, tk *apitokens.Tokens, secret string) error {
	m := legacyRE.FindStringSubmatch(secret)
	if m == nil {
		return nil
	}
	if _, err := tk.Verify(secret); !errors.Is(err, apitokens.ErrInvalid) {
		return nil // already imported (or expired there)
	}
	row, err := app.FindRecordById("api_tokens", m[1])
	if err != nil {
		return nil
	}
	sum := sha256.Sum256([]byte(m[2]))
	if subtle.ConstantTimeCompare([]byte(row.GetString("secret_hash")), []byte(hex.EncodeToString(sum[:]))) != 1 {
		return nil
	}
	opts := apitokens.CreateOptions{Name: row.GetString("label")}
	if exp := row.GetDateTime("expires"); !exp.IsZero() {
		if !exp.Time().After(time.Now()) {
			return nil
		}
		opts.Expires = exp.Time()
	}
	owner, err := app.FindRecordById("users", row.GetString("user"))
	if err != nil {
		return nil
	}
	scopes, ok := legacyScopes(app, owner, row)
	if !ok {
		return nil // limited to instances the owner no longer has: nothing to carry over
	}
	opts.Scopes = scopes
	if _, err := tk.Import(owner, secret, opts); err != nil {
		return err
	}
	return app.Delete(row)
}

// legacyScopes maps a ph_pat_ token's rights onto the instance scopes: "write" became "instances", "read" alone
// "instances:read"; a token for some instances gets one value per instance the owner still has. ok is false when
// none is left (an empty scope list would mean the owner's full rights).
func legacyScopes(app core.App, owner *core.Record, row *core.Record) (scopes []string, ok bool) {
	name := edge.ScopeInstancesRead
	if slices.Contains(row.GetStringSlice("scopes"), "write") {
		name = edge.ScopeInstances
	}
	if row.GetBool("all_instances") {
		return []string{name}, true
	}
	for _, id := range row.GetStringSlice("instances") {
		inst, err := app.FindRecordById("instances", id)
		if err == nil && inst.GetString("uid") == owner.Id {
			scopes = append(scopes, apitokensv1.JoinScope(name, id))
		}
	}
	return scopes, len(scopes) > 0
}
