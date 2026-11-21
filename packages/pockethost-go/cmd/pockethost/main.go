// Command pockethost is PocketHost's binary: the whole PocketOne binary (serve, link, login, deploy, dev, clone, pull,
// logs, upgrade, ...; pocketone.dev/examples/pocketone/binary) plus PocketHost's server commands, which most users
// never run:
//
//	pockethost edge serve [--config pocketone.yaml] [--env-file .env]
//	pockethost docker seed|update [--config pocketone.yaml] [--env-file .env]   (replaces PocketOne's docker command)
//	pockethost mothership serve|migrate|superuser|version|hooks export|versions ...   (mothership.go)
//	pockethost version   (also --version, -v: this release, and the PocketOne and PocketBase it's built on)
//
// An edge runs from pocketone.yaml: a runtime provider (pocker or docker), the firewall, and the `pockethost` section
// (this edge, the mothership login); instances come from PocketHost's mothership, looked up as requests name them, the edge heartbeats and
// reports instance status, and every instance gets PocketHost's platform routes. Secrets live in the .env beside the
// config and never reach the instances.
package main

import (
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"os"

	"github.com/spf13/cobra"
	"pocketone.dev/examples/pocketone/binary"
	"pocketone.dev/ext/upgrade"
)

func main() {
	binary.Main(binary.Options{
		Version: versionString(),
		// `pockethost upgrade`: PocketHost's own releases
		Upgrade: upgrade.Config{Owner: "pockethost", Repo: "pockethost", ArchivePrefix: "pockethost", ArchiveExecutable: "pockethost"},
		Commands: []*cobra.Command{
			serverCommand("edge", "Runs a PocketHost edge (operators): edge serve [--config pocketone.yaml] [--env-file .env]",
				func(args []string) error {
					if len(args) == 0 || args[0] != "serve" {
						return errors.New("usage: pockethost edge serve [--config pocketone.yaml] [--env-file .env]")
					}
					edgeServe(args[1:])
					return nil
				}),
			serverCommand("docker", "Release binaries a docker edge serves (operators): docker seed|update [--config pocketone.yaml]",
				dockerCmd),
			serverCommand("mothership", "Runs PocketHost's mothership (operators): mothership serve|migrate|superuser|version|hooks export|versions",
				func(args []string) error { mothership(args); return nil }),
			{
				Use:   "version",
				Short: "Prints this release, and the PocketOne and PocketBase it's built on",
				Args:  cobra.NoArgs,
				Run:   func(*cobra.Command, []string) { fmt.Println(versionString()) },
			},
		},
	})
}

// serverCommand is one of PocketHost's server commands: run gets every argument after the name and parses its own.
func serverCommand(name, short string, run func(args []string) error) *cobra.Command {
	return &cobra.Command{
		Use:                name,
		Short:              short,
		DisableFlagParsing: true,
		SilenceUsage:       true,
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(args) == 1 && (args[0] == "-h" || args[0] == "--help") {
				fmt.Println(short)
				return nil
			}
			if err := run(args); err != nil {
				fmt.Fprintln(os.Stderr, "pockethost:", err)
				os.Exit(1)
			}
			return nil
		},
	}
}

// edgeFlags parses an edge command's --config and --env-file.
func edgeFlags(name string, args []string) (configPath, envPath string) {
	fs := flag.NewFlagSet(name, flag.ExitOnError)
	c := fs.String("config", "pocketone.yaml", "the edge's pocketone.yaml")
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
