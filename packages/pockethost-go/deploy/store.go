package deploy

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"sort"
	"strings"
	"sync"
	"time"
)

// Store is one instance's deploy storage, outside the instance folder (so file access never sees it) but on the same
// filesystem (so staged files can be renamed into place):
//
//	<root>/blobs/<aa>/<sha256>   content-addressed file store (kept for history/rollback)
//	<root>/manifests/<id>.json   manifest of each successful deploy
//	<root>/tmp/                  staging and backup dirs for an in-flight deploy
//
// The root node_modules is managed only by deploys that say so (nodeModules: true) or whose manifest has
// node_modules/ paths; a managed node_modules ends up exactly as the manifest describes. Other deploys leave it alone.
type Store struct {
	root, instanceDir string
	platform          map[string]bool

	mu        sync.Mutex
	hashCache map[string]hashEntry
}

type hashEntry struct {
	size, mtime int64
	hash        string
}

// keepManifests is how many deploys' manifests (and their blobs) are kept.
const keepManifests = 10

// MissingBlobsError: files the client must upload first (409 {missing}).
type MissingBlobsError struct{ Missing []string }

func (e *MissingBlobsError) Error() string {
	return fmt.Sprintf("%d file(s) must be uploaded first", len(e.Missing))
}

// ConflictError: the instance folder is in a state a deploy can't change (409).
type ConflictError struct{ msg string }

func (e *ConflictError) Error() string { return e.msg }

// newStore creates the store for one instance. platform paths are code-set paths that aren't the customer's (never
// compared or deleted).
func newStore(root, instanceDir string, platform []string) *Store {
	p := map[string]bool{}
	for _, x := range platform {
		p[x] = true
	}
	return &Store{root: root, instanceDir: instanceDir, platform: p, hashCache: map[string]hashEntry{}}
}

func (s *Store) blobsDir() string     { return filepath.Join(s.root, "blobs") }
func (s *Store) manifestsDir() string { return filepath.Join(s.root, "manifests") }
func (s *Store) tmpDir() string       { return filepath.Join(s.root, "tmp") }

func (s *Store) blobPath(hash string) string { return filepath.Join(s.blobsDir(), hash[:2], hash) }

func (s *Store) hasBlob(hash string) bool {
	_, err := os.Stat(s.blobPath(hash))
	return err == nil
}

func randHex() string {
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func tmpName(prefix string) string {
	return fmt.Sprintf("%s-%d-%s", prefix, time.Now().UnixMilli(), randHex())
}

// putBlob stores data (already verified against hash); false if the store had it.
func (s *Store) putBlob(hash string, data []byte) (bool, error) {
	dest := s.blobPath(hash)
	if _, err := os.Stat(dest); err == nil {
		return false, nil
	}
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return false, err
	}
	tmp := dest + "." + randHex() + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		_ = os.Remove(tmp)
		return false, err
	}
	return true, os.Rename(tmp, dest)
}

func sha256File(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func copyFile(src, dest string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(dest, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		return err
	}
	return out.Close()
}

// ingestFile copies a file into the blob store if the store doesn't have it (verifying the hash).
func (s *Store) ingestFile(hash, path string) error {
	if s.hasBlob(hash) {
		return nil
	}
	dest := s.blobPath(hash)
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return err
	}
	tmp := dest + "." + randHex() + ".tmp"
	if err := copyFile(path, tmp); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	if h, err := sha256File(tmp); err != nil || h != hash {
		_ = os.Remove(tmp)
		return err
	}
	return os.Rename(tmp, dest)
}

func (s *Store) hashWithCache(path string, size, mtime int64) (string, error) {
	s.mu.Lock()
	c, ok := s.hashCache[path]
	s.mu.Unlock()
	if ok && c.size == size && c.mtime == mtime {
		return c.hash, nil
	}
	h, err := sha256File(path)
	if err != nil {
		return "", err
	}
	s.mu.Lock()
	s.hashCache[path] = hashEntry{size, mtime, h}
	s.mu.Unlock()
	return h, nil
}

type currentFile struct {
	path string
	size int64
	hash string
}

