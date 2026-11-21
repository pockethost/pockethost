// Package fleet is PocketHost's side of PocketOne's lazy mirror: instance.resolve/v1 over the mothership's own
// collections (instances, users, edges). PocketOne's ext/mothership server streams the answers to the edges; this
// package decides them from the instance records alone (what an instance gets from its owner the mothership already
// wrote on it: blocked, superusers, trusted_ips, owners), with the rules the Node edge daemon used: host claims
// (custom domain > subdomain > id, newest record wins a tie), the blocks, the firewall settings, and Remote for
// another edge's instances.
package fleet

import (
	"context"
	"encoding/json"
	"os"
	"sort"
	"strings"

	"ganigeorgiev.com/pocketbase/dbx"
	"ganigeorgiev.com/pocketbase/pocketbase/core"

	resolvev1 "pocketone.dev/ext/contracts/instance/resolve/v1"
	sourcev1 "pocketone.dev/ext/contracts/instance/source/v1"
	watchv1 "pocketone.dev/ext/contracts/instance/watch/v1"
	"pocketone.dev/ext/extkit"
)

// Config is what the mapping needs to know about PocketHost: the apex its instances live under and the URLs its
// messages link to. The same for every edge.
type Config struct {
	ApexDomain   string // pockethost.io
	HTTPProtocol string // https:
	AppURL       string // https://app.pockethost.io
	DocURL       string // https://pockethost.io/docs
}

// ConfigFromEnv reads the mothership's environment: PH_APEX_DOMAIN (default pockethost.io), PH_HTTP_PROTOCOL
// (https:), APP_URL (the hooks' own; default <protocol>//app.<apex>) and PH_DOC_URL (<protocol>//<apex>/docs), the
// edges' old defaults.
func ConfigFromEnv() Config {
	or := func(v, def string) string {
		if v = strings.TrimSpace(v); v != "" {
			return v
		}
		return def
	}
	c := Config{ApexDomain: or(os.Getenv("PH_APEX_DOMAIN"), "pockethost.io"), HTTPProtocol: or(os.Getenv("PH_HTTP_PROTOCOL"), "https:")}
	c.AppURL = strings.TrimRight(or(os.Getenv("APP_URL"), c.HTTPProtocol+"//app."+c.ApexDomain), "/")
	c.DocURL = strings.TrimRight(or(os.Getenv("PH_DOC_URL"), c.HTTPProtocol+"//"+c.ApexDomain+"/docs"), "/")
	return c
}

// Resolver is PocketHost's instance.resolve/v1. Provide it on the mothership app beside ext/mothership's Server.
type Resolver struct {
	App core.App
	Cfg Config
}

var _ resolvev1.Resolver = (*Resolver)(nil)

// Extension provides the resolver on an app (extkit.MustRegister(app, fleet.Extension{...}) beside
// mothership.Server).
type Extension struct{ Cfg Config }

// Name implements extkit.Extension.
func (Extension) Name() string { return "pockethost-fleet" }

// Contracts implements extkit.Declarer.
func (Extension) Contracts() extkit.Contracts {
	return extkit.Contracts{Implements: extkit.IDs("instance.resolve/v1")}
}

// Register implements extkit.Extension.
func (x Extension) Register(app core.App, _ extkit.Config) error {
	resolvev1.Contract.Provide(app, &Resolver{App: app, Cfg: x.Cfg})
	return nil
}

// Keys of the resolver's own deps.
func edgeKey(edgeID string) string      { return resolvev1.Key("edge:" + edgeID) }
func standingKey(edgeRef string) string { return resolvev1.Key("standing:" + edgeRef) }

// decode fills out (a record struct with json tags) from rec's fields.
func decode(rec *core.Record, out any) {
	b, err := json.Marshal(rec.FieldsData())
	if err == nil {
		_ = json.Unmarshal(b, out)
	}
}

func instanceOf(rec *core.Record) instanceRec {
	var i instanceRec
	decode(rec, &i)
	i.ID = rec.Id
	return i
}

// edgeRecord is the record id of the edge named edgeID ("" when there's none).
func (r *Resolver) edgeRecord(edgeID string) string {
	rec, err := r.App.FindFirstRecordByData("edges", "edge_id", edgeID)
	if err != nil {
		return ""
	}
	return rec.Id
}

// label is the first label of host when host is <label>.<apex>, else "".
func (r *Resolver) label(host string) string {
	l, ok := strings.CutSuffix(host, "."+r.Cfg.ApexDomain)
	if !ok || l == "" || strings.Contains(l, ".") {
		return ""
	}
	return l
}

