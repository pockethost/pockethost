package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
)

func TestAllowPATs(t *testing.T) {
	app := core.NewBaseApp(core.BaseAppConfig{DataDir: t.TempDir()})
	if err := app.Bootstrap(); err != nil {
		t.Fatal(err)
	}
	defer app.ResetBootstrapState()

	r, err := apis.NewRouter(app)
	if err != nil {
		t.Fatal(err)
	}
	r.GET("/x", func(e *core.RequestEvent) error { return e.NoContent(http.StatusNoContent) })
	allowPATs(&core.ServeEvent{App: app, Router: r})
	mux, err := r.BuildMux()
	if err != nil {
		t.Fatal(err)
	}

	pat := "ph_pat_abcdefghij12345_" + "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"
	for _, c := range []struct {
		name, auth string
		want       int
	}{
		{"no token", "", http.StatusNoContent},
		{"PAT with Bearer", "Bearer " + pat, http.StatusNoContent},
		{"PAT with lower-case bearer", "bearer " + pat, http.StatusNoContent},
		{"bare PAT", pat, http.StatusNoContent},
		{"unknown token still rejected", "Bearer not-a-token", http.StatusUnauthorized},
	} {
		req := httptest.NewRequest(http.MethodGet, "/x", nil)
		if c.auth != "" {
			req.Header.Set("Authorization", c.auth)
		}
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		if rec.Code != c.want {
			t.Errorf("%s: got %d, want %d (%s)", c.name, rec.Code, c.want, rec.Body.String())
		}
	}
}
