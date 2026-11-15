// Package policy holds PocketHost's lifecycle policies for the mothership, built on PocketOne's rules engine
// (ext/lifecycle/rules). Each policy's criteria live in a registry by name, so a criterion can be replaced (in code, or
// later from config) without touching the rules that use it.
package policy

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"github.com/pockethost/pocketone/ext/stats/rules"
)

// Instance is what the over-limit policy reads about one instance.
type Instance struct {
	ID, Subdomain string
	Power         bool
	Archived      bool // instances.suspension starts with "Archived:"; archived instances don't count
	Updated       time.Time
}

// Account is one owner and their instances: the over-limit policy's subject.
type Account struct {
	User        string
	Allowance   int       // paid instances (users.subscription_quantity, floored) + bonus_instances while at least 1 is paid
	OverSince   time.Time // users.over_limit_since: when the account was first seen over its plan (zero: not marked)
	LapsedSince time.Time // users.lapsed_since: when the owner was told the plan ended (zero: not marked)
	Suspended   bool      // users.suspension is set
	PaidBefore  bool      // has any billing_items row
	Instances   []Instance
}

// PoweredOn is the instances that count toward the plan and are powered on.
func (a Account) PoweredOn() []Instance {
	var out []Instance
	for _, i := range a.Instances {
		if i.Power && !i.Archived {
			out = append(out, i)
		}
	}
	return out
}

// Excess is the powered-on instances beyond the plan, least recently updated first: what would be powered off.
func (a Account) Excess() []Instance {
	on := a.PoweredOn()
	extra := len(on) - a.Allowance
	if a.Allowance == 0 || extra <= 0 {
		return nil
	}
	sort.SliceStable(on, func(i, j int) bool {
		if !on[i].Updated.Equal(on[j].Updated) {
			return on[i].Updated.Before(on[j].Updated)
		}
		return on[i].ID < on[j].ID
	})
	return on[:extra]
}

// Over-limit actions. The mothership carries them out (records, power, owner email); no edge command is involved.
const (
	ActWarn         = "warn"          // record over_limit_since, email the owner which instances go off and when
	ActWait         = "wait"          // in the grace period: nothing to do
	ActPowerOff     = "power-off"     // power off Excess(), email the owner
	ActClear        = "clear"         // back within the plan: clear over_limit_since
	ActNotifyLapsed = "notify-lapsed" // plan dropped to 0 with instances running: record lapsed_since, email once
	ActClearLapse   = "clear-lapse"   // instances in the plan again: clear lapsed_since
)

// DefaultGrace is how long an account may stay over its plan before its extra instances are powered off.
const DefaultGrace = 24 * time.Hour

// OverLimit is the over-limit policy: accounts running more instances than their plan includes are warned, then their
// least recently updated extras are powered off once the grace period has passed; accounts whose plan dropped to 0
// get one "your instances have stopped" email if they've paid before. The same decisions as the Node sweep
// (`edge over-limit`), as rules on named criteria.
type OverLimit struct {
	// Criteria by name: over_allowance, marked_over, grace_passed, no_allowance, running, paid_before,
	// marked_lapsed, suspended. Replace one to change what it means for every rule.
	Criteria *rules.Registry[Account]
	Rules    []rules.Rule[Account]
}

// NewOverLimit builds the policy with the default criteria. now is the evaluation time.
func NewOverLimit(grace time.Duration, now func() time.Time) *OverLimit {
	if grace <= 0 {
		grace = DefaultGrace
	}
	r := rules.NewRegistry[Account]()
	r.Register("over_allowance", rules.Pred(func(a Account) (bool, string) {
		on := len(a.PoweredOn())
		return a.Allowance > 0 && on > a.Allowance, fmt.Sprintf("running %d, plan %d", on, a.Allowance)
	}))
	r.Register("marked_over", rules.Pred(func(a Account) (bool, string) {
		if a.OverSince.IsZero() {
			return false, "not marked over"
		}
		return true, "over since " + stamp(a.OverSince)
	}))
	r.Register("grace_passed", rules.Pred(func(a Account) (bool, string) {
		deadline := a.OverSince.Add(grace)
		if now().Before(deadline) {
			return false, "grace until " + stamp(deadline)
		}
		return true, "grace ended " + stamp(deadline)
	}))
	r.Register("no_allowance", rules.Pred(func(a Account) (bool, string) {
		return a.Allowance == 0, fmt.Sprintf("plan %d", a.Allowance)
	}))
	r.Register("running", rules.Pred(func(a Account) (bool, string) {
		on := len(a.PoweredOn())
		return on > 0, fmt.Sprintf("%d running", on)
	}))
	r.Register("paid_before", rules.Pred(func(a Account) (bool, string) {
		if a.PaidBefore {
			return true, "paid before"
		}
		return false, "never paid"
	}))
	r.Register("marked_lapsed", rules.Pred(func(a Account) (bool, string) {
		if a.LapsedSince.IsZero() {
			return false, "not marked lapsed"
		}
		return true, "lapsed since " + stamp(a.LapsedSince)
	}))
	r.Register("suspended", rules.Pred(func(a Account) (bool, string) { return a.Suspended, "suspended" }))

	c := r.Ref
	notSuspended := []rules.Veto[Account]{{Name: "suspended", If: c("suspended")}}
	return &OverLimit{Criteria: r, Rules: []rules.Rule[Account]{
		{Name: "over-limit:warn", Action: ActWarn, When: rules.All(c("over_allowance"), rules.Not(c("marked_over")))},
		{Name: "over-limit:wait", Action: ActWait, When: rules.All(c("over_allowance"), c("marked_over"), rules.Not(c("grace_passed")))},
		{Name: "over-limit:power-off", Action: ActPowerOff, When: rules.All(c("over_allowance"), c("marked_over"), c("grace_passed"))},
		{Name: "over-limit:clear", Action: ActClear, When: rules.All(rules.Not(c("over_allowance")), c("marked_over"))},
		{Name: "lapse:notify", Action: ActNotifyLapsed, When: rules.All(c("no_allowance"), rules.Not(c("marked_lapsed")), c("paid_before"), c("running")), Unless: notSuspended},
		{Name: "lapse:clear", Action: ActClearLapse, When: rules.All(rules.Not(c("no_allowance")), c("marked_lapsed")), Unless: notSuspended},
	}}
}

