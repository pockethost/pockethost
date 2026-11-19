package main

import (
	"errors"
	"strings"

	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/hook"
)

// patPrefix starts every PocketHost personal access token (`ph_pat_<id>_<secret>`).
const patPrefix = "ph_pat_"

// allowPATs replaces PocketBase's global "reject unknown Authorization token" middleware (added in v0.42) with one
// that lets PocketHost personal access tokens through. PATs aren't PocketBase auth tokens: the JS hooks check them
// on their own routes (/api/pat/*, /api/instance...). Without this, every CLI call that sends a PAT gets 401 before
// it reaches those routes. Any other unknown token is still rejected, as upstream does.
func allowPATs(e *core.ServeEvent) {
	e.Router.Unbind(apis.DefaultRejectUnknownTokenMiddlewareId)
	e.Router.Bind(&hook.Handler[*core.RequestEvent]{
		Id:       "phRejectUnknownTokenExceptPAT",
		Priority: apis.DefaultRejectUnknownTokenMiddlewarePriority,
		Func: func(re *core.RequestEvent) error {
			token := requestToken(re)
			if re.Auth == nil && token != "" && !strings.HasPrefix(token, patPrefix) {
				return re.UnauthorizedError("", errors.New("unknown authorization token"))
			}
			return re.Next()
		},
	})
}

// requestToken is the Authorization header value without an optional "Bearer " prefix, as PocketBase reads it.
func requestToken(re *core.RequestEvent) string {
	token := re.Request.Header.Get("Authorization")
	if len(token) > 7 && strings.EqualFold(token[:7], "Bearer ") {
		return token[7:]
	}
	return token
}
