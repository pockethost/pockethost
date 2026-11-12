// Package mothershipapp embeds the mothership's built JS app (packages/server/src/mothership-app): the bundled hooks
// (pb_hooks/mothership.pb.js + mothership.js), the JS migrations and the `live` admin add-on. app/ is a copy made by
// sync.sh (go:embed can't reach outside this module); `pnpm check:mothership-embed` fails when it's stale.
package mothershipapp

import (
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
)

//go:embed all:app
var appFiles embed.FS

func sub(dir string) fs.FS {
	f, err := fs.Sub(appFiles, "app/"+dir)
	if err != nil {
		panic(err) // the paths are fixed at build time
	}
	return f
}

// Hooks is pb_hooks: the files jsvm loads (*.pb.js) and the bundle they require (`${__hooks}/mothership`).
func Hooks() fs.FS { return sub("pb_hooks") }

// Migrations is pb_migrations.
func Migrations() fs.FS { return sub("pb_migrations") }

// AdminLive is pb_admin_ext/live, the `live` superuser UI extension.
func AdminLive() fs.FS { return sub("pb_admin_ext/live") }

// Files lists every embedded file (paths relative to app/), sorted.
func Files() ([]string, error) {
	var out []string
	err := fs.WalkDir(appFiles, "app", func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() {
			rel, _ := filepath.Rel("app", p)
			out = append(out, filepath.ToSlash(rel))
		}
		return nil
	})
	sort.Strings(out)
	return out, err
}

// Hash is a sha256 over every embedded file's path and content, so two binaries with the same app print the same
// value in --version.
func Hash() (string, error) {
	files, err := Files()
	if err != nil {
		return "", err
	}
	h := sha256.New()
	for _, f := range files {
		b, err := fs.ReadFile(appFiles, "app/"+f)
		if err != nil {
			return "", err
		}
		h.Write([]byte(f))
		h.Write([]byte{0})
		h.Write(b)
		h.Write([]byte{0})
	}
	return hex.EncodeToString(h.Sum(nil))[:16], nil
}

// Export writes every embedded file under dir (pb_hooks/, pb_migrations/, pb_admin_ext/live/). For debugging: it
// shows exactly what a binary runs. It refuses a non-empty dir.
func Export(dir string) (int, error) {
	if entries, err := os.ReadDir(dir); err == nil && len(entries) > 0 {
		return 0, &os.PathError{Op: "export", Path: dir, Err: fs.ErrExist}
	}
	files, err := Files()
	if err != nil {
		return 0, err
	}
	for _, f := range files {
		b, err := fs.ReadFile(appFiles, "app/"+f)
		if err != nil {
			return 0, err
		}
		dst := filepath.Join(dir, filepath.FromSlash(f))
		if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
			return 0, err
		}
		if err := os.WriteFile(dst, b, 0o644); err != nil {
			return 0, err
		}
	}
	return len(files), nil
}
