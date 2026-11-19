package edge

import (
	"context"

	remotev1 "pocketone.dev/ext/contracts/remote/v1"
	"pocketone.dev/ext/extkit"
	"pocketone.dev/ext/pocker"
)

// PockerRemote is remote/v1 for a pocker edge's instances (status, restart, logs from pocker's Manager; whoami lists
// the contracts the edge provides for them). manager returns the running Manager, nil until the edge has started:
// until then every call answers 503.
func PockerRemote(manager func() *pocker.Manager, host *extkit.Scope) func(instance string) remotev1.Remote {
	return func(id string) remotev1.Remote {
		if m := manager(); m != nil {
			return pocker.Remote(m, host)(id)
		}
		return notReady{}
	}
}

var errNotReady = &extkit.Error{Code: "not_ready", Message: "the edge is starting; try again in a moment", Status: 503}

type notReady struct{}

func (notReady) Whoami(context.Context, extkit.Auth) (remotev1.Whoami, error) {
	return remotev1.Whoami{}, errNotReady
}
func (notReady) Status(context.Context, extkit.Auth) (remotev1.Status, error) {
	return remotev1.Status{}, errNotReady
}
func (notReady) Restart(context.Context, extkit.Auth) (remotev1.RestartResult, error) {
	return remotev1.RestartResult{}, errNotReady
}
func (notReady) Logs(context.Context, extkit.Auth, remotev1.LogsInput) (extkit.Stream, error) {
	return extkit.Stream{}, errNotReady
}
