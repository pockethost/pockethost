package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"sync/atomic"
	"syscall"

	"github.com/pockethost/pockethost/packages/pockethost-go/deploy"
	"github.com/pockethost/pockethost/packages/pockethost-go/edge"
	"github.com/pockethost/pocketone/ext/config"
	"github.com/pockethost/pocketone/ext/docker"
	ceedge "github.com/pockethost/pocketone/ext/edge"
	"github.com/pockethost/pocketone/ext/firewall"
	"github.com/pockethost/pocketone/ext/host"
	"github.com/pockethost/pocketone/ext/pages"
	"github.com/pockethost/pocketone/ext/pages/pockerplugin"
	"github.com/pockethost/pocketone/ext/pitr"
	"github.com/pockethost/pocketone/ext/pocker"
	"github.com/pockethost/pocketone/ext/servertiming"
	"gopkg.in/yaml.v3"
)

// hasProvider reports whether a config file is a pocketbase.yaml naming a runtime provider (`provider:`), as opposed
// to a legacy pocker.yaml.
func hasProvider(path string) bool {
	b, err := os.ReadFile(path)
	if err != nil {
		return false
	}
	var top map[string]any
	if yaml.Unmarshal(b, &top) != nil {
		return false
	}
	_, ok := top["provider"]
	return ok
}

// instancesBox holds the running edge.Instances (pocker's Manager or the docker adapter) once the host has one.
type instancesBox struct{ i edge.Instances }

// edgeServeConfig runs the edge from pocketbase.yaml: the `pockethost` section (edge id, mothership login), a
// runtime provider (pocker in-process or docker containers), listeners, firewall and fleet from their sections;
// secrets come from the .env beside it and never reach the instances.
func edgeServeConfig(configPath, envPath, vacuumCronFlag string) error {
	log := slog.Default()
	cfg, err := config.Load(config.Options{ConfigPath: configPath, EnvPath: envPath})
	if err != nil {
		return err
	}
	ph, err := edge.Section.Require()
	if err != nil {
		return err
	}
	ecfg, err := edge.ConfigFromSection(ph)
	if err != nil {
		return err
	}
	firewall.SectionAdjust = edge.FirewallDefaults

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	source := edge.NewSource(ecfg, log)
	stats := edge.NewStats()
	source.Heartbeat(ctx, stats) // first beat registers the edge before the mirror loads
	var edges ceedge.EdgeSource = source
	extra, err := ceedge.FromSection(log)
	if err != nil {
		return err
	}
	if extra != nil {
		edges = ceedge.MultiProvider{extra, source}
	}
	rc := edge.RouteConfig(log)
	rc.Edges = edges

	var running atomic.Pointer[instancesBox]
	current := func() edge.Instances {
		if b := running.Load(); b != nil {
			return b.i
		}
		return nil
	}
	provider, _ := config.Provider.Get()
	var root string
	switch provider {
	case "pocker":
		sc, _ := pocker.Section.Get()
		root = cfg.ResolvePath(sc.Root)
	case "docker":
		sc, _ := docker.Section.Get()
		root = cfg.ResolvePath(sc.Root)
	}
	host.RegisterProvider(&pocker.Provider{
		Plugins: []pocker.Plugin{
			pitr.New(pitr.Config{}),          // point-in-time restore for every instance
			pockerplugin.New(pages.Config{}), // PocketPages v1 when an instance has pb_pages
		},
		SetupApp: edge.Setup(ecfg),
		OnStart:  func(m *pocker.Manager) { running.Store(&instancesBox{m}) },
		Resolve:  cfg.ResolvePath,
	})
	var platformBinds []string
	if provider == "docker" {
		sc, _ := docker.Section.Get()
		home := sc.Home
		if home == "" {
			home = "/home/pockethost"
		}
		if platformBinds, err = edge.WriteInstanceApp(filepath.Join(filepath.Dir(root), "instance-app"), home); err != nil {
			return err
		}
	}
	if sc, _ := docker.Section.Get(); provider == "docker" && len(sc.Versions) > 0 {
		log.Warn("pockethost: docker.versions is ignored; the mothership lists the releases every docker edge serves")
	}
	// the mothership owns the releases list (docker_releases): every docker edge serves the same ones
	host.RegisterProvider(&docker.Provider{Container: edge.DockerContainer(platformBinds), Resolve: cfg.ResolvePath, Versions: source.DockerVersions()})

	h, err := host.FromConfig(host.Options{Source: source, Forward: ceedge.NewRouter(rc).Forward, Resolve: cfg.ResolvePath, Logger: log})
	if err != nil {
		return err
	}
	if rt, ok := h.Runtime.(*docker.Runtime); ok {
		running.Store(&instancesBox{edge.DockerInstances{RT: rt, Host: h, Log: log}})
	}
	var fw *firewall.Firewall
	for _, g := range h.Gates {
		if f, ok := g.(*firewall.Firewall); ok {
			fw = f
		}
	}
	if fw == nil {
		return errors.New("pockethost: the edge needs a firewall section (allowed peers, trusted proxies)")
	}
	deployAPI := deploy.New(deploy.Options{
		Backend: source.DeployBackend(),
		Instances: func() deploy.Instances {
			if i := current(); i != nil {
				return i
			}
			return nil
		},
		PBRoot:        root,
		DataRoot:      filepath.Join(filepath.Dir(filepath.Clean(root)), "deploys"), // DATA_ROOT/deploys, as on the Node edge
		PlatformPaths: edge.PlatformPaths,
		IsRemote:      source.IsRemote,
	})
	ready := func() bool { i := current(); return i != nil && i.Ready() } // LB health is 503 until instances load
	st := servertiming.New()
	h.Wrappers = append([]func(http.Handler) http.Handler{st.Wrap}, h.Wrappers...) // outermost: its header includes the edge's hops
	h.Wrappers = append(h.Wrappers, func(next http.Handler) http.Handler {
		return source.Front(fw, ready, edge.NodeCompat(stats.Middleware(deployAPI.Wrap(next))))
	})
	if ph.DisableWebhooks || edge.WebhooksDisabled() {
		log.Info("pockethost: instance webhooks disabled")
	} else {
		h.Background = append(h.Background, func(ctx context.Context) { source.NewScheduler(current).Run(ctx) })
	}
	vopts := edge.DefaultVacuumOptions()
	vopts.Cron = vacuumCronFlag
	if ph.VacuumCron != "" {
		vopts.Cron = ph.VacuumCron
	}
	h.Background = append(h.Background, func(ctx context.Context) { source.NewVacuumer(current, vopts).Run(ctx) })
	log.Info("pockethost: edge from pocketbase.yaml", "provider", provider, "edge", ecfg.EdgeID, "region", ecfg.Region, "mothership", ecfg.MothershipURL)
	return h.Run(ctx)
}
