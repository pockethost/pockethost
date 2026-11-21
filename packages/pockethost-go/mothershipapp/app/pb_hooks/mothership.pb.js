
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
//#region src/lib/handlers/bulkmail/hooks.ts
routerAdd("GET", "/api/bulkmail/settings", (e) => require(`${__hooks}/mothership`).HandleBulkMailGetSettings(e), $apis.requireSuperuserAuth());
routerAdd("PATCH", "/api/bulkmail/settings", (e) => require(`${__hooks}/mothership`).HandleBulkMailSaveSettings(e), $apis.requireSuperuserAuth());
routerAdd("POST", "/api/bulkmail/audience/count", (e) => require(`${__hooks}/mothership`).HandleBulkMailCount(e), $apis.requireSuperuserAuth());
routerAdd("POST", "/api/bulkmail/campaigns/{id}/{action}", (e) => require(`${__hooks}/mothership`).HandleBulkMailCampaignAction(e), $apis.requireSuperuserAuth());
routerAdd("GET", "/api/bulkmail/unsubscribe", (e) => require(`${__hooks}/mothership`).HandleBulkMailUnsubscribePage(e));
routerAdd("POST", "/api/bulkmail/unsubscribe", (e) => require(`${__hooks}/mothership`).HandleBulkMailUnsubscribe(e));
routerAdd("POST", "/api/bulkmail/feedback/webhook", (e) => require(`${__hooks}/mothership`).HandleBulkMailWebhook(e));
cronAdd("bulkmail-sender", "* * * * *", () => {
	require(`${__hooks}/mothership`).runBulkMailSender();
});
onRecordAfterUpdateSuccess((e) => {
	e.next();
	require(`${__hooks}/mothership`).syncUserToSuppressions(e);
}, "users");
onRecordAfterCreateSuccess((e) => {
	e.next();
	require(`${__hooks}/mothership`).syncSuppressionToUser(e, true);
}, "_bulkmail_suppressions");
onRecordAfterUpdateSuccess((e) => {
	e.next();
	require(`${__hooks}/mothership`).syncSuppressionToUser(e, true);
}, "_bulkmail_suppressions");
onRecordAfterDeleteSuccess((e) => {
	e.next();
	require(`${__hooks}/mothership`).syncSuppressionToUser(e, false);
}, "_bulkmail_suppressions");
onRecordUpdateRequest((e) => {
	return require(`${__hooks}/mothership`).HandleBulkMailCampaignUpdateRequest(e);
}, "_bulkmail_campaigns");

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
* Instance endpoints are for the signed-in dashboard user. Each handler authenticates with `resolveInstanceCaller`
* (instance/lib/instanceCaller.ts).
*/
routerAdd("PUT", "/api/instance/{id}", (e) => {
	return require(`${__hooks}/mothership`).HandleInstanceUpdate(e);
});
routerAdd("POST", "/api/instance", (e) => {
	return require(`${__hooks}/mothership`).HandleInstanceCreate(e);
});
routerAdd("POST", "/api/instance/{id}/duplicate", (e) => {
	return require(`${__hooks}/mothership`).HandleInstanceDuplicate(e);
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
});
routerAdd("POST", "/api/claim/status", (e) => {
	return require(`${__hooks}/mothership`).HandleClaimStatus(e);
});
routerAdd("POST", "/api/claim/complete", (e) => {
	return require(`${__hooks}/mothership`).HandleClaimComplete(e);
});
routerAdd("POST", "/api/claim/attach", (e) => {
	return require(`${__hooks}/mothership`).HandleClaimAttach(e);
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
routerAdd("POST", "/api/loyalty/backfill", (e) => {
	return require(`${__hooks}/mothership`).HandleLoyaltyBackfill(e);
}, $apis.requireSuperuserAuth());
routerAdd("GET", "/api/loyalty/resume", (e) => {
	return require(`${__hooks}/mothership`).HandleLoyaltyResumePage(e);
});
routerAdd("POST", "/api/loyalty/resume", (e) => {
	return require(`${__hooks}/mothership`).HandleLoyaltyResume(e);
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
//#region src/lib/handlers/stripe/hooks.ts
routerAdd("POST", "/api/billing/checkout", (e) => {
	return require(`${__hooks}/mothership`).HandleBillingCheckout(e);
});
routerAdd("POST", "/api/billing/cancel", (e) => {
	return require(`${__hooks}/mothership`).HandleLemonSqueezyCancel(e);
}, $apis.requireAuth());
routerAdd("POST", "/api/stripe/webhook", (e) => {
	return require(`${__hooks}/mothership`).HandleStripeWebhook(e);
});

//#endregion
//#region src/lib/handlers/user/hooks.ts
routerAdd("GET", "/api/user/trusted-ips", (e) => {
	return require(`${__hooks}/mothership`).HandleUserTrustedIpsGet(e);
}, $apis.requireAuth());
routerAdd("PATCH", "/api/user/trusted-ips", (e) => {
	return require(`${__hooks}/mothership`).HandleUserTrustedIpsUpdate(e);
}, $apis.requireAuth());
/** Keep users.bonus_instances equal to the sum of the user's bonus_grants */
onRecordAfterCreateSuccess((e) => {
	require(`${__hooks}/mothership`).AfterChange_bonusGrant(e);
	e.next();
}, "bonus_grants");
onRecordAfterUpdateSuccess((e) => {
	require(`${__hooks}/mothership`).AfterChange_bonusGrant(e);
	e.next();
}, "bonus_grants");
onRecordAfterDeleteSuccess((e) => {
	require(`${__hooks}/mothership`).AfterChange_bonusGrant(e);
	e.next();
}, "bonus_grants");
/** Customers can't change their own bonus_instances */
onRecordUpdateRequest((e) => {
	require(`${__hooks}/mothership`).BeforeUpdateRequest_guardBonusInstances(e);
	e.next();
}, "users");

//#endregion
//#region src/lib/handlers/versions/hooks.ts
/** Return a list of available PocketBase versions */
routerAdd("GET", "/api/versions", (e) => {
	return require(`${__hooks}/mothership`).HandleVersionsRequest(e);
});

//#endregion