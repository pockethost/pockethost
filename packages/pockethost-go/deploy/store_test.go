package deploy

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"slices"
	"testing"
	"time"
)

func sha(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}

type storeFixture struct {
	t              *testing.T
	inst, storeDir string
	store          *Store
}

func newFixture(t *testing.T, platform ...string) *storeFixture {
	root := t.TempDir()
	f := &storeFixture{t: t, inst: filepath.Join(root, "instances", "i1"), storeDir: filepath.Join(root, "deploys", "i1")}
	if err := os.MkdirAll(f.inst, 0o755); err != nil {
		t.Fatal(err)
	}
	f.store = newStore(f.storeDir, f.inst, platform)
	return f
}

func (f *storeFixture) put(rel, content string) {
	p := filepath.Join(f.inst, rel)
	_ = os.MkdirAll(filepath.Dir(p), 0o755)
	if err := os.WriteFile(p, []byte(content), 0o644); err != nil {
		f.t.Fatal(err)
	}
}

func (f *storeFixture) read(rel string) string {
	b, err := os.ReadFile(filepath.Join(f.inst, rel))
	if err != nil {
		f.t.Fatalf("read %s: %v", rel, err)
	}
	return string(b)
}

func (f *storeFixture) has(rel string) bool {
	_, err := os.Lstat(filepath.Join(f.inst, rel))
	return err == nil
}

func (f *storeFixture) symlink(target, rel string) {
	p := filepath.Join(f.inst, rel)
	_ = os.MkdirAll(filepath.Dir(p), 0o755)
	if err := os.Symlink(target, p); err != nil {
		f.t.Fatal(err)
	}
}

// manifestOf uploads each content as a blob and returns its manifest.
func (f *storeFixture) manifestOf(files map[string]string) Manifest {
	m := Manifest{}
	for p, c := range files {
		if _, err := f.store.putBlob(sha(c), []byte(c)); err != nil {
			f.t.Fatal(err)
		}
		m[p] = sha(c)
	}
	return m
}

func (f *storeFixture) deploy(m Manifest, nodeModules bool) (*applyResult, error) {
	st, err := f.store.stage(m, nodeModules)
	if err != nil {
		return nil, err
	}
	return f.store.apply(m, st)
}

func (f *storeFixture) mustDeploy(m Manifest, nodeModules bool) *applyResult {
	f.t.Helper()
	r, err := f.deploy(m, nodeModules)
	if err != nil {
		f.t.Fatal(err)
	}
	return r
}

func (f *storeFixture) tmpEmpty() {
	f.t.Helper()
	entries, _ := os.ReadDir(filepath.Join(f.storeDir, "tmp"))
	if len(entries) != 0 {
		f.t.Fatalf("tmp not cleaned: %v", entries)
	}
}

func eq(t *testing.T, what string, got, want any) {
	t.Helper()
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("%s: got %#v, want %#v", what, got, want)
	}
}

func TestPlanDeploy(t *testing.T) {
	p := planDeploy(Manifest{"a": "1", "b": "2", "c": "3"}, map[string]currentFile{"a": {hash: "1"}, "b": {hash: "x"}, "d": {hash: "4"}})
	eq(t, "plan", p, plan{toWrite: []string{"b", "c"}, toDelete: []string{"d"}, unchanged: 1})
}

func TestStoreScansOnlyTheCodeSet(t *testing.T) {
	f := newFixture(t)
	f.put("pb_hooks/main.pb.js", "hook")
	f.put("pb_data/data.db", "db")
	f.put("pb_hooks/node_modules/x/index.js", "nm")
	f.put("node_modules/y.js", "nm")
	f.put("package.json", "{}")
	f.put("notes.txt", "n")
	files, _, err := f.store.scan(false)
	if err != nil {
		t.Fatal(err)
	}
	keys := slices.Sorted(func(yield func(string) bool) {
		for k := range files {
			if !yield(k) {
				return
			}
		}
	})
	eq(t, "keys", keys, []string{"package.json", "pb_hooks/main.pb.js"})
	eq(t, "hash", files["package.json"].hash, sha("{}"))
}

