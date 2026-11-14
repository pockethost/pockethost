package main

import (
	"fmt"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"github.com/pockethost/pockethost/packages/pockethost-go/edge"
	"github.com/pockethost/pocketone/ext/docker"
	"github.com/spf13/cobra"
)

// versionsCmd is `pockethost mothership versions list|update`: the releases every docker edge serves. update asks
// docker's discovery for the latest patch of each minor (upstream PocketBase from 0.23 on, and PocketOne), pinned with
// checksums, and records them; docker edges follow the list within 30 s and seed what they don't have.
func versionsCmd(app core.App) *cobra.Command {
	cmd := &cobra.Command{Use: "versions", Short: "The PocketBase/PocketOne releases every docker edge serves", SilenceUsage: true}
	cmd.AddCommand(&cobra.Command{
		Use:   "list",
		SilenceUsage: true,
		Short: "Prints the docker releases the mothership lists",
		RunE: func(c *cobra.Command, _ []string) error {
			rs, updated, err := edge.LoadDockerReleases(app)
			if err != nil {
				return err
			}
			for _, r := range rs {
				fmt.Fprintf(c.OutOrStdout(), "%-12s %s\n", r.Key(), assetPlatforms(r))
			}
			fmt.Fprintf(c.OutOrStdout(), "%d releases (updated %s)\n", len(rs), orNone(updated))
			return nil
		},
	})
	cmd.AddCommand(&cobra.Command{
		Use:   "update [minor ...]",
		SilenceUsage: true,
		Short: "Records the latest patch of every minor (or of the minors given, e.g. pb:0.36 p1:0.0)",
		RunE: func(c *cobra.Command, args []string) error {
			t0 := time.Now()
			prev, _, err := edge.LoadDockerReleases(app)
			if err != nil {
				return err
			}
			latest, err := docker.DefaultDiscovery().Latest(c.Context(), args)
			if err != nil {
				return err
			}
			if err := edge.SaveDockerReleases(app, latest); err != nil {
				return err
			}
			was := map[string]bool{}
			for _, r := range prev {
				was[r.Key()] = true
			}
			for _, r := range latest {
				mark := ""
				if !was[r.Key()] {
					mark = "  (new)"
				}
				fmt.Fprintf(c.OutOrStdout(), "%-12s %s%s\n", r.Key(), assetPlatforms(r), mark)
			}
			fmt.Fprintf(c.OutOrStdout(), "recorded %d releases in %s; docker edges follow within 30 s\n", len(latest), time.Since(t0).Round(time.Millisecond))
			return nil
		},
	})
	return cmd
}

func assetPlatforms(r docker.Release) string {
	out := ""
	for _, p := range []string{"linux_amd64", "linux_arm64"} {
		if _, ok := r.Assets[p]; ok {
			if out != "" {
				out += ","
			}
			out += p
		}
	}
	return out
}

func orNone(s string) string {
	if s == "" {
		return "never"
	}
	return s
}
