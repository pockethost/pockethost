package edge

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Every platform file the Node edge mounts is embedded and written, including the _-prefixed hooks (go:embed skips
// those without all:).
func TestWriteInstanceApp(t *testing.T) {
	dir := t.TempDir()
	binds, err := WriteInstanceApp(dir, "/home/pockethost")
	if err != nil {
		t.Fatal(err)
	}
	want := []string{"pb_hooks/_ph_admin_sync.pb.js", "pb_hooks/_ph_backup.pb.js", "pb_hooks/_ph_lib.js",
		"pb_migrations/1699198734_pockethost_defaults.js", "pb_migrations/1794167719_pockethost_app_url.js"}
	if len(binds) != len(want) {
		t.Fatalf("binds: %v", binds)
	}
	all := strings.Join(binds, "\n")
	for _, rel := range want {
		if _, err := os.Stat(filepath.Join(dir, rel)); err != nil {
			t.Errorf("%s not written: %v", rel, err)
		}
		if !strings.Contains(all, filepath.Join(dir, rel)+":/home/pockethost/"+rel+":ro") {
			t.Errorf("%s not mounted read-only: %v", rel, binds)
		}
	}
}
