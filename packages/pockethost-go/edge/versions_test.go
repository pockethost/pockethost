package edge

import (
	"encoding/json"
	"testing"

	"github.com/pockethost/pocketone/ext/docker"
)

func rel(line, v string) docker.Release {
	return docker.Release{Line: line, Version: v, Assets: map[string]docker.Asset{"linux_amd64": {URL: "u", SHA256: "s"}}}
}

func TestMergeVersions(t *testing.T) {
	prev := []Version{{Range: "0.22.*", Patch: "0.22.40"}, {Range: "0.36.*", Patch: "0.36.8"}}
	got := MergeVersions(prev, []docker.Release{rel("pb", "0.36.9"), rel("pb", "0.36.7"), rel("pb", "0.35.4"), rel("p1", "0.0.1")})
	var ranges []string
	for _, v := range got {
		ranges = append(ranges, v.Range+"="+v.Patch)
	}
	want := []string{"0.36.*=0.36.9", "0.35.*=0.35.4", "0.22.*=0.22.40", "p1:0.0.*=0.0.1"}
	if len(ranges) != len(want) {
		t.Fatalf("got %v, want %v", ranges, want)
	}
	for i := range want {
		if ranges[i] != want[i] {
			t.Fatalf("got %v, want %v", ranges, want)
		}
	}
	if got[2].Pinned() || !got[0].Pinned() {
		t.Fatalf("pinned: %+v", got)
	}
	if rs := Releases(got); len(rs) != 3 {
		t.Fatalf("releases: %+v", rs)
	}
}

// The hooks and dashboard read {versions:[{range, patch}]}; the pinned release rides along in the same entry.
func TestVersionJSON(t *testing.T) {
	b, _ := json.Marshal(VersionFor(rel("pb", "0.36.9")))
	var m map[string]any
	_ = json.Unmarshal(b, &m)
	for _, k := range []string{"range", "patch", "line", "version", "assets"} {
		if _, ok := m[k]; !ok {
			t.Fatalf("%s missing in %s", k, b)
		}
	}
	if m["range"] != "0.36.*" {
		t.Fatalf("range %v", m["range"])
	}
	var old Version
	_ = json.Unmarshal([]byte(`{"range":"0.23.*","patch":"0.23.12"}`), &old)
	if old.Pinned() {
		t.Fatal("a range-only entry isn't pinned")
	}
}
