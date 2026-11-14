package edge

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"github.com/Masterminds/semver/v3"
	"github.com/pockethost/pocketone/ext/docker"
)

// VersionsSetting is the mothership `settings` record listing the PocketBase versions PocketHost supports. The
// mothership alone maintains it (`pockethost mothership versions update`); its hooks read each entry's range (what
// users pick), and edges read the pinned release behind it.
const VersionsSetting = "pocketbase_versions"

// Version is one entry of the list: the range users pick ("0.36.*", or "p1:0.0.*" for PocketOne), its current patch,
// and that release pinned to its downloads and checksums. Entries recorded before releases were pinned have only
// range and patch.
type Version struct {
	Range string `json:"range"`
	Patch string `json:"patch"`
	docker.Release
}

// Pinned reports whether the entry carries its release's downloads.
func (v Version) Pinned() bool { return v.Line != "" && len(v.Assets) > 0 }

type versionsValue struct {
	Versions []Version `json:"versions"`
	SyncedAt string    `json:"syncedAt,omitempty"`
}

// VersionFor is a release's list entry. Upstream ranges have no prefix, as instances' versions always have.
func VersionFor(r docker.Release) Version {
	rng := minorOf(r.Version) + ".*"
	if r.Line != docker.LinePB {
		rng = r.Line + ":" + rng
	}
	return Version{Range: rng, Patch: r.Version, Release: r}
}

func minorOf(v string) string {
	p := strings.SplitN(v, ".", 3)
	if len(p) < 2 {
		return v
	}
	return p[0] + "." + p[1]
}

// SortVersions orders the list as its readers expect: upstream first, newest first (the first entry is the default
// for a new instance), then PocketOne, newest first.
func SortVersions(vs []Version) {
	sort.SliceStable(vs, func(i, j int) bool {
		li, lj := lineOf(vs[i]), lineOf(vs[j])
		if li != lj {
			return li == docker.LinePB
		}
		a, ea := semver.NewVersion(vs[i].Patch)
		b, eb := semver.NewVersion(vs[j].Patch)
		if ea != nil || eb != nil {
			return vs[i].Patch > vs[j].Patch
		}
		return a.GreaterThan(b)
	})
}

func lineOf(v Version) string {
	if v.Line != "" {
		return v.Line
	}
	if i := strings.Index(v.Range, ":"); i >= 0 {
		return v.Range[:i]
	}
	return docker.LinePB
}

// MergeVersions records releases in the list: each replaces the entry for its range, and entries for other ranges
// (legacy minors, or minors an update didn't ask about) stay.
func MergeVersions(prev []Version, rs []docker.Release) []Version {
	byRange := map[string]Version{}
	order := []string{}
	for _, v := range prev {
		if _, ok := byRange[v.Range]; !ok {
			order = append(order, v.Range)
		}
		byRange[v.Range] = v
	}
	for _, r := range docker.LatestPatches(rs) {
		v := VersionFor(r)
		if _, ok := byRange[v.Range]; !ok {
			order = append(order, v.Range)
		}
		byRange[v.Range] = v
	}
	out := make([]Version, 0, len(order))
	for _, k := range order {
		out = append(out, byRange[k])
	}
	SortVersions(out)
	return out
}

// LoadVersions reads the list (none when the setting doesn't exist yet).
func LoadVersions(app core.App) ([]Version, string, error) {
	rec, err := app.FindFirstRecordByData("settings", "name", VersionsSetting)
	if err != nil {
		return nil, "", nil
	}
	var val versionsValue
	if err := json.Unmarshal([]byte(rec.GetString("value")), &val); err != nil {
		return nil, "", fmt.Errorf("%s: %w", VersionsSetting, err)
	}
	return val.Versions, val.SyncedAt, nil
}

// SaveVersions writes the list.
func SaveVersions(app core.App, vs []Version) error {
	SortVersions(vs)
	val := versionsValue{Versions: vs, SyncedAt: time.Now().UTC().Format(time.RFC3339)}
	rec, err := app.FindFirstRecordByData("settings", "name", VersionsSetting)
	if err != nil {
		col, cerr := app.FindCollectionByNameOrId("settings")
		if cerr != nil {
			return cerr
		}
		rec = core.NewRecord(col)
		rec.Set("name", VersionsSetting)
	}
	rec.Set("value", val)
	return app.Save(rec)
}

// Releases are the pinned releases of a list; entries without downloads are left out.
func Releases(vs []Version) []docker.Release {
	var out []docker.Release
	for _, v := range vs {
		if v.Pinned() {
			out = append(out, v.Release)
		}
	}
	return out
}

// MothershipVersions is the edge's view of the mothership's versions list, read with the edge's mothership login. A
// runtime that needs the releases (docker) re-reads it every 30 s, so every edge follows the same list; when the
// mothership is briefly unreachable, the last list read stays in use. Edges never write it.
type MothershipVersions struct {
	c *client

	mu   sync.Mutex
	last []docker.Release
	ok   bool
}

var _ docker.VersionsSource = (*MothershipVersions)(nil)

// Versions returns the edge's view of the mothership's versions list, backed by this source's mothership client.
func (s *Source) Versions() *MothershipVersions { return &MothershipVersions{c: s.c} }

// Releases implements docker.VersionsSource.
func (m *MothershipVersions) Releases(ctx context.Context) ([]docker.Release, error) {
	var out struct {
		Items []struct {
			Value versionsValue `json:"value"`
		} `json:"items"`
	}
	q := url.Values{"filter": {fmt.Sprintf("name=%q", VersionsSetting)}, "perPage": {"1"}}
	err := m.c.do(ctx, http.MethodGet, "/api/collections/settings/records?"+q.Encode(), nil, &out)
	m.mu.Lock()
	defer m.mu.Unlock()
	if err != nil {
		if m.ok {
			return m.last, nil // keep serving the last list through a mothership blip
		}
		return nil, fmt.Errorf("mothership %s: %w", VersionsSetting, err)
	}
	if len(out.Items) == 0 {
		m.last, m.ok = nil, true
		return nil, nil // not set yet: `pockethost mothership versions update`
	}
	m.last, m.ok = Releases(out.Items[0].Value.Versions), true
	return m.last, nil
}
