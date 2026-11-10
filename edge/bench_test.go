package edge

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"testing"
)

// BenchmarkRealtimeInstanceEvent measures one realtime instance update against a production-sized mirror.
func BenchmarkRealtimeInstanceEvent(b *testing.B) {
	s := NewSource(testCfg, slog.New(slog.NewTextHandler(io.Discard, nil)))
	d := &dump{Edges: []edgeRec{{ID: "E_SGP", EdgeID: "sgp-1"}, {ID: "E_SFO", EdgeID: "sfo"}}}
	for u := 0; u < 17000; u++ {
		d.Users = append(d.Users, userRec{ID: fmt.Sprintf("u%014d", u), Verified: true, SubscriptionQuantity: 1})
	}
	for i := 0; i < 21000; i++ {
		d.Instances = append(d.Instances, instanceRec{ID: fmt.Sprintf("i%014d", i), Subdomain: fmt.Sprintf("app%d", i),
			UID: fmt.Sprintf("u%014d", i%17000), Power: true, Edge: "E_SFO", Updated: "1"})
	}
	s.loadDumpLocked(d)
	s.diffLocked(context.Background(), nil)
	ctx := context.Background()
	b.ResetTimer()
	for n := 0; n < b.N; n++ {
		rec := d.Instances[n%len(d.Instances)]
		rec.Updated = fmt.Sprint(n) // a status change elsewhere
		data, _ := json.Marshal(map[string]any{"action": "update", "record": rec})
		s.applyEvent(ctx, realtimeEvent{Name: "instances/*", Data: data})
		select {
		case <-s.out:
		default:
		}
	}
}
