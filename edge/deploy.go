package edge

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/pockethost/pocker/deploy"
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
	out := deploy.Instance{ID: inst.ID, Subdomain: inst.Subdomain, OwnerID: inst.UID, Power: inst.Power, Suspension: inst.Suspension}
	if u, ok := s.users[inst.UID]; ok {
		out.OwnerSuspension = u.Suspension
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

func (b deployBackend) VerifyPAT(ctx context.Context, token, ip string) (deploy.PATResult, error) {
	var out deploy.PATResult
	err := b.s.c.do(ctx, http.MethodPost, "/api/pat/verify", map[string]string{"token": token, "ip": ip}, &out)
	if err != nil {
		return out, authFailure(err, "Invalid or expired token.")
	}
	return out, nil
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

func (b deployBackend) RecordDeploy(ctx context.Context, rec deploy.DeployRecord) (string, error) {
	var out struct {
		ID string `json:"id"`
	}
	err := b.s.c.do(ctx, http.MethodPost, "/api/collections/deploys/records", rec, &out)
	return out.ID, err
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
