package edge

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"sync"
	"time"

	"pocketone.dev/ext/deploy"
	"pocketone.dev/ext/extkit"
)

// instanceSuperusers accepts an instance's own superusers on the routes the edge answers for it (deploy/v1,
// remote/v1), where the runtime can check a superuser's token with the instance itself: docker's SuperuserAuth asks
// the container (starting it if it's asleep). `pocketone link` signs in as one of the instance's superusers (with
// email and password on a stock image, which has no browser sign-in), so a superuser may deploy, read and restart, as
// on any PocketOne app. Answers are cached 30 s per instance and token, so a deploy's many requests ask once.
type instanceSuperusers struct {
	check func(*http.Request) extkit.Auth // the runtime's: Kind "superuser" when the instance accepts the token
	now   func() time.Time

	mu    sync.Mutex
	cache map[string]superuserEntry
}

type superuserEntry struct {
	at time.Time
	id string // "" refused
}

func newInstanceSuperusers(check func(*http.Request) extkit.Auth) *instanceSuperusers {
	return &instanceSuperusers{check: check, now: time.Now, cache: map[string]superuserEntry{}}
}

// authenticate asks inst whether the request's token is one of its superusers'. ok is false when it isn't (or this
// edge can't ask): the caller keeps its own answer.
func (s *instanceSuperusers) authenticate(r *http.Request, inst deploy.Instance, token string) (deploy.Auth, bool) {
	if s == nil || s.check == nil || token == "" {
		return deploy.Auth{}, false
	}
	sum := sha256.Sum256([]byte(inst.ID + "\x00" + token))
	key := hex.EncodeToString(sum[:])
	s.mu.Lock()
	hit, found := s.cache[key]
	if len(s.cache) > 10_000 {
		clear(s.cache)
	}
	s.mu.Unlock()
	if !found || s.now().Sub(hit.at) >= authCacheTTL {
		a := s.check(r)
		hit = superuserEntry{at: s.now()}
		if a.Kind == "superuser" {
			hit.id = a.RecordID
			if hit.id == "" {
				hit.id = "superuser"
			}
		}
		s.mu.Lock()
		s.cache[key] = hit
		s.mu.Unlock()
	}
	if hit.id == "" {
		return deploy.Auth{}, false
	}
	return deploy.Auth{UserID: hit.id, Scopes: deploy.ReadWrite, Via: "instance-superuser", TokenLabel: "superuser"}, true
}
