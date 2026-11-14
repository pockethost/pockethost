package main

import (
	"fmt"
	"log"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"github.com/pockethost/pockethost/packages/pockethost-go/edge"
	"github.com/spf13/cobra"
)

// usageCron is when the serving mothership sums its owners' disk use (daily, after the edges' measurements).
const usageCron = "41 5 * * *"

// scheduleUsage sums each owner's disk use from the edges' instance_stats into users.volume_storage_used, daily.
func scheduleUsage(app core.App) {
	app.Cron().MustAdd("disk_usage", usageCron, func() {
		t0 := time.Now()
		s, err := edge.SumUsage(app, true)
		if err != nil {
			log.Printf("usage: failed: %v", err)
			return
		}
		log.Printf("usage: %s in %s", usageLine(s), time.Since(t0).Round(time.Millisecond))
	})
}

func usageLine(s edge.UsageSummary) string {
	return fmt.Sprintf("%d of %d instances measured (%d bytes); %d of %d users updated, %d skipped (an instance not measured yet), %d failed",
		s.Measured, s.Instances, s.TotalBytes, s.Updated, s.Users, s.Skipped, s.Failed)
}

// usageCmd is `pockethost mothership usage [--apply]`: the daily per-owner disk sum, by hand (a dry run by default).
func usageCmd(app core.App) *cobra.Command {
	var apply bool
	cmd := &cobra.Command{
		Use:          "usage",
		Short:        "Sums each owner's disk use from the edges' instance_stats into users.volume_storage_used",
		SilenceUsage: true,
		RunE: func(c *cobra.Command, _ []string) error {
			s, err := edge.SumUsage(app, apply)
			if err != nil {
				return err
			}
			mode := "dry run"
			if apply {
				mode = "applied"
			}
			fmt.Fprintf(c.OutOrStdout(), "%s: %s\n", mode, usageLine(s))
			return nil
		},
	}
	cmd.Flags().BoolVar(&apply, "apply", false, "write the totals (default: count what would change)")
	return cmd
}
