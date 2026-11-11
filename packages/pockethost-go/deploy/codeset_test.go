package deploy

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"testing"
)

var h64 = strings.Repeat("a", 64)

func TestIsCodePath(t *testing.T) {
	for _, p := range []string{"pb_hooks/main.pb.js", "pb_migrations/1_init.js", "pb_public/index.html", "pb_public/a/b/c.css",
		"package.json", "bun.lock", "bun.lockb", "patches/foo.patch", "pb_schema.json", "node_modules/marked/lib/marked.cjs",
		"node_modules/marked/package.json", "node_modules/a/node_modules/b/index.js", "node_modules/@scope/pkg/dist/index.mjs",
		"node_modules/.bin/x"} {
		if !isCodePath(p) {
			t.Errorf("should accept %q", p)
		}
	}
	for _, p := range []string{"pb_data/data.db", "pb_data", "node_modules", "pb_hooks/node_modules/x.js", "pb_public/node_modules/x.js",
		"patches/node_modules/x.patch", "node_modules/x/.github/workflows/ci.yml", "node_modules/x/.gitignore",
		"node_modules/../pb_data/data.db", "node_modules//x.js", "pb_hooks/.git/config", "pb_public/.gitignore", "README.md",
		"src/index.ts", "patches", "../etc/passwd", "pb_hooks/../pb_data/data.db", "/pb_hooks/x.js", "pb_hooks//x.js",
		"pb_hooks/./x.js", "pb_hooks\\x.js", ""} {
		if isCodePath(p) {
			t.Errorf("should reject %q", p)
		}
	}
}

func TestValidateManifest(t *testing.T) {
	m, err := validateManifest(map[string]any{"pb_hooks/a.pb.js": h64, "package.json": h64})
	if err != nil || len(m) != 2 {
		t.Fatal(m, err)
	}
	bad := func(raw any, want string) {
		t.Helper()
		_, err := validateManifest(raw)
		var me *ManifestError
		if !errors.As(err, &me) || !regexp.MustCompile(want).MatchString(err.Error()) {
			t.Errorf("want %q, got %v", want, err)
		}
	}
	bad(map[string]any{"pb_data/data.db": h64}, "outside the deployable set")
	bad(map[string]any{"pb_hooks/a.js": "nope"}, "sha256")
	bad(map[string]any{"pb_hooks/a.js": strings.ToUpper(h64)}, "sha256")
	bad(map[string]any{"pb_hooks/a.js": 5.0}, "sha256")
	bad(nil, "files must be an object")
	bad([]any{}, "files must be an object")
	bad(map[string]any{"pb_hooks/node_modules/x.js": h64}, `pb_hooks/node_modules/x.js is outside the deployable set.*no node_modules inside other folders`)
	bad(map[string]any{"pb_public/a": h64, "pb_public/a/b.html": h64}, "pb_public/a is both a file and a directory")
	many := func(prefix string) map[string]any {
		out := map[string]any{}
		for i := 0; i <= maxManifestFiles; i++ {
			out[fmt.Sprintf("%s/f%d.js", prefix, i)] = h64
		}
		return out
	}
	bad(many("pb_hooks"), `^Too many files \(20001\); a deploy can have at most 20000\.$`)
	bad(many("node_modules/x"), `Too many files \(20001, 20001 of them in node_modules\).*only production dependencies`)
}

func TestBundle(t *testing.T) {
	gz := encodeBundle([]byte("hello"), []byte{})
	got, err := decodeBundle(gz, 1<<20)
	if err != nil || len(got) != 2 || string(got[0].data) != "hello" || got[1].hash != "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" {
		t.Fatal(got, err)
	}
	if _, err := decodeBundle([]byte("nope"), 1<<20); err == nil || !strings.HasPrefix(err.Error(), "Could not decompress bundle: ") {
		t.Fatal(err)
	}
	if _, err := decodeBundle(gz, 10); err == nil || !strings.HasPrefix(err.Error(), "Could not decompress bundle: ") {
		t.Fatal("size cap", err)
	}
	gzOf := func(raw []byte) []byte { return encodeRaw(raw) }
	if _, err := decodeBundle(gzOf([]byte("XXXX")), 1<<20); err == nil || err.Error() != "Not a PocketHost deploy bundle" {
		t.Fatal(err)
	}
	if _, err := decodeBundle(gzOf([]byte("PHB1abc")), 1<<20); err == nil || err.Error() != "Truncated bundle" {
		t.Fatal(err)
	}
	raw := append([]byte("PHB1"), make([]byte, 32)...)
	raw = append(raw, 0, 0, 0, 1, 'x')
	if _, err := decodeBundle(gzOf(raw), 1<<20); err == nil || !strings.HasPrefix(err.Error(), "Hash mismatch for 0000") {
		t.Fatal(err)
	}
	raw = append([]byte("PHB1"), make([]byte, 32)...)
	raw = append(raw, 0, 0, 0, 9, 'x')
	if _, err := decodeBundle(gzOf(raw), 1<<20); err == nil || err.Error() != "Truncated bundle" {
		t.Fatal(err)
	}
}
