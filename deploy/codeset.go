// Package deploy is PocketHost's deploy API (/_ph/deploy/v1), wire-compatible with the Node edge's DeployService so the
// pockethost CLI works unchanged: check → blobs → commit, plus /files (HTTPS file access) and /logs.
package deploy

import (
	"fmt"
	"regexp"
	"slices"
	"strings"
)

// The deploy "code set": the only files a deploy may write or delete inside an instance folder. It mirrors the CLI's
// DEFAULT_INCLUDES / DEFAULT_EXCLUDES. pb_data is never part of it. The root node_modules tree is (the CLI ships the
// production dependency tree); node_modules anywhere else stays out.

var rootCodeFiles = []string{"package.json", "bun.lock", "bun.lockb"}

const (
	patchesDir       = "patches"
	dataDir          = "pb_data"
	nodeModulesDir   = "node_modules"
	maxManifestFiles = 20_000
	maxPathLength    = 1024
)

var hashRE = regexp.MustCompile(`^[0-9a-f]{64}$`)

func isSha256Hex(v string) bool { return hashRE.MatchString(v) }

// isSafeRelativePath: relative POSIX path with no empty, "." or ".." segments.
func isSafeRelativePath(p string) bool {
	if p == "" || len(p) > maxPathLength {
		return false
	}
	if strings.HasPrefix(p, "/") || strings.ContainsAny(p, "\\\x00") {
		return false
	}
	for _, seg := range strings.Split(p, "/") {
		if seg == "" || seg == "." || seg == ".." {
			return false
		}
	}
	return true
}

func isGitSegment(seg string) bool { return strings.HasPrefix(seg, ".git") }

// isCodeRoot: a top-level name the code-set walk starts from.
func isCodeRoot(name string) bool {
	return (strings.HasPrefix(name, "pb_") && name != dataDir) || name == patchesDir || slices.Contains(rootCodeFiles, name)
}

// isCodePath reports whether p (relative to the instance folder) belongs to the code set.
func isCodePath(p string) bool {
	if !isSafeRelativePath(p) {
		return false
	}
	segs := strings.Split(p, "/")
	if slices.ContainsFunc(segs, isGitSegment) {
		return false
	}
	first := segs[0]
	// root node_modules, any depth; never node_modules elsewhere
	if first == nodeModulesDir {
		return len(segs) > 1
	}
	if slices.Contains(segs, nodeModulesDir) {
		return false
	}
	if len(segs) == 1 {
		return slices.Contains(rootCodeFiles, first) || (strings.HasPrefix(first, "pb_") && first != dataDir)
	}
	if first == dataDir {
		return false
	}
	return strings.HasPrefix(first, "pb_") || first == patchesDir
}

func isNodeModulesPath(p string) bool { return strings.SplitN(p, "/", 2)[0] == nodeModulesDir }

// Manifest maps a code-set path to its sha256 (lowercase hex).
type Manifest map[string]string

// ManifestError is a user-facing manifest problem (400).
type ManifestError struct{ msg string }

func (e *ManifestError) Error() string { return e.msg }

// validateManifest checks a client manifest { path: sha256 } (raw is the decoded JSON value).
func validateManifest(raw any) (Manifest, error) {
	obj, ok := raw.(map[string]any)
	if !ok {
		return nil, &ManifestError{"files must be an object of { path: sha256 }"}
	}
	if len(obj) > maxManifestFiles {
		nm := 0
		for p := range obj {
			if isNodeModulesPath(p) {
				nm++
			}
		}
		inNM, hint := "", ""
		if nm > 0 {
			inNM = fmt.Sprintf(", %d of them in node_modules", nm)
			hint = " Make sure only production dependencies are deployed."
		}
		return nil, &ManifestError{fmt.Sprintf("Too many files (%d%s); a deploy can have at most %d.%s", len(obj), inNM, maxManifestFiles, hint)}
	}
	out := make(Manifest, len(obj))
	// sorted for deterministic errors
	paths := make([]string, 0, len(obj))
	for p := range obj {
		paths = append(paths, p)
	}
	slices.Sort(paths)
	for _, p := range paths {
		if !isCodePath(p) {
			return nil, &ManifestError{p + " is outside the deployable set (pb_* except pb_data, package.json, bun.lock(b), patches/, " +
				"node_modules/ at the project root; no .git* files, no node_modules inside other folders)"}
		}
		h, _ := obj[p].(string)
		if !isSha256Hex(h) {
			return nil, &ManifestError{p + ": expected a lowercase sha256 hex digest"}
		}
		out[p] = h
	}
	// a path can't be both a file and a directory
	for _, p := range paths {
		segs := strings.Split(p, "/")
		for i := 1; i < len(segs); i++ {
			prefix := strings.Join(segs[:i], "/")
			if _, ok := out[prefix]; ok {
				return nil, &ManifestError{prefix + " is both a file and a directory"}
			}
		}
	}
	return out, nil
}
