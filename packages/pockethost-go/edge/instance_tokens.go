package edge

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/http"
	"slices"
	"strings"
	"sync"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	verifyv1 "pocketone.dev/ext/contracts/api-tokens/verify/v1"
	tokensv1 "pocketone.dev/ext/contracts/instance/tokens/v1"
	"pocketone.dev/ext/deploy"
)

// instanceTokens accepts an instance's own API tokens on the routes the edge answers for it (deploy/v1, remote/v1),
// as a single PocketOne app accepts its own: `pocketone login` and `clone` sign in to the instance (its oauth/v1), so
// they work on PocketHost the same way. Only the instance's superusers' tokens count, with the same scopes as a single
// app's deploy API (none or deploy: read and write; deploy:read: read). The runtime checks them with the instance
// (instance.tokens/v1); a docker edge's runtime doesn't, so there only PocketHost's own credentials work.
type instanceTokens struct {
	tokens func() tokensv1.Tokens // nil, or returning nil: not on this edge
	now    func() time.Time

	mu    sync.Mutex
	cache map[string]instanceTokenEntry
}

type instanceTokenEntry struct {
	at   time.Time
	auth deploy.Auth
	err  error // *deploy.AuthError or deploy.ErrNoAccess; failures aren't cached
}

func newInstanceTokens(tokens func() tokensv1.Tokens) *instanceTokens {
	return &instanceTokens{tokens: tokens, now: time.Now, cache: map[string]instanceTokenEntry{}}
}

// authenticate checks token with inst's own API tokens. ok is false when it isn't one to ask the instance about (not
// a pbt_ token, no runtime that can, or the instance has no API tokens): the caller keeps its own answer.
func (t *instanceTokens) authenticate(ctx context.Context, inst deploy.Instance, token string) (a deploy.Auth, ok bool, err error) {
	if t == nil || t.tokens == nil || !strings.HasPrefix(token, "pbt_") {
		return deploy.Auth{}, false, nil
	}
	tk := t.tokens()
	if tk == nil {
		return deploy.Auth{}, false, nil
	}
	sum := sha256.Sum256([]byte(inst.ID + "\x00" + token))
	key := hex.EncodeToString(sum[:])
	t.mu.Lock()
	if hit, found := t.cache[key]; found && t.now().Sub(hit.at) < authCacheTTL {
		t.mu.Unlock()
		return hit.auth, true, hit.err
	}
	if len(t.cache) > 10_000 {
		clear(t.cache)
	}
	t.mu.Unlock()

	res, err := tk.Verify(ctx, tokensv1.Input{Instance: inst.ID, Token: token})
	if errors.Is(err, tokensv1.ErrNoInstance) {
		return deploy.Auth{}, false, nil
	}
	if err != nil {
		return deploy.Auth{}, true, err // the instance won't start: not a refusal, not cached
	}
	entry := instanceTokenEntry{at: t.now()}
	switch g := res.Grant; {
	case !res.Valid || g == nil:
		msg := "Invalid or expired token."
		if res.Reason == verifyv1.Expired {
			msg = "This token has expired. Sign in again: pocketone login <this URL>."
		}
		entry.err = &deploy.AuthError{Status: http.StatusUnauthorized, Message: msg}
	case g.OwnerCollection != core.CollectionNameSuperusers:
		entry.err = &deploy.AuthError{Status: http.StatusForbidden, Message: "Only the instance's superusers can use the deploy API."}
	case len(g.Scopes) == 0 || slices.Contains(g.Scopes, deploy.ScopeDeploy):
		entry.auth = deploy.Auth{UserID: g.OwnerID, Scopes: deploy.ReadWrite, Via: "instance-token", TokenLabel: g.Name}
	case slices.Contains(g.Scopes, deploy.ScopeRead):
		entry.auth = deploy.Auth{UserID: g.OwnerID, Scopes: []string{"read"}, Via: "instance-token", TokenLabel: g.Name}
	default:
		entry.err = &deploy.AuthError{Status: http.StatusForbidden, Message: "This API token has no deploy scope."}
	}
	t.mu.Lock()
	t.cache[key] = entry
	t.mu.Unlock()
	return entry.auth, true, entry.err
}
