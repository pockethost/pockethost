package edge

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"pocketone.dev/ext/deploy"
	"pocketone.dev/ext/extkit"
)

func TestInstanceSuperusers(t *testing.T) {
	calls := 0
	check := func(r *http.Request) extkit.Auth {
		calls++
		if r.Header.Get("Authorization") == "Bearer good" {
			return extkit.Auth{Kind: "superuser", Collection: "_superusers", RecordID: "su1"}
		}
		return extkit.Auth{}
	}
	s := newInstanceSuperusers(check)
	now := time.Unix(1000, 0)
	s.now = func() time.Time { return now }
	req := func(auth string) *http.Request {
		r := httptest.NewRequest("GET", "/api/_c/deploy/v1/files", nil)
		r.Header.Set("Authorization", auth)
		return r
	}
	inst := deploy.Instance{ID: "abc123"}

	a, ok := s.authenticate(req("Bearer good"), inst, "good")
	if !ok || a.UserID != "su1" || a.Via != "instance-superuser" || len(a.Scopes) != len(deploy.ReadWrite) {
		t.Fatalf("good token: %+v %v", a, ok)
	}
	s.authenticate(req("Bearer good"), inst, "good")
	if calls != 1 {
		t.Fatalf("cached answer asked the instance again (%d calls)", calls)
	}
	if _, ok := s.authenticate(req("Bearer good"), deploy.Instance{ID: "other"}, "good"); !ok || calls != 2 {
		t.Fatalf("another instance must be asked itself (%d calls)", calls)
	}
	if _, ok := s.authenticate(req("Bearer bad"), inst, "bad"); ok {
		t.Fatal("bad token accepted")
	}
	now = now.Add(authCacheTTL)
	s.authenticate(req("Bearer good"), inst, "good")
	if calls != 4 {
		t.Fatalf("expired entry not re-checked (%d calls)", calls)
	}
	var none *instanceSuperusers
	if _, ok := none.authenticate(req("Bearer good"), inst, "good"); ok {
		t.Fatal("an edge that can't ask accepted a token")
	}
}

func TestBearerToken(t *testing.T) {
	for in, want := range map[string]string{
		"Bearer pbt_abc":  "pbt_abc",
		"bearer  pbt_abc": "pbt_abc",
		"pbt_abc":         "pbt_abc",
		" eyJhbGc.x.y ":   "eyJhbGc.x.y",
		"Basic dXNlcjpw":  "",
		"":                "",
	} {
		if got := bearerToken(in); got != want {
			t.Errorf("bearerToken(%q) = %q, want %q", in, got, want)
		}
	}
}
