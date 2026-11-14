// Package edge connects a Pocker edge to PocketHost's current mothership: it reads the mirror (dump + realtime), maps
// mothership records onto Pocker instances, reports instance status and sends the edge heartbeat. It also provides
// PocketHost's platform routes for each instance (see Setup).
package edge

import "time"

// Config is the edge's PocketHost settings, from the `pockethost` section ([ConfigFromSection]).
type Config struct {
	MothershipURL      string
	AdminUser          string
	AdminPassword      string
	EdgeID             string
	Region             string
	InternalURL        string
	ApexDomain         string
	HTTPProtocol       string
	AppURL             string
	DocURL             string
	BackupTokenSecret  string
	HeartbeatInterval  time.Duration
	DriftCheckInterval time.Duration
}
