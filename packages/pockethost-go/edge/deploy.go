package edge

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"slices"
	"strconv"
	"strings"

	apitokensv1 "pocketone.dev/ext/contracts/api-tokens/v1"
	verifyv1 "pocketone.dev/ext/contracts/api-tokens/verify/v1"
	"pocketone.dev/ext/deploy"
	"pocketone.dev/ext/extkit"
)

// The mothership's API token scopes for PocketHost instances. Their values are instance ids: "instances=abc123"
// covers one instance, the bare name every instance the owner has.
const (
	ScopeInstances     = "instances"      // deploy, read files and logs, restart
	ScopeInstancesRead = "instances:read" // read files and logs
)

// DeployBackend is PocketOne's deploy API backend (ext/deploy) for the edge's instances: which instance a host names
// (from the mirror) and who a request acts as (the instance owner's PocketHost API token or dashboard login, checked
// by the mothership). It also authenticates the edge's remote/v1 ([DeployBackend.ContractAuth]).
type DeployBackend struct {
	s      *Source
	tokens *authResolver
}

// DeployBackend returns the edge's deploy backend.
func (s *Source) DeployBackend() *DeployBackend {
	b := &DeployBackend{s: s}
	b.tokens = newAuthResolver(b)
	return b
}

// Lookup finds the instance a request's host names.
func (b *DeployBackend) Lookup(r *http.Request) (deploy.Instance, bool) {
	return b.lookupHost(hostOf(r))
}

func (b *DeployBackend) lookupHost(host string) (deploy.Instance, bool) {
	s := b.s
	host = strings.TrimSuffix(strings.ToLower(strings.TrimSpace(host)), ".")
	s.mu.Lock()
	defer s.mu.Unlock()
	id, ok := s.claims[host]
	if !ok {
		return deploy.Instance{}, false
	}
	inst, ok := s.instances[id]
	if !ok {
		return deploy.Instance{}, false
	}
	out := deploy.Instance{ID: inst.ID, Subdomain: inst.Subdomain, Power: inst.Power, Suspension: inst.Suspension}
	if len(inst.Owners) > 0 {
		out.OwnerID = inst.Owners[0]
	}
	if inst.Blocked != nil && inst.Blocked.Status != 0 {
		out.OwnerSuspension = inst.Blocked.Message // ext/deploy refuses with this message (403)
	}
	if !isMine(inst, s.myEdge, s.cfg.EdgeID) {
		out.Elsewhere = host + " is served by another PocketHost edge"
	}
	return out, true
}

// Authenticate says who the request acts as on inst: its owner, through a token that covers the instance (read, or
// read and write) or a dashboard login (both). Anyone else gets deploy.ErrNoAccess (404), so tokens can't probe
// instance names.
func (b *DeployBackend) Authenticate(r *http.Request, inst deploy.Instance) (deploy.Auth, error) {
	a, err := b.tokens.resolve(r.Context(), r.Header.Get("Authorization"), clientIP(r), false)
	if err != nil {
		return deploy.Auth{}, err
	}
	// the token's instances may have just been edited in the dashboard: re-check before refusing
	if a.Via == "token" && inst.OwnerID == a.UserID && !a.allows(inst.ID, inst.OwnerID) {
		if a, err = b.tokens.resolve(r.Context(), r.Header.Get("Authorization"), clientIP(r), true); err != nil {
			return deploy.Auth{}, err
		}
	}
	if !a.allows(inst.ID, inst.OwnerID) {
		return deploy.Auth{}, deploy.ErrNoAccess
	}
	scopes := []string{"read"}
	if a.canWrite(inst.ID) {
		scopes = deploy.ReadWrite
	}
	return deploy.Auth{UserID: a.UserID, Scopes: scopes, Via: a.Via, TokenLabel: a.TokenLabel}, nil
}

// ContractAuth authenticates a request for the PocketOne contracts the edge answers for its instances (remote/v1:
// whoami, status, restart, logs), as a deploy is checked: a token with write access may restart, a read-only one may
// read. Anyone else, and any instance that is blocked, suspended or on another edge, is anonymous, so the contract
// refuses them.
func (b *DeployBackend) ContractAuth(r *http.Request) extkit.Auth {
	inst, ok := b.Lookup(r)
	if !ok || strings.TrimSpace(inst.OwnerSuspension) != "" || strings.TrimSpace(inst.Suspension) != "" || inst.Elsewhere != "" {
		return extkit.Auth{}
	}
	a, err := b.Authenticate(r, inst)
	if err != nil {
		return extkit.Auth{}
	}
	au := extkit.Auth{Kind: "record", ID: a.UserID, Collection: "users", RecordID: a.UserID}
	if a.Via == "token" {
		au.Kind, au.ID = "token", a.TokenLabel
		au.Scopes = []string{"remote:read"}
		if slices.Contains(a.Scopes, "write") {
			au.Scopes = append(au.Scopes, "remote")
		}
	}
	return au
}