// scan walks the code set in the instance folder. Symlinks in the code set are refused. The root node_modules is
// walked only when withNodeModules is set; there, anything a deploy can't represent (symlinks, .git* entries, special
// files) marks the whole folder for replacement instead of failing.
func (s *Store) scan(withNodeModules bool) (files map[string]currentFile, replaceNodeModules bool, err error) {
	files = map[string]currentFile{}
	if _, err := os.Stat(s.instanceDir); err != nil {
		return files, false, nil
	}
	var walk func(dir string) error
	walk = func(dir string) error {
		entries, err := os.ReadDir(dir)
		if err != nil {
			return err
		}
		for _, e := range entries {
			name := e.Name()
			fsPath := filepath.Join(dir, name)
			rel, _ := filepath.Rel(s.instanceDir, fsPath)
			rel = filepath.ToSlash(rel)
			inNM := isNodeModulesPath(rel)
			if dir == s.instanceDir && !isCodeRoot(name) && !(withNodeModules && name == nodeModulesDir) {
				continue
			}
			st, err := os.Lstat(fsPath)
			if err != nil {
				return err
			}
			mode := st.Mode()
			add := func() error {
				h, err := s.hashWithCache(fsPath, st.Size(), st.ModTime().UnixNano())
				if err != nil {
					return err
				}
				files[rel] = currentFile{fsPath, st.Size(), h}
				return nil
			}
			if inNM {
				switch {
				case mode.IsRegular() && isCodePath(rel):
					if err := add(); err != nil {
						return err
					}
				case mode.IsDir() && isCodePath(rel+"/x"):
					if err := walk(fsPath); err != nil {
						return err
					}
				case rel == nodeModulesDir && mode.IsRegular():
					// a stray file named node_modules: apply moves it aside when the first package dir is created
				default:
					replaceNodeModules = true
				}
				continue
			}
			if mode&fs.ModeSymlink != 0 {
				if isCodePath(rel) {
					return &ConflictError{rel + " is a symlink; remove it and redeploy"}
				}
				continue
			}
			if mode.IsDir() {
				// .git* dirs (and node_modules outside the root) are never walked into
				if isCodePath(rel + "/x") {
					if err := walk(fsPath); err != nil {
						return err
					}
				}
				continue
			}
			if !mode.IsRegular() || !isCodePath(rel) || s.platform[rel] {
				continue
			}
			if err := add(); err != nil {
				return err
			}
		}
		return nil
	}
	err = walk(s.instanceDir)
	return files, replaceNodeModules, err
}

// managesNodeModules: the client says so, or the manifest ships files in node_modules.
func managesNodeModules(m Manifest, nodeModules bool) bool {
	if nodeModules {
		return true
	}
	for p := range m {
		if isNodeModulesPath(p) {
			return true
		}
	}
	return false
}

type plan struct {
	toWrite, toDelete []string
	unchanged         int
}

// planDeploy: what has to change on disk to make current match the manifest.
func planDeploy(m Manifest, current map[string]currentFile) plan {
	p := plan{toWrite: []string{}, toDelete: []string{}}
	for path, hash := range m {
		if c, ok := current[path]; ok && c.hash == hash {
			p.unchanged++
		} else {
			p.toWrite = append(p.toWrite, path)
		}
	}
	for path := range current {
		if _, ok := m[path]; !ok {
			p.toDelete = append(p.toDelete, path)
		}
	}
	sort.Strings(p.toWrite)
	sort.Strings(p.toDelete)
	return p
}

// findMissing: hashes the client must upload (not in the blob store and not anywhere in the current code set).
func (s *Store) findMissing(m Manifest, nodeModules bool) ([]string, error) {
	current, _, err := s.scan(managesNodeModules(m, nodeModules))
	if err != nil {
		return nil, err
	}
	onDisk := map[string]bool{}
	for _, f := range current {
		onDisk[f.hash] = true
	}
	seen := map[string]bool{}
	missing := []string{}
	for _, path := range sortedKeys(m) {
		h := m[path]
		if !onDisk[h] && !seen[h] && !s.hasBlob(h) {
			seen[h] = true
			missing = append(missing, h)
		}
	}
	return missing, nil
}

// previewDeletes: customer files a commit of m would delete (for the CLI's confirmation). node_modules is left out:
// the deploy owns it and removes packages no longer shipped.
func (s *Store) previewDeletes(m Manifest, nodeModules bool) ([]string, error) {
	current, _, err := s.scan(managesNodeModules(m, nodeModules))
	if err != nil {
		return nil, err
	}
	out := []string{}
	for _, p := range planDeploy(m, current).toDelete {
		if !isNodeModulesPath(p) {
			out = append(out, p)
		}
	}
	return out, nil
}

func sortedKeys(m Manifest) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

type staged struct {
	plan               plan
	stagingDir         string
	replaceNodeModules bool
}

