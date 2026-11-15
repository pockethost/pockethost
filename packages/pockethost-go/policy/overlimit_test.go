package policy

import (
	"context"
	"reflect"
	"testing"
	"time"

	"github.com/pockethost/pocketone/ext/stats/rules"
)

// The cases of the Node planner's tests (packages/server/src/common/instanceLimits.test.ts: planOverLimit,
// planLapse, pickExcessInstances), so both decide the same.

var now = time.Date(2026, 11, 8, 12, 0, 0, 0, time.UTC)

func in(id string, power bool, updated string) Instance {
	return Instance{ID: id, Power: power, Updated: parseDate(updated)}
}

// decide returns the actions decided for one account, in rule order.
func decide(t *testing.T, a Account) []string {
	t.Helper()
	p := NewOverLimit(DefaultGrace, func() time.Time { return now })
	rep := p.Evaluate(context.Background(), []Account{a})
	if len(rep.Failed) > 0 {
		t.Fatalf("failed: %+v", rep.Failed)
	}
	var out []string
	for _, d := range rep.Decisions {
		out = append(out, d.Action)
	}
	return out
}

func TestOverLimitLikeNode(t *testing.T) {
	over := []Instance{in("a", true, "2026-11-01"), in("b", true, "2026-11-02")}
	cases := []struct {
		name string
		a    Account
		want []string
	}{
		{"within the limit", Account{Allowance: 2, Instances: over}, nil},
		{"back within the limit clears the marker", Account{Allowance: 2, OverSince: parseDate("2026-11-07 00:00:00.000Z"), Instances: over}, []string{ActClear}},
		{"newly over: warn", Account{Allowance: 1, Instances: over}, []string{ActWarn}},
		{"in the grace period: wait", Account{Allowance: 1, OverSince: now.Add(-DefaultGrace + time.Minute), Instances: over}, []string{ActWait}},
		{"grace passed: power off", Account{Allowance: 1, OverSince: now.Add(-DefaultGrace), Instances: over}, []string{ActPowerOff}},
		{"plan 0: no over-limit", Account{Allowance: 0, Instances: over}, nil},
		{"plan 0 with a marker: clear", Account{Allowance: 0, OverSince: parseDate("2026-11-01"), Instances: over}, []string{ActClear}},
		{"suspended accounts still go through over-limit", Account{Allowance: 1, Suspended: true, Instances: over}, []string{ActWarn}},
	}
	for _, c := range cases {
		if got := decide(t, c.a); !reflect.DeepEqual(got, c.want) {
			t.Errorf("%s: got %v, want %v", c.name, got, c.want)
		}
	}
}

func TestLapseLikeNode(t *testing.T) {
	on := []Instance{in("a", true, "2026-11-01"), in("b", false, "2026-11-02")}
	allOff := []Instance{in("b", false, "2026-11-02")}
	archived := []Instance{{ID: "a", Power: true, Archived: true}}
	marked := parseDate("2026-11-08 00:00:00.000Z")
	cases := []struct {
		name string
		a    Account
		want []string
	}{
		{"plan dropped to 0 with instances set to run", Account{PaidBefore: true, Instances: on}, []string{ActNotifyLapsed}},
		{"only once per lapse", Account{PaidBefore: true, LapsedSince: marked, Instances: on}, nil},
		{"never paid", Account{Instances: on}, nil},
		{"nothing set to run", Account{PaidBefore: true, Instances: allOff}, nil},
		{"no instances", Account{PaidBefore: true}, nil},
		{"archived ones don't count", Account{PaidBefore: true, Instances: archived}, nil},
		{"plan includes instances again", Account{Allowance: 1, PaidBefore: true, LapsedSince: marked, Instances: on}, []string{ActClearLapse}},
		{"plan includes instances, never marked", Account{Allowance: 1, PaidBefore: true, Instances: on}, nil},
		{"suspended: no lapse email", Account{PaidBefore: true, Suspended: true, Instances: on}, nil},
	}
	for _, c := range cases {
		if got := decide(t, c.a); !reflect.DeepEqual(got, c.want) {
			t.Errorf("%s: got %v, want %v", c.name, got, c.want)
		}
	}
}

func TestExcessLeastRecentlyUpdated(t *testing.T) {
	a := Account{Allowance: 1, Instances: []Instance{
		in("new", true, "2026-11-07 10:00:00.000Z"), in("old", true, "2026-01-01 10:00:00.000Z"),
		in("mid", true, "2026-06-01 10:00:00.000Z"), in("off", false, "2025-01-01 10:00:00.000Z"),
		{ID: "arch", Power: true, Archived: true},
	}}
	var ids []string
	for _, i := range a.Excess() {
		ids = append(ids, i.ID)
	}
	if !reflect.DeepEqual(ids, []string{"old", "mid"}) {
		t.Fatalf("excess %v", ids)
	}
	if got := (Account{Allowance: 1, Instances: []Instance{in("a", true, "2026-11-01")}}).Excess(); got != nil {
		t.Fatalf("within plan: %v", got)
	}
}

func TestReplaceACriterion(t *testing.T) {
	p := NewOverLimit(DefaultGrace, func() time.Time { return now })
	a := Account{User: "u", Allowance: 1, OverSince: now.Add(-time.Hour), Instances: []Instance{in("a", true, "2026-11-01"), in("b", true, "2026-11-02")}}
	if rep := p.Evaluate(context.Background(), []Account{a}); rep.Decisions[0].Action != ActWait {
		t.Fatalf("default grace: %+v", rep.Decisions)
	}
	// An app shortens the grace period: the power-off and wait rules both follow.
	p.Criteria.Register("grace_passed", rules.Pred(func(a Account) (bool, string) {
		return now.Sub(a.OverSince) >= 30*time.Minute, "grace 30m"
	}))
	rep := p.Evaluate(context.Background(), []Account{a})
	if len(rep.Decisions) != 1 || rep.Decisions[0].Action != ActPowerOff || rep.Decisions[0].Why != "running 2, plan 1; over since 2026-11-08 11:00 UTC; grace 30m" {
		t.Fatalf("after replacing grace_passed: %+v", rep.Decisions)
	}
}

func TestAllowanceAddsBonusOnlyWhenPaid(t *testing.T) {
	cases := []struct {
		paid, bonus float64
		want        int
	}{{2, 3, 5}, {0, 5, 0}, {1.9, 0, 1}, {-1, 2, 0}, {3, -1, 3}}
	for _, c := range cases {
		if got := allowance(c.paid, c.bonus); got != c.want {
			t.Errorf("allowance(%v, %v) = %d, want %d", c.paid, c.bonus, got, c.want)
		}
	}
}
