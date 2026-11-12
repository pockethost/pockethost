// Command pockethost is PocketHost's server binary, on PocketBase CE. The first argument picks the role:
//
//	pockethost edge serve [--env-file .env] [--config pocker.yaml] [--listen :8090] [--pbRoot DIR] [--instances FILE]
//	pockethost edge check [--env-file .env]
//	pockethost mothership serve|migrate|superuser|version|hooks export ...   (mothership.go)
//
// The edge is Pocker CE plus PocketHost's providers and platform features. `pockethost serve` / `pockethost check` are
// deprecated aliases for `pockethost edge serve` / `edge check`.
//
// With MOTHERSHIP_URL set (directly or in --env-file, same names as the Node edge), instances come from PocketHost's
// mothership mirror, the edge heartbeats and reports instance status, and every instance gets PocketHost's platform
// routes. Without it, instances come from CE's YAML file.
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"sync/atomic"
	"syscall"

	"github.com/pockethost/pocketbase/ext/firewall"
	"github.com/pockethost/pocketbase/ext/pages"
	"github.com/pockethost/pocketbase/ext/pages/pockerplugin"
	"github.com/pockethost/pocketbase/ext/pitr"
	"github.com/pockethost/pocketbase/ext/pocker"
	"github.com/pockethost/pocketbase/ext/servertiming"
	"github.com/pockethost/pockethost/packages/pockethost-go/deploy"
	"github.com/pockethost/pockethost/packages/pockethost-go/edge"
)

const usage = `usage:
  pockethost edge serve [--env-file .env] [--config pocker.yaml] [--listen ADDR] [--pbRoot DIR] [--instances FILE]
  pockethost edge check [--env-file .env]
  pockethost mothership serve|migrate|superuser|version|hooks export ...   (see mothership.go)`

func main() {
	args := os.Args[1:]
	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, usage)
		os.Exit(2)
	}
	switch args[0] {
	case "mothership":
		mothership(args[1:])
		return
	case "edge":
		if len(args) >= 2 {
			switch args[1] {
			case "serve":
				edgeServe(args[2:])
				return
			case "check":
				check(args[2:])
				return
			}
		}
	case "serve", "check":
		// Before 2026-11-12 the edge commands had no role prefix; existing systemd units still run `pockethost serve`.
		slog.Warn("pockethost: `pockethost " + args[0] + "` is deprecated; use `pockethost edge " + args[0] + "`")
		if args[0] == "serve" {
			edgeServe(args[1:])
		} else {
			check(args[1:])
		}
		return
	}
	fmt.Fprintln(os.Stderr, usage)
	os.Exit(2)
}

