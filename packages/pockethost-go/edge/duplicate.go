package edge

import (
	"context"
	"errors"
	"fmt"
	"github.com/pockethost/pockethost/packages/pockethost-go/fleet"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// Duplicate: the mothership makes a new instance with duplicateOf = the source's id and duplicateStatus = "copying",
// on the source's edge. The edge that serves both copies the source's folder into the new instance's folder (both
// held stopped meanwhile), then reports "ready" or "failed". Until then the copy is blocked (see mapInstance), so it
// never starts on an empty folder.

const (
	duplicateReady  = fleet.DuplicateReady
	duplicateFailed = fleet.DuplicateFailed
)

// Duplicator copies new duplicates' files on this edge.
type Duplicator struct {
	s       *Source
	manager func() Instances
	every   time.Duration
	// finished holds the copies this edge has reported, until the mirror shows the new status (no second copy).
	finished map[string]bool
}

// NewDuplicator creates the duplicate job; manager returns the running Instances (nil until started).
func (s *Source) NewDuplicator(manager func() Instances) *Duplicator {
	return &Duplicator{s: s, manager: manager, every: 5 * time.Second, finished: map[string]bool{}}
}

// Run looks for pending copies every few seconds until ctx is done.
func (d *Duplicator) Run(ctx context.Context) {
	t := time.NewTicker(d.every)
	defer t.Stop()
	for {
		d.Sweep(ctx)
		select {
		case <-ctx.Done():
			return
		case <-t.C:
		}
	}
}

type pendingCopy struct{ id, source, problem string }

// pending lists this edge's instances still waiting for their copy, oldest first: the copies in the standing set the
// mothership sends (their originals come with them, so the runtime has both).
func (d *Duplicator) pending() []pendingCopy {
	var out []pendingCopy
	copying := map[string]bool{}
	for _, inst := range d.s.standing() {
		src, isCopy := inst.Private[fleet.PrivateDuplicateOf]
		if !isCopy {
			continue // an original
		}
		copying[inst.ID] = true
		if !d.finished[inst.ID] {
			out = append(out, pendingCopy{id: inst.ID, source: src, problem: inst.Private[fleet.PrivateDuplicateProblem]})
		}
	}
	for id := range d.finished {
		if !copying[id] {
			delete(d.finished, id) // the mothership caught up (or the copy was deleted and re-made)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].id < out[j].id })
	return out
}

// Sweep makes every pending copy once, one at a time.
func (d *Duplicator) Sweep(ctx context.Context) {
	m := d.manager()
	if m == nil {
		return
	}
	for _, p := range d.pending() {
		if ctx.Err() != nil {
			return
		}
		if why := p.problem; why != "" {
			d.finish(ctx, p.id, duplicateFailed, why)
			continue
		}
		if _, ok := m.InstanceDir(p.id); !ok {
			continue // the runtime doesn't have the new instance yet: next sweep
		}
		if _, ok := m.InstanceDir(p.source); !ok {
			continue
		}
		start := time.Now()
		var copied int64
		err := m.WithInstanceStopped(ctx, p.id, func(dst string) error {
			return m.WithInstanceStopped(ctx, p.source, func(src string) error {
				n, err := copyInstanceDir(src, dst)
				copied = n
				return err
			})
		})
		if err != nil && strings.Contains(err.Error(), "already being updated") {
			continue // a deploy or vacuum has one of them: next sweep
		}
		if err != nil {
			d.s.log.Error("pockethost: duplicate failed", "instance", p.id, "source", p.source, "error", err)
			d.finish(ctx, p.id, duplicateFailed, err.Error())
			continue
		}
		d.s.log.Info("pockethost: duplicated", "instance", p.id, "source", p.source, "bytes", copied, "ms", time.Since(start).Milliseconds())
		d.finish(ctx, p.id, duplicateReady, "")
	}
}

// finish reports a copy's outcome to the mothership. A failed report is retried on the next sweep (copying again is
// safe: the folder is replaced as a whole).
func (d *Duplicator) finish(ctx context.Context, id, status, msg string) {
	if len(msg) > 500 {
		msg = msg[:500]
	}
	body := map[string]string{"duplicateStatus": status, "duplicateError": msg}
	if err := d.s.c.do(ctx, http.MethodPatch, "/api/collections/instances/records/"+id, body, nil); err != nil {
		d.s.log.Error("pockethost: duplicate report failed", "instance", id, "status", status, "error", err)
		return
	}
	d.finished[id] = true
}

// copyInstanceDir replaces dst with a copy of src: it copies into a sibling folder, then swaps it in, so dst is never
// half-written. It refuses a dst that already holds a database (a copy never overwrites an instance's data). It
// returns the bytes copied.
func copyInstanceDir(src, dst string) (int64, error) {
	if fi, err := os.Stat(src); err != nil || !fi.IsDir() {
		return 0, errors.New("the original instance has no files on this server")
	}
	if _, err := os.Stat(filepath.Join(dst, "pb_data", "data.db")); err == nil {
		return 0, errors.New("the new instance already has data")
	}
	tmp := dst + ".duplicating"
	if err := os.RemoveAll(tmp); err != nil {
		return 0, err
	}
	n, err := copyTree(src, tmp)
	if err != nil {
		_ = os.RemoveAll(tmp)
		return n, err
	}
	if err := os.RemoveAll(dst); err != nil {
		_ = os.RemoveAll(tmp)
		return n, err
	}
	if err := os.Rename(tmp, dst); err != nil {
		_ = os.RemoveAll(tmp)
		return n, err
	}
	return n, nil
}

// copyTree copies a folder: directories, regular files (with their modes) and symlinks (as links). Anything else
// (sockets, devices) is skipped.
func copyTree(src, dst string) (int64, error) {
	var total int64
	err := filepath.WalkDir(src, func(p string, e fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, p)
		if err != nil {
			return err
		}
		to := filepath.Join(dst, rel)
		info, err := e.Info()
		if err != nil {
			return err
		}
		switch {
		case e.IsDir():
			return os.MkdirAll(to, info.Mode().Perm()|0o700)
		case info.Mode()&fs.ModeSymlink != 0:
			target, err := os.Readlink(p)
			if err != nil {
				return err
			}
			return os.Symlink(target, to)
		case info.Mode().IsRegular():
			n, err := copyFile(p, to, info.Mode().Perm())
			total += n
			return err
		}
		return nil
	})
	if err != nil {
		return total, fmt.Errorf("copying files: %w", err)
	}
	return total, nil
}

func copyFile(src, dst string, mode fs.FileMode) (int64, error) {
	in, err := os.Open(src)
	if err != nil {
		return 0, err
	}
	defer in.Close()
	out, err := os.OpenFile(dst, os.O_WRONLY|os.O_CREATE|os.O_EXCL, mode)
	if err != nil {
		return 0, err
	}
	n, err := io.Copy(out, in)
	if cerr := out.Close(); err == nil {
		err = cerr
	}
	return n, err
}
