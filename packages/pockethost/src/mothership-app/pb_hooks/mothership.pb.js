
//#region src/lib/handlers/instance/hooks.ts
routerAdd("PUT", "/api/instance/:id", (c) => {
	return require(`${__hooks}/mothership`).HandleInstanceUpdate(c);
}, $apis.requireRecordAuth());
routerAdd("POST", "/api/instance", (c) => {
	return require(`${__hooks}/mothership`).HandleInstanceCreate(c);
}, $apis.requireRecordAuth());
routerAdd("DELETE", "/api/instance/:id", (c) => {
	return require(`${__hooks}/mothership`).HandleInstanceDelete(c);
}, $apis.requireRecordAuth());
routerAdd("GET", "/api/instance/resolve", (c) => {
	return require(`${__hooks}/mothership`).HandleInstanceResolve(c);
}, $apis.requireAdminAuth());
/** Validate instance version */
onModelBeforeCreate((e) => {
	return require(`${__hooks}/mothership`).HandleInstanceVersionValidation(e);
}, "instances");
onModelAfterCreate((e) => {}, "instances");
onAfterBootstrap((e) => {});
onAfterBootstrap((e) => {});
/** Reset instance status to idle on start */
onAfterBootstrap((e) => {
	return require(`${__hooks}/mothership`).HandleInstancesResetIdle(e);
});
/** Migrate existing cnames to domains table */
onAfterBootstrap((e) => {
	return require(`${__hooks}/mothership`).HandleMigrateCnamesToDomains(e);
});
/** Validate instance version */
onModelBeforeUpdate((e) => {
	return require(`${__hooks}/mothership`).HandleInstanceBeforeUpdate(e);
}, "instances");

//#endregion
//#region src/lib/handlers/lemon/hooks.ts
routerAdd("POST", "/api/ls", (c) => {
	return require(`${__hooks}/mothership`).HandleLemonSqueezySale(c);
});

//#endregion
//#region src/lib/handlers/mail/hooks.ts
routerAdd("POST", "/api/mail", (c) => {
	return require(`${__hooks}/mothership`).HandleMailSend(c);
}, $apis.requireAdminAuth());

//#endregion
//#region src/lib/handlers/meta/hooks.ts
onAfterBootstrap((e) => {
	return require(`${__hooks}/mothership`).HandleMetaUpdateAtBoot(e);
});

//#endregion
//#region src/lib/handlers/mirror/hooks.ts
routerAdd("GET", "/api/mirror", (c) => {
	return require(`${__hooks}/mothership`).HandleMirrorData(c);
}, $apis.gzip(), $apis.requireAdminAuth());

//#endregion
//#region src/lib/handlers/notify/hooks.ts
routerAdd(`GET`, `api/process_single_notification`, (c) => {
	return require(`${__hooks}/mothership`).HandleProcessSingleNotification(c);
});
onModelAfterCreate((e) => {
	return require(`${__hooks}/mothership`).HandleProcessNotification(e);
}, `notifications`);
onModelBeforeUpdate((e) => {
	return require(`${__hooks}/mothership`).HandleUserWelcomeMessage(e);
}, "users");

//#endregion
//#region src/lib/handlers/outpost/hooks.ts
routerAdd("GET", "/api/unsubscribe", (c) => {
	return require(`${__hooks}/mothership`).HandleOutpostUnsubscribe(c);
});

//#endregion
//#region src/lib/handlers/signup/hooks.ts
routerAdd("GET", "/api/signup", (c) => {
	return require(`${__hooks}/mothership`).HandleSignupCheck(c);
});
routerAdd("POST", "/api/signup", (c) => {
	return require(`${__hooks}/mothership`).HandleSignupConfirm(c);
});

//#endregion
//#region src/lib/handlers/sns/hooks.ts
routerAdd("POST", "/api/sns", (c) => {
	return require(`${__hooks}/mothership`).HandleSesError(c);
});

//#endregion
//#region src/lib/handlers/stats/hooks.ts
routerAdd("GET", "/api/stats", (c) => {
	return require(`${__hooks}/mothership`).HandleStatsRequest(c);
});

//#endregion
//#region src/lib/handlers/user/hooks.ts
routerAdd("GET", "/api/userToken/:id", (c) => {
	return require(`${__hooks}/mothership`).HandleUserTokenRequest(c);
}, $apis.requireAdminAuth());

//#endregion
//#region src/lib/handlers/versions/hooks.ts
/** Return a list of available PocketBase versions */
routerAdd("GET", "/api/versions", (c) => {
	return require(`${__hooks}/mothership`).HandleVersionsRequest(c);
});

//#endregion