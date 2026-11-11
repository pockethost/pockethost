package edge

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/tools/cron"
	"github.com/pockerbase/pocketbase/ext/pocker"
	_ "modernc.org/sqlite"
)

// Nightly vacuum (the Node edge's `edge vacuum` + vacuum lock, in-process): for each instance on this edge with
// autoVacuum on (the default), data.db and logs.db are checked read-only while the app runs; only when enough space
// is free inside the file is the instance stopped (Manager.WithInstanceStopped holds its requests instead of failing
// them), compacted with VACUUM INTO a file next to it, swapped in, and started again if it was running. No other
// process opens the files, so there is nothing to lock against.

// VacuumOptions configures the nightly vacuum.
type VacuumOptions struct {
	Cron string // UTC cron expression; "" or "off" disables
	// MinFreeRatio and MinFreeBytes: vacuum a database when this much of it is free pages (either is enough).
	MinFreeRatio float64
	MinFreeBytes int64
	// MaxBytes skips larger databases: the instance's requests are held while it runs (up to a minute).
	MaxBytes int64
	// DiscordURL, if set, gets a summary after each run (DISCORD_HEALTH_CHANNEL_URL).
	DiscordURL string
}

// DefaultVacuumOptions: 03:00 UTC, 10% or 64 MiB free, databases up to 1 GiB.
func DefaultVacuumOptions() VacuumOptions {
	return VacuumOptions{Cron: "0 3 * * *", MinFreeRatio: 0.10, MinFreeBytes: 64 << 20, MaxBytes: 1 << 30,
		DiscordURL: os.Getenv("DISCORD_HEALTH_CHANNEL_URL")}
}

// Vacuumer runs the nightly vacuum for this edge's instances.
type Vacuumer struct {
	s       *Source
	manager func() *pocker.Manager
	opts    VacuumOptions
}

// NewVacuumer creates the vacuum job; manager returns the running Manager (nil until started).
func (s *Source) NewVacuumer(manager func() *pocker.Manager, opts VacuumOptions) *Vacuumer {
	return &Vacuumer{s: s, manager: manager, opts: opts}
}

// Run vacuums at each cron time until ctx is done.
func (v *Vacuumer) Run(ctx context.Context) {
	if v.opts.Cron == "" || v.opts.Cron == "off" {
		return
	}
	sched, err := parseCron(v.opts.Cron)
	if err != nil {
		v.s.log.Error("pockethost: bad vacuum schedule; vacuum off", "cron", v.opts.Cron, "error", err)
		return
	}
	for {
		now := time.Now()
		next := now.Truncate(time.Minute).Add(time.Minute)
		select {
		case <-ctx.Done():
			return
		case <-time.After(next.Sub(now)):
		}
		if sched.IsDue(cron.NewMoment(next.UTC())) {
			sum := v.Sweep(ctx)
			v.report(ctx, sum)
		}
	}
}

// VacuumSummary is one sweep's result.
type VacuumSummary struct {
	Instances  int   // this edge's instances with database files
	OptedOut   int   // autoVacuum off
	Vacuumed   int   // instances with at least one database compacted
	SavedBytes int64 // total reclaimed
	Skipped    []string
	Failed     []string
}

// vacuumCandidate lists this edge's instance ids and whether autoVacuum is on.
func (v *Vacuumer) candidates() map[string]bool {
	out := map[string]bool{}
	v.s.mu.Lock()
	defer v.s.mu.Unlock()
	for id, inst := range v.s.instances {
		if isMine(inst, v.s.myEdge, v.s.cfg.EdgeID) {
			out[id] = inst.AutoVacuum == nil || *inst.AutoVacuum
		}
	}
	return out
}

// Sweep vacuums every eligible database once, one instance at a time.
func (v *Vacuumer) Sweep(ctx context.Context) VacuumSummary {
	var sum VacuumSummary
	m := v.manager()
	if m == nil {
		return sum
	}
	start := time.Now()
	for id, on := range v.candidates() {
		if ctx.Err() != nil {
			break
		}
		dir, ok := m.InstanceDir(id)
		if !ok {
			continue
		}
		var dbs []string
		for _, name := range []string{"data.db", "logs.db"} {
			if p := filepath.Join(dir, "pb_data", name); fileSize(p) > 0 {
				dbs = append(dbs, p)
			}
		}
		if len(dbs) == 0 {
			continue
		}
		sum.Instances++
		if !on {
			sum.OptedOut++
			continue
		}
		var todo []string
		for _, p := range dbs {
			need, why := v.worthIt(p)
			if why != "" {
				sum.Skipped = append(sum.Skipped, id+"/"+filepath.Base(p)+": "+why)
			}
			if need {
				todo = append(todo, p)
			}
		}
		if len(todo) == 0 {
			continue
		}
		saved, err := v.vacuumInstance(ctx, m, id, todo)
		sum.SavedBytes += saved
		if err != nil {
			v.s.log.Warn("pockethost: vacuum failed", "instance", id, "error", err)
			sum.Failed = append(sum.Failed, id+": "+err.Error())
		}
		if saved > 0 {
			sum.Vacuumed++
		}
	}
	v.s.log.Info("pockethost: vacuum sweep done", "instances", sum.Instances, "vacuumed", sum.Vacuumed,
		"saved_bytes", sum.SavedBytes, "skipped", len(sum.Skipped), "failed", len(sum.Failed), "seconds", int(time.Since(start).Seconds()))
	return sum
}

func fileSize(p string) int64 {
	st, err := os.Stat(p)
	if err != nil {
		return 0
	}
	return st.Size()
}

func freeDisk(dir string) (int64, bool) {
	var st syscall.Statfs_t
	if syscall.Statfs(dir, &st) != nil {
		return 0, false
	}
	return int64(st.Bavail) * int64(st.Bsize), true
}

