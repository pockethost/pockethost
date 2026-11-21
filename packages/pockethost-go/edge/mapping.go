package edge

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	firewall "pocketone.dev/ext/firewall"

	"pocketone.dev/ext/pocker"
)

// Mothership records as the mirror exports them.

type instanceRec struct {
	ID         string          `json:"id"`
	Subdomain  string          `json:"subdomain"`
	Power      bool            `json:"power"`
	Suspension string          `json:"suspension"`
	Cname      string          `json:"cname"`
	Dev        bool            `json:"dev"`
	Secrets    json.RawMessage `json:"secrets"`
	Firewall   json.RawMessage `json:"firewall"`
	Edge       string          `json:"edge"`
	Version    string          `json:"version"`
	Webhooks   json.RawMessage `json:"webhooks"`
	AutoVacuum *bool           `json:"autoVacuum"`
	// DuplicateOf and DuplicateStatus: a copy of another instance, and whether its files are copied yet (duplicate.go).
	DuplicateOf     string `json:"duplicateOf"`
	DuplicateStatus string `json:"duplicateStatus"`
	Updated         string `json:"updated"`

	// What the instance gets from its owner, resolved by the mothership (cmd/pockethost/mothership_owners.go).
	Blocked    *pocker.Blocked    `json:"blocked"`     // the owner's account blocks it (suspended, no paid instances, not verified)
	Superusers []pocker.Superuser `json:"superusers"`  // the owner's login when admin sync is on
	TrustedIPs json.RawMessage    `json:"trusted_ips"` // the owner's trusted IPs
	Owners     []string           `json:"owners"`      // user ids that may deploy
}

type edgeRec struct {
	ID          string `json:"id"`
	EdgeID      string `json:"edge_id"`
	Region      string `json:"region"`
	InternalURL string `json:"internal_url"`
	Status      string `json:"status"`
	LastSeen    string `json:"last_seen"`
}

// legacyEdgeID owns instances that have no edge (they predate edges).
const legacyEdgeID = "sfo"

// remoteEdgePrefix marks pocker.Instance.Remote values: "edge:<edges record id>" or "edge:@<edge_id>" (legacy).
const remoteEdgePrefix = "edge:"

// ownerEdge names the edge that runs inst for Instance.Remote: its record id, or "@sfo" for instances without one.
func ownerEdge(inst instanceRec) string {
	if inst.Edge != "" {
		return inst.Edge
	}
	return "@" + legacyEdgeID
}

// isMine reports whether the instance runs on this edge (myEdge is this edge's record id, possibly not known yet).
func isMine(inst instanceRec, myEdge, myEdgeID string) bool {
	if inst.Edge != "" {
		return myEdge != "" && inst.Edge == myEdge
	}
	return myEdgeID == legacyEdgeID
}

// hosts are the names an instance answers to: <subdomain>.<apex>, <id>.<apex> and its custom domain.
func hosts(inst instanceRec, apex string) []string {
	var out []string
	if inst.Subdomain != "" {
		out = append(out, inst.Subdomain+"."+apex)
	}
	out = append(out, inst.ID+"."+apex)
	if c := strings.TrimSpace(inst.Cname); c != "" {
		out = append(out, strings.ToLower(c))
	}
	return out
}

func stringMap(raw json.RawMessage) map[string]string {
	out := map[string]string{}
	if len(raw) == 0 || string(raw) == "null" {
		return out
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		var s string // some fields arrive as a JSON string
		if json.Unmarshal(raw, &s) == nil {
			_ = json.Unmarshal([]byte(s), &m)
		}
	}
	for k, v := range m {
		if s, ok := v.(string); ok {
			out[k] = s
		} else if v != nil {
			out[k] = fmt.Sprint(v)
		}
	}
	return out
}

func stringList(raw json.RawMessage) []string {
	var out []string
	if len(raw) == 0 || string(raw) == "null" {
		return nil
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		var s string
		if json.Unmarshal(raw, &s) == nil {
			_ = json.Unmarshal([]byte(s), &out)
		}
	}
	return out
}

