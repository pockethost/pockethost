
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
routerAdd("POST", "/api/instances/runtime/reset", (c) => {
	return require(`${__hooks}/mothership`).HandleInstancesRuntimeReset(c);
}, $apis.requireAdminAuth());
/** Default autoVacuum to true (PocketBase bool zero-default is false) */
onModelBeforeCreate((e) => {
	return require(`${__hooks}/mothership`).BeforeCreate_autoVacuum(e);
}, "instances");
/** Validate instance version */
onModelBeforeUpdate((e) => {
	return require(`${__hooks}/mothership`).BeforeUpdate_version(e);
}, "instances");
/** Validate cname */
onModelBeforeUpdate((e) => {
	return require(`${__hooks}/mothership`).BeforeUpdate_cname(e);
}, "instances");
/** Notify discord on instance create */
onAfterBootstrap((e) => {});
/** Reset instance status to idle on start */
onAfterBootstrap((e) => {
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
routerAdd("POST", "/api/mirror", (c) => {
	return require(`${__hooks}/mothership`).HandleMirrorSync(c);
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
//#region src/lib/handlers/sshKeys/hooks.ts
onRecordBeforeCreateRequest((e) => {
	return require(`${__hooks}/mothership`).BeforeCreate_ssh_keys(e);
}, "ssh_keys");
onRecordBeforeUpdateRequest((e) => {
	return require(`${__hooks}/mothership`).BeforeUpdate_ssh_keys(e);
}, "ssh_keys");

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