func TestStorePlatformPlaceholders(t *testing.T) {
	f := newFixture(t, "pb_hooks/_ph_backup.pb.js", "pb_migrations/1699198734_pockethost_defaults.js")
	f.put("pb_hooks/_ph_backup.pb.js", "")
	f.put("pb_migrations/1699198734_pockethost_defaults.js", "")
	f.put("pb_hooks/old.pb.js", "old")
	r := f.mustDeploy(f.manifestOf(map[string]string{"pb_hooks/new.pb.js": "new"}), false)
	eq(t, "deleted", r.deleted, []string{"pb_hooks/old.pb.js"})
	if !f.has("pb_hooks/_ph_backup.pb.js") || !f.has("pb_migrations/1699198734_pockethost_defaults.js") {
		t.Fatal("platform placeholder removed")
	}
}

func TestStoreFindMissing(t *testing.T) {
	f := newFixture(t)
	f.put("pb_hooks/a.pb.js", "A")
	m := Manifest{"pb_hooks/a.pb.js": sha("A"), "pb_hooks/copy.pb.js": sha("A"), "pb_hooks/b.pb.js": sha("B"), "pb_hooks/b2.pb.js": sha("B")}
	missing, _ := f.store.findMissing(m, false)
	eq(t, "missing", missing, []string{sha("B")})
	_, _ = f.store.putBlob(sha("B"), []byte("B"))
	missing, _ = f.store.findMissing(m, false)
	eq(t, "missing after upload", missing, []string{})
}

// previewDeletes lists the customer files a commit would delete: not platform files, pb_data or node_modules.
func TestStorePreviewDeletes(t *testing.T) {
	f := newFixture(t, "pb_hooks/_ph_backup.pb.js")
	f.put("pb_hooks/_ph_backup.pb.js", "")
	f.put("pb_hooks/keep.pb.js", "keep")
	f.put("pb_hooks/gone.pb.js", "gone")
	f.put("pb_public/old/page.html", "old")
	f.put("pb_data/data.db", "db")
	f.put("node_modules/dep/index.js", "dep")
	got, err := f.store.previewDeletes(Manifest{"pb_hooks/keep.pb.js": sha("keep"), "node_modules/other/index.js": sha("x")}, true)
	if err != nil {
		t.Fatal(err)
	}
	eq(t, "toDelete", got, []string{"pb_hooks/gone.pb.js", "pb_public/old/page.html"})
}

func TestStoreApply(t *testing.T) {
	f := newFixture(t)
	f.put("pb_hooks/old.pb.js", "old")
	f.put("pb_hooks/keep.pb.js", "keep")
	f.put("pb_public/sub/dir/page.html", "gone")
	f.put("pb_data/data.db", "db")
	f.put("pb_hooks/node_modules/dep.js", "dep")
	f.put("notes.txt", "user file")
	m := f.manifestOf(map[string]string{"pb_hooks/new.pb.js": "new", "pb_public/index.html": "<h1>"})
	m["pb_hooks/keep.pb.js"] = sha("keep")
	m["pb_hooks/copy-of-keep.pb.js"] = sha("keep")
	r := f.mustDeploy(m, false)
	eq(t, "written", r.written, []string{"pb_hooks/copy-of-keep.pb.js", "pb_hooks/new.pb.js", "pb_public/index.html"})
	eq(t, "deleted", r.deleted, []string{"pb_hooks/old.pb.js", "pb_public/sub/dir/page.html"})
	eq(t, "unchanged", r.unchanged, 1)
	eq(t, "new", f.read("pb_hooks/new.pb.js"), "new")
	eq(t, "copy", f.read("pb_hooks/copy-of-keep.pb.js"), "keep")
	if f.has("pb_hooks/old.pb.js") || f.has("pb_public/sub") || !f.has("pb_public") {
		t.Fatal("stale files/dirs")
	}
	eq(t, "data", f.read("pb_data/data.db"), "db")
	eq(t, "nested nm", f.read("pb_hooks/node_modules/dep.js"), "dep")
	eq(t, "notes", f.read("notes.txt"), "user file")
	eq(t, "total", r.totalBytes, int64(len("new")+len("<h1>")+2*len("keep")))
	f.tmpEmpty()
}

func TestStoreFileDirSwap(t *testing.T) {
	f := newFixture(t)
	f.put("pb_public/a", "file")
	f.put("pb_public/b/index.html", "dir")
	f.mustDeploy(f.manifestOf(map[string]string{"pb_public/a/index.html": "x", "pb_public/b": "x"}), false)
	eq(t, "a", f.read("pb_public/a/index.html"), "x")
	eq(t, "b", f.read("pb_public/b"), "x")
}

