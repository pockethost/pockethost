// Command pockethost-edge is PocketHost's edge: Pocker CE plus PocketHost's providers and platform features.
//
//	pockethost-edge serve [--config pocker.yaml] [--listen :8090] [--pbRoot DIR] [--instances FILE]
//
// For now the instance source is CE's YAML file; the PocketHost mothership adapter replaces it next.
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"ganigeorgiev.com/pocketbase/pocketbase/pocker"
)

func main() {
	if len(os.Args) < 2 || os.Args[1] != "serve" {
		fmt.Fprintln(os.Stderr, "usage: pockethost-edge serve [--config pocker.yaml] [--listen ADDR] [--pbRoot DIR] [--instances FILE]")
		os.Exit(2)
	}
	fs := flag.NewFlagSet("serve", flag.ExitOnError)
	configPath := fs.String("config", "pocker.yaml", "Pocker config file (optional)")
	listen := fs.String("listen", "", "listen address (overrides config)")
	pbRoot := fs.String("pbRoot", "", "instance folders root (overrides config)")
	instances := fs.String("instances", "", "instances YAML file (overrides config)")
	_ = fs.Parse(os.Args[2:])

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
	if err := srv.Run(ctx); err != nil {
		slog.Error("pockethost-edge: serve", "error", err)
		os.Exit(1)
	}
}
