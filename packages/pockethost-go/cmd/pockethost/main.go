// Command pockethost is PocketHost's server binary, on PocketOne. The first argument picks the role:
//
//	pockethost edge serve [--config pocketbase.yaml] [--env-file .env]
//	pockethost edge check [--config pocketbase.yaml] [--env-file .env]
//	pockethost docker seed|update [--config pocketbase.yaml] [--env-file .env]
//	pockethost mothership serve|migrate|superuser|version|hooks export|versions ...   (mothership.go)
//
// An edge runs from pocketbase.yaml: a runtime provider (pocker or docker), the firewall, and the `pockethost` section
// (this edge, the mothership login); instances come from PocketHost's mothership mirror, the edge heartbeats and
// reports instance status, and every instance gets PocketHost's platform routes. Secrets live in the .env beside the
// config and never reach the instances.
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"

	"github.com/pockethost/pockethost/packages/pockethost-go/edge"
	"github.com/pockethost/pocketone/ext/config"
)

const usage = `usage:
  pockethost edge serve [--config pocketbase.yaml] [--env-file .env]
  pockethost edge check [--config pocketbase.yaml] [--env-file .env]
  pockethost docker seed|update [--config pocketbase.yaml] [--env-file .env]
  pockethost mothership serve|migrate|superuser|version|hooks export|versions ...   (see mothership.go)`

func main() {
	args := os.Args[1:]
	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, usage)
		os.Exit(2)
	}
	switch args[0] {
	case "docker":
		if err := dockerCmd(args[1:]); err != nil {
			fmt.Fprintln(os.Stderr, "pockethost:", err)
			os.Exit(1)
		}
		return
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
	}
	fmt.Fprintln(os.Stderr, usage)
	os.Exit(2)
}

// edgeFlags parses an edge command's --config and --env-file.
func edgeFlags(name string, args []string) (configPath, envPath string) {
	fs := flag.NewFlagSet(name, flag.ExitOnError)
	c := fs.String("config", "pocketbase.yaml", "the edge's pocketbase.yaml")
	e := fs.String("env-file", "", "secrets for $VAR references (default .env beside the config)")
	_ = fs.Parse(args)
	return *c, *e
}

// edgeServe runs the edge (`pockethost edge serve`).
func edgeServe(args []string) {
	if err := edgeServeConfig(edgeFlags("edge serve", args)); err != nil {
		slog.Error("pockethost: serve", "error", err)
		os.Exit(1)
	}
}

// check: read-only mapping report against the mothership (`pockethost edge check`).
func check(args []string) {
	configPath, envPath := edgeFlags("edge check", args)
	if _, err := config.Load(config.Options{ConfigPath: configPath, EnvPath: envPath}); err != nil {
		slog.Error("pockethost: config", "error", err)
		os.Exit(1)
	}
	ph, err := edge.Section.Require()
	if err != nil {
		slog.Error("pockethost: config", "error", err)
		os.Exit(1)
	}
	ecfg, err := edge.ConfigFromSection(ph)
	if err != nil {
		slog.Error("pockethost: config", "error", err)
		os.Exit(1)
	}
	rep, err := edge.Check(context.Background(), ecfg)
	if err != nil {
		slog.Error("pockethost: check", "error", err)
		os.Exit(1)
	}
	fmt.Println(rep)
}
