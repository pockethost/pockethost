
//#region src/lib/handlers/adminPlugins/hooks.ts
onBootstrap((e) => {
	e.next();
	require(`${__hooks}/mothership`).initLiveViewStatsAtBoot();
});
routerAdd("POST", "/api/admin/live/platform/refresh", (e) => {
	return require(`${__hooks}/mothership`).HandleLivePlatformRefresh(e);
}, $apis.requireSuperuserAuth());
cronAdd("live-view-stats", "* * * * *", () => {
	const mothership = require(`${__hooks}/mothership`);
	mothership.handleLiveViewStatsCron();
	mothership.handleLivePlatformStatsCron();
});
onRealtimeSubscribeRequest((e) => {
	const mothership = require(`${__hooks}/mothership`);
	const platformTopic = mothership.LIVE_PLATFORM_TOPIC;
	const viewStatsTopic = mothership.LIVE_VIEW_STATS_TOPIC;
	for (const sub of e.subscriptions) if ((sub === platformTopic || sub === viewStatsTopic) && !e.hasSuperuserAuth()) throw new ForbiddenError("Superuser required for live platform stats");
	e.next();
	for (const sub of e.subscriptions) {
		if (sub === platformTopic) mothership.sendLivePlatformStatsToClient(e.client);
		if (sub === viewStatsTopic) mothership.sendLiveViewStatsToClient(e.client);
	}
});
onRecordAfterCreateSuccess((e) => {
	e.next();
	require(`${__hooks}/mothership`).handleLivePlatformInstanceCreate(e);
}, "instances");
onRecordAfterUpdateSuccess((e) => {
	e.next();
	require(`${__hooks}/mothership`).handleLivePlatformInstanceUpdate(e);
}, "instances");
onRecordAfterDeleteSuccess((e) => {
	e.next();
	require(`${__hooks}/mothership`).handleLivePlatformInstanceDelete(e);
}, "instances");
onRecordAfterCreateSuccess((e) => {
	e.next();
	require(`${__hooks}/mothership`).handleLivePlatformUserCreate(e);
}, "users");
onRecordAfterUpdateSuccess((e) => {
	e.next();
	require(`${__hooks}/mothership`).handleLivePlatformUserUpdate(e);
}, "users");
onRecordAfterDeleteSuccess((e) => {
	e.next();
	require(`${__hooks}/mothership`).handleLivePlatformUserDelete(e);
}, "users");

//#endregion
//#region src/lib/handlers/apiTokens/hooks.ts
/**
* Personal access tokens. The mothership never turns a PAT into `e.auth`, so `$apis.requireAuth()` routes and
* collection rules stay JWT-only: a PAT cannot create tokens, manage SSH keys, or mint a JWT. PATs are checked only by
* the explicit routes below and by edge services through /api/pat/verify.
*/
routerAdd("POST", "/api/tokens", (e) => {
	return require(`${__hooks}/mothership`).HandleApiTokenCreate(e);
}, $apis.requireAuth("users"));
routerAdd("PATCH", "/api/tokens/{id}", (e) => {
	return require(`${__hooks}/mothership`).HandleApiTokenUpdate(e);
}, $apis.requireAuth("users"));
routerAdd("POST", "/api/pat/verify", (e) => {
	return require(`${__hooks}/mothership`).HandlePatVerify(e);
}, $apis.requireSuperuserAuth());
routerAdd("GET", "/api/pat/whoami", (e) => {
	return require(`${__hooks}/mothership`).HandlePatWhoami(e);
});
routerAdd("GET", "/api/pat/instances", (e) => {
	return require(`${__hooks}/mothership`).HandlePatInstances(e);
});

//#endregion
//#region src/lib/handlers/cloudflare/hooks.ts
routerAdd("POST", "/api/cloudflare/hostnames/sweep", (e) => {
	return require(`${__hooks}/mothership`).HandleCustomHostnamesSweep(e);
}, $apis.requireSuperuserAuth());
routerAdd("POST", "/api/cloudflare/hostnames/register/{id}", (e) => {
	return require(`${__hooks}/mothership`).HandleCustomHostnameRegister(e);
}, $apis.requireSuperuserAuth());
/** Daily at 04:17 UTC. Dry run (log only) unless MOTHERSHIP_CLOUDFLARE_SWEEP_APPLY is set. */
cronAdd("cloudflare-hostnames", "17 4 * * *", () => {
	require(`${__hooks}/mothership`).cronSweepCustomHostnames();
});

