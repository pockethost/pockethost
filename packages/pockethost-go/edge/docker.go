package edge

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strconv"

	"github.com/pockethost/pocketone/ext/docker"
	"github.com/pockethost/pocketone/ext/host"
)

// The platform hooks and migrations every instance container gets, as the Node edge mounts them from
// packages/server/src/instance-app (admin sync, the backup endpoint, PocketHost defaults, the app URL).
//
//go:embed all:instanceapp
var instanceApp embed.FS

// WriteInstanceApp writes the platform hooks and migrations under dir (instanceapp/pb_hooks, …/pb_migrations),
// replacing what was there, and returns the files written as container mounts (host path → path inside the
// instance home).
func WriteInstanceApp(dir, home string) ([]string, error) {
	var binds []string
	err := fs.WalkDir(instanceApp, "instanceapp", func(p string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return err
		}
		b, err := instanceApp.ReadFile(p)
		if err != nil {
			return err
		}
		rel := p[len("instanceapp/"):] // pb_hooks/_ph_lib.js
		dst := filepath.Join(dir, filepath.FromSlash(rel))
		if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
			return err
		}
		if err := os.WriteFile(dst, b, 0o644); err != nil {
			return err
		}
		binds = append(binds, dst+":"+path.Join(home, rel)+":ro")
		return nil
	})
	return binds, err
}

// DockerContainer is the docker provider's per-container hook for PocketHost: the platform hooks and migrations,
// and the environment the Node edge passes (the instance's secrets already carry PH_APP_NAME, PH_INSTANCE_URL and
// PH_APEX_DOMAIN from the mapping): PH_BACKUP_TOKEN, ADMIN_SYNC (the owner's login for the dashboard) and DEV.
func DockerContainer(platformBinds []string) func(ctx context.Context, inst host.Instance, version string, spec *docker.Spec) error {
	return func(_ context.Context, inst host.Instance, _ string, spec *docker.Spec) error {
		spec.Binds = append(spec.Binds, platformBinds...)
		if tok := inst.Private["backup_token"]; tok != "" {
			spec.Env["PH_BACKUP_TOKEN"] = tok
		}
		if len(inst.Superusers) > 0 {
			su := inst.Superusers[0]
			b, err := json.Marshal(map[string]string{"id": su.ID, "email": su.Email, "tokenKey": su.TokenKey, "passwordHash": su.PasswordHash})
			if err != nil {
				return err
			}
			spec.Env["ADMIN_SYNC"] = string(b)
		}
		spec.Env["DEV"] = strconv.FormatBool(inst.Dev)
		return nil
	}
}

// DockerInstances gives PocketHost's edge features (deploy API, scheduler, vacuum) the docker runtime through the same
// interface pocker's Manager offers.
type DockerInstances struct {
	RT   *docker.Runtime
	Host *host.Host
	Log  *slog.Logger
}

var _ Instances = DockerInstances{}

// Ready implements Instances.
func (d DockerInstances) Ready() bool { return d.Host.Handler().Ready() }

// ServeHTTP implements Instances: a request through the host's front (gates, then the instance's container).
func (d DockerInstances) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	d.Host.Handler().ServeHTTP(w, r)
}

// LogInstance implements Instances: platform messages about an instance go to the edge log.
func (d DockerInstances) LogInstance(id, stream, message string) {
	d.log().Info("pockethost: instance log", "instance", id, "stream", stream, "message", message)
}

// Running implements Instances.
func (d DockerInstances) Running(id string) bool { return d.RT.Running(id) }

// InstanceDir implements Instances: only for instances this edge serves.
func (d DockerInstances) InstanceDir(id string) (string, bool) {
	inst, ok := d.Host.Directory.Get(id)
	if !ok || inst.Remote != "" {
		return "", false
	}
	return d.RT.InstanceDir(id), true
}

// WithInstanceStopped implements Instances.
func (d DockerInstances) WithInstanceStopped(ctx context.Context, id string, fn func(dir string) error) error {
	if _, ok := d.InstanceDir(id); !ok {
		return fmt.Errorf("instance %q not found", id)
	}
	return d.RT.WithInstanceStopped(ctx, id, fn)
}

// StartInstance implements Instances.
func (d DockerInstances) StartInstance(ctx context.Context, id string) error {
	inst, ok := d.Host.Directory.Get(id)
	if !ok || inst.Remote != "" {
		return fmt.Errorf("instance %q not found", id)
	}
	if inst.Blocked != nil {
		return nil // not served while blocked
	}
	return d.RT.StartInstance(ctx, inst)
}

func (d DockerInstances) log() *slog.Logger {
	if d.Log != nil {
		return d.Log
	}
	return slog.Default()
}
