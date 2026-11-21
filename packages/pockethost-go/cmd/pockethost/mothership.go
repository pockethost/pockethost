package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"runtime/debug"
	"testing/fstest"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase"
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/plugins/migratecmd"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/hook"
	"github.com/pockethost/pockethost/packages/pockethost-go/mothershipapp"
	"pocketone.dev/ext/bundle"
	"pocketone.dev/ext/config"
	"pocketone.dev/ext/jsvm"
)

// mothership runs PocketHost's mothership: one trusted PocketOne app whose JS hooks, JS migrations and admin
// add-on are embedded in this binary (mothershipapp). It replaces the Node launcher + stock PocketBase
// (`pnpm prod:cli mothership serve`); data, schema and hook behavior are unchanged.
//
//	pockethost mothership serve --http 0.0.0.0:8090 --dir /root/.pockethost/data/mothership/pb_data
//	pockethost mothership migrate up|down ... | superuser ...   (PocketBase's own commands)
//	pockethost mothership version
//	pockethost mothership hooks export <empty dir>
//
// The hooks read the same environment variables as before (LS_*, DISCORD_*, MOTHERSHIP_CLOUDFLARE_*, APP_URL,
// TEST_EMAIL) from the process environment.
//
// pocketone.yaml (./pocketone.yaml, else next to the binary, or --config) sets the JS engine's limits in
// app.js_limits; without it the mothership's own defaults below apply.
func mothership(args []string) {
	if len(args) >= 1 && (args[0] == "version" || args[0] == "--version") {
		fmt.Println(mothershipVersion())
		return
	}
	if len(args) >= 2 && args[0] == "hooks" && args[1] == "export" {
		if len(args) != 3 {
			fmt.Fprintln(os.Stderr, "usage: pockethost mothership hooks export <empty dir>")
			os.Exit(2)
		}
		n, err := mothershipapp.Export(args[2])
		if err != nil {
			fmt.Fprintln(os.Stderr, "export:", err)
			os.Exit(1)
		}
		fmt.Printf("wrote %d files to %s (%s)\n", n, args[2], mothershipVersion())
		return
	}

	// PocketBase parses os.Args itself: hand it everything after "mothership".
	os.Args = append([]string{os.Args[0]}, args...)
	cfgOpts := config.FromArgs(os.Args[1:])
	if _, err := config.Load(cfgOpts); err != nil {
		log.Fatal(err)
	}
	appCfg, _ := config.App.Get()

	app := pocketbase.New()
	app.RootCmd.Use = "pockethost mothership"

	var hooksPool int
	var cfgPath, envPath string
	app.RootCmd.PersistentFlags().IntVar(&hooksPool, "hooksPool", 15, "ignored: the mothership's JS runs on one QuickJS VM")
	app.RootCmd.PersistentFlags().StringVar(&cfgPath, "config", "", "the config file (default ./pocketone.yaml, else next to the executable)")
	app.RootCmd.PersistentFlags().StringVar(&envPath, "env-file", "", "secrets for $VAR references in the config file (default .env beside it)")
	app.RootCmd.ParseFlags(os.Args[1:])

	// Embedded mode: hooks, migrations and require(`${__hooks}/...`) come only from the binary.
	hooks := mothershipapp.Hooks()
	if firstCommand(os.Args[1:]) == "migrate" {
		// The hooks' boot code queries mothership tables (instances, ...), which a fresh database doesn't have yet,
		// and it runs before migrations; `migrate` only needs the migrations (as `pocketbase migrate` without
		// --hooksDir did).
		hooks = fstest.MapFS{}
	}
	jsvm.MustRegister(app, jsvm.Config{
		Extensions: []any{bundle.Hooks(hooks), bundle.Migrations(mothershipapp.Migrations())},
		VM:         mothershipJSLimits(appCfg.JSLimits),
	})

	// `migrate up/down/history-sync` as before. Automigrate stays off: collection edits in the admin must not write
	// migration files (there is no app folder to write them to any more).
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		TemplateLang: migratecmd.TemplateLangJS,
		Automigrate:  false,
	})

	registerTokens(app)      // API tokens (pbt_...) for deploys, checked by the edges
	registerOwnerFields(app) // what instances get from their owners, so edges never read users

	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			// the `live` add-on, formerly registered from JS with $os.dirFS(`${__hooks}/../pb_admin_ext/live`)
			e.UIExtensions = append(e.UIExtensions, core.UIExtension{Name: "live", FS: mothershipapp.AdminLive()})
			// The Node launcher passed --publicDir pointing at a folder that doesn't exist; keep the same catch-all
			// static route over an empty FS so unknown paths answer exactly as before.
			if !e.Router.HasRoute(http.MethodGet, "/{path...}") {
				e.Router.GET("/{path...}", apis.Static(fstest.MapFS{}, true))
			}
			syncOwnerFieldsAtServe(e.App) // before the server listens: the backfill reaches edges through their dump
			registerMirror(e)             // GET /api/mirror, the edges' dump, in Go
			// the mothership keeps its own versions list (pocketbase_versions); nothing else writes it
			scheduleVersions(e.App)
			scheduleUsage(e.App)  // owners' disk use from the edges' instance_stats
			schedulePolicy(e.App) // a dry run of the over-limit policy, logged hourly
			return e.Next()
		},
		Priority: 999,
	})

	app.RootCmd.AddCommand(versionsCmd(app)) // the versions list, by hand
	app.RootCmd.AddCommand(usageCmd(app))    // the owners' disk sum, by hand
	app.RootCmd.AddCommand(policyCmd(app))   // what the policies would do, by hand

	log.Printf("pockethost mothership %s", mothershipVersion())
	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