//#endregion
//#region src/lib/handlers/downloads/hooks.ts
routerAdd("GET", "/_ph/archive/{id}", (e) => {
	return require(`${__hooks}/mothership`).HandleArchiveDownload(e);
});
routerAdd("GET", "/_ph/backup/{id}/{zip}", (e) => {
	return require(`${__hooks}/mothership`).HandleBackupDownload(e);
});

//#endregion
//#region src/lib/handlers/edge/hooks.ts
routerAdd("POST", "/api/edge/heartbeat", (e) => {
	return require(`${__hooks}/mothership`).HandleEdgeHeartbeat(e);
}, $apis.requireSuperuserAuth());
cronAdd("edges-stale", "* * * * *", () => {
	require(`${__hooks}/mothership`).markStaleEdges();
});

//#endregion
//#region src/lib/handlers/instance/hooks.ts
/**
* Instance endpoints accept a dashboard session (JWT) or a personal access token, so they don't use
* `$apis.requireAuth()`. Each handler authenticates with `resolveInstanceCaller` (instance/lib/instanceCaller.ts).
*/
routerAdd("PUT", "/api/instance/{id}", (e) => {
	return require(`${__hooks}/mothership`).HandleInstanceUpdate(e);
});
routerAdd("POST", "/api/instance", (e) => {
	return require(`${__hooks}/mothership`).HandleInstanceCreate(e);
});
routerAdd("DELETE", "/api/instance/{id}", (e) => {
	return require(`${__hooks}/mothership`).HandleInstanceDelete(e);
});
routerAdd("POST", "/api/instances/runtime/reset", (e) => {
	return require(`${__hooks}/mothership`).HandleInstancesRuntimeReset(e);
}, $apis.requireSuperuserAuth());
/** Default autoVacuum to true (PocketBase bool zero-default is false) */
onRecordCreate((e) => {
	require(`${__hooks}/mothership`).BeforeCreate_autoVacuum(e);
	e.next();
}, "instances");
/** New instances must use a selectable (0.23+) version */
onRecordCreate((e) => {
	require(`${__hooks}/mothership`).BeforeCreate_version(e);
	e.next();
}, "instances");
/** Validate instance version */
onRecordUpdate((e) => {
	require(`${__hooks}/mothership`).BeforeUpdate_version(e);
	e.next();
}, "instances");
/** Only superusers move an instance to another edge (its region is the edge's region) */
onRecordUpdateRequest((e) => {
	require(`${__hooks}/mothership`).BeforeUpdateRequest_edge(e);
	e.next();
}, "instances");
/** Validate cname */
onRecordUpdate((e) => {
	require(`${__hooks}/mothership`).BeforeUpdate_cname(e);
	e.next();
}, "instances");
/** Notify discord on instance create */
onBootstrap((e) => {
	e.next();
});
/** Reset instance status to idle on start */
onBootstrap((e) => {
	e.next();
	return require(`${__hooks}/mothership`).HandleInstancesResetIdle(e);
});

//#endregion
//#region src/lib/handlers/lemon/hooks.ts
routerAdd("POST", "/api/ls/checkout", (e) => {
	return require(`${__hooks}/mothership`).HandleLemonSqueezyCheckout(e);
}, $apis.requireAuth());
routerAdd("POST", "/api/ls/cancel", (e) => {
	return require(`${__hooks}/mothership`).HandleLemonSqueezyCancel(e);
}, $apis.requireAuth());
routerAdd("POST", "/api/ls", (e) => {
	return require(`${__hooks}/mothership`).HandleLemonSqueezySale(e);
});
routerAdd("POST", "/api/ls/reconcile", (e) => {
	return require(`${__hooks}/mothership`).HandleLemonSqueezyReconcile(e);
}, $apis.requireSuperuserAuth());

