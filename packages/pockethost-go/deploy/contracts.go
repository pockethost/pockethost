package deploy

import (
	"net/http"
	"strings"

	deployv1 "github.com/pockethost/pocketone/ext/contracts/deploy/v1"
	"github.com/pockethost/pocketone/ext/extkit"
)

// The deploy API also answers PocketOne's deploy/v1 contract (`pocketone deploy`, `dev`, `pull`) at
// /api/_c/deploy/v1, with the same operations and checks as at Prefix (the npm CLI's path). The edge provides
// deploy/v1 for its instances (deployv1.Contract.ProvideForInstances with this API as the handler).

// apiPath is r's path inside the API, whichever prefix it came under.
func apiPath(r *http.Request) string {
	p := r.URL.Path
	if rest, ok := strings.CutPrefix(p, deployv1.Prefix); ok {
		return strings.TrimSuffix(rest, "/")
	}
	return strings.TrimSuffix(strings.TrimPrefix(p, Prefix), "/")
}

// ContractAuth authenticates a request for the PocketOne contracts the edge answers for its instances (remote/v1:
// status, restart, logs): the instance owner's PocketHost token or login, checked as a deploy is. A token with write
// access may restart; a read-only one may read. Anyone else is anonymous, so the contract refuses them.
func (a *API) ContractAuth(r *http.Request) extkit.Auth {
	c, err := a.authorize(r, false)
	if err != nil {
		return extkit.Auth{}
	}
	au := extkit.Auth{Kind: "record", ID: c.auth.UserID, Collection: "users", RecordID: c.auth.UserID}
	if c.auth.Via == "pat" {
		au.Kind, au.ID = "token", c.auth.TokenLabel
		au.Scopes = []string{"remote:read"}
		if c.auth.can("write") {
			au.Scopes = append(au.Scopes, "remote")
		}
	}
	return au
}
