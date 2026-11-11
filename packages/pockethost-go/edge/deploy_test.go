package edge

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/pockethost/pockethost/packages/pockethost-go/deploy"
)

func TestDeployBackend(t *testing.T) {
	var recorded map[string]any
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/collections/_superusers/auth-with-password", func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]string{"token": "TOKEN"})
	})
	mux.HandleFunc("POST /api/pat/verify", func(w http.ResponseWriter, r *http.Request) {
		var in map[string]string
		_ = json.NewDecoder(r.Body).Decode(&in)
		switch {
		case r.Header.Get("Authorization") != "TOKEN":
			w.WriteHeader(401)
		case in["token"] == "ph_pat_good" && in["ip"] == "1.2.3.4":
			_, _ = w.Write([]byte(`{"tokenId":"t1","userId":"u1","label":"CI","scopes":["read"],"instanceIds":null}`))
		case in["token"] == "ph_pat_blocked":
			w.WriteHeader(403)
			_, _ = w.Write([]byte(`{"status":403,"message":"This token can't be used from this IP."}`))
		case in["token"] == "ph_pat_boom":
			w.WriteHeader(502)
		default:
			w.WriteHeader(400)
			_, _ = w.Write([]byte(`{"status":400,"message":""}`))
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
		Users: []userRec{{ID: "u1", Verified: true, SubscriptionQuantity: 1, Suspension: "account hold"}},
		Instances: []instanceRec{
			{ID: "aaaaaaaaaaaaaaa", Subdomain: "shop", UID: "u1", Power: true, Edge: "E_SGP", Cname: "Shop.Example.com", Updated: "1"},
			{ID: "bbbbbbbbbbbbbbb", Subdomain: "far", UID: "u2", Edge: "E_AMS", Suspension: "x", Updated: "1"},
		},
		Edges: []edgeRec{{ID: "E_SGP", EdgeID: "sgp-1"}, {ID: "E_AMS", EdgeID: "ams-1"}},
	})
	b := s.DeployBackend()

	for _, h := range []string{"shop.pockethost.io", "aaaaaaaaaaaaaaa.pockethost.io", "shop.example.com", "SHOP.pockethost.io."} {
		got, ok := b.Lookup(h)
		want := deploy.Instance{ID: "aaaaaaaaaaaaaaa", Subdomain: "shop", OwnerID: "u1", Power: true, OwnerSuspension: "account hold"}
		if !ok || got != want {
			t.Errorf("%s: %+v %v", h, got, ok)
		}
	}
	if got, ok := b.Lookup("far.pockethost.io"); !ok || got.Elsewhere != "far.pockethost.io is served by another PocketHost edge" || got.OwnerSuspension != "" || got.Suspension != "x" {
		t.Errorf("other edge: %+v", got)
	}
	if _, ok := b.Lookup("nope.pockethost.io"); ok {
		t.Error("unknown host")
	}

	ctx := context.Background()
	if r, err := b.VerifyPAT(ctx, "ph_pat_good", "1.2.3.4"); err != nil || r.UserID != "u1" || r.Label != "CI" || r.InstanceIDs != nil {
		t.Fatalf("pat: %+v %v", r, err)
	}
	var ae *deploy.AuthError
	if _, err := b.VerifyPAT(ctx, "ph_pat_blocked", ""); !errors.As(err, &ae) || ae.Status != 403 || ae.Message != "This token can't be used from this IP." {
		t.Fatalf("403: %v", err)
	}
	if _, err := b.VerifyPAT(ctx, "ph_pat_bad", ""); !errors.As(err, &ae) || ae.Status != 401 || ae.Message != "Invalid or expired token." {
		t.Fatalf("400: %v", err)
	}
	if _, err := b.VerifyPAT(ctx, "ph_pat_boom", ""); err == nil || errors.As(err, &ae) {
		t.Fatalf("outage must not be an auth error: %v", err)
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
