package edge

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/pockethost/pocketone/ext/lifecycle"
)

// pbDateLayout is how PocketBase stores dates.
const pbDateLayout = "2006-01-02 15:04:05.000Z"

// InstanceStats is the edge's lifecycle sink: one instance_stats row per instance on the mothership, written with the edge's
// mothership login. The mothership sums the rows per owner (users.volume_storage_used).
type InstanceStats struct {
	s *Source

	mu   sync.Mutex
	rows map[string]string // instance id → its instance_stats row id
}

var (
	_ lifecycle.Sink   = (*InstanceStats)(nil)
	_ lifecycle.Loader = (*InstanceStats)(nil)
)

// InstanceStats returns this edge's lifecycle sink.
func (s *Source) InstanceStats() *InstanceStats {
	return &InstanceStats{s: s, rows: map[string]string{}}
}

type statsRow struct {
	ID           string `json:"id,omitempty"`
	Instance     string `json:"instance"`
	Edge         string `json:"edge,omitempty"`
	DiskBytes    int64  `json:"disk_bytes"`
	DiskMeasured string `json:"disk_measured"`
	LastActive   string `json:"last_active"`
}

func fmtTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format(pbDateLayout)
}

// edgeRecord waits (up to a minute) for this edge's record id, known once the mirror has loaded.
func (st *InstanceStats) edgeRecord(ctx context.Context) (string, error) {
	for i := 0; i < 60; i++ {
		st.s.mu.Lock()
		id := st.s.myEdge
		st.s.mu.Unlock()
		if id != "" {
			return id, nil
		}
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		case <-time.After(time.Second):
		}
	}
	return "", fmt.Errorf("this edge's record isn't known yet")
}

// Load implements [lifecycle.Loader]: the rows this edge wrote before (so a restart doesn't measure everything again).
func (st *InstanceStats) Load(ctx context.Context) ([]lifecycle.Facts, error) {
	edgeID, err := st.edgeRecord(ctx)
	if err != nil {
		return nil, err
	}
	var facts []lifecycle.Facts
	for page := 1; ; page++ {
		var out struct {
			Items      []statsRow `json:"items"`
			TotalPages int        `json:"totalPages"`
		}
		q := url.Values{"filter": {fmt.Sprintf("edge=%q", edgeID)}, "perPage": {"500"}, "page": {fmt.Sprint(page)},
			"fields": {"id,instance,disk_bytes,disk_measured,last_active"}, "skipTotal": {"0"}}
		if err := st.s.c.do(ctx, http.MethodGet, "/api/collections/"+StatsCollection+"/records?"+q.Encode(), nil, &out); err != nil {
			return nil, err
		}
		st.mu.Lock()
		for _, r := range out.Items {
			st.rows[r.Instance] = r.ID
			f := lifecycle.Facts{Instance: r.Instance, DiskBytes: r.DiskBytes}
			f.MeasuredAt, _ = parsePBTime(r.DiskMeasured)
			f.LastActive, _ = parsePBTime(r.LastActive)
			facts = append(facts, f)
		}
		st.mu.Unlock()
		if page >= out.TotalPages {
			return facts, nil
		}
	}
}

// Report implements [lifecycle.Sink]: it creates or updates each instance's row. It keeps going past a failed row and
// returns the first error.
func (st *InstanceStats) Report(ctx context.Context, facts []lifecycle.Facts) error {
	edgeID, err := st.edgeRecord(ctx)
	if err != nil {
		return err
	}
	var first error
	for _, f := range facts {
		row := statsRow{Instance: f.Instance, Edge: edgeID, DiskBytes: f.DiskBytes, DiskMeasured: fmtTime(f.MeasuredAt), LastActive: fmtTime(f.LastActive)}
		if err := st.upsert(ctx, row); err != nil && first == nil {
			first = fmt.Errorf("instance %s: %w", f.Instance, err)
		}
	}
	return first
}

func (st *InstanceStats) upsert(ctx context.Context, row statsRow) error {
	st.mu.Lock()
	id := st.rows[row.Instance]
	st.mu.Unlock()
	if id == "" {
		// not loaded: another edge may have measured it before it moved here
		var out struct {
			Items []statsRow `json:"items"`
		}
		q := url.Values{"filter": {fmt.Sprintf("instance=%q", row.Instance)}, "perPage": {"1"}, "fields": {"id"}, "skipTotal": {"1"}}
		if err := st.s.c.do(ctx, http.MethodGet, "/api/collections/"+StatsCollection+"/records?"+q.Encode(), nil, &out); err != nil {
			return err
		}
		if len(out.Items) > 0 {
			id = out.Items[0].ID
		}
	}
	var saved statsRow
	var err error
	if id == "" {
		err = st.s.c.do(ctx, http.MethodPost, "/api/collections/"+StatsCollection+"/records", row, &saved)
	} else {
		err = st.s.c.do(ctx, http.MethodPatch, "/api/collections/"+StatsCollection+"/records/"+id, row, &saved)
	}
	if err != nil {
		return err
	}
	st.mu.Lock()
	st.rows[row.Instance] = saved.ID
	st.mu.Unlock()
	return nil
}