// edgeServe runs the edge: Pocker CE + PocketHost's providers and platform features (`pockethost edge serve`).
func edgeServe(args []string) {
	fs := flag.NewFlagSet("edge serve", flag.ExitOnError)
	envFile := fs.String("env-file", "", "KEY=VALUE file (e.g. the edge's .env); already-set variables win")
	configPath := fs.String("config", "pocker.yaml", "Pocker config file (optional)")
	listen := fs.String("listen", "", "listen address (overrides config)")
	pbRoot := fs.String("pbRoot", "", "instance folders root (overrides config)")
	instances := fs.String("instances", "", "instances YAML file (overrides config)")
	vacuumCron := fs.String("vacuum-cron", edge.DefaultVacuumOptions().Cron, `nightly vacuum schedule (UTC cron, "off" to disable)`)
	_ = fs.Parse(args)

	if *envFile != "" {
		if err := edge.LoadEnvFile(*envFile); err != nil {
			slog.Error("pockethost: env file", "error", err)
			os.Exit(1)
		}
	}

	cfg, err := pocker.LoadConfig(*configPath)
	if err != nil {
		slog.Error("pockethost: config", "error", err)
		os.Exit(1)
	}
	if *listen != "" {
		cfg.Listen = *listen
	}
	if *pbRoot != "" {
		cfg.PBRoot = *pbRoot
	}
	if *instances != "" {
		cfg.InstancesFile = *instances
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	srv := &pocker.Server{Config: cfg}
	fw := firewall.New()
	fw.Adjust = func(c *firewall.Config, _ **firewall.RateLimits) { edge.FirewallFromEnv(c) } // after pocker.yaml, like before
	srv.Plugins = []pocker.Plugin{servertiming.New(), fw}                                     // servertiming outermost: its header includes the edge's own hops
	srv.Plugins = append(srv.Plugins, pitr.New(pitr.Config{}))                                // point-in-time restore, on for every instance (pocker.yaml `pitr:`, instance plugins.pitr)
	srv.Plugins = append(srv.Plugins, pockerplugin.New(pages.Config{}))                       // PocketPages v1: serves an instance's pb_pages when it has one (instance plugins.pages.enabled: false turns it off)
	if os.Getenv("MOTHERSHIP_URL") != "" {
		ecfg, err := edge.ConfigFromEnv()
		if err != nil {
			slog.Error("pockethost: mothership config", "error", err)
			os.Exit(1)
		}
		source := edge.NewSource(ecfg, slog.Default())
		stats := edge.NewStats()
		source.Heartbeat(ctx, stats) // first beat registers the edge before the mirror loads
		srv.Source = source
		srv.SetupApp = edge.Setup(ecfg)
		srv.Forward = source.Forward
		var running atomic.Pointer[pocker.Manager]
		srv.OnStart = running.Store
		manager := running.Load
		deployAPI := deploy.New(deploy.Options{
			Backend: source.DeployBackend(),
			Instances: func() deploy.Instances {
				if m := manager(); m != nil {
					return m
				}
				return nil
			},
			PBRoot:        cfg.PBRoot,
			DataRoot:      filepath.Join(filepath.Dir(filepath.Clean(cfg.PBRoot)), "deploys"), // DATA_ROOT/deploys, as on the Node edge
			PlatformPaths: edge.PlatformPaths,
			IsRemote:      source.IsRemote,
		})
		ready := func() bool { m := manager(); return m != nil && m.Ready() } // LB health is 503 until instances load
		srv.Wrap = func(h http.Handler) http.Handler {
			return source.Front(fw, ready, edge.NodeCompat(stats.Middleware(deployAPI.Wrap(h))))
		}
		if edge.WebhooksDisabled() {
			slog.Info("pockethost: instance webhooks disabled (PH_DISABLE_INSTANCE_WEBHOOKS)")
		} else {
			go source.NewScheduler(manager).Run(ctx)
		}
		vopts := edge.DefaultVacuumOptions()
		vopts.Cron = *vacuumCron
		go source.NewVacuumer(manager, vopts).Run(ctx)
		slog.Info("pockethost: using the mothership", "url", ecfg.MothershipURL, "edge", ecfg.EdgeID, "region", ecfg.Region)
	}
	if err := srv.Run(ctx); err != nil {
		slog.Error("pockethost: serve", "error", err)
		os.Exit(1)
	}
}

// check: read-only mapping report against the mothership (pockethost edge check --env-file .env).
func check(args []string) {
	fs := flag.NewFlagSet("check", flag.ExitOnError)
	envFile := fs.String("env-file", "", "KEY=VALUE file (e.g. the edge's .env)")
	_ = fs.Parse(args)
	if *envFile != "" {
		if err := edge.LoadEnvFile(*envFile); err != nil {
			slog.Error("pockethost: env file", "error", err)
			os.Exit(1)
		}
	}
	ecfg, err := edge.ConfigFromEnv()
	if err != nil {
		slog.Error("pockethost: mothership config", "error", err)
		os.Exit(1)
	}
	rep, err := edge.Check(context.Background(), ecfg)
	if err != nil {
		slog.Error("pockethost: check", "error", err)
		os.Exit(1)
	}
	fmt.Println(rep)
}
