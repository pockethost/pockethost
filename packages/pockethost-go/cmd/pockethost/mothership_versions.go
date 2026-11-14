package main

import (
	"fmt"
	"strings"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"github.com/pockethost/pockethost/packages/pockethost-go/edge"
	"github.com/pockethost/pocketone/ext/docker"
	"github.com/spf13/cobra"
)

// versionsCmd is `pockethost mothership versions list|update`: the PocketBase versions PocketHost supports, kept in
// the pocketbase_versions setting. Only the mothership writes it; users pick from it and edges serve it.
func versionsCmd(app core.App) *cobra.Command {
	cmd := &cobra.Command{Use: "versions", Short: "The PocketBase and PocketOne versions PocketHost supports", SilenceUsage: true}
	cmd.AddCommand(&cobra.Command{
		Use:          "list",
		SilenceUsage: true,
		Short:        "Prints the versions list",
		RunE: func(c *cobra.Command, _ []string) error {
			vs, synced, err := edge.LoadVersions(app)
			if err != nil {
				return err
			}
			for _, v := range vs {
				fmt.Fprintf(c.OutOrStdout(), "%-12s %-10s %s\n", v.Range, v.Patch, assetPlatforms(v))
			}
			fmt.Fprintf(c.OutOrStdout(), "%d versions (updated %s)\n", len(vs), orNone(synced))
			return nil
		},
	})
	cmd.AddCommand(&cobra.Command{
		Use:          "update [minor ...]",
		SilenceUsage: true,
		Short:        "Records the latest patch of every minor (or of the minors given, e.g. pb:0.36 p1:0.0) from PocketBase and PocketOne",
		RunE: func(c *cobra.Command, args []string) error {
			t0 := time.Now()
			prev, _, err := edge.LoadVersions(app)
			if err != nil {
				return err
			}
			latest, err := docker.DefaultDiscovery().Latest(c.Context(), args)
			if err != nil {
				return err
			}
			next := edge.MergeVersions(prev, latest)
			if err := edge.SaveVersions(app, next); err != nil {
				return err
			}
			was := map[string]string{}
			for _, v := range prev {
				was[v.Range] = v.Patch
				if v.Pinned() {
					was[v.Range] += "+"
				}
			}
			for _, v := range next {
				mark := ""
				switch p, ok := was[v.Range]; {
				case !ok:
					mark = "  (new)"
				case strings.TrimSuffix(p, "+") != v.Patch:
					mark = "  (was " + strings.TrimSuffix(p, "+") + ")"
				case !strings.HasSuffix(p, "+") && v.Pinned():
					mark = "  (pinned)"
				}
				fmt.Fprintf(c.OutOrStdout(), "%-12s %-10s %s%s\n", v.Range, v.Patch, assetPlatforms(v), mark)
			}
			fmt.Fprintf(c.OutOrStdout(), "recorded %d versions in %s; edges follow within 30 s\n", len(next), time.Since(t0).Round(time.Millisecond))
			return nil
		},
	})
	return cmd
}

func assetPlatforms(v edge.Version) string {
	if !v.Pinned() {
		return "(not pinned)"
	}
	out := ""
	for _, p := range []string{"linux_amd64", "linux_arm64"} {
		if _, ok := v.Assets[p]; ok {
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
