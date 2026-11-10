Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

//#region src/lib/util/appStoreJson.ts
/** JSON round-trip for $app.store() — Goja objects must not cross goroutines (see PB #7737). */
const parseAppStoreJson = (raw) => {
	if (raw == null || raw === "") return null;
	if (typeof raw !== "string") return null;
	return JSON.parse(raw);
};
const getAppStoreJson = (key) => {
	return parseAppStoreJson($app.store().get(key));
};
const setAppStoreJson = (key, value) => {
	$app.store().set(key, JSON.stringify(value));
};
const updateAppStoreJson = (key, updater) => {
	$app.store().setFunc(key, (raw) => {
		const next = updater(parseAppStoreJson(raw));
		return JSON.stringify(next);
	});
};

//#endregion
//#region src/lib/handlers/adminPlugins/viewStats.ts
const LIVE_VIEW_STATS_TOPIC = "mothership/live/view-stats";
const LIVE_VIEW_STATS_STORE_KEY = "phLiveViewStats";
const fieldInt = (record, name) => {
	const value = record.get(name);
	if (value == null || value === "") return 0;
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
};
const readStatsViewRecord = (record) => {
	return {
		totalUsers: fieldInt(record, "total_users"),
		totalLegacySubscribers: fieldInt(record, "total_legacy_subscribers"),
		totalFreeSubscribers: fieldInt(record, "total_free_subscribers"),
		totalProSubscribers: fieldInt(record, "total_pro_subscribers"),
		totalProMonthSubscribers: fieldInt(record, "total_pro_month_subscribers"),
		totalProYearSubscribers: fieldInt(record, "total_pro_year_subscribers"),
		totalFounderSubscribers: fieldInt(record, "total_founder_subscribers"),
		totalFlounderSubscribers: fieldInt(record, "total_flounder_subscribers"),
		newUsersLastHour: fieldInt(record, "new_users_last_hour"),
		newUsersLast24Hours: fieldInt(record, "new_users_last_24_hours"),
		newUsersLast7Days: fieldInt(record, "new_users_last_7_days"),
		newUsersLast30Days: fieldInt(record, "new_users_last_30_days"),
		totalInstances: fieldInt(record, "total_instances"),
		totalInstancesLastHour: fieldInt(record, "total_instances_last_hour"),
		totalInstancesLast24Hours: fieldInt(record, "total_instances_last_24_hours"),
		totalInstancesLast7Days: fieldInt(record, "total_instances_last_7_days"),
		totalInstancesLast30Days: fieldInt(record, "total_instances_last_30_days"),
		newInstancesLastHour: fieldInt(record, "new_instances_last_hour"),
		newInstancesLast24Hours: fieldInt(record, "new_instances_last_24_hours"),
		newInstancesLast7Days: fieldInt(record, "new_instances_last_7_days"),
		newInstancesLast30Days: fieldInt(record, "new_instances_last_30_days"),
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
};
const getLiveViewStats = () => {
	return getAppStoreJson(LIVE_VIEW_STATS_STORE_KEY);
};
const refreshLiveViewStats = () => {
	const record = $app.findFirstRecordByFilter("stats", "id != \"\"");
	if (!record) return null;
	const stats = readStatsViewRecord(record);
	setAppStoreJson(LIVE_VIEW_STATS_STORE_KEY, stats);
	return stats;
};
const broadcastLiveViewStats = () => {
	const stats = getLiveViewStats();
	if (!stats) return;
	const message = new SubscriptionMessage({
		name: LIVE_VIEW_STATS_TOPIC,
		data: JSON.stringify(stats)
	});
	const clients = $app.subscriptionsBroker().clients();
	for (const clientId in clients) if (clients[clientId].hasSubscription("mothership/live/view-stats")) clients[clientId].send(message);
};
const sendLiveViewStatsToClient = (client) => {
	const stats = getLiveViewStats();
	if (!stats) return;
	client.send(new SubscriptionMessage({
		name: LIVE_VIEW_STATS_TOPIC,
		data: JSON.stringify(stats)
	}));
};
const initLiveViewStatsAtBoot = () => {
	refreshLiveViewStats();
};
const handleLiveViewStatsCron = () => {
	if (!refreshLiveViewStats()) return;
	broadcastLiveViewStats();
};
const refreshAndBroadcastLiveViewStats = () => {
	if (!refreshLiveViewStats()) return null;
	broadcastLiveViewStats();
	return getLiveViewStats();
};

//#endregion
//#region src/lib/handlers/adminPlugins/platformStats.ts
const LIVE_PLATFORM_TOPIC = "mothership/live/platform";
const LIVE_PLATFORM_STORE_KEY = "phLivePlatformCounts";
const INSTANCE_STATUS_KEYS = [
	"running",
	"starting",
	"porting",
	"vacuuming",
	"idle",
	"failed"
];
const normalizeInstanceStatus = (raw) => {
	const status = (raw || "").trim();
	if (!status) return null;
	if (INSTANCE_STATUS_KEYS.includes(status)) return status;
	return null;
};
const emptyStatusCounts = () => {
	const counts = {};
	for (const key of INSTANCE_STATUS_KEYS) counts[key] = 0;
	return counts;
};
const countInstanceStatus = (key) => {
	return $app.countRecords("instances", $dbx.exp(`status = {:status}`, { status: key }));
};
const countVerifiedUsers = () => {
	return $app.countRecords("verified_users");
};
const countUnverifiedUsers = () => {
	return $app.countRecords("unverified_users");
};
const getLivePlatformStats = () => {
	const stats = getAppStoreJson(LIVE_PLATFORM_STORE_KEY);
	if (!stats?.statusCounts) return null;
	return stats;
};
const recountLivePlatformStats = () => {
	const statusCounts = emptyStatusCounts();
	for (const key of INSTANCE_STATUS_KEYS) statusCounts[key] = countInstanceStatus(key);
	const stats = {
		statusCounts,
		totalUsers: $app.countRecords("users"),
		verifiedUsers: countVerifiedUsers(),
		unverifiedUsers: countUnverifiedUsers(),
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
	setAppStoreJson(LIVE_PLATFORM_STORE_KEY, stats);
	return stats;
};
const emptyLivePlatformStats = () => ({
	statusCounts: emptyStatusCounts(),
	totalUsers: 0,
	verifiedUsers: 0,
	unverifiedUsers: 0,
	updatedAt: (/* @__PURE__ */ new Date()).toISOString()
});
const applyStatusDelta = (delta) => {
	updateAppStoreJson(LIVE_PLATFORM_STORE_KEY, (old) => {
		const stats = old || emptyLivePlatformStats();
		const statusCounts = { ...stats.statusCounts };
		for (const key of Object.keys(delta)) {
			const next = (statusCounts[key] || 0) + delta[key];
			statusCounts[key] = next < 0 ? 0 : next;
		}
		return {
			...stats,
			statusCounts,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
	});
};
const applyUserDelta = (delta) => {
	updateAppStoreJson(LIVE_PLATFORM_STORE_KEY, (old) => {
		const stats = old || emptyLivePlatformStats();
		const next = stats.totalUsers + delta;
		return {
			...stats,
			totalUsers: next < 0 ? 0 : next,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
	});
};
const applyVerifiedDelta = (verifiedDelta, unverifiedDelta) => {
	updateAppStoreJson(LIVE_PLATFORM_STORE_KEY, (old) => {
		const stats = old || emptyLivePlatformStats();
		const nextVerified = (stats.verifiedUsers || 0) + verifiedDelta;
		const nextUnverified = (stats.unverifiedUsers || 0) + unverifiedDelta;
		return {
			...stats,
			verifiedUsers: nextVerified < 0 ? 0 : nextVerified,
			unverifiedUsers: nextUnverified < 0 ? 0 : nextUnverified,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
	});
};
const broadcastLivePlatformStats = () => {
	const stats = getLivePlatformStats();
	if (!stats) return;
	const message = new SubscriptionMessage({
		name: LIVE_PLATFORM_TOPIC,
		data: JSON.stringify(stats)
	});
	const clients = $app.subscriptionsBroker().clients();
	for (const clientId in clients) if (clients[clientId].hasSubscription("mothership/live/platform")) clients[clientId].send(message);
};
const sendLivePlatformStatsToClient = (client) => {
	const stats = getLivePlatformStats();
	if (!stats) return;
	client.send(new SubscriptionMessage({
		name: LIVE_PLATFORM_TOPIC,
		data: JSON.stringify(stats)
	}));
};
const bumpStatus = (from, to) => {
	const delta = {};
	if (from) delta[from] = (delta[from] || 0) - 1;
	if (to) delta[to] = (delta[to] || 0) + 1;
	if (!Object.keys(delta).length) return;
	applyStatusDelta(delta);
	broadcastLivePlatformStats();
};
const initLivePlatformStatsAtBoot = () => {
	recountLivePlatformStats();
};
/** Full DB recount + SSE broadcast. Safety net for incremental drift (mirror bulk reset, missed hooks). */
const refreshAndBroadcastLivePlatformStats = () => {
	const stats = recountLivePlatformStats();
	broadcastLivePlatformStats();
	return stats;
};
const handleLivePlatformStatsCron = () => {
	refreshAndBroadcastLivePlatformStats();
};
const HandleLivePlatformRefresh = (e) => {
	const stats = refreshAndBroadcastLivePlatformStats();
	refreshAndBroadcastLiveViewStats();
	return e.json(200, stats);
};
const handleLivePlatformInstanceCreate = (e) => {
	const status = normalizeInstanceStatus(e.record.getString("status"));
	if (!status) return;
	bumpStatus(null, status);
};
const handleLivePlatformInstanceUpdate = (e) => {
	const next = normalizeInstanceStatus(e.record.getString("status"));
	const prev = normalizeInstanceStatus(e.record.original().getString("status"));
	if (next === prev) return;
	bumpStatus(prev, next);
};
const handleLivePlatformInstanceDelete = (e) => {
	const status = normalizeInstanceStatus(e.record.getString("status"));
	if (!status) return;
	bumpStatus(status, null);
};
const handleLivePlatformUserCreate = (e) => {
	applyUserDelta(1);
	const verified = e.record.getBool("verified");
	applyVerifiedDelta(verified ? 1 : 0, verified ? 0 : 1);
	broadcastLivePlatformStats();
};
const handleLivePlatformUserDelete = (e) => {
	applyUserDelta(-1);
	const verified = e.record.getBool("verified");
	applyVerifiedDelta(verified ? -1 : 0, verified ? 0 : -1);
	broadcastLivePlatformStats();
};
const handleLivePlatformUserUpdate = (e) => {
	const next = e.record.getBool("verified");
	if (next === e.record.original().getBool("verified")) return;
	applyVerifiedDelta(next ? 1 : -1, next ? -1 : 1);
	broadcastLivePlatformStats();
};

//#endregion
//#region ../common/pat.ts
/**
* Personal access tokens (PATs). Format: `ph_pat_<id>_<secret>`.
*
* - `id` is the 15-character `api_tokens` record ID, used for lookup.
* - `secret` is 43 base62 characters (~256 bits). Only `sha256(secret)` is stored.
*
* Pure helpers only: this file is bundled into the mothership JSVM, so no Node imports.
*/
const PAT_PREFIX = "ph_pat_";
const PAT_SECRET_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const PAT_RE = /^ph_pat_([a-z0-9]{15})_([0-9A-Za-z]{43})$/;
const formatPat = (id, secret) => `${PAT_PREFIX}${id}_${secret}`;
const parsePat = (raw) => {
	if (typeof raw !== "string") return null;
	const m = PAT_RE.exec(raw.trim());
	if (!m) return null;
	return {
		id: m[1],
		secret: m[2]
	};
};
/** Last 4 characters of the secret, shown in lists as `ph_pat_…abcd`. */
const patHint = (secret) => secret.slice(-4);
/** Reads `Authorization: Bearer <token>`. Returns the token or null. */
const bearerToken = (authorization) => {
	if (!authorization) return null;
	const m = /^Bearer\s+(.+)$/i.exec(authorization.trim());
	return m ? m[1].trim() : null;
};
/** True when an ISO/PB date string is set and in the past. */
const patExpired = (expires, nowMs) => {
	if (!expires || !expires.trim()) return false;
	const t = Date.parse(expires.replace(" ", "T"));
	if (Number.isNaN(t)) return false;
	return t <= nowMs;
};

//#endregion
//#region src/lib/handlers/apiTokens/lib/parseInstanceScope.ts
/**
* Validates `{ all_instances, instances }` from a token create/update body. Every listed instance must exist and be
* owned by `userId`; at least one is required unless `all_instances` is true.
*/
const parseInstanceScope = (body, userId) => {
	const allInstances = body.all_instances === true;
	const instanceIds = Array.isArray(body.instances) ? [...new Set(body.instances.filter((v) => typeof v === "string"))] : [];
	if (!allInstances && instanceIds.length === 0) throw new BadRequestError("Select at least one instance or choose all instances.");
	if (allInstances) return {
		allInstances,
		instanceIds: []
	};
	for (const id of instanceIds) {
		let instance;
		try {
			instance = $app.findRecordById("instances", id);
		} catch {
			throw new BadRequestError("One or more selected instances were not found.");
		}
		if (instance.getString("uid") !== userId) throw new BadRequestError("One or more selected instances are not owned by you.");
	}
	return {
		allInstances,
		instanceIds
	};
};

//#endregion
//#region src/lib/handlers/apiTokens/api/HandleApiTokenCreate.ts
/**
* POST /api/tokens (JWT auth only). Body: `{ label, scopes?, all_instances?, instances?, expires? }`. Returns the token
* once; only its sha256 is stored.
*/
const HandleApiTokenCreate = (e) => {
	const auth = e.auth;
	if (!auth) throw new UnauthorizedError("Authentication required.");
	const body = e.requestInfo().body || {};
	const label = typeof body.label === "string" ? body.label.trim() : "";
	if (!label) throw new BadRequestError("Label is required.");
	if (label.length > 100) throw new BadRequestError(`Label must be at most ${100} characters.`);
	const rawScopes = Array.isArray(body.scopes) ? body.scopes : ["read", "write"];
	const scopes = /* @__PURE__ */ new Set();
	for (const s of rawScopes) {
		if (s !== "read" && s !== "write") throw new BadRequestError(`Unknown scope: ${s}`);
		scopes.add(s);
	}
	if (scopes.has("write")) scopes.add("read");
	if (scopes.size === 0) throw new BadRequestError("Choose at least one scope.");
	const { allInstances, instanceIds } = parseInstanceScope(body, auth.id);
	let expires = "";
	if (typeof body.expires === "string" && body.expires.trim()) {
		const t = Date.parse(body.expires.trim());
		if (Number.isNaN(t)) throw new BadRequestError("Invalid expiry date.");
		if (t <= Date.now()) throw new BadRequestError("Expiry must be in the future.");
		expires = new Date(t).toISOString();
	}
	if ($app.findRecordsByFilter("api_tokens", "user = {:user}", "", 0, 0, { user: auth.id }).length >= 20) throw new BadRequestError(`You can have at most ${20} tokens. Revoke one first.`);
	const secret = $security.randomStringWithAlphabet(43, PAT_SECRET_ALPHABET);
	const record = new Record($app.findCollectionByNameOrId("api_tokens"));
	record.set("user", auth.id);
	record.set("label", label);
	record.set("secret_hash", $security.sha256(secret));
	record.set("hint", patHint(secret));
	record.set("scopes", [...scopes]);
	record.set("all_instances", allInstances);
	record.set("instances", allInstances ? [] : instanceIds);
	record.set("expires", expires);
	$app.save(record);
	return e.json(200, {
		token: formatPat(record.id, secret),
		record: {
			id: record.id,
			label,
			hint: record.getString("hint"),
			scopes: [...scopes],
			all_instances: allInstances,
			instances: allInstances ? [] : instanceIds,
			expires: record.getString("expires"),
			created: record.getString("created")
		}
	});
};

//#endregion
//#region src/lib/handlers/apiTokens/api/HandleApiTokenUpdate.ts
/**
* PATCH /api/tokens/{id} (JWT auth only). Body: `{ all_instances, instances }`. Changes which instances a token can
* reach. The secret, label, scopes and expiry are untouched, so CI secrets holding the token keep working.
*/
const HandleApiTokenUpdate = (e) => {
	const auth = e.auth;
	if (!auth) throw new UnauthorizedError("Authentication required.");
	const id = e.request.pathValue("id");
	let record;
	try {
		record = $app.findRecordById("api_tokens", id);
	} catch {
		throw new NotFoundError("Token not found.");
	}
	if (record.getString("user") !== auth.id) throw new NotFoundError("Token not found.");
	const { allInstances, instanceIds } = parseInstanceScope(e.requestInfo().body || {}, auth.id);
	record.set("all_instances", allInstances);
	record.set("instances", instanceIds);
	$app.save(record);
	return e.json(200, { record: {
		id: record.id,
		all_instances: allInstances,
		instances: instanceIds
	} });
};

//#endregion
//#region src/lib/handlers/apiTokens/lib/verifyPat.ts
const TOUCH_INTERVAL_MS = 6e4;
const invalid = () => ({
	ok: false,
	status: 401,
	message: "Invalid or expired token."
});
/** Looks up a PAT, checks the hash in constant time, expiry and account suspension. */
const verifyPat = (raw, ip) => {
	const parsed = parsePat(raw);
	if (!parsed) return invalid();
	let token;
	try {
		token = $app.findRecordById("api_tokens", parsed.id);
	} catch {
		return invalid();
	}
	if (!$security.equal(token.getString("secret_hash"), $security.sha256(parsed.secret))) return invalid();
	if (patExpired(token.getString("expires"), Date.now())) return invalid();
	let user;
	try {
		user = $app.findRecordById("users", token.getString("user"));
	} catch {
		return invalid();
	}
	const suspension = user.getString("suspension").trim();
	if (suspension) return {
		ok: false,
		status: 403,
		message: suspension
	};
	const lastUsed = Date.parse(token.getString("last_used").replace(" ", "T"));
	if (Number.isNaN(lastUsed) || Date.now() - lastUsed > TOUCH_INTERVAL_MS) try {
		token.set("last_used", new DateTime());
		if (ip) token.set("last_used_ip", `${ip}`.slice(0, 64));
		$app.unsafeWithoutHooks().save(token);
	} catch {}
	const scopes = (token.getStringSlice("scopes") || []).filter((s) => s === "read" || s === "write");
	const instanceIds = token.getBool("all_instances") ? null : [...token.getStringSlice("instances") || []];
	return {
		ok: true,
		token,
		user,
		result: {
			tokenId: token.id,
			userId: user.id,
			label: token.getString("label"),
			scopes,
			instanceIds
		}
	};
};

//#endregion
//#region src/lib/handlers/apiTokens/api/HandlePatInstances.ts
const parseJson = (raw) => {
	try {
		return JSON.parse(raw || "null");
	} catch {
		return null;
	}
};
/**
* GET /api/pat/instances with `Authorization: Bearer ph_pat_…`. Lists the token owner's instances that the token can
* reach, for `pockethost list`, `link` and `show`.
*/
const HandlePatInstances = (e) => {
	const outcome = verifyPat(bearerToken(e.request?.header.get("Authorization")), e.realIP());
	if (!outcome.ok) return e.json(outcome.status, {
		status: outcome.status,
		message: outcome.message
	});
	const { result, user } = outcome;
	const allowed = result.instanceIds === null ? null : new Set(result.instanceIds);
	const edgeRegion = {};
	for (const edge of $app.findAllRecords("edges")) if (edge) edgeRegion[edge.id] = edge.getString("region");
	const instances = $app.findRecordsByFilter("instances", "uid = {:uid}", "subdomain", 0, 0, { uid: user.id }).filter((r) => !!r && (allowed === null || allowed.has(r.id))).map((r) => ({
		id: r.id,
		subdomain: r.getString("subdomain"),
		cname: r.getString("cname"),
		status: r.getString("status"),
		power: r.getBool("power"),
		version: r.getString("version"),
		region: edgeRegion[r.getString("edge")] || "sfo",
		dev: r.getBool("dev"),
		syncAdmin: r.getBool("syncAdmin"),
		autoVacuum: r.getBool("autoVacuum"),
		secretNames: Object.keys(parseJson(r.getString("secrets")) ?? {}).sort(),
		webhooks: (parseJson(r.getString("webhooks")) ?? []).map((w) => ({
			endpoint: w.endpoint,
			value: w.value
		}))
	}));
	return e.json(200, { instances });
};

//#endregion
//#region src/lib/handlers/apiTokens/api/HandlePatVerify.ts
/** POST /api/pat/verify (superuser). Body: `{ token, ip? }`. Used by edge services; the token is never logged. */
const HandlePatVerify = (e) => {
	const body = e.requestInfo().body || {};
	const outcome = verifyPat(body.token, typeof body.ip === "string" ? body.ip : void 0);
	if (!outcome.ok) return e.json(outcome.status, {
		status: outcome.status,
		message: outcome.message
	});
	return e.json(200, outcome.result);
};

//#endregion
//#region src/lib/handlers/apiTokens/api/HandlePatWhoami.ts
/**
* GET /api/pat/whoami with `Authorization: Bearer ph_pat_…`. Lets the CLI show who a token belongs to. With
* `?fingerprint=SHA256:…` it also says whether that SSH key is registered on the account (label only), so `pockethost
* sftp` can explain a missing key before SFTP rejects it. A token can never add SSH keys.
*/
const HandlePatWhoami = (e) => {
	const outcome = verifyPat(bearerToken(e.request?.header.get("Authorization")), e.realIP());
	if (!outcome.ok) return e.json(outcome.status, {
		status: outcome.status,
		message: outcome.message
	});
	const { result, token, user } = outcome;
	const instances = result.instanceIds === null ? null : result.instanceIds.map((id) => {
		try {
			const r = $app.findRecordById("instances", id);
			return {
				id: r.id,
				subdomain: r.getString("subdomain")
			};
		} catch {
			return null;
		}
	}).filter((v) => !!v);
	const fingerprint = `${e.request?.url?.query().get("fingerprint") ?? ""}`.trim();
	let sshKey = null;
	if (fingerprint) try {
		sshKey = { label: $app.findFirstRecordByFilter("ssh_keys", "user = {:user} && fingerprint = {:fp}", {
			user: user.id,
			fp: fingerprint
		}).getString("label") };
	} catch {
		sshKey = null;
	}
	return e.json(200, {
		email: user.getString("email"),
		label: result.label,
		hint: token.getString("hint"),
		scopes: result.scopes,
		instances,
		expires: token.getString("expires"),
		...fingerprint ? { sshKey } : {}
	});
};

//#endregion
//#region src/lib/util/cloudflare.ts
const DEAD_STATUSES = [
	"moved",
	"blocked",
	"pending_blocked",
	"deleted"
];
const DEAD_SSL_STATUSES = ["expired", "deleted"];
const isDeadHostname = (h) => {
	const ssl = h.ssl?.status || "";
	return DEAD_STATUSES.includes(h.status) || DEAD_SSL_STATUSES.includes(ssl) || ssl.endsWith("_timed_out");
};
const cfCall = (path, method, body, log) => {
	const apiToken = $os.getenv("MOTHERSHIP_CLOUDFLARE_API_TOKEN");
	const zoneId = $os.getenv("MOTHERSHIP_CLOUDFLARE_ZONE_ID");
	if (!apiToken || !zoneId) {
		log?.("Cloudflare API credentials not configured - skipping Cloudflare operations");
		return null;
	}
	const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/${path}`;
	try {
		const res = $http.send({
			url,
			method,
			headers: {
				Authorization: `Bearer ${apiToken}`,
				"Content-Type": "application/json"
			},
			body: body ? JSON.stringify(body) : "",
			timeout: 30
		});
		if (res.statusCode < 200 || res.statusCode >= 300) log?.(`Cloudflare ${method} ${path} failed: ${res.statusCode}`, res.json);
		return {
			statusCode: res.statusCode,
			json: res.json
		};
	} catch (error) {
		log?.(`Cloudflare ${method} ${path} error:`, `${error}`);
		return null;
	}
};
const ok = (res) => !!res && res.statusCode >= 200 && res.statusCode < 300;
const createCustomHostname = (hostname, log) => ok(cfCall("custom_hostnames", "POST", {
	hostname,
	ssl: {
		method: "http",
		type: "dv"
	}
}, log));
const deleteCustomHostnameById = (id, log) => ok(cfCall(`custom_hostnames/${id}`, "DELETE", void 0, log));
/** All custom hostnames on the zone. Returns null if any page fails, so callers never act on a partial list. */
const listCustomHostnames = (log) => {
	const all = [];
	for (let page = 1;; page++) {
		const res = cfCall(`custom_hostnames?per_page=50&page=${page}`, "GET", void 0, log);
		if (!ok(res) || !res.json?.success) return null;
		const result = res.json.result || [];
		all.push(...result);
		const totalPages = res.json.result_info?.total_pages || 1;
		if (page >= totalPages || result.length === 0) break;
	}
	return all;
};
const findCustomHostname = (hostname, log) => {
	const res = cfCall(`custom_hostnames?hostname=${encodeURIComponent(hostname)}`, "GET", void 0, log);
	if (!ok(res)) return null;
	return (res.json?.result || []).find((h) => h.hostname.toLowerCase() === hostname.toLowerCase()) || null;
};
/**
* Make sure Cloudflare has a working entry for this hostname. Leaves an active or still-validating entry alone;
* replaces a dead one (expired/deleted cert, moved, blocked, timed out) with a fresh one.
*/
const ensureCustomHostname = (hostname, log) => {
	const existing = findCustomHostname(hostname, log);
	if (existing) {
		if (!isDeadHostname(existing)) return true;
		log?.(`Replacing dead Cloudflare hostname ${hostname} (${existing.status}/${existing.ssl?.status})`);
		deleteCustomHostnameById(existing.id, log);
	}
	return createCustomHostname(hostname, log);
};

//#endregion
//#region src/lib/util/Logger.ts
const mkLog = (namespace) => (...s) => console.log(`[${namespace}]`, ...s.map((p) => {
	if (typeof p === "object") return JSON.stringify(p, null, 2);
	return p;
}));
const dbg = (...args) => console.log(args);
const interpolateString = (template, dict) => {
	return template.replace(/\{\$(\w+)\}/g, (match, key) => {
		dbg({
			match,
			key
		});
		const lowerKey = key.toLowerCase();
		return dict.hasOwnProperty(lowerKey) ? dict[lowerKey] || "" : match;
	});
};

//#endregion
//#region src/lib/handlers/cloudflare/api/HandleCustomHostnameRegister.ts
/**
* POST /api/cloudflare/hostnames/register/{instanceId} (superuser). Re-adds an instance's cname, e.g. after an archive
* restore.
*/
const HandleCustomHostnameRegister = (e) => {
	const log = mkLog(`cloudflare-hostname-register`);
	const cname = $app.findRecordById("instances", e.request.pathValue("id")).getString("cname").trim();
	if (!cname) return e.json(200, { status: "no-cname" });
	const created = ensureCustomHostname(cname, log);
	return e.json(200, {
		status: created ? "registered" : "failed",
		cname
	});
};

//#endregion
//#region src/lib/handlers/cloudflare/cron/sweepCustomHostnames.ts
/** Matches ARCHIVED_SUSPENSION_PREFIX in core/instanceArchive.ts (not importable from the JSVM bundle). */
const ARCHIVED_PREFIX = "Archived:";
const PENDING_GRACE_DAYS = 14;
const IGNORED_STATUSES = ["deleted", "pending_deletion"];
const OWN_ZONE_SUFFIX = ".pockethost.io";
/** If a run would delete more than this share of all hostnames, something is wrong (e.g. a bad DB read). */
const MAX_DELETE_RATIO = .5;
const norm = (h) => h.trim().toLowerCase();
/** Why a hostname should go, or null to keep it. Pure, so it's easy to reason about. */
const reasonToDelete = (h, owner, now) => {
	const ssl = h.ssl?.status || "";
	if (!owner) return "orphan";
	if (owner.suspension.startsWith(ARCHIVED_PREFIX)) return "archived";
	if (isDeadHostname(h)) return `dead (${h.status}/${ssl})`;
	if (h.status !== "active") {
		if ((now - new Date(h.created_at).getTime()) / 864e5 > PENDING_GRACE_DAYS) return `not active after ${PENDING_GRACE_DAYS} days (${h.status}/${ssl})`;
	}
	return null;
};
const sweepCustomHostnames = (apply) => {
	const log = mkLog(`cloudflare-hostnames`);
	const listed = listCustomHostnames(log);
	if (!listed) throw new Error(`Could not list Cloudflare custom hostnames`);
	const hostnames = listed.filter((h) => !IGNORED_STATUSES.includes(h.status) && !norm(h.hostname).endsWith(OWN_ZONE_SUFFIX));
	const owners = /* @__PURE__ */ new Map();
	$app.findRecordsByFilter("instances", "cname != ''", "", 0, 0).forEach((r) => {
		if (!r) return;
		const cname = norm(r.getString("cname"));
		if (cname) owners.set(cname, { suspension: r.getString("suspension") });
	});
	const now = Date.now();
	const toDelete = [];
	const inCloudflare = /* @__PURE__ */ new Set();
	for (const h of hostnames) {
		const name = norm(h.hostname);
		inCloudflare.add(name);
		const reason = reasonToDelete(h, owners.get(name), now);
		if (reason) toDelete.push({
			hostname: h.hostname,
			id: h.id,
			status: h.status,
			ssl: h.ssl?.status || "",
			reason
		});
	}
	const missing = [...owners.entries()].filter(([name, o]) => !inCloudflare.has(name) && !o.suspension.startsWith(ARCHIVED_PREFIX)).map(([name]) => name);
	const result = {
		apply,
		total: hostnames.length,
		kept: hostnames.length - toDelete.length,
		toDelete,
		deleted: 0,
		failed: [],
		missing
	};
	if (apply && hostnames.length > 0 && toDelete.length / hostnames.length > MAX_DELETE_RATIO) result.aborted = `Would delete ${toDelete.length} of ${hostnames.length} (over ${MAX_DELETE_RATIO * 100}%). Not deleting; review with a dry run.`;
	else if (apply) for (const d of toDelete) if (deleteCustomHostnameById(d.id, log)) result.deleted++;
	else result.failed.push(d.hostname);
	const byReason = {};
	toDelete.forEach((d) => {
		const key = d.reason.split(" (")[0];
		byReason[key] = (byReason[key] || 0) + 1;
	});
	log(`${apply ? "APPLY" : "DRY RUN"}: ${result.total} hostnames, keep ${result.kept}, delete ${toDelete.length}`, {
		byReason,
		deleted: result.deleted,
		failed: result.failed,
		missing: missing.length,
		aborted: result.aborted
	});
	return result;
};
/** Daily cron. Deletes only when MOTHERSHIP_CLOUDFLARE_SWEEP_APPLY is true; otherwise logs a dry run. */
const cronSweepCustomHostnames = () => {
	const apply = [
		"1",
		"true",
		"yes"
	].includes(($os.getenv("MOTHERSHIP_CLOUDFLARE_SWEEP_APPLY") || "").toLowerCase());
	try {
		sweepCustomHostnames(apply);
	} catch (e) {
		mkLog(`cloudflare-hostnames`)(`Sweep failed:`, `${e}`);
	}
};

//#endregion
//#region src/lib/handlers/cloudflare/api/HandleCustomHostnamesSweep.ts
/** POST /api/cloudflare/hostnames/sweep[?apply=1] (superuser). Dry run unless apply=1. */
const HandleCustomHostnamesSweep = (e) => {
	const apply = e.request.url.query().get("apply") === "1";
	return e.json(200, sweepCustomHostnames(apply));
};

//#endregion
//#region src/lib/util/downloadLinks.ts
const INSTANCE_ID_RE = /^[a-z0-9]{15}$/;
const ZIP_NAME_RE = /^[A-Za-z0-9_.@-]{1,200}\.zip$/;
const B64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const isInstanceId = (id) => INSTANCE_ID_RE.test(id);
const isBackupZipName = (name) => ZIP_NAME_RE.test(name) && !name.includes("..");
/** Hex digest to unpadded base64url (what node's `digest('base64url')` returns). */
const hexToBase64Url = (hex) => {
	const bytes = [];
	for (let i = 0; i + 1 < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
	let out = "";
	for (let i = 0; i < bytes.length; i += 3) {
		const n = bytes[i] << 16 | (bytes[i + 1] ?? 0) << 8 | (bytes[i + 2] ?? 0);
		out += B64URL[n >> 18 & 63] + B64URL[n >> 12 & 63];
		if (i + 1 < bytes.length) out += B64URL[n >> 6 & 63];
		if (i + 2 < bytes.length) out += B64URL[n & 63];
	}
	return out;
};
/** Length-checked comparison that looks at every character. */
const sameString = (a, b) => {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
};
const check = (payload, expRaw, sigRaw, secret, nowMs, hmacHex) => {
	if (typeof expRaw !== "string" || typeof sigRaw !== "string" || !/^\d+$/.test(expRaw)) return {
		ok: false,
		status: 400,
		reason: "malformed link"
	};
	if (!sameString(hexToBase64Url(hmacHex(`${payload}:${expRaw}`, secret)), sigRaw)) return {
		ok: false,
		status: 403,
		reason: "invalid signature"
	};
	if (nowMs > Number(expRaw) * 1e3) return {
		ok: false,
		status: 410,
		reason: "link expired"
	};
	return { ok: true };
};
const verifyArchiveLink = (instanceId, expRaw, sigRaw, secret, nowMs, hmacHex) => {
	if (!secret) return {
		ok: false,
		status: 403,
		reason: "link signing is not configured"
	};
	if (!isInstanceId(instanceId)) return {
		ok: false,
		status: 400,
		reason: "bad instance id"
	};
	return check(`archive:${instanceId}`, expRaw, sigRaw, secret, nowMs, hmacHex);
};
const verifyBackupLink = (instanceId, zipName, expRaw, sigRaw, secret, nowMs, hmacHex) => {
	if (!secret) return {
		ok: false,
		status: 403,
		reason: "link signing is not configured"
	};
	if (!isInstanceId(instanceId)) return {
		ok: false,
		status: 400,
		reason: "bad instance id"
	};
	if (!isBackupZipName(zipName)) return {
		ok: false,
		status: 400,
		reason: "bad backup name"
	};
	return check(`backup:${instanceId}/${zipName}`, expRaw, sigRaw, secret, nowMs, hmacHex);
};
const DOWNLOAD_MESSAGES = {
	400: "This download link is malformed.",
	403: "This download link is not valid.",
	404: "This archive is no longer available.",
	410: "This download link has expired, and the archive has been deleted.",
	500: "Something went wrong preparing your download. Please try again or contact support."
};

//#endregion
//#region src/lib/util/s3Presign.ts
/**
* Presigned S3 GET URLs (AWS Signature V4, query-string auth), runnable in PocketBase's goja VM: no node APIs.
*
* PocketBase's `$security` covers the text hashing (`sha256`), but SigV4's signing-key chain HMACs with the previous
* step's raw 32-byte digest as the key, and `$security.hs256` only accepts string keys (goja passes them to Go as
* UTF-8, which mangles bytes above 0x7f). So the four chained HMACs use the small byte-level SHA-256 below.
*/
const K = [
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
];
const rotr = (x, n) => x >>> n | x << 32 - n;
/** UTF-8 bytes of a JS string (no TextEncoder in goja). */
const utf8 = (s) => {
	const out = [];
	for (let i = 0; i < s.length; i++) {
		let c = s.charCodeAt(i);
		if (c >= 55296 && c <= 56319 && i + 1 < s.length) {
			const d = s.charCodeAt(i + 1);
			if (d >= 56320 && d <= 57343) {
				c = 65536 + (c - 55296 << 10) + (d - 56320);
				i++;
			}
		}
		if (c < 128) out.push(c);
		else if (c < 2048) out.push(192 | c >> 6, 128 | c & 63);
		else if (c < 65536) out.push(224 | c >> 12, 128 | c >> 6 & 63, 128 | c & 63);
		else out.push(240 | c >> 18, 128 | c >> 12 & 63, 128 | c >> 6 & 63, 128 | c & 63);
	}
	return out;
};
const toHex = (bytes) => {
	let s = "";
	for (const b of bytes) s += (b < 16 ? "0" : "") + b.toString(16);
	return s;
};
/** SHA-256 of a byte array, as bytes. */
const sha256Bytes = (msg) => {
	const h = [
		1779033703,
		3144134277,
		1013904242,
		2773480762,
		1359893119,
		2600822924,
		528734635,
		1541459225
	];
	const bitLen = msg.length * 8;
	const data = msg.slice();
	data.push(128);
	while (data.length % 64 !== 56) data.push(0);
	const hi = Math.floor(bitLen / 4294967296);
	data.push(hi >>> 24 & 255, hi >>> 16 & 255, hi >>> 8 & 255, hi & 255);
	data.push(bitLen >>> 24 & 255, bitLen >>> 16 & 255, bitLen >>> 8 & 255, bitLen & 255);
	const w = new Array(64);
	for (let off = 0; off < data.length; off += 64) {
		for (let i = 0; i < 16; i++) {
			const j = off + i * 4;
			w[i] = (data[j] << 24 | data[j + 1] << 16 | data[j + 2] << 8 | data[j + 3]) >>> 0;
		}
		for (let i = 16; i < 64; i++) {
			const a = w[i - 15];
			const b = w[i - 2];
			const s0 = rotr(a, 7) ^ rotr(a, 18) ^ a >>> 3;
			const s1 = rotr(b, 17) ^ rotr(b, 19) ^ b >>> 10;
			w[i] = w[i - 16] + s0 + w[i - 7] + s1 >>> 0;
		}
		let [a, b, c, d, e, f, g, hh] = h;
		for (let i = 0; i < 64; i++) {
			const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
			const ch = e & f ^ ~e & g;
			const t1 = hh + S1 + ch + K[i] + w[i] >>> 0;
			const t2 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + (a & b ^ a & c ^ b & c) >>> 0;
			hh = g;
			g = f;
			f = e;
			e = d + t1 >>> 0;
			d = c;
			c = b;
			b = a;
			a = t1 + t2 >>> 0;
		}
		h[0] = h[0] + a >>> 0;
		h[1] = h[1] + b >>> 0;
		h[2] = h[2] + c >>> 0;
		h[3] = h[3] + d >>> 0;
		h[4] = h[4] + e >>> 0;
		h[5] = h[5] + f >>> 0;
		h[6] = h[6] + g >>> 0;
		h[7] = h[7] + hh >>> 0;
	}
	const out = [];
	for (const x of h) out.push(x >>> 24 & 255, x >>> 16 & 255, x >>> 8 & 255, x & 255);
	return out;
};
/** HMAC-SHA256 with a byte key, as bytes. */
const hmacBytes = (key, msg) => {
	let k = key.length > 64 ? sha256Bytes(key) : key.slice();
	while (k.length < 64) k.push(0);
	const inner = k.map((b) => b ^ 54).concat(msg);
	return sha256Bytes(k.map((b) => b ^ 92).concat(sha256Bytes(inner)));
};
/** RFC 3986 encoding as SigV4 wants it (encodeURIComponent leaves !'()* alone). */
const uriEncode = (s, keepSlash = false) => {
	const enc = encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
	return keepSlash ? enc.replace(/%2F/g, "/") : enc;
};
const amzDate = (ms) => {
	const iso = new Date(ms).toISOString();
	return iso.slice(0, 4) + iso.slice(5, 7) + iso.slice(8, 13) + iso.slice(14, 16) + iso.slice(17, 19) + "Z";
};
/** Presigned URL (GET by default), valid for `expiresSec` from `nowMs`. */
const presignUrl = (p) => {
	const endpoint = p.endpoint.replace(/\/+$/, "");
	const host = endpoint.replace(/^https?:\/\//, "");
	const canonicalUri = uriEncode("/" + (p.bucket ? `${p.bucket}/` : "") + p.key.replace(/^\/+/, ""), true);
	const datetime = amzDate(p.nowMs);
	const date = datetime.slice(0, 8);
	const scope = `${date}/${p.region}/s3/aws4_request`;
	const query = [
		["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
		["X-Amz-Credential", `${p.accessKeyId}/${scope}`],
		["X-Amz-Date", datetime],
		["X-Amz-Expires", String(p.expiresSec)],
		["X-Amz-SignedHeaders", "host"]
	].map(([k, v]) => [uriEncode(k), uriEncode(v)]).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0).map(([k, v]) => `${k}=${v}`).join("&");
	const canonicalRequest = [
		p.method ?? "GET",
		canonicalUri,
		query,
		`host:${host}`,
		"",
		"host",
		"UNSIGNED-PAYLOAD"
	].join("\n");
	const stringToSign = [
		"AWS4-HMAC-SHA256",
		datetime,
		scope,
		p.sha256Hex(canonicalRequest)
	].join("\n");
	let signingKey = hmacBytes(utf8(`AWS4${p.secretAccessKey}`), utf8(date));
	for (const part of [
		p.region,
		"s3",
		"aws4_request"
	]) signingKey = hmacBytes(signingKey, utf8(part));
	return `${endpoint}${canonicalUri}?${query}&X-Amz-Signature=${toHex(hmacBytes(signingKey, utf8(stringToSign)))}`;
};
/** `remote:bucket/prefix` (rclone-style, as in PH_ARCHIVE_REMOTE) to bucket + key prefix. */
const parseRemote = (remote) => {
	const [bucket, ...rest] = (remote.includes(":") ? remote.slice(remote.indexOf(":") + 1) : remote).replace(/^\/+|\/+$/g, "").split("/");
	return {
		bucket: bucket ?? "",
		prefix: rest.join("/")
	};
};

//#endregion
//#region src/lib/handlers/downloads/api/downloadHelpers.ts
const env = (key, fallback = "") => $os.getenv(key) || fallback;
const linkSecret = () => env("PH_ARCHIVE_LINK_SECRET") || env("PH_SECRET");
const hmacHex = (text, secret) => $security.hs256(text, secret);
/** Where archives and cold-stored backups live (same `remote:bucket/prefix` settings the edge jobs use). */
const archiveLocation = () => parseRemote(env("PH_ARCHIVE_REMOTE", "sfo-2-data:sfo-2-data/archive"));
const backupLocation = () => parseRemote(env("PH_BACKUP_ICEBOX_REMOTE", "sfo-2-data:sfo-2-data/backup-icebox"));
const sendFailure = (e, status) => e.string(status, DOWNLOAD_MESSAGES[status] ?? DOWNLOAD_MESSAGES[500]);
/**
* Checks the object exists (signed HEAD), then redirects to a 1-hour signed GET URL, so the file never streams through
* PocketHost. Credentials: PH_DOWNLOADS_S3_ENDPOINT, PH_DOWNLOADS_S3_ACCESS_KEY, PH_DOWNLOADS_S3_SECRET,
* PH_DOWNLOADS_S3_REGION (default us-east-1).
*/
const redirectToObject = (e, label, bucket, key) => {
	const log = mkLog(`downloads`);
	const endpoint = env("PH_DOWNLOADS_S3_ENDPOINT");
	const accessKeyId = env("PH_DOWNLOADS_S3_ACCESS_KEY");
	const secretAccessKey = env("PH_DOWNLOADS_S3_SECRET");
	if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
		log(`downloads storage is not configured`);
		return sendFailure(e, 500);
	}
	const base = {
		endpoint: /^https?:\/\//.test(endpoint) ? endpoint : `https://${endpoint}`,
		region: env("PH_DOWNLOADS_S3_REGION", "us-east-1"),
		accessKeyId,
		secretAccessKey,
		bucket,
		key,
		nowMs: Date.now(),
		sha256Hex: (text) => $security.sha256(text)
	};
	try {
		const head = $http.send({
			url: presignUrl({
				...base,
				method: "HEAD",
				expiresSec: 60
			}),
			method: "HEAD",
			timeout: 15
		});
		if (head.statusCode === 404) return sendFailure(e, 404);
		if (head.statusCode < 200 || head.statusCode >= 300) {
			log(`storage check failed for ${label}: HTTP ${head.statusCode}`);
			return sendFailure(e, 500);
		}
	} catch (err) {
		log(`storage check failed for ${label}: ${err}`);
		return sendFailure(e, 500);
	}
	log(`download ${label}`);
	return e.redirect(302, presignUrl({
		...base,
		method: "GET",
		expiresSec: 3600
	}));
};

//#endregion
//#region src/lib/handlers/downloads/api/HandleArchiveDownload.ts
/** GET /_ph/archive/{id}?exp=&sig= : signed link from the instance-archived email. */
const HandleArchiveDownload = (e) => {
	const log = mkLog(`downloads:archive`);
	const instanceId = e.request.pathValue("id");
	const q = e.request.url.query();
	const check = verifyArchiveLink(instanceId, q.get("exp"), q.get("sig"), linkSecret(), Date.now(), hmacHex);
	if (!check.ok) {
		log(`rejected ${instanceId}: ${check.reason}`);
		return sendFailure(e, check.status);
	}
	const { bucket, prefix } = archiveLocation();
	return redirectToObject(e, instanceId, bucket, `${prefix ? prefix + "/" : ""}${instanceId}.tar.zst`);
};

//#endregion
//#region src/lib/handlers/downloads/api/HandleBackupDownload.ts
/** GET /_ph/backup/{id}/{zip}?exp=&sig= : signed link from a cold-storage `.zip.txt` stub. */
const HandleBackupDownload = (e) => {
	const log = mkLog(`downloads:backup`);
	const instanceId = e.request.pathValue("id");
	const zipName = e.request.pathValue("zip");
	const q = e.request.url.query();
	const check = verifyBackupLink(instanceId, zipName, q.get("exp"), q.get("sig"), linkSecret(), Date.now(), hmacHex);
	if (!check.ok) {
		log(`rejected backup ${instanceId}/${zipName}: ${check.reason}`);
		return sendFailure(e, check.status);
	}
	const { bucket, prefix } = backupLocation();
	return redirectToObject(e, `${instanceId}/${zipName}`, bucket, `${prefix ? prefix + "/" : ""}${instanceId}/${zipName}`);
};

//#endregion
//#region src/lib/handlers/edge/api/HandleEdgeHeartbeat.ts
const HandleEdgeHeartbeat = (e) => {
	const { body } = e.requestInfo();
	const edgeId = body?.edge_id;
	if (!edgeId || typeof edgeId !== "string") throw new BadRequestError("edge_id is required");
	const stats = body?.stats ?? {};
	let record;
	try {
		record = $app.findFirstRecordByData("edges", "edge_id", edgeId);
	} catch {
		const collection = $app.findCollectionByNameOrId("edges");
		record = new Record(collection);
		record.set("edge_id", edgeId);
		record.set("label", typeof body?.label === "string" ? body.label : edgeId);
	}
	record.set("last_seen", (/* @__PURE__ */ new Date()).toISOString());
	record.set("status", body?.status === "offline" ? "offline" : "online");
	if (typeof body?.region === "string" && /^[a-z][a-z0-9-]{1,14}$/.test(body.region)) {
		ensureRegion(body.region);
		record.set("region", body.region);
	}
	if (typeof body?.internal_url === "string") record.set("internal_url", body.internal_url);
	record.set("stats", stats);
	$app.save(record);
	return e.json(200, {
		ok: true,
		id: record.id
	});
};
/**
* A region reported by an edge for the first time gets a record named after its slug; superusers set the name and
* country in the admin.
*/
const ensureRegion = (slug) => {
	try {
		$app.findRecordById("regions", slug);
	} catch {
		const r = new Record($app.findCollectionByNameOrId("regions"));
		r.set("id", slug);
		r.set("name", slug);
		$app.save(r);
	}
};

//#endregion
//#region src/lib/handlers/edge/cron/markStaleEdges.ts
const STALE_MS = 3e4;
const OFFLINE_MS = 6e4;
const markStaleEdges = () => {
	const now = Date.now();
	const records = $app.findRecordsByFilter("edges", "1=1").filter((r) => !!r);
	for (const record of records) {
		const lastSeenRaw = record.get("last_seen");
		if (!lastSeenRaw) continue;
		const lastSeen = new Date(String(lastSeenRaw)).getTime();
		if (Number.isNaN(lastSeen)) continue;
		const age = now - lastSeen;
		let status = "online";
		if (age > OFFLINE_MS) status = "offline";
		else if (age > STALE_MS) status = "stale";
		if (record.get("status") !== status) {
			record.set("status", status);
			$app.save(record);
		}
	}
};

//#endregion
//#region src/lib/util/versions.ts
const POCKETBASE_VERSIONS_SETTING = "pocketbase_versions";
const parsePocketbaseVersionsValue = (raw) => {
	if (!raw) return null;
	if (typeof raw === "string") try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
	return raw;
};
const readPocketbaseVersions = () => {
	try {
		const value = parsePocketbaseVersionsValue($app.findFirstRecordByData("settings", "name", POCKETBASE_VERSIONS_SETTING).getString("value"));
		if (!value?.versions?.length) return [];
		return value.versions;
	} catch {
		return [];
	}
};
/**
* Every minor wildcard version (e.g. `0.22.*`) from mothership settings, including legacy ones. Edges need the full
* catalog to keep running existing legacy instances, so don't filter this one.
*/
const listVersions = () => readPocketbaseVersions().map((entry) => entry.range);
/**
* Oldest PocketBase minor that new instances and version changes may use. 0.22 and older are being sunset; existing
* instances on them keep running until the cutoff.
*/
const MIN_SELECTABLE_POCKETBASE_VERSION = {
	major: 0,
	minor: 23
};
/** Whether a range like `0.23.*` (or a full version) is at or above the selectable floor. */
const isSelectableVersion = (range) => {
	const match = /^(\d+)\.(\d+)(?:\.|$)/.exec(range.trim());
	if (!match) return false;
	const major = Number(match[1]);
	const minor = Number(match[2]);
	const min = MIN_SELECTABLE_POCKETBASE_VERSION;
	return major > min.major || major === min.major && minor >= min.minor;
};
/** Versions a user may pick for a new instance or a version change. */
const listSelectableVersions = () => listVersions().filter(isSelectableVersion);
/** Error message for a version that isn't selectable, or null when it's fine. */
const selectableVersionError = (version, selectable) => {
	if (typeof version !== "string" || !version) return `A PocketBase version is required. Version must be one of: ${selectable.join(", ")}`;
	if (!isSelectableVersion(version)) return `PocketBase ${version} is no longer supported for new instances or version changes. Use 0.23 or later.`;
	if (selectable.length && !selectable.includes(version)) return `Invalid version ${version}. Version must be one of: ${selectable.join(", ")}`;
	return null;
};

//#endregion
//#region src/lib/handlers/signup/isAvailable.ts
const isAvailable = (slug) => {
	try {
		$app.findFirstRecordByData("instances", "subdomain", slug);
		return false;
	} catch {
		return true;
	}
};

//#endregion
//#region src/lib/handlers/instance/lib/edgePlacement.ts
/** How long an edge may go without a heartbeat before it can't take new instances. Same window the firewalls use. */
const EDGE_HEALTHY_WINDOW_MS = 3e4;
const seenAt = (raw) => Date.parse(String(raw).replace(" ", "T"));
const isEdgeHealthyAt = (edge, nowMs) => {
	if (edge.status === "offline" || !edge.last_seen) return false;
	const seen = seenAt(edge.last_seen);
	return !Number.isNaN(seen) && nowMs - seen <= 3e4;
};
/**
* The edge a new instance in `region` goes to: a healthy edge in that region with the fewest instances (ties by id, so
* the choice is stable). Undefined when the region has no healthy edge.
*/
const pickEdgeForRegion = (edges, instanceCounts, region, nowMs) => edges.filter((edge) => edge.region === region && isEdgeHealthyAt(edge, nowMs)).sort((a, b) => (instanceCounts[a.id] ?? 0) - (instanceCounts[b.id] ?? 0) || (a.id < b.id ? -1 : 1))[0];
const isRegionName = (region) => /^[a-z][a-z0-9-]{1,31}$/.test(region);

//#endregion
//#region src/lib/handlers/instance/lib/instancePolicy.ts
/** Pure: whether a verified token may perform a write. Null when allowed. */
const patDenial = (grant, need) => {
	if (!grant.scopes.includes("write")) return {
		status: 403,
		message: `This token is read-only. Create a token with write access to change instances.`
	};
	if (need.kind === "create") return grant.instanceIds === null ? null : {
		status: 403,
		message: `Only a token for all instances can create instances. This token is limited to specific instances.`
	};
	if (grant.instanceIds !== null && !grant.instanceIds.includes(need.instanceId)) return {
		status: 404,
		message: `Instance not found, or this token cannot access it.`
	};
	return null;
};
/** Pure: applies a `{ KEY: value | null }` patch to a secrets map (null removes the key). */
const applySecretsPatch = (current, patch) => {
	const next = { ...current ?? {} };
	for (const [key, value] of Object.entries(patch)) if (value === null) delete next[key];
	else next[key] = value;
	return next;
};
const SECRET_KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/;
/** Pure: validates secret keys. Returns the first bad key, or null. */
const invalidSecretKey = (keys) => keys.find((k) => !SECRET_KEY_PATTERN.test(k)) ?? null;
/** Same rule as GET /api/signup?name=… */
const INSTANCE_NAME_PATTERN = /^[a-z][a-z0-9-]{2,39}$/;
/** Pure: why an instance name is invalid, or null. */
const instanceNameError = (name) => INSTANCE_NAME_PATTERN.test(name) ? null : `Instance name must begin with a letter, be between 3-40 characters, and can only contain a-z, 0-9, and hyphen (-).`;

//#endregion
//#region src/lib/handlers/instance/lib/instanceCaller.ts
const deny = (status, message) => {
	if (status === 401) throw new UnauthorizedError(message);
	if (status === 403) throw new ForbiddenError(message);
	throw new NotFoundError(message);
};
const resolveInstanceCaller = (e, need) => {
	if (e.auth) return {
		userId: e.auth.id,
		via: "jwt"
	};
	const raw = bearerToken(e.request?.header.get("Authorization"));
	if (!raw) return deny(401, `Sign in to the dashboard or send a personal access token.`);
	const outcome = verifyPat(raw, e.realIP());
	if (!outcome.ok) return deny(outcome.status, outcome.message);
	const denial = patDenial(outcome.result, need);
	if (denial) return deny(denial.status, denial.message);
	return {
		userId: outcome.user.id,
		via: "pat"
	};
};
/** Loads an instance the caller owns. Missing and not-owned look the same to tokens. */
const findOwnedInstance = (caller, id) => {
	let record;
	try {
		record = $app.findRecordById("instances", id);
	} catch {
		record = void 0;
	}
	if (!record || record.getString("uid") !== caller.userId) return deny(404, `Instance not found, or you cannot access it.`);
	return record;
};

//#endregion
//#region ../common/instanceLimits.ts
/**
* Instance limits. An account may own as many instances as its plan includes (`users.subscription_quantity`), and all
* of them may run. Archived instances don't count. Shared by the mothership (create / power-on checks, bundled into the
* JSVM, so no Node imports here) and the edge over-limit sweep.
*/
/** Archived instances carry this prefix in `instances.suspension`. */
const ARCHIVED_SUSPENSION_PREFIX = `Archived:`;
const isArchivedSuspension = (suspension) => !!suspension && suspension.startsWith(ARCHIVED_SUSPENSION_PREFIX);
const instanceAllowance = (user) => Math.max(0, Math.floor(user.subscription_quantity ?? 0));
/** Instances that count toward the limit: everything except archived ones. */
const countedInstances = (owned) => owned.filter((i) => !isArchivedSuspension(i.suspension));
/** Counted instances that are powered on. */
const poweredOnInstances = (owned) => countedInstances(owned).filter((i) => i.power);
const plural = (n) => `${n} instance${n === 1 ? `` : `s`}`;
/** Error message when the account can't create another instance, or null when it can. */
const createLimitError = (owned, allowance) => {
	const count = countedInstances(owned).length;
	if (count < allowance) return null;
	if (allowance === 0) return `Your account doesn't include any instances yet. Add an instance to your plan to create one.`;
	return `Your plan includes ${plural(allowance)} and you have ${count}. Delete or archive one, or add instances to your plan.`;
};
/**
* Error message when `instanceId` can't be powered on, or null when it can. Only the other powered-on instances are
* counted, so re-saving an instance that is already on never fails.
*/
const powerOnLimitError = (instanceId, owned, allowance) => {
	const othersOn = poweredOnInstances(owned).filter((i) => i.id !== instanceId).length;
	if (othersOn < allowance) return null;
	if (allowance === 0) return `Your account doesn't include any instances yet. Add an instance to your plan to run one.`;
	return `Your plan includes ${plural(allowance)} and ${othersOn} ${othersOn === 1 ? `is` : `are`} already running. Power one off, or add instances to your plan.`;
};

//#endregion
//#region src/lib/handlers/instance/lib/instanceLimits.ts
/** Every instance the user owns, in the shape the limit rules need. */
const ownedInstances = (uid) => $app.findRecordsByFilter("instances", "uid = {:uid}", "", 0, 0, { uid }).map((r) => ({
	id: r.id,
	power: r.getBool("power"),
	suspension: r.getString("suspension"),
	updated: r.getString("updated")
}));
const allowanceOf = (uid) => instanceAllowance({ subscription_quantity: $app.findRecordById("users", uid).getInt("subscription_quantity") });
/** 402 Payment Required: the plan doesn't include another instance. */
const limitError = (message) => new ApiError(402, message, {});
/** Throws 402 when the user already owns every instance their plan includes (archived ones don't count). */
const assertCanCreateInstance = (uid) => {
	const message = createLimitError(ownedInstances(uid), allowanceOf(uid));
	if (message) throw limitError(message);
};
/** Throws 402 when powering on `instanceId` would run more instances than the user's plan includes. */
const assertCanPowerOn = (uid, instanceId) => {
	const message = powerOnLimitError(instanceId, ownedInstances(uid), allowanceOf(uid));
	if (message) throw limitError(message);
};

//#endregion
//#region src/lib/handlers/instance/api/HandleInstanceCreate.ts
/** POST /api/instance. Dashboard (JWT) or a personal access token for all instances with write access. */
const HandleInstanceCreate = (e) => {
	const log = mkLog(`POST:instance`);
	const caller = resolveInstanceCaller(e, { kind: "create" });
	log(`caller`, JSON.stringify(caller));
	log(`TOP OF POST`);
	let data = new DynamicModel({
		subdomain: "",
		version: listSelectableVersions()[0],
		region: "sfo"
	});
	log(`before bind`);
	e.bindBody(data);
	log(`after bind`);
	data = JSON.parse(JSON.stringify(data));
	const { subdomain, version } = data;
	const region = String(data.region || "sfo").trim();
	log(`vars`, JSON.stringify({ subdomain }));
	if (!subdomain) throw new BadRequestError(`Subdomain is required when creating an instance.`);
	const nameError = instanceNameError(subdomain);
	if (nameError) throw new BadRequestError(nameError);
	if (!isAvailable(subdomain)) throw new BadRequestError(`Instance name ${subdomain} is not available.`);
	assertCanCreateInstance(caller.userId);
	if (!isRegionName(region)) throw new BadRequestError(`Unknown region ${region}.`);
	try {
		$app.findRecordById("regions", region);
	} catch {
		throw new BadRequestError(`Unknown region ${region}.`);
	}
	const edges = $app.findRecordsByFilter("edges", "region = {:region}", "", 0, 0, { region }).filter((r) => !!r).map((r) => ({
		id: r.id,
		region: r.getString("region"),
		status: r.getString("status"),
		last_seen: r.getString("last_seen")
	}));
	if (edges.length === 0) throw new BadRequestError(`Unknown region ${region}.`);
	const counts = {};
	for (const edge of edges) counts[edge.id] = $app.countRecords("instances", $dbx.hashExp({ edge: edge.id }));
	const edge = pickEdgeForRegion(edges, counts, region, Date.now());
	if (!edge) throw new BadRequestError(`The ${region} region is temporarily unavailable. Please try again in a minute.`);
	const collection = $app.findCollectionByNameOrId("instances");
	const record = new Record(collection);
	record.set("uid", caller.userId);
	record.set("subdomain", subdomain);
	record.set("power", true);
	record.set("status", "idle");
	record.set("version", version);
	record.set("edge", edge.id);
	record.set("dev", true);
	record.set("syncAdmin", true);
	record.set("autoVacuum", true);
	$app.save(record);
	return e.json(200, { instance: record });
};

//#endregion
//#region src/lib/handlers/instance/api/HandleInstanceDelete.ts
/** DELETE /api/instance/{id}. Dashboard (JWT) or a personal access token with write access to the instance. */
const HandleInstanceDelete = (e) => {
	const log = mkLog(`DELETE:instance`);
	log(`TOP OF DELETE`);
	let data = new DynamicModel({ id: "" });
	e.bindBody(data);
	log(`After bind`);
	data = JSON.parse(JSON.stringify(data));
	const id = e.request.pathValue("id");
	log(`vars`, JSON.stringify({ id }));
	const caller = resolveInstanceCaller(e, {
		kind: "instance",
		instanceId: id
	});
	const record = findOwnedInstance(caller, id);
	log(`caller`, JSON.stringify(caller));
	if (record.getString("status").toLowerCase() !== "idle") throw new BadRequestError(`Instance must be shut down first.`);
	$app.delete(record);
	return e.json(200, { status: "ok" });
};

//#endregion
//#region src/lib/handlers/instance/bootstrap/resetInstancesIdle.ts
const resetInstancesIdle = (app) => {
	const records = app.findRecordsByFilter(`instances`, `status != 'idle'`).filter((r) => !!r);
	let reset = 0;
	for (const record of records) {
		record.set(`status`, `idle`);
		app.save(record);
		reset++;
	}
	return reset;
};

//#endregion
//#region src/lib/handlers/instance/api/HandleInstancesRuntimeReset.ts
const HandleInstancesRuntimeReset = (e) => {
	const reset = resetInstancesIdle($app);
	refreshAndBroadcastLivePlatformStats();
	return e.json(200, {
		ok: true,
		reset
	});
};

//#endregion
//#region src/lib/util/removeEmptyKeys.ts
const removeEmptyKeys = (obj) => Object.fromEntries(Object.entries(obj).filter(([, value]) => value != null));

//#endregion
//#region src/lib/handlers/instance/api/HandleInstanceUpdate.ts
/**
* PUT /api/instance/{id}. Called by the dashboard (JWT) and by the CLI with a personal access token that has write
* access to the instance. Besides the full `secrets` map, accepts `secretsPatch` (`{ KEY: value | null }`) so a token
* can change one secret without reading the others.
*/
const HandleInstanceUpdate = (e) => {
	const log = mkLog(`PUT:instance`);
	log(`TOP OF PUT`);
	const id = e.request.pathValue("id");
	const caller = resolveInstanceCaller(e, {
		kind: "instance",
		instanceId: id
	});
	let data = new DynamicModel({
		id: "",
		fields: {
			subdomain: null,
			power: null,
			version: null,
			secrets: null,
			secretsPatch: null,
			webhooks: null,
			syncAdmin: null,
			autoVacuum: null,
			dev: null,
			cname: null
		}
	});
	e.bindBody(data);
	log(`After bind`);
	data = JSON.parse(JSON.stringify(data));
	const { fields: { subdomain, power, version, secretsPatch, webhooks, syncAdmin, autoVacuum, dev, cname } } = data;
	let { secrets } = data.fields;
	log(`vars`, JSON.stringify({
		id,
		subdomain,
		power,
		version,
		secrets: secrets === null ? null : Object.keys(secrets),
		secretsPatch: secretsPatch === null ? null : Object.keys(secretsPatch),
		webhooks,
		syncAdmin,
		autoVacuum,
		dev,
		cname
	}));
	const record = findOwnedInstance(caller, id);
	log(`caller`, JSON.stringify(caller));
	if (secretsPatch !== null) {
		if (secrets !== null) throw new BadRequestError(`Send either secrets or secretsPatch, not both.`);
		secrets = applySecretsPatch(JSON.parse(record.getString("secrets") || "null") ?? {}, secretsPatch);
	}
	if (secrets !== null) {
		const bad = invalidSecretKey(Object.keys(secrets));
		if (bad !== null) throw new BadRequestError(`Invalid secret name ${bad}: use A-Z, 0-9 and _, starting with a letter.`);
	}
	if (subdomain !== null && subdomain !== record.getString("subdomain")) {
		const nameError = instanceNameError(subdomain);
		if (nameError) throw new BadRequestError(nameError);
		if (!isAvailable(subdomain)) throw new BadRequestError(`Instance name ${subdomain} is not available.`);
	}
	const oldCname = record.getString("cname").trim();
	const newCname = cname !== null ? cname.trim() : null;
	const cnameChanged = newCname !== null && oldCname !== newCname;
	if (newCname !== null && newCname.length > 0) {
		log(`CNAME saved ("${oldCname}" -> "${newCname}") - registering with Cloudflare`);
		if (ensureCustomHostname(newCname, log)) log(`Cloudflare custom hostname ready for "${newCname}" - frontend will poll for health`);
	}
	const recordAutoVacuum = record.getBool("autoVacuum");
	if (subdomain !== null && subdomain !== record.getString("subdomain") || version !== null && version !== record.getString("version") || syncAdmin !== null && syncAdmin !== record.getBool("syncAdmin") || autoVacuum !== null && autoVacuum !== recordAutoVacuum || dev !== null && dev !== record.getBool("dev") || cnameChanged) {
		if (record.getBool("power") || record.getString("status").toLowerCase() !== "idle") throw new BadRequestError(`Instance must be powered off first.`);
	}
	if (power === true && !record.getBool("power")) assertCanPowerOn(caller.userId, id);
	const sanitized = removeEmptyKeys({
		subdomain,
		version,
		power,
		secrets,
		webhooks,
		syncAdmin,
		autoVacuum,
		dev,
		cname
	});
	for (const [key, value] of Object.entries(sanitized)) record.set(key, value);
	$app.save(record);
	return e.json(200, { status: "ok" });
};

//#endregion
//#region src/lib/handlers/instance/bootstrap/HandleInstancesResetIdle.ts
const HandleInstancesResetIdle = (_e) => {
	resetInstancesIdle($app);
	recountLivePlatformStats();
};

//#endregion
//#region src/lib/handlers/instance/bootstrap/HandleMigrateCnamesToDomains.ts
const HandleMigrateCnamesToDomains = (_e) => {
	const log = mkLog(`bootstrap:migrate-cnames`);
	log(`Starting cname to domains migration`);
	try {
		if (!$app.findCollectionByNameOrId("domains")) {
			log(`Domains collection not found, skipping migration`);
			return;
		}
		log(`Checking for instances with cnames`);
		const instancesWithCnames = $app.findRecordsByFilter("instances", "cname != NULL && cname != ''");
		if (instancesWithCnames.length === 0) {
			log(`No cnames to migrate`);
			return;
		}
		log(`Found ${instancesWithCnames.length} instances with cnames`);
		log(`Phase 1: Migrating cnames to domains collection`);
		let cnameMigrated = 0;
		instancesWithCnames.forEach((instance) => {
			if (!instance) return;
			try {
				const cname = instance.getString("cname");
				if (!cname) return;
				const instanceId = instance.id;
				let domainExists = false;
				try {
					$app.findFirstRecordByFilter("domains", `instance = "${instanceId}" && domain = "${cname}"`);
					domainExists = true;
				} catch (e) {}
				if (!domainExists) {
					const domainsCollection = $app.findCollectionByNameOrId("domains");
					const domainRecord = new Record(domainsCollection);
					domainRecord.set("instance", instanceId);
					domainRecord.set("domain", cname);
					domainRecord.set("active", instance.getBool("cname_active"));
					$app.save(domainRecord);
					log(`Created domain record for ${cname}`);
					cnameMigrated++;
				}
			} catch (error) {
				log(`Failed to migrate cname for instance ${instance.id}:`, error);
			}
		});
		log(`Phase 1 complete: migrated ${cnameMigrated} cnames to domains collection`);
		log(`Phase 2: Syncing domains collection with instances.domains arrays`);
		const allDomainRecords = $app.findRecordsByFilter("domains", "1=1");
		log(`Found ${allDomainRecords.length} domain records`);
		let instancesUpdated = 0;
		const domainsByInstance = /* @__PURE__ */ new Map();
		allDomainRecords.forEach((domainRecord) => {
			if (!domainRecord) return;
			const instanceId = domainRecord.getString("instance");
			if (!domainsByInstance.has(instanceId)) domainsByInstance.set(instanceId, []);
			domainsByInstance.get(instanceId).push(domainRecord.id);
		});
		log(`Updating instances.domains arrays`);
		domainsByInstance.forEach((domainIds, instanceId) => {
			try {
				const instance = $app.findRecordById("instances", instanceId);
				if (!instance) return;
				const currentDomains = instance.get("domains") || [];
				log(`Current domains:`, currentDomains);
				const missingIds = domainIds.filter((id) => !currentDomains.includes(id));
				if (missingIds.length > 0) {
					const updatedDomains = [...currentDomains, ...missingIds];
					instance.set("domains", updatedDomains);
					$app.save(instance);
					log(`Updated instance ${instanceId}: added ${missingIds.length} domain IDs to domains array`);
					instancesUpdated++;
				}
			} catch (error) {
				log(`Failed to update domains array for instance ${instanceId}:`, error);
			}
		});
		log(`Phase 2 complete: updated domains arrays for ${instancesUpdated} instances`);
	} catch (error) {
		log(`Error migrating cnames: ${error}`);
	}
};

//#endregion
//#region src/lib/handlers/instance/bootstrap/HandleMigrateInstanceVersions.ts
const HandleMigrateInstanceVersions = (_e) => {
	const log = mkLog(`bootstrap`);
	const versions = listVersions();
	const records = $app.findRecordsByFilter(`instances`, "1=1").filter((r) => !!r);
	const unrecognized = [];
	records.forEach((record) => {
		const v = record.getString("version").trim();
		if (versions.includes(v)) return;
		const newVersion = (() => {
			if (v.startsWith(`~`)) {
				const [major, minor] = v.slice(1).split(".");
				return [
					major,
					minor,
					"*"
				].join(".");
			} else if (v === `^0` || v === `0` || v === "1") return versions[0];
			return v;
		})();
		if (versions.includes(newVersion)) {
			record.set(`version`, newVersion);
			$app.save(record);
		} else unrecognized.push(v);
	});
	log({ unrecognized });
};

//#endregion
//#region src/lib/util/mkAudit.ts
const mkAudit = (log, app) => {
	return (event, note, context) => {
		log(`top of audit`);
		log(`AUDIT:${event}: ${note}`, JSON.stringify({ context }, null, 2));
		app.save(new Record(app.findCollectionByNameOrId("audit"), {
			event,
			note,
			context
		}));
	};
};

//#endregion
//#region src/lib/handlers/instance/model/AfterCreate_notify_discord.ts
const AfterCreate_notify_discord = (e) => {
	const audit = mkAudit(mkLog(`instances:create:discord:notify`), $app);
	const record = e.record;
	if (!record) return;
	const webhookUrl = process.env.DISCORD_STREAM_CHANNEL_URL;
	if (!webhookUrl) return;
	const version = record.get("version");
	try {
		$http.send({
			url: webhookUrl,
			method: "POST",
			body: JSON.stringify({ content: `Someone just created an app running PocketBase v${version}` }),
			headers: { "content-type": "application/json" },
			timeout: 5
		});
	} catch (e) {
		audit(`ERROR`, `Instance creation discord notify failed with ${e}`);
	}
};

//#endregion
//#region src/lib/handlers/instance/model/BeforeCreate_autoVacuum.ts
const BeforeCreate_autoVacuum = (e) => {
	e.record.set("autoVacuum", true);
};

//#endregion
//#region src/lib/handlers/instance/model/BeforeCreate_version.ts
/** New instances must use a selectable (0.23+) version, whichever path creates them. */
const BeforeCreate_version = (e) => {
	const log = mkLog(`BeforeCreate_version`);
	const record = e.record;
	if (!record) return;
	const msg = selectableVersionError(record.get("version"), listSelectableVersions());
	if (msg) {
		log(`[ERROR] ${msg}`);
		throw new BadRequestError(msg);
	}
};

//#endregion
//#region src/lib/handlers/instance/model/BeforeUpdate_cname.ts
const BeforeUpdate_cname = (e) => {
	const log = mkLog(`BeforeUpdate_cname`);
	const record = e.record;
	if (!record) return;
	const id = record.id;
	const newCname = record.get("cname").trim();
	if (newCname.length > 0) {
		const result = new DynamicModel({ id: "" });
		if ((() => {
			try {
				$app.db().newQuery(`select id from instances where cname = {:cname} and id <> {:id}`).bind({
					cname: newCname,
					id
				}).one(result);
			} catch (e) {
				return false;
			}
			return true;
		})()) {
			const msg = `[ERROR] [${id}] Custom domain ${newCname} already in use.`;
			log(`${msg}`);
			throw new BadRequestError(msg);
		}
	}
};

//#endregion
//#region src/lib/handlers/instance/model/BeforeUpdate_version.ts
/** A version change must land on a selectable (0.23+) version. Instances that keep their version are not checked. */
const BeforeUpdate_version = (e) => {
	const log = mkLog(`BeforeUpdate_version`);
	const record = e.record;
	if (!record) return;
	const version = record.get("version");
	if (version === record.original().get("version")) return;
	const msg = selectableVersionError(version, listSelectableVersions());
	if (msg) {
		log(`[ERROR] ${msg}`);
		throw new BadRequestError(msg);
	}
};

//#endregion
//#region src/lib/handlers/instance/model/BeforeUpdateRequest_edge.ts
/**
* Only superusers move an instance to another edge (and so another region) through the records API; customers' instance
* updates never touch `edge`. Moving an instance does not move its data: it stays on the old edge's disk.
*/
const BeforeUpdateRequest_edge = (e) => {
	const record = e.record;
	if (!record || e.hasSuperuserAuth()) return;
	if (record.getString("edge") !== record.original().getString("edge")) throw new ForbiddenError(`Only a superuser can move an instance to another edge.`);
};

//#endregion
//#region ../common/schema/User.ts
const PLAN_NAMES = {
	["legacy"]: "Legacy",
	["free"]: "Hacker",
	["premium"]: `Pay Per PocketBase`,
	["founder"]: `Founder`,
	["flounder"]: `Flounder`
};

//#endregion
//#region ../common/billing/productCatalog.ts
const PRODUCT_CATALOG = {
	"hosting.slot.recurring.month.legacy": {
		legacySubscription: "premium",
		interval: "month",
		quantityFromCheckout: true,
		statusWhenActive: "active",
		cancelable: true
	},
	"hosting.slot.recurring.month": {
		legacySubscription: "premium",
		interval: "month",
		quantityFromCheckout: true,
		statusWhenActive: "active",
		cancelable: true
	},
	"hosting.slot.recurring.year": {
		legacySubscription: "premium",
		interval: "year",
		quantityFromCheckout: true,
		statusWhenActive: "active",
		cancelable: true
	},
	"hosting.slot.lifetime.legacy_flounder": {
		legacySubscription: "flounder",
		interval: "life",
		quantityFromCheckout: false,
		fixedQuantity: 250,
		statusWhenActive: "active",
		cancelable: false
	},
	"hosting.slot.lifetime": {
		legacySubscription: "flounder",
		interval: "life",
		quantityFromCheckout: true,
		statusWhenActive: "active",
		cancelable: false
	},
	"hosting.legacy.unlimited.month": {
		legacySubscription: "premium",
		interval: "month",
		quantityFromCheckout: false,
		fixedQuantity: 250,
		statusWhenActive: "active",
		cancelable: false
	},
	"hosting.legacy.unlimited.year": {
		legacySubscription: "premium",
		interval: "year",
		quantityFromCheckout: false,
		fixedQuantity: 250,
		statusWhenActive: "active",
		cancelable: false
	},
	"hosting.legacy.founder.year": {
		legacySubscription: "founder",
		interval: "year",
		quantityFromCheckout: false,
		fixedQuantity: 250,
		statusWhenActive: "active",
		cancelable: false
	},
	"hosting.legacy.flounder.year": {
		legacySubscription: "flounder",
		interval: "year",
		quantityFromCheckout: false,
		fixedQuantity: 250,
		statusWhenActive: "active",
		cancelable: false
	},
	"hosting.legacy.founder": {
		legacySubscription: "founder",
		interval: "",
		quantityFromCheckout: false,
		statusWhenActive: "grandfathered",
		cancelable: false
	},
	"hosting.legacy.legacy": {
		legacySubscription: "legacy",
		interval: "",
		quantityFromCheckout: false,
		statusWhenActive: "grandfathered",
		cancelable: false
	},
	"hosting.grandfathered.hacker": {
		legacySubscription: "free",
		interval: "",
		quantityFromCheckout: false,
		fixedQuantity: 1,
		statusWhenActive: "grandfathered",
		cancelable: false
	}
};
const isKnownSku = (sku) => Object.prototype.hasOwnProperty.call(PRODUCT_CATALOG, sku);

//#endregion
//#region ../common/lemonSqueezy.ts
/** Lemon Squeezy webhook key: `{product_id}-{variant_id}`. */
/** Legacy $5/mo — webhook/back-compat only (disabled in LS checkout). */
const INSTANCE_MONTHLY_LEGACY_PV_ID = "424532-651625";
/** Legacy $359 Flounder — webhook/back-compat only (disabled in LS checkout). */
const FLOUNDER_LIFETIME_LEGACY_PV_ID = "424532-651627";
/**
* Retired LS products — webhook/reconcile only, never sold again. Ids recovered from git history and the mothership
* audit table (2026-11-06).
*/
/** "idkfa" — 2026 Paywall Pro monthly (250 slots). */
const LEGACY_PAYWALL_PRO_MONTHLY_PV_ID = "424532-651629";
/** 2026 Paywall Pro annual (250 slots). */
const LEGACY_PAYWALL_PRO_ANNUAL_PV_ID = "424532-651634";
/** 2023 PocketHost Pro monthly. */
const LEGACY_PRO_MONTHLY_PV_ID = "159790-200788";
/** 2023 PocketHost Pro annual. */
const LEGACY_PRO_ANNUAL_PV_ID = "159791-200789";
/** 2023 Founder's Edition annual. */
const LEGACY_FOUNDER_ANNUAL_PV_ID = "159792-200790";
/** 2023 Flounder's Edition annual. */
const LEGACY_FLOUNDER_ANNUAL_PV_ID = "367781-547858";
/** 2023 Flounder's Edition lifetime (same 250-slot lifetime as the later "iddqd" variant). */
const LEGACY_FLOUNDER_LIFETIME_2023_PV_ID = "306534-441845";
/** Pay Per PocketBase monthly ($9.99/mo). */
const INSTANCE_MONTHLY_PV_ID = "1192400-1864333";
/** Pay Per PocketBase annual ($59.99/yr). */
const INSTANCE_ANNUAL_PV_ID = "1192404-1864339";
/** Pay Per PocketBase lifetime ($149.99 per slot). */
const INSTANCE_LIFETIME_PV_ID = "1192406-1864341";
const CHECKOUT_PV_IDS = [
	INSTANCE_MONTHLY_PV_ID,
	INSTANCE_ANNUAL_PV_ID,
	INSTANCE_LIFETIME_PV_ID
];
const LEMON_SQUEEZY_PV_IDS = [
	...CHECKOUT_PV_IDS,
	INSTANCE_MONTHLY_LEGACY_PV_ID,
	FLOUNDER_LIFETIME_LEGACY_PV_ID
];
const VARIANT_ID_BY_PV_ID = {
	[INSTANCE_MONTHLY_PV_ID]: "1864333",
	[INSTANCE_ANNUAL_PV_ID]: "1864339",
	[INSTANCE_LIFETIME_PV_ID]: "1864341",
	[INSTANCE_MONTHLY_LEGACY_PV_ID]: "651625",
	[FLOUNDER_LIFETIME_LEGACY_PV_ID]: "651627"
};
const lemonSqueezyVariantId = (pvId) => VARIANT_ID_BY_PV_ID[pvId];

//#endregion
//#region ../common/billing/providerMappings.ts
/**
* Maps an external provider entity to an internal SKU. The key is `{provider}:{externalId}` where `externalId` is the
* Lemon Squeezy `{product_id}-{variant_id}` pv_id.
*/
const SKU_BY_PROVIDER_KEY = {
	[`lemonsqueezy:${INSTANCE_MONTHLY_PV_ID}`]: "hosting.slot.recurring.month",
	[`lemonsqueezy:${INSTANCE_ANNUAL_PV_ID}`]: "hosting.slot.recurring.year",
	[`lemonsqueezy:${INSTANCE_LIFETIME_PV_ID}`]: "hosting.slot.lifetime",
	[`lemonsqueezy:${INSTANCE_MONTHLY_LEGACY_PV_ID}`]: "hosting.slot.recurring.month.legacy",
	[`lemonsqueezy:${FLOUNDER_LIFETIME_LEGACY_PV_ID}`]: "hosting.slot.lifetime.legacy_flounder",
	[`lemonsqueezy:${LEGACY_FLOUNDER_LIFETIME_2023_PV_ID}`]: "hosting.slot.lifetime.legacy_flounder",
	[`lemonsqueezy:${LEGACY_PAYWALL_PRO_MONTHLY_PV_ID}`]: "hosting.legacy.unlimited.month",
	[`lemonsqueezy:${LEGACY_PAYWALL_PRO_ANNUAL_PV_ID}`]: "hosting.legacy.unlimited.year",
	[`lemonsqueezy:${LEGACY_PRO_MONTHLY_PV_ID}`]: "hosting.legacy.unlimited.month",
	[`lemonsqueezy:${LEGACY_PRO_ANNUAL_PV_ID}`]: "hosting.legacy.unlimited.year",
	[`lemonsqueezy:${LEGACY_FOUNDER_ANNUAL_PV_ID}`]: "hosting.legacy.founder.year",
	[`lemonsqueezy:${LEGACY_FLOUNDER_ANNUAL_PV_ID}`]: "hosting.legacy.flounder.year"
};
const providerKey = (provider, externalId) => `${provider}:${externalId}`;
const resolveProviderSku = (provider, externalId) => SKU_BY_PROVIDER_KEY[providerKey(provider, externalId)];

//#endregion
//#region ../common/billing/entitlementFromPvId.ts
/**
* Resolve a Lemon Squeezy pv_id (`{product_id}-{variant_id}`) + checkout quantity into the entitlement to apply.
* Returns undefined for unmapped pv_ids so callers can reject unknown products.
*/
const entitlementFromPvId = (pvId, quantity) => {
	const sku = resolveProviderSku("lemonsqueezy", pvId);
	if (!sku) return void 0;
	const template = PRODUCT_CATALOG[sku];
	const resolvedQuantity = template.quantityFromCheckout ? quantity : template.fixedQuantity ?? 0;
	return {
		product_sku: sku,
		subscription: template.legacySubscription,
		subscription_interval: template.interval,
		subscription_quantity: resolvedQuantity,
		subscription_status: template.statusWhenActive
	};
};

//#endregion
//#region ../common/billing/resolveUserEntitlements.ts
/**
* Infer the SKU from legacy fields. Single source of truth for both the read fallback (here) and the backfill migration
* (Deploy 2).
*/
const skuFromLegacy = (subscription, interval, quantity) => {
	switch (subscription) {
		case "premium":
			if (interval === "year") return "hosting.slot.recurring.year";
			if (interval === "life") return "hosting.slot.lifetime";
			return "hosting.slot.recurring.month.legacy";
		case "flounder": return "hosting.slot.lifetime.legacy_flounder";
		case "founder": return "hosting.legacy.founder";
		case "legacy": return "hosting.legacy.legacy";
		case "free": return quantity > 0 ? "hosting.grandfathered.hacker" : "";
		default: return "";
	}
};
const resolveUserEntitlements = (user) => {
	const legacySubscription = `${user.subscription ?? ""}`;
	const interval = `${user.subscription_interval ?? ""}`;
	const slotCount = user.subscription_quantity ?? 0;
	const storedSku = user.product_sku;
	const sku = storedSku && isKnownSku(storedSku) ? storedSku : skuFromLegacy(user.subscription, user.subscription_interval, slotCount);
	const template = sku ? PRODUCT_CATALOG[sku] : void 0;
	const status = (() => {
		if (user.subscription_status === "active" || user.subscription_status === "lapsed" || user.subscription_status === "grandfathered") return user.subscription_status;
		if (template) return template.statusWhenActive === "grandfathered" ? "grandfathered" : "active";
		return "lapsed";
	})();
	const hasHostingAccess = slotCount > 0;
	const isGrandfathered = sku === "hosting.grandfathered.hacker";
	return {
		sku,
		status,
		slotCount,
		interval,
		hasHostingAccess,
		hasSubscriberFeatures: hasHostingAccess,
		isPaidSubscriber: status === "active" && legacySubscription === "premium",
		isGrandfathered,
		isCancelableMonthly: !!template && template.cancelable && interval === "month" && hasHostingAccess,
		displayPlanName: PLAN_NAMES[legacySubscription] ?? PLAN_NAMES["free"]
	};
};

//#endregion
//#region ../common/billing/billingItems.ts
/** LS subscription statuses that still grant access. `cancelled` = cancelled but paid through `ends_at`. */
const ACTIVE_SUBSCRIPTION_STATUSES = [
	"on_trial",
	"active",
	"past_due",
	"cancelled"
];
/** LS order statuses that still grant access (lifetime purchases). */
const ACTIVE_ORDER_STATUSES = ["paid", "partial_refund"];
const isBillingItemActive = (item, now) => {
	switch (item.kind) {
		case "subscription":
			if (!ACTIVE_SUBSCRIPTION_STATUSES.includes(item.status)) return false;
			if (item.status === "cancelled" && item.ends_at) {
				const ends = new Date(item.ends_at);
				if (!isNaN(ends.getTime()) && ends.getTime() <= now.getTime()) return false;
			}
			return true;
		case "order": return ACTIVE_ORDER_STATUSES.includes(item.status);
		case "manual":
			if (item.status !== "active") return false;
			if (item.ends_at) {
				const ends = new Date(item.ends_at);
				if (!isNaN(ends.getTime()) && ends.getTime() <= now.getTime()) return false;
			}
			return true;
		default: return false;
	}
};
/**
* When a user holds several SKUs, this decides which one drives the legacy `subscription` / `subscription_interval`
* fields (plan label, cancel button). Recurring monthly first so the in-app cancel flow stays reachable.
*/
const SKU_PRIORITY = [
	"hosting.slot.recurring.month",
	"hosting.slot.recurring.month.legacy",
	"hosting.slot.recurring.year",
	"hosting.legacy.unlimited.month",
	"hosting.legacy.unlimited.year",
	"hosting.legacy.founder.year",
	"hosting.legacy.flounder.year",
	"hosting.slot.lifetime",
	"hosting.slot.lifetime.legacy_flounder",
	"hosting.legacy.founder",
	"hosting.legacy.legacy",
	"hosting.grandfathered.hacker"
];
/**
* Legacy "unlimited" accounts store int32 max as their slot count. Totals are capped there so stacking another purchase
* on top neither overflows nor changes anything.
*/
const UNLIMITED_SLOTS = 2147483647;
const LAPSED_ENTITLEMENT = {
	product_sku: "",
	subscription: "free",
	subscription_interval: "",
	subscription_quantity: 0,
	subscription_status: "lapsed"
};
/** Sum every active item into the fields written to the `users` record. */
const reconcileEntitlement = (items, now) => {
	const active = items.filter((i) => isBillingItemActive(i, now) && isKnownSku(i.sku) && i.quantity > 0);
	if (active.length === 0) return LAPSED_ENTITLEMENT;
	const primary = [...active].sort((a, b) => SKU_PRIORITY.indexOf(a.sku) - SKU_PRIORITY.indexOf(b.sku))[0];
	const template = PRODUCT_CATALOG[primary.sku];
	const quantity = Math.min(active.reduce((sum, i) => sum + i.quantity, 0), UNLIMITED_SLOTS);
	const anyPaid = active.some((i) => PRODUCT_CATALOG[i.sku].statusWhenActive === "active");
	return {
		product_sku: primary.sku,
		subscription: template.legacySubscription,
		subscription_interval: template.interval,
		subscription_quantity: quantity,
		subscription_status: anyPaid ? "active" : "grandfathered"
	};
};
/** SKUs that never come from Lemon Squeezy, so a fresh LS sync cannot rediscover them. */
const NON_LS_SKUS = [
	"hosting.legacy.founder",
	"hosting.legacy.legacy",
	"hosting.grandfathered.hacker"
];
/**
* Pre-`billing_items` accounts on a non-LS plan (founder / legacy / grandfathered hacker) keep that entitlement as a
* manual row so a later LS purchase adds to it instead of replacing it.
*/
const baselineExternalId = (userId) => `baseline:${userId}`;
/** True for a manual baseline row (current per-user key, or the buggy pre-fix per-SKU key). */
const isBaselineExternalId = (externalId) => externalId.startsWith("baseline:");
const baselineItemFromUser = (user, userId) => {
	const resolved = resolveUserEntitlements(user);
	if (!resolved.sku || !NON_LS_SKUS.includes(resolved.sku) || resolved.slotCount <= 0) return void 0;
	return {
		provider: "manual",
		kind: "manual",
		external_id: baselineExternalId(userId),
		sku: resolved.sku,
		quantity: resolved.slotCount,
		status: "active"
	};
};
const pvIdOf = (attrs) => `${attrs.product_id ?? ""}-${attrs.variant_id ?? ""}`;
const isRecurringSku = (sku) => {
	const interval = PRODUCT_CATALOG[sku].interval;
	return interval === "month" || interval === "year";
};
/** Map an LS subscription to a billing item. Undefined for unmapped variants. */
/**
* Whether an LS subscription resource carries its product and variant. During checkout LS sends an early
* `subscription_updated` for the new subscription with product, variant and order still null; the full subscription
* must be fetched (or the event skipped) instead of treating it as an unknown variant.
*/
const isCompleteLsSubscription = (sub) => !!sub && !!sub.attributes?.product_id && !!sub.attributes?.variant_id;
/** LS dispute events (chargebacks): alerted, not applied to billing. */
const isLsDisputeEvent = (eventName) => !!eventName && eventName.startsWith("dispute_");
/** One-line Discord summary of an LS dispute event, from whatever fields the payload carries. */
const lsDisputeSummary = (eventName, data) => {
	const a = data?.attributes || {};
	const amount = typeof a.amount === "number" ? `${(a.amount / 100).toFixed(2)} ${`${a.currency || ""}`.toUpperCase()}`.trim() : a.amount_formatted || "";
	return [
		`Lemon Squeezy ${eventName.replace("_", " ")}`,
		data?.id !== void 0 ? `#${data.id}` : "",
		a.order_id ? `order ${a.order_id}` : "",
		amount,
		a.status ? `status ${a.status}` : "",
		a.reason ? `reason: ${a.reason}` : "",
		a.user_email ? `(${a.user_email})` : ""
	].filter(Boolean).join(" · ");
};
const billingItemFromLsSubscription = (sub) => {
	const attrs = sub.attributes || {};
	const entitlement = entitlementFromPvId(pvIdOf(attrs), attrs.first_subscription_item?.quantity || 1);
	if (!entitlement) return void 0;
	return {
		provider: "lemonsqueezy",
		kind: "subscription",
		external_id: `${sub.id}`,
		sku: entitlement.product_sku,
		quantity: entitlement.subscription_quantity,
		status: `${attrs.status || ""}`,
		ends_at: attrs.ends_at || void 0,
		renews_at: attrs.renews_at || void 0,
		variant_id: `${attrs.variant_id ?? ""}`,
		product_name: attrs.product_name || "",
		variant_name: attrs.variant_name || ""
	};
};
/**
* Map an LS order to a billing item. Only one-time (lifetime) purchases become order items — recurring orders are
* represented by their subscription. Undefined for recurring or unmapped variants.
*/
const billingItemFromLsOrder = (order) => {
	const item = order.attributes?.first_order_item;
	if (!item) return void 0;
	const entitlement = entitlementFromPvId(pvIdOf(item), item.quantity || 1);
	if (!entitlement || isRecurringSku(entitlement.product_sku)) return void 0;
	return {
		provider: "lemonsqueezy",
		kind: "order",
		external_id: `${order.id}`,
		sku: entitlement.product_sku,
		quantity: entitlement.subscription_quantity,
		status: `${order.attributes?.status || ""}`,
		variant_id: `${item.variant_id ?? ""}`,
		product_name: item.product_name || "",
		variant_name: item.variant_name || ""
	};
};
/** True when an LS order's product is a recurring plan (its slots live on the subscription, not the order). */
const isRecurringLsOrder = (order) => {
	const item = order.attributes?.first_order_item;
	if (!item) return false;
	const entitlement = entitlementFromPvId(pvIdOf(item), 1);
	return !!entitlement && isRecurringSku(entitlement.product_sku);
};

//#endregion
//#region src/lib/handlers/lemon/lib/lsApi.ts
/** Overridable for local testing against a mock; production uses the real API. */
const LS_API = process.env.LS_API_BASE || `https://api.lemonsqueezy.com/v1`;
const lsApiKey = () => {
	const apiKey = process.env.LS_API_KEY || $os.getenv(`LS_API_KEY`);
	if (!apiKey) throw new BadRequestError(`Billing is not configured (set LS_API_KEY on mothership)`);
	return apiKey;
};
const headers = (apiKey) => ({
	Authorization: `Bearer ${apiKey}`,
	Accept: `application/vnd.api+json`,
	"Content-Type": `application/vnd.api+json`
});
const errorDetail = (json) => json?.errors?.[0]?.detail || json?.errors?.[0]?.title || JSON.stringify(json);
const lsRequest = (method, url, body) => {
	const res = $http.send({
		url: url.startsWith("http") ? url : `${LS_API}${url}`,
		method,
		headers: headers(lsApiKey()),
		body: body === void 0 ? "" : JSON.stringify(body),
		timeout: 30
	});
	if (res.statusCode < 200 || res.statusCode >= 300) throw new BadRequestError(`Lemon Squeezy ${method} ${url} failed (${res.statusCode}): ${errorDetail(res.json)}`);
	return res.json;
};
/** GET a paginated LS list endpoint and return every `data` entry. */
const lsListAll = (path) => {
	const out = [];
	let url = `${path}${path.includes("?") ? "&" : "?"}page[size]=100`;
	for (let guard = 0; url && guard < 50; guard++) {
		const json = lsRequest(`GET`, url);
		out.push(...json?.data || []);
		url = json?.links?.next || void 0;
	}
	return out;
};
const lsSubscriptionsByEmail = (email) => lsListAll(`/subscriptions?filter[user_email]=${encodeURIComponent(email)}`);
const lsOrdersByEmail = (email) => lsListAll(`/orders?filter[user_email]=${encodeURIComponent(email)}`);
const lsSubscriptionsByOrderId = (orderId) => lsListAll(`/subscriptions?filter[order_id]=${encodeURIComponent(`${orderId}`)}`);
const lsSubscription = (subscriptionId) => lsRequest(`GET`, `/subscriptions/${encodeURIComponent(`${subscriptionId}`)}`)?.data;
/** Cancel at period end. Returns the updated subscription resource. */
const lsCancelSubscription = (subscriptionId) => lsRequest(`DELETE`, `/subscriptions/${encodeURIComponent(`${subscriptionId}`)}`)?.data;

//#endregion
//#region src/lib/handlers/lemon/lib/billingStore.ts
const COLLECTION = `billing_items`;
/** PB stores dates as `2026-12-01 00:00:00.000Z`; normalize to ISO so Goja's Date parses it. */
const isoOrUndefined = (value) => value ? value.replace(" ", "T") : void 0;
const toItem = (rec) => ({
	provider: rec.getString(`provider`),
	kind: rec.getString(`kind`),
	external_id: rec.getString(`external_id`),
	sku: rec.getString(`sku`),
	quantity: rec.getInt(`quantity`),
	status: rec.getString(`status`),
	ends_at: isoOrUndefined(rec.getString(`ends_at`)),
	renews_at: isoOrUndefined(rec.getString(`renews_at`)),
	variant_id: rec.getString(`variant_id`),
	product_name: rec.getString(`product_name`),
	variant_name: rec.getString(`variant_name`)
});
const findBillingItemRecord = (app, item) => {
	try {
		return app.findFirstRecordByFilter(COLLECTION, `provider = {:provider} && kind = {:kind} && external_id = {:external_id}`, {
			provider: item.provider,
			kind: item.kind,
			external_id: item.external_id
		});
	} catch {
		return;
	}
};
const loadBillingItemRecords = (app, userId) => app.findRecordsByFilter(COLLECTION, `user = {:user}`, `created`, 0, 0, { user: userId }).filter((r) => !!r);
const loadBillingItems = (app, userId) => loadBillingItemRecords(app, userId).map(toItem);
const storedOrderId = (rec) => {
	try {
		return `${JSON.parse(rec.getString(`provider_data`) || `null`)?.order_id ?? ""}`;
	} catch {
		return ``;
	}
};
/** Every Lemon Squeezy row, with the user it is currently on (and, for subscriptions, the order that started it). */
const loadAllLsBillingItems = (app) => app.findRecordsByFilter(COLLECTION, `provider = 'lemonsqueezy'`, `created`, 0, 0).filter((r) => !!r).map((r) => ({
	userId: r.getString(`user`),
	item: toItem(r),
	orderId: r.getString(`kind`) === `subscription` ? storedOrderId(r) : ``
}));
/**
* Insert or update one billing item. When `providerUpdatedAt` is given and the stored row is newer, the write is
* skipped so out-of-order webhooks cannot roll state back.
*/
const upsertBillingItem = (app, userId, item, options = {}) => {
	const existing = findBillingItemRecord(app, item);
	if (existing && options.providerUpdatedAt) {
		const stored = (() => {
			try {
				return JSON.parse(existing.getString(`provider_data`) || `null`)?.updated_at;
			} catch {
				return;
			}
		})();
		if (stored && new Date(stored).getTime() > new Date(options.providerUpdatedAt).getTime()) return {
			record: existing,
			skipped: true
		};
	}
	const rec = existing || new Record(app.findCollectionByNameOrId(COLLECTION));
	rec.set(`user`, userId);
	rec.set(`provider`, item.provider);
	rec.set(`kind`, item.kind);
	rec.set(`external_id`, item.external_id);
	rec.set(`sku`, item.sku);
	rec.set(`quantity`, item.quantity);
	rec.set(`status`, item.status);
	rec.set(`ends_at`, item.ends_at || ``);
	rec.set(`renews_at`, item.renews_at || ``);
	rec.set(`variant_id`, item.variant_id || ``);
	rec.set(`product_name`, item.product_name || ``);
	rec.set(`variant_name`, item.variant_name || ``);
	if (options.note !== void 0) rec.set(`note`, options.note);
	if (options.providerData !== void 0) rec.set(`provider_data`, options.providerData);
	app.save(rec);
	return {
		record: rec,
		skipped: false
	};
};
const upsertLsSubscription = (app, userId, sub) => {
	const item = billingItemFromLsSubscription(sub);
	if (!item) throw new Error(`Unknown Lemon Squeezy variant on subscription ${sub.id}`);
	const attrs = sub.attributes || {};
	return {
		item,
		...upsertBillingItem(app, userId, item, {
			providerData: attrs,
			providerUpdatedAt: attrs.updated_at
		})
	};
};
/** Pull every LS subscription + lifetime order for the user's email and upsert them. */
const lc$2 = (s) => `${s ?? ""}`.trim().toLowerCase();
const readBillingLinks = (userRec) => {
	try {
		return JSON.parse(userRec.getString(`billing_links`) || `null`) || {};
	} catch {
		return {};
	}
};
/** Every email this user has bought under on Lemon Squeezy: the account email plus recorded alternates. */
const lsEmailsFor = (userRec) => {
	const alt = readBillingLinks(userRec)?.lemonsqueezy?.emails || [];
	return [...new Set([lc$2(userRec.getString(`email`)), ...alt.map(lc$2)])].filter(Boolean);
};
/**
* Record LS checkout emails that differ from the account email. Only call with emails tied to this user by checkout
* `custom_data.user_id` (or an existing billing item), never by email lookup. Returns true when something was added.
*/
const rememberLsEmails = (app, userRec, emails) => {
	const known = lsEmailsFor(userRec);
	const add = emails.map(lc$2).filter((e) => e && !known.includes(e));
	if (!add.length) return false;
	const links = readBillingLinks(userRec);
	links.lemonsqueezy = links.lemonsqueezy || {};
	links.lemonsqueezy.emails = [...new Set([...(links.lemonsqueezy.emails || []).map(lc$2), ...add])];
	userRec.set(`billing_links`, links);
	app.saveNoValidate(userRec);
	return true;
};
const syncUserFromLemonSqueezy = (app, userRec, dryRun = false) => {
	const report = {
		subscriptions: 0,
		orders: 0,
		unknown: []
	};
	const items = [];
	for (const email of lsEmailsFor(userRec)) {
		for (const sub of lsSubscriptionsByEmail(email)) {
			const item = billingItemFromLsSubscription(sub);
			if (!item) {
				report.unknown.push(`subscription:${sub.id}:${sub.attributes?.variant_name || "?"}`);
				continue;
			}
			items.push({
				item,
				providerData: sub.attributes
			});
			report.subscriptions++;
		}
		for (const order of lsOrdersByEmail(email)) {
			const item = billingItemFromLsOrder(order);
			if (!item) continue;
			items.push({
				item,
				providerData: order.attributes
			});
			report.orders++;
		}
	}
	if (!dryRun) for (const { item, providerData } of items) upsertBillingItem(app, userRec.id, item, { providerData });
	return {
		report,
		items: items.map((i) => i.item)
	};
};
const userEntitlementFields = (userRec) => ({
	subscription: userRec.getString(`subscription`),
	subscription_interval: userRec.getString(`subscription_interval`),
	subscription_quantity: userRec.getInt(`subscription_quantity`),
	product_sku: userRec.getString(`product_sku`),
	subscription_status: userRec.getString(`subscription_status`)
});
/**
* Make sure a user with a non-LS plan (founder / legacy / grandfathered hacker) has their own baseline row. Also
* re-keys a row left by the pre-fix bug, where every user shared one `baseline:<sku>` row. Returns true if a row was
* written.
*/
const ensureBaseline = (app, userRec, records = loadBillingItemRecords(app, userRec.id)) => {
	const own = records.find((r) => r.getString(`kind`) === `manual` && isBaselineExternalId(r.getString(`external_id`)));
	if (own) {
		if (own.getString(`external_id`) !== baselineExternalId(userRec.id)) {
			own.set(`external_id`, baselineExternalId(userRec.id));
			app.save(own);
		}
		return false;
	}
	const baseline = baselineItemFromUser(userEntitlementFields(userRec), userRec.id);
	if (!baseline) return false;
	upsertBillingItem(app, userRec.id, baseline, { note: `Pre-billing_items entitlement snapshot` });
	return true;
};
/**
* Before applying an LS event: keep the user's non-LS baseline, and the first time we see them pull their existing LS
* purchases, so the event adds to — rather than replaces — what they have.
*/
const ensureUserBootstrapped = (app, userRec) => {
	const records = loadBillingItemRecords(app, userRec.id);
	ensureBaseline(app, userRec, records);
	if (records.some((r) => r.getString(`provider`) === `lemonsqueezy`)) return false;
	syncUserFromLemonSqueezy(app, userRec);
	return true;
};
const applyEntitlement = (userRec, e) => {
	userRec.set(`subscription`, e.subscription);
	userRec.set(`subscription_interval`, e.subscription_interval);
	userRec.set(`subscription_quantity`, e.subscription_quantity);
	userRec.set(`product_sku`, e.product_sku);
	userRec.set(`subscription_status`, e.subscription_status);
};
/** Recompute the user's entitlement from all billing items and save it. */
const reconcileUser = (app, userRec, items = loadBillingItems(app, userRec.id)) => {
	const before = userRec.getInt(`subscription_quantity`);
	const entitlement = reconcileEntitlement(items, /* @__PURE__ */ new Date());
	applyEntitlement(userRec, entitlement);
	if (items.some((i) => i.provider === `lemonsqueezy`)) userRec.set(`billing_provider`, `lemonsqueezy`);
	app.saveNoValidate(userRec);
	return {
		before,
		after: entitlement.subscription_quantity,
		entitlement
	};
};

//#endregion
//#region src/lib/handlers/lemon/api/HandleLemonSqueezyCancel.ts
const CANCELABLE_SKUS = [`hosting.slot.recurring.month`, `hosting.slot.recurring.month.legacy`];
/**
* Cancel the authenticated user's monthly membership at period end.
*
* Body (optional): `{ "itemId": "<billing_items id>" }` cancels one subscription. Without it, every active monthly
* subscription on the account is cancelled — users can hold several (e.g. PayPal subscriptions that could not change
* quantity), and "cancel membership" means all of them.
*/
const HandleLemonSqueezyCancel = (e) => {
	const log = mkLog(`ls-cancel`);
	const audit = mkAudit(log, $app);
	try {
		const authRecord = e.auth;
		if (!authRecord) throw new UnauthorizedError(`Authentication required`);
		const itemId = (() => {
			try {
				return `${JSON.parse(readerToString(e.request.body) || "{}")?.itemId || ""}`.trim();
			} catch {
				return ``;
			}
		})();
		const userRec = $app.findRecordById(`users`, authRecord.id);
		ensureUserBootstrapped($app, userRec);
		const now = /* @__PURE__ */ new Date();
		const targets = loadBillingItemRecords($app, userRec.id).filter((rec) => {
			if (itemId && rec.id !== itemId) return false;
			return rec.getString(`provider`) === `lemonsqueezy` && rec.getString(`kind`) === `subscription` && CANCELABLE_SKUS.includes(rec.getString(`sku`)) && rec.getString(`status`) !== `cancelled` && isBillingItemActive({
				kind: `subscription`,
				status: rec.getString(`status`)
			}, now);
		});
		if (targets.length === 0) throw new BadRequestError(`No cancellable membership on this account`);
		const cancelled = [];
		for (const rec of targets) {
			const subscriptionId = rec.getString(`external_id`);
			const sub = lsCancelSubscription(subscriptionId);
			upsertLsSubscription($app, userRec.id, sub);
			cancelled.push({
				itemId: rec.id,
				subscriptionId,
				endsAt: sub.attributes?.ends_at || null
			});
		}
		reconcileUser($app, userRec);
		const endsAt = cancelled.map((c) => c.endsAt).filter((d) => !!d).sort().pop() || null;
		log(`subscriptions cancelled`, userRec.id, JSON.stringify(cancelled));
		audit(`LS`, `Membership cancelled via dashboard.`, {
			user_id: userRec.id,
			cancelled,
			ends_at: endsAt
		});
		return e.json(200, {
			status: `cancelled`,
			endsAt,
			cancelled
		});
	} catch (err) {
		log(`${err}`);
		throw err;
	}
};

//#endregion
//#region src/lib/handlers/lemon/api/HandleLemonSqueezyCheckout.ts
const HandleLemonSqueezyCheckout = (e) => {
	const log = mkLog(`ls-checkout`);
	try {
		const authRecord = e.auth;
		if (!authRecord) throw new UnauthorizedError(`Authentication required`);
		const apiKey = process.env.LS_API_KEY || $os.getenv(`LS_API_KEY`);
		const storeId = process.env.LS_STORE_ID || $os.getenv(`LS_STORE_ID`);
		if (!apiKey || !storeId) throw new BadRequestError(`Checkout is not configured (set LS_API_KEY and LS_STORE_ID on mothership)`);
		const pvId = `${(() => {
			try {
				return JSON.parse(readerToString(e.request.body));
			} catch {
				throw new BadRequestError(`Invalid JSON body`);
			}
		})().pvId || ""}`.trim();
		if (!pvId) throw new BadRequestError(`pvId is required`);
		const variantId = lemonSqueezyVariantId(pvId);
		if (!variantId) throw new BadRequestError(`Unknown plan: ${pvId}`);
		const email = authRecord.get(`email`);
		const userId = authRecord.id;
		const res = $http.send({
			url: `https://api.lemonsqueezy.com/v1/checkouts`,
			method: `POST`,
			headers: {
				Authorization: `Bearer ${apiKey}`,
				Accept: `application/vnd.api+json`,
				"Content-Type": `application/vnd.api+json`
			},
			body: JSON.stringify({ data: {
				type: `checkouts`,
				attributes: { checkout_data: {
					email,
					custom: { user_id: userId }
				} },
				relationships: {
					store: { data: {
						type: `stores`,
						id: storeId
					} },
					variant: { data: {
						type: `variants`,
						id: variantId
					} }
				}
			} }),
			timeout: 30
		});
		if (res.statusCode < 200 || res.statusCode >= 300) {
			const detail = res.json?.errors?.[0]?.detail || res.json?.errors?.[0]?.title || JSON.stringify(res.json);
			log(`LS checkout failed`, res.statusCode, detail);
			throw new BadRequestError(`Could not create checkout session: ${detail}`);
		}
		const url = res.json?.data?.attributes?.url;
		if (!url) throw new Error(`No checkout URL in Lemon Squeezy response`);
		log(`checkout created`, userId, pvId);
		return e.json(200, { url });
	} catch (err) {
		log(`${err}`);
		throw err;
	}
};

//#endregion
//#region ../common/billing/lsClaims.ts
const str = (v) => `${v ?? ""}`.trim();
const lc$1 = (v) => str(v).toLowerCase();
const lsResourceKey = (kind, id) => str(id) ? `${kind}:${str(id)}` : void 0;
/** Key for a billing item, or undefined when it is not a Lemon Squeezy row. */
const lsResourceKeyOfItem = (item) => {
	if (item.provider !== "lemonsqueezy") return void 0;
	if (item.kind !== "subscription" && item.kind !== "order") return void 0;
	return lsResourceKey(item.kind, item.external_id);
};
/** The subscription / order a webhook payload's `data` is about. */
const lsResourceKeyOfWebhookData = (data) => {
	switch (data?.type) {
		case "orders": return lsResourceKey("order", data.id);
		case "subscriptions": return lsResourceKey("subscription", data.id);
		case "subscription-invoices": return lsResourceKey("subscription", data.attributes?.subscription_id);
		default: return;
	}
};
/**
* Build claims from parsed audit `context` values. Only records tied by checkout `custom_data.user_id` count; ones the
* old handler matched by email (`user_id_source: 'email'`) never do.
*/
const lsClaimsFromAudit = (contexts) => {
	const owners = {};
	const conflicted = {};
	const emails = {};
	for (const raw of contexts) {
		const c = raw;
		if (!c || typeof c !== "object" || c.user_id_source === "email") continue;
		const userId = str(c.data?.meta?.custom_data?.user_id);
		if (!userId) continue;
		const email = lc$1(c.data?.data?.attributes?.user_email);
		if (email) (emails[userId] = emails[userId] || {})[email] = true;
		const key = lsResourceKeyOfWebhookData(c.data?.data);
		if (!key || conflicted[key]) continue;
		if (owners[key] && owners[key] !== userId) {
			conflicted[key] = true;
			delete owners[key];
			continue;
		}
		owners[key] = userId;
	}
	const emailLists = {};
	for (const userId of Object.keys(emails)) emailLists[userId] = Object.keys(emails[userId]);
	return {
		owners,
		emails: emailLists,
		conflicts: Object.keys(conflicted)
	};
};
/**
* Extend claims to subscriptions through the order that started them. Checkout webhooks for a new subscription are
* usually logged as `order_created` (keyed by order ID), while the billing row is keyed by subscription ID; LS links
* them via the subscription's `order_id`. A subscription claimed directly by a different user becomes a conflict.
* Returns a new claims object; the input is not changed.
*/
const claimSubscriptionsByOrder = (claims, links) => {
	const owners = { ...claims.owners };
	const conflicted = {};
	for (const key of claims.conflicts) conflicted[key] = true;
	for (const link of links) {
		const subKey = lsResourceKey("subscription", link.subscriptionId);
		const orderKey = lsResourceKey("order", link.orderId);
		if (!subKey || !orderKey || conflicted[subKey]) continue;
		const buyer = claims.owners[orderKey];
		if (!buyer) continue;
		if (owners[subKey] && owners[subKey] !== buyer) {
			conflicted[subKey] = true;
			delete owners[subKey];
			continue;
		}
		owners[subKey] = buyer;
	}
	return {
		owners,
		emails: claims.emails,
		conflicts: Object.keys(conflicted)
	};
};

//#endregion
//#region src/lib/handlers/lemon/lib/runReconcile.ts
const listAll = (path) => {
	const out = [];
	let url = `${path}&page[size]=100`;
	for (let guard = 0; url && guard < 500; guard++) {
		const json = lsRequest(`GET`, url);
		out.push(...json?.data || []);
		url = json?.links?.next || void 0;
	}
	return out;
};
const keyOf = (i) => `${i.provider}:${i.kind}:${i.external_id}`;
const lc = (s) => `${s ?? ""}`.trim().toLowerCase();
const PRESERVE_PREFIX = `preserve:`;
const isPreserve = (i) => i.kind === `manual` && i.external_id.startsWith(PRESERVE_PREFIX);
const userFields = (rec) => ({
	subscription: rec.getString(`subscription`),
	subscription_interval: rec.getString(`subscription_interval`),
	subscription_quantity: rec.getInt(`subscription_quantity`),
	product_sku: rec.getString(`product_sku`),
	subscription_status: rec.getString(`subscription_status`)
});
/** Parsed `context` of every LS webhook audit record. */
const lsAuditContexts = () => {
	const out = [];
	for (const rec of $app.findRecordsByFilter(`audit`, `event ~ 'LS'`, ``, 0, 0)) {
		if (!rec) continue;
		try {
			out.push(JSON.parse(rec.getString(`context`) || `null`));
		} catch {}
	}
	return out;
};
/**
* Rebuild `billing_items` from Lemon Squeezy and recompute users' slots.
*
* A purchase belongs to the user its checkout named (`custom_data.user_id`, learned from old webhook audit records),
* matched by LS subscription / order ID, so it is found even after the customer changes their email in Lemon Squeezy,
* and it never goes to a different account that happens to share an email. Purchases no checkout ties to anyone are
* matched by email: the account email plus alternate LS emails (recorded in `billing_links` or seen on old checkouts).
*
* Slots are what verified LS purchases plus any founder/legacy/grandfathered baseline support. `preserve:<id>` rows
* from the one-time backfill are released in normal runs: if Lemon Squeezy can't show a payment, the slots go (to 0 if
* nothing else applies, which stops the account's instances) and the customer can contact support.
*/
const runReconcile = (opts = {}) => {
	const apply = !!opts.apply;
	const backfill = !!opts.backfill;
	const maxReductions = opts.maxReductions ?? 25;
	const storeId = process.env.LS_STORE_ID || $os.getenv(`LS_STORE_ID`);
	if (!storeId) throw new BadRequestError(`LS_STORE_ID is not set`);
	const onlyUser = opts.onlyUserId ? $app.findRecordById(`users`, opts.onlyUserId) : void 0;
	const auditClaims = lsClaimsFromAudit(lsAuditContexts());
	/** Extended below with subscriptions claimed through the order that started them. */
	let claims = auditClaims;
	const auditAlt = auditClaims.emails;
	const emailsOf = (rec) => [...new Set([...lsEmailsFor(rec), ...auditAlt[rec.id] || []])];
	const existsCache = {};
	const userExists = (id) => {
		if (!(id in existsCache)) try {
			$app.findRecordById(`users`, id);
			existsCache[id] = true;
		} catch {
			existsCache[id] = false;
		}
		return existsCache[id];
	};
	/** The user a checkout ties this LS resource to, if that account still exists. */
	const ownerOf = (key) => {
		const owner = key ? claims.owners[key] : void 0;
		return owner && userExists(owner) ? owner : void 0;
	};
	let ownedBy = {};
	const indexOwners = () => {
		ownedBy = {};
		for (const key of Object.keys(claims.owners)) {
			const userId = claims.owners[key];
			(ownedBy[userId] = ownedBy[userId] || []).push(key);
		}
	};
	indexOwners();
	const byEmail = {};
	const byKey = {};
	const unknown = [];
	const unknownOrders = [];
	const idFetchErrors = [];
	let lsSubscriptionsSeen = 0;
	const push = (email, found) => {
		const k = lc(email);
		(byEmail[k] = byEmail[k] || []).push(found);
		const resourceKey = lsResourceKeyOfItem(found.item);
		if (resourceKey) byKey[resourceKey] = found;
	};
	const scopes = onlyUser ? emailsOf(onlyUser).map((em) => `&filter[user_email]=${encodeURIComponent(em)}`) : [``];
	for (const scope of scopes) {
		for (const sub of listAll(`/subscriptions?filter[store_id]=${storeId}${scope}`)) {
			lsSubscriptionsSeen++;
			const a = sub.attributes || {};
			const item = billingItemFromLsSubscription(sub);
			if (!item) {
				unknown.push(`subscription ${sub.id} ${a.user_email} ${a.product_name} - ${a.variant_name} (${a.status})`);
				continue;
			}
			push(`${a.user_email || ""}`, {
				item,
				providerData: a
			});
		}
		for (const order of listAll(`/orders?filter[store_id]=${storeId}${scope}`)) {
			const a = order.attributes || {};
			const item = billingItemFromLsOrder(order);
			if (!item) {
				if (!isRecurringLsOrder(order)) {
					const i = a.first_order_item || {};
					unknownOrders.push(`order ${order.id} ${a.user_email} ${i.product_id}-${i.variant_id} ${i.product_name} - ${i.variant_name} (${a.status})`);
				}
				continue;
			}
			push(`${a.user_email || ""}`, {
				item,
				providerData: a
			});
		}
	}
	if (!onlyUser && lsSubscriptionsSeen === 0) throw new Error(`Lemon Squeezy returned no subscriptions for store ${storeId}; refusing to reconcile`);
	const holders = {};
	const subscriptionOrders = [];
	for (const row of loadAllLsBillingItems($app)) {
		const key = lsResourceKeyOfItem(row.item);
		if (key) holders[key] = row;
		if (row.item.kind === `subscription` && row.orderId) subscriptionOrders.push({
			subscriptionId: row.item.external_id,
			orderId: row.orderId
		});
	}
	for (const found of Object.values(byKey)) if (found.item.kind === `subscription`) subscriptionOrders.push({
		subscriptionId: found.item.external_id,
		orderId: found.providerData?.order_id
	});
	claims = claimSubscriptionsByOrder(auditClaims, subscriptionOrders);
	indexOwners();
	if (onlyUser) for (const key of ownedBy[onlyUser.id] || []) {
		if (byKey[key]) continue;
		const sep = key.indexOf(`:`);
		const kind = key.slice(0, sep);
		const id = key.slice(sep + 1);
		try {
			const data = lsRequest(`GET`, `/${kind === `order` ? `orders` : `subscriptions`}/${encodeURIComponent(id)}`)?.data;
			const a = data?.attributes || {};
			if (!data || `${a.store_id ?? ""}` !== `${storeId}`) continue;
			const item = kind === `order` ? billingItemFromLsOrder(data) : billingItemFromLsSubscription(data);
			if (item) push(`${a.user_email || ""}`, {
				item,
				providerData: a
			});
		} catch (err) {
			idFetchErrors.push(`${key}: ${err}`);
		}
	}
	const users = {};
	const addUser = (rec) => {
		if (rec) users[rec.id] = rec;
	};
	if (onlyUser) addUser(onlyUser);
	else {
		for (const rec of $app.findRecordsByFilter(`users`, `subscription != 'free' || subscription_quantity > 0 || billing_provider = 'lemonsqueezy'`, ``, 0, 0)) addUser(rec);
		for (const id of new Set([...Object.keys(auditAlt), ...Object.keys(ownedBy)])) {
			if (users[id]) continue;
			try {
				addUser($app.findRecordById(`users`, id));
			} catch {}
		}
		for (const email of Object.keys(byEmail)) try {
			addUser($app.findFirstRecordByFilter(`users`, `email = {:email}`, { email }));
		} catch {}
	}
	const claimed = /* @__PURE__ */ new Set();
	for (const rec of Object.values(users)) for (const em of emailsOf(rec)) claimed.add(em);
	const unmatchedEmails = [];
	if (!onlyUser) for (const [email, found] of Object.entries(byEmail)) {
		if (claimed.has(email)) continue;
		const active = found.filter((f) => !ownerOf(lsResourceKeyOfItem(f.item)) && reconcileEntitlement([f.item], /* @__PURE__ */ new Date()).subscription_quantity);
		if (active.length) unmatchedEmails.push(`${email} (${active.length} active)`);
	}
	const now = /* @__PURE__ */ new Date();
	const plans = [];
	const preserved = [];
	const preserveReleased = [];
	const errors = [];
	let usersWithAltEmails = 0;
	for (const userRec of Object.values(users)) try {
		const uid = userRec.id;
		const email = lc(userRec.getString(`email`));
		const emails = emailsOf(userRec);
		const altEmails = emails.filter((em) => em !== email);
		if (altEmails.length) usersWithAltEmails++;
		const current = userFields(userRec);
		const existing = loadBillingItems($app, uid);
		/** False for an LS purchase a checkout ties to some other (existing) account. */
		const isMine = (item) => {
			const owner = ownerOf(lsResourceKeyOfItem(item));
			return !owner || owner === uid;
		};
		const merged = {};
		const gives = [];
		for (const item of existing) if (isMine(item)) merged[keyOf(item)] = {
			item,
			providerData: void 0
		};
		else gives.push({
			item,
			to: ownerOf(lsResourceKeyOfItem(item))
		});
		for (const em of emails) for (const found of byEmail[em] || []) if (isMine(found.item)) merged[keyOf(found.item)] = found;
		const rememberEmails = [...auditAlt[uid] || []];
		for (const key of ownedBy[uid] || []) {
			const fresh = byKey[key];
			if (fresh) {
				merged[keyOf(fresh.item)] = fresh;
				const lsEmail = lc(fresh.providerData?.user_email);
				if (lsEmail) rememberEmails.push(lsEmail);
				continue;
			}
			const held = holders[key];
			if (held && held.userId !== uid) merged[keyOf(held.item)] = {
				item: held.item,
				providerData: void 0,
				move: true
			};
		}
		const takes = [];
		for (const key of ownedBy[uid] || []) {
			const holder = holders[key];
			if (holder && holder.userId !== uid && merged[keyOf(holder.item)]) takes.push({
				key,
				from: holder.userId
			});
		}
		if (!existing.some((i) => i.kind === `manual` && isBaselineExternalId(i.external_id))) {
			const baseline = baselineItemFromUser(current, uid);
			if (baseline) merged[keyOf(baseline)] = {
				item: baseline,
				providerData: void 0
			};
		}
		const all = Object.values(merged).map((f) => f.item);
		const oldPreserve = existing.find(isPreserve);
		const base = onlyUser ? all : all.filter((i) => !isPreserve(i));
		const withoutPreserve = reconcileEntitlement(base, now);
		const gap = Math.max(0, current.subscription_quantity - withoutPreserve.subscription_quantity);
		let preserveWrite;
		let preserveItem;
		if (!onlyUser) {
			if (backfill && gap > 0) {
				preserveItem = {
					provider: `manual`,
					kind: `manual`,
					external_id: `${PRESERVE_PREFIX}${uid}`,
					sku: oldPreserve?.sku || resolveUserEntitlements(current).sku || `hosting.slot.recurring.month`,
					quantity: gap,
					status: `active`,
					ends_at: oldPreserve?.ends_at
				};
				preserveWrite = {
					item: preserveItem,
					note: `Backfill: slots not explained by Lemon Squeezy. Review.`
				};
			} else if (oldPreserve && oldPreserve.status === `active`) {
				preserveWrite = {
					item: {
						...oldPreserve,
						quantity: 0,
						status: `inactive`
					},
					note: `Released ${now.toISOString()}: no verified Lemon Squeezy payment for these slots.`
				};
				preserveReleased.push({
					user_id: uid,
					email,
					was: oldPreserve.quantity
				});
			}
		}
		const items = preserveItem ? [...base, preserveItem] : base;
		const computed = reconcileEntitlement(items, now);
		if (preserveItem && isBillingItemActive(preserveItem, now)) preserved.push({
			user_id: uid,
			email,
			slots: preserveItem.quantity,
			ends_at: preserveItem.ends_at || null
		});
		const summary = {
			user_id: uid,
			email,
			alt_emails: altEmails,
			ls_ids_claimed: (ownedBy[uid] || []).length,
			before: {
				quantity: current.subscription_quantity,
				sku: current.product_sku,
				subscription: current.subscription
			},
			after: {
				quantity: computed.subscription_quantity,
				sku: computed.product_sku,
				subscription: computed.subscription
			},
			items: items.map((i) => `${i.kind}:${i.external_id} ${i.sku} x${i.quantity} ${i.status}${i.ends_at ? ` until ${i.ends_at}` : ""}`),
			takes,
			gives: gives.map((g) => ({
				key: lsResourceKeyOfItem(g.item),
				to: g.to
			}))
		};
		const reduced = summary.after.quantity < summary.before.quantity;
		const changed = summary.before.quantity !== summary.after.quantity || summary.before.sku !== summary.after.sku || summary.before.subscription !== summary.after.subscription || !!preserveWrite || takes.length > 0 || gives.length > 0;
		plans.push({
			userRec,
			merged,
			rememberEmails,
			gives,
			takes,
			preserveWrite,
			summary,
			changed,
			reduced
		});
	} catch (err) {
		errors.push({
			user_id: userRec.id,
			error: `${err}`
		});
	}
	const reducing = plans.filter((p) => p.reduced);
	const holdReductions = !onlyUser && reducing.length > maxReductions;
	const heldUsers = new Set(holdReductions ? reducing.map((p) => p.userRec.id) : []);
	const reductions = plans.filter((p) => p.reduced).map((p) => ({
		user_id: p.summary.user_id,
		email: p.summary.email,
		before: p.summary.before.quantity,
		after: p.summary.after.quantity,
		held: holdReductions
	}));
	const moves = {};
	const addMove = (key, from, to) => {
		moves[`${key}>${to}`] = {
			key,
			from,
			to,
			held: heldUsers.has(from) || heldUsers.has(to)
		};
	};
	for (const p of plans) {
		for (const t of p.takes) addMove(t.key, t.from, p.userRec.id);
		for (const g of p.gives) addMove(lsResourceKeyOfItem(g.item), p.userRec.id, g.to);
	}
	const reassigned = Object.values(moves);
	const inRun = new Set(plans.map((p) => p.userRec.id));
	const outside = {};
	const outsideOf = (id) => outside[id] = outside[id] || {
		leaving: [],
		arriving: []
	};
	for (const p of plans) {
		if (heldUsers.has(p.userRec.id)) continue;
		for (const t of p.takes) if (!inRun.has(t.from)) outsideOf(t.from).leaving.push(t.key);
		for (const g of p.gives) if (!inRun.has(g.to)) outsideOf(g.to).arriving.push(g.item);
	}
	const affectedOutsideRun = [];
	for (const id of Object.keys(outside)) try {
		const rec = $app.findRecordById(`users`, id);
		const { leaving, arriving } = outside[id];
		const items = [...loadBillingItems($app, id).filter((i) => !leaving.includes(lsResourceKeyOfItem(i) || ``)), ...arriving];
		affectedOutsideRun.push({
			user_id: id,
			email: lc(rec.getString(`email`)),
			before: rec.getInt(`subscription_quantity`),
			after: reconcileEntitlement(items, now).subscription_quantity
		});
	} catch (err) {
		errors.push({
			user_id: id,
			error: `${err}`
		});
	}
	if (apply) {
		for (const p of plans) {
			if (heldUsers.has(p.userRec.id)) continue;
			const uid = p.userRec.id;
			try {
				rememberLsEmails($app, p.userRec, p.rememberEmails);
				ensureBaseline($app, p.userRec);
				for (const f of Object.values(p.merged)) {
					if (f.providerData === void 0 && !f.move) continue;
					const key = lsResourceKeyOfItem(f.item);
					const holder = key ? holders[key] : void 0;
					if (key && ownerOf(key) === uid && holder && holder.userId !== uid && heldUsers.has(holder.userId)) continue;
					upsertBillingItem($app, uid, f.item, f.providerData === void 0 ? {} : { providerData: f.providerData });
				}
				for (const g of p.gives) {
					if (heldUsers.has(g.to)) continue;
					upsertBillingItem($app, g.to, g.item);
				}
				if (p.preserveWrite) upsertBillingItem($app, uid, p.preserveWrite.item, { note: p.preserveWrite.note });
				reconcileUser($app, p.userRec);
			} catch (err) {
				errors.push({
					user_id: p.summary.user_id,
					error: `${err}`
				});
			}
		}
		for (const a of affectedOutsideRun) try {
			reconcileUser($app, $app.findRecordById(`users`, a.user_id));
		} catch (err) {
			errors.push({
				user_id: a.user_id,
				error: `${err}`
			});
		}
	}
	const changes = plans.filter((p) => p.changed || onlyUser).map((p) => p.summary);
	return {
		dryRun: !apply,
		mode: onlyUser ? `user` : backfill ? `backfill` : `normal`,
		usersChecked: Object.keys(users).length,
		usersWithAltEmails,
		lsSubscriptionsSeen,
		lsIdsClaimed: Object.keys(claims.owners).length,
		lsIdClaimConflicts: claims.conflicts,
		changed: changes.length,
		gained: plans.filter((p) => p.summary.after.quantity > p.summary.before.quantity).length,
		changes,
		reductions,
		reductionsHeld: holdReductions ? reducing.length : 0,
		reassigned,
		affectedOutsideRun,
		preserveReleased,
		preserved,
		unmatchedEmails,
		unknown,
		unknownOrders,
		idFetchErrors,
		errors
	};
};

//#endregion
//#region src/lib/handlers/lemon/api/HandleLemonSqueezyReconcile.ts
const auditReport = (report, who) => {
	mkAudit(mkLog(`ls-reconcile`), $app)(`LS`, `Billing reconcile (${who}, ${report.mode}) applied: ${report.changed} changed, ${report.gained} gained, ${report.reductions.filter((r) => !r.held).length} reduced, ${report.reductionsHeld} reductions held, ${report.preserveReleased.length} unverified preserve rows released, ${report.reassigned.filter((r) => !r.held).length} purchases moved to their checkout's account, ${report.errors.length} errors.`, {
		reductions: report.reductions,
		preserveReleased: report.preserveReleased,
		reassigned: report.reassigned,
		affectedOutsideRun: report.affectedOutsideRun,
		errors: report.errors
	});
};
/**
* Superuser: `POST /api/ls/reconcile` — dry run by default.
*
* - `apply=1` writes.
* - `user=<id>` one user, exact recompute.
* - `backfill=1` one-time mode that creates preserve rows instead of lowering anyone.
* - `maxReductions=<n>` (default 25): above this many drops, all drops are held. See `runReconcile`.
*/
const HandleLemonSqueezyReconcile = (e) => {
	const q = e.request.url.query();
	const num = (k) => {
		const v = q.get(k);
		return v === `` ? void 0 : Number(v);
	};
	const report = runReconcile({
		apply: q.get(`apply`) === `1`,
		onlyUserId: q.get(`user`) || void 0,
		backfill: q.get(`backfill`) === `1`,
		maxReductions: num(`maxReductions`)
	});
	if (!report.dryRun) auditReport(report, q.get(`user`) ? `user ${q.get(`user`)}` : `manual`);
	return e.json(200, report);
};

//#endregion
//#region src/lib/util/mkNotifier.ts
const mkNotifier = (log, app) => (channel, template, user_id, context = {}) => {
	log({
		channel,
		template,
		user_id
	});
	const emailTemplate = app.findFirstRecordByData("message_templates", `slug`, template);
	log(`got email template`, emailTemplate);
	if (!emailTemplate) throw new Error(`Template ${template} not found`);
	const templateVars = {
		user_id,
		...context
	};
	const emailNotification = new Record(app.findCollectionByNameOrId("notifications"), {
		user: user_id,
		channel,
		message_template: emailTemplate.id,
		message_template_vars: templateVars,
		payload: templateVars
	});
	log(`built notification record`, emailNotification);
	app.save(emailNotification);
};

//#endregion
//#region src/lib/handlers/lemon/api/HandleLemonSqueezySale.ts
/** Events that post to the lemon_cancel_discord channel. */
const CANCEL_EVENTS = [
	`subscription_cancelled`,
	`order_refunded`,
	`subscription_payment_refunded`
];
/**
* Lemon Squeezy webhook. Every event updates the one billing item it is about (subscription or lifetime order), then
* the user's slot count is recomputed from all of their billing items. Users may hold any number of subscriptions
* (PayPal subscriptions cannot change quantity, so adding slots means buying another one) — they are summed, never
* overwritten.
*/
const HandleLemonSqueezySale = (e) => {
	const log = mkLog(`ls`);
	const audit = mkAudit(log, $app);
	const context = {};
	try {
		const secret = process.env.LS_WEBHOOK_SECRET;
		if (!secret) throw new Error(`No secret`);
		const raw = readerToString(e.request.body);
		const signature = e.request.header.get("X-Signature");
		if (!signature || !$security.equal($security.hs256(raw, secret), signature)) throw new BadRequestError(`Invalid signature`);
		const payload = JSON.parse(raw);
		log(`payload`, JSON.stringify(payload, null, 2));
		context.event_name = payload.meta?.event_name;
		context.type = payload.data?.type;
		context.resource_id = `${payload.data?.id ?? ""}`;
		const attrs = payload.data?.attributes || {};
		if (!context.event_name || !context.type) throw new Error(`Missing event name or type`);
		/** Resolve the LS subscriptions this event is about, plus a lifetime order item if any. */
		const resolveResources = () => {
			switch (context.type) {
				case `subscriptions`: {
					const sub = payload.data;
					if (isCompleteLsSubscription(sub)) return { subscriptions: [sub] };
					const full = lsSubscription(sub.id);
					return { subscriptions: isCompleteLsSubscription(full) ? [full] : [] };
				}
				case `subscription-invoices`: return { subscriptions: [lsSubscription(attrs.subscription_id)] };
				case `orders`: {
					const order = payload.data;
					if (isRecurringLsOrder(order)) return { subscriptions: lsSubscriptionsByOrderId(order.id) };
					const item = billingItemFromLsOrder(order);
					if (!item) {
						const i = attrs.first_order_item || {};
						throw new Error(`Product and variant not found: ${i.product_id}-${i.variant_id}`);
					}
					return {
						subscriptions: [],
						order: item
					};
				}
				default: return { subscriptions: [] };
			}
		};
		if (isLsDisputeEvent(context.event_name)) {
			const summary = lsDisputeSummary(context.event_name, payload.data);
			const url = process.env.DISCORD_STREAM_CHANNEL_URL;
			if (url) try {
				$http.send({
					url,
					method: `POST`,
					body: JSON.stringify({ content: `:warning: ${summary}` }),
					headers: { "content-type": `application/json` },
					timeout: 5
				});
			} catch (err) {
				log(`dispute discord alert failed`, `${err}`);
			}
			audit(`LS`, `${summary}.`, context);
			return e.json(200, { status: `ok` });
		}
		if (![
			`subscriptions`,
			`subscription-invoices`,
			`orders`
		].includes(context.type)) {
			audit(`LS`, `Ignored unsupported event ${context.event_name} (${context.type}).`, context);
			return e.json(200, { status: `ignored` });
		}
		const { subscriptions, order } = resolveResources();
		if (context.type === `subscriptions` && !subscriptions.length) {
			audit(`LS`, `Skipped ${context.event_name}: subscription ${context.resource_id} not complete yet.`, context);
			return e.json(200, { status: `ignored` });
		}
		const first = subscriptions[0];
		const firstAttrs = first?.attributes || {};
		context.product_name = order?.product_name || firstAttrs.product_name || attrs.product_name || ``;
		context.variant_name = order?.variant_name || firstAttrs.variant_name || attrs.variant_name || ``;
		context.quantity = order?.quantity || firstAttrs.first_subscription_item?.quantity || attrs.first_order_item?.quantity;
		const userRec = (() => {
			const customUserId = payload.meta?.custom_data?.user_id;
			if (customUserId) {
				context.user_id_source = `custom_data`;
				try {
					return $app.findRecordById(`users`, customUserId);
				} catch {
					throw new Error(`User ${customUserId} not found`);
				}
			}
			const known = first ? findBillingItemRecord($app, {
				provider: `lemonsqueezy`,
				kind: `subscription`,
				external_id: `${first.id}`
			}) : order && findBillingItemRecord($app, order);
			if (known) {
				context.user_id_source = `billing_item`;
				return $app.findRecordById(`users`, known.getString(`user`));
			}
			const email = `${attrs.user_email || firstAttrs.user_email || ""}`.trim();
			if (email) {
				context.user_id_source = `email`;
				try {
					return $app.findFirstRecordByData(`users`, `email`, email);
				} catch {
					throw new Error(`No PocketHost user for checkout email ${email}`);
				}
			}
			throw new Error(`No user ID or checkout email`);
		})();
		context.user_id = userRec.id;
		context.user_email = userRec.getString(`email`);
		if (context.user_id_source !== `email`) rememberLsEmails($app, userRec, [attrs.user_email, firstAttrs.user_email].filter(Boolean));
		context.bootstrapped = ensureUserBootstrapped($app, userRec);
		for (const sub of subscriptions) {
			const { skipped } = upsertLsSubscription($app, userRec.id, sub);
			if (skipped) context.stale_event_skipped = true;
		}
		if (order) upsertBillingItem($app, userRec.id, order, { providerData: attrs });
		const { before, after } = reconcileUser($app, userRec);
		context.slots_before = before;
		context.slots_after = after;
		const notify = mkNotifier(log, $app);
		if (context.event_name === `order_created`) notify(`lemonbot`, `lemon_order_discord`, userRec.id, context);
		else if (CANCEL_EVENTS.includes(context.event_name)) notify(`lemonbot`, `lemon_cancel_discord`, userRec.id, context);
		audit(`LS`, `${context.event_name}: slots ${before} → ${after}.`, context);
		return e.json(200, { status: "ok" });
	} catch (err) {
		audit(`LS_ERR`, `${err}`, context);
		return e.json(500, {
			status: `error`,
			error: `${err}`
		});
	}
};

//#endregion
//#region src/lib/util/mailRecipient.ts
/** Reason a user must not receive platform email, or null if OK to send. */
const mailRecipientSkipReason = (user) => {
	if (!user.getBool("verified")) return "unverified";
	if (user.getBool("unsubscribe")) return "unsubscribed";
	return null;
};
/** Permanent bounce or complaint: stop all future platform email. */
const suppressUserEmail = (user) => {
	user.setVerified(false);
	user.set("unsubscribe", true);
};

//#endregion
//#region src/lib/handlers/mail/api/HandleMailSend.ts
const HandleMailSend = (e) => {
	const log = mkLog(`mail`);
	let data = new DynamicModel({
		to: "",
		subject: "",
		body: ""
	});
	log(`before bind`);
	e.bindBody(data);
	log(`after bind`);
	data = JSON.parse(JSON.stringify(data));
	log(`bind parsed`, JSON.stringify(data));
	const { to, subject, body } = data;
	const testEmail = `${process.env.TEST_EMAIL || ""}`.trim().toLowerCase();
	const isTestRecipient = !!testEmail && `${to}`.trim().toLowerCase() === testEmail;
	if (isTestRecipient) log(`${to} is TEST_EMAIL, skipping recipient checks`);
	else try {
		const skipReason = mailRecipientSkipReason($app.findFirstRecordByData("users", "email", to));
		if (skipReason) {
			log(`skipped ${to}: ${skipReason}`);
			return e.json(200, {
				status: "skipped",
				reason: skipReason
			});
		}
	} catch (_e) {
		log(`no user record for ${to}, sending anyway`);
	}
	const email = new MailerMessage({
		from: {
			address: $app.settings().meta.senderAddress,
			name: $app.settings().meta.senderName
		},
		to: [{ address: to }],
		bcc: [process.env.TEST_EMAIL].filter((e) => !!e && !isTestRecipient).map((e) => ({ address: e })),
		subject,
		html: body
	});
	$app.newMailClient().send(email);
	log(`Sent to ${to}`);
	return e.json(200, { status: "ok" });
};

//#endregion
//#region src/lib/handlers/meta/boot/HandleMetaUpdateAtBoot.ts
const HandleMetaUpdateAtBoot = (_e) => {
	const log = mkLog("HandleMetaUpdateAtBoot");
	log(`At top of HandleMetaUpdateAtBoot`);
	log(`app URL`, process.env.APP_URL);
	const settings = $app.settings();
	settings.meta = {
		...settings.meta,
		appUrl: process.env.APP_URL || settings.meta.appUrl,
		verificationTemplate: {
			...settings.meta.verificationTemplate,
			actionUrl: `{APP_URL}/login/confirm-account/{TOKEN}`
		},
		resetPasswordTemplate: {
			...settings.meta.resetPasswordTemplate,
			actionUrl: `{APP_URL}/login/password-reset/confirm/{TOKEN}`
		},
		confirmEmailChangeTemplate: {
			...settings.meta.confirmEmailChangeTemplate,
			actionUrl: `{APP_URL}/login/confirm-email-change/{TOKEN}`
		}
	};
	log(`Saving settings`);
	$app.save(settings);
	log(`Saved settings`);
};

//#endregion
//#region src/lib/handlers/mirror/lib/buildMirrorDump.ts
const exportRecord = (record) => record.publicExport();
/** Instances carry their edge for routing; `edge` is hidden from customers, so add it back explicitly. */
const exportInstance = (record) => ({
	...record.publicExport(),
	edge: record.getString("edge")
});
const buildMirrorDump = (app) => {
	return {
		users: app.findRecordsByFilter(`users`, `verified = true`).filter((r) => !!r).map(exportRecord),
		instances: app.findAllRecords(`instances`, $dbx.exp(`instances.uid in (select id from users where verified = 1)`)).filter((r) => !!r).map(exportInstance),
		edges: app.findAllRecords(`edges`).filter((r) => !!r).map(exportRecord)
	};
};

//#endregion
//#region src/lib/handlers/mirror/api/HandleMirrorData.ts
const HandleMirrorData = (e) => {
	return e.json(200, buildMirrorDump($app));
};

//#endregion
//#region src/lib/handlers/mirror/lib/applyLiveInstances.ts
/** Save per row (not bulk SQL) so dashboard SSE clients get status updates. */
const applyLiveInstances = (app, liveInstances) => {
	let updated = 0;
	for (const live of liveInstances) {
		const id = live?.id?.trim();
		const status = live?.status?.trim();
		if (!id || !status) continue;
		if (status !== `starting` && status !== `running`) continue;
		let record;
		try {
			record = app.findRecordById(`instances`, id);
		} catch {
			continue;
		}
		if (!record.get(`power`)) continue;
		if (record.getString(`status`) === status) continue;
		record.set(`status`, status);
		app.save(record);
		updated++;
	}
	return updated;
};

//#endregion
//#region src/lib/handlers/mirror/api/HandleMirrorSync.ts
const HandleMirrorSync = (e) => {
	const { body } = e.requestInfo();
	if (body.resetIdle) resetInstancesIdle($app);
	const liveInstances = Array.isArray(body.instances) ? body.instances : [];
	const updated = applyLiveInstances($app, liveInstances);
	if (body.resetIdle || updated > 0) refreshAndBroadcastLivePlatformStats();
	if (body.dump === false) return e.json(200, { updated });
	return e.json(200, {
		...buildMirrorDump($app),
		updated
	});
};

//#endregion
//#region src/lib/util/mkNotificationProcessor.ts
const mkNotificationProcessor = (log, app, test = false) => (notificationRec) => {
	log({ notificationRec });
	const channel = notificationRec.getString(`channel`);
	app.expandRecord(notificationRec, ["message_template", "user"]);
	const messageTemplateRec = notificationRec.expandedOne("message_template");
	if (!messageTemplateRec) throw new Error(`Missing message template`);
	const userRec = notificationRec.expandedOne("user");
	if (!userRec) throw new Error(`Missing user record`);
	const vars = JSON.parse(notificationRec.getString(`message_template_vars`));
	const to = userRec.email();
	const subject = interpolateString(messageTemplateRec.getString(`subject`), vars);
	const html = interpolateString(messageTemplateRec.getString(`body_html`), vars);
	log({
		channel,
		messageTemplateRec,
		userRec,
		vars,
		to,
		subject,
		html
	});
	switch (channel) {
		case `email`:
			const skipReason = mailRecipientSkipReason(userRec);
			if (skipReason) {
				log(`skipped email to ${to}: ${skipReason}`);
				if (!test) {
					notificationRec.set(`delivered`, new DateTime());
					app.save(notificationRec);
				}
				break;
			}
			/** @type {Partial<mailer.Message_In>} */
			const msgArgs = {
				from: {
					address: $app.settings().meta.senderAddress,
					name: $app.settings().meta.senderName
				},
				to: [{ address: to }],
				bcc: [{ address: `pockethost+notifications@benallfree.com` }],
				subject,
				html
			};
			if (test) {
				msgArgs.to = [{ address: `ben@benallfree.com` }];
				msgArgs.subject = `***TEST ${to} *** ${msgArgs.subject}`;
			}
			log({ msgArgs });
			const msg = new MailerMessage(msgArgs);
			$app.newMailClient().send(msg);
			log(`email sent`);
			break;
		case `lemonbot`:
			const url = test ? process.env.DISCORD_TEST_CHANNEL_URL : process.env.DISCORD_STREAM_CHANNEL_URL;
			if (url) {
				const params = {
					url,
					method: "POST",
					body: JSON.stringify({ content: `${subject} (${to})` }),
					headers: { "content-type": "application/json" },
					timeout: 5
				};
				log(`sending discord message`, params);
				log(`discord sent`, $http.send(params));
			}
			break;
		default: throw new Error(`Unsupported channel: ${channel}`);
	}
	if (!test) {
		notificationRec.set(`delivered`, new DateTime());
		app.save(notificationRec);
	}
};

//#endregion
//#region src/lib/handlers/notify/api/HandleProcessSingleNotification.ts
const HandleProcessSingleNotification = (e) => {
	const log = mkLog(`process_single_notification`);
	log(`start`);
	const test = !!e.request.url.query().get(`test`);
	const processNotification = mkNotificationProcessor(log, $app, test);
	try {
		const notification = $app.findFirstRecordByData(`notifications`, `delivered`, ``);
		if (!notification) return e.json(200, `No notifications to send`);
		processNotification(notification);
	} catch (err) {
		return e.json(500, `${err}`);
	}
	return e.json(200, { status: "ok" });
};

//#endregion
//#region src/lib/handlers/notify/model/HandleProcessNotification.ts
const HandleProcessNotification = (e) => {
	const log = mkLog(`notification:sendImmediately`);
	const audit = mkAudit(log, $app);
	const processNotification = mkNotificationProcessor(log, $app, false);
	const notificationRec = e.record;
	if (!notificationRec) return;
	log({ notificationRec });
	try {
		$app.expandRecord(notificationRec, ["message_template"]);
		if (!notificationRec.expandedOne(`message_template`)) throw new Error(`Missing message template`);
		processNotification(notificationRec);
	} catch (e) {
		audit(`ERROR`, `${e}`, { notification: notificationRec.id });
	}
};

//#endregion
//#region src/lib/handlers/notify/model/HandleUserWelcomeMessage.ts
const HandleUserWelcomeMessage = (e) => {
	const newModel = e.record;
	if (!newModel) return;
	const oldModel = newModel.original();
	const log = mkLog(`user-welcome-msg`);
	const notify = mkNotifier(log, $app);
	const audit = mkAudit(log, $app);
	try {
		log({
			newModel,
			oldModel
		});
		const isVerified = newModel.getBool("verified");
		if (!isVerified) return;
		if (isVerified === oldModel.getBool(`verified`)) return;
		log(`user just became verified`);
		const uid = newModel.id;
		notify(`email`, `welcome`, uid);
		newModel.set(`welcome`, new DateTime());
	} catch (e) {
		audit(`ERROR`, `${e}`, { user: newModel.id });
	}
};

//#endregion
//#region src/lib/handlers/outpost/api/HandleOutpostUnsubscribe.ts
const HandleOutpostUnsubscribe = (e) => {
	const audit = mkAudit(mkLog(`unsubscribe`), $app);
	const id = e.request.url.query().get("e");
	try {
		const record = $app.findRecordById("users", id);
		record.set(`unsubscribe`, true);
		$app.save(record);
		const email = record.getString("email");
		audit("UNSUBSCRIBE", "", {
			email,
			user: id
		});
		$app.newMailClient().send(new MailerMessage({
			from: {
				address: $app.settings().meta.senderAddress,
				name: $app.settings().meta.senderName
			},
			to: [{ address: `ben@benallfree.com` }],
			subject: `UNSUBSCRIBE ${email}`
		}));
		return e.html(200, `<p>${email} has been unsubscribed.`);
	} catch (_err) {
		audit("UNSUBSCRIBE_ERR", `User ${id} not found`);
		return e.html(200, `<p>Looks like you're already unsubscribed.`);
	}
};

//#endregion
//#region src/lib/handlers/signup/error.ts
const error = (fieldName, slug, description, extra) => new ApiError(500, description, {
	[fieldName]: new ValidationError(slug, description),
	...extra
});

//#endregion
//#region src/lib/handlers/signup/random-words/wordList.ts
const wordList = [
	"ability",
	"able",
	"aboard",
	"about",
	"above",
	"accept",
	"accident",
	"according",
	"account",
	"accurate",
	"acres",
	"across",
	"act",
	"action",
	"active",
	"activity",
	"actual",
	"actually",
	"add",
	"addition",
	"additional",
	"adjective",
	"adult",
	"adventure",
	"advice",
	"affect",
	"afraid",
	"after",
	"afternoon",
	"again",
	"against",
	"age",
	"ago",
	"agree",
	"ahead",
	"aid",
	"air",
	"airplane",
	"alike",
	"alive",
	"all",
	"allow",
	"almost",
	"alone",
	"along",
	"aloud",
	"alphabet",
	"already",
	"also",
	"although",
	"am",
	"among",
	"amount",
	"ancient",
	"angle",
	"angry",
	"animal",
	"announced",
	"another",
	"answer",
	"ants",
	"any",
	"anybody",
	"anyone",
	"anything",
	"anyway",
	"anywhere",
	"apart",
	"apartment",
	"appearance",
	"apple",
	"applied",
	"appropriate",
	"are",
	"area",
	"arm",
	"army",
	"around",
	"arrange",
	"arrangement",
	"arrive",
	"arrow",
	"art",
	"article",
	"as",
	"aside",
	"ask",
	"asleep",
	"at",
	"ate",
	"atmosphere",
	"atom",
	"atomic",
	"attached",
	"attack",
	"attempt",
	"attention",
	"audience",
	"author",
	"automobile",
	"available",
	"average",
	"avoid",
	"aware",
	"away",
	"baby",
	"back",
	"bad",
	"badly",
	"bag",
	"balance",
	"ball",
	"balloon",
	"band",
	"bank",
	"bar",
	"bare",
	"bark",
	"barn",
	"base",
	"baseball",
	"basic",
	"basis",
	"basket",
	"bat",
	"battle",
	"be",
	"bean",
	"bear",
	"beat",
	"beautiful",
	"beauty",
	"became",
	"because",
	"become",
	"becoming",
	"bee",
	"been",
	"before",
	"began",
	"beginning",
	"begun",
	"behavior",
	"behind",
	"being",
	"believed",
	"bell",
	"belong",
	"below",
	"belt",
	"bend",
	"beneath",
	"bent",
	"beside",
	"best",
	"bet",
	"better",
	"between",
	"beyond",
	"bicycle",
	"bigger",
	"biggest",
	"bill",
	"birds",
	"birth",
	"birthday",
	"bit",
	"bite",
	"black",
	"blank",
	"blanket",
	"blew",
	"blind",
	"block",
	"blood",
	"blow",
	"blue",
	"board",
	"boat",
	"body",
	"bone",
	"book",
	"border",
	"born",
	"both",
	"bottle",
	"bottom",
	"bound",
	"bow",
	"bowl",
	"box",
	"boy",
	"brain",
	"branch",
	"brass",
	"brave",
	"bread",
	"break",
	"breakfast",
	"breath",
	"breathe",
	"breathing",
	"breeze",
	"brick",
	"bridge",
	"brief",
	"bright",
	"bring",
	"broad",
	"broke",
	"broken",
	"brother",
	"brought",
	"brown",
	"brush",
	"buffalo",
	"build",
	"building",
	"built",
	"buried",
	"burn",
	"burst",
	"bus",
	"bush",
	"business",
	"busy",
	"but",
	"butter",
	"buy",
	"by",
	"cabin",
	"cage",
	"cake",
	"call",
	"calm",
	"came",
	"camera",
	"camp",
	"can",
	"canal",
	"cannot",
	"cap",
	"capital",
	"captain",
	"captured",
	"car",
	"carbon",
	"card",
	"care",
	"careful",
	"carefully",
	"carried",
	"carry",
	"case",
	"cast",
	"castle",
	"cat",
	"catch",
	"cattle",
	"caught",
	"cause",
	"cave",
	"cell",
	"cent",
	"center",
	"central",
	"century",
	"certain",
	"certainly",
	"chain",
	"chair",
	"chamber",
	"chance",
	"change",
	"changing",
	"chapter",
	"character",
	"characteristic",
	"charge",
	"chart",
	"check",
	"cheese",
	"chemical",
	"chest",
	"chicken",
	"chief",
	"child",
	"children",
	"choice",
	"choose",
	"chose",
	"chosen",
	"church",
	"circle",
	"circus",
	"citizen",
	"city",
	"class",
	"classroom",
	"claws",
	"clay",
	"clean",
	"clear",
	"clearly",
	"climate",
	"climb",
	"clock",
	"close",
	"closely",
	"closer",
	"cloth",
	"clothes",
	"clothing",
	"cloud",
	"club",
	"coach",
	"coal",
	"coast",
	"coat",
	"coffee",
	"cold",
	"collect",
	"college",
	"colony",
	"color",
	"column",
	"combination",
	"combine",
	"come",
	"comfortable",
	"coming",
	"command",
	"common",
	"community",
	"company",
	"compare",
	"compass",
	"complete",
	"completely",
	"complex",
	"composed",
	"composition",
	"compound",
	"concerned",
	"condition",
	"congress",
	"connected",
	"consider",
	"consist",
	"consonant",
	"constantly",
	"construction",
	"contain",
	"continent",
	"continued",
	"contrast",
	"control",
	"conversation",
	"cook",
	"cookies",
	"cool",
	"copper",
	"copy",
	"corn",
	"corner",
	"correct",
	"correctly",
	"cost",
	"cotton",
	"could",
	"count",
	"country",
	"couple",
	"courage",
	"course",
	"court",
	"cover",
	"cow",
	"cowboy",
	"crack",
	"cream",
	"create",
	"creature",
	"crew",
	"crop",
	"cross",
	"crowd",
	"cry",
	"cup",
	"curious",
	"current",
	"curve",
	"customs",
	"cut",
	"cutting",
	"daily",
	"damage",
	"dance",
	"danger",
	"dangerous",
	"dark",
	"darkness",
	"date",
	"daughter",
	"dawn",
	"day",
	"dead",
	"deal",
	"dear",
	"death",
	"decide",
	"declared",
	"deep",
	"deeply",
	"deer",
	"definition",
	"degree",
	"depend",
	"depth",
	"describe",
	"desert",
	"design",
	"desk",
	"detail",
	"determine",
	"develop",
	"development",
	"diagram",
	"diameter",
	"did",
	"die",
	"differ",
	"difference",
	"different",
	"difficult",
	"difficulty",
	"dig",
	"dinner",
	"direct",
	"direction",
	"directly",
	"dirt",
	"dirty",
	"disappear",
	"discover",
	"discovery",
	"discuss",
	"discussion",
	"disease",
	"dish",
	"distance",
	"distant",
	"divide",
	"division",
	"do",
	"doctor",
	"does",
	"dog",
	"doing",
	"doll",
	"dollar",
	"done",
	"donkey",
	"door",
	"dot",
	"double",
	"doubt",
	"down",
	"dozen",
	"draw",
	"drawn",
	"dream",
	"dress",
	"drew",
	"dried",
	"drink",
	"drive",
	"driven",
	"driver",
	"driving",
	"drop",
	"dropped",
	"drove",
	"dry",
	"duck",
	"due",
	"dug",
	"dull",
	"during",
	"dust",
	"duty",
	"each",
	"eager",
	"ear",
	"earlier",
	"early",
	"earn",
	"earth",
	"easier",
	"easily",
	"east",
	"easy",
	"eat",
	"eaten",
	"edge",
	"education",
	"effect",
	"effort",
	"egg",
	"eight",
	"either",
	"electric",
	"electricity",
	"element",
	"elephant",
	"eleven",
	"else",
	"empty",
	"end",
	"enemy",
	"energy",
	"engine",
	"engineer",
	"enjoy",
	"enough",
	"enter",
	"entire",
	"entirely",
	"environment",
	"equal",
	"equally",
	"equator",
	"equipment",
	"escape",
	"especially",
	"essential",
	"establish",
	"even",
	"evening",
	"event",
	"eventually",
	"ever",
	"every",
	"everybody",
	"everyone",
	"everything",
	"everywhere",
	"evidence",
	"exact",
	"exactly",
	"examine",
	"example",
	"excellent",
	"except",
	"exchange",
	"excited",
	"excitement",
	"exciting",
	"exclaimed",
	"exercise",
	"exist",
	"expect",
	"experience",
	"experiment",
	"explain",
	"explanation",
	"explore",
	"express",
	"expression",
	"extra",
	"eye",
	"face",
	"facing",
	"fact",
	"factor",
	"factory",
	"failed",
	"fair",
	"fairly",
	"fall",
	"fallen",
	"familiar",
	"family",
	"famous",
	"far",
	"farm",
	"farmer",
	"farther",
	"fast",
	"fastened",
	"faster",
	"fat",
	"father",
	"favorite",
	"fear",
	"feathers",
	"feature",
	"fed",
	"feed",
	"feel",
	"feet",
	"fell",
	"fellow",
	"felt",
	"fence",
	"few",
	"fewer",
	"field",
	"fierce",
	"fifteen",
	"fifth",
	"fifty",
	"fight",
	"fighting",
	"figure",
	"fill",
	"film",
	"final",
	"finally",
	"find",
	"fine",
	"finest",
	"finger",
	"finish",
	"fire",
	"fireplace",
	"firm",
	"first",
	"fish",
	"five",
	"fix",
	"flag",
	"flame",
	"flat",
	"flew",
	"flies",
	"flight",
	"floating",
	"floor",
	"flow",
	"flower",
	"fly",
	"fog",
	"folks",
	"follow",
	"food",
	"foot",
	"football",
	"for",
	"force",
	"foreign",
	"forest",
	"forget",
	"forgot",
	"forgotten",
	"form",
	"former",
	"fort",
	"forth",
	"forty",
	"forward",
	"fought",
	"found",
	"four",
	"fourth",
	"fox",
	"frame",
	"free",
	"freedom",
	"frequently",
	"fresh",
	"friend",
	"friendly",
	"frighten",
	"frog",
	"from",
	"front",
	"frozen",
	"fruit",
	"fuel",
	"full",
	"fully",
	"fun",
	"function",
	"funny",
	"fur",
	"furniture",
	"further",
	"future",
	"gain",
	"game",
	"garage",
	"garden",
	"gas",
	"gasoline",
	"gate",
	"gather",
	"gave",
	"general",
	"generally",
	"gentle",
	"gently",
	"get",
	"getting",
	"giant",
	"gift",
	"girl",
	"give",
	"given",
	"giving",
	"glad",
	"glass",
	"globe",
	"go",
	"goes",
	"gold",
	"golden",
	"gone",
	"good",
	"goose",
	"got",
	"government",
	"grabbed",
	"grade",
	"gradually",
	"grain",
	"grandfather",
	"grandmother",
	"graph",
	"grass",
	"gravity",
	"gray",
	"great",
	"greater",
	"greatest",
	"greatly",
	"green",
	"grew",
	"ground",
	"group",
	"grow",
	"grown",
	"growth",
	"guard",
	"guess",
	"guide",
	"gulf",
	"gun",
	"habit",
	"had",
	"hair",
	"half",
	"halfway",
	"hall",
	"hand",
	"handle",
	"handsome",
	"hang",
	"happen",
	"happened",
	"happily",
	"happy",
	"harbor",
	"hard",
	"harder",
	"hardly",
	"has",
	"hat",
	"have",
	"having",
	"hay",
	"he",
	"headed",
	"heading",
	"health",
	"heard",
	"hearing",
	"heart",
	"heat",
	"heavy",
	"height",
	"held",
	"hello",
	"help",
	"helpful",
	"her",
	"herd",
	"here",
	"herself",
	"hidden",
	"hide",
	"high",
	"higher",
	"highest",
	"highway",
	"hill",
	"him",
	"himself",
	"his",
	"history",
	"hit",
	"hold",
	"hole",
	"hollow",
	"home",
	"honor",
	"hope",
	"horn",
	"horse",
	"hospital",
	"hot",
	"hour",
	"house",
	"how",
	"however",
	"huge",
	"human",
	"hundred",
	"hung",
	"hungry",
	"hunt",
	"hunter",
	"hurried",
	"hurry",
	"hurt",
	"husband",
	"ice",
	"idea",
	"identity",
	"if",
	"ill",
	"image",
	"imagine",
	"immediately",
	"importance",
	"important",
	"impossible",
	"improve",
	"in",
	"inch",
	"include",
	"including",
	"income",
	"increase",
	"indeed",
	"independent",
	"indicate",
	"individual",
	"industrial",
	"industry",
	"influence",
	"information",
	"inside",
	"instance",
	"instant",
	"instead",
	"instrument",
	"interest",
	"interior",
	"into",
	"introduced",
	"invented",
	"involved",
	"iron",
	"is",
	"island",
	"it",
	"its",
	"itself",
	"jack",
	"jar",
	"jet",
	"job",
	"join",
	"joined",
	"journey",
	"joy",
	"judge",
	"jump",
	"jungle",
	"just",
	"keep",
	"kept",
	"key",
	"kids",
	"kill",
	"kind",
	"kitchen",
	"knew",
	"knife",
	"know",
	"knowledge",
	"known",
	"label",
	"labor",
	"lack",
	"lady",
	"laid",
	"lake",
	"lamp",
	"land",
	"language",
	"large",
	"larger",
	"largest",
	"last",
	"late",
	"later",
	"laugh",
	"law",
	"lay",
	"layers",
	"lead",
	"leader",
	"leaf",
	"learn",
	"least",
	"leather",
	"leave",
	"leaving",
	"led",
	"left",
	"leg",
	"length",
	"lesson",
	"let",
	"letter",
	"level",
	"library",
	"lie",
	"life",
	"lift",
	"light",
	"like",
	"likely",
	"limited",
	"line",
	"lion",
	"lips",
	"liquid",
	"list",
	"listen",
	"little",
	"live",
	"living",
	"load",
	"local",
	"locate",
	"location",
	"log",
	"lonely",
	"long",
	"longer",
	"look",
	"loose",
	"lose",
	"loss",
	"lost",
	"lot",
	"loud",
	"love",
	"lovely",
	"low",
	"lower",
	"luck",
	"lucky",
	"lunch",
	"lungs",
	"lying",
	"machine",
	"machinery",
	"mad",
	"made",
	"magic",
	"magnet",
	"mail",
	"main",
	"mainly",
	"major",
	"make",
	"making",
	"man",
	"managed",
	"manner",
	"manufacturing",
	"many",
	"map",
	"mark",
	"market",
	"married",
	"mass",
	"massage",
	"master",
	"material",
	"mathematics",
	"matter",
	"may",
	"maybe",
	"me",
	"meal",
	"mean",
	"means",
	"meant",
	"measure",
	"meat",
	"medicine",
	"meet",
	"melted",
	"member",
	"memory",
	"men",
	"mental",
	"merely",
	"met",
	"metal",
	"method",
	"mice",
	"middle",
	"might",
	"mighty",
	"mile",
	"military",
	"milk",
	"mill",
	"mind",
	"mine",
	"minerals",
	"minute",
	"mirror",
	"missing",
	"mission",
	"mistake",
	"mix",
	"mixture",
	"model",
	"modern",
	"molecular",
	"moment",
	"money",
	"monkey",
	"month",
	"mood",
	"moon",
	"more",
	"morning",
	"most",
	"mostly",
	"mother",
	"motion",
	"motor",
	"mountain",
	"mouse",
	"mouth",
	"move",
	"movement",
	"movie",
	"moving",
	"mud",
	"muscle",
	"music",
	"musical",
	"must",
	"my",
	"myself",
	"mysterious",
	"nails",
	"name",
	"nation",
	"national",
	"native",
	"natural",
	"naturally",
	"nature",
	"near",
	"nearby",
	"nearer",
	"nearest",
	"nearly",
	"necessary",
	"neck",
	"needed",
	"needle",
	"needs",
	"negative",
	"neighbor",
	"neighborhood",
	"nervous",
	"nest",
	"never",
	"new",
	"news",
	"newspaper",
	"next",
	"nice",
	"night",
	"nine",
	"no",
	"nobody",
	"nodded",
	"noise",
	"none",
	"noon",
	"nor",
	"north",
	"nose",
	"not",
	"note",
	"noted",
	"nothing",
	"notice",
	"noun",
	"now",
	"number",
	"numeral",
	"nuts",
	"object",
	"observe",
	"obtain",
	"occasionally",
	"occur",
	"ocean",
	"of",
	"off",
	"offer",
	"office",
	"officer",
	"official",
	"oil",
	"old",
	"older",
	"oldest",
	"on",
	"once",
	"one",
	"only",
	"onto",
	"open",
	"operation",
	"opinion",
	"opportunity",
	"opposite",
	"or",
	"orange",
	"orbit",
	"order",
	"ordinary",
	"organization",
	"organized",
	"origin",
	"original",
	"other",
	"ought",
	"our",
	"ourselves",
	"out",
	"outer",
	"outline",
	"outside",
	"over",
	"own",
	"owner",
	"oxygen",
	"pack",
	"package",
	"page",
	"paid",
	"pain",
	"paint",
	"pair",
	"palace",
	"pale",
	"pan",
	"paper",
	"paragraph",
	"parallel",
	"parent",
	"park",
	"part",
	"particles",
	"particular",
	"particularly",
	"partly",
	"parts",
	"party",
	"pass",
	"passage",
	"past",
	"path",
	"pattern",
	"pay",
	"peace",
	"pen",
	"pencil",
	"people",
	"per",
	"percent",
	"perfect",
	"perfectly",
	"perhaps",
	"period",
	"person",
	"personal",
	"pet",
	"phrase",
	"physical",
	"piano",
	"pick",
	"picture",
	"pictured",
	"pie",
	"piece",
	"pig",
	"pile",
	"pilot",
	"pine",
	"pink",
	"pipe",
	"pitch",
	"place",
	"plain",
	"plan",
	"plane",
	"planet",
	"planned",
	"planning",
	"plant",
	"plastic",
	"plate",
	"plates",
	"play",
	"pleasant",
	"please",
	"pleasure",
	"plenty",
	"plural",
	"plus",
	"pocket",
	"poem",
	"poet",
	"poetry",
	"point",
	"pole",
	"police",
	"policeman",
	"political",
	"pond",
	"pony",
	"pool",
	"poor",
	"popular",
	"population",
	"porch",
	"port",
	"position",
	"positive",
	"possible",
	"possibly",
	"post",
	"pot",
	"potatoes",
	"pound",
	"pour",
	"powder",
	"power",
	"powerful",
	"practical",
	"practice",
	"prepare",
	"present",
	"president",
	"press",
	"pressure",
	"pretty",
	"prevent",
	"previous",
	"price",
	"pride",
	"primitive",
	"principal",
	"principle",
	"printed",
	"private",
	"prize",
	"probably",
	"problem",
	"process",
	"produce",
	"product",
	"production",
	"program",
	"progress",
	"promised",
	"proper",
	"properly",
	"property",
	"protection",
	"proud",
	"prove",
	"provide",
	"public",
	"pull",
	"pupil",
	"pure",
	"purple",
	"purpose",
	"push",
	"put",
	"putting",
	"quarter",
	"queen",
	"question",
	"quick",
	"quickly",
	"quiet",
	"quietly",
	"quite",
	"rabbit",
	"race",
	"radio",
	"railroad",
	"rain",
	"raise",
	"ran",
	"ranch",
	"range",
	"rapidly",
	"rate",
	"rather",
	"raw",
	"rays",
	"reach",
	"read",
	"reader",
	"ready",
	"real",
	"realize",
	"rear",
	"reason",
	"recall",
	"receive",
	"recent",
	"recently",
	"recognize",
	"record",
	"red",
	"refer",
	"refused",
	"region",
	"regular",
	"related",
	"relationship",
	"religious",
	"remain",
	"remarkable",
	"remember",
	"remove",
	"repeat",
	"replace",
	"replied",
	"report",
	"represent",
	"require",
	"research",
	"respect",
	"rest",
	"result",
	"return",
	"review",
	"rhyme",
	"rhythm",
	"rice",
	"rich",
	"ride",
	"riding",
	"right",
	"ring",
	"rise",
	"rising",
	"river",
	"road",
	"roar",
	"rock",
	"rocket",
	"rocky",
	"rod",
	"roll",
	"roof",
	"room",
	"root",
	"rope",
	"rose",
	"rough",
	"round",
	"route",
	"row",
	"rubbed",
	"rubber",
	"rule",
	"ruler",
	"run",
	"running",
	"rush",
	"sad",
	"saddle",
	"safe",
	"safety",
	"said",
	"sail",
	"sale",
	"salmon",
	"salt",
	"same",
	"sand",
	"sang",
	"sat",
	"satellites",
	"satisfied",
	"save",
	"saved",
	"saw",
	"say",
	"scale",
	"scared",
	"scene",
	"school",
	"science",
	"scientific",
	"scientist",
	"score",
	"screen",
	"sea",
	"search",
	"season",
	"seat",
	"second",
	"secret",
	"section",
	"see",
	"seed",
	"seeing",
	"seems",
	"seen",
	"seldom",
	"select",
	"selection",
	"sell",
	"send",
	"sense",
	"sent",
	"sentence",
	"separate",
	"series",
	"serious",
	"serve",
	"service",
	"sets",
	"setting",
	"settle",
	"settlers",
	"seven",
	"several",
	"shade",
	"shadow",
	"shake",
	"shaking",
	"shall",
	"shallow",
	"shape",
	"share",
	"sharp",
	"she",
	"sheep",
	"sheet",
	"shelf",
	"shells",
	"shelter",
	"shine",
	"shinning",
	"ship",
	"shirt",
	"shoe",
	"shoot",
	"shop",
	"shore",
	"short",
	"shorter",
	"shot",
	"should",
	"shoulder",
	"shout",
	"show",
	"shown",
	"shut",
	"sick",
	"sides",
	"sight",
	"sign",
	"signal",
	"silence",
	"silent",
	"silk",
	"silly",
	"silver",
	"similar",
	"simple",
	"simplest",
	"simply",
	"since",
	"sing",
	"single",
	"sink",
	"sister",
	"sit",
	"sitting",
	"situation",
	"six",
	"size",
	"skill",
	"skin",
	"sky",
	"slabs",
	"slave",
	"sleep",
	"slept",
	"slide",
	"slight",
	"slightly",
	"slip",
	"slipped",
	"slope",
	"slow",
	"slowly",
	"small",
	"smaller",
	"smallest",
	"smell",
	"smile",
	"smoke",
	"smooth",
	"snake",
	"snow",
	"so",
	"soap",
	"social",
	"society",
	"soft",
	"softly",
	"soil",
	"solar",
	"sold",
	"soldier",
	"solid",
	"solution",
	"solve",
	"some",
	"somebody",
	"somehow",
	"someone",
	"something",
	"sometime",
	"somewhere",
	"son",
	"song",
	"soon",
	"sort",
	"sound",
	"source",
	"south",
	"southern",
	"space",
	"speak",
	"special",
	"species",
	"specific",
	"speech",
	"speed",
	"spell",
	"spend",
	"spent",
	"spider",
	"spin",
	"spirit",
	"spite",
	"split",
	"spoken",
	"sport",
	"spread",
	"spring",
	"square",
	"stage",
	"stairs",
	"stand",
	"standard",
	"star",
	"stared",
	"start",
	"state",
	"statement",
	"station",
	"stay",
	"steady",
	"steam",
	"steel",
	"steep",
	"stems",
	"step",
	"stepped",
	"stick",
	"stiff",
	"still",
	"stock",
	"stomach",
	"stone",
	"stood",
	"stop",
	"stopped",
	"store",
	"storm",
	"story",
	"stove",
	"straight",
	"strange",
	"stranger",
	"straw",
	"stream",
	"street",
	"strength",
	"stretch",
	"strike",
	"string",
	"strip",
	"strong",
	"stronger",
	"struck",
	"structure",
	"struggle",
	"stuck",
	"student",
	"studied",
	"studying",
	"subject",
	"substance",
	"success",
	"successful",
	"such",
	"sudden",
	"suddenly",
	"sugar",
	"suggest",
	"suit",
	"sum",
	"summer",
	"sun",
	"sunlight",
	"supper",
	"supply",
	"support",
	"suppose",
	"sure",
	"surface",
	"surprise",
	"surrounded",
	"swam",
	"sweet",
	"swept",
	"swim",
	"swimming",
	"swing",
	"swung",
	"syllable",
	"symbol",
	"system",
	"table",
	"tail",
	"take",
	"taken",
	"tales",
	"talk",
	"tall",
	"tank",
	"tape",
	"task",
	"taste",
	"taught",
	"tax",
	"tea",
	"teach",
	"teacher",
	"team",
	"tears",
	"teeth",
	"telephone",
	"television",
	"tell",
	"temperature",
	"ten",
	"tent",
	"term",
	"terrible",
	"test",
	"than",
	"thank",
	"that",
	"thee",
	"them",
	"themselves",
	"then",
	"theory",
	"there",
	"therefore",
	"these",
	"they",
	"thick",
	"thin",
	"thing",
	"think",
	"third",
	"thirty",
	"this",
	"those",
	"thou",
	"though",
	"thought",
	"thousand",
	"thread",
	"three",
	"threw",
	"throat",
	"through",
	"throughout",
	"throw",
	"thrown",
	"thumb",
	"thus",
	"thy",
	"tide",
	"tie",
	"tight",
	"tightly",
	"till",
	"time",
	"tin",
	"tiny",
	"tip",
	"tired",
	"title",
	"to",
	"tobacco",
	"today",
	"together",
	"told",
	"tomorrow",
	"tone",
	"tongue",
	"tonight",
	"too",
	"took",
	"tool",
	"top",
	"topic",
	"torn",
	"total",
	"touch",
	"toward",
	"tower",
	"town",
	"toy",
	"trace",
	"track",
	"trade",
	"traffic",
	"trail",
	"train",
	"transportation",
	"trap",
	"travel",
	"treated",
	"tree",
	"triangle",
	"tribe",
	"trick",
	"tried",
	"trip",
	"troops",
	"tropical",
	"trouble",
	"truck",
	"trunk",
	"truth",
	"try",
	"tube",
	"tune",
	"turn",
	"twelve",
	"twenty",
	"twice",
	"two",
	"type",
	"typical",
	"uncle",
	"under",
	"underline",
	"understanding",
	"unhappy",
	"union",
	"unit",
	"universe",
	"unknown",
	"unless",
	"until",
	"unusual",
	"up",
	"upon",
	"upper",
	"upward",
	"us",
	"use",
	"useful",
	"using",
	"usual",
	"usually",
	"valley",
	"valuable",
	"value",
	"vapor",
	"variety",
	"various",
	"vast",
	"vegetable",
	"verb",
	"vertical",
	"very",
	"vessels",
	"victory",
	"view",
	"village",
	"visit",
	"visitor",
	"voice",
	"volume",
	"vote",
	"vowel",
	"voyage",
	"wagon",
	"wait",
	"walk",
	"wall",
	"want",
	"war",
	"warm",
	"warn",
	"was",
	"wash",
	"waste",
	"watch",
	"water",
	"wave",
	"way",
	"we",
	"weak",
	"wealth",
	"wear",
	"weather",
	"week",
	"weigh",
	"weight",
	"welcome",
	"well",
	"went",
	"were",
	"west",
	"western",
	"wet",
	"whale",
	"what",
	"whatever",
	"wheat",
	"wheel",
	"when",
	"whenever",
	"where",
	"wherever",
	"whether",
	"which",
	"while",
	"whispered",
	"whistle",
	"white",
	"who",
	"whole",
	"whom",
	"whose",
	"why",
	"wide",
	"widely",
	"wife",
	"wild",
	"will",
	"willing",
	"win",
	"wind",
	"window",
	"wing",
	"winter",
	"wire",
	"wise",
	"wish",
	"with",
	"within",
	"without",
	"wolf",
	"women",
	"won",
	"wonder",
	"wonderful",
	"wood",
	"wooden",
	"wool",
	"word",
	"wore",
	"work",
	"worker",
	"world",
	"worried",
	"worry",
	"worse",
	"worth",
	"would",
	"wrapped",
	"write",
	"writer",
	"writing",
	"written",
	"wrong",
	"wrote",
	"yard",
	"year",
	"yellow",
	"yes",
	"yesterday",
	"yet",
	"you",
	"young",
	"younger",
	"your",
	"yourself",
	"youth",
	"zero",
	"zebra",
	"zipper",
	"zoo",
	"zulu"
];

//#endregion
//#region src/lib/handlers/signup/random-words/index.ts
const shortestWordSize = wordList.reduce((shortestWord, currentWord) => currentWord.length < shortestWord.length ? currentWord : shortestWord).length;
const longestWordSize = wordList.reduce((longestWord, currentWord) => currentWord.length > longestWord.length ? currentWord : longestWord).length;
function generate(options) {
	const { minLength, maxLength, ...rest } = options || {};
	function word() {
		let min = typeof minLength !== "number" ? shortestWordSize : limitWordSize(minLength);
		const max = typeof maxLength !== "number" ? longestWordSize : limitWordSize(maxLength);
		if (min > max) min = max;
		let rightSize = false;
		let wordUsed;
		while (!rightSize) {
			wordUsed = generateRandomWord();
			rightSize = wordUsed.length <= max && wordUsed.length >= min;
		}
		return wordUsed;
	}
	function generateRandomWord() {
		return wordList[randInt(wordList.length)];
	}
	function limitWordSize(wordSize) {
		if (wordSize < shortestWordSize) wordSize = shortestWordSize;
		if (wordSize > longestWordSize) wordSize = longestWordSize;
		return wordSize;
	}
	function randInt(lessThan) {
		return Math.floor(Math.random() * lessThan);
	}
	if (options === void 0) return word();
	if (typeof options === "number") options = { exactly: options };
	else if (Object.keys(rest).length === 0) return word();
	if (options.exactly) {
		options.min = options.exactly;
		options.max = options.exactly;
	}
	if (typeof options.wordsPerString !== "number") options.wordsPerString = 1;
	if (typeof options.formatter !== "function") options.formatter = (word) => word;
	if (typeof options.separator !== "string") options.separator = " ";
	const total = options.min + randInt(options.max + 1 - options.min);
	let results = [];
	let token = "";
	let relativeIndex = 0;
	for (let i = 0; i < total * options.wordsPerString; i++) {
		if (relativeIndex === options.wordsPerString - 1) token += options.formatter(word(), relativeIndex);
		else token += options.formatter(word(), relativeIndex) + options.separator;
		relativeIndex++;
		if ((i + 1) % options.wordsPerString === 0) {
			results.push(token);
			token = "";
			relativeIndex = 0;
		}
	}
	if (typeof options.join === "string") results = results.join(options.join);
	return results;
}

//#endregion
//#region src/lib/handlers/signup/api/HandleSignupCheck.ts
const HandleSignupCheck = (e) => {
	const instanceName = (() => {
		const name = (e.request.url.query().get("name") || "").trim();
		if (name) {
			if (name.match(/^[a-z][a-z0-9-]{2,39}$/) === null) throw error(`instanceName`, `invalid`, `Instance name must begin with a letter, be between 3-40 characters, and can only contain a-z, 0-9, and hyphen (-).`);
			if (isAvailable(name)) return name;
			throw error(`instanceName`, `exists`, `Instance name ${name} is not available.`);
		} else {
			let i = 0;
			while (true) {
				i++;
				if (i > 100) return +/* @__PURE__ */ new Date();
				const slug = generate(2).join(`-`);
				if (isAvailable(slug)) return slug;
			}
		}
	})();
	return e.json(200, { instanceName });
};

//#endregion
//#region src/lib/handlers/signup/api/HandleSignupConfirm.ts
const suggestUniqueAuthRecordUsername = (collection, baseUsername) => {
	let username = baseUsername;
	for (let i = 0; i < 10; i++) {
		try {
			if ($app.countRecords(collection, $dbx.exp("LOWER([[username]])={:username}", { username: username.toLowerCase() })) === 0) break;
		} catch {}
		username = baseUsername + $security.randomStringWithAlphabet(3 + i, "123456789");
	}
	return username;
};
const HandleSignupConfirm = (e) => {
	const parsed = (() => {
		const rawBody = readerToString(e.request.body);
		try {
			return JSON.parse(rawBody);
		} catch (e) {
			throw new BadRequestError(`Error parsing payload. You call this JSON? ${rawBody}`, e);
		}
	})();
	const email = parsed.email?.trim().toLowerCase();
	const password = parsed.password?.trim();
	const desiredInstanceName = parsed.instanceName?.trim();
	const version = parsed.version?.trim() || listVersions()[0];
	if (!email) throw error(`email`, "required", "Email is required");
	if (!password) throw error(`password`, `required`, "Password is required");
	if (!desiredInstanceName) throw error(`instanceName`, `required`, `Instance name is required`);
	if ((() => {
		try {
			$app.findFirstRecordByData("users", "email", email);
			return true;
		} catch {
			return false;
		}
	})()) throw error(`email`, `exists`, `That user account already exists. Try a password reset.`);
	$app.runInTransaction((txApp) => {
		const usersCollection = $app.findCollectionByNameOrId("users");
		const instanceCollection = $app.findCollectionByNameOrId("instances");
		const user = new Record(usersCollection);
		try {
			const username = suggestUniqueAuthRecordUsername("users", "user" + $security.randomStringWithAlphabet(5, "123456789"));
			user.set("username", username);
			user.set("email", email);
			user.set("subscription", "free");
			user.set("subscription_quantity", 0);
			user.set("subscription_status", "lapsed");
			user.set("volume_storage_used", 0);
			user.set("object_storage_used", 0);
			user.setPassword(password);
			txApp.save(user);
		} catch (e) {
			throw error(`email`, `fail`, `Could not create user: ${e}`);
		}
		try {
			const instance = new Record(instanceCollection);
			instance.set("subdomain", desiredInstanceName);
			instance.set("uid", user.get("id"));
			instance.set("status", "idle");
			instance.set("power", true);
			instance.set("syncAdmin", true);
			instance.set("autoVacuum", true);
			instance.set("dev", true);
			instance.set("version", version);
			txApp.save(instance);
		} catch (e) {
			if (`${e}`.match(/ UNIQUE /)) throw error(`instanceName`, `exists`, `Instance name was taken, sorry about that. Try another.`);
			throw error(`instanceName`, `fail`, `Could not create instance: ${e}`);
		}
		$mails.sendRecordVerification($app, user);
	});
	return e.json(200, { status: "ok" });
};

//#endregion
//#region src/lib/handlers/sns/api/HandleSesError.ts
function isSnsSubscriptionConfirmationEvent(event) {
	return event.Type === "SubscriptionConfirmation";
}
function isSnsNotificationEvent(event) {
	return event.Type === "Notification";
}
function sesEventType(msg) {
	return String(msg.notificationType ?? msg.eventType ?? "");
}
const HandleSesError = (e) => {
	const log = mkLog(`sns`);
	const audit = mkAudit(log, $app);
	const processBounce = (emailAddress) => {
		log(`Processing bounce ${emailAddress}`);
		const extra = { email: emailAddress };
		try {
			const user = $app.findFirstRecordByData("users", "email", emailAddress);
			log(`user is`, user);
			extra.user = user.id;
			suppressUserEmail(user);
			$app.save(user);
			audit("PBOUNCE", `User ${emailAddress} has been disabled`, extra);
		} catch (e) {
			audit("PBOUNCE_ERR", `${e}`, extra);
		}
	};
	const processComplaint = (emailAddress) => {
		log(`Processing complaint ${emailAddress}`);
		const extra = { email: emailAddress };
		try {
			const user = $app.findFirstRecordByData("users", "email", emailAddress);
			log(`user is`, user);
			extra.user = user.id;
			suppressUserEmail(user);
			$app.save(user);
			audit("COMPLAINT", `User ${emailAddress} has been unsubscribed`, extra);
		} catch (e) {
			audit("COMPLAINT_ERR", `${emailAddress} is not in the system.`, extra);
		}
	};
	const raw = readerToString(e.request.body);
	const data = JSON.parse(raw);
	log(JSON.stringify(data, null, 2));
	if (isSnsSubscriptionConfirmationEvent(data)) {
		const url = data.SubscribeURL;
		log(url);
		$http.send({ url });
		return e.json(200, { status: "ok" });
	}
	if (!isSnsNotificationEvent(data)) {
		audit("SNS_ERR", `Unrecognized SNS envelope type ${data.Type}`, { raw });
		return e.json(200, { status: "ok" });
	}
	const msg = JSON.parse(data.Message);
	log(msg);
	const eventType = sesEventType(msg);
	if (eventType === "Bounce") {
		log(`Message is a bounce`);
		const bounce = msg.bounce;
		if (!bounce) {
			audit("SNS_ERR", "Bounce event missing bounce object", { raw });
			return e.json(200, { status: "ok" });
		}
		const { bounceType, bouncedRecipients } = bounce;
		if (bounceType === `Permanent`) {
			log(`Message is a permanent bounce`);
			bouncedRecipients.forEach((recipient) => {
				processBounce(recipient.emailAddress);
			});
		} else audit("SNS_ERR", `Unrecognized bounce type ${bounceType}`, { raw });
		return e.json(200, { status: "ok" });
	}
	if (eventType === "Complaint") {
		log(`Message is a Complaint`, msg);
		const complaint = msg.complaint;
		if (!complaint) {
			audit("SNS_ERR", "Complaint event missing complaint object", { raw });
			return e.json(200, { status: "ok" });
		}
		complaint.complainedRecipients.forEach((recipient) => {
			processComplaint(recipient.emailAddress);
		});
		return e.json(200, { status: "ok" });
	}
	audit("SNS_ERR", `Unrecognized SES event type ${eventType}`, { raw });
	return e.json(200, { status: "ok" });
};

//#endregion
//#region ../common/sshPublicKey.ts
/** JSVM-safe ssh-ed25519 public key parsing. Safe for pb_hooks (Goja) and Node/browser consumers. */
const ED25519_ALGO = "ssh-ed25519";
const ED25519_WIRE_KEY_LEN = 32;
const ED25519_WIRE_LEN = 51;
const readUint32BE = (bytes, offset) => {
	if (offset + 4 > bytes.length) throw new Error("Invalid public key encoding.");
	return (bytes[offset] << 24 | bytes[offset + 1] << 16 | bytes[offset + 2] << 8 | bytes[offset + 3]) >>> 0;
};
const readSshString = (bytes, offset) => {
	const length = readUint32BE(bytes, offset);
	offset += 4;
	if (length < 0 || offset + length > bytes.length) throw new Error("Invalid public key encoding.");
	return {
		value: bytes.slice(offset, offset + length),
		nextOffset: offset + length
	};
};
const bytesToAscii = (bytes) => {
	let out = "";
	for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
	return out;
};
const decodeBase64 = (value) => {
	const normalized = value.replace(/[\s\r\n]+/g, "");
	if (!normalized || normalized.length % 4 === 1 || !/^[A-Za-z0-9+/]+=*$/.test(normalized)) throw new Error("Public key base64 is invalid.");
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	const bytes = [];
	let buffer = 0;
	let bits = 0;
	for (const char of normalized.replace(/=+$/, "")) {
		const index = alphabet.indexOf(char);
		if (index === -1) throw new Error("Public key base64 is invalid.");
		buffer = buffer << 6 | index;
		bits += 6;
		if (bits >= 8) {
			bits -= 8;
			bytes.push(buffer >> bits & 255);
		}
	}
	return new Uint8Array(bytes);
};
const validateWire = (wire) => {
	if (wire.length !== ED25519_WIRE_LEN) throw new Error("Invalid Ed25519 public key length.");
	let offset = 0;
	const algo = readSshString(wire, offset);
	offset = algo.nextOffset;
	if (bytesToAscii(algo.value) !== ED25519_ALGO) throw new Error("Public key algorithm must be ssh-ed25519.");
	const key = readSshString(wire, offset);
	if (key.value.length !== ED25519_WIRE_KEY_LEN) throw new Error("Invalid Ed25519 public key length.");
	if (key.nextOffset !== wire.length) throw new Error("Invalid public key encoding.");
};
const parseSshEd25519PublicKey = (input) => {
	const trimmed = input.trim();
	if (!trimmed) throw new Error("Public key is required.");
	const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
	if (lines.length > 1) throw new Error("Paste a single public key line only.");
	const parts = (lines[0] ?? "").split(/\s+/).filter(Boolean);
	if (parts.length < 2) throw new Error("Public key must look like: ssh-ed25519 AAAA… comment");
	const algo = parts[0];
	const keyData = parts[1];
	if (algo !== ED25519_ALGO) throw new Error("Only ssh-ed25519 public keys are supported.");
	const wire = decodeBase64(keyData);
	validateWire(wire);
	const comment = parts.slice(2).join(" ");
	return {
		normalized: comment ? `${ED25519_ALGO} ${keyData} ${comment}` : `${ED25519_ALGO} ${keyData}`,
		wire
	};
};

//#endregion
//#region src/lib/handlers/sshKeys/model/validateSshKey.ts
const validateSshKeyRecord = (record, authId) => {
	const log = mkLog(`ssh-keys`);
	let parsed;
	try {
		parsed = parseSshEd25519PublicKey(record.getString("public_key"));
	} catch (error) {
		throw new BadRequestError(`${error}`);
	}
	record.set("public_key", parsed.normalized);
	if (!record.getString("fingerprint").trim().startsWith("SHA256:")) throw new BadRequestError("Invalid fingerprint.");
	const allInstances = record.getBool("all_instances");
	const instanceIds = record.getStringSlice("instances") || [];
	if (!allInstances && instanceIds.length === 0) throw new BadRequestError("Select at least one instance or choose all instances.");
	if (!allInstances) for (const instanceId of instanceIds) {
		const instance = $app.findRecordById("instances", instanceId);
		if (instance.getString("uid") !== authId) {
			log({
				instanceId,
				authId,
				uid: instance.getString("uid")
			});
			throw new BadRequestError("One or more selected instances are not owned by you.");
		}
	}
	if (allInstances) record.set("instances", []);
};
const BeforeCreate_ssh_keys = (e) => {
	const record = e.record;
	if (!record) throw new BadRequestError("Missing record.");
	const authRecord = e.auth;
	if (!authRecord) throw new BadRequestError("Authentication required.");
	record.set("user", authRecord.id);
	validateSshKeyRecord(record, authRecord.id);
};
const BeforeUpdate_ssh_keys = (e) => {
	const record = e.record;
	if (!record) throw new BadRequestError("Missing record.");
	const authRecord = e.auth;
	if (!authRecord) throw new BadRequestError("Authentication required.");
	if (record.getString("user") !== authRecord.id) throw new ForbiddenError("You can only update your own SSH keys.");
	validateSshKeyRecord(record, authRecord.id);
};

//#endregion
//#region src/lib/handlers/stats/lib/refreshPublicStats.ts
const mkPublicStatsPath = () => `${$app.dataDir()}/stats.json`;
const refreshPublicStats = () => {
	const log = mkLog("refreshPublicStats");
	const db = $app.db();
	const users = new DynamicModel({ total: 0 });
	db.newQuery("SELECT COUNT(*) as total FROM users").one(users);
	const instances = new DynamicModel({ total: 0 });
	db.newQuery("SELECT COUNT(*) as total FROM instances").one(instances);
	const stats = {
		updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
		developers: users.total,
		instances: instances.total
	};
	$os.writeFile(mkPublicStatsPath(), JSON.stringify(stats), 420);
	log(`Wrote stats.json`, stats);
	return stats;
};

//#endregion
//#region src/lib/handlers/stats/api/HandleStatsRequest.ts
/** Public aggregate platform stats (hourly cron + on-demand refresh). */
const HandleStatsRequest = (e) => {
	const readStats = () => {
		const raw = $os.readFile(mkPublicStatsPath());
		return JSON.parse(typeof raw === "string" ? raw : String(raw));
	};
	try {
		return e.json(200, readStats());
	} catch {
		return e.json(200, refreshPublicStats());
	}
};

//#endregion
//#region src/lib/handlers/stats/boot/HandleStatsRefreshAtBoot.ts
const HandleStatsRefreshAtBoot = (_e) => {
	refreshPublicStats();
};

//#endregion
//#region src/lib/handlers/user/api/HandleUserTokenRequest.ts
const HandleUserTokenRequest = (e) => {
	mkLog(`user-token`);
	const id = e.request.pathValue("id");
	if (!id) throw new BadRequestError(`User ID is required.`);
	const rec = $app.findRecordById("users", id);
	const tokenKey = rec.getString("tokenKey");
	const passwordHash = rec.getString("password:hash");
	const email = rec.getString(`email`);
	return e.json(200, {
		email,
		passwordHash,
		tokenKey
	});
};

//#endregion
//#region ../common/trustedIps.ts
/** Max trusted IP entries per active account. */
const TRUSTED_IPS_MAX = 5;
const maxTrustedIpsForSubscription = (subscription) => {
	if (!subscription) return 0;
	return 5;
};
const isValidIpv4 = (value) => {
	const parts = value.split(".");
	if (parts.length !== 4) return false;
	for (const part of parts) {
		if (!/^\d+$/.test(part)) return false;
		const n = Number(part);
		if (n < 0 || n > 255) return false;
	}
	return true;
};
const isValidIpv6 = (value) => {
	if (!value.includes(":")) return false;
	if (value.includes("..")) return false;
	return /^[0-9a-f:]+$/i.test(value);
};
const isUnrestrictedCidr = (entry) => {
	const normalized = entry.trim().toLowerCase();
	return normalized === "0.0.0.0/0" || normalized === "::/0";
};
const normalizeTrustedIpEntry = (entry) => {
	const trimmed = entry.trim();
	if (!trimmed) throw new Error("IP address cannot be empty.");
	if (isUnrestrictedCidr(trimmed)) throw new Error("Unrestricted CIDR ranges are not allowed.");
	const slash = trimmed.indexOf("/");
	const host = slash === -1 ? trimmed : trimmed.slice(0, slash);
	const prefix = slash === -1 ? "" : trimmed.slice(slash + 1);
	if (slash !== -1) {
		if (!/^\d+$/.test(prefix)) throw new Error(`Invalid CIDR prefix in "${entry}".`);
		const prefixNum = Number(prefix);
		const maxPrefix = host.includes(":") ? 128 : 32;
		if (prefixNum < 0 || prefixNum > maxPrefix) throw new Error(`Invalid CIDR prefix in "${entry}".`);
	}
	if (isValidIpv4(host)) return slash === -1 ? `${host}/32` : `${host}/${prefix}`;
	if (isValidIpv6(host)) return slash === -1 ? `${host}/128` : `${host}/${prefix}`;
	throw new Error(`Invalid IP or CIDR: "${entry}".`);
};
const normalizeTrustedIpList = (raw) => {
	if (raw == null) return [];
	if (!Array.isArray(raw)) throw new Error("trusted_ips must be an array of IP addresses or CIDR ranges.");
	const normalized = [];
	const seen = /* @__PURE__ */ new Set();
	for (const entry of raw) {
		const text = entry == null ? "" : `${entry}`.trim();
		if (!text || text === "[object Object]") throw new Error("Each trusted IP must be a string.");
		const value = normalizeTrustedIpEntry(text);
		if (seen.has(value)) continue;
		seen.add(value);
		normalized.push(value);
	}
	return normalized;
};
const validateTrustedIpListForSubscription = (raw, subscription) => {
	const normalized = normalizeTrustedIpList(raw);
	const max = maxTrustedIpsForSubscription(subscription);
	if (normalized.length > max) {
		if (max === 0) throw new Error("Account required to manage trusted IPs.");
		throw new Error(`You can add at most ${max} trusted IPs per account.`);
	}
	return normalized;
};

//#endregion
//#region src/lib/handlers/user/model/trustedIps.ts
const log = mkLog(`trusted-ips`);
const describeValue = (value) => {
	try {
		return JSON.stringify(value);
	} catch {
		return `${value}`;
	}
};
const clientErrorMessage = (error) => {
	if (error instanceof Error) return error.message;
	return `${error}`;
};
/** Read a JSON array field from a record in Goja — see pocketbase-jsvm/quirks.md § toString. */
const readTrustedIpsFromRecord = (record) => {
	try {
		const raw = record.get(`trusted_ips`);
		if (raw == null) return null;
		const roundTripped = JSON.parse(JSON.stringify(raw));
		if (Array.isArray(roundTripped) && roundTripped.length > 0 && typeof roundTripped[0] === "string") return roundTripped;
		if (Array.isArray(roundTripped) && roundTripped.length === 0) return roundTripped;
		return JSON.parse(toString(raw));
	} catch {
		return null;
	}
};
const validateTrustedIpsForSubscription = (raw, subscription) => {
	try {
		return validateTrustedIpListForSubscription(raw, subscription);
	} catch (error) {
		throw new BadRequestError(clientErrorMessage(error));
	}
};
const bindTrustedIpsBody = (e) => {
	log(`bindBody: content-type=${e.request.header.get(`Content-Type`) || `(none)`} rawBody=${readerToString(e.request.body)}`);
	let data = new DynamicModel({ trusted_ips: [] });
	e.bindBody(data);
	log(`bindBody: after bind trusted_ips=${describeValue(data.trusted_ips)} typeof=${typeof data.trusted_ips}`);
	data = JSON.parse(JSON.stringify(data));
	log(`bindBody: after round-trip trusted_ips=${describeValue(data.trusted_ips)}`);
	const requestInfoBody = e.requestInfo().body;
	log(`bindBody: requestInfo().body=${describeValue(requestInfoBody)}`);
	if (!(`trusted_ips` in data)) throw new BadRequestError(`trusted_ips is required`);
	return data;
};
const HandleUserTrustedIpsUpdate = (e) => {
	const authRecord = e.auth;
	if (!authRecord) throw new UnauthorizedError(`Authentication required`);
	log(`PATCH: user=${authRecord.id} subscription=${authRecord.getString(`subscription`)}`);
	const { trusted_ips: rawTrustedIps } = bindTrustedIpsBody(e);
	log(`PATCH: rawTrustedIps=${describeValue(rawTrustedIps)}`);
	const normalized = validateTrustedIpsForSubscription(rawTrustedIps, authRecord.getString(`subscription`));
	log(`PATCH: normalized=${describeValue(normalized)}`);
	const user = $app.findRecordById(`users`, authRecord.id);
	log(`PATCH: before save stored=${describeValue(readTrustedIpsFromRecord(user))}`);
	user.set(`trusted_ips`, normalized.length > 0 ? normalized : null);
	$app.save(user);
	log(`PATCH: after save stored=${describeValue(readTrustedIpsFromRecord(user))}`);
	return e.json(200, { trusted_ips: normalized });
};
const HandleUserTrustedIpsGet = (e) => {
	const authRecord = e.auth;
	if (!authRecord) throw new UnauthorizedError(`Authentication required`);
	const raw = readTrustedIpsFromRecord($app.findRecordById(`users`, authRecord.id));
	log(`GET: user=${authRecord.id} raw=${describeValue(raw)}`);
	let trusted_ips;
	try {
		trusted_ips = normalizeTrustedIpList(raw);
	} catch (error) {
		throw new BadRequestError(clientErrorMessage(error));
	}
	log(`GET: normalized=${describeValue(trusted_ips)}`);
	return e.json(200, { trusted_ips });
};

//#endregion
//#region src/lib/handlers/versions/api/HandleVersionsRequest.ts
/** PocketBase versions a user may pick (0.23+). Legacy versions still run but are not offered. */
const HandleVersionsRequest = (e) => {
	return e.json(200, { versions: listSelectableVersions() });
};

//#endregion
exports.AfterCreate_notify_discord = AfterCreate_notify_discord;
exports.BeforeCreate_autoVacuum = BeforeCreate_autoVacuum;
exports.BeforeCreate_ssh_keys = BeforeCreate_ssh_keys;
exports.BeforeCreate_version = BeforeCreate_version;
exports.BeforeUpdateRequest_edge = BeforeUpdateRequest_edge;
exports.BeforeUpdate_cname = BeforeUpdate_cname;
exports.BeforeUpdate_ssh_keys = BeforeUpdate_ssh_keys;
exports.BeforeUpdate_version = BeforeUpdate_version;
exports.HandleApiTokenCreate = HandleApiTokenCreate;
exports.HandleApiTokenUpdate = HandleApiTokenUpdate;
exports.HandleArchiveDownload = HandleArchiveDownload;
exports.HandleBackupDownload = HandleBackupDownload;
exports.HandleCustomHostnameRegister = HandleCustomHostnameRegister;
exports.HandleCustomHostnamesSweep = HandleCustomHostnamesSweep;
exports.HandleEdgeHeartbeat = HandleEdgeHeartbeat;
exports.HandleInstanceCreate = HandleInstanceCreate;
exports.HandleInstanceDelete = HandleInstanceDelete;
exports.HandleInstanceUpdate = HandleInstanceUpdate;
exports.HandleInstancesResetIdle = HandleInstancesResetIdle;
exports.HandleInstancesRuntimeReset = HandleInstancesRuntimeReset;
exports.HandleLemonSqueezyCancel = HandleLemonSqueezyCancel;
exports.HandleLemonSqueezyCheckout = HandleLemonSqueezyCheckout;
exports.HandleLemonSqueezyReconcile = HandleLemonSqueezyReconcile;
exports.HandleLemonSqueezySale = HandleLemonSqueezySale;
exports.HandleLivePlatformRefresh = HandleLivePlatformRefresh;
exports.HandleMailSend = HandleMailSend;
exports.HandleMetaUpdateAtBoot = HandleMetaUpdateAtBoot;
exports.HandleMigrateCnamesToDomains = HandleMigrateCnamesToDomains;
exports.HandleMigrateInstanceVersions = HandleMigrateInstanceVersions;
exports.HandleMirrorData = HandleMirrorData;
exports.HandleMirrorSync = HandleMirrorSync;
exports.HandleOutpostUnsubscribe = HandleOutpostUnsubscribe;
exports.HandlePatInstances = HandlePatInstances;
exports.HandlePatVerify = HandlePatVerify;
exports.HandlePatWhoami = HandlePatWhoami;
exports.HandleProcessNotification = HandleProcessNotification;
exports.HandleProcessSingleNotification = HandleProcessSingleNotification;
exports.HandleSesError = HandleSesError;
exports.HandleSignupCheck = HandleSignupCheck;
exports.HandleSignupConfirm = HandleSignupConfirm;
exports.HandleStatsRefreshAtBoot = HandleStatsRefreshAtBoot;
exports.HandleStatsRequest = HandleStatsRequest;
exports.HandleUserTokenRequest = HandleUserTokenRequest;
exports.HandleUserTrustedIpsGet = HandleUserTrustedIpsGet;
exports.HandleUserTrustedIpsUpdate = HandleUserTrustedIpsUpdate;
exports.HandleUserWelcomeMessage = HandleUserWelcomeMessage;
exports.HandleVersionsRequest = HandleVersionsRequest;
exports.LIVE_PLATFORM_TOPIC = LIVE_PLATFORM_TOPIC;
exports.LIVE_VIEW_STATS_TOPIC = LIVE_VIEW_STATS_TOPIC;
exports.broadcastLivePlatformStats = broadcastLivePlatformStats;
exports.broadcastLiveViewStats = broadcastLiveViewStats;
exports.cronSweepCustomHostnames = cronSweepCustomHostnames;
exports.getLivePlatformStats = getLivePlatformStats;
exports.getLiveViewStats = getLiveViewStats;
exports.handleLivePlatformInstanceCreate = handleLivePlatformInstanceCreate;
exports.handleLivePlatformInstanceDelete = handleLivePlatformInstanceDelete;
exports.handleLivePlatformInstanceUpdate = handleLivePlatformInstanceUpdate;
exports.handleLivePlatformStatsCron = handleLivePlatformStatsCron;
exports.handleLivePlatformUserCreate = handleLivePlatformUserCreate;
exports.handleLivePlatformUserDelete = handleLivePlatformUserDelete;
exports.handleLivePlatformUserUpdate = handleLivePlatformUserUpdate;
exports.handleLiveViewStatsCron = handleLiveViewStatsCron;
exports.initLivePlatformStatsAtBoot = initLivePlatformStatsAtBoot;
exports.initLiveViewStatsAtBoot = initLiveViewStatsAtBoot;
exports.markStaleEdges = markStaleEdges;
exports.mkPublicStatsPath = mkPublicStatsPath;
exports.normalizeInstanceStatus = normalizeInstanceStatus;
exports.parseInstanceScope = parseInstanceScope;
exports.readTrustedIpsFromRecord = readTrustedIpsFromRecord;
exports.reasonToDelete = reasonToDelete;
exports.recountLivePlatformStats = recountLivePlatformStats;
exports.refreshAndBroadcastLivePlatformStats = refreshAndBroadcastLivePlatformStats;
exports.refreshAndBroadcastLiveViewStats = refreshAndBroadcastLiveViewStats;
exports.refreshLiveViewStats = refreshLiveViewStats;
exports.refreshPublicStats = refreshPublicStats;
exports.sendLivePlatformStatsToClient = sendLivePlatformStatsToClient;
exports.sendLiveViewStatsToClient = sendLiveViewStatsToClient;
exports.sweepCustomHostnames = sweepCustomHostnames;
exports.verifyPat = verifyPat;