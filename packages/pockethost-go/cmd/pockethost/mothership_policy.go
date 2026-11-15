package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"strings"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"github.com/pockethost/pockethost/packages/pockethost-go/policy"
	"github.com/spf13/cobra"
)

// policyCron is when the serving mothership logs a dry run of its policies (hourly; the Node sweep still acts).
const policyCron = "17 * * * *"

// schedulePolicy logs what the over-limit policy would do, hourly. Dry run only: sfo-2's Node sweep
// (`edge over-limit`) still acts until its decisions and these match.
func schedulePolicy(app core.App) {
	app.Cron().MustAdd("policy_dry_run", policyCron, func() {
		var b strings.Builder
		if err := runPolicy(context.Background(), app, &b, false); err != nil {
			log.Printf("policy: failed: %v", err)
			return
		}
		log.Printf("policy (dry run): %s", strings.ReplaceAll(strings.TrimSpace(b.String()), "\n", "; "))
	})
}

func runPolicy(ctx context.Context, app core.App, w io.Writer, verbose bool) error {
	t0 := time.Now()
	accounts, err := policy.LoadAccounts(app)
	if err != nil {
		return err
	}
	p := policy.NewOverLimit(policy.DefaultGrace, time.Now)
	rep := p.Evaluate(ctx, accounts)
	fmt.Fprintf(w, "over-limit: %d accounts in %s\n", len(accounts), time.Since(t0).Round(time.Millisecond))
	fmt.Fprintln(w, rep.Summary(p.Rules))
	if !verbose {
		return nil
	}
	for _, d := range rep.Decisions {
		line := fmt.Sprintf("  %-20s %s  %s", d.Rule, d.Key, d.Why)
		if d.Action == policy.ActWarn || d.Action == policy.ActWait || d.Action == policy.ActPowerOff {
			var ids []string
			for _, i := range d.Subject.Excess() {
				ids = append(ids, i.ID)
			}
			line += "  excess " + strings.Join(ids, ",")
		}
		fmt.Fprintln(w, line)
	}
	for _, v := range rep.Vetoed {
		fmt.Fprintf(w, "  %-20s %s  vetoed: %s\n", v.Rule, v.Key, v.Veto)
	}
	for _, f := range rep.Failed {
		fmt.Fprintf(w, "  %-20s %s  failed: %v\n", f.Rule, f.Key, f.Err)
	}
	return nil
}

// policyCmd is `pockethost mothership policy [-v]`: what the mothership's policies would do now. Dry run only.
func policyCmd(app core.App) *cobra.Command {
	var verbose bool
	cmd := &cobra.Command{
		Use:          "policy",
		Short:        "Shows what the over-limit policy would do now (dry run: nothing is changed)",
		SilenceUsage: true,
		RunE: func(c *cobra.Command, _ []string) error {
			return runPolicy(c.Context(), app, c.OutOrStdout(), verbose)
		},
	}
	cmd.Flags().BoolVarP(&verbose, "verbose", "v", false, "list each decision with its reasons")
	return cmd
}
