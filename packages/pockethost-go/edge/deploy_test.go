package edge

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"pocketone.dev/ext/pocker"
	"strings"
	"testing"

	"github.com/pockethost/pockethost/packages/pockethost-go/deploy"
)

func TestDeployBackend(t *testing.T) {
	var recorded map[string]any
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/collections/_superusers/auth-with-password", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]string{"token": "TOKEN"})
	})
	mux.HandleFunc("POST /api/_c/api-tokens.verify/v1", func(w http.ResponseWriter, r *http.Request) {
		var in map[string]string
		_ = json.NewDecoder(r.Body).Decode(&in)
		switch {
		case r.Header.Get("Authorization") == "STALE":
			w.WriteHeader(401)
			_, _ = w.Write([]byte(`{"code":"unauthorized","message":"sign in first"}`))
		case r.Header.Get("Authorization") != "TOKEN":
			w.WriteHeader(403)
			_, _ = w.Write([]byte(`{"code":"forbidden","message":"only superusers may call this"}`))
		case in["token"] == "pbt_good" && in["ip"] == "1.2.3.4":
			_, _ = w.Write([]byte(`{"valid":true,"grant":{"tokenId":"t1","name":"CI","ownerCollection":"users","ownerId":"u1","scopes":["instances:read=aaaaaaaaaaaaaaa"]}}`))
		case in["token"] == "pbt_old":
			_, _ = w.Write([]byte(`{"valid":false,"reason":"expired"}`))
		case in["token"] == "pbt_boom":
			w.WriteHeader(502)
		default:
			_, _ = w.Write([]byte(`{"valid":false,"reason":"invalid"}`))
		}
	})
	mux.HandleFunc("POST /api/collections/users/auth-refresh", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "user-jwt" {
			w.WriteHeader(401)
			_, _ = w.Write([]byte(`{"status":401,"message":"The request requires valid record authorization token."}`))
			return
		}
		_, _ = w.Write([]byte(`{"token":"new","record":{"id":"u1"}}`))
	})
	mux.HandleFunc("POST /api/collections/deploys/records", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "TOKEN" {
			w.WriteHeader(401)
			return
		}
		_ = json.NewDecoder(r.Body).Decode(&recorded)
		_, _ = w.Write([]byte(`{"id":"dep123"}`))
	})
	ms := httptest.NewServer(mux)
	defer ms.Close()

	cfg := testCfg
	cfg.MothershipURL = ms.URL
	s := NewSource(cfg, slog.New(slog.NewTextHandler(io.Discard, nil)))
	s.loadDumpLocked(&dump{
		Instances: []instanceRec{
			{ID: "aaaaaaaaaaaaaaa", Subdomain: "shop", Owners: []string{"u1"}, Power: true, Edge: "E_SGP", Cname: "Shop.Example.com",
				Updated: "1", Blocked: &pocker.Blocked{Status: 403, Message: "account hold"}},
			{ID: "bbbbbbbbbbbbbbb", Subdomain: "far", Owners: []string{"u2"}, Edge: "E_AMS", Suspension: "x", Updated: "1"},
		},
		Edges: []edgeRec{{ID: "E_SGP", EdgeID: "sgp-1"}, {ID: "E_AMS", EdgeID: "ams-1"}},
	})
	b := s.DeployBackend()

	for _, h := range []string{"shop.pockethost.io", "aaaaaaaaaaaaaaa.pockethost.io", "shop.example.com", "SHOP.pockethost.io."} {
		got, ok := b.Lookup(h)
		want := deploy.Instance{ID: "aaaaaaaaaaaaaaa", Subdomain: "shop", OwnerID: "u1", Power: true, Blocked: "account hold"}
		if !ok || got != want {
			t.Errorf("%s: %+v %v", h, got, ok)
		}
	}
	if got, ok := b.Lookup("far.pockethost.io"); !ok || got.Elsewhere != "far.pockethost.io is served by another PocketHost edge" || got.Blocked != "" || got.Suspension != "x" {
		t.Errorf("other edge: %+v", got)
	}
	if _, ok := b.Lookup("nope.pockethost.io"); ok {
		t.Error("unknown host")
	}

	ctx := context.Background()
	if g, err := b.VerifyToken(ctx, "pbt_good", "1.2.3.4"); err != nil || g.OwnerID != "u1" || g.Name != "CI" ||
		len(g.Scopes) != 1 || g.Scopes[0] != "instances:read=aaaaaaaaaaaaaaa" {
		t.Fatalf("token: %+v %v", g, err)
	}
	var ae *deploy.AuthError
	if _, err := b.VerifyToken(ctx, "pbt_bad", ""); !errors.As(err, &ae) || ae.Status != 401 || ae.Message != "Invalid or expired token." {
		t.Fatalf("invalid: %v", err)
	}
	if _, err := b.VerifyToken(ctx, "pbt_old", ""); !errors.As(err, &ae) || ae.Status != 401 || !strings.Contains(ae.Message, "expired") {
		t.Fatalf("expired: %v", err)
	}
	if _, err := b.VerifyToken(ctx, "pbt_boom", ""); err == nil || errors.As(err, &ae) {
		t.Fatalf("outage must not be an auth error: %v", err)
	}
	// the edge's own login expired: it logs in again and retries once
	s.c.mu.Lock()
	s.c.token = "STALE"
	s.c.mu.Unlock()
	if _, err := b.VerifyToken(ctx, "pbt_good", "1.2.3.4"); err != nil {
		t.Fatalf("re-login: %v", err)
	}
	if uid, err := b.VerifyJWT(ctx, "user-jwt"); err != nil || uid != "u1" {
		t.Fatalf("jwt: %s %v", uid, err)
	}
	if _, err := b.VerifyJWT(ctx, "stale"); !errors.As(err, &ae) || ae.Status != 401 || ae.Message != "The request requires valid record authorization token." {
		t.Fatalf("jwt refused: %v", err)
	}
	id, err := b.RecordDeploy(ctx, deploy.DeployRecord{Instance: "aaaaaaaaaaaaaaa", User: "u1", Status: "success", FileCount: 3, UploadedCount: 2, Commit: "abc"})
	if err != nil || id != "dep123" || recorded["status"] != "success" || recorded["file_count"] != 3.0 || recorded["uploaded_count"] != 2.0 || recorded["commit"] != "abc" {
		t.Fatalf("record: %s %v %v", id, err, recorded)
	}
}
