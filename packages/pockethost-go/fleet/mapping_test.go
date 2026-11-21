package fleet

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	firewall "pocketone.dev/ext/firewall"
	"pocketone.dev/ext/pocker"
)

var testCfg = Config{ApexDomain: "pockethost.io", HTTPProtocol: "https:", AppURL: "https://app.pockethost.io", DocURL: "https://pockethost.io/docs"}

func raw(s string) json.RawMessage { return json.RawMessage(s) }

func TestMapInstance(t *testing.T) {
	inst := instanceRec{ID: "abc123", Subdomain: "shop", Power: true, Edge: "E_SGP", Cname: "Shop.Example.com",
		Secrets:  raw(`{"STRIPE_KEY":"sk","PH_CORS_ORIGINS":"https://a.com, https://b.com,https://a.com","PB_ENCRYPTION_KEY":"k32"}`),
		Firewall: raw(`"{\"ip_hourly\": 2000, \"ip_concurrent\": 1.5, \"instance_hourly\": -1}"`),
		Version:  "p1:0.0.*", Owners: []string{"u1"}, TrustedIPs: raw(`["203.0.113.0/24"]`),
		Superusers: []pocker.Superuser{{ID: "u1", Email: "o@x.com", PasswordHash: "$2a$hash", TokenKey: "tk"}}}

	p := mapInstance(testCfg, inst, "E_SGP", "sgp-1")
	if p.Blocked != nil {
		t.Fatalf("own instance: %+v", p.Blocked)
	}
	if p.Version != "p1:0.0.*" {
		t.Fatalf("version %q: the docker runtime needs the instance's version", p.Version)
	}
	if strings.Join(p.Hosts, ",") != "shop.pockethost.io,abc123.pockethost.io,shop.example.com" {
		t.Errorf("hosts: %v", p.Hosts)
	}
	if p.Secrets["STRIPE_KEY"] != "sk" || p.Secrets["PH_CORS_ORIGINS"] != "" || p.Secrets["PB_ENCRYPTION_KEY"] != "" {
		t.Errorf("secrets must lose the reserved names: %v", p.Secrets)
	}
	if p.Secrets["PH_APP_NAME"] != "shop" || p.Secrets["PH_INSTANCE_URL"] != "https://shop.pockethost.io" {
		t.Errorf("platform env: %v", p.Secrets)
	}
	if p.EncryptionKey != "k32" || strings.Join(p.Access.CORSOrigins, ",") != "https://a.com,https://b.com" {
		t.Errorf("explicit fields: key=%q cors=%v", p.EncryptionKey, p.Access.CORSOrigins)
	}
	fwc, _ := p.ExtensionConfig("firewall").(firewall.InstanceConfig)
	if strings.Join(fwc.TrustedIPs, ",") != "203.0.113.0/24" {
		t.Errorf("owner trusted_ips: %v", fwc.TrustedIPs)
	}
	if fwc.RateLimits == nil || fwc.RateLimits.IPHourly != 2000 || fwc.RateLimits.IPConcurrent != 0 || fwc.RateLimits.InstanceHourly != 0 {
		t.Errorf("firewall overrides (positive integers only): %+v", fwc.RateLimits)
	}
	if len(p.Superusers) != 1 || p.Superusers[0].Email != "o@x.com" || p.Superusers[0].ID != "u1" {
		t.Errorf("admin sync: %+v", p.Superusers)
	}
	if p.Private[PrivateOwners] != "u1" || p.Private[PrivateSubdomain] != "shop" || p.Private[PrivatePower] != "true" {
		t.Errorf("private facts for the edge: %v", p.Private)
	}
	if _, ok := p.Private["backup_token"]; ok {
		t.Error("the mothership has no backup token secret; edges derive the token")
	}

	// placement
	// another edge's instance: forwarded after this edge's firewall, so it keeps rate limits and CORS, nothing else
	if p := mapInstance(testCfg, inst, "E_OTHER", "sgp-1"); p.Remote != "edge:E_SGP" || p.Blocked != nil || p.Secrets != nil ||
		p.Superusers != nil || len(p.Private) != 1 || p.Private[PrivateOwners] != "u1" || p.ExtensionConfig("firewall") == nil || len(p.Access.CORSOrigins) == 0 {
		t.Errorf("other edge: %+v", p)
	}
	legacy := inst
	legacy.Edge = ""
	if p := mapInstance(testCfg, legacy, "E_SGP", "sgp-1"); p.Remote != "edge:@sfo" {
		t.Error("an instance without an edge belongs to sfo, not sgp-1")
	}
	if p := mapInstance(testCfg, legacy, "E_SFO", "sfo"); p.Blocked != nil {
		t.Errorf("legacy instance on sfo: %+v", p.Blocked)
	}

	// blocked rules: the owner's block (decided by the mothership) first, then the instance's own
	cases := []struct {
		name   string
		mutate func(*instanceRec)
		status int
		msg    string
	}{
		{"owner blocked", func(i *instanceRec) {
			i.Blocked = &pocker.Blocked{Status: 402, Message: "upgrade"}
			i.Suspension, i.Power = "x", false
		}, 402, "upgrade"},
		{"instance suspended", func(i *instanceRec) { i.Suspension = "abuse" }, 403, "abuse"},
		{"powered off", func(i *instanceRec) { i.Power = false }, 503, ""},
		{"empty block is no block", func(i *instanceRec) { i.Blocked = &pocker.Blocked{}; i.Power = false }, 503, ""},
	}
	for _, c := range cases {
		i2 := inst
		c.mutate(&i2)
		p := mapInstance(testCfg, i2, "E_SGP", "sgp-1")
		if p.Blocked == nil || p.Blocked.Status != c.status || (c.msg != "" && p.Blocked.Message != c.msg) {
			t.Errorf("%s: %+v", c.name, p.Blocked)
		}
		if p.Superusers != nil {
			t.Errorf("%s: a blocked instance gets no superuser login", c.name)
		}
	}
}

