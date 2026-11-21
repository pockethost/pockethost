package edge

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
	"time"

	apitokensv1 "pocketone.dev/ext/contracts/api-tokens/v1"
	fsv1 "pocketone.dev/ext/contracts/instance/fs/v1"
	"pocketone.dev/ext/deploy"
	"pocketone.dev/ext/pocker"
)

// fakeVerifier stands in for the mothership: tokens by secret, logins by JWT.
type fakeVerifier struct {
	grants map[string]apitokensv1.Grant
	jwts   map[string]string
	calls  int
	down   bool
}

func (f *fakeVerifier) VerifyToken(_ context.Context, token, _ string) (apitokensv1.Grant, error) {
	f.calls++
	if f.down {
		return apitokensv1.Grant{}, errors.New("mothership unreachable")
	}
	g, ok := f.grants[token]
	if !ok {
		return apitokensv1.Grant{}, &deploy.AuthError{Status: 401, Message: "Invalid or expired token."}
	}
	return g, nil
}

func (f *fakeVerifier) VerifyJWT(_ context.Context, token string) (string, error) {
	f.calls++
	uid, ok := f.jwts[token]
	if !ok {
		return "", &deploy.AuthError{Status: 401, Message: "Your login has expired. Run 'pockethost login' or use a token."}
	}
	return uid, nil
}

const (
	tokFull   = "pbt_full"
	tokRO     = "pbt_readonly"
	tokOther  = "pbt_otheruser"
	tokScoped = "pbt_scoped"
	tokLegacy = "ph_pat_abcdefghij12345_FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"
)

func newTestDeployBackend(t *testing.T) (*DeployBackend, *fakeVerifier) {
	t.Helper()
	s := fakeSource(testCfg, &fakeFleet{self: "E_SGP", insts: []pocker.Instance{
		local("aaaaaaaaaaaaaaa", "shop", map[string]string{"owners": "user1"}),
		local("ccccccccccccccc", "held", map[string]string{"owners": "user1", "owner_block": "account hold"}),
		{ID: "bbbbbbbbbbbbbbb", Hosts: []string{"far.pockethost.io"}, Remote: "edge:E_AMS", Private: map[string]string{"owners": "user1"}},
	}})
	v := &fakeVerifier{
		grants: map[string]apitokensv1.Grant{
			tokFull:   {OwnerID: "user1", Name: "CI", Scopes: []string{"instances"}},
			tokRO:     {OwnerID: "user1", Name: "RO", Scopes: []string{"instances:read"}},
			tokOther:  {OwnerID: "user2", Scopes: []string{"instances"}},
			tokScoped: {OwnerID: "user1", Scopes: []string{"instances=other"}},
			tokLegacy: {OwnerID: "user1", Name: "old", Scopes: []string{"instances"}},
		},
		jwts: map[string]string{"jwt-user1": "user1", "jwt-user2": "user2"},
	}
	return &DeployBackend{s: s, tokens: newAuthResolver(v)}, v
}

func deployReq(host, auth string) *http.Request {
	r := httptest.NewRequest(http.MethodGet, "http://"+host+"/api/_c/deploy/v1/tree", nil)
	if auth != "" {
		r.Header.Set("Authorization", auth)
	}
	return r
}

func TestDeployBackendAuthenticate(t *testing.T) {
	b, v := newTestDeployBackend(t)
	const host = "shop.pockethost.io"
	inst, ok := b.Lookup(deployReq(host+":443", ""))
	if !ok || inst.ID != "aaaaaaaaaaaaaaa" || inst.OwnerID != "user1" {
		t.Fatalf("lookup: %+v %v", inst, ok)
	}
	auth := func(tok string) (deploy.Auth, error) {
		h := ""
		if tok != "" {
			h = "Bearer " + tok
		}
		return b.Authenticate(deployReq(host, h), inst)
	}
	var ae *deploy.AuthError
	if _, err := auth(""); !errors.As(err, &ae) || ae.Status != 401 || !strings.Contains(ae.Message, "Missing token") {
		t.Fatalf("missing: %v", err)
	}
	for _, c := range []struct {
		tok, via, label string
		scopes          []string
	}{
		{tokFull, "token", "CI", deploy.ReadWrite},
		{tokRO, "token", "RO", []string{"read"}},
		{tokLegacy, "token", "old", deploy.ReadWrite}, // an old PocketHost token: the mothership checks (and imports) it
		{"jwt-user1", "jwt", "", deploy.ReadWrite},
	} {
		a, err := auth(c.tok)
		if err != nil || a.UserID != "user1" || a.Via != c.via || a.TokenLabel != c.label || !slices.Equal(a.Scopes, c.scopes) {
			t.Errorf("%s: %+v %v", c.tok, a, err)
		}
	}
	for _, tok := range []string{tokOther, tokScoped, "jwt-user2"} {
		if _, err := auth(tok); !errors.Is(err, deploy.ErrNoAccess) {
			t.Errorf("%s should be no access (404): %v", tok, err)
		}
	}
	if _, err := auth("pbt_nope"); !errors.As(err, &ae) || ae.Status != 401 || ae.Message != "Invalid or expired token." {
		t.Fatalf("bad token: %v", err)
	}
	if _, err := auth("jwt-nope"); !errors.As(err, &ae) || !strings.Contains(ae.Message, "login has expired") {
		t.Fatalf("bad jwt: %v", err)
	}

	// refusals are cached; outages aren't
	calls := v.calls
	_, _ = auth("pbt_nope")
	if v.calls != calls {
		t.Fatal("refusal not cached")
	}
	v.down = true
	for i := 0; i < 2; i++ {
		if _, err := auth("pbt_outage"); err == nil || errors.As(err, &ae) {
			t.Fatalf("outage %d must be a plain error: %v", i, err)
		}
	}
	v.down = false
}

