package deploy

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
)

// Auth is who a deploy request acts as.
type Auth struct {
	UserID string
	// Scopes are an API token's scopes (api-tokens/v1: "instances", "instances:read=<id>", ...); nil means every scope
	// (a dashboard login, or a token with no scopes).
	Scopes     []string
	Via        string // "token" or "jwt"
	TokenLabel string
}

// The mothership's API token scopes for PocketHost instances. Their values are instance ids: "instances=abc123"
// covers one instance, the bare name every instance the owner has.
const (
	ScopeInstances     = "instances"      // deploy, read files and logs, restart
	ScopeInstancesRead = "instances:read" // read files and logs
)

// allows: the caller owns the instance and its token covers it (read or write).
func (a Auth) allows(instanceID, ownerID string) bool {
	if a.UserID != ownerID {
		return false
	}
	return apitokensv1.HoldsScope(a.Scopes, apitokensv1.JoinScope(ScopeInstances, instanceID)) ||
		apitokensv1.HoldsScope(a.Scopes, apitokensv1.JoinScope(ScopeInstancesRead, instanceID))
}

// canWrite: the token may change the instance (deploy, restart).
func (a Auth) canWrite(instanceID string) bool {
	return apitokensv1.HoldsScope(a.Scopes, apitokensv1.JoinScope(ScopeInstances, instanceID))
}

// access is what the caller may do on the instance, as whoami shows it: ["read"] or ["read", "write"].
func (a Auth) access(instanceID string) []string {
	if a.canWrite(instanceID) {
		return []string{"read", "write"}
	}
	return []string{"read"}
}

// AuthError is a token the mothership refused (401 or 403). Any other error from a verifier is an infrastructure
// failure: it isn't cached.
type AuthError struct {
	Status  int
	Message string
}

func (e *AuthError) Error() string { return e.Message }

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

func bearerToken(authorization string) string {
	m := bearerRE.FindStringSubmatch(strings.TrimSpace(authorization))
	if m == nil {
		return ""
	}
	return strings.TrimSpace(m[1])
}

type authEntry struct {
	at   time.Time
	auth Auth
	err  *AuthError
}

// authResolver resolves "Authorization: Bearer <API token or PocketBase JWT>". Results, failures included, are cached
// for 30 s, so a revoked token stops working within that window. fresh re-verifies an entry at least 2 s old (used
// when a cached token doesn't cover the instance, so a token made a moment ago works at once without flooding the
// mothership).
type authResolver struct {
	backend Backend
	now     func() time.Time

	mu    sync.Mutex
	cache map[string]authEntry
}

func newAuthResolver(b Backend) *authResolver {
	return &authResolver{backend: b, now: time.Now, cache: map[string]authEntry{}}
}

func (r *authResolver) resolve(ctx context.Context, authorization, ip string, fresh bool) (Auth, error) {
	token := bearerToken(authorization)
	if token == "" {
		return Auth{}, &AuthError{401, "Missing token. Set POCKETHOST_TOKEN or run 'pockethost token set'."}
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
			return Auth{}, hit.err
		}
		return hit.auth, nil
	}
	if len(r.cache) > 10_000 {
		clear(r.cache)
	}
	r.mu.Unlock()

	var entry authEntry
	if isAPIToken(token) {
		g, err := r.backend.VerifyToken(ctx, token, ip)
		if err != nil {
			var ae *AuthError
			if !errors.As(err, &ae) {
				return Auth{}, err // mothership unreachable: don't cache
			}
			entry.err = ae
		} else {
			scopes := g.Scopes
			if len(scopes) == 0 {
				scopes = nil // the owner's full rights
			}
			entry.auth = Auth{UserID: g.OwnerID, Scopes: scopes, Via: "token", TokenLabel: g.Name}
		}
	} else {
		uid, err := r.backend.VerifyJWT(ctx, token)
		if err != nil {
			var ae *AuthError
			if !errors.As(err, &ae) {
				return Auth{}, err
			}
			entry.err = ae
		} else {
			entry.auth = Auth{UserID: uid, Via: "jwt"}
		}
	}
	entry.at = r.now()
	r.mu.Lock()
	r.cache[key] = entry
	r.mu.Unlock()
	if entry.err != nil {
		return Auth{}, entry.err
	}
	return entry.auth, nil
}
