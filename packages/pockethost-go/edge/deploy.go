package edge

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/pockethost/pockethost/packages/pockethost-go/deploy"
	apitokensv1 "pocketone.dev/ext/contracts/api-tokens/v1"
	verifyv1 "pocketone.dev/ext/contracts/api-tokens/verify/v1"
	"pocketone.dev/ext/extkit"
)

// DeployBackend answers the deploy API's questions from the mirror and the mothership: which instance a host names,
// whose tokens are valid, and where deploy history goes.
func (s *Source) DeployBackend() deploy.Backend { return deployBackend{s} }

type deployBackend struct{ s *Source }

func (b deployBackend) Lookup(host string) (deploy.Instance, bool) {
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
		out.Blocked = inst.Blocked.Message
	}
	if !isMine(inst, s.myEdge, s.cfg.EdgeID) {
		out.Elsewhere = host + " is served by another PocketHost edge"
	}
	return out, true
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
func (b deployBackend) VerifyToken(ctx context.Context, token, ip string) (apitokensv1.Grant, error) {
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
func (b deployBackend) VerifyJWT(ctx context.Context, token string) (string, error) {
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
