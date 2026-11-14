package main

import (
	"context"
	"fmt"
	"log"
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
			prev, next, err := refreshVersions(c.Context(), app, args)
			if err != nil {
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

// versionsCron is when the serving mothership refreshes its versions list (hourly, as the Node edge's
// pocketbase-update did); it also refreshes once at boot.
const versionsCron = "17 * * * *"

// refreshVersions records the latest patch of every minor (or of the minors given) from PocketBase and PocketOne in
// the versions list. A discovery failure leaves the list as it was.
func refreshVersions(ctx context.Context, app core.App, minors []string) (prev, next []edge.Version, err error) {
	prev, _, err = edge.LoadVersions(app)
	if err != nil {
		return nil, nil, err
	}
	latest, err := docker.DefaultDiscovery().Latest(ctx, minors)
	if err != nil {
		return nil, nil, err
	}
	next = edge.MergeVersions(prev, latest)
	return prev, next, edge.SaveVersions(app, next)
}

// scheduleVersions keeps the serving mothership's versions list current by itself: once shortly after boot, then on
// versionsCron. Each run gets 5 minutes; failures are logged and the list stays as it was.
func scheduleVersions(app core.App) {
	run := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()
		t0 := time.Now()
		prev, next, err := refreshVersions(ctx, app, nil)
		if err != nil {
			log.Printf("versions: refresh failed; list unchanged: %v", err)
			return
		}
		log.Printf("versions: refreshed %d versions (was %d) in %s; changed: %v", len(next), len(prev), time.Since(t0).Round(time.Millisecond), changedVersions(prev, next))
	}
	app.Cron().MustAdd("pocketbase_versions", versionsCron, run)
	go func() {
		time.Sleep(30 * time.Second) // let the boot reconnect burst settle first
		run()
	}()
}

// changedVersions lists the ranges whose patch or pinning changed.
func changedVersions(prev, next []edge.Version) []string {
	was := map[string]edge.Version{}
	for _, v := range prev {
		was[v.Range] = v
	}
	var out []string
	for _, v := range next {
		p, ok := was[v.Range]
		if !ok || p.Patch != v.Patch || p.Pinned() != v.Pinned() {
			out = append(out, v.Range+"="+v.Patch)
		}
	}
	return out
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