// The mothership sends the owner fields as JSON (cmd/pockethost/mothership_owners.go); the edge reads them.
func TestOwnerFieldsJSON(t *testing.T) {
	var r instanceRec
	err := json.Unmarshal([]byte(`{"id":"i1","blocked":{"status":403,"message":"abuse"},
		"superusers":[{"id":"u1","email":"o@x.com","tokenKey":"tk","passwordHash":"$2a$h"}],
		"trusted_ips":["198.51.100.7"],"owners":["u1"]}`), &r)
	if err != nil {
		t.Fatal(err)
	}
	if r.Blocked == nil || r.Blocked.Status != 403 || r.Blocked.Message != "abuse" {
		t.Errorf("blocked: %+v", r.Blocked)
	}
	if len(r.Superusers) != 1 || r.Superusers[0].TokenKey != "tk" || r.Superusers[0].PasswordHash != "$2a$h" || r.Superusers[0].ID != "u1" {
		t.Errorf("superusers: %+v", r.Superusers)
	}
	if strings.Join(stringList(r.TrustedIPs), ",") != "198.51.100.7" || len(r.Owners) != 1 {
		t.Errorf("trusted_ips/owners: %s %v", r.TrustedIPs, r.Owners)
	}
	var none instanceRec
	if err := json.Unmarshal([]byte(`{"id":"i2","blocked":null,"superusers":[],"trusted_ips":null,"owners":[]}`), &none); err != nil || none.Blocked != nil {
		t.Errorf("empty fields: %+v %v", none, err)
	}
}

func TestMapInstanceBlocksUnfinishedCopies(t *testing.T) {
	cfg := Config{ApexDomain: "pockethost.io"}
	for status, want := range map[string]string{DuplicateCopying: "still being copied", DuplicateFailed: "could not be copied"} {
		p := mapInstance(cfg, instanceRec{ID: "i", Subdomain: "s", Power: true, Edge: "E1", DuplicateStatus: status}, "E1", "e1")
		if p.Blocked == nil || p.Blocked.Status != http.StatusServiceUnavailable || !strings.Contains(p.Blocked.Message, want) {
			t.Fatalf("%s: %+v", status, p.Blocked)
		}
	}
	p := mapInstance(cfg, instanceRec{ID: "i", Subdomain: "s", Power: true, Edge: "E1", DuplicateStatus: DuplicateReady}, "E1", "e1")
	if p.Blocked != nil {
		t.Fatalf("ready copy blocked: %+v", p.Blocked)
	}
}
