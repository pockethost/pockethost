package edge

import "testing"

func TestPlanUsage(t *testing.T) {
	in := UsageInput{
		Owner:    map[string]string{"a1": "alice", "a2": "alice", "b1": "bob", "c1": "carol", "orphan": ""},
		Measured: map[string]int64{"a1": 100, "a2": 50, "b1": 7},
		Stored:   map[string]int64{"alice": 10, "bob": 7, "carol": 3, "dave": 99},
	}
	updates, skipped := PlanUsage(in)
	// alice: 150 (both measured); bob: unchanged; carol: c1 not measured yet → skipped; dave: owns nothing → 0
	if skipped != 1 {
		t.Fatalf("skipped %d, want 1 (carol)", skipped)
	}
	want := map[string]int64{"alice": 150, "dave": 0}
	if len(updates) != len(want) {
		t.Fatalf("updates %+v", updates)
	}
	for _, u := range updates {
		if b, ok := want[u.User]; !ok || b != u.Bytes {
			t.Fatalf("update %+v, want %v", u, want)
		}
	}
	// an owner with no stored value yet gets one
	updates, _ = PlanUsage(UsageInput{Owner: map[string]string{"e1": "erin"}, Measured: map[string]int64{"e1": 5}, Stored: map[string]int64{}})
	if len(updates) != 1 || updates[0].User != "erin" || updates[0].Bytes != 5 {
		t.Fatalf("new owner: %+v", updates)
	}
}