func TestStoreMissingBlobs(t *testing.T) {
	f := newFixture(t)
	f.put("pb_hooks/a.pb.js", "A")
	_, err := f.store.stage(Manifest{"pb_hooks/b.pb.js": sha("B")}, false)
	var mb *MissingBlobsError
	if !errors.As(err, &mb) || !reflect.DeepEqual(mb.Missing, []string{sha("B")}) {
		t.Fatal(err)
	}
	eq(t, "a", f.read("pb_hooks/a.pb.js"), "A")
}

func TestStoreRollback(t *testing.T) {
	f := newFixture(t)
	f.put("pb_hooks/a.pb.js", "A")
	f.put("pb_hooks/stale.pb.js", "S")
	f.put("pb_public/blocker/node_modules/x.js", "kept")
	_, err := f.deploy(f.manifestOf(map[string]string{"pb_hooks/a.pb.js": "A2", "pb_public/blocker": "X"}), false)
	var ce *ConflictError
	if !errors.As(err, &ce) {
		t.Fatal(err)
	}
	eq(t, "a", f.read("pb_hooks/a.pb.js"), "A")
	eq(t, "stale", f.read("pb_hooks/stale.pb.js"), "S")
	eq(t, "blocker", f.read("pb_public/blocker/node_modules/x.js"), "kept")
	f.tmpEmpty()
}

func TestStoreRefusesSymlinks(t *testing.T) {
	f := newFixture(t)
	f.put("outside.txt", "secret")
	f.symlink(filepath.Join(f.inst, "outside.txt"), "pb_hooks/link.js")
	_, _, err := f.store.scan(false)
	var ce *ConflictError
	if !errors.As(err, &ce) {
		t.Fatal(err)
	}
}

func TestStoreManifestsAndGC(t *testing.T) {
	f := newFixture(t)
	for _, v := range []string{"v1", "v2", "v3"} {
		m := f.manifestOf(map[string]string{"pb_hooks/main.pb.js": v})
		f.mustDeploy(m, false)
		if err := f.store.recordManifest("d-"+v, m); err != nil {
			t.Fatal(err)
		}
		time.Sleep(5 * time.Millisecond)
	}
	_, _ = f.store.putBlob(sha("orphan"), []byte("orphan"))
	removed, err := f.store.gc(2)
	if err != nil {
		t.Fatal(err)
	}
	eq(t, "removed", removed, 2)
	if f.store.hasBlob(sha("v1")) || !f.store.hasBlob(sha("v2")) || !f.store.hasBlob(sha("v3")) {
		t.Fatal("wrong blobs kept")
	}
	entries, _ := os.ReadDir(filepath.Join(f.storeDir, "manifests"))
	eq(t, "manifests", []string{entries[0].Name(), entries[1].Name()}, []string{"d-v2.json", "d-v3.json"})
}