// authFailure maps a refused token (400/401/403/404 from the mothership) to the deploy API's 401/403; anything else
// is an outage and stays an error.
func authFailure(err error, fallback string) error {
	var se *statusError
	if errors.As(err, &se) && (se.Status == 400 || se.Status == 401 || se.Status == 403 || se.Status == 404) {
		status := http.StatusUnauthorized
		if se.Status == http.StatusForbidden {
			status = http.StatusForbidden
		}
		msg := se.message()
		if msg == "" {
			msg = fallback
		}
		return &deploy.AuthError{Status: status, Message: msg}
	}
	return err
}

// VerifyToken asks the mothership about an API token (api-tokens.verify/v1), as superuser. A token it refuses is an
// *AuthError; an unreachable mothership stays an error.
func (b *DeployBackend) VerifyToken(ctx context.Context, token, ip string) (apitokensv1.Grant, error) {
	for attempt := 0; attempt < 2; attempt++ {
		su, err := b.s.c.auth(ctx)
		if err != nil {
			return apitokensv1.Grant{}, err
		}
		res, err := verifyv1.NewClient(b.s.c.base, su, b.s.c.http).Verify(ctx, extkit.Auth{}, verifyv1.Input{Token: token, IP: ip})
		var ce *extkit.Error
		if errors.As(err, &ce) && ce.Status == http.StatusUnauthorized && attempt == 0 {
			b.s.c.resetToken() // the edge's own login expired
			continue
		}
		if err != nil {
			return apitokensv1.Grant{}, err
		}
		if !res.Valid || res.Grant == nil {
			msg := "Invalid or expired token."
			if res.Reason == verifyv1.Expired {
				msg = "This token has expired. Create a new one in the dashboard."
			}
			return apitokensv1.Grant{}, &deploy.AuthError{Status: http.StatusUnauthorized, Message: msg}
		}
		return *res.Grant, nil
	}
	return apitokensv1.Grant{}, errors.New("mothership: unauthorized")
}

// VerifyJWT refreshes the user's own PocketBase token (as that user, not as superuser).
func (b *DeployBackend) VerifyJWT(ctx context.Context, token string) (string, error) {
	const path = "/api/collections/users/auth-refresh"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, b.s.c.base+path, bytes.NewReader(nil))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", token)
	res, err := b.s.c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode >= 300 {
		return "", authFailure(&statusError{Method: http.MethodPost, Path: path, Status: res.StatusCode, Body: body},
			"Your login has expired. Run 'pockethost login' or use a token.")
	}
	var out struct {
		Record struct {
			ID string `json:"id"`
		} `json:"record"`
	}
	if err := json.Unmarshal(body, &out); err != nil || out.Record.ID == "" {
		return "", errors.New("mothership: unexpected auth-refresh answer")
	}
	return out.Record.ID, nil
}

func hostOf(r *http.Request) string {
	h := strings.ToLower(r.Host)
	if i := strings.LastIndexByte(h, ':'); i >= 0 && !strings.Contains(h[i:], "]") {
		if _, err := strconv.Atoi(h[i+1:]); err == nil {
			h = h[:i]
		}
	}
	return h
}

// clientIP: the edge sits behind Cloudflare (and possibly a proxy), so the peer address is rarely the client. The
// mothership checks it against a token's allowed IPs.
func clientIP(r *http.Request) string {
	if v := strings.TrimSpace(r.Header.Get("Cf-Connecting-Ip")); v != "" {
		return v
	}
	if v := strings.TrimSpace(strings.Split(r.Header.Get("X-Forwarded-For"), ",")[0]); v != "" {
		return v
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// PlatformPaths are the Node edge's platform hooks and migrations (packages/server/src/instance-app), bind-mounted
// into every container; Docker left an empty placeholder at each in the instance folder. They aren't the customer's,
// so deploys never compare or delete them (an instance moved from a Docker edge may still have them).
var PlatformPaths = []string{
	"pb_hooks/_ph_admin_sync.pb.js",
	"pb_hooks/_ph_backup.pb.js",
	"pb_hooks/_ph_lib.js",
	"pb_migrations/1699198734_pockethost_defaults.js",
	"pb_migrations/1794167719_pockethost_app_url.js",
}