// worthIt reads the free-page count without stopping the app. why explains a skip worth reporting.
func (v *Vacuumer) worthIt(path string) (need bool, why string) {
	size := fileSize(path)
	db, err := sql.Open("sqlite", "file:"+path+"?mode=ro&_pragma=busy_timeout(5000)")
	if err != nil {
		return false, "open: " + err.Error()
	}
	defer db.Close()
	var pages, free, pageSize int64
	if err := db.QueryRow("PRAGMA page_count").Scan(&pages); err != nil {
		return false, "read: " + err.Error()
	}
	_ = db.QueryRow("PRAGMA freelist_count").Scan(&free)
	_ = db.QueryRow("PRAGMA page_size").Scan(&pageSize)
	if pages == 0 {
		return false, ""
	}
	freeBytes := free * pageSize
	if freeBytes < v.opts.MinFreeBytes && float64(free)/float64(pages) < v.opts.MinFreeRatio {
		return false, ""
	}
	if freeBytes < 1<<20 {
		return false, "" // tiny files: not worth a stop
	}
	if v.opts.MaxBytes > 0 && size > v.opts.MaxBytes {
		return false, fmt.Sprintf("%d MiB is over the %d MiB limit", size>>20, v.opts.MaxBytes>>20)
	}
	if avail, ok := freeDisk(filepath.Dir(path)); ok && avail < size+(64<<20) {
		return false, fmt.Sprintf("needs %d MiB free on disk, %d MiB available", (size+(64<<20))>>20, avail>>20)
	}
	return true, ""
}

// vacuumInstance compacts the given databases while the instance is stopped, then starts it again if it was running.
func (v *Vacuumer) vacuumInstance(ctx context.Context, m *pocker.Manager, id string, dbs []string) (int64, error) {
	wasRunning := m.Running(id)
	var saved int64
	var errs []error
	err := m.WithInstanceStopped(ctx, id, func(string) error {
		for _, p := range dbs {
			before := fileSize(p)
			if err := compact(ctx, p); err != nil {
				errs = append(errs, fmt.Errorf("%s: %w", filepath.Base(p), err))
				continue
			}
			if after := fileSize(p); after < before {
				saved += before - after
				v.s.log.Info("pockethost: vacuumed", "instance", id, "db", filepath.Base(p), "before", before, "after", after)
			}
		}
		return nil
	})
	if err != nil {
		errs = append(errs, err)
	}
	if wasRunning {
		if err := m.StartInstance(ctx, id); err != nil {
			v.s.log.Warn("pockethost: instance did not start after vacuum", "instance", id, "error", err)
		}
	}
	return saved, errors.Join(errs...)
}

// compact checkpoints the WAL, writes a compacted copy next to the database and swaps it in. Nothing else has the
// file open (the instance is stopped).
func compact(ctx context.Context, path string) error {
	tmp := path + ".vacuum"
	_ = os.Remove(tmp)
	db, err := sql.Open("sqlite", "file:"+path+"?_pragma=busy_timeout(10000)")
	if err != nil {
		return err
	}
	db.SetMaxOpenConns(1)
	_, err = db.ExecContext(ctx, "PRAGMA wal_checkpoint(TRUNCATE)")
	if err == nil {
		_, err = db.ExecContext(ctx, "VACUUM INTO ?", tmp)
	}
	if cerr := db.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		_ = os.Remove(tmp)
		return err
	}
	if err := checkIntegrity(ctx, tmp); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	if err := os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	// the WAL was checkpointed and truncated; its index belongs to the old file
	_ = os.Remove(path + "-wal")
	_ = os.Remove(path + "-shm")
	return nil
}

func checkIntegrity(ctx context.Context, path string) error {
	db, err := sql.Open("sqlite", "file:"+path+"?mode=ro")
	if err != nil {
		return err
	}
	defer db.Close()
	var res string
	if err := db.QueryRowContext(ctx, "PRAGMA quick_check").Scan(&res); err != nil {
		return err
	}
	if res != "ok" {
		return fmt.Errorf("compacted copy failed quick_check: %s", res)
	}
	return nil
}

func formatBytes(n int64) string {
	switch {
	case n < 1<<10:
		return fmt.Sprintf("%d B", n)
	case n < 1<<20:
		return fmt.Sprintf("%.1f KB", float64(n)/(1<<10))
	case n < 1<<30:
		return fmt.Sprintf("%.1f MB", float64(n)/(1<<20))
	}
	return fmt.Sprintf("%.2f GB", float64(n)/(1<<30))
}

// report posts the summary to Discord like the Node vacuum.
func (v *Vacuumer) report(ctx context.Context, sum VacuumSummary) {
	if v.opts.DiscordURL == "" {
		return
	}
	lines := []string{
		fmt.Sprintf(":recycle: SQLite vacuum sweep (%s)", v.s.cfg.EdgeID),
		"===================",
		time.Now().UTC().Format(time.RFC1123),
		fmt.Sprintf("Instances: %d", sum.Instances),
		fmt.Sprintf("Skipped: %d", sum.OptedOut),
		fmt.Sprintf("Instances vacuumed: %d", sum.Vacuumed),
		fmt.Sprintf("Storage saved: %s", formatBytes(sum.SavedBytes)),
	}
	if len(sum.Failed) > 0 {
		lines = append(lines, fmt.Sprintf("Failed: %d", len(sum.Failed)))
	}
	content := strings.Join(lines, "\n")
	b, _ := json.Marshal(map[string]string{"content": content})
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, v.opts.DiscordURL, bytes.NewReader(b))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := probeClient.Do(req)
	if err != nil {
		v.s.log.Warn("pockethost: vacuum summary not posted", "error", err)
		return
	}
	res.Body.Close()
}
