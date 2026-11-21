package edge

import (
	"context"
	"errors"
	"slices"
	"testing"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	apitokensv1 "pocketone.dev/ext/contracts/api-tokens/v1"
	verifyv1 "pocketone.dev/ext/contracts/api-tokens/verify/v1"
	tokensv1 "pocketone.dev/ext/contracts/instance/tokens/v1"
	"pocketone.dev/ext/deploy"
)

// fakeInstanceTokens stands in for the runtime's instance.tokens/v1: tokens the instance issued, by instance.
type fakeInstanceTokens struct {
	grants map[string]map[string]apitokensv1.Grant // instance -> secret -> grant
	asked  []string
	broken bool
}

func (f *fakeInstanceTokens) Verify(_ context.Context, in tokensv1.Input) (verifyv1.Result, error) {
	f.asked = append(f.asked, in.Token)
	if f.broken {
		return verifyv1.Result{}, errors.New("instance failed to start")
	}
	tokens, ok := f.grants[in.Instance]
	if !ok {
		return verifyv1.Result{}, tokensv1.ErrNoInstance
	}
	if g, ok := tokens[in.Token]; ok {
		return verifyv1.Result{Valid: true, Grant: &g}, nil
	}
	if in.Token == "pbt_inst_expired" {
		return verifyv1.Result{Reason: verifyv1.Expired}, nil
	}
	return verifyv1.Result{Reason: verifyv1.Invalid}, nil
}

func TestInstanceTokens(t *testing.T) {
	b, _ := newTestDeployBackend(t)
	su := core.CollectionNameSuperusers
	it := &fakeInstanceTokens{grants: map[string]map[string]apitokensv1.Grant{"aaaaaaaaaaaaaaa": {
		"pbt_inst_full":   {OwnerCollection: su, OwnerID: "su1", Name: "laptop"},
		"pbt_inst_deploy": {OwnerCollection: su, OwnerID: "su1", Scopes: []string{"deploy"}},
		"pbt_inst_ro":     {OwnerCollection: su, OwnerID: "su1", Scopes: []string{"deploy:read"}},
		"pbt_inst_other":  {OwnerCollection: su, OwnerID: "su1", Scopes: []string{"settings"}},
		"pbt_inst_user":   {OwnerCollection: "users", OwnerID: "u1"},
	}}}
	b.AcceptInstanceTokens(func() tokensv1.Tokens { return it })
	inst, _ := b.Lookup(deployReq("shop.pockethost.io", ""))
	auth := func(tok string) (deploy.Auth, error) {
		return b.Authenticate(deployReq("shop.pockethost.io", "Bearer "+tok), inst)
	}
	status := func(err error) int {
		var ae *deploy.AuthError
		if errors.As(err, &ae) {
			return ae.Status
		}
		return 0
	}

	for tok, want := range map[string][]string{"pbt_inst_full": deploy.ReadWrite, "pbt_inst_deploy": deploy.ReadWrite,
		"pbt_inst_ro": {"read"}} {
		a, err := auth(tok)
		if err != nil || a.UserID != "su1" || a.Via != "instance-token" || !slices.Equal(a.Scopes, want) {
			t.Errorf("%s: %+v %v", tok, a, err)
		}
	}
	if a, _ := auth("pbt_inst_full"); a.TokenLabel != "laptop" {
		t.Errorf("label: %q", a.TokenLabel)
	}
	for tok, want := range map[string]int{"pbt_inst_other": 403, "pbt_inst_user": 403, "pbt_nobody": 401, "pbt_inst_expired": 401} {
		if _, err := auth(tok); status(err) != want {
			t.Errorf("%s: %v, want %d", tok, err, want)
		}
	}

	// PocketHost's own tokens never reach the instance; neither do old ph_pat_ ones
	it.asked = nil
	if _, err := auth(tokFull); err != nil {
		t.Fatal(err)
	}
	if _, err := auth("ph_pat_nope"); status(err) != 401 {
		t.Fatalf("unknown ph_pat_: %v", err)
	}
	if len(it.asked) != 0 {
		t.Fatalf("asked the instance about %v", it.asked)
	}

	// answers are cached like the mothership's
	it.asked = nil
	auth("pbt_inst_full")
	if len(it.asked) != 0 {
		t.Fatalf("not cached: asked %v", it.asked)
	}

	// an instance that won't start is an outage, not a refusal
	it.broken = true
	if _, err := auth("pbt_inst_new"); err == nil || status(err) != 0 {
		t.Fatalf("broken instance: %v", err)
	}
	it.broken = false

	// an instance the runtime doesn't run (or without tokens): the mothership's refusal stands
	other, _ := b.Lookup(deployReq("held.pockethost.io", ""))
	if _, err := b.Authenticate(deployReq("held.pockethost.io", "Bearer pbt_inst_full"), other); status(err) != 401 {
		t.Fatalf("no instance tokens: %v", err)
	}

	// remote/v1: a read-only instance token may read, not restart
	au := b.ContractAuth(deployReq("shop.pockethost.io", "Bearer pbt_inst_ro"))
	if au.Kind != "token" || !slices.Equal(au.Scopes, []string{"remote:read"}) {
		t.Fatalf("contract auth: %+v", au)
	}
}

// Without AcceptInstanceTokens (a docker edge), instance tokens get the mothership's refusal.
func TestInstanceTokensOff(t *testing.T) {
	b, _ := newTestDeployBackend(t)
	inst, _ := b.Lookup(deployReq("shop.pockethost.io", ""))
	var ae *deploy.AuthError
	if _, err := b.Authenticate(deployReq("shop.pockethost.io", "Bearer pbt_inst_full"), inst); !errors.As(err, &ae) || ae.Status != 401 {
		t.Fatalf("%v", err)
	}
}
