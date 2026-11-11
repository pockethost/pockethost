package deploy

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"regexp"
	"slices"
	"strings"
	"sync"
	"time"
)

// Auth is who a deploy request acts as.
type Auth struct {
	UserID string
	Scopes []string // "read", "write"
	// InstanceIDs limits a token to some instances; nil = every instance the user owns.
	InstanceIDs []string
	Via         string // "pat" or "jwt"
	TokenLabel  string
}

func (a Auth) can(scope string) bool { return slices.Contains(a.Scopes, scope) }

// allows: the token covers this instance (same rule as the Node edge's instanceAllowedByScope).
func (a Auth) allows(instanceID, ownerID string) bool {
	if a.UserID != ownerID {
		return false
	}
	return a.InstanceIDs == nil || slices.Contains(a.InstanceIDs, instanceID)
}

// AuthError is a token the mothership refused (401 or 403). Any other error from a verifier is an infrastructure
// failure: it isn't cached.
type AuthError struct {
	Status  int
	Message string
}

func (e *AuthError) Error() string { return e.Message }

// PATResult is the mothership's /api/pat/verify answer.
type PATResult struct {
	TokenID     string   `json:"tokenId"`
	UserID      string   `json:"userId"`
	Label       string   `json:"label"`
	Scopes      []string `json:"scopes"`
	InstanceIDs []string `json:"instanceIds"`
}

const (
	patPrefix       = "ph_pat_"
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

// authResolver resolves "Authorization: Bearer <PAT or PocketBase JWT>". Results, failures included, are cached for
// 30 s, so a revoked token stops working within that window. fresh re-verifies an entry at least 2 s old (used when a
// cached PAT doesn't cover the instance, so widening a token takes effect at once without flooding the mothership).
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
	if strings.HasPrefix(token, patPrefix) {
		res, err := r.backend.VerifyPAT(ctx, token, ip)
		if err != nil {
			var ae *AuthError
			if !errors.As(err, &ae) {
				return Auth{}, err // mothership unreachable: don't cache
			}
			entry.err = ae
		} else {
			entry.auth = Auth{UserID: res.UserID, Scopes: res.Scopes, InstanceIDs: res.InstanceIDs, Via: "pat", TokenLabel: res.Label}
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
			entry.auth = Auth{UserID: uid, Scopes: []string{"read", "write"}, Via: "jwt"}
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