func TestStoreNodeModules(t *testing.T) {
	t.Run("plain files, then a removed package", func(t *testing.T) {
		f := newFixture(t)
		v1 := map[string]string{"pb_hooks/main.pb.js": "hook", "node_modules/marked/package.json": `{"name":"marked"}`,
			"node_modules/marked/lib/marked.cjs": "marked", "node_modules/a/node_modules/b/index.js": "b", "node_modules/@s/x/index.js": "x"}
		r1 := f.mustDeploy(f.manifestOf(v1), false)
		eq(t, "written", len(r1.written), 5)
		eq(t, "replaced", r1.replacedNodeModule, false)
		eq(t, "b", f.read("node_modules/a/node_modules/b/index.js"), "b")
		r2 := f.mustDeploy(f.manifestOf(map[string]string{"pb_hooks/main.pb.js": "hook", "node_modules/a/node_modules/b/index.js": "b", "node_modules/@s/x/index.js": "x2"}), false)
		eq(t, "deleted", r2.deleted, []string{"node_modules/marked/lib/marked.cjs", "node_modules/marked/package.json"})
		eq(t, "written", r2.written, []string{"node_modules/@s/x/index.js"})
		eq(t, "unchanged", r2.unchanged, 2)
		if f.has("node_modules/marked") {
			t.Fatal("empty package dir left")
		}
		f.tmpEmpty()
	})
	t.Run("left alone when not managed", func(t *testing.T) {
		f := newFixture(t)
		f.put("node_modules/old/index.js", "server-installed")
		f.symlink("../old/index.js", "node_modules/.bin/old")
		r := f.mustDeploy(f.manifestOf(map[string]string{"pb_hooks/main.pb.js": "hook"}), false)
		eq(t, "r", [][]string{r.written, r.deleted}, [][]string{{"pb_hooks/main.pb.js"}, {}})
		eq(t, "old", f.read("node_modules/old/index.js"), "server-installed")
		if l, _ := os.Readlink(filepath.Join(f.inst, "node_modules/.bin/old")); l != "../old/index.js" {
			t.Fatal("link changed")
		}
	})
	t.Run("emptied when managed with no packages", func(t *testing.T) {
		f := newFixture(t)
		f.put("node_modules/old/index.js", "old")
		f.put("node_modules/@s/x/index.js", "x")
		r := f.mustDeploy(f.manifestOf(map[string]string{"pb_hooks/main.pb.js": "hook"}), true)
		eq(t, "deleted", r.deleted, []string{"node_modules/@s/x/index.js", "node_modules/old/index.js"})
		eq(t, "replaced", r.replacedNodeModule, false)
	})
	t.Run("symlinks inside: replaced, files reused", func(t *testing.T) {
		f := newFixture(t)
		f.put("node_modules/old/index.js", "old")
		f.put("node_modules/marked/lib/marked.cjs", "marked")
		f.put("outside/secret.txt", "secret")
		f.symlink("../old/index.js", "node_modules/.bin/old")
		f.symlink(filepath.Join(f.inst, "outside"), "node_modules/linked")
		m := Manifest{"node_modules/marked/lib/marked.cjs": sha("marked"), "node_modules/new/index.js": sha("new")}
		missing, _ := f.store.findMissing(m, false)
		eq(t, "missing", missing, []string{sha("new")})
		_, _ = f.store.putBlob(sha("new"), []byte("new"))
		r := f.mustDeploy(m, false)
		eq(t, "replaced", r.replacedNodeModule, true)
		eq(t, "written", r.written, []string{"node_modules/marked/lib/marked.cjs", "node_modules/new/index.js"})
		entries, _ := os.ReadDir(filepath.Join(f.inst, "node_modules"))
		eq(t, "entries", len(entries), 2)
		eq(t, "secret", f.read("outside/secret.txt"), "secret")
		again := f.mustDeploy(m, false)
		eq(t, "again", []any{len(again.written), len(again.deleted), again.unchanged, again.replacedNodeModule}, []any{0, 0, 2, false})
	})
	t.Run("node_modules itself a symlink", func(t *testing.T) {
		f := newFixture(t)
		f.put("elsewhere/x.js", "x")
		f.symlink(filepath.Join(f.inst, "elsewhere"), "node_modules")
		r := f.mustDeploy(f.manifestOf(map[string]string{"node_modules/y/index.js": "y"}), false)
		eq(t, "replaced", r.replacedNodeModule, true)
		eq(t, "x", f.read("elsewhere/x.js"), "x")
		eq(t, "y", f.read("node_modules/y/index.js"), "y")
	})
	t.Run("restored on failure", func(t *testing.T) {
		f := newFixture(t)
		f.put("node_modules/old/index.js", "old")
		f.symlink("../old/index.js", "node_modules/.bin/old")
		f.put("pb_public/blocker/node_modules/x.js", "kept")
		_, err := f.deploy(f.manifestOf(map[string]string{"node_modules/new/index.js": "new", "pb_public/blocker": "X"}), false)
		var ce *ConflictError
		if !errors.As(err, &ce) {
			t.Fatal(err)
		}
		eq(t, "old", f.read("node_modules/old/index.js"), "old")
		if l, _ := os.Readlink(filepath.Join(f.inst, "node_modules/.bin/old")); l != "../old/index.js" {
			t.Fatal("link not restored")
		}
		if f.has("node_modules/new") {
			t.Fatal("new package left behind")
		}
	})
	t.Run("never touches node_modules in code folders", func(t *testing.T) {
		f := newFixture(t)
		f.put("pb_hooks/node_modules/dep/index.js", "dep")
		r := f.mustDeploy(f.manifestOf(map[string]string{"node_modules/y/index.js": "y", "pb_hooks/main.pb.js": "hook"}), false)
		eq(t, "deleted", r.deleted, []string{})
		eq(t, "dep", f.read("pb_hooks/node_modules/dep/index.js"), "dep")
	})
}
