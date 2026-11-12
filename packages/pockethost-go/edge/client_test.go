package edge

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// With MOTHERSHIP_EDGE_SECRET the edge logs in as its own edges record (identity = edge id); without it, as superuser.
func TestClientLogin(t *testing.T) {
	cases := []struct {
		name               string
		cfg                Config
		wantPath, wantUser string
		wantPass           string
	}{
		{"edge secret", Config{EdgeID: "sgp-1", EdgeSecret: "s3cret", AdminUser: "admin@x", AdminPassword: "pw"},
			"/api/collections/edges/auth-with-password", "sgp-1", "s3cret"},
		{"superuser", Config{EdgeID: "sgp-1", AdminUser: "admin@x", AdminPassword: "pw"},
			"/api/collections/_superusers/auth-with-password", "admin@x", "pw"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var path string
			var body map[string]string
			ms := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				path = r.URL.Path
				_ = json.NewDecoder(r.Body).Decode(&body)
				_ = json.NewEncoder(w).Encode(map[string]string{"token": "TOKEN"})
			}))
			defer ms.Close()
			tc.cfg.MothershipURL = ms.URL
			tok, err := newClientFor(tc.cfg).auth(context.Background())
			if err != nil || tok != "TOKEN" {
				t.Fatalf("auth: %q %v", tok, err)
			}
			if path != tc.wantPath || body["identity"] != tc.wantUser || body["password"] != tc.wantPass {
				t.Fatalf("got %s %v", path, body)
			}
		})
	}
}

func TestConfigNeedsALogin(t *testing.T) {
	t.Setenv("MOTHERSHIP_URL", "http://ms")
	t.Setenv("MOTHERSHIP_ADMIN_USERNAME", "")
	t.Setenv("MOTHERSHIP_ADMIN_PASSWORD", "")
	t.Setenv("MOTHERSHIP_EDGE_SECRET", "")
	if _, err := ConfigFromEnv(); err == nil {
		t.Fatal("no login: want an error")
	}
	t.Setenv("MOTHERSHIP_EDGE_SECRET", "s3cret")
	if c, err := ConfigFromEnv(); err != nil || c.EdgeSecret != "s3cret" {
		t.Fatalf("edge secret alone: %v", err)
	}
}
