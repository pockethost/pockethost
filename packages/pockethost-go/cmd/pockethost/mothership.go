package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"runtime/debug"
	"testing/fstest"

	"ganigeorgiev.com/pocketbase/pocketbase"
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/plugins/jsvm"
	"ganigeorgiev.com/pocketbase/pocketbase/plugins/migratecmd"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/hook"
	"github.com/pockethost/pocketone/ext/jsembed"
	"github.com/pockethost/pockethost/packages/pockethost-go/mothershipapp"
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
	app := pocketbase.New()
	app.RootCmd.Use = "pockethost mothership"

	var hooksPool int
	app.RootCmd.PersistentFlags().IntVar(&hooksPool, "hooksPool", 15, "prewarmed JS runtimes for the hooks")
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
		HooksPoolSize: hooksPool,
		Extensions:    []jsvm.Extension{jsembed.Hooks(hooks), jsembed.Migrations(mothershipapp.Migrations())},
	})

	// `migrate up/down/history-sync` as before. Automigrate stays off: collection edits in the admin must not write
	// migration files (there is no app folder to write them to any more).
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		TemplateLang: migratecmd.TemplateLangJS,
		Automigrate:  false,
	})

	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			// the `live` add-on, formerly registered from JS with $os.dirFS(`${__hooks}/../pb_admin_ext/live`)
			e.UIExtensions = append(e.UIExtensions, core.UIExtension{Name: "live", FS: mothershipapp.AdminLive()})
			// The Node launcher passed --publicDir pointing at a folder that doesn't exist; keep the same catch-all
			// static route over an empty FS so unknown paths answer exactly as before.
			if !e.Router.HasRoute(http.MethodGet, "/{path...}") {
				e.Router.GET("/{path...}", apis.Static(fstest.MapFS{}, true))
			}
			return e.Next()
		},
		Priority: 999,
	})

	app.RootCmd.AddCommand(versionsCmd(app)) // the releases every docker edge serves

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
	case "--dir", "--encryptionEnv", "--queryTimeout", "--hooksPool":
		return true
	}
	return false
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