// rateLimits maps the operator's firewall overrides (positive integers only, as the Node firewall accepts them).
func rateLimits(raw json.RawMessage) *firewall.RateLimits {
	m := map[string]any{}
	if len(raw) == 0 || string(raw) == "null" {
		return nil
	}
	if err := json.Unmarshal(raw, &m); err != nil {
		var s string
		if json.Unmarshal(raw, &s) != nil || json.Unmarshal([]byte(s), &m) != nil {
			return nil
		}
	}
	pos := func(k string) int {
		if f, ok := m[k].(float64); ok && f > 0 && f == float64(int(f)) {
			return int(f)
		}
		return 0
	}
	r := &firewall.RateLimits{IPHourly: pos("ip_hourly"), InstanceHourly: pos("instance_hourly"),
		IPConcurrent: pos("ip_concurrent"), InstanceConcurrent: pos("instance_concurrent")}
	if *r == (firewall.RateLimits{}) {
		return nil
	}
	return r
}

// backupToken matches the Node edge: base64url(HMAC-SHA256(secret, "backup-token:<id>")).
func backupToken(secret, instanceID string) string {
	if secret == "" {
		return ""
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte("backup-token:" + instanceID))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

// Reserved secret names that are platform settings, not app variables.
const (
	secretCORS       = "PH_CORS_ORIGINS"
	secretEncryption = "PB_ENCRYPTION_KEY"
)

func splitOrigins(s string) []string {
	var out []string
	seen := map[string]bool{}
	for _, o := range strings.Split(s, ",") {
		o = strings.TrimSpace(o)
		if o != "" && !seen[o] {
			seen[o] = true
			out = append(out, o)
		}
	}
	return out
}

// mapInstance turns a mothership instance into a Pocker instance, the way the Node edge daemon decided what to serve.
// ok is always true now (an instance without an owner is blocked by the mothership); it stays for the claims logic.
func mapInstance(cfg Config, inst instanceRec, myEdge string) (pocker.Instance, bool) {
	p := pocker.Instance{ID: inst.ID, Hosts: hosts(inst, cfg.ApexDomain)}
	host := p.Hosts[0]

	secrets := stringMap(inst.Secrets)
	p.Access.CORSOrigins = splitOrigins(secrets[secretCORS])
	if fw := (firewall.InstanceConfig{RateLimits: rateLimits(inst.Firewall), TrustedIPs: stringList(inst.TrustedIPs)}); fw.RateLimits != nil || len(fw.TrustedIPs) > 0 {
		p.Extensions = map[string]any{"firewall": fw} // owner's trusted IPs and the operator's rate-limit overrides
	}
	if !isMine(inst, myEdge, cfg.EdgeID) {
		// another edge runs it: Pocker applies this edge's firewall (rate limits, CORS) and forwards (Source.Forward)
		p.Remote = remoteEdgePrefix + ownerEdge(inst)
		return p, true
	}
	switch {
	case inst.Blocked != nil && inst.Blocked.Status != 0:
		b := *inst.Blocked
		p.Blocked = &b
	case inst.Suspension != "":
		p.Blocked = &pocker.Blocked{Status: http.StatusForbidden, Message: inst.Suspension}
	case inst.DuplicateStatus == duplicateCopying:
		p.Blocked = &pocker.Blocked{Status: http.StatusServiceUnavailable, Message: fmt.Sprintf("%s is still being copied.", host)}
	case inst.DuplicateStatus == duplicateFailed:
		p.Blocked = &pocker.Blocked{Status: http.StatusServiceUnavailable, Message: fmt.Sprintf("%s could not be copied. Delete it and duplicate again.", host)}
	case !inst.Power:
		p.Blocked = &pocker.Blocked{Status: http.StatusServiceUnavailable,
			Message: fmt.Sprintf("%s is powered off. See %s/power", host, cfg.DocURL)}
	}

	p.EncryptionKey = secrets[secretEncryption]
	delete(secrets, secretEncryption)
	delete(secrets, secretCORS)
	// platform values the Node edge always set; customer code may read them (not sensitive)
	secrets["PH_APP_NAME"] = inst.Subdomain
	secrets["PH_INSTANCE_URL"] = cfg.HTTPProtocol + "//" + inst.Subdomain + "." + cfg.ApexDomain
	secrets["PH_APEX_DOMAIN"] = cfg.ApexDomain
	p.Secrets = secrets
	p.Dev = inst.Dev
	p.Version = inst.Version // the docker runtime runs this release (pocker serves every instance in-process and ignores it)
	p.Private = map[string]string{"backup_token": backupToken(cfg.BackupTokenSecret, inst.ID), "subdomain": inst.Subdomain}

	if p.Blocked == nil { // a blocked instance never starts: no login needed
		for _, su := range inst.Superusers {
			if su.Email != "" && su.PasswordHash != "" {
				p.Superusers = append(p.Superusers, su)
			}
		}
	}
	return p, true
}
