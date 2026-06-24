
//#region src/lib/handlers/adminPlugins/hooks.ts
$app.onServe().bindFunc((e) => {
	e.uiExtensions.push({
		name: "live",
		fs: $os.dirFS(`${__hooks}/../pb_admin_ext/live`)
	});
	e.next();
});
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
//#region src/lib/handlers/edge/hooks.ts
routerAdd("POST", "/api/edge/heartbeat", (e) => {
	return require(`${__hooks}/mothership`).HandleEdgeHeartbeat(e);
}, $apis.requireSuperuserAuth());
cronAdd("edges-stale", "* * * * *", () => {
	require(`${__hooks}/mothership`).markStaleEdges();
});

//#endregion
//#region src/lib/handlers/instance/hooks.ts
routerAdd("PUT", "/api/instance/{id}", (e) => {
	return require(`${__hooks}/mothership`).HandleInstanceUpdate(e);
}, $apis.requireAuth());
routerAdd("POST", "/api/instance", (e) => {
	return require(`${__hooks}/mothership`).HandleInstanceCreate(e);
}, $apis.requireAuth());
routerAdd("DELETE", "/api/instance/{id}", (e) => {
	return require(`${__hooks}/mothership`).HandleInstanceDelete(e);
}, $apis.requireAuth());
routerAdd("POST", "/api/instances/runtime/reset", (e) => {
	return require(`${__hooks}/mothership`).HandleInstancesRuntimeReset(e);
}, $apis.requireSuperuserAuth());
/** Default autoVacuum to true (PocketBase bool zero-default is false) */
onRecordCreate((e) => {
	require(`${__hooks}/mothership`).BeforeCreate_autoVacuum(e);
	e.next();
}, "instances");
/** Validate instance version */
onRecordUpdate((e) => {
	require(`${__hooks}/mothership`).BeforeUpdate_version(e);
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
onRecordUpdate((e) => {
	const record = e.record;
	if (!record) return;
	const previous = readTrustedIpsFromRecord(record.original());
	const current = readTrustedIpsFromRecord(record);
	if (JSON.stringify(previous) === JSON.stringify(current)) return;
	require(`${__hooks}/mothership`).validateUserTrustedIps(record);
}, "users");
function readTrustedIpsFromRecord(record) {
	try {
		return record.get(`trusted_ips`);
	} catch {
		return null;
	}
}

//#endregion
//#region src/lib/handlers/versions/hooks.ts
/** Return a list of available PocketBase versions */
routerAdd("GET", "/api/versions", (e) => {
	return require(`${__hooks}/mothership`).HandleVersionsRequest(e);
});

//#endregion