//#endregion
//#region src/lib/handlers/mail/hooks.ts
routerAdd("POST", "/api/mail", (e) => {
	return require(`${__hooks}/mothership`).HandleMailSend(e);
}, $apis.requireSuperuserAuth());

//#endregion
//#region src/lib/handlers/meta/hooks.ts
onBootstrap((e) => {
	e.next();
	require(`${__hooks}/mothership`).HandleMetaUpdateAtBoot(e);
});

//#endregion
//#region src/lib/handlers/mirror/hooks.ts
routerAdd("GET", "/api/mirror", (e) => {
	return require(`${__hooks}/mothership`).HandleMirrorData(e);
}, $apis.gzip(), $apis.requireSuperuserAuth());
routerAdd("POST", "/api/mirror", (e) => {
	return require(`${__hooks}/mothership`).HandleMirrorSync(e);
}, $apis.gzip(), $apis.requireSuperuserAuth());

//#endregion
//#region src/lib/handlers/notify/hooks.ts
routerAdd(`GET`, `api/process_single_notification`, (e) => {
	return require(`${__hooks}/mothership`).HandleProcessSingleNotification(e);
});
onRecordAfterCreateSuccess((e) => {
	e.next();
	require(`${__hooks}/mothership`).HandleProcessNotification(e);
}, `notifications`);
onRecordUpdate((e) => {
	e.next();
	require(`${__hooks}/mothership`).HandleUserWelcomeMessage(e);
}, "users");

//#endregion
//#region src/lib/handlers/outpost/hooks.ts
routerAdd("GET", "/api/unsubscribe", (e) => {
	return require(`${__hooks}/mothership`).HandleOutpostUnsubscribe(e);
});

//#endregion
//#region src/lib/handlers/signup/hooks.ts
routerAdd("GET", "/api/signup", (e) => {
	return require(`${__hooks}/mothership`).HandleSignupCheck(e);
});
routerAdd("POST", "/api/signup", (e) => {
	return require(`${__hooks}/mothership`).HandleSignupConfirm(e);
});

//#endregion
//#region src/lib/handlers/sns/hooks.ts
routerAdd("POST", "/api/sns", (e) => {
	return require(`${__hooks}/mothership`).HandleSesError(e);
});

//#endregion
//#region src/lib/handlers/sshKeys/hooks.ts
onRecordCreateRequest((e) => {
	require(`${__hooks}/mothership`).BeforeCreate_ssh_keys(e);
	e.next();
}, "ssh_keys");
onRecordUpdateRequest((e) => {
	require(`${__hooks}/mothership`).BeforeUpdate_ssh_keys(e);
	e.next();
}, "ssh_keys");

//#endregion
//#region src/lib/handlers/stats/hooks.ts
routerAdd("GET", "/stats.json", (e) => {
	return require(`${__hooks}/mothership`).HandleStatsRequest(e);
});
onBootstrap((e) => {
	e.next();
	require(`${__hooks}/mothership`).HandleStatsRefreshAtBoot(e);
});
cronAdd("public-stats", "0 * * * *", () => {
	require(`${__hooks}/mothership`).refreshPublicStats();
});

//#endregion
//#region src/lib/handlers/user/hooks.ts
routerAdd("GET", "/api/userToken/{id}", (e) => {
	return require(`${__hooks}/mothership`).HandleUserTokenRequest(e);
}, $apis.requireSuperuserAuth());
routerAdd("GET", "/api/user/trusted-ips", (e) => {
	return require(`${__hooks}/mothership`).HandleUserTrustedIpsGet(e);
}, $apis.requireAuth());
routerAdd("PATCH", "/api/user/trusted-ips", (e) => {
	return require(`${__hooks}/mothership`).HandleUserTrustedIpsUpdate(e);
}, $apis.requireAuth());

//#endregion
//#region src/lib/handlers/versions/hooks.ts
/** Return a list of available PocketBase versions */
routerAdd("GET", "/api/versions", (e) => {
	return require(`${__hooks}/mothership`).HandleVersionsRequest(e);
});

//#endregion