package edge

import (
	"errors"
	"strings"
	"time"

	"github.com/pockethost/pocketone/ext/firewall"
	"github.com/pockethost/pocketone/ext/pluginkit"
)

// SectionConfig is the `pockethost` section of an edge's pocketone.yaml: what edge.env held (the mothership login
// comes from .env through $VARS).
//
//	pockethost:
//	  edge: { id: lax-1, region: lax, internal_url: "http://10.88.0.5:8080" }
//	  apex: pockethost.io
//	  app_url: https://app.pockethost.io
//	  mothership: { url: http://10.88.0.10:8090, email: $MOTHERSHIP_ADMIN_USERNAME, password: $MOTHERSHIP_ADMIN_PASSWORD }
//	  backup_token_secret: $PH_SECRET
//	  vacuum_cron: "0 11 * * *"
//	  discord_health_url: $DISCORD_HEALTH_CHANNEL_URL   # the nightly vacuum's summary
type SectionConfig struct {
	Edge struct {
		ID          string `yaml:"id"`
		Region      string `yaml:"region"`
		InternalURL string `yaml:"internal_url"`
	} `yaml:"edge"`
	Apex       string `yaml:"apex"`
	Protocol   string `yaml:"protocol"` // "https:" (default)
	AppURL     string `yaml:"app_url"`
	DocURL     string `yaml:"doc_url"`
	Mothership struct {
		URL      string `yaml:"url"`
		Email    string `yaml:"email"`
		Password string `yaml:"password"`
	} `yaml:"mothership"`
	BackupTokenSecret string        `yaml:"backup_token_secret"`
	VacuumCron        string        `yaml:"vacuum_cron"`
	DiscordHealthURL  string        `yaml:"discord_health_url"`
	Heartbeat         time.Duration `yaml:"heartbeat"`
	DriftCheck        time.Duration `yaml:"drift_check"`
	DisableWebhooks   bool          `yaml:"disable_webhooks"`
}

// Section is the key of the `pockethost` section.
var Section = pluginkit.NewSection("pockethost", SectionConfig{}, "PocketHost edge: this edge's id/region/internal URL, apex and app URLs, the mothership login, backup token secret, vacuum schedule.")

// ConfigFromSection builds the edge's Config from the `pockethost` section.
func ConfigFromSection(s SectionConfig) (Config, error) {
	apex := or(s.Apex, "pockethost.io")
	proto := or(s.Protocol, "https:")
	c := Config{
		MothershipURL:      strings.TrimRight(s.Mothership.URL, "/"),
		AdminUser:          s.Mothership.Email,
		AdminPassword:      s.Mothership.Password,
		EdgeID:             s.Edge.ID,
		Region:             or(s.Edge.Region, "sfo"),
		InternalURL:        s.Edge.InternalURL,
		ApexDomain:         apex,
		HTTPProtocol:       proto,
		AppURL:             or(s.AppURL, proto+"//app."+apex),
		DocURL:             or(s.DocURL, proto+"//"+apex+"/docs"),
		BackupTokenSecret:  s.BackupTokenSecret,
		HeartbeatInterval:  s.Heartbeat,
		DriftCheckInterval: s.DriftCheck,
	}
	if c.HeartbeatInterval <= 0 {
		c.HeartbeatInterval = 10 * time.Second
	}
	if c.DriftCheckInterval <= 0 {
		c.DriftCheckInterval = 60 * time.Second
	}
	if c.MothershipURL == "" || c.AdminUser == "" || c.AdminPassword == "" || c.EdgeID == "" {
		return c, errors.New("pockethost: mothership url, email, password and edge.id are required")
	}
	return c, nil
}

// FirewallDefaults are PocketHost's firewall settings over the `firewall` section: loopback is always allowed and trusted (the edge's
// own scheduled calls and health checks), and rate-limit headers keep the Node firewall's names unless set.
func FirewallDefaults(fw *firewall.Config, _ **firewall.RateLimits) {
	if len(fw.AllowCIDRs) > 0 {
		fw.AllowCIDRs = append(fw.AllowCIDRs, "127.0.0.0/8", "::1/128")
	}
	fw.TrustedClients = append(fw.TrustedClients, "127.0.0.0/8", "::1/128")
	if len(fw.TrustedClientHeaders) == 0 {
		fw.TrustedClientHeaders = TrustedClientHeaders
	}
	if fw.RateLimitHeaderPrefix == "" {
		fw.RateLimitHeaderPrefix = "X-PocketHost-RateLimit"
	}
}

// TrustedClientHeaders are where a customer's trusted proxy names its end user: PocketOne's X-Client-IP, and
// X-PocketHost-Client-IP, the name in PocketHost's docs (accepted for good; see the header rename plan).
var TrustedClientHeaders = []string{"X-Client-IP", "X-PocketHost-Client-IP"}

func or(v, def string) string {
	if strings.TrimSpace(v) != "" {
		return v
	}
	return def
}
