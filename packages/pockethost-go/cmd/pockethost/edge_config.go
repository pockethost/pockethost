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

	"github.com/pockethost/pockethost/packages/pockethost-go/edge"
	"pocketone.dev/ext/config"
	cachev1 "pocketone.dev/ext/contracts/cache/v1"
	deployv1 "pocketone.dev/ext/contracts/deploy/v1"
	fsv1 "pocketone.dev/ext/contracts/instance/fs/v1"
	tokensv1 "pocketone.dev/ext/contracts/instance/tokens/v1"
	remotev1 "pocketone.dev/ext/contracts/remote/v1"
	"pocketone.dev/ext/deploy"
	"pocketone.dev/ext/docker"
	ceedge "pocketone.dev/ext/edge"
	"pocketone.dev/ext/extkit"
	"pocketone.dev/ext/firewall"
	"pocketone.dev/ext/multisite"
	"pocketone.dev/ext/pocker"
	"pocketone.dev/ext/servertiming"
	"pocketone.dev/ext/standard"
	"pocketone.dev/ext/stats"
)

// instancesBox holds the running edge.Instances (pocker's Manager or the docker adapter) once the host has one.
type instancesBox struct{ i edge.Instances }

// edgeServeConfig runs the edge from pocketone.yaml: the `pockethost` section (edge id, mothership login), the
// `multisite` section (this is a host), one runtime (docker when the `docker` section is there, else pocker
// in-process), listeners, firewall and fleet from their sections; secrets come from the .env beside it and never reach
// the instances.
func edgeServeConfig(configPath, envPath string) error {
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
	edgeStats := edge.NewStats()
	source.Heartbeat(ctx, edgeStats) // first beat registers the edge before the mirror loads
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
	provider := "pocker" // an edge runs one runtime: docker when its section is there
	if _, on := docker.Section.Get(); on {
		provider = "docker"
	}
	poweredBy := "" // docker: the instance's own server names itself (PocketOne says "PocketOne")
	if provider == "pocker" {
		poweredBy = edge.PoweredBy
	}
	var root string
	switch provider {
	case "pocker":
		sc, _ := pocker.Section.Get()
		root = cfg.ResolvePath(sc.Root)
	case "docker":
		sc, _ := docker.Section.Get()
		root = cfg.ResolvePath(sc.Root)
	}
	std := standard.New()
	pp := &pocker.Provider{
		// every instance gets PocketOne's standard extensions: tokens with OAuth sign-in, MCP, PocketPages, PITR,
		// settings and the rest (the host's own deploy/v1 and remote/v1 answer for them, see Host below)
		Standard: std,
		SetupApp: edge.Setup(ecfg),
		OnStart:  func(m *pocker.Manager) { running.Store(&instancesBox{m}) },
		OnEvent:  source.InstanceEvent, // instance status back to the mothership
		Resolve:  cfg.ResolvePath,
	}
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
		log.Warn("pockethost: docker.versions is ignored; the mothership's versions list says what every edge serves")
	}
	// the mothership owns the versions list (pocketbase_versions): every edge serves the same ones
	// container output goes to each instance's logs/exec.log, which the dashboard's log view reads
	dp := &docker.Provider{Container: edge.DockerContainer(platformBinds, ecfg.BackupTokenSecret), OnLog: edge.DockerLog(root), Resolve: cfg.ResolvePath, Versions: source.Versions()}
	if provider == "docker" && ph.LegacyReleases { // sfo-2 until Feb 6, 2027 (edge/legacy.go)
		sc, _ := docker.Section.Get()
		dp.Versions = edge.LegacyVersions(dp.Versions, &docker.Binaries{Root: cfg.ResolvePath(sc.Binaries)})
		dp.Container = edge.LegacyContainer(dp.Container)
		dp.MinUpstream = edge.LegacyFloor
		log.Info("pockethost: legacy releases on (PocketBase <0.23 from the binary cache)")
	}
	deployBackend := source.DeployBackend()
	dp.RemoteAuth = deployBackend.ContractAuth // remote/v1 for docker instances: the owner's PocketHost token, as for deploys

	// host extensions, in order: servertiming first (http.wrap/v1, outermost: its header includes the edge's hops),
	// then the one runtime this edge runs (runtime/v1); the firewall links itself (gate/v1)
	exts := []multisite.Extension{servertiming.New(),
		// the host's own cache/v1 (the standard set's store, shared with pocker's instances): the lazy mirror keeps
		// its answers there
		multisite.Provides("cache", func(s *extkit.Scope) { cachev1.Contract.ProvideIn(s, std.Cache.Host(s)) }),
		// instance.source/v1 and instance.lookup/v1: each hostname is asked of the mothership the first time a
		// request names it, then followed on one stream (PocketOne's ext/mothership client)
		source.Lazy,
	}
	if provider == "docker" {
		exts = append(exts, dp)
	} else {
		exts = append(exts, pp)
	}
	h, err := multisite.FromConfig(multisite.Options{Forward: ceedge.NewRouter(rc).Forward, Resolve: cfg.ResolvePath, Logger: log, Extensions: exts})
	if err != nil {
		return err
	}
	// an instance's own API tokens (its superusers') work on its deploy/v1 and remote/v1 too, where the runtime can
	// check them (pocker; docker's stock images can't be asked): `pocketone login` and `clone` sign in to the instance
	deployBackend.AcceptInstanceTokens(func() tokensv1.Tokens {
		t, _ := tokensv1.Contract.In(h.Scope)
		return t
	})
	if rt, ok := h.Runtime.(*docker.Runtime); ok {
		running.Store(&instancesBox{edge.DockerInstances{RT: rt, Host: h, Log: log}})
	}
	// PocketOne's contracts for every instance this edge runs, so `pocketone remote ...` and `pocketone deploy`
	// work against PocketHost: deploy/v1 is PocketOne's deploy API (ext/deploy) on the files the runtime provides
	// (instance.fs/v1, on the host scope); remote/v1 is docker's on docker edges (status, restart, logs), and pocker's
	// Manager here. Both take the owner's PocketHost token or login.
	files := func() fsv1.Files {
		f, _ := fsv1.Contract.In(h.Scope)
		return f
	}
	deployAPI := deploy.New(deploy.Options{
		Backend:       deployBackend,
		Files:         files,
		PlatformPaths: edge.PlatformPaths,
		Logger:        log,
	})
	prev := h.Scope.Registering("pockethost")
	deployv1.Contract.ProvideForInstances(h.Scope, func(string) http.Handler { return deployAPI })
	h.InstanceRoutes = append(h.InstanceRoutes, func(next http.Handler) http.Handler {
		return extkit.HostRoutes(h.Scope, deployv1.Contract, multisite.InstanceID, next)
	})
	if provider == "pocker" {
		remotev1.Contract.ProvideForInstances(h.Scope, edge.PockerRemote(func() *pocker.Manager {
			if b := running.Load(); b != nil {
				m, _ := b.i.(*pocker.Manager)
				return m
			}
			return nil
		}, h.Scope))
		h.InstanceRoutes = append(h.InstanceRoutes, func(next http.Handler) http.Handler {
			return remotev1.W.HostHandler(h.Scope, multisite.InstanceID, deployBackend.ContractAuth, next)
		})
	}
	h.Scope.Registering(prev)
	var fw *firewall.Firewall
	for _, g := range h.Gates {
		if f, ok := g.(*firewall.Firewall); ok {
			fw = f
		}
	}
	if fw == nil {
		return errors.New("pockethost: the edge needs a firewall section (allowed peers, trusted proxies)")
	}
	ready := func() bool { i := current(); return i != nil && i.Ready() } // LB health is 503 until instances load
	h.Wrappers = append(h.Wrappers, func(next http.Handler) http.Handler {
		return source.Front(fw, ready, poweredBy, edge.NodeCompat(edgeStats.Middleware(deployBackend.DashboardLogs(files, source.IsRemote)(next))))
	})
	if ph.DisableWebhooks {
		log.Info("pockethost: instance webhooks disabled")
	} else {
		h.Background = append(h.Background, func(ctx context.Context) { source.NewScheduler(current).Run(ctx) })
	}
	vopts := edge.DefaultVacuumOptions()
	if ph.VacuumCron != "" {
		vopts.Cron = ph.VacuumCron
	}
	vopts.DiscordURL = ph.DiscordHealthURL
	h.Background = append(h.Background, func(ctx context.Context) { source.NewVacuumer(current, vopts).Run(ctx) })
	h.Background = append(h.Background, func(ctx context.Context) { source.NewDuplicator(current).Run(ctx) })
	// instance data: disk used and last request served, written to the mothership's instance_stats (ext/lifecycle)
	lc := &stats.Lifecycle{Directory: h.Directory, Folder: func(i multisite.Instance) string {
		if i.Dir != "" {
			return cfg.ResolvePath(i.Dir)
		}
		return filepath.Join(root, i.ID)
	}, Sink: source.InstanceStats(), Logger: log}
	h.Gates = append(h.Gates, lc)
	h.Background = append(h.Background, lc.Run)
	log.Info("pockethost: edge from pocketone.yaml", "provider", provider, "edge", ecfg.EdgeID, "region", ecfg.Region, "mothership", ecfg.MothershipURL)
	return h.Run(ctx)
}