// stage copies every file that must change into a staging dir and verifies its hash. Nothing in the instance folder
// is touched. Returns *MissingBlobsError if a needed file is neither uploaded nor on disk.
func (s *Store) stage(m Manifest, nodeModules bool) (*staged, error) {
	onDisk, replaceNM, err := s.scan(managesNodeModules(m, nodeModules))
	if err != nil {
		return nil, err
	}
	// when node_modules is replaced wholesale, every file in it is written fresh and nothing in it is deleted one by one
	current := onDisk
	if replaceNM {
		current = map[string]currentFile{}
		for rel, f := range onDisk {
			if !isNodeModulesPath(rel) {
				current[rel] = f
			}
		}
	}
	p := planDeploy(m, current)
	byHash := map[string]string{}
	for _, f := range onDisk {
		byHash[f.hash] = f.path
	}
	stagingDir := filepath.Join(s.tmpDir(), tmpName("stage"))
	if err := os.MkdirAll(stagingDir, 0o755); err != nil {
		return nil, err
	}
	fail := func(err error) (*staged, error) {
		_ = os.RemoveAll(stagingDir)
		return nil, err
	}
	missing := map[string]bool{}
	var missingList []string
	addMissing := func(h string) {
		if !missing[h] {
			missing[h] = true
			missingList = append(missingList, h)
		}
	}
	for _, path := range p.toWrite {
		hash := m[path]
		src := ""
		if s.hasBlob(hash) {
			src = s.blobPath(hash)
		} else if f, ok := byHash[hash]; ok {
			src = f
		}
		if src == "" {
			addMissing(hash)
			continue
		}
		dest := filepath.Join(stagingDir, filepath.FromSlash(path))
		if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
			return fail(err)
		}
		if err := copyFile(src, dest); err != nil {
			return fail(err)
		}
		if h, err := sha256File(dest); err != nil || h != hash {
			addMissing(hash)
		}
	}
	if len(missingList) > 0 {
		return fail(&MissingBlobsError{missingList})
	}
	return &staged{p, stagingDir, replaceNM}, nil
}

type applyResult struct {
	written, deleted   []string
	unchanged          int
	totalBytes         int64
	replacedNodeModule bool
}

// apply renames staged files into the instance folder and moves stale files out. Every displaced file goes to a
// backup dir first, so any failure is rolled back. Call it while the instance is stopped: it takes milliseconds.
func (s *Store) apply(m Manifest, st *staged) (*applyResult, error) {
	backupDir := filepath.Join(s.tmpDir(), tmpName("backup"))
	var undo []func()
	inst := func(rel string) string { return filepath.Join(s.instanceDir, filepath.FromSlash(rel)) }

	moveToBackup := func(rel string) error {
		from, to := inst(rel), filepath.Join(backupDir, filepath.FromSlash(rel))
		if err := os.MkdirAll(filepath.Dir(to), 0o755); err != nil {
			return err
		}
		if err := os.Rename(from, to); err != nil {
			return err
		}
		undo = append(undo, func() {
			_ = os.MkdirAll(filepath.Dir(from), 0o755)
			_ = os.Rename(to, from)
		})
		return nil
	}

	// ensureParents makes sure every parent of rel is a real directory inside the instance folder
	ensureParents := func(rel string) error {
		segs := strings.Split(rel, "/")
		segs = segs[:len(segs)-1]
		for i := 1; i <= len(segs); i++ {
			dirRel := strings.Join(segs[:i], "/")
			fsPath := inst(dirRel)
			fi, err := os.Lstat(fsPath)
			if err != nil {
				if err := os.Mkdir(fsPath, 0o755); err != nil {
					return err
				}
				undo = append(undo, func() { _ = os.Remove(fsPath) })
				continue
			}
			if fi.Mode()&fs.ModeSymlink != 0 {
				return &ConflictError{dirRel + " is a symlink"}
			}
			if fi.IsDir() {
				continue
			}
			// a file where a directory needs to be: stale (validateManifest forbids file+dir), so back it up
			if err := moveToBackup(dirRel); err != nil {
				return err
			}
			if err := os.Mkdir(fsPath, 0o755); err != nil {
				return err
			}
			undo = append(undo, func() { _ = os.Remove(fsPath) })
		}
		return nil
	}

	pruneEmptyDirs := func(rels []string) {
		dirs := map[string]bool{}
		for _, rel := range rels {
			segs := strings.Split(rel, "/")
			// never remove a top-level dir (pb_hooks etc.)
			for i := len(segs) - 1; i >= 2; i-- {
				dirs[strings.Join(segs[:i], "/")] = true
			}
		}
		list := make([]string, 0, len(dirs))
		for d := range dirs {
			list = append(list, d)
		}
		slices.SortFunc(list, func(a, b string) int { return strings.Count(b, "/") - strings.Count(a, "/") })
		for _, d := range list {
			fsPath := inst(d)
			if os.Remove(fsPath) == nil { // only succeeds when empty
				undo = append(undo, func() { _ = os.MkdirAll(fsPath, 0o755) })
			}
		}
	}

	run := func() error {
		if err := os.MkdirAll(s.instanceDir, 0o755); err != nil {
			return err
		}
		if st.replaceNodeModules {
			if err := moveToBackup(nodeModulesDir); err != nil {
				return err
			}
		}
		for _, rel := range st.plan.toDelete {
			if err := moveToBackup(rel); err != nil {
				return err
			}
		}
		pruneEmptyDirs(st.plan.toDelete)
		for _, rel := range st.plan.toWrite {
			if err := ensureParents(rel); err != nil {
				return err
			}
			dest := inst(rel)
			if fi, err := os.Lstat(dest); err == nil {
				if fi.IsDir() {
					return &ConflictError{rel + " is a directory on the server with files the deploy can't remove"}
				}
				if err := moveToBackup(rel); err != nil {
					return err
				}
			}
			src := filepath.Join(st.stagingDir, filepath.FromSlash(rel))
			if err := os.Rename(src, dest); err != nil {
				return err
			}
			undo = append(undo, func() { _ = os.Rename(dest, src) })
		}
		return nil
	}

	err := run()
	if err != nil {
		for i := len(undo) - 1; i >= 0; i-- {
			undo[i]()
		}
	}
	_ = os.RemoveAll(backupDir)
	_ = os.RemoveAll(st.stagingDir)
	if err != nil {
		return nil, err
	}

	var total int64
	for rel := range m {
		if fi, err := os.Lstat(inst(rel)); err == nil {
			total += fi.Size()
		}
	}
	return &applyResult{st.plan.toWrite, st.plan.toDelete, st.plan.unchanged, total, st.replaceNodeModules}, nil
}

