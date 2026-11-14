package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"

	"github.com/pockethost/pocketone/ext/config"
	"github.com/pockethost/pocketone/ext/docker"
)

// dockerCmd is `pockethost docker seed|update --config pocketbase.yaml`: the release binaries a docker edge serves
// (docker.versions). update finds the latest patch of each minor, records and downloads it; seed downloads what is
// listed but not cached, e.g. before switching an edge to docker.
func dockerCmd(args []string) error {
	if len(args) == 0 || (args[0] != "seed" && args[0] != "update") {
		return errors.New("usage: pockethost docker seed|update [--config pocketbase.yaml] [--env-file .env]")
	}
	fs := flag.NewFlagSet("docker "+args[0], flag.ExitOnError)
	configPath := fs.String("config", "pocketbase.yaml", "the edge's pocketbase.yaml")
	envFile := fs.String("env-file", "", "secrets for $VAR references (default .env beside the config)")
	_ = fs.Parse(args[1:])
	cfg, err := config.Load(config.Options{ConfigPath: *configPath, EnvPath: *envFile})
	if err != nil {
		return err
	}
	sc, found := docker.Section.Get()
	if !found || sc.Binaries == "" {
		return fmt.Errorf("%s has no docker section with binaries", *configPath)
	}
	b := &docker.Binaries{Root: cfg.ResolvePath(sc.Binaries)}
	ctx := context.Background()
	if args[0] == "update" {
		return docker.RunUpdate(ctx, os.Stdout, docker.DefaultDiscovery(), b, sc.Versions)
	}
	return docker.RunSeed(ctx, os.Stdout, docker.YAMLVersions{Tracked: sc.Versions, Root: b.Root}, b)
}
