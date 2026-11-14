package edge

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sync"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"github.com/pockethost/pocketone/ext/docker"
)

// DockerReleasesSetting is the mothership `settings` record holding the releases every docker edge serves (docker's
// Release records: line, version, download + sha256 per platform). It's separate from `pocketbase_versions` (the
// versions users may pick, still written by sfo-2's Node edge), so neither overwrites the other.
const DockerReleasesSetting = "docker_releases"

type dockerReleasesValue struct {
	Releases  []docker.Release `json:"releases"`
	UpdatedAt string           `json:"updatedAt"`
}

// SaveDockerReleases records the fleet's docker releases on the mothership (`pockethost mothership versions update`).
func SaveDockerReleases(app core.App, rs []docker.Release) error {
	docker.SortReleases(rs)
	val := dockerReleasesValue{Releases: rs, UpdatedAt: time.Now().UTC().Format(time.RFC3339)}
	rec, err := app.FindFirstRecordByData("settings", "name", DockerReleasesSetting)
	if err != nil {
		col, cerr := app.FindCollectionByNameOrId("settings")
		if cerr != nil {
			return cerr
		}
		rec = core.NewRecord(col)
		rec.Set("name", DockerReleasesSetting)
	}
	rec.Set("value", val)
	return app.Save(rec)
}

// LoadDockerReleases reads the fleet's docker releases on the mothership (none when the setting doesn't exist).
func LoadDockerReleases(app core.App) ([]docker.Release, string, error) {
	rec, err := app.FindFirstRecordByData("settings", "name", DockerReleasesSetting)
	if err != nil {
		return nil, "", nil
	}
	var val dockerReleasesValue
	if err := json.Unmarshal([]byte(rec.GetString("value")), &val); err != nil {
		return nil, "", fmt.Errorf("%s: %w", DockerReleasesSetting, err)
	}
	return val.Releases, val.UpdatedAt, nil
}

// MothershipVersions is docker's VersionsSource for a PocketHost edge: the mothership's docker_releases setting, read
// with the edge's mothership login. The docker runtime re-reads it every 30 s, so every docker edge follows the same
// list; when the mothership is briefly unreachable, the last list read stays in use.
type MothershipVersions struct {
	c *client

	mu   sync.Mutex
	last []docker.Release
	ok   bool
}

var _ docker.VersionsSource = (*MothershipVersions)(nil)

// DockerVersions returns the edge's docker VersionsSource, backed by this source's mothership client.
func (s *Source) DockerVersions() *MothershipVersions { return &MothershipVersions{c: s.c} }

// Releases implements docker.VersionsSource.
func (m *MothershipVersions) Releases(ctx context.Context) ([]docker.Release, error) {
	var out struct {
		Items []struct {
			Value dockerReleasesValue `json:"value"`
		} `json:"items"`
	}
	q := url.Values{"filter": {fmt.Sprintf("name=%q", DockerReleasesSetting)}, "perPage": {"1"}}
	err := m.c.do(ctx, http.MethodGet, "/api/collections/settings/records?"+q.Encode(), nil, &out)
	m.mu.Lock()
	defer m.mu.Unlock()
	if err != nil {
		if m.ok {
			return m.last, nil // keep serving the last list through a mothership blip
		}
		return nil, fmt.Errorf("mothership %s: %w", DockerReleasesSetting, err)
	}
	if len(out.Items) == 0 {
		m.last, m.ok = nil, true
		return nil, nil // not set yet: `pockethost mothership versions update`
	}
	m.last, m.ok = out.Items[0].Value.Releases, true
	return m.last, nil
}
