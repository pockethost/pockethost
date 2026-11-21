package edge

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"regexp"
	"strings"
	"sync"
	"time"

	apitokensv1 "pocketone.dev/ext/contracts/api-tokens/v1"
	"pocketone.dev/ext/deploy"
)

// tokenAuth is who a request's credential belongs to, before it is checked against an instance.
type tokenAuth struct {
	UserID string
	// Scopes are an API token's scopes (api-tokens/v1: "instances", "instances:read=<id>", ...); nil means every scope
	// (a dashboard login, or a token with no scopes).
	Scopes     []string
	Via        string // "token" or "jwt"
	TokenLabel string
}

// allows: the caller owns the instance and its token covers it (read or write).
func (a tokenAuth) allows(instanceID, ownerID string) bool {
	if a.UserID == "" || a.UserID != ownerID {
		return false
	}
	return apitokensv1.HoldsScope(a.Scopes, apitokensv1.JoinScope(ScopeInstances, instanceID)) ||
		apitokensv1.HoldsScope(a.Scopes, apitokensv1.JoinScope(ScopeInstancesRead, instanceID))
}

// canWrite: the token may change the instance (deploy, restart).
func (a tokenAuth) canWrite(instanceID string) bool {
	return apitokensv1.HoldsScope(a.Scopes, apitokensv1.JoinScope(ScopeInstances, instanceID))
}

// tokenVerifier checks credentials with the mothership. Both return *deploy.AuthError for a refused credential; any
// other error is an outage.
type tokenVerifier interface {
	VerifyToken(ctx context.Context, token, ip string) (apitokensv1.Grant, error)
	VerifyJWT(ctx context.Context, token string) (userID string, err error)
}

// tokenPrefixes start the API token secrets the mothership checks (ext/api-tokens): its own pbt_ tokens, and the
// ph_pat_ tokens it issued before, which it imports on their first check.
var tokenPrefixes = []string{"pbt_", "ph_pat_"}

func isAPIToken(token string) bool {
	for _, p := range tokenPrefixes {
		if strings.HasPrefix(token, p) {
			return true
		}
	}
	return false
}

const (
	authCacheTTL    = 30 * time.Second
	authFreshMinAge = 2 * time.Second
)

var bearerRE = regexp.MustCompile(`(?i)^Bearer\s+(.+)$`)

// bearerToken is the token in an Authorization header: "Bearer <token>", or the bare token, as PocketBase takes it
// (PocketOne's generated contract clients, such as `pocketone remote status`, send it bare).
func bearerToken(authorization string) string {
	a := strings.TrimSpace(authorization)
	if m := bearerRE.FindStringSubmatch(a); m != nil {
		return strings.TrimSpace(m[1])
	}
	if strings.ContainsAny(a, " \t") {
		return "" // another scheme (Basic ...)
	}
	return a
}

type authEntry struct {
	at   time.Time
	auth tokenAuth
	err  *deploy.AuthError
}

// authResolver resolves "Authorization: Bearer <API token or PocketBase JWT>". Results, failures included, are cached
// for 30 s, so a revoked token stops working within that window. fresh re-verifies an entry at least 2 s old (used
// when a cached token doesn't cover the instance, so a token made a moment ago works at once without flooding the
// mothership).
type authResolver struct {
	verifier tokenVerifier
	now      func() time.Time

	mu    sync.Mutex
	cache map[string]authEntry
}

func newAuthResolver(v tokenVerifier) *authResolver {
	return &authResolver{verifier: v, now: time.Now, cache: map[string]authEntry{}}
}

func (r *authResolver) resolve(ctx context.Context, authorization, ip string, fresh bool) (tokenAuth, error) {
	token := bearerToken(authorization)
	if token == "" {
		return tokenAuth{}, &deploy.AuthError{Status: 401, Message: "Missing token. Run 'pocketone login' or set P1_TOKEN."}
	}
	sum := sha256.Sum256([]byte(token))
	key := hex.EncodeToString(sum[:])
	maxAge := authCacheTTL
	if fresh {
		maxAge = authFreshMinAge
	}
	r.mu.Lock()
	hit, ok := r.cache[key]
	if ok && r.now().Sub(hit.at) < maxAge {
		r.mu.Unlock()
		if hit.err != nil {
			return tokenAuth{}, hit.err
		}
		return hit.auth, nil
	}
	if len(r.cache) > 10_000 {
		clear(r.cache)
	}
	r.mu.Unlock()

	var entry authEntry
	if isAPIToken(token) {
		g, err := r.verifier.VerifyToken(ctx, token, ip)
		if err != nil {
			var ae *deploy.AuthError
			if !errors.As(err, &ae) {
				return tokenAuth{}, err // mothership unreachable: don't cache
			}
			entry.err = ae
		} else {
			scopes := g.Scopes
			if len(scopes) == 0 {
				scopes = nil // the owner's full rights
			}
			entry.auth = tokenAuth{UserID: g.OwnerID, Scopes: scopes, Via: "token", TokenLabel: g.Name}
		}
	} else {
		uid, err := r.verifier.VerifyJWT(ctx, token)
		if err != nil {
			var ae *deploy.AuthError
			if !errors.As(err, &ae) {
				return tokenAuth{}, err
			}
			entry.err = ae
		} else {
			entry.auth = tokenAuth{UserID: uid, Via: "jwt"}
		}
	}
	entry.at = r.now()
	r.mu.Lock()
	r.cache[key] = entry
	r.mu.Unlock()
	if entry.err != nil {
		return tokenAuth{}, entry.err
	}
	return entry.auth, nil
}
