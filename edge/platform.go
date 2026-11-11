package edge

import (
	"crypto/subtle"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"github.com/pockerbase/pocketbase/ext/pocker"
)

// Setup adds PocketHost's platform features to each instance, in Go (pocker.Server.SetupApp). They replace the hooks
// and migrations the Node edge bind-mounted into every container:
//
//   - GET /api/ph/backup with `x-ph-backup-token` creates `@auto_pb_backup_ph_<stamp>.zip` and prunes to the backup
//     settings' cronMaxKeep (PocketHost's scheduled-backup webhooks call it);
//   - PocketBase's placeholder app name / URL / sender are replaced with the instance's own, once.
//
// The owner's login sync is Pocker's superuser sync (Instance.Superusers), set by the mapping.
func Setup(cfg Config) func(inst pocker.Instance, app core.App) error {
	return func(inst pocker.Instance, app core.App) error {
		applyAppDefaults(cfg, inst, app)

		token := inst.Private["backup_token"]
		app.OnServe().BindFunc(func(e *core.ServeEvent) error {
			e.Router.GET("/api/ph/backup", func(re *core.RequestEvent) error {
				got := re.Request.Header.Get("x-ph-backup-token")
				if token == "" || subtle.ConstantTimeCompare([]byte(got), []byte(token)) != 1 {
					return re.JSON(http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
				}
				const prefix = "@auto_pb_backup_"
				name := prefix + "ph_" + time.Now().UTC().Format("20060102150405") + ".zip"
				if err := re.App.CreateBackup(re.Request.Context(), name); err != nil {
					// most often another backup or restore is already running
					return re.JSON(http.StatusConflict, map[string]string{"error": fmt.Sprintf("Backup failed: %v", err)})
				}
				removed := 0
				if keep := re.App.Settings().Backups.CronMaxKeep; keep > 0 {
					fsys, err := re.App.NewBackupsFilesystem()
					if err == nil {
						defer fsys.Close()
						files, _ := fsys.List(prefix)
						sort.Slice(files, func(i, j int) bool { return files[i].ModTime.After(files[j].ModTime) })
						for _, f := range files[min(keep, len(files)):] {
							if fsys.Delete(f.Key) == nil {
								removed++
							}
						}
					}
				}
				return re.JSON(http.StatusOK, map[string]any{"ok": true, "name": name, "removed": removed})
			})
			return e.Next()
		})
		return nil
	}
}

// applyAppDefaults replaces PocketBase's placeholder settings with the instance's own (the Node edge's injected
// migrations did this); settings a customer already changed are left alone.
func applyAppDefaults(cfg Config, inst pocker.Instance, app core.App) {
	sub := inst.Private["subdomain"]
	if sub == "" {
		return
	}
	s := app.Settings()
	changed := false
	fix := func(field *string, placeholder, value string) {
		if value != "" && *field == placeholder {
			*field = value
			changed = true
		}
	}
	fix(&s.Meta.AppName, "Acme", sub)
	fix(&s.Meta.AppURL, "http://localhost:8090", cfg.HTTPProtocol+"//"+sub+"."+cfg.ApexDomain)
	fix(&s.Meta.SenderAddress, "support@example.com", sub+"@"+strings.TrimPrefix(cfg.ApexDomain, "."))
	if changed {
		if err := app.Save(s); err != nil {
			app.Logger().Warn("pockethost: app defaults not saved", "error", err)
		}
	}
}
