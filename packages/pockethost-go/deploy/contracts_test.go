package deploy

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	apitokensv1 "pocketone.dev/ext/contracts/api-tokens/v1"
	"slices"
	"testing"

	deployv1 "pocketone.dev/ext/contracts/deploy/v1"
)

// The edge serves the API as PocketOne's deploy/v1 too (extkit.HostRoutes hands it /api/_c/deploy/v1/...): the same
// operations and checks as at Prefix, plus tree for `pocketone dev`.
func TestDeployV1Paths(t *testing.T) {
	f := newAPIFixture(t)
	f.put("pb_hooks/main.pb.js", "routerAdd('GET', '/x', () => {})")
	srv := httptest.NewServer(f.api) // HostRoutes calls ServeHTTP directly
	defer srv.Close()
	get := func(path, token string) (int, map[string]any) {
		t.Helper()
		req, _ := http.NewRequest("GET", srv.URL+path, nil)
		req.Host = "myapp.example.com"
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		res, err := srv.Client().Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		raw, _ := io.ReadAll(res.Body)
		var out map[string]any
		_ = json.Unmarshal(raw, &out)
		return res.StatusCode, out
	}
	if code, body := get(deployv1.Prefix+"/files", testToken); code != 200 || body["entries"] == nil {
		t.Fatalf("files under deploy/v1: %d %v", code, body)
	}
	code, root := get(deployv1.Prefix+"/tree", testToken)
	if code != 200 || root["exists"] != true || root["hash"] == "" {
		t.Fatalf("tree: %d %v", code, root)
	}
	entries, _ := root["entries"].([]any)
	if len(entries) != 1 || entries[0].(map[string]any)["name"] != "pb_hooks" {
		t.Fatalf("tree entries: %v", entries)
	}
	if code, _ := get(deployv1.Prefix+"/tree", ""); code != 401 {
		t.Fatalf("tree without a token: %d", code)
	}
}

// remote/v1's auth on the edge: the owner's write token may restart and read, a read-only one only read, a login
// everything; anyone else is anonymous (the contract then refuses them).
func TestContractAuth(t *testing.T) {
	f := newAPIFixture(t)
	ro := "pbt_readonly0000000000_CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"
	other := "pbt_otheruser000000000_DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD"
	f.be.pats[ro] = apitokensv1.Grant{OwnerID: "user1", Scopes: []string{"instances:read"}}
	f.be.pats[other] = apitokensv1.Grant{OwnerID: "user2", Scopes: []string{"instances"}}
	auth := func(token string) (kind string, scopes []string) {
		req := httptest.NewRequest("GET", "/api/_c/remote/v1/status", nil)
		req.Host = "myapp.example.com"
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		a := f.api.ContractAuth(req)
		return a.Kind, a.Scopes
	}
	if k, s := auth(testToken); k != "token" || !slices.Contains(s, "remote") || !slices.Contains(s, "remote:read") {
		t.Fatalf("write token: %s %v", k, s)
	}
	if k, s := auth(ro); k != "token" || slices.Contains(s, "remote") || !slices.Contains(s, "remote:read") {
		t.Fatalf("read-only token: %s %v", k, s)
	}
	if k, s := auth("jwt-user1"); k != "record" || s != nil {
		t.Fatalf("login: %s %v", k, s)
	}
	for _, tok := range []string{"", other, "pbt_nope"} {
		if k, _ := auth(tok); k != "" {
			t.Fatalf("%q should be anonymous, got %s", tok, k)
		}
	}
}
