package edge

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"ganigeorgiev.com/pocketbase/pocketbase/pocker"
)

// Mothership records as the mirror exports them.

type userRec struct {
	ID                   string          `json:"id"`
	Email                string          `json:"email"`
	Verified             bool            `json:"verified"`
	SubscriptionQuantity int             `json:"subscription_quantity"`
	TrustedIPs           json.RawMessage `json:"trusted_ips"`
	Suspension           string          `json:"suspension"`
	Updated              string          `json:"updated"`
}

type instanceRec struct {
	ID         string          `json:"id"`
	Subdomain  string          `json:"subdomain"`
	UID        string          `json:"uid"`
	Power      bool            `json:"power"`
	Suspension string          `json:"suspension"`
	SyncAdmin  bool            `json:"syncAdmin"`
	Cname      string          `json:"cname"`
	Dev        bool            `json:"dev"`
	Secrets    json.RawMessage `json:"secrets"`
	Firewall   json.RawMessage `json:"firewall"`
	Edge       string          `json:"edge"`
	Version    string          `json:"version"`
	Updated    string          `json:"updated"`
}

type edgeRec struct {
	ID          string `json:"id"`
	EdgeID      string `json:"edge_id"`
	Region      string `json:"region"`
	InternalURL string `json:"internal_url"`
	Status      string `json:"status"`
}

// tokenInfo is the owner's login, for syncing it as the instance's superuser.
type tokenInfo struct {
	Email        string `json:"email"`
	PasswordHash string `json:"passwordHash"`
	TokenKey     string `json:"tokenKey"`
}

// legacyEdgeID owns instances that have no edge (they predate edges).
const legacyEdgeID = "sfo"

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
func rateLimits(raw json.RawMessage) *pocker.RateLimits {
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
	r := &pocker.RateLimits{IPHourly: pos("ip_hourly"), InstanceHourly: pos("instance_hourly"),
		IPConcurrent: pos("ip_concurrent"), InstanceConcurrent: pos("instance_concurrent")}
	if *r == (pocker.RateLimits{}) {
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

// mapInstance turns a mothership instance into a Pocker instance, the way the Node edge daemon decides what to serve.
// ok=false means the instance isn't served at all (its owner is unknown).
func mapInstance(cfg Config, inst instanceRec, owner *userRec, myEdge string, ownerLogin func(uid string) *tokenInfo) (pocker.Instance, bool) {
	p := pocker.Instance{ID: inst.ID, Hosts: hosts(inst, cfg.ApexDomain)}
	if owner == nil {
		return p, false
	}
	host := p.Hosts[0]

	if !isMine(inst, myEdge, cfg.EdgeID) {
		p.Blocked = &pocker.Blocked{Status: http.StatusMisdirectedRequest, Message: host + " is served by another PocketHost edge"}
		return p, true
	}
	switch {
	case owner.Suspension != "":
		p.Blocked = &pocker.Blocked{Status: http.StatusForbidden, Message: owner.Suspension}
	case inst.Suspension != "":
		p.Blocked = &pocker.Blocked{Status: http.StatusForbidden, Message: inst.Suspension}
	case owner.SubscriptionQuantity == 0:
		p.Blocked = &pocker.Blocked{Status: http.StatusPaymentRequired,
			Message: fmt.Sprintf("Instances will not run until you <a href=%s/access>upgrade</a>", cfg.AppURL)}
	case !inst.Power:
		p.Blocked = &pocker.Blocked{Status: http.StatusServiceUnavailable,
			Message: fmt.Sprintf("%s is powered off. See %s/power", host, cfg.DocURL)}
	case !owner.Verified:
		p.Blocked = &pocker.Blocked{Status: http.StatusForbidden, Message: fmt.Sprintf("Log in at %s to verify your account.", cfg.AppURL)}
	}

	secrets := stringMap(inst.Secrets)
	p.EncryptionKey = secrets[secretEncryption]
	p.Access.CORSOrigins = splitOrigins(secrets[secretCORS])
	delete(secrets, secretEncryption)
	delete(secrets, secretCORS)
	// platform values the Node edge always set; customer code may read them (not sensitive)
	secrets["PH_APP_NAME"] = inst.Subdomain
	secrets["PH_INSTANCE_URL"] = cfg.HTTPProtocol + "//" + inst.Subdomain + "." + cfg.ApexDomain
	secrets["PH_APEX_DOMAIN"] = cfg.ApexDomain
	p.Secrets = secrets
	p.Dev = inst.Dev
	p.Access.TrustedIPs = stringList(owner.TrustedIPs)
	p.Limits.RateLimits = rateLimits(inst.Firewall)
	p.Private = map[string]string{"backup_token": backupToken(cfg.BackupTokenSecret, inst.ID), "subdomain": inst.Subdomain}

	if inst.SyncAdmin && ownerLogin != nil {
		if t := ownerLogin(inst.UID); t != nil && t.Email != "" && t.PasswordHash != "" {
			p.Superusers = []pocker.Superuser{{ID: owner.ID, Email: t.Email, TokenKey: t.TokenKey, PasswordHash: t.PasswordHash}}
		}
	}
	return p, true
}
