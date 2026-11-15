package edge

// Legacy releases: PocketBase before 0.23, served on sfo-2 only (`pockethost.legacy_releases: true`) until they
// retire on Feb 6, 2027 (PocketCon). Everything for them is in this file: after the retirement, delete it, the
// LegacyReleases field and its wiring in cmd/pockethost/edge_config.go, and the key in sfo-2's pocketone.yaml.
//
// The releases come from the edge's own binary cache (the Node edge already holds every one its instances use), not
// the mothership's versions list, so no other edge ever sees them. They start the way the Node edge starts them.

import (
	"context"
	"os"
	"sort"

	"github.com/Masterminds/semver/v3"
	"github.com/pockethost/pocketone/ext/docker"
	"github.com/pockethost/pocketone/ext/host"
)

const (
	// LegacyFloor is the oldest release served with legacy_releases on (the oldest in PocketHost's cache is 0.7).
	LegacyFloor = "0.1.0"
	// legacyBelow: releases older than this are legacy (the Go edge's own floor).
	legacyBelow = docker.MinUpstream
	// legacyDevFrom: the Node edge sets DEV=true only from this release on.
	legacyDevFrom = "0.20.1"
)

func isLegacy(version string) bool {
	v, err := semver.StrictNewVersion(version)
	return err == nil && v.LessThan(semver.MustParse(legacyBelow))
}

// LegacyVersions adds the pre-0.23 releases found in the binary cache to next's list (the mothership's).
func LegacyVersions(next docker.VersionsSource, bin *docker.Binaries) docker.VersionsSource {
	return legacyVersions{next: next, bin: bin}
}

type legacyVersions struct {
	next docker.VersionsSource
	bin  *docker.Binaries
}

func (l legacyVersions) Releases(ctx context.Context) ([]docker.Release, error) {
	rs, err := l.next.Releases(ctx)
	if err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(l.bin.Root)
	if err != nil {
		return rs, nil // no cache yet: nothing legacy to add
	}
	var old []docker.Release
	for _, e := range entries {
		if !e.IsDir() || !isLegacy(e.Name()) {
			continue
		}
		r := docker.Release{Line: docker.LinePB, Version: e.Name()}
		if l.bin.Has(r) {
			old = append(old, r)
		}
	}
	sort.Slice(old, func(i, j int) bool {
		return semver.MustParse(old[i].Version).LessThan(semver.MustParse(old[j].Version))
	})
	return append(old, rs...), nil
}

// LegacyContainer starts pre-0.23 releases as the Node edge does: DEV only from 0.20.1, and ready on any HTTP answer
// (the oldest have no /api/health). Newer releases pass through unchanged. (The command needs no change: the runtime
// keeps PocketBase's hooks watcher on, with no --hooksWatch flag the oldest releases wouldn't know.)
func LegacyContainer(next func(ctx context.Context, inst host.Instance, version string, spec *docker.Spec) error) func(ctx context.Context, inst host.Instance, version string, spec *docker.Spec) error {
	return func(ctx context.Context, inst host.Instance, version string, spec *docker.Spec) error {
		if err := next(ctx, inst, version, spec); err != nil {
			return err
		}
		v := version
		if len(v) > 3 && v[:3] == docker.LinePB+":" {
			v = v[3:]
		}
		if !isLegacy(v) {
			return nil
		}
		spec.HealthAnyStatus = true
		if semver.MustParse(v).LessThan(semver.MustParse(legacyDevFrom)) {
			spec.Env["DEV"] = "false"
		}
		return nil
	}
}
