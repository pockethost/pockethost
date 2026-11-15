package edge

import (
	"net/http"

	"github.com/pockethost/pocketone/ext/pocker"
)

// DaemonHealthPath is where the Node firewall and other edges check this edge's daemon.
const DaemonHealthPath = "/_api/daemon/health"

// NodeCompat answers the Node edge's daemon health path with Pocker's health ({"status":"ok"} once ready), so the
// Node firewall in front and other edges see this process as a healthy edge daemon.
func NodeCompat(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == DaemonHealthPath {
			r2 := r.Clone(r.Context())
			r2.URL.Path = pocker.HealthPath
			next.ServeHTTP(w, r2)
			return
		}
		next.ServeHTTP(w, r)
	})
}
