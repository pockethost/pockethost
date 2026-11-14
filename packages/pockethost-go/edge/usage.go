package edge

import (
	"fmt"
	"sort"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
)

// StatsCollection holds the facts edges measure about the instances they serve (one row per instance; see
// ext/lifecycle): disk_bytes, disk_measured, last_active.
const StatsCollection = "instance_stats"

// UsageUpdate is one owner whose stored disk use differs from the sum of their instances'.
type UsageUpdate struct {
	User     string
	Bytes    int64
	Previous int64
}

// UsageInput is what the per-owner sum reads.
type UsageInput struct {
	Owner    map[string]string // instance id → owner (user id); instances without an owner are ignored
	Measured map[string]int64  // instance id → disk_bytes, for instances an edge has measured
	Stored   map[string]int64  // user id → volume_storage_used now (missing = never set)
}

// PlanUsage sums disk_bytes per owner. An owner with any instance not measured yet is skipped (left as is rather
// than undercounted), and so is an owner whose stored value already matches. Users who own no instances are set to 0.
func PlanUsage(in UsageInput) (updates []UsageUpdate, skipped int) {
	totals := map[string]int64{}
	unknown := map[string]bool{}
	for id, owner := range in.Owner {
		if owner == "" {
			continue
		}
		b, ok := in.Measured[id]
		if !ok {
			unknown[owner] = true
			continue
		}
		totals[owner] += b
	}
	for user, prev := range in.Stored {
		if unknown[user] {
			skipped++
			continue
		}
		if totals[user] != prev {
			updates = append(updates, UsageUpdate{User: user, Bytes: totals[user], Previous: prev})
		}
	}
	for user, total := range totals {
		if _, ok := in.Stored[user]; !ok && !unknown[user] {
			updates = append(updates, UsageUpdate{User: user, Bytes: total, Previous: 0})
		}
	}
	sort.Slice(updates, func(i, j int) bool { return updates[i].User < updates[j].User })
	return updates, skipped
}

// UsageSummary is what a run of SumUsage did.
type UsageSummary struct {
	Instances, Measured, Users, Updated, Skipped, Failed int
	TotalBytes                                           int64
}

// SumUsage writes each owner's disk use (the sum of their instances' disk_bytes) to users.volume_storage_used on the
// mothership app; with apply false it only counts what it would change.
func SumUsage(app core.App, apply bool) (UsageSummary, error) {
	var s UsageSummary
	in := UsageInput{Owner: map[string]string{}, Measured: map[string]int64{}, Stored: map[string]int64{}}

	var insts []struct {
		ID  string `db:"id"`
		UID string `db:"uid"`
	}
	if err := app.DB().NewQuery("SELECT id, uid FROM instances").All(&insts); err != nil {
		return s, fmt.Errorf("instances: %w", err)
	}
	for _, r := range insts {
		in.Owner[r.ID] = r.UID
	}
	var stats []struct {
		Instance string `db:"instance"`
		Bytes    int64  `db:"disk_bytes"`
	}
	if err := app.DB().NewQuery("SELECT instance, disk_bytes FROM " + StatsCollection + " WHERE disk_measured != ''").All(&stats); err != nil {
		return s, fmt.Errorf("%s: %w", StatsCollection, err)
	}
	for _, r := range stats {
		in.Measured[r.Instance] = r.Bytes
		s.TotalBytes += r.Bytes
	}
	var users []struct {
		ID   string `db:"id"`
		Used int64  `db:"volume_storage_used"`
	}
	if err := app.DB().NewQuery("SELECT id, COALESCE(volume_storage_used, 0) AS volume_storage_used FROM users").All(&users); err != nil {
		return s, fmt.Errorf("users: %w", err)
	}
	for _, u := range users {
		in.Stored[u.ID] = u.Used
	}
	s.Instances, s.Measured, s.Users = len(insts), len(stats), len(users)

	updates, skipped := PlanUsage(in)
	s.Skipped = skipped
	if !apply {
		s.Updated = len(updates)
		return s, nil
	}
	for _, u := range updates {
		rec, err := app.FindRecordById("users", u.User)
		if err != nil {
			s.Failed++
			continue
		}
		rec.Set("volume_storage_used", u.Bytes)
		rec.Set("object_storage_used", 0)
		if err := app.UnsafeWithoutHooks().SaveNoValidate(rec); err != nil {
			s.Failed++
			continue
		}
		s.Updated++
	}
	return s, nil
}
