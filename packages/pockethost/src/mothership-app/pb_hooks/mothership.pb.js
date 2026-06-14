
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
onModelBeforeCreate((e) => {
	return require(`${__hooks}/mothership`).BeforeCreate_autoVacuum(e);
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
onRecordBeforeCreateRequest((e) => {
	return require(`${__hooks}/mothership`).BeforeCreate_ssh_keys(e);
}, "ssh_keys");
onRecordBeforeUpdateRequest((e) => {
	return require(`${__hooks}/mothership`).BeforeUpdate_ssh_keys(e);
}, "ssh_keys");

//#endregion
//#region src/lib/handlers/stats/hooks.ts
routerAdd("GET", "/api/stats", (e) => {
	return require(`${__hooks}/mothership`).HandleStatsRequest(e);
});

//#endregion
//#region src/lib/handlers/user/hooks.ts
routerAdd("GET", "/api/userToken/{id}", (e) => {
	return require(`${__hooks}/mothership`).HandleUserTokenRequest(e);
}, $apis.requireSuperuserAuth());

//#endregion
//#region src/lib/handlers/versions/hooks.ts
/** Return a list of available PocketBase versions */
routerAdd("GET", "/api/versions", (e) => {
	return require(`${__hooks}/mothership`).HandleVersionsRequest(e);
});

//#endregion