// firstCommand is the first argument that isn't a flag (flags given as --name value are skipped too).
func firstCommand(args []string) string {
	for i := 0; i < len(args); i++ {
		a := args[i]
		if len(a) > 1 && a[0] == '-' {
			if !containsEq(a) && i+1 < len(args) && len(args[i+1]) > 0 && args[i+1][0] != '-' && takesValue(a) {
				i++
			}
			continue
		}
		return a
	}
	return ""
}

func containsEq(s string) bool {
	for _, c := range s {
		if c == '=' {
			return true
		}
	}
	return false
}

// takesValue lists the persistent flags that take a separate value (`--dir x`); booleans don't.
func takesValue(flag string) bool {
	switch flag {
	case "--dir", "--encryptionEnv", "--queryTimeout", "--hooksPool", "--config", "--env-file":
		return true
	}
	return false
}

// The mothership's own JS is trusted and runs whole-table jobs on one VM (the hostname sweep, the usage sums).
// QuickJS's tenant defaults (64 MiB, 5 s, 30 s) stop those, so the mothership starts far above them, and requests may
// wait up to 5 min for the VM while one runs. The edges' /api/mirror dump left JS for Go (mothership_mirror.go): at
// ~8.5 s of VM time each, edges reconnecting together queued past the default 30 s wait.
const (
	mothershipJSMemory   = 1 << 30
	mothershipJSTaskTime = 5 * time.Minute
	mothershipJSTaskWall = 30 * time.Minute
	mothershipJSWait     = 5 * time.Minute
)

// mothershipJSLimits is pocketone.yaml's app.js_limits, each key left out taking the mothership's default.
func mothershipJSLimits(l config.JSLimits) jsvm.VMConfig {
	vm := jsvm.VMConfig{MemoryLimit: int64(l.Memory), TaskBudget: l.TaskTime, TaskWall: l.TaskWall}
	if vm.MemoryLimit == 0 {
		vm.MemoryLimit = mothershipJSMemory
	}
	if vm.TaskBudget == 0 {
		vm.TaskBudget = mothershipJSTaskTime
	}
	if vm.TaskWall == 0 {
		vm.TaskWall = mothershipJSTaskWall
	}
	vm.WaitTimeout = mothershipJSWait
	return vm
}

// mothershipVersion is the git commit this binary was built from and a hash of the embedded app.
func mothershipVersion() string {
	commit, dirty := "unknown", ""
	if bi, ok := debug.ReadBuildInfo(); ok {
		for _, s := range bi.Settings {
			switch s.Key {
			case "vcs.revision":
				if len(s.Value) >= 8 {
					commit = s.Value[:8]
				}
			case "vcs.modified":
				if s.Value == "true" {
					dirty = "+dirty"
				}
			}
		}
	}
	h, err := mothershipapp.Hash()
	if err != nil {
		h = "error:" + err.Error()
	}
	return fmt.Sprintf("commit %s%s, app %s", commit, dirty, h)
}
