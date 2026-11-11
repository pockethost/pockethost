// Package edge connects a Pocker edge to PocketHost's current mothership: it reads the mirror (dump + realtime), maps
// mothership records onto Pocker instances, reports instance status and sends the edge heartbeat. It also provides
// PocketHost's platform routes for each instance (see Setup).
package edge

import (
	"bufio"

	"fmt"
	"ganigeorgiev.com/pocketbase/pocketbase/pocker"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config is the edge's PocketHost settings. The names match the Node edge's environment variables, so the same .env
// works for both.
type Config struct {
	MothershipURL      string        // MOTHERSHIP_URL
	AdminUser          string        // MOTHERSHIP_ADMIN_USERNAME
	AdminPassword      string        // MOTHERSHIP_ADMIN_PASSWORD
	EdgeID             string        // PH_EDGE_ID (default: hostname)
	Region             string        // PH_EDGE_REGION
	InternalURL        string        // PH_EDGE_INTERNAL_URL
	ApexDomain         string        // EDGE_APEX_DOMAIN / APEX_DOMAIN (default pockethost.io)
	HTTPProtocol       string        // HTTP_PROTOCOL (default https:)
	AppURL             string        // APP_URL (default https://app.<apex>)
	DocURL             string        // DOC_URL (default https://<apex>/docs)
	BackupTokenSecret  string        // PH_BACKUP_TOKEN_SECRET, else PH_SECRET
	HeartbeatInterval  time.Duration // PH_EDGE_HEARTBEAT_MS (default 10s)
	DriftCheckInterval time.Duration // PH_MIRROR_DRIFT_CHECK_MS (default 60s)
}

// LoadEnvFile sets variables from a KEY=VALUE file (quotes stripped) that aren't already set in the environment.
func LoadEnvFile(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		k, v, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		k = strings.TrimSpace(strings.TrimPrefix(k, "export "))
		v = strings.TrimSpace(v)
		if len(v) >= 2 && (v[0] == '"' && v[len(v)-1] == '"' || v[0] == '\'' && v[len(v)-1] == '\'') {
			v = v[1 : len(v)-1]
		} else if i := strings.Index(v, " #"); i >= 0 {
			v = strings.TrimSpace(v[:i]) // inline comment on an unquoted value
		}
		if _, set := os.LookupEnv(k); !set {
			_ = os.Setenv(k, v)
		}
	}
	return sc.Err()
}

func envOr(key, def string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return def
}

func envMillis(key string, def time.Duration) time.Duration {
	if v, err := strconv.Atoi(os.Getenv(key)); err == nil && v > 0 {
		return time.Duration(v) * time.Millisecond
	}
	return def
}

// ConfigFromEnv reads the Config from the environment.
func ConfigFromEnv() (Config, error) {
	host, _ := os.Hostname()
	apex := envOr("EDGE_APEX_DOMAIN", envOr("APEX_DOMAIN", "pockethost.io"))
	proto := envOr("HTTP_PROTOCOL", "https:")
	c := Config{
		MothershipURL:      strings.TrimRight(os.Getenv("MOTHERSHIP_URL"), "/"),
		AdminUser:          os.Getenv("MOTHERSHIP_ADMIN_USERNAME"),
		AdminPassword:      os.Getenv("MOTHERSHIP_ADMIN_PASSWORD"),
		EdgeID:             envOr("PH_EDGE_ID", host),
		Region:             envOr("PH_EDGE_REGION", "sfo"),
		InternalURL:        os.Getenv("PH_EDGE_INTERNAL_URL"),
		ApexDomain:         apex,
		HTTPProtocol:       proto,
		AppURL:             envOr("APP_URL", proto+"//app."+apex),
		DocURL:             envOr("DOC_URL", proto+"//"+apex+"/docs"),
		BackupTokenSecret:  envOr("PH_BACKUP_TOKEN_SECRET", os.Getenv("PH_SECRET")),
		HeartbeatInterval:  envMillis("PH_EDGE_HEARTBEAT_MS", 10*time.Second),
		DriftCheckInterval: envMillis("PH_MIRROR_DRIFT_CHECK_MS", 60*time.Second),
	}
	if c.MothershipURL == "" || c.AdminUser == "" || c.AdminPassword == "" {
		return c, fmt.Errorf("MOTHERSHIP_URL, MOTHERSHIP_ADMIN_USERNAME and MOTHERSHIP_ADMIN_PASSWORD are required")
	}
	return c, nil
}

// FirewallFromEnv adds the Node firewall's settings to Pocker's firewall config: IPCIDR_LIST (the peers allowed to
// connect, i.e. Cloudflare) becomes allowed peers and trusted proxies (their CF-Connecting-IP is believed), and
// PH_USER_PROXY_IPS becomes trusted clients. Loopback is always allowed and trusted (the edge's own scheduled calls
// and health checks), and rate-limit headers keep the Node firewall's X-PocketHost-RateLimit-* names. The private network other edges forward from belongs in pocker.yaml's firewall.allow_cidrs.
func FirewallFromEnv(fw *pocker.FirewallConfig) {
	csv := func(key string) []string {
		var out []string
		for _, v := range strings.Split(os.Getenv(key), ",") {
			if v = strings.TrimSpace(v); v != "" {
				out = append(out, v)
			}
		}
		return out
	}
	if cidrs := csv("IPCIDR_LIST"); len(cidrs) > 0 {
		fw.AllowCIDRs = append(fw.AllowCIDRs, cidrs...)
		fw.TrustedProxies = append(fw.TrustedProxies, cidrs...)
	}
	if len(fw.AllowCIDRs) > 0 {
		fw.AllowCIDRs = append(fw.AllowCIDRs, "127.0.0.0/8", "::1/128")
	}
	fw.TrustedClients = append(fw.TrustedClients, csv("PH_USER_PROXY_IPS")...)
	fw.TrustedClients = append(fw.TrustedClients, "127.0.0.0/8", "::1/128")
	if fw.RateLimitHeaderPrefix == "" {
		fw.RateLimitHeaderPrefix = "X-PocketHost-RateLimit" // the Node firewall's header names
	}
}
