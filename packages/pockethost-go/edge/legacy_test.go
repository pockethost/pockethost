package edge

import (
	"context"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"github.com/pockethost/pocketone/ext/multisite"
	"github.com/pockethost/pocketone/ext/docker"
)

type fixedVersions []docker.Release

func (f fixedVersions) Releases(context.Context) ([]docker.Release, error) { return f, nil }

func TestLegacyVersionsFromCache(t *testing.T) {
	b := &docker.Binaries{Root: t.TempDir()}
	for _, v := range []string{"0.8.0", "0.22.21", "0.20.0", "0.36.9"} { // 0.36.9 cached but not legacy: the mothership lists it
		p := b.Path(docker.LinePB, v)
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte("bin"), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.MkdirAll(filepath.Join(b.Root, "0.9.0"), 0o755); err != nil { // a folder without a binary
		t.Fatal(err)
	}
	next := fixedVersions{{Line: docker.LinePB, Version: "0.36.9"}, {Line: docker.LineP1, Version: "0.0.2"}}
	rs, err := LegacyVersions(next, b).Releases(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	var keys []string
	for _, r := range rs {
		keys = append(keys, r.Key())
	}
	if want := []string{"pb:0.8.0", "pb:0.20.0", "pb:0.22.21", "pb:0.36.9", "p1:0.0.2"}; !reflect.DeepEqual(keys, want) {
		t.Fatalf("releases %v", keys)
	}
	if r, err := docker.PickMin(rs, "0.22.*", LegacyFloor); err != nil || r.Key() != "pb:0.22.21" {
		t.Fatalf("pick 0.22.*: %s %v", r.Key(), err)
	}
	// no cache: the mothership's list as it is
	if rs, err := LegacyVersions(next, &docker.Binaries{Root: filepath.Join(t.TempDir(), "none")}).Releases(context.Background()); err != nil || len(rs) != 2 {
		t.Fatalf("no cache: %v %v", rs, err)
	}
}

func TestLegacyContainer(t *testing.T) {
	prep := LegacyContainer(DockerContainer(nil))
	def := []string{"./pocketbase", "serve", "--http", "0.0.0.0:8090", "--dev"} // the runtime's default (hooks watcher on)
	for _, c := range []struct {
		version   string
		cmd       []string
		dev       string
		anyStatus bool
	}{
		{"pb:0.8.0", def, "false", true},
		{"pb:0.20.1", def, "true", true},
		{"pb:0.22.21", def, "true", true},
		{"pb:0.23.0", def, "true", false},
		{"p1:0.0.2", def, "true", false},
	} {
		spec := &docker.Spec{Env: map[string]string{}, Labels: map[string]string{}}
		if err := prep(context.Background(), multisite.Instance{ID: "x", Dev: true}, c.version, spec); err != nil {
			t.Fatal(err)
		}
		cmd := def
		if spec.Cmd != nil { // none set today; kept so a future change to the command is checked
			cmd = spec.Cmd(def)
		}
		if !reflect.DeepEqual(cmd, c.cmd) || spec.Env["DEV"] != c.dev || spec.HealthAnyStatus != c.anyStatus {
			t.Errorf("%s: cmd %v DEV %q any %v", c.version, cmd, spec.Env["DEV"], spec.HealthAnyStatus)
		}
	}
}