// claimOn is how strongly inst claims host: 3 custom domain, 2 subdomain, 1 <id>.<apex>, 0 not at all.
func (r *Resolver) claimOn(inst instanceRec, host string) int {
	switch {
	case inst.Cname != "" && strings.ToLower(strings.TrimSpace(inst.Cname)) == host:
		return 3
	case inst.Subdomain != "" && inst.Subdomain+"."+r.Cfg.ApexDomain == host:
		return 2
	case inst.ID+"."+r.Cfg.ApexDomain == host:
		return 1
	}
	return 0
}

// winner finds the instance host routes to, and every instance that claims it (their records are the answer's deps:
// a write to any of them can change the winner).
func (r *Resolver) winner(host string) (*instanceRec, []instanceRec, error) {
	cond := dbx.Or(dbx.NewExp("instances.cname != '' AND instances.cname = {:host}", dbx.Params{"host": host}))
	if l := r.label(host); l != "" {
		cond = dbx.Or(cond, dbx.NewExp("instances.subdomain = {:label} OR instances.id = {:label}", dbx.Params{"label": l}))
	}
	var recs []*core.Record
	err := r.App.RecordQuery("instances").AndWhere(cond).All(&recs)
	if err != nil {
		return nil, nil, err
	}
	cands := make([]instanceRec, 0, len(recs))
	for _, rec := range recs {
		cands = append(cands, instanceOf(rec))
	}
	type ranked struct {
		inst instanceRec
		rank int
	}
	var best *ranked
	for _, c := range cands {
		k := r.claimOn(c, host)
		if k == 0 {
			continue
		}
		cur := ranked{c, k}
		if best == nil || cur.rank > best.rank || cur.rank == best.rank &&
			(cur.inst.Updated > best.inst.Updated || cur.inst.Updated == best.inst.Updated && cur.inst.ID < best.inst.ID) {
			best = &cur
		}
	}
	if best == nil {
		return nil, cands, nil
	}
	return &best.inst, cands, nil
}

func addCandDeps(deps []string, cands []instanceRec) []string {
	for _, c := range cands {
		deps = append(deps, resolvev1.Record("instances", c.ID))
	}
	return deps
}

// build maps inst for edgeID, with only the hosts it wins. deps gets what it read.
func (r *Resolver) build(inst instanceRec, edgeID, myEdge string, deps *[]string) (*sourcev1.Instance, error) {
	*deps = append(*deps, resolvev1.Record("instances", inst.ID))
	p := mapInstance(r.Cfg, inst, myEdge, edgeID)
	kept := p.Hosts[:0]
	for _, h := range p.Hosts {
		w, cands, err := r.winner(h)
		if err != nil {
			return nil, err
		}
		*deps = addCandDeps(append(*deps, resolvev1.Host(h)), cands)
		if w != nil && w.ID == inst.ID {
			kept = append(kept, h)
		}
	}
	p.Hosts = kept
	return &p, nil
}

// Resolve implements [resolvev1.Resolver].
func (r *Resolver) Resolve(_ context.Context, q resolvev1.Query) (resolvev1.Resolution, error) {
	host := strings.TrimSuffix(strings.ToLower(strings.TrimSpace(q.Host)), ".")
	res := resolvev1.Resolution{Deps: []string{resolvev1.Host(host), edgeKey(q.Edge)}}
	w, cands, err := r.winner(host)
	if err != nil {
		return res, err
	}
	res.Deps = addCandDeps(res.Deps, cands)
	if w == nil {
		return res, nil
	}
	inst, err := r.build(*w, q.Edge, r.edgeRecord(q.Edge), &res.Deps)
	if err != nil {
		return res, err
	}
	res.Instance = inst
	return res, nil
}

// edgeRef is how instances name their edge for standing keys: its record id, or "@sfo" for instances without one.
func edgeRef(inst instanceRec) string { return ownerEdge(inst) }

