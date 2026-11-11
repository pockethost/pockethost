// Command pockethost-edge is PocketHost's edge: Pocker CE plus PocketHost's providers and platform features.
//
//	pockethost-edge serve [--env-file .env] [--config pocker.yaml] [--listen :8090] [--pbRoot DIR] [--instances FILE]
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
	"syscall"

	"ganigeorgiev.com/pocketbase/pocketbase/pocker"
	"github.com/pockethost/pocker/deploy"
	"github.com/pockethost/pocker/edge"
)

func main() {
	if len(os.Args) >= 2 && os.Args[1] == "check" {
		check(os.Args[2:])
		return
	}
	if len(os.Args) < 2 || os.Args[1] != "serve" {
		fmt.Fprintln(os.Stderr, "usage: pockethost-edge serve [--config pocker.yaml] [--listen ADDR] [--pbRoot DIR] [--instances FILE]")
		os.Exit(2)
	}
	fs := flag.NewFlagSet("serve", flag.ExitOnError)
	envFile := fs.String("env-file", "", "KEY=VALUE file (e.g. the edge's .env); already-set variables win")
	configPath := fs.String("config", "pocker.yaml", "Pocker config file (optional)")
	listen := fs.String("listen", "", "listen address (overrides config)")
	pbRoot := fs.String("pbRoot", "", "instance folders root (overrides config)")
	instances := fs.String("instances", "", "instances YAML file (overrides config)")
	_ = fs.Parse(os.Args[2:])

	if *envFile != "" {
		if err := edge.LoadEnvFile(*envFile); err != nil {
			slog.Error("pockethost-edge: env file", "error", err)
			os.Exit(1)
		}
	}

	cfg, err := pocker.LoadConfig(*configPath)
	if err != nil {
		slog.Error("pockethost-edge: config", "error", err)
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
	if os.Getenv("MOTHERSHIP_URL") != "" {
		ecfg, err := edge.ConfigFromEnv()
		if err != nil {
			slog.Error("pockethost-edge: mothership config", "error", err)
			os.Exit(1)
		}
		source := edge.NewSource(ecfg, slog.Default())
		stats := edge.NewStats()
		source.Heartbeat(ctx, stats) // first beat registers the edge before the mirror loads
		srv.Source = source
		srv.SetupApp = edge.Setup(ecfg)
		deployAPI := deploy.New(deploy.Options{
			Backend: source.DeployBackend(),
			Instances: func() deploy.Instances {
				if srv.Manager == nil {
					return nil
				}
				return srv.Manager
			},
			PBRoot:        cfg.PBRoot,
			DataRoot:      filepath.Join(filepath.Dir(filepath.Clean(cfg.PBRoot)), "deploys"), // DATA_ROOT/deploys, as on the Node edge
			PlatformPaths: edge.PlatformPaths,
		})
		srv.Wrap = func(h http.Handler) http.Handler { return edge.NodeCompat(stats.Middleware(deployAPI.Wrap(h))) }
		slog.Info("pockethost-edge: using the mothership", "url", ecfg.MothershipURL, "edge", ecfg.EdgeID, "region", ecfg.Region)
	}
	if err := srv.Run(ctx); err != nil {
		slog.Error("pockethost-edge: serve", "error", err)
		os.Exit(1)
	}
}

// check: read-only mapping report against the mothership (pockethost-edge check --env-file .env).
func check(args []string) {
	fs := flag.NewFlagSet("check", flag.ExitOnError)
	envFile := fs.String("env-file", "", "KEY=VALUE file (e.g. the edge's .env)")
	_ = fs.Parse(args)
	if *envFile != "" {
		if err := edge.LoadEnvFile(*envFile); err != nil {
			slog.Error("pockethost-edge: env file", "error", err)
			os.Exit(1)
		}
	}
	ecfg, err := edge.ConfigFromEnv()
	if err != nil {
		slog.Error("pockethost-edge: mothership config", "error", err)
		os.Exit(1)
	}
	rep, err := edge.Check(context.Background(), ecfg)
	if err != nil {
		slog.Error("pockethost-edge: check", "error", err)
		os.Exit(1)
	}
	fmt.Println(rep)
}
