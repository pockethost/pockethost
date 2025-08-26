
//#region src/lib/handlers/instance/hooks.ts
routerAdd("PUT", "/api/instance/{id}", (c) => {
	return require(`${__hooks}/mothership`).HandleInstanceUpdate(c);
}, $apis.requireAuth());
routerAdd("POST", "/api/instance", (c) => {
	return require(`${__hooks}/mothership`).HandleInstanceCreate(c);
}, $apis.requireAuth());
routerAdd("DELETE", "/api/instance/{id}", (c) => {
	return require(`${__hooks}/mothership`).HandleInstanceDelete(c);
}, $apis.requireAuth());
routerAdd("GET", "/api/instance/resolve", (c) => {
	return require(`${__hooks}/mothership`).HandleInstanceResolve(c);
}, $apis.requireSuperuserAuth());
/** Validate instance version */
onRecordUpdate((e) => {
	return require(`${__hooks}/mothership`).BeforeUpdate_version(e);
}, "instances");
/** Validate cname */
onRecordUpdate((e) => {
	return require(`${__hooks}/mothership`).BeforeUpdate_cname(e);
}, "instances");
/** Notify discord on instance create */
onBootstrap((e) => {});
onBootstrap((e) => {});
/** Reset instance status to idle on start */
onBootstrap((e) => {
	return require(`${__hooks}/mothership`).HandleInstancesResetIdle(e);
});

//#endregion
//#region src/lib/handlers/lemon/hooks.ts
routerAdd("POST", "/api/ls", (c) => {
	return require(`${__hooks}/mothership`).HandleLemonSqueezySale(c);
});

//#endregion
//#region src/lib/handlers/mail/hooks.ts
routerAdd("POST", "/api/mail", (c) => {
	return require(`${__hooks}/mothership`).HandleMailSend(c);
}, $apis.requireSuperuserAuth());

//#endregion
//#region src/lib/handlers/meta/hooks.ts
onBootstrap((e) => {
	e.next();
	return require(`${__hooks}/mothership`).HandleMetaUpdateAtBoot(e);
});

//#endregion
//#region src/lib/handlers/mirror/hooks.ts
routerAdd("GET", "/api/mirror", (c) => {
	return require(`${__hooks}/mothership`).HandleMirrorData(c);
}, $apis.gzip(), $apis.requireSuperuserAuth());

//#endregion
//#region src/lib/handlers/notify/hooks.ts
routerAdd(`GET`, `api/process_single_notification`, (c) => {
	return require(`${__hooks}/mothership`).HandleProcessSingleNotification(c);
});
onRecordAfterCreateSuccess((e) => {
	return require(`${__hooks}/mothership`).HandleProcessNotification(e);
}, `notifications`);
onRecordUpdate((e) => {
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
routerAdd("GET", "/api/userToken/{id}", (c) => {
	return require(`${__hooks}/mothership`).HandleUserTokenRequest(c);
}, $apis.requireSuperuserAuth());

//#endregion
//#region src/lib/handlers/versions/hooks.ts
/** Return a list of available PocketBase versions */
routerAdd("GET", "/api/versions", (c) => {
	return require(`${__hooks}/mothership`).HandleVersionsRequest(c);
});

//#endregion