type manifestDoc struct {
	DeployID string   `json:"deployId"`
	At       int64    `json:"at"`
	Manifest Manifest `json:"manifest"`
}

// recordManifest keeps a copy of every deployed file in the blob store and records the manifest.
func (s *Store) recordManifest(deployID string, m Manifest) error {
	for rel, hash := range m {
		_ = s.ingestFile(hash, filepath.Join(s.instanceDir, filepath.FromSlash(rel)))
	}
	if err := os.MkdirAll(s.manifestsDir(), 0o755); err != nil {
		return err
	}
	b, _ := json.Marshal(manifestDoc{deployID, time.Now().UnixMilli(), m})
	return os.WriteFile(filepath.Join(s.manifestsDir(), deployID+".json"), b, 0o644)
}

// gc drops old manifests and every blob no remaining manifest references.
func (s *Store) gc(keep int) (int, error) {
	entries, err := os.ReadDir(s.manifestsDir())
	if errors.Is(err, fs.ErrNotExist) {
		return 0, nil
	} else if err != nil {
		return 0, err
	}
	type doc struct {
		file string
		manifestDoc
	}
	var docs []doc
	for _, e := range entries {
		if !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		b, err := os.ReadFile(filepath.Join(s.manifestsDir(), e.Name()))
		if err != nil {
			return 0, err
		}
		var d manifestDoc
		if err := json.Unmarshal(b, &d); err != nil {
			return 0, fmt.Errorf("%s: %w", e.Name(), err)
		}
		docs = append(docs, doc{e.Name(), d})
	}
	sort.SliceStable(docs, func(i, j int) bool { return docs[i].At > docs[j].At })
	live := map[string]bool{}
	for i, d := range docs {
		if i >= keep {
			_ = os.Remove(filepath.Join(s.manifestsDir(), d.file))
			continue
		}
		for _, h := range d.Manifest {
			live[h] = true
		}
	}
	removed := 0
	prefixes, err := os.ReadDir(s.blobsDir())
	if err != nil {
		return 0, nil
	}
	for _, p := range prefixes {
		names, _ := os.ReadDir(filepath.Join(s.blobsDir(), p.Name()))
		for _, n := range names {
			if strings.HasSuffix(n.Name(), ".tmp") || !live[n.Name()] {
				_ = os.Remove(filepath.Join(s.blobsDir(), p.Name(), n.Name()))
				removed++
			}
		}
	}
	return removed, nil
}

// cleanTmp removes staging/backup dirs left by a crash. Safe only when no deploy is in flight for this instance.
func (s *Store) cleanTmp() error { return os.RemoveAll(s.tmpDir()) }