// Evaluate decides for every account. Nothing is changed.
func (p *OverLimit) Evaluate(ctx context.Context, accounts []Account) rules.Report[Account] {
	return rules.Engine[Account]{Rules: p.Rules, Key: func(a Account) string { return a.User }}.Evaluate(ctx, accounts)
}

func stamp(t time.Time) string { return t.UTC().Format("2006-01-02 15:04 UTC") }

// pbDateLayout is how PocketBase stores dates.
const pbDateLayout = "2006-01-02 15:04:05.000Z"

func parseDate(s string) time.Time {
	if s == "" {
		return time.Time{}
	}
	for _, layout := range []string{pbDateLayout, "2006-01-02 15:04:05Z", time.RFC3339Nano, "2006-01-02"} {
		if t, err := time.Parse(layout, s); err == nil {
			return t
		}
	}
	return time.Time{}
}

// LoadAccounts reads every user with their instances from the mothership's database (read only).
func LoadAccounts(app core.App) ([]Account, error) {
	var users []struct {
		ID         string  `db:"id"`
		Quantity   float64 `db:"q"`
		Bonus      float64 `db:"b"`
		OverSince  string  `db:"ols"`
		Lapsed     string  `db:"ls"`
		Suspension string  `db:"s"`
	}
	if err := app.DB().NewQuery(`SELECT id, COALESCE(subscription_quantity, 0) AS q, COALESCE(bonus_instances, 0) AS b, COALESCE(over_limit_since, '') AS ols,
		COALESCE(lapsed_since, '') AS ls, COALESCE(suspension, '') AS s FROM users`).All(&users); err != nil {
		return nil, fmt.Errorf("users: %w", err)
	}
	var insts []struct {
		ID         string `db:"id"`
		UID        string `db:"uid"`
		Subdomain  string `db:"subdomain"`
		Power      bool   `db:"power"`
		Suspension string `db:"suspension"`
		Updated    string `db:"updated"`
	}
	if err := app.DB().NewQuery(`SELECT id, uid, COALESCE(subdomain, '') AS subdomain, COALESCE(power, 0) AS power,
		COALESCE(suspension, '') AS suspension, COALESCE(updated, '') AS updated FROM instances WHERE uid != ''`).All(&insts); err != nil {
		return nil, fmt.Errorf("instances: %w", err)
	}
	var payers []struct {
		User string `db:"user"`
	}
	if err := app.DB().NewQuery(`SELECT DISTINCT user FROM billing_items`).All(&payers); err != nil {
		return nil, fmt.Errorf("billing_items: %w", err)
	}
	paid := make(map[string]bool, len(payers))
	for _, p := range payers {
		paid[p.User] = true
	}
	owned := map[string][]Instance{}
	for _, i := range insts {
		owned[i.UID] = append(owned[i.UID], Instance{ID: i.ID, Subdomain: i.Subdomain, Power: i.Power,
			Archived: strings.HasPrefix(i.Suspension, "Archived:"), Updated: parseDate(i.Updated)})
	}
	out := make([]Account, 0, len(users))
	for _, u := range users {
		out = append(out, Account{User: u.ID, Allowance: allowance(u.Quantity, u.Bonus),
			OverSince: parseDate(u.OverSince), LapsedSince: parseDate(u.Lapsed), Suspended: u.Suspension != "",
			PaidBefore: paid[u.ID], Instances: owned[u.ID]})
	}
	return out, nil
}

// allowance is paid + bonus instances. Bonus counts only while at least 1 instance is paid (loyalty plan).
func allowance(paid, bonus float64) int {
	p := int(math.Max(0, math.Floor(paid)))
	if p == 0 {
		return 0
	}
	return p + int(math.Max(0, math.Floor(bonus)))
}