func TestDeployBackendScopeReverify(t *testing.T) {
	b, v := newTestDeployBackend(t)
	now := time.Now()
	b.tokens.now = func() time.Time { return now }
	inst, _ := b.lookupHost("shop.pockethost.io")
	req := deployReq("shop.pockethost.io", "Bearer "+tokScoped)
	if _, err := b.Authenticate(req, inst); !errors.Is(err, deploy.ErrNoAccess) {
		t.Fatal(err)
	}
	// the owner widens the token in the dashboard; within 2 s the cache answers, after that a fresh check
	v.grants[tokScoped] = apitokensv1.Grant{OwnerID: "user1", Scopes: []string{"instances=other", "instances=aaaaaaaaaaaaaaa"}}
	if _, err := b.Authenticate(req, inst); !errors.Is(err, deploy.ErrNoAccess) {
		t.Fatal("re-verified too soon", err)
	}
	now = now.Add(3 * time.Second)
	if a, err := b.Authenticate(req, inst); err != nil || !slices.Equal(a.Scopes, deploy.ReadWrite) {
		t.Fatalf("not re-verified: %+v %v", a, err)
	}
}

func TestDeployBackendContractAuth(t *testing.T) {
	b, _ := newTestDeployBackend(t)
	ca := func(host, auth string) (kind, id string, scopes []string) {
		a := b.ContractAuth(deployReq(host, auth))
		return a.Kind, a.ID, a.Scopes
	}
	if k, id, sc := ca("shop.pockethost.io", "Bearer "+tokFull); k != "token" || id != "CI" || !slices.Equal(sc, []string{"remote:read", "remote"}) {
		t.Errorf("write token: %s %s %v", k, id, sc)
	}
	if k, _, sc := ca("shop.pockethost.io", "Bearer "+tokRO); k != "token" || !slices.Equal(sc, []string{"remote:read"}) {
		t.Errorf("read-only token: %s %v", k, sc)
	}
	if k, id, _ := ca("shop.pockethost.io", "Bearer jwt-user1"); k != "record" || id != "user1" {
		t.Errorf("login: %s %s", k, id)
	}
	for _, c := range []struct{ host, auth string }{
		{"shop.pockethost.io", ""},
		{"shop.pockethost.io", "Bearer " + tokOther},
		{"held.pockethost.io", "Bearer " + tokFull}, // blocked owner
		{"far.pockethost.io", "Bearer " + tokFull},  // another edge's
		{"nope.pockethost.io", "Bearer " + tokFull},
	} {
		if k, _, _ := ca(c.host, c.auth); k != "" {
			t.Errorf("%s %s should be anonymous, got %s", c.host, c.auth, k)
		}
	}
}

// testFiles is instance.fs/v1 over plain folders under root, as Pocker and Docker provide it.
func testFiles(root string) func() fsv1.Files {
	f := &fsv1.Instances{
		Known: func(id string) bool { _, err := os.Stat(filepath.Join(root, id)); return err == nil },
		New: func(id string) *fsv1.Local {
			return &fsv1.Local{Folder: func() string { return filepath.Join(root, id) }, IsRunning: func() bool { return false }}
		},
	}
	return func() fsv1.Files { return f }
}

