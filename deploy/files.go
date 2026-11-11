package deploy

import (
	"errors"
	"io"
	"io/fs"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

// File access over HTTPS, the replacement for SFTP: list, download, upload (chunked) and delete files in an instance
// folder. Reach: the code set, node_modules, and pb_data (which needs the instance powered off, read or write).

const (
	maxFileChunkBytes = 64 << 20
	maxListEntries    = 50_000
	uploadSuffix      = ".ph-upload"
)

// isFileAPIPath: the code set, pb_data, and node_modules (at the root or inside a code folder); never .git*.
func isFileAPIPath(p string) bool {
	if !isSafeRelativePath(p) {
		return false
	}
	segs := strings.Split(p, "/")
	first := segs[0]
	if first == dataDir {
		return true
	}
	for _, s := range segs {
		if isGitSegment(s) {
			return false
		}
	}
	if first == nodeModulesDir || first == patchesDir {
		return true
	}
	if isCodePath(p) {
		return true
	}
	if len(segs) > 1 && strings.HasPrefix(first, "pb_") {
		for _, s := range segs {
			if s == nodeModulesDir {
				return true
			}
		}
	}
	return false
}

func isDataPath(p string) bool { return strings.SplitN(p, "/", 2)[0] == dataDir }

// resolveFilePath maps a client path to a filesystem path, refusing anything that escapes the instance folder or
// crosses a symlink.
func resolveFilePath(c *reqCtx, raw string) (rel, fsPath string, err error) {
	p := strings.Trim(raw, "/")
	if p == "" {
		return "", c.dir, nil
	}
	if !isFileAPIPath(p) {
		return "", "", errf(400, "%s is outside the files you can reach (pb_data, pb_hooks, pb_migrations, pb_public and other pb_* folders, node_modules, package.json, bun.lock(b), patches/)", p)
	}
	if isDataPath(p) && c.inst.Power {
		return "", "", errf(409, "Power off the instance before reading or writing pb_data.")
	}
	fsPath = filepath.Join(c.dir, filepath.FromSlash(p))
	cur := c.dir
	for _, seg := range strings.Split(p, "/") {
		cur = filepath.Join(cur, seg)
		st, err := os.Lstat(cur)
		if err != nil {
			break
		}
		if st.Mode()&fs.ModeSymlink != 0 {
			return "", "", errf(400, "%s crosses a symbolic link", p)
		}
	}
	realRoot, err := filepath.EvalSymlinks(c.dir)
	if err != nil {
		realRoot = c.dir
	}
	if realParent, err := filepath.EvalSymlinks(filepath.Dir(fsPath)); err == nil {
		if r, err := filepath.Rel(realRoot, realParent); err != nil || r == ".." || strings.HasPrefix(r, "../") {
			return "", "", errf(400, "Bad path")
		}
	}
	return p, fsPath, nil
}

type fileEntry struct {
	Path        string `json:"path"`
	IsDirectory bool   `json:"isDirectory"`
	Size        int64  `json:"size"`
	Mtime       int64  `json:"mtime"`
}

func mtimeMs(fi os.FileInfo) int64 {
	return int64(math.Round(float64(fi.ModTime().UnixNano()) / 1e6))
}

func flag(r *http.Request, name string) bool {
	v := r.URL.Query().Get(name)
	return v == "1" || v == "true"
}

func (a *API) listFiles(w http.ResponseWriter, r *http.Request) error {
	c, err := a.authorize(r, false)
	if err != nil {
		return err
	}
	rel, fsPath, err := resolveFilePath(c, r.URL.Query().Get("path"))
	if err != nil {
		return err
	}
	recursive := flag(r, "recursive")
	st, err := os.Stat(fsPath)
	if err != nil {
		name := rel
		if name == "" {
			name = "/"
		}
		return errf(404, "%s not found", name)
	}
	out := []fileEntry{}
	if !st.IsDir() {
		out = append(out, fileEntry{rel, false, st.Size(), mtimeMs(st)})
	} else {
		var walk func(dir string)
		walk = func(dir string) {
			entries, _ := os.ReadDir(dir)
			names := make([]string, 0, len(entries))
			for _, e := range entries {
				names = append(names, e.Name())
			}
			sort.Strings(names)
			for _, name := range names {
				if len(out) >= maxListEntries {
					return
				}
				child := filepath.Join(dir, name)
				childRel, _ := filepath.Rel(c.dir, child)
				childRel = filepath.ToSlash(childRel)
				if !isFileAPIPath(childRel) || strings.HasSuffix(name, uploadSuffix) {
					continue
				}
				fi, err := os.Lstat(child)
				if err != nil || fi.Mode()&fs.ModeSymlink != 0 {
					continue
				}
				size := fi.Size()
				if fi.IsDir() {
					size = 0
				}
				out = append(out, fileEntry{childRel, fi.IsDir(), size, mtimeMs(fi)})
				// a powered-on instance still lists pb_data but can't open it
				if fi.IsDir() && recursive && !(isDataPath(childRel) && c.inst.Power) {
					walk(child)
				}
			}
		}
		walk(fsPath)
	}
	writeJSON(w, 200, map[string]any{"path": rel, "entries": out, "truncated": len(out) >= maxListEntries})
	return nil
}

func (a *API) readFile(w http.ResponseWriter, r *http.Request) error {
	c, err := a.authorize(r, false)
	if err != nil {
		return err
	}
	rel, fsPath, err := resolveFilePath(c, r.URL.Query().Get("path"))
	if err != nil {
		return err
	}
	f, err := os.Open(fsPath)
	if err != nil {
		return errf(404, "%s not found", rel)
	}
	defer f.Close()
	st, err := f.Stat()
	if err != nil {
		return err
	}
	if !st.Mode().IsRegular() {
		return errf(400, "%s is a folder", rel)
	}
	h := w.Header()
	h.Set("Content-Type", "application/octet-stream")
	h.Set("Content-Length", strconv.FormatInt(st.Size(), 10))
	h.Set("Cache-Control", "no-store")
	h.Set("X-PH-Mtime", strconv.FormatInt(mtimeMs(st), 10))
	w.WriteHeader(200)
	if r.Method != http.MethodHead {
		_, _ = io.Copy(w, f)
	}
	return nil
}

// writeFile: PUT /files/raw?path=…&offset=…&final=1 writes one chunk to <path>.ph-upload; offset 0 starts over, any
// other offset must equal the bytes received so far; final moves the file into place.
func (a *API) writeFile(w http.ResponseWriter, r *http.Request) error {
	c, err := a.authorize(r, true)
	if err != nil {
		return err
	}
	rel, fsPath, err := resolveFilePath(c, r.URL.Query().Get("path"))
	if err != nil {
		return err
	}
	if rel == "" {
		return errf(400, "path is required")
	}
	offset := float64(0)
	if v := r.URL.Query().Get("offset"); strings.TrimSpace(v) != "" {
		if offset, err = strconv.ParseFloat(strings.TrimSpace(v), 64); err != nil {
			return errf(400, "Bad offset")
		}
	}
	if offset < 0 || offset != math.Trunc(offset) || offset > math.MaxInt64/2 {
		return errf(400, "Bad offset")
	}
	off := int64(offset)
	final := flag(r, "final")
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxFileChunkBytes))
	if err != nil {
		return err
	}
	tmp := fsPath + uploadSuffix

	unlock := a.lock(c.inst.ID)
	defer unlock()
	if st, err := os.Stat(fsPath); err == nil && st.IsDir() {
		return errf(400, "%s is a folder", rel)
	}
	if err := os.MkdirAll(filepath.Dir(fsPath), 0o755); err != nil {
		return err
	}
	have := int64(0)
	if off != 0 {
		have = -1
		if st, err := os.Stat(tmp); err == nil {
			have = st.Size()
		}
	}
	if have != off {
		return errf(409, "Upload out of order: server has %d bytes, got offset %d", max(have, 0), off)
	}
	flags := os.O_CREATE | os.O_WRONLY | os.O_TRUNC
	if off != 0 {
		flags = os.O_WRONLY | os.O_APPEND
	}
	f, err := os.OpenFile(tmp, flags, 0o644)
	if err != nil {
		return err
	}
	if _, err := f.Write(body); err != nil {
		f.Close()
		return err
	}
	if err := f.Close(); err != nil {
		return err
	}
	if final {
		if err := os.Rename(tmp, fsPath); err != nil {
			return err
		}
	}
	writeJSON(w, 200, map[string]any{"path": rel, "size": off + int64(len(body)), "final": final})
	return nil
}

func (a *API) deleteFile(w http.ResponseWriter, r *http.Request) error {
	c, err := a.authorize(r, true)
	if err != nil {
		return err
	}
	rel, fsPath, err := resolveFilePath(c, r.URL.Query().Get("path"))
	if err != nil {
		return err
	}
	if rel == "" || !strings.Contains(rel, "/") {
		name := rel
		if name == "" {
			name = "the instance root"
		}
		return errf(400, "Refusing to delete %s; delete files inside it instead", name)
	}
	recursive := flag(r, "recursive")
	unlock := a.lock(c.inst.ID)
	defer unlock()
	st, err := os.Lstat(fsPath)
	if errors.Is(err, fs.ErrNotExist) {
		return errf(404, "%s not found", rel)
	} else if err != nil {
		return err
	}
	if st.IsDir() {
		if !recursive {
			if entries, _ := os.ReadDir(fsPath); len(entries) > 0 {
				return errf(409, "%s is a folder with files in it; pass recursive to delete it", rel)
			}
		}
		err = os.RemoveAll(fsPath)
	} else {
		err = os.Remove(fsPath)
	}
	if err != nil {
		return err
	}
	writeJSON(w, 200, map[string]any{"path": rel, "deleted": true})
	return nil
}
