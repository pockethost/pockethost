package mothershipapp

import (
	"io/fs"
	"os"
	"path/filepath"
	"testing"
)

func TestEmbeddedAppHasItsPieces(t *testing.T) {
	for _, c := range []struct {
		fsys fs.FS
		name string
	}{
		{Hooks(), "mothership.pb.js"},
		{Hooks(), "mothership.js"},
		{Migrations(), "1781362614_collections_snapshot.js"},
		{AdminLive(), "main.js"},
		{AdminLive(), "style.css"},
	} {
		if _, err := fs.Stat(c.fsys, c.name); err != nil {
			t.Errorf("%s: %v", c.name, err)
		}
	}
}

func TestExportMatchesEmbedded(t *testing.T) {
	dir := t.TempDir()
	n, err := Export(dir)
	if err != nil {
		t.Fatal(err)
	}
	files, _ := Files()
	if n != len(files) || n == 0 {
		t.Fatalf("exported %d of %d", n, len(files))
	}
	for _, f := range files {
		want, _ := fs.ReadFile(appFiles, "app/"+f)
		got, err := os.ReadFile(filepath.Join(dir, filepath.FromSlash(f)))
		if err != nil || string(got) != string(want) {
			t.Fatalf("%s differs (%v)", f, err)
		}
	}
	if _, err := Export(dir); err == nil {
		t.Fatal("export into a non-empty dir should fail")
	}
}

func TestHashIsStable(t *testing.T) {
	a, err := Hash()
	b, _ := Hash()
	if err != nil || a != b || len(a) != 16 {
		t.Fatalf("%q %q %v", a, b, err)
	}
}