// Standing implements [resolvev1.Resolver]: this edge's unfinished copies (duplicateStatus copying) and, when on this
// edge, their originals, so the edge copies the files without waiting for traffic. Each copy carries
// Private[duplicate_of] and, when the original can't be copied here, Private[duplicate_problem].
func (r *Resolver) Standing(_ context.Context, edgeID string) (resolvev1.Standing, error) {
	myEdge := r.edgeRecord(edgeID)
	refs := []string{}
	if myEdge != "" {
		refs = append(refs, myEdge)
	}
	if edgeID == legacyEdgeID {
		refs = append(refs, "@"+legacyEdgeID)
	}
	out := resolvev1.Standing{Deps: []string{edgeKey(edgeID)}}
	for _, ref := range refs {
		out.Deps = append(out.Deps, standingKey(ref))
	}
	if len(refs) == 0 {
		return out, nil
	}
	cond := dbx.HashExp{"duplicateStatus": DuplicateCopying}
	var recs []*core.Record
	q := r.App.RecordQuery("instances").AndWhere(cond)
	if myEdge != "" && edgeID == legacyEdgeID {
		q = q.AndWhere(dbx.Or(dbx.HashExp{"edge": myEdge}, dbx.HashExp{"edge": ""}))
	} else if myEdge != "" {
		q = q.AndWhere(dbx.HashExp{"edge": myEdge})
	} else {
		q = q.AndWhere(dbx.HashExp{"edge": ""})
	}
	if err := q.All(&recs); err != nil {
		return out, err
	}
	seen := map[string]bool{}
	add := func(inst instanceRec, extra map[string]string) error {
		if seen[inst.ID] {
			return nil
		}
		seen[inst.ID] = true
		p, err := r.build(inst, edgeID, myEdge, &out.Deps)
		if err != nil || p == nil {
			return err
		}
		for k, v := range extra {
			if p.Private == nil {
				p.Private = map[string]string{}
			}
			p.Private[k] = v
		}
		out.Instances = append(out.Instances, *p)
		return nil
	}
	for _, rec := range recs {
		cp := instanceOf(rec)
		extra := map[string]string{PrivateDuplicateOf: cp.DuplicateOf}
		var src *instanceRec
		if cp.DuplicateOf != "" {
			out.Deps = append(out.Deps, resolvev1.Record("instances", cp.DuplicateOf))
			if srec, err := r.App.FindRecordById("instances", cp.DuplicateOf); err == nil {
				s := instanceOf(srec)
				src = &s
			}
		}
		switch {
		case src == nil:
			extra[PrivateDuplicateProblem] = "the original instance no longer exists"
		case !isMine(*src, myEdge, edgeID):
			extra[PrivateDuplicateProblem] = "the original instance moved to another server"
		}
		if err := add(cp, extra); err != nil {
			return out, err
		}
		if src != nil && extra[PrivateDuplicateProblem] == "" {
			if err := add(*src, nil); err != nil {
				return out, err
			}
		}
	}
	sort.Slice(out.Instances, func(i, j int) bool { return out.Instances[i].ID < out.Instances[j].ID })
	return out, nil
}

// Edges implements [resolvev1.Resolver].
func (r *Resolver) Edges(context.Context) (resolvev1.EdgeList, error) {
	recs, err := r.App.FindAllRecords("edges")
	if err != nil {
		return resolvev1.EdgeList{}, err
	}
	out := resolvev1.EdgeList{Deps: []string{resolvev1.Collection("edges")}, Edges: make([]watchv1.Edge, 0, len(recs))}
	for _, e := range recs {
		out.Edges = append(out.Edges, watchv1.Edge{ID: e.Id, Name: e.GetString("edge_id"), InternalURL: e.GetString("internal_url"),
			Region: e.GetString("region"), Status: e.GetString("status"), LastSeen: e.GetDateTime("last_seen").Time()})
	}
	sort.Slice(out.Edges, func(i, j int) bool { return out.Edges[i].Name < out.Edges[j].Name })
	return out, nil
}

// Touches implements [resolvev1.Resolver]: an instance claims its three names (before and after the write) and,
// while it's an unfinished copy, its edge's standing set; an edge names its record when its edge_id changes.
func (r *Resolver) Touches(_ context.Context, rec *core.Record) ([]string, error) {
	orig := rec.Original()
	switch rec.Collection().Name {
	case "instances":
		var out []string
		for _, v := range []*core.Record{rec, orig} {
			if v.Id == "" {
				continue // a new record's original
			}
			inst := instanceOf(v)
			for _, h := range hosts(inst, r.Cfg.ApexDomain) {
				out = append(out, resolvev1.Host(strings.ToLower(h)))
			}
			if inst.DuplicateStatus == DuplicateCopying {
				out = append(out, standingKey(edgeRef(inst)))
			}
		}
		return out, nil
	case "edges":
		now, was := rec.GetString("edge_id"), orig.GetString("edge_id")
		if now == was && orig.Id != "" {
			return nil, nil
		}
		out := []string{edgeKey(now)}
		if was != "" && was != now {
			out = append(out, edgeKey(was))
		}
		return out, nil
	}
	return nil, nil
}