// The edge's backend behind PocketOne's deploy API: tokens, scopes and blocks end to end.
func TestDeployThroughExtDeploy(t *testing.T) {
	b, _ := newTestDeployBackend(t)
	root := t.TempDir()
	for _, id := range []string{"aaaaaaaaaaaaaaa", "ccccccccccccccc"} {
		if err := os.MkdirAll(filepath.Join(root, id, "pb_hooks"), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	api := deploy.New(deploy.Options{Backend: b, Files: testFiles(root), PlatformPaths: PlatformPaths})
	call := func(method, host, path, tok, body string) (int, string) {
		t.Helper()
		r := httptest.NewRequest(method, "http://"+host+"/api/_c/deploy/v1"+path, strings.NewReader(body))
		if tok != "" {
			r.Header.Set("Authorization", "Bearer "+tok)
		}
		r.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		api.ServeHTTP(w, r)
		return w.Code, w.Body.String()
	}
	check := `{"files":{}}`
	if c, out := call("POST", "shop.pockethost.io", "/check", tokFull, check); c != 200 {
		t.Fatalf("full token check: %d %s", c, out)
	}
	if c, out := call("POST", "shop.pockethost.io", "/check", tokRO, check); c != 403 || !strings.Contains(out, "read-only") {
		t.Fatalf("read-only check: %d %s", c, out)
	}
	if c, out := call("GET", "shop.pockethost.io", "/tree", tokRO, ""); c != 200 {
		t.Fatalf("read-only tree: %d %s", c, out)
	}
	if c, out := call("POST", "shop.pockethost.io", "/check", tokOther, check); c != 404 {
		t.Fatalf("other owner: %d %s", c, out)
	}
	if c, out := call("POST", "held.pockethost.io", "/check", tokFull, check); c != 403 || !strings.Contains(out, "account hold") {
		t.Fatalf("blocked: %d %s", c, out)
	}
	if c, out := call("POST", "far.pockethost.io", "/check", tokFull, check); c != 421 {
		t.Fatalf("elsewhere: %d %s", c, out)
	}
	if c, out := call("POST", "shop.pockethost.io", "/check", "", check); c != 401 {
		t.Fatalf("no token: %d %s", c, out)
	}
}

func TestDashboardLogs(t *testing.T) {
	b, _ := newTestDeployBackend(t)
	root := t.TempDir()
	dir := filepath.Join(root, "aaaaaaaaaaaaaaa", "logs")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "exec.log"),
		[]byte(`{"message":"one","stream":"stdout","time":"t1"}`+"\n"+`{"message":"two","stream":"stderr","time":"t2"}`+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	srv := httptest.NewServer(b.DashboardLogs(testFiles(root), nil)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(299)
	})))
	defer srv.Close()
	post := func(auth, body string) (*http.Response, string) {
		t.Helper()
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		req, _ := http.NewRequestWithContext(ctx, "POST", srv.URL+"/logs", strings.NewReader(body))
		req.Host = "shop.pockethost.io"
		req.Header.Set("Content-Type", "application/json")
		if auth != "" {
			req.Header.Set("Authorization", auth)
		}
		res, err := srv.Client().Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		sc := bufio.NewScanner(res.Body)
		var data []string
		for sc.Scan() && len(data) < 2 {
			if line := sc.Text(); strings.HasPrefix(line, "data: ") {
				data = append(data, strings.TrimPrefix(line, "data: "))
			} else if !strings.HasPrefix(line, "event: ") && line != "" {
				data = append(data, line)
			}
		}
		return res, strings.Join(data, "|")
	}

	// the dashboard sends its raw PocketBase token, the instance id and n
	res, got := post("jwt-user1", `{"instanceId":"aaaaaaaaaaaaaaa","n":2}`)
	if res.StatusCode != 200 || res.Header.Get("Access-Control-Allow-Origin") != "*" || !strings.Contains(got, `"message":"one"`) || !strings.Contains(got, `"message":"two"`) {
		t.Fatalf("token + id: %d %v %q", res.StatusCode, res.Header, got)
	}
	// the cookie alone works too; the subdomain names the instance as well
	cookie := "pb_auth=" + url.QueryEscape(`{"token":"jwt-user1","model":{}}`) + "; Path=/"
	body, _ := json.Marshal(map[string]any{"instanceId": "shop", "n": 1, "auth": cookie})
	if res, got := post("", string(body)); res.StatusCode != 200 || !strings.Contains(got, `"two"`) {
		t.Fatalf("cookie + subdomain: %d %q", res.StatusCode, got)
	}
	// a bad login, an API token, someone else's login, another instance's id: refused
	if res, _ := post("jwt-nope", `{"instanceId":"aaaaaaaaaaaaaaa"}`); res.StatusCode != 401 {
		t.Fatalf("bad login: %d", res.StatusCode)
	}
	if res, _ := post("Bearer "+tokFull, `{"instanceId":"aaaaaaaaaaaaaaa"}`); res.StatusCode != 404 {
		t.Fatalf("API token: %d", res.StatusCode)
	}
	if res, _ := post("jwt-user2", `{"instanceId":"aaaaaaaaaaaaaaa"}`); res.StatusCode != 404 {
		t.Fatalf("other user: %d", res.StatusCode)
	}
	if res, _ := post("jwt-user1", `{"instanceId":"other"}`); res.StatusCode != 404 {
		t.Fatalf("other instance id: %d", res.StatusCode)
	}

	// preflight is answered here with open CORS; other paths go on
	req, _ := http.NewRequest("OPTIONS", srv.URL+"/logs", nil)
	req.Host = "shop.pockethost.io"
	req.Header.Set("Access-Control-Request-Headers", "authorization,content-type")
	pre, err := srv.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	pre.Body.Close()
	if pre.StatusCode != 204 || pre.Header.Get("Access-Control-Allow-Headers") != "authorization,content-type" {
		t.Fatalf("preflight: %d %v", pre.StatusCode, pre.Header)
	}
	if res, err := srv.Client().Get(srv.URL + "/api/health"); err != nil || res.StatusCode != 299 {
		t.Fatalf("passthrough: %v %v", res, err)
	} else {
		res.Body.Close()
	}
}
