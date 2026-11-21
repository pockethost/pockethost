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
//#region src/lib/util/mothershipUrl.ts
/**
* The mothership's public base URL, for links in emails that must reach mothership routes (bulk mail unsubscribe,
* loyalty resume). Not `settings.meta.appURL`: that is the website (https://pockethost.io), which doesn't serve
* `/api/*`. Override with MOTHERSHIP_PUBLIC_URL.
*/
const mothershipPublicUrl = () => `${process.env.MOTHERSHIP_PUBLIC_URL || "https://mothership.pockethost.io"}`.replace(/\/+$/, "");

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
//#region src/lib/util/bulkmail/template.ts
const pathRe = /^[A-Za-z_]\w*(\.[A-Za-z_]\w*)*$/;
const parseTemplate = (src) => {
	const root = [];
	const stack = [];
	const push = (n) => {
		const f = stack[stack.length - 1];
		if (!f) root.push(n);
		else if (f.inElse) f.node.els.push(n);
		else f.node.then.push(n);
	};
	const tagRe = /\{\{\s*(.*?)\s*\}\}/g;
	let pos = 0;
	let m;
	while (m = tagRe.exec(src)) {
		if (m.index > pos) push({
			kind: "text",
			text: src.slice(pos, m.index)
		});
		pos = m.index + m[0].length;
		const tag = m[1];
		if (tag.startsWith("if ")) {
			let cond = tag.slice(3).trim();
			let negate = false;
			if (cond.startsWith("!")) {
				negate = true;
				cond = cond.slice(1).trim();
			}
			if (!pathRe.test(cond)) throw new Error(`invalid condition "${tag}"`);
			stack.push({
				node: {
					kind: "if",
					path: cond,
					negate,
					then: [],
					els: []
				},
				inElse: false
			});
		} else if (tag === "else") {
			const f = stack[stack.length - 1];
			if (!f || f.inElse) throw new Error("unexpected {{else}}");
			f.inElse = true;
		} else if (tag === "end") {
			const f = stack.pop();
			if (!f) throw new Error("unexpected {{end}}");
			push(f.node);
		} else {
			if (!pathRe.test(tag)) throw new Error(`invalid placeholder {{${tag}}}`);
			push({
				kind: "var",
				path: tag
			});
		}
	}
	if (stack.length) throw new Error(`missing {{end}} for {{if ${stack[stack.length - 1].node.path}}}`);
	if (pos < src.length) push({
		kind: "text",
		text: src.slice(pos)
	});
	return root;
};
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&#34;").replace(/'/g, "&#39;");
const lookup = (data, path) => {
	let cur = data;
	for (const part of path.split(".")) {
		if (cur === null || typeof cur !== "object") return void 0;
		cur = cur[part];
	}
	return cur;
};
const toStr = (v) => {
	if (v === void 0 || v === null) return "";
	if (Array.isArray(v)) return v.join(", ");
	return String(v);
};
const truthy = (v) => {
	if (v === void 0 || v === null) return false;
	if (typeof v === "boolean") return v;
	if (typeof v === "number") return v !== 0;
	if (typeof v === "string") {
		const s = v.trim().toLowerCase();
		return s !== "" && s !== "0" && s !== "false";
	}
	if (Array.isArray(v)) return v.length > 0;
	if (typeof v === "object") return Object.keys(v).length > 0;
	return toStr(v) !== "";
};
const renderNodes = (nodes, data, escape) => nodes.map((n) => {
	if (n.kind === "text") return n.text;
	if (n.kind === "var") {
		const v = toStr(lookup(data, n.path));
		return escape ? escapeHtml(v) : v;
	}
	return truthy(lookup(data, n.path)) !== n.negate ? renderNodes(n.then, data, escape) : renderNodes(n.els, data, escape);
}).join("");
const renderTemplate = (src, data, escape) => renderNodes(parseTemplate(src), data, escape);
/** Legacy mailer placeholders: {$Var} (keys were matched lowercased) → {{var}}. */
const convertLegacyTemplate = (src) => src.replace(/\{\$(\w+)\}/g, (_m, key) => `{{${key.toLowerCase()}}}`);
const footerHtml = (unsubscribeUrl, postal) => {
	let s = `<hr style="border:0;border-top:1px solid #ddd;margin:24px 0 12px"><p style="font-size:12px;color:#777">Don't want these emails? <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a>.`;
	postal = postal.trim();
	if (postal) s += "<br>" + escapeHtml(postal).replace(/\n/g, "<br>");
	return s + "</p>";
};
const footerText = (unsubscribeUrl, postal) => {
	let s = "\n\n--\nUnsubscribe: " + unsubscribeUrl;
	postal = postal.trim();
	if (postal) s += "\n" + postal;
	return s;
};
const entities = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": "\"",
	"&#34;": "\"",
	"&#39;": "'",
	"&nbsp;": " "
};
const htmlToText = (s) => {
	s = s.replace(/<br\s*\/?>|<\/p>|<\/div>|<\/h[1-6]>|<\/li>/gi, "\n");
	s = s.replace(/<[^>]*>/g, "");
	s = s.replace(/&[#\w]+;/g, (e) => entities[e] ?? e);
	return s.split("\n").map((l) => l.trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
};
const normalizeEmail$1 = (s) => {
	const e = `${s ?? ""}`.trim().toLowerCase();
	return /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/.test(e) ? e : "";
};

//#endregion
//#region src/lib/util/bulkmail/token.ts
/**
* Unsubscribe tokens, byte-for-byte the same as PocketBase CE ext/bulkmail (suppress.go), so links mailed by the legacy
* mothership keep working after the CE plugin takes over (it reads the same secret from _params "bulkmail"):
*
* Base64url(email + "\n" + campaignId) + "." + base64url(first 16 bytes of HMAC-SHA256(secret, payload))
*/
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const utf8$1 = (s) => {
	const out = [];
	for (const ch of s) {
		let c = ch.codePointAt(0);
		if (c < 128) out.push(c);
		else if (c < 2048) out.push(192 | c >> 6, 128 | c & 63);
		else if (c < 65536) out.push(224 | c >> 12, 128 | c >> 6 & 63, 128 | c & 63);
		else out.push(240 | c >> 18, 128 | c >> 12 & 63, 128 | c >> 6 & 63, 128 | c & 63);
	}
	return out;
};
const fromUtf8 = (b) => {
	let s = "";
	for (let i = 0; i < b.length;) {
		const c = b[i];
		let cp;
		if (c < 128) cp = c, i += 1;
		else if (c < 224) cp = (c & 31) << 6 | b[i + 1] & 63, i += 2;
		else if (c < 240) cp = (c & 15) << 12 | (b[i + 1] & 63) << 6 | b[i + 2] & 63, i += 3;
		else cp = (c & 7) << 18 | (b[i + 1] & 63) << 12 | (b[i + 2] & 63) << 6 | b[i + 3] & 63, i += 4;
		s += String.fromCodePoint(cp);
	}
	return s;
};
const b64url = (bytes) => {
	let s = "";
	for (let i = 0; i < bytes.length; i += 3) {
		const n = bytes[i] << 16 | (bytes[i + 1] ?? 0) << 8 | (bytes[i + 2] ?? 0);
		s += B64[n >> 18 & 63] + B64[n >> 12 & 63];
		if (i + 1 < bytes.length) s += B64[n >> 6 & 63];
		if (i + 2 < bytes.length) s += B64[n & 63];
	}
	return s;
};
const b64urlDecode = (s) => {
	const out = [];
	let buf = 0;
	let bits = 0;
	for (const ch of s) {
		const v = B64.indexOf(ch);
		if (v < 0) return null;
		buf = buf << 6 | v;
		bits += 6;
		if (bits >= 8) {
			bits -= 8;
			out.push(buf >> bits & 255);
		}
	}
	return out;
};
const hexBytes = (hex) => {
	const out = [];
	for (let i = 0; i + 1 < hex.length; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16));
	return out;
};
const unsubscribeToken = (hs256, secret, email, campaignId) => {
	const payload = `${email}`.trim().toLowerCase() + "\n" + campaignId;
	return b64url(utf8$1(payload)) + "." + b64url(hexBytes(hs256(payload, secret)).slice(0, 16));
};
const parseUnsubscribeToken = (hs256, secret, token) => {
	const dot = token.indexOf(".");
	if (dot < 0) return null;
	const raw = b64urlDecode(token.slice(0, dot));
	if (!raw) return null;
	const payload = fromUtf8(raw);
	const nl = payload.indexOf("\n");
	const email = nl < 0 ? payload : payload.slice(0, nl);
	const campaignId = nl < 0 ? "" : payload.slice(nl + 1);
	if (!email.includes("@")) return null;
	const want = unsubscribeToken(hs256, secret, email, campaignId);
	if (want.length !== token.length) return null;
	let diff = 0;
	for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ token.charCodeAt(i);
	return diff === 0 ? {
		email: email.toLowerCase(),
		campaignId
	} : null;
};

//#endregion
//#region src/lib/handlers/bulkmail/engine.ts
/**
* Bulk mail on the legacy mothership, on the PocketBase CE ext/bulkmail schema (_bulkmail_campaigns, _bulkmail_sends,
* _bulkmail_suppressions, _params "bulkmail"). Same routes, statuses, ledger and unsubscribe tokens as the CE plugin,
* so the Pocker mothership can take over the same database with nothing to convert.
*
* PocketHost specifics (the EE part): recipients must be verified users, and users.unsubscribe stays in sync with the
* suppression list both ways (see sync.ts).
*/
const BM_CAMPAIGNS = "_bulkmail_campaigns";
const BM_SENDS = "_bulkmail_sends";
const BM_SUPPRESSIONS = "_bulkmail_suppressions";
const MAX_ATTEMPTS = 3;
const BRAKE_MIN = 100;
const BRAKE_RATE = .05;
const nowStr = () => (/* @__PURE__ */ new Date()).toISOString().replace("T", " ");
const bulkMailLimits = () => {
	return {
		rate: parseFloat(`${process.env.BULKMAIL_RATE || ""}`) || 10,
		daily: parseInt(`${process.env.BULKMAIL_DAILY || ""}`, 10) || 5e4
	};
};
const getSettings = (app = $app) => {
	const s = {
		postalAddress: "",
		unsubscribeMailto: "",
		snsTopicArns: [],
		secret: "",
		webhookSecret: ""
	};
	const row = new DynamicModel({ value: "" });
	try {
		app.db().newQuery(`SELECT value FROM _params WHERE id = 'bulkmail'`).one(row);
		Object.assign(s, JSON.parse(row.value || "{}"));
	} catch (_e) {}
	if (!s.secret) {
		s.secret = $security.randomStringWithAlphabet(64, "0123456789abcdef");
		saveSettings(s, app);
	}
	return s;
};
const saveSettings = (s, app = $app) => {
	const value = JSON.stringify(s);
	const now = nowStr();
	app.db().newQuery(`INSERT INTO _params (id, value, created, updated) VALUES ('bulkmail', {:value}, {:now}, {:now})
       ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated = excluded.updated`).bind({
		value,
		now
	}).execute();
};
const publicUrl = mothershipPublicUrl;
const unsubscribeUrl = (email, campaignId) => `${publicUrl()}/api/bulkmail/unsubscribe?t=${encodeURIComponent(unsubscribeToken($security.hs256, getSettings().secret, email, campaignId))}`;
const parseToken = (token) => parseUnsubscribeToken($security.hs256, getSettings().secret, token);
const isSuppressed = (email, app = $app) => {
	const e = normalizeEmail$1(email);
	if (!e) return false;
	try {
		app.findFirstRecordByData(BM_SUPPRESSIONS, "email", e);
		return true;
	} catch (_e) {
		return false;
	}
};
/** Adds or updates a suppression (record hooks then mirror it into users.unsubscribe). */
const suppress = (email, reason, source, campaignId = "", app = $app) => {
	const e = normalizeEmail$1(email);
	if (!e) return null;
	let rec;
	try {
		rec = app.findFirstRecordByData(BM_SUPPRESSIONS, "email", e);
	} catch (_e) {
		rec = new Record(app.findCollectionByNameOrId(BM_SUPPRESSIONS));
		rec.set("email", e);
	}
	rec.set("reason", reason);
	rec.set("source", source);
	rec.set("campaign", campaignId);
	app.save(rec);
	return rec;
};
const parseAudience = (raw) => {
	let a = {};
	if (typeof raw === "string") a = raw ? JSON.parse(raw) : {};
	else if (raw) a = JSON.parse(JSON.stringify(raw));
	if (!a.sql && !a.collection) throw new Error("audience needs a collection or a SQL query");
	if (!a.email_field) a.email_field = "email";
	return a;
};
/** Runs a superuser-authored SELECT read-only (SQLite query_only) in a transaction that is always rolled back. */
const queryReadOnly = (sql, model) => {
	sql = sql.trim().replace(/;+\s*$/, "");
	if (!/^\s*(select|with)\b/i.test(sql)) throw new Error("audience SQL must be a single SELECT");
	if (sql.includes(";")) throw new Error("audience SQL must be a single statement");
	const rows = arrayOf(model);
	let queryErr = null;
	try {
		$app.runInTransaction((tx) => {
			tx.db().newQuery("PRAGMA query_only = ON").execute();
			try {
				tx.db().newQuery(sql).all(rows);
			} catch (e) {
				queryErr = e;
			}
			tx.db().newQuery("PRAGMA query_only = OFF").execute();
			throw new Error("__rollback__");
		});
	} catch (e) {
		if (!`${e}`.includes("__rollback__")) throw e;
	}
	if (queryErr) throw queryErr;
	return rows;
};
const userData = (u) => {
	const data = JSON.parse(JSON.stringify(u.publicExport()));
	data.email = u.email();
	data.verified = u.verified();
	return data;
};
const eachRecipient = (a, fn) => {
	if (a.sql) {
		const rows = queryReadOnly(a.sql, new DynamicModel({
			id: "",
			email: ""
		}));
		for (const row of rows) {
			const recordRef = row.id ? `users:${row.id}` : "";
			if (fn({
				email: row.email,
				recordRef,
				data: {
					id: row.id,
					email: row.email
				}
			}) === false) return;
		}
		return;
	}
	const col = $app.findCollectionByNameOrId(a.collection);
	let lastId = "";
	for (;;) {
		const filter = a.filter?.trim() ? `(${a.filter}) && id > {:lastId}` : "id > {:lastId}";
		const recs = $app.findRecordsByFilter(col.id, filter, "id", 500, 0, { lastId });
		for (const r of recs) {
			if (!r) continue;
			const data = JSON.parse(JSON.stringify(r.publicExport()));
			data.email = r.getString(a.email_field);
			if (fn({
				email: r.getString(a.email_field),
				recordRef: `${col.name}:${r.id}`,
				data
			}) === false) return;
		}
		if (recs.length < 500) return;
		lastId = recs[recs.length - 1].id;
	}
};
const suppressedSet = () => {
	const rows = arrayOf(new DynamicModel({ email: "" }));
	$app.db().newQuery(`SELECT email FROM ${BM_SUPPRESSIONS}`).all(rows);
	const set = {};
	rows.forEach((r) => set[r.email] = true);
	return set;
};
const countAudience = (audience, sampleSize = 5) => {
	const a = parseAudience(audience);
	const sup = suppressedSet();
	const seen = {};
	let count = 0;
	let suppressed = 0;
	const sample = [];
	eachRecipient(a, (r) => {
		const e = normalizeEmail$1(r.email);
		if (!e || seen[e]) return;
		seen[e] = true;
		if (sup[e]) return void suppressed++;
		count++;
		if (sample.length < sampleSize) sample.push(e);
	});
	return {
		count,
		suppressed,
		sample
	};
};
const campaign = (id) => {
	try {
		return $app.findRecordById(BM_CAMPAIGNS, id);
	} catch (_e) {
		throw new Error(`campaign "${id}" not found`);
	}
};
const fromAddress = (c) => {
	let name = c.getString("from_name");
	let address = c.getString("from_address");
	if (!address) {
		address = $app.settings().meta.senderAddress;
		name = name || $app.settings().meta.senderName;
	}
	return {
		name,
		address
	};
};
const resolveVars = (c) => {
	const raw = JSON.parse(c.getString("vars") || "{}") || {};
	const out = {};
	for (const name of Object.keys(raw)) {
		const v = raw[name];
		if (v && typeof v === "object" && typeof v.sql === "string") out[name] = queryReadOnly(v.sql, new DynamicModel({ value: "" }))[0]?.value ?? "";
		else out[name] = v;
	}
	return out;
};
const varsCache = {};
const validate = (c) => {
	if (!c.getString("subject").trim()) throw new Error("the campaign needs a subject");
	if (!c.getString("html").trim() && !c.getString("text").trim()) throw new Error("the campaign needs a body");
	parseAudience(c.getString("audience"));
	for (const f of [
		"subject",
		"html",
		"text"
	]) try {
		parseTemplate(c.getString(f));
	} catch (e) {
		throw new Error(`${f}: ${e}`);
	}
	if (!fromAddress(c).address) throw new Error("set a sender address");
};
const refreshCounters = (c) => {
	const rows = arrayOf(new DynamicModel({
		status: "",
		n: 0
	}));
	$app.db().newQuery(`SELECT status, COUNT(*) AS n FROM ${BM_SENDS} WHERE campaign = {:id} GROUP BY status`).bind({ id: c.id }).all(rows);
	const counts = {};
	rows.forEach((r) => counts[r.status] = r.n);
	c.set("queued", counts.queued || 0);
	c.set("sent", counts.sent || 0);
	c.set("skipped", counts.skipped || 0);
	c.set("failed", counts.failed || 0);
	$app.save(c);
};
const setStatus = (c, status, reason = "") => {
	c.set("status", status);
	c.set("status_reason", reason);
	if (status === "done") c.set("finished_at", nowStr());
	$app.save(c);
};
/** Queues audience members not yet in the ledger (at most limit new ones when limit > 0). */
const queue = (c, limit = 0) => {
	const a = parseAudience(c.getString("audience"));
	const sup = suppressedSet();
	const existing = arrayOf(new DynamicModel({ email: "" }));
	$app.db().newQuery(`SELECT email FROM ${BM_SENDS} WHERE campaign = {:id}`).bind({ id: c.id }).all(existing);
	const seen = {};
	existing.forEach((r) => seen[r.email] = true);
	const rows = [];
	let queued = 0;
	eachRecipient(a, (r) => {
		const e = normalizeEmail$1(r.email);
		if (!e || seen[e]) return;
		seen[e] = true;
		if (sup[e]) {
			rows.push({
				email: e,
				ref: r.recordRef,
				status: "skipped",
				reason: "suppressed"
			});
			return;
		}
		rows.push({
			email: e,
			ref: r.recordRef,
			status: "queued",
			reason: ""
		});
		queued++;
		if (limit > 0 && queued >= limit) return false;
	});
	const now = nowStr();
	$app.runInTransaction((tx) => {
		for (const r of rows) tx.db().newQuery(`INSERT OR IGNORE INTO ${BM_SENDS} (id, campaign, email, record_ref, status, reason, attempts, retry_at, sent_at, message_id, created, updated)
           VALUES ('r'||lower(hex(randomblob(7))), {:c}, {:email}, {:ref}, {:status}, {:reason}, 0, '', '', '', {:now}, {:now})`).bind({
			c: c.id,
			email: r.email,
			ref: r.ref,
			status: r.status,
			reason: r.reason,
			now
		}).execute();
	});
	return queued;
};
const queueAndSend = (c, limit = 0) => {
	delete varsCache[c.id];
	varsCache[c.id] = resolveVars(c);
	queue(c, limit);
	c.set("status", "sending");
	c.set("status_reason", "");
	if (!c.getString("started_at")) c.set("started_at", nowStr());
	c.set("finished_at", "");
	refreshCounters(c);
	return c;
};
const startCampaign = (id, limit = 0) => {
	const c = campaign(id);
	const status = c.getString("status");
	if (status === "sending") return c;
	if (status === "canceled") throw new Error("this campaign was canceled; duplicate it to send again");
	validate(c);
	const at = c.getString("scheduled_at");
	if (at && new Date(at.replace(" ", "T")).getTime() > Date.now()) {
		setStatus(c, "scheduled");
		return c;
	}
	return queueAndSend(c, limit);
};
const pauseCampaign = (id) => {
	const c = campaign(id);
	if (!["sending", "scheduled"].includes(c.getString("status"))) throw new Error(`can't pause a ${c.getString("status")} campaign`);
	setStatus(c, "paused", "Paused by a superuser.");
	return c;
};
const resumeCampaign = (id) => {
	const c = campaign(id);
	if (c.getString("status") !== "paused") throw new Error(`can't resume a ${c.getString("status")} campaign`);
	if (!c.getString("started_at")) {
		c.set("status", "draft");
		$app.save(c);
		return startCampaign(id);
	}
	setStatus(c, "sending");
	return c;
};
const cancelCampaign = (id) => {
	const c = campaign(id);
	if (["done", "canceled"].includes(c.getString("status"))) throw new Error(`can't cancel a ${c.getString("status")} campaign`);
	$app.db().newQuery(`UPDATE ${BM_SENDS} SET status = 'skipped', reason = 'campaign canceled', updated = {:now} WHERE campaign = {:id} AND status = 'queued'`).bind({
		id: c.id,
		now: nowStr()
	}).execute();
	c.set("finished_at", nowStr());
	c.set("status", "canceled");
	c.set("status_reason", "Canceled by a superuser.");
	refreshCounters(c);
	return c;
};
const loadRecipientData = (email, recordRef) => {
	let data = { email };
	const i = recordRef.indexOf(":");
	if (i > 0) try {
		const rec = $app.findRecordById(recordRef.slice(0, i), recordRef.slice(i + 1));
		data = rec.collection().name === "users" ? userData(rec) : JSON.parse(JSON.stringify(rec.publicExport()));
	} catch (_e) {}
	return data;
};
const buildMessage = (c, email, record) => {
	const s = getSettings();
	const vars = varsCache[c.id] || (varsCache[c.id] = resolveVars(c));
	const from = fromAddress(c);
	const unsub = unsubscribeUrl(email, c.id);
	const data = {
		...vars,
		record,
		email,
		unsubscribe_url: unsub,
		campaign: {
			id: c.id,
			name: c.getString("name")
		}
	};
	const subject = renderTemplate(c.getString("subject"), data, false).replace(/\n/g, " ").trim();
	let html = renderTemplate(c.getString("html"), data, true);
	let text = renderTemplate(c.getString("text"), data, false);
	if (!text.trim()) text = htmlToText(html);
	if (html.trim()) html += footerHtml(unsub, s.postalAddress);
	text += footerText(unsub, s.postalAddress);
	let listUnsub = `<${unsub}>`;
	if (s.unsubscribeMailto) listUnsub += `, <mailto:${s.unsubscribeMailto}?subject=unsubscribe>`;
	const domain = from.address.split("@")[1] || "localhost";
	return new MailerMessage({
		from,
		to: [{ address: email }],
		subject,
		html,
		text,
		headers: {
			"List-Unsubscribe": listUnsub,
			"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
			"Message-ID": `<bm.${$security.pseudorandomString(20)}@${domain}>`,
			"X-Bulkmail-Campaign": c.id
		}
	});
};
const firstRecipient = (c, email = "") => {
	const want = normalizeEmail$1(email);
	let found = null;
	eachRecipient(parseAudience(c.getString("audience")), (r) => {
		const e = normalizeEmail$1(r.email);
		if (!e || want && e !== want) return;
		found = {
			...r,
			email: e
		};
		return false;
	});
	if (found) return found;
	if (want) return {
		email: want,
		recordRef: "",
		data: { email: want }
	};
	throw new Error("the audience matches nobody");
};
const previewCampaign = (id, email = "") => {
	const c = campaign(id);
	delete varsCache[c.id];
	const r = firstRecipient(c, email);
	const msg = buildMessage(c, r.email, loadRecipientData(r.email, r.recordRef));
	return {
		to: r.email,
		from: msg.from,
		subject: msg.subject,
		html: msg.html,
		text: msg.text,
		headers: msg.headers
	};
};
const testCampaign = (id, to = "") => {
	const c = campaign(id);
	to = to || c.getString("test_to");
	const addrs = to.split(",").map(normalizeEmail$1).filter(Boolean).map((address) => ({ address }));
	if (!addrs.length) throw new Error("set a test address (test_to)");
	delete varsCache[c.id];
	const r = firstRecipient(c);
	const msg = buildMessage(c, r.email, loadRecipientData(r.email, r.recordRef));
	msg.to = addrs;
	msg.subject = "[TEST] " + msg.subject;
	$app.newMailClient().send(msg);
};
const sentToday = () => {
	const row = new DynamicModel({ n: 0 });
	const start = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + " 00:00:00.000Z";
	$app.db().newQuery(`SELECT COUNT(*) AS n FROM ${BM_SENDS} WHERE status = 'sent' AND sent_at >= {:start}`).bind({ start }).one(row);
	return row.n;
};
/** PocketHost rule (EE): only verified users get platform mail. Returns a skip reason or ''. */
const eeSkipReason = (recordRef) => {
	if (!recordRef.startsWith("users:")) return "";
	try {
		const u = $app.findRecordById("users", recordRef.slice(6));
		if (!u.verified()) return "unverified";
		if (u.getBool("unsubscribe")) return "unsubscribed";
	} catch (_e) {
		return "user deleted";
	}
	return "";
};
const sendOne = (c, send) => {
	const email = send.getString("email");
	send.set("attempts", send.getInt("attempts") + 1);
	const save = () => {
		$app.save(send);
		refreshCounters(c);
		const done = c.getInt("sent") + c.getInt("failed");
		if (done >= BRAKE_MIN && c.getInt("failed") / done > BRAKE_RATE) setStatus(c, "paused", `Paused automatically: ${c.getInt("failed")} of ${done} sends failed. Check the failures, then resume.`);
	};
	const skip = isSuppressed(email) ? "suppressed" : eeSkipReason(send.getString("record_ref"));
	if (skip) {
		send.set("status", "skipped");
		send.set("reason", skip);
		return save();
	}
	try {
		const msg = buildMessage(c, email, loadRecipientData(email, send.getString("record_ref")));
		$app.newMailClient().send(msg);
		send.set("status", "sent");
		send.set("reason", "");
		send.set("sent_at", nowStr());
		send.set("message_id", msg.headers["Message-ID"] || "");
	} catch (e) {
		const err = `${e}`;
		send.set("reason", err);
		if (/\b5\d\d\b/.test(err) || send.getInt("attempts") >= MAX_ATTEMPTS) send.set("status", "failed");
		else {
			const backoffMin = send.getInt("attempts") * send.getInt("attempts");
			send.set("retry_at", new Date(Date.now() + backoffMin * 6e4).toISOString().replace("T", " "));
		}
	}
	save();
};
/** One unit of sender work. Returns ms to wait before the next step, or -1 when there's nothing to do. */
const senderStep = () => {
	const log = mkLog("bulkmail");
	const now = nowStr();
	const { rate, daily } = bulkMailLimits();
	const due = $app.findRecordsByFilter(BM_CAMPAIGNS, `status = 'scheduled' && scheduled_at <= {:now}`, "scheduled_at", 1, 0, { now });
	if (due[0]) {
		try {
			queueAndSend(due[0]);
		} catch (e) {
			setStatus(due[0], "paused", `Couldn't start: ${e}`);
		}
		return 0;
	}
	const sending = $app.findRecordsByFilter(BM_CAMPAIGNS, `status = 'sending'`, "started_at", 0, 0);
	if (!sending.length) return -1;
	if (sentToday() >= daily) {
		for (const c of sending) if (c && !c.getString("status_reason").startsWith("Daily limit")) setStatus(c, "sending", `Daily limit of ${daily} reached; continues after midnight UTC.`);
		return -1;
	}
	for (const c of sending) {
		if (!c) continue;
		const next = $app.findRecordsByFilter(BM_SENDS, `campaign = {:c} && status = 'queued' && (retry_at = '' || retry_at <= {:now})`, "created", 1, 0, {
			c: c.id,
			now
		});
		if (!next[0]) {
			if (!$app.findRecordsByFilter("_bulkmail_sends", `campaign = {:c} && status = 'queued'`, "", 1, 0, { c: c.id }).length) {
				refreshCounters(c);
				setStatus(c, "done");
				log(`campaign ${c.id} done`);
			}
			continue;
		}
		if (c.getString("status_reason").startsWith("Daily limit")) c.set("status_reason", "");
		sendOne(c, next[0]);
		let r = rate;
		const own = c.getFloat("rate_per_sec");
		if (own > 0 && own < r) r = own;
		return Math.round(1e3 / r);
	}
	return -1;
};
const LOCK_KEY = "bulkmail.sender.lock";
/** Cron body: send for up to ~55 s, one runner at a time. */
const runBulkMailSender = () => {
	const log = mkLog("bulkmail");
	const held = $app.store().get(LOCK_KEY);
	if (held && Date.now() - held < 12e4) return;
	$app.store().set(LOCK_KEY, Date.now());
	const stopAt = Date.now() + 55e3;
	try {
		while (Date.now() < stopAt) {
			const wait = senderStep();
			if (wait < 0) break;
			if (wait > 0) sleep(wait);
		}
	} catch (e) {
		log(`sender error: ${e}`);
	} finally {
		$app.store().remove(LOCK_KEY);
	}
};

//#endregion
//#region src/lib/handlers/bulkmail/api.ts
/** Routes shaped exactly like PocketBase CE ext/bulkmail (routes.go). */
const body = (e) => {
	try {
		const info = e.requestInfo();
		return JSON.parse(JSON.stringify(info.body || {}));
	} catch (_e) {
		return {};
	}
};
const settingsResponse = () => {
	const s = getSettings();
	const { rate, daily } = bulkMailLimits();
	const row = new DynamicModel({ n: 0 });
	$app.db().newQuery(`SELECT COUNT(*) AS n FROM _bulkmail_sends WHERE status = 'sent' AND sent_at >= {:start}`).bind({ start: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + " 00:00:00.000Z" }).one(row);
	const base = mothershipPublicUrl();
	return {
		...s,
		secret: "",
		webhookSecret: "",
		hasWebhookSecret: !!s.webhookSecret,
		rate,
		daily,
		sentToday: row.n,
		allowed: true,
		sesEndpoint: `${base}/api/sns`,
		webhookEndpoint: `${base}/api/bulkmail/feedback/webhook`
	};
};
const HandleBulkMailGetSettings = (e) => e.json(200, settingsResponse());
const HandleBulkMailSaveSettings = (e) => {
	const cur = getSettings();
	const b = body(e);
	for (const k of ["postalAddress", "unsubscribeMailto"]) if (typeof b[k] === "string") cur[k] = b[k].trim();
	if (Array.isArray(b.snsTopicArns)) cur.snsTopicArns = b.snsTopicArns.filter((v) => typeof v === "string" && v);
	if (typeof b.webhookSecret === "string" && b.webhookSecret) cur.webhookSecret = b.webhookSecret;
	saveSettings(cur);
	return e.json(200, settingsResponse());
};
const wrap = (e, fn) => {
	try {
		const res = fn();
		return res === void 0 ? e.noContent(204) : e.json(200, res);
	} catch (err) {
		throw new BadRequestError(`${err}`.replace(/^Error: /, ""));
	}
};
const HandleBulkMailCount = (e) => wrap(e, () => countAudience(body(e).audience, 5));
const HandleBulkMailCampaignAction = (e) => {
	const id = e.request.pathValue("id");
	const action = e.request.pathValue("action");
	const b = body(e);
	return wrap(e, () => {
		switch (action) {
			case "start": return startCampaign(id, parseInt(`${b.limit || 0}`, 10) || 0);
			case "pause": return pauseCampaign(id);
			case "resume": return resumeCampaign(id);
			case "cancel": return cancelCampaign(id);
			case "test":
				testCampaign(id, `${b.to || ""}`);
				return;
			case "preview": return previewCampaign(id, `${b.email || ""}`);
		}
		throw new Error(`unknown action ${action}`);
	});
};
const page$1 = (title, html) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;color:#222}button{font:inherit;padding:.5rem 1.25rem;border:0;border-radius:6px;background:#222;color:#fff;cursor:pointer}</style></head><body><h1>${escapeHtml(title)}</h1>${html}</body></html>`;
const notifyBen = (email) => {
	try {
		$app.newMailClient().send(new MailerMessage({
			from: {
				address: $app.settings().meta.senderAddress,
				name: $app.settings().meta.senderName
			},
			to: [{ address: `ben@benallfree.com` }],
			subject: `UNSUBSCRIBE ${email}`
		}));
	} catch (_e) {}
};
const HandleBulkMailUnsubscribePage = (e) => {
	const token = e.request.url.query().get("t");
	const parsed = parseToken(token);
	if (!parsed) return e.html(400, page$1("Invalid link", `<p>This unsubscribe link isn't valid.</p>`));
	if (isSuppressed(parsed.email)) return e.html(200, page$1("Unsubscribed", `<p>${escapeHtml(parsed.email)} won't receive these emails anymore.</p>`));
	return e.html(200, page$1("Unsubscribe", `<p>Stop sending these emails to <b>${escapeHtml(parsed.email)}</b>?</p><form method="post"><input type="hidden" name="t" value="${escapeHtml(token)}"><button type="submit">Unsubscribe</button></form>`));
};
/** The confirm form and RFC 8058 one-click POSTs from mail providers. */
const HandleBulkMailUnsubscribe = (e) => {
	const log = mkLog("bulkmail");
	let token = e.request.url.query().get("t");
	let oneClick = false;
	try {
		const form = e.requestInfo().body || {};
		if (form["t"]) token = `${form["t"]}`;
		oneClick = `${form["List-Unsubscribe"] || ""}` === "One-Click";
	} catch (_e) {}
	const parsed = parseToken(token);
	if (!parsed) return e.html(400, page$1("Invalid link", `<p>This unsubscribe link isn't valid.</p>`));
	suppress(parsed.email, "unsubscribed", oneClick ? "one-click" : "link", parsed.campaignId);
	log(`unsubscribed ${parsed.email} (${oneClick ? "one-click" : "link"})`);
	notifyBen(parsed.email);
	return e.html(200, page$1("Unsubscribed", `<p>${escapeHtml(parsed.email)} won't receive these emails anymore.</p>`));
};
/** {"type":"bounce|complaint|unsubscribe","email":"…","campaign":"…"} with X-Bulkmail-Secret. */
const HandleBulkMailWebhook = (e) => {
	const s = getSettings();
	const given = e.request.header.get("X-Bulkmail-Secret");
	if (!s.webhookSecret || given !== s.webhookSecret) throw new UnauthorizedError("");
	const b = body(e);
	const reason = {
		bounce: "bounced",
		complaint: "complained",
		unsubscribe: "unsubscribed"
	}[`${b.type}`.toLowerCase()];
	if (!reason) throw new BadRequestError("type must be bounce, complaint or unsubscribe");
	if (!suppress(`${b.email || ""}`, reason, "webhook", `${b.campaign || ""}`)) throw new BadRequestError("invalid email");
	return e.noContent(204);
};

//#endregion
//#region src/lib/handlers/bulkmail/sync.ts
/**
* Users.unsubscribe <-> _bulkmail_suppressions, both ways. The dashboard, Node and older mothership code read
* users.unsubscribe; the CE bulk mail schema reads the suppression list. Each side only writes when the other side
* differs, so the two hooks settle after one round.
*/
const syncUserToSuppressions = (e) => {
	const user = e.record;
	if (!user) return;
	const before = user.original().getBool("unsubscribe");
	const after = user.getBool("unsubscribe");
	if (before === after) return;
	const email = normalizeEmail$1(user.email());
	if (!email) return;
	let existing = null;
	try {
		existing = e.app.findFirstRecordByData(BM_SUPPRESSIONS, "email", email);
	} catch (_e) {}
	if (after && !existing) suppress(email, "unsubscribed", "users.unsubscribe", "", e.app);
	else if (!after && existing) e.app.delete(existing);
};
const findUser = (app, email) => {
	try {
		return app.findFirstRecordByData("users", "email", email);
	} catch (_e) {
		try {
			return app.findFirstRecordByFilter("users", "email:lower = {:e}", { e: email });
		} catch (_e2) {
			return null;
		}
	}
};
const syncSuppressionToUser = (e, suppressed) => {
	const email = normalizeEmail$1(e.record?.getString("email") || "");
	if (!email) return;
	const user = findUser(e.app, email);
	if (!user || user.getBool("unsubscribe") === suppressed) return;
	user.set("unsubscribe", suppressed);
	e.app.save(user);
};

//#endregion
//#region src/lib/util/bulkmail/status.ts
/** Superuser status edits on a bulk mail campaign (see handlers/bulkmail/ui.ts). Pure, so it is unit-tested. */
/** Which engine call a status change maps to, or an error message. */
const statusAction = (from, to) => {
	if (to === "canceled") return ["done", "canceled"].includes(from) ? `can't cancel a ${from} campaign` : "cancel";
	if (to === "paused") return ["sending", "scheduled"].includes(from) ? "pause" : `can't pause a ${from} campaign`;
	if (to === "sending" || to === "scheduled") {
		if (from === "paused") return "resume";
		if (from === "draft") return "start";
		return `can't start a ${from} campaign`;
	}
	return `status ${to} is set by the sender, not by hand`;
};

//#endregion
//#region src/lib/handlers/bulkmail/ui.ts
/**
* Campaigns are run from the stock superuser UI (Collections > _bulkmail_campaigns), which replaced the `pockethost
* mail send` CLI. Saving a campaign record does what the CE plugin's buttons do:
*
* - Status draft -> sending (or scheduled): start. A future scheduled_at makes it scheduled.
* - Status sending/scheduled -> paused: pause. paused -> sending: resume.
* - Status -> canceled: cancel.
* - Saving a draft with test_to set, after changing its content or test_to: a [TEST] send to test_to.
*
* Other status changes (to done, or back to draft) are refused. The status a superuser picks is never written as is:
* the engine sets it, so a refused start leaves the campaign where it was. Collection rules are superuser-only.
*/
const CONTENT_FIELDS = [
	"subject",
	"html",
	"text",
	"test_to",
	"audience",
	"vars",
	"from_name",
	"from_address"
];
const msg = (err) => `${err}`.replace(/^Error: /, "");
const HandleBulkMailCampaignUpdateRequest = (e) => {
	const rec = e.record;
	const orig = rec.original();
	const from = orig.getString("status") || "draft";
	const to = rec.getString("status") || "draft";
	if (from !== to) {
		const action = statusAction(from, to);
		if (![
			"start",
			"resume",
			"pause",
			"cancel"
		].includes(action)) throw new BadRequestError(action);
		rec.set("status", from);
		$app.save(rec);
		try {
			if (action === "start") startCampaign(rec.id);
			else if (action === "resume") resumeCampaign(rec.id);
			else if (action === "pause") pauseCampaign(rec.id);
			else cancelCampaign(rec.id);
		} catch (err) {
			throw new BadRequestError(`Saved, but couldn't ${action}: ${msg(err)}`);
		}
		return e.json(200, $app.findRecordById(BM_CAMPAIGNS, rec.id));
	}
	const changed = CONTENT_FIELDS.some((f) => JSON.stringify(orig.get(f)) !== JSON.stringify(rec.get(f)));
	if (from !== "draft" || !changed || !rec.getString("test_to").trim()) return e.next();
	$app.save(rec);
	try {
		testCampaign(rec.id);
	} catch (err) {
		throw new BadRequestError(`Saved, but the test send failed: ${msg(err)}`);
	}
	return e.json(200, $app.findRecordById(BM_CAMPAIGNS, rec.id));
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
/**
* Whether a range is a PocketOne release line (`p1:0.0.*`). PocketOne versions are valid on an instance when the
* mothership's list has them, but they aren't offered in the dashboard yet (sfo's Node edge can't run them).
*/
const isPocketOneVersion = (range) => /^p1:\d+\.\d+\.\*$/.test(range.trim());
/** Versions a user may pick for a new instance or a version change. */
const listSelectableVersions = () => listVersions().filter(isSelectableVersion);
/** Error message for a version that isn't selectable, or null when it's fine. */
const selectableVersionError = (version, selectable) => {
	if (typeof version !== "string" || !version) return `A PocketBase version is required. Version must be one of: ${selectable.join(", ")}`;
	if (isPocketOneVersion(version)) return listVersions().includes(version) ? null : `PocketOne ${version} is not offered. Version must be one of: ${selectable.join(", ")}`;
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
//#region src/lib/handlers/instance/lib/instanceCaller.ts
const deny = (status, message) => {
	if (status === 401) throw new UnauthorizedError(message);
	throw new NotFoundError(message);
};
const resolveInstanceCaller = (e) => {
	if (!e.auth) return deny(401, `Sign in to the dashboard.`);
	return { userId: e.auth.id };
};
/** Loads an instance the caller owns. Missing and not-owned look the same. */
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
* Instance limits. An account may own as many instances as its plan includes (`users.subscription_quantity`) plus its
* bonus instances (`users.bonus_instances`), and all of them may run. Bonus instances count only while the account has
* at least one paid instance. Archived instances don't count. Shared by the mothership (create / power-on checks,
* bundled into the JSVM, so no Node imports here) and the edge over-limit sweep.
*/
/** Archived instances carry this prefix in `instances.suspension`. */
const ARCHIVED_SUSPENSION_PREFIX = `Archived:`;
const isArchivedSuspension = (suspension) => !!suspension && suspension.startsWith(ARCHIVED_SUSPENSION_PREFIX);
const plural = (n) => `${n} instance${n === 1 ? `` : `s`}`;
/** Paid and bonus instances. Bonus counts only while the account has at least one paid instance. */
const allowanceParts = (user) => {
	const paid = Math.max(0, Math.floor(user.subscription_quantity ?? 0));
	const bonus = paid > 0 ? Math.max(0, Math.floor(user.bonus_instances ?? 0)) : 0;
	return {
		paid,
		bonus,
		total: paid + bonus
	};
};
/** "3 instances" or "3 instances (2 paid + 1 bonus)". */
const allowanceLabel = (parts) => parts.bonus > 0 ? `${plural(parts.total)} (${parts.paid} paid + ${parts.bonus} bonus)` : plural(parts.total);
/** Instances that count toward the limit: everything except archived ones. */
const countedInstances = (owned) => owned.filter((i) => !isArchivedSuspension(i.suspension));
/** Counted instances that are powered on. */
const poweredOnInstances = (owned) => countedInstances(owned).filter((i) => i.power);
/** Error message when the account can't create another instance, or null when it can. */
const createLimitError = (owned, allowance) => {
	const parts = typeof allowance === "number" ? {
		paid: allowance,
		bonus: 0,
		total: allowance
	} : allowance;
	const count = countedInstances(owned).length;
	if (count < parts.total) return null;
	if (parts.total === 0) return `Your account doesn't include any instances yet. Add an instance to your plan to create one.`;
	return `Your plan includes ${allowanceLabel(parts)} and you have ${count}. Delete or archive one, or add instances to your plan.`;
};
/**
* Error message when `instanceId` can't be powered on, or null when it can. Only the other powered-on instances are
* counted, so re-saving an instance that is already on never fails.
*/
const powerOnLimitError = (instanceId, owned, allowance) => {
	const parts = typeof allowance === "number" ? {
		paid: allowance,
		bonus: 0,
		total: allowance
	} : allowance;
	const othersOn = poweredOnInstances(owned).filter((i) => i.id !== instanceId).length;
	if (othersOn < parts.total) return null;
	if (parts.total === 0) return `Your account doesn't include any instances yet. Add an instance to your plan to run one.`;
	return `Your plan includes ${allowanceLabel(parts)} and ${othersOn} ${othersOn === 1 ? `is` : `are`} already running. Power one off, or add instances to your plan.`;
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
/** Paid + bonus instances (bonus only counts while at least one is paid). */
const allowanceOf = (uid) => {
	const user = $app.findRecordById("users", uid);
	return allowanceParts({
		subscription_quantity: user.getInt("subscription_quantity"),
		bonus_instances: user.getInt("bonus_instances")
	});
};
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
//#region src/lib/handlers/instance/lib/instancePolicy.ts
/** Pure rules for instance endpoints (no JSVM globals), shared by the handlers and unit-tested. */
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
//#region src/lib/handlers/instance/api/HandleInstanceCreate.ts
/** POST /api/instance. Signed-in dashboard user only. */
const HandleInstanceCreate = (e) => {
	const log = mkLog(`POST:instance`);
	const caller = resolveInstanceCaller(e);
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
/** DELETE /api/instance/{id}. Signed-in dashboard user only. */
const HandleInstanceDelete = (e) => {
	const log = mkLog(`DELETE:instance`);
	log(`TOP OF DELETE`);
	let data = new DynamicModel({ id: "" });
	e.bindBody(data);
	log(`After bind`);
	data = JSON.parse(JSON.stringify(data));
	const id = e.request.pathValue("id");
	log(`vars`, JSON.stringify({ id }));
	const caller = resolveInstanceCaller(e);
	const record = findOwnedInstance(caller, id);
	log(`caller`, JSON.stringify(caller));
	if (record.getString("status").toLowerCase() !== "idle") throw new BadRequestError(`Instance must be shut down first.`);
	$app.delete(record);
	return e.json(200, { status: "ok" });
};

//#endregion
//#region src/lib/handlers/instance/lib/duplicatePolicy.ts
/** Why `source` can't be duplicated now, or null when it can. */
const duplicateSourceError = (source) => {
	if (source.suspension) return `This instance is suspended, so it can't be duplicated.`;
	if (source.power || source.status.toLowerCase() !== "idle") return `Power this instance off first, so the copy is consistent.`;
	if (source.duplicateStatus === "copying") return `This instance is still being copied. Try again when it's ready.`;
	if (source.duplicateStatus === "failed") return `This instance's own copy failed, so it can't be duplicated.`;
	if (!source.edge) return `This instance isn't placed on a server yet. Try again in a minute.`;
	return null;
};
/** Why an instance with this `duplicateStatus` can't be powered on, or null when it can. */
const duplicatePowerOnError = (duplicateStatus, duplicateError) => {
	if (duplicateStatus === "copying") return `This copy is still being made. It can be powered on once it's ready.`;
	if (duplicateStatus === "failed") return `This copy failed${duplicateError ? `: ${duplicateError}` : ""}. Delete it and duplicate again.`;
	return null;
};

//#endregion
//#region src/lib/handlers/instance/api/HandleInstanceDuplicate.ts
/**
* POST /api/instance/{id}/duplicate `{ subdomain }`. Makes a new, powered-off instance on the source's edge, on the
* latest PocketBase version, with the source's settings. The edge then copies the source's files into it
* (`duplicateStatus` goes from `copying` to `ready` or `failed`). The source must be off, so the copy is consistent and
* its hooks never run in two places. Dashboard (JWT) or a token with write access to every instance.
*/
const HandleInstanceDuplicate = (e) => {
	const log = mkLog(`POST:instance/duplicate`);
	const sourceId = e.request.pathValue("id");
	const caller = resolveInstanceCaller(e);
	const source = findOwnedInstance(caller, sourceId);
	let data = new DynamicModel({ subdomain: "" });
	e.bindBody(data);
	data = JSON.parse(JSON.stringify(data));
	const subdomain = String(data.subdomain || "").trim().toLowerCase();
	const sourceError = duplicateSourceError({
		power: source.getBool("power"),
		status: source.getString("status"),
		suspension: source.getString("suspension"),
		duplicateStatus: source.getString("duplicateStatus"),
		edge: source.getString("edge")
	});
	if (sourceError) throw new BadRequestError(sourceError);
	if (!subdomain) throw new BadRequestError(`Choose a name for the copy.`);
	const nameError = instanceNameError(subdomain);
	if (nameError) throw new BadRequestError(nameError);
	if (!isAvailable(subdomain)) throw new BadRequestError(`Instance name ${subdomain} is not available.`);
	assertCanCreateInstance(caller.userId);
	const version = listSelectableVersions()[0];
	if (!version) throw new BadRequestError(`No PocketBase version is available right now.`);
	const record = new Record($app.findCollectionByNameOrId("instances"));
	record.set("uid", caller.userId);
	record.set("subdomain", subdomain);
	record.set("power", false);
	record.set("status", "idle");
	record.set("version", version);
	record.set("edge", source.getString("edge"));
	record.set("dev", source.getBool("dev"));
	record.set("syncAdmin", source.getBool("syncAdmin"));
	record.set("autoVacuum", source.getBool("autoVacuum"));
	record.set("secrets", source.get("secrets"));
	record.set("webhooks", source.get("webhooks"));
	record.set("firewall", source.get("firewall"));
	record.set("duplicateOf", source.id);
	record.set("duplicateStatus", "copying");
	record.set("duplicateError", "");
	$app.save(record);
	log(`duplicated`, JSON.stringify({
		source: source.id,
		copy: record.id,
		subdomain,
		version
	}));
	return e.json(200, { instance: record });
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
* PUT /api/instance/{id}. Called by the dashboard. Besides the full `secrets` map, accepts `secretsPatch` (`{ KEY:
* value | null }`) to change one secret without sending the others.
*/
const HandleInstanceUpdate = (e) => {
	const log = mkLog(`PUT:instance`);
	log(`TOP OF PUT`);
	const id = e.request.pathValue("id");
	const caller = resolveInstanceCaller(e);
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
	if (power === true && !record.getBool("power")) {
		const copyError = duplicatePowerOnError(record.getString("duplicateStatus"), record.getString("duplicateError"));
		if (copyError) throw new BadRequestError(copyError);
		assertCanPowerOn(caller.userId, id);
	}
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
	if (newCname === `${record.original().get("cname")}`.trim()) return;
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
//#region ../common/billing/accountClaim.ts
/** How long the emailed claim link works. */
const EMAIL_CLAIM_TTL_SECONDS = 10080 * 60;
/** Browser claim tokens are 40 random alphanumerics; anything else is rejected before hashing. */
const BROWSER_CLAIM_TOKEN_LENGTH = 40;
const isBrowserClaimToken = (token) => typeof token === `string` && new RegExp(`^[A-Za-z0-9]{${40}}$`).test(token);
const emailClaimSig = (hs256, secret, userId, exp) => hs256(`account-claim:${userId}:${exp}`, secret);
const emailClaimToken = (hs256, secret, userId, nowSeconds) => {
	const exp = Math.floor(nowSeconds) + EMAIL_CLAIM_TTL_SECONDS;
	return `${userId}.${exp}.${emailClaimSig(hs256, secret, userId, exp)}`;
};
/** The user id from a valid, unexpired email claim token, else undefined. */
const parseEmailClaimToken = (hs256, secret, token, nowSeconds) => {
	if (!secret || typeof token !== `string`) return void 0;
	const [userId, expStr, sig, extra] = token.split(`.`);
	if (!userId || !expStr || !sig || extra !== void 0) return void 0;
	const exp = Number(expStr);
	if (!Number.isInteger(exp) || exp < nowSeconds) return void 0;
	return emailClaimSig(hs256, secret, userId, exp) === sig ? userId : void 0;
};
/** `b***@example.com`, to say which account a purchase went to without revealing the address to anyone holding a link. */
const maskEmail = (email) => {
	const [name = ``, domain = ``] = `${email}`.split(`@`);
	if (!domain) return `***`;
	return `${name.slice(0, 1)}***@${domain}`;
};
const normalizeEmail = (email) => `${email ?? ``}`.trim().toLowerCase();
/** Loose check before PocketBase's own validation; enough to give a clear message on the claim form. */
const looksLikeEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
/**
* Stripe needs no table: a Stripe price's `lookup_key` is the SKU itself (common/billing/stripe.ts), so `externalId`
* for Stripe is the lookup key.
*/
const resolveProviderSku = (provider, externalId) => {
	if (provider === "stripe") return isKnownSku(externalId) ? externalId : void 0;
	return SKU_BY_PROVIDER_KEY[providerKey(provider, externalId)];
};

//#endregion
//#region ../common/billing/entitlementFromPvId.ts
/** The entitlement one purchase of `sku` grants at checkout `quantity`. */
const entitlementFromSku = (sku, quantity) => {
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
/**
* Resolve a Lemon Squeezy pv_id (`{product_id}-{variant_id}`) + checkout quantity into the entitlement to apply.
* Returns undefined for unmapped pv_ids so callers can reject unknown products.
*/
const entitlementFromPvId = (pvId, quantity) => {
	const sku = resolveProviderSku("lemonsqueezy", pvId);
	if (!sku) return void 0;
	return entitlementFromSku(sku, quantity);
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
		starts_at: attrs.created_at || void 0,
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
		starts_at: order.attributes?.created_at || void 0,
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
//#region ../common/billing/loyalty.ts
/**
* Loyalty bonus instances (pocketbrain plans/loyalty-bonus-instances-plan.md, decided with Ben 2026-11-11, chain rule
* 2026-11-14).
*
* - Lifetime (`hosting.slot.lifetime`) and annual plans: 5 bonus instances while the purchase is active.
* - Monthly: counted on the account's **chain**, its paid subscriptions laid end to end. A subscription that starts
*   before the previous one ends (or within `LOYALTY_COMEBACK_DAYS` of it) continues the chain, so the bonus keeps
*   counting from the chain's first start. Gap days don't count. A longer gap starts a new chain from 0. Overlapping
*   subscriptions (a second instance) cover the same time, so they never earn faster.
* - Whole months since the chain started: 1 bonus after the 1st month, +1 every 3 (months 1, 4, 7, 10, 13), cap 5.
* - Accounts with more paid instances than the bonus cap (`LOYALTY_MAX_BONUS`) get no loyalty bonus: Founder, Flounder
*   and other legacy plans with 250+ instances, whatever else they buy (Ben, 2026-11-15).
*
* A pure function of the account's billing items and the time, so it can be recomputed after any webhook (or in a
* backfill). JSVM-safe: plain data + sync functions.
*/
const LOYALTY_MAX_BONUS = 5;
/** A gap up to this long between subscriptions doesn't break the chain (the gap itself doesn't count). */
const LOYALTY_COMEBACK_DAYS = 30;
/** Plans that get the full bonus up front, while active. Legacy Flounder lifetime already has 250 instances. */
const LOYALTY_UPFRONT_SKUS = ["hosting.slot.lifetime", "hosting.slot.recurring.year"];
/** Monthly per-instance plans. */
const LOYALTY_MONTHLY_SKUS = ["hosting.slot.recurring.month", "hosting.slot.recurring.month.legacy"];
/** Bonus earned after `months` whole months on the chain: 0, then 1 at month 1, +1 every 3rd after, capped at 5. */
const bonusForRenewals = (months) => {
	const n = Math.floor(months);
	if (!(n >= 1)) return 0;
	return Math.min(5, 1 + Math.floor((n - 1) / 3));
};
/** Chain month that earns the next bonus instance, or null at the cap. */
const nextBonusAtRenewal = (months) => {
	const bonus = bonusForRenewals(months);
	if (bonus >= 5) return null;
	return bonus === 0 ? 1 : 1 + bonus * 3;
};
const isLs = (i) => i.provider === "lemonsqueezy" && i.quantity > 0;
const DAY = 1440 * 60 * 1e3;
/** Whole calendar months from `a` to `b` (UTC). */
const wholeMonthsBetween = (a, b) => {
	let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
	const anchor = new Date(a.getTime());
	anchor.setUTCMonth(anchor.getUTCMonth() + m);
	if (anchor.getTime() > b.getTime()) m -= 1;
	return Math.max(0, m);
};
/** `d` plus `n` calendar months (UTC). */
const addMonths = (d, n) => {
	const out = new Date(d.getTime());
	out.setUTCMonth(out.getUTCMonth() + n);
	return out;
};
/**
* The account's current chain: its loyalty-eligible paid items (monthly, annual, lifetime) laid end to end. Returns the
* effective start (first start plus gap days) when the chain is still active at `now`, else undefined. Items with no
* start date are skipped.
*/
const loyaltyChainStart = (items, now) => {
	const spans = items.filter((i) => isLs(i) && (LOYALTY_MONTHLY_SKUS.includes(i.sku) || LOYALTY_UPFRONT_SKUS.includes(i.sku))).map((i) => {
		const start = i.starts_at ? new Date(i.starts_at).getTime() : NaN;
		if (isNaN(start)) return void 0;
		const ends = i.ends_at ? new Date(i.ends_at).getTime() : NaN;
		return {
			start,
			end: isBillingItemActive(i, now) ? Infinity : isNaN(ends) ? start : ends
		};
	}).filter((x) => !!x).sort((a, b) => a.start - b.start);
	let chainStart = NaN;
	let chainEnd = -Infinity;
	let gap = 0;
	for (const s of spans) {
		if (isNaN(chainStart) || s.start > chainEnd + 30 * DAY) {
			chainStart = s.start;
			gap = 0;
		} else if (s.start > chainEnd) gap += s.start - chainEnd;
		chainEnd = Math.max(chainEnd, s.end);
	}
	if (isNaN(chainStart) || chainEnd < now.getTime()) return void 0;
	return new Date(chainStart + gap);
};
/** More paid instances than the bonus cap: no loyalty bonus at all. */
const isLoyaltyExcluded = (paidInstances) => Math.floor(paidInstances) > 5;
/** True when an active lifetime or annual purchase gives the full bonus. */
const hasUpfrontLoyalty = (items, now) => items.some((i) => isLs(i) && LOYALTY_UPFRONT_SKUS.includes(i.sku) && isBillingItemActive(i, now));
/** The account's loyalty bonus. `paidInstances` is `users.subscription_quantity`; above the cap the account is excluded. */
const loyaltyBonus = (items, now, paidInstances = 0) => {
	if (isLoyaltyExcluded(paidInstances)) return {
		bonus: 0,
		basis: "excluded",
		renewals: 0
	};
	const start = loyaltyChainStart(items, now);
	const renewals = start ? wholeMonthsBetween(start, new Date(now.getTime() + DAY)) : 0;
	const chainStart = start?.toISOString();
	if (hasUpfrontLoyalty(items, now)) return {
		bonus: 5,
		basis: "upfront",
		renewals,
		chainStart
	};
	const bonus = bonusForRenewals(renewals);
	return {
		bonus,
		basis: bonus > 0 ? "renewals" : "none",
		renewals,
		chainStart
	};
};
/** The grant note customers see in the dashboard tooltip. */
const loyaltyNote = (r) => r.basis === "upfront" ? `Loyalty bonus: ${5} instances with your annual or lifetime plan` : `Loyalty bonus: ${r.renewals} month${r.renewals === 1 ? `` : `s`} subscribed`;
/** A paid (not refunded) renewal invoice. Initial and plan-change invoices don't count. */
const isPaidRenewalInvoice = (a) => !!a && a.billing_reason === "renewal" && a.status === "paid" && !a.refunded;
const MONTHS = [
	`Jan`,
	`Feb`,
	`Mar`,
	`Apr`,
	`May`,
	`Jun`,
	`Jul`,
	`Aug`,
	`Sep`,
	`Oct`,
	`Nov`,
	`Dec`
];
/** `Jan 13, 2027` (UTC). */
const formatShortDate = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
/** Email templates (message_templates slugs). Editable in the mothership admin. */
const LOYALTY_TEMPLATES = {
	welcome: "bonus_welcome",
	welcomeAnnual: "bonus_welcome_annual",
	welcomeLifetime: "bonus_welcome_lifetime",
	firstEarned: "bonus_first_earned",
	earned: "bonus_earned",
	progress: "bonus_progress"
};
const emailVars = (r) => {
	const at = nextBonusAtRenewal(r.renewals);
	const date = r.chainStart && at !== null ? formatShortDate(addMonths(new Date(r.chainStart), at)) : ``;
	return {
		current: `${r.bonus}`,
		max: `${5}`,
		date,
		next: at === null ? `You're at the max` : date ? `On your ${date} renewal` : `Soon`
	};
};
/**
* The email after a paid renewal (Ben, 2026-11-14): fanfare when this chain month earned a bonus (the first one gets
* its own), progress when it didn't, nothing at 5 or for annual/lifetime. One per chain month (`ref`), however many
* subscriptions renew.
*/
const loyaltyRenewalEmail = (r) => {
	if (r.basis !== "renewals" || !r.chainStart || r.renewals < 1) return null;
	const ref = `chain:${r.chainStart}:${r.renewals}`;
	if (bonusForRenewals(r.renewals) > bonusForRenewals(r.renewals - 1)) return {
		template: r.bonus === 1 ? LOYALTY_TEMPLATES.firstEarned : LOYALTY_TEMPLATES.earned,
		ref,
		vars: emailVars(r)
	};
	if (r.bonus >= 5) return null;
	return {
		template: LOYALTY_TEMPLATES.progress,
		ref,
		vars: emailVars(r)
	};
};
/**
* The email on a new purchase: annual and lifetime get their 5 once, here. A monthly subscription that starts a new
* chain gets the welcome with the date its first bonus lands; one that joins an existing chain (a second instance, or
* an account already on annual) gets nothing.
*/
const loyaltyPurchaseEmail = (r, sku, ref) => {
	if (r.basis === "excluded") return null;
	if (sku === "hosting.slot.lifetime") return {
		template: LOYALTY_TEMPLATES.welcomeLifetime,
		ref,
		vars: emailVars(r)
	};
	if (sku === "hosting.slot.recurring.year") return {
		template: LOYALTY_TEMPLATES.welcomeAnnual,
		ref,
		vars: emailVars(r)
	};
	if (!LOYALTY_MONTHLY_SKUS.includes(sku) || r.basis === "upfront" || r.renewals > 0 || !r.chainStart) return null;
	return {
		template: LOYALTY_TEMPLATES.welcome,
		ref: `chain:${r.chainStart}:0`,
		vars: emailVars(r)
	};
};
const LOYALTY_ENDING_TEMPLATES = {
	cancel: {
		none: "bonus_cancelled_none",
		earning: "bonus_cancelled_earning",
		maxed: "bonus_cancelled_maxed"
	},
	expired: {
		none: "bonus_last_chance_none",
		earning: "bonus_last_chance_earning",
		maxed: "bonus_last_chance_maxed"
	}
};
/**
* The email when a subscription is cancelled (`cancel`, still paid until `endsAt`) or has expired (`expired`). Only
* when that subscription ending breaks the account's chain: cancelling one of two overlapping subscriptions sends
* nothing. Which version goes out depends on the bonus at stake: none (no bonus yet), earning (1 to 4) or maxed (5).
* `items` already reflect the cancel or expiry.
*/
const loyaltyEndingEmail = (kind, items, subscriptionId, endsAtIso, now, paidInstances, urls) => {
	if (!endsAtIso) return null;
	const endsAt = new Date(endsAtIso);
	if (isNaN(endsAt.getTime())) return null;
	const ended = items.map((i) => i.kind === "subscription" && i.external_id === subscriptionId ? {
		...i,
		status: "expired",
		ends_at: endsAtIso
	} : i);
	if (loyaltyChainStart(ended, new Date(endsAt.getTime() + DAY))) return null;
	const at = kind === "cancel" ? now : /* @__PURE__ */ new Date(endsAt.getTime() - 60 * 1e3);
	const r = loyaltyBonus(kind === "cancel" ? items : ended, at, paidInstances);
	if (r.basis === "excluded") return null;
	const level = r.bonus <= 0 ? "none" : r.bonus >= 5 ? "maxed" : "earning";
	return {
		template: LOYALTY_ENDING_TEMPLATES[kind][level],
		ref: `${kind}:${subscriptionId}:${endsAtIso}`,
		vars: {
			...emailVars(r),
			ends: formatShortDate(endsAt),
			deadline: formatShortDate(new Date(endsAt.getTime() + 30 * DAY)),
			resume_url: urls.resume,
			pricing_url: urls.pricing
		}
	};
};
/** One-click resume link token: `<subscription id>.<hs256("resume:<id>", secret)>`. */
const resumeToken = (hs256, secret, subscriptionId) => `${subscriptionId}.${hs256(`resume:${subscriptionId}`, secret)}`;
/** The subscription id from a valid resume token, else undefined. */
const parseResumeToken = (hs256, secret, token) => {
	const dot = `${token || ""}`.indexOf(".");
	if (dot <= 0 || !secret) return void 0;
	const id = token.slice(0, dot);
	return resumeToken(hs256, secret, id) === token ? id : void 0;
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
/**
* When the purchase started, from the stored provider payload: LS `created_at` (subscriptions and orders keep their LS
* attributes there), or Stripe's `created` (unix seconds) on a stored Stripe object.
*/
const storedCreatedAt = (rec) => {
	try {
		const data = JSON.parse(rec.getString(`provider_data`) || `null`);
		if (data?.created_at) return `${data.created_at}`;
		if (typeof data?.created === `number` && data.created > 0) return (/* @__PURE__ */ new Date(data.created * 1e3)).toISOString();
		return;
	} catch {
		return;
	}
};
const toItem = (rec) => ({
	provider: rec.getString(`provider`),
	kind: rec.getString(`kind`),
	external_id: rec.getString(`external_id`),
	sku: rec.getString(`sku`),
	quantity: rec.getInt(`quantity`),
	status: rec.getString(`status`),
	starts_at: storedCreatedAt(rec),
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
const lc$3 = (s) => `${s ?? ""}`.trim().toLowerCase();
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
	return [...new Set([lc$3(userRec.getString(`email`)), ...alt.map(lc$3)])].filter(Boolean);
};
/**
* Record LS checkout emails that differ from the account email. Only call with emails tied to this user by checkout
* `custom_data.user_id` (or an existing billing item), never by email lookup. Returns true when something was added.
*/
const rememberLsEmails = (app, userRec, emails) => {
	const known = lsEmailsFor(userRec);
	const add = emails.map(lc$3).filter((e) => e && !known.includes(e));
	if (!add.length) return false;
	const links = readBillingLinks(userRec);
	links.lemonsqueezy = links.lemonsqueezy || {};
	links.lemonsqueezy.emails = [...new Set([...(links.lemonsqueezy.emails || []).map(lc$3), ...add])];
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
	else if (items.some((i) => i.provider === `stripe`)) userRec.set(`billing_provider`, `stripe`);
	app.saveNoValidate(userRec);
	return {
		before,
		after: entitlement.subscription_quantity,
		entitlement
	};
};

//#endregion
//#region src/lib/handlers/lemon/lib/loyaltyStore.ts
const GRANTS = `bonus_grants`;
/** The account's one `loyalty` grant row, if any. */
const findLoyaltyGrant = (app, userId) => {
	try {
		return app.findFirstRecordByFilter(GRANTS, `user = {:user} && source = 'loyalty'`, { user: userId });
	} catch {
		return;
	}
};
/**
* Recompute the account's loyalty bonus from its billing items (the subscription chain's start dates) and keep its
* single `loyalty` grant row in line: amount = bonus, removed at 0. The `bonus_grants` hooks then recompute
* `users.bonus_instances`. Manual grants are never touched. No Lemon Squeezy calls.
*/
const syncLoyalty = (app, userId, options = {}) => {
	const apply = options.apply ?? true;
	const now = options.now ?? /* @__PURE__ */ new Date();
	const result = loyaltyBonus(loadBillingItems(app, userId), now, app.findRecordById(`users`, userId).getFloat(`subscription_quantity`));
	const grant = findLoyaltyGrant(app, userId);
	const before = grant ? grant.getInt(`amount`) : 0;
	const note = loyaltyNote(result);
	const changed = result.bonus !== before || result.bonus > 0 && grant?.getString(`note`) !== note;
	if (apply && changed) if (result.bonus === 0) {
		if (grant) app.delete(grant);
	} else {
		const rec = grant || new Record(app.findCollectionByNameOrId(GRANTS));
		rec.set(`user`, userId);
		rec.set(`source`, `loyalty`);
		rec.set(`amount`, result.bonus);
		rec.set(`note`, note);
		app.save(rec);
	}
	return {
		...result,
		before,
		changed
	};
};
/**
* Users the loyalty backfill looks at: anyone with a Lemon Squeezy or Stripe lifetime, annual or monthly per-instance
* purchase, plus anyone who already has a loyalty grant (so stale ones get cleared). Sorted by id so `offset` paging is
* stable.
*/
const loyaltyCandidateUserIds = (app) => {
	const skus = [...LOYALTY_UPFRONT_SKUS, ...LOYALTY_MONTHLY_SKUS].map((s) => `'${s}'`).join(`, `);
	const rows = arrayOf(new DynamicModel({ user: "" }));
	app.db().newQuery(`SELECT DISTINCT user FROM billing_items WHERE provider IN ('lemonsqueezy', 'stripe') AND sku IN (${skus})
       UNION SELECT DISTINCT user FROM bonus_grants WHERE source = 'loyalty'
       ORDER BY user`).all(rows);
	return rows.map((r) => `${r.user}`).filter(Boolean);
};

//#endregion
//#region src/lib/handlers/lemon/lib/accountClaimStore.ts
/** The site the claim and login links point at (the dashboard, not the mothership API). */
const SITE$2 = `https://pockethost.io`;
const claimSecret = () => `${process.env.LS_WEBHOOK_SECRET || ""}`;
const nowSeconds = () => Math.floor(Date.now() / 1e3);
const hashClaimToken = (token) => $security.sha256(token);
/** The account a browser claim token belongs to, or undefined (unknown token, or the webhook hasn't run yet). */
const findUserByBrowserClaim = (app, token) => {
	if (!isBrowserClaimToken(token)) return void 0;
	try {
		return app.findFirstRecordByFilter(`users`, `claim_hash = {:h}`, { h: hashClaimToken(token) });
	} catch {
		return;
	}
};
const findUserByEmailClaim = (app, token) => {
	const userId = parseEmailClaimToken($security.hs256, claimSecret(), token, nowSeconds());
	if (!userId) return void 0;
	try {
		return app.findRecordById(`users`, userId);
	} catch {
		return;
	}
};
/** The account behind either kind of claim token. */
const findUserByClaim = (app, p) => p.claim ? findUserByBrowserClaim(app, p.claim) : p.t ? findUserByEmailClaim(app, p.t) : void 0;
const randomPassword = () => $security.randomStringWithAlphabet(48, `abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789`);
/**
* A new, unclaimed account for a buyer who paid without one. Unverified, random password, `claim_open`. If another
* webhook for the same checkout created it a moment earlier (unique email), that account is returned instead.
*/
const createBuyerAccount = (app, email, browserClaim, log) => {
	const users = app.findCollectionByNameOrId(`users`);
	const user = new Record(users);
	user.set(`email`, normalizeEmail(email));
	user.setPassword(randomPassword());
	user.set(`verified`, false);
	user.set(`subscription`, `free`);
	user.set(`subscription_quantity`, 0);
	user.set(`subscription_status`, `lapsed`);
	user.set(`claim_open`, true);
	if (isBrowserClaimToken(browserClaim)) user.set(`claim_hash`, hashClaimToken(browserClaim));
	try {
		app.save(user);
		log(`created buyer account`, user.id);
		return {
			user,
			created: true
		};
	} catch (err) {
		try {
			return {
				user: app.findFirstRecordByData(`users`, `email`, normalizeEmail(email)),
				created: false
			};
		} catch {
			throw err;
		}
	}
};
/** Point a browser claim token at an account the sale was added to (so the claim page can say where it went). */
const rememberBrowserClaim = (app, userRec, browserClaim) => {
	if (!isBrowserClaimToken(browserClaim)) return;
	const hash = hashClaimToken(browserClaim);
	if (userRec.getString(`claim_hash`) === hash) return;
	userRec.set(`claim_hash`, hash);
	app.saveNoValidate(userRec);
};
/**
* Email straight to an address from a message template. Platform notifications skip unverified accounts; a buyer's new
* account is unverified, and this email is how they reach it.
*/
const sendTemplateEmail = (app, to, slug, vars, log) => {
	const tpl = app.findFirstRecordByData(`message_templates`, `slug`, slug);
	const lower = Object.fromEntries(Object.entries(vars).map(([k, v]) => [k.toLowerCase(), v]));
	const msg = new MailerMessage({
		from: {
			address: app.settings().meta.senderAddress,
			name: app.settings().meta.senderName
		},
		to: [{ address: to }],
		bcc: [{ address: `pockethost+notifications@benallfree.com` }],
		subject: interpolateString(tpl.getString(`subject`), lower),
		html: interpolateString(tpl.getString(`body_html`), lower)
	});
	app.newMailClient().send(msg);
	log(`sent ${slug}`, to);
};
/** "Your PocketHost account is ready": the claim link, to the billing email. */
const sendClaimEmail = (app, userRec, billingEmail, log) => {
	const t = emailClaimToken($security.hs256, claimSecret(), userRec.id, nowSeconds());
	sendTemplateEmail(app, billingEmail, `account_claim`, {
		CLAIM_URL: `${SITE$2}/claim?t=${encodeURIComponent(t)}`,
		LOGIN_URL: `${SITE$2}/login`
	}, log);
};
/** A guest checkout landed on an existing account (matched by email). */
const sendPurchaseAddedEmail = (app, userRec, billingEmail, log) => {
	sendTemplateEmail(app, billingEmail, `account_purchase_added`, {
		ACCOUNT_EMAIL: maskEmail(userRec.getString(`email`)),
		LOGIN_URL: `${SITE$2}/login`
	}, log);
};
/** What the claim page may know about an account behind a token. Only an open claim reveals the email. */
const claimStatus = (userRec) => {
	if (!userRec) return { state: `pending` };
	if (userRec.getBool(`claim_open`)) return {
		state: `open`,
		email: userRec.getString(`email`)
	};
	return {
		state: `claimed`,
		email: maskEmail(userRec.getString(`email`))
	};
};
/** Close a claim: both tokens stop working. */
const closeClaim = (userRec) => {
	userRec.set(`claim_open`, false);
	userRec.set(`claim_hash`, ``);
};
/**
* Move everything a just-paid, unclaimed account owns onto the buyer's existing account, then delete the empty one.
* Pay-first accounts have no instances yet, so their billing items are all there is.
*/
const attachClaimToUser = (app, claimUser, target, log) => {
	if (!claimUser.getBool(`claim_open`)) throw new Error(`This purchase was already set up`);
	if (claimUser.id === target.id) throw new Error(`Same account`);
	if (app.findRecordsByFilter(`instances`, `uid = {:u}`, ``, 1, 0, { u: claimUser.id }).length) throw new Error(`That account already has instances; contact support`);
	const billingEmails = lsEmailsFor(claimUser);
	app.runInTransaction((tx) => {
		for (const rec of loadBillingItemRecords(tx, claimUser.id)) {
			rec.set(`user`, target.id);
			tx.save(rec);
		}
		rememberLsEmails(tx, target, billingEmails);
		reconcileUser(tx, target);
		reconcileUser(tx, claimUser);
	});
	for (const id of [claimUser.id, target.id]) try {
		syncLoyalty(app, id);
	} catch (err) {
		log(`loyalty sync after attach failed`, id, `${err}`);
	}
	try {
		app.delete(app.findRecordById(`users`, claimUser.id));
	} catch (err) {
		log(`could not delete attached claim account, retiring it`, claimUser.id, `${err}`);
		const rec = app.findRecordById(`users`, claimUser.id);
		rec.set(`email`, `attached+${rec.id}@users.pockethost.invalid`);
		closeClaim(rec);
		app.saveNoValidate(rec);
	}
	log(`attached claim`, claimUser.id, `to`, target.id);
};

//#endregion
//#region src/lib/handlers/lemon/api/HandleAccountClaim.ts
/** Via requestInfo (cached): recordAuthResponse reads the request info again, so the raw body must not be consumed. */
const readBody = (e) => e.requestInfo().body || {};
const tokenOf = (b) => ({
	claim: b.claim,
	t: b.t
});
const HandleClaimStatus = (e) => {
	const body = readBody(e);
	if (!body.claim && !body.t) throw new BadRequestError(`claim or t is required`);
	return e.json(200, claimStatus(findUserByClaim($app, tokenOf(body))));
};
const HandleClaimComplete = (e) => {
	const log = mkLog(`claim`);
	const audit = mkAudit(log, $app);
	const body = readBody(e);
	const user = findUserByClaim($app, tokenOf(body));
	if (!user) throw new BadRequestError(`This link isn't valid or has expired.`);
	if (!user.getBool(`claim_open`)) throw new BadRequestError(`This account is already set up. Log in instead.`);
	const email = normalizeEmail(body.email);
	const password = `${body.password || ""}`;
	if (!looksLikeEmail(email)) throw new BadRequestError(`Enter a valid email address.`);
	if (password.length < 8) throw new BadRequestError(`Use a password with at least ${8} characters.`);
	const billingEmail = normalizeEmail(user.getString(`email`));
	const changed = email !== billingEmail;
	if (changed) {
		let taken = false;
		try {
			$app.findFirstRecordByData(`users`, `email`, email);
			taken = true;
		} catch {}
		if (taken) throw new BadRequestError(`That email already has an account. Log in to add this purchase to it.`);
		user.setEmail(email);
		user.setVerified(false);
		rememberLsEmails($app, user, [billingEmail]);
	} else if (body.t) user.setVerified(true);
	user.setPassword(password);
	closeClaim(user);
	$app.save(user);
	if (!user.verified()) try {
		$mails.sendRecordVerification($app, user);
	} catch (err) {
		log(`verification email failed`, `${err}`);
	}
	audit(`CLAIM`, `Account claimed${changed ? ` with a different email than billing` : ``}.`, {
		user_id: user.id,
		via: body.t ? `email` : `browser`
	});
	return $apis.recordAuthResponse(e, user, `password`, null);
};
const HandleClaimAttach = (e) => {
	const log = mkLog(`claim`);
	const audit = mkAudit(log, $app);
	const target = e.auth;
	if (!target || target.collection().name !== `users`) throw new UnauthorizedError(`Log in first`);
	const body = readBody(e);
	const claimUser = findUserByClaim($app, tokenOf(body));
	if (!claimUser) throw new BadRequestError(`This link isn't valid or has expired.`);
	try {
		attachClaimToUser($app, claimUser, $app.findRecordById(`users`, target.id), log);
	} catch (err) {
		throw new BadRequestError(`${err}`.replace(/^Error: /, ``));
	}
	audit(`CLAIM`, `Purchase attached to an existing account.`, {
		user_id: target.id,
		from: claimUser.id
	});
	return e.json(200, { status: `ok` });
};

//#endregion
//#region ../common/billing/stripe.ts
/**
* Stripe (Managed Payments) billing, the pure part. JSVM-safe: plain data + sync functions only.
*
* A Stripe price's `lookup_key` is the internal SKU it sells (e.g. `hosting.slot.recurring.month`), so no Stripe ids
* live in code: checkout finds the price by lookup key, and webhooks read the SKU back off the price. The same code
* then works against a Stripe sandbox and the live account.
*/
/** Stripe API version every request pins. Managed Payments on Checkout Sessions needs 2025-03-31.basil or later. */
const STRIPE_API_VERSION = "2026-04-22.dahlia";
/** SKUs sold through Stripe checkout. */
const STRIPE_CHECKOUT_SKUS = [
	"hosting.slot.recurring.month",
	"hosting.slot.recurring.year",
	"hosting.slot.lifetime"
];
const isStripeCheckoutSku = (sku) => !!sku && STRIPE_CHECKOUT_SKUS.includes(sku);
/** The SKU a Stripe price sells, from its lookup key. Undefined for prices we don't know. */
const skuFromStripePrice = (price) => {
	const key = `${price?.lookup_key || ""}`;
	return isKnownSku(key) ? key : void 0;
};
const iso = (unix) => typeof unix === "number" && unix > 0 ? (/* @__PURE__ */ new Date(unix * 1e3)).toISOString() : void 0;
const productName = (price) => typeof price?.product === "object" && price.product ? price.product.name || "" : "";
/**
* Stripe subscription status in the vocabulary billing items already use (Lemon Squeezy's), so entitlement, loyalty and
* cancel logic work unchanged: a subscription set to end is `cancelled` until `ends_at`, as on Lemon Squeezy.
*/
const stripeSubscriptionStatus = (sub) => {
	switch (sub.status) {
		case "active": return sub.cancel_at_period_end || sub.cancel_at ? "cancelled" : "active";
		case "trialing": return sub.cancel_at_period_end || sub.cancel_at ? "cancelled" : "on_trial";
		case "past_due": return "past_due";
		case "canceled":
		case "incomplete_expired": return "expired";
		default: return sub.status || "unknown";
	}
};
/** Map a Stripe subscription to a billing item. Undefined when its price isn't one of ours. */
const billingItemFromStripeSubscription = (sub) => {
	const item = sub.items?.data?.find((i) => skuFromStripePrice(i.price));
	const sku = skuFromStripePrice(item?.price);
	if (!item || !sku) return void 0;
	const entitlement = entitlementFromSku(sku, item.quantity || 1);
	const status = stripeSubscriptionStatus(sub);
	const periodEnd = item.current_period_end ?? sub.current_period_end;
	const endsAt = status === "cancelled" ? iso(sub.cancel_at ?? periodEnd) : status === "expired" ? iso(sub.ended_at) : void 0;
	return {
		provider: "stripe",
		kind: "subscription",
		external_id: sub.id,
		sku,
		quantity: entitlement.subscription_quantity,
		status,
		starts_at: iso(sub.created),
		ends_at: endsAt,
		renews_at: status === "active" || status === "on_trial" ? iso(periodEnd) : void 0,
		variant_id: item.price?.id || "",
		product_name: productName(item.price),
		variant_name: item.price?.nickname || ""
	};
};
/**
* A one-time (lifetime) purchase as a billing item, keyed by its PaymentIntent so refunds (which name the
* PaymentIntent) find it. Undefined when no line item is a lifetime price of ours.
*/
const billingItemFromStripePayment = (p) => {
	const line = p.lineItems.find((l) => {
		const sku = skuFromStripePrice(l.price);
		return !!sku && sku === "hosting.slot.lifetime";
	});
	const sku = skuFromStripePrice(line?.price);
	if (!line || !sku) return void 0;
	const entitlement = entitlementFromSku(sku, line.quantity || 1);
	return {
		provider: "stripe",
		kind: "order",
		external_id: p.paymentIntentId,
		sku,
		quantity: entitlement.subscription_quantity,
		status: p.status || "paid",
		starts_at: iso(p.created),
		variant_id: line.price?.id || "",
		product_name: productName(line.price ?? void 0),
		variant_name: line.price?.nickname || ""
	};
};
/** Order status after a refund on its charge. */
const stripeRefundStatus = (charge) => charge.refunded || charge.amount && charge.amount_refunded && charge.amount_refunded >= charge.amount ? "refunded" : "partial_refund";
/**
* The subscription an invoice belongs to. API versions from basil on moved it to `parent.subscription_details`; older
* ones have `subscription`.
*/
const invoiceSubscriptionId = (invoice) => {
	const v = invoice?.parent?.subscription_details?.subscription ?? invoice?.subscription;
	if (!v) return void 0;
	return typeof v === "string" ? v : v.id;
};
/** Encode params the way Stripe's form API wants them: `a[b][0][c]=v`. Undefined and null are left out. */
const stripeForm = (params) => {
	const parts = [];
	const walk = (prefix, value) => {
		if (value === void 0 || value === null) return;
		if (Array.isArray(value)) {
			value.forEach((v, i) => walk(`${prefix}[${i}]`, v));
			return;
		}
		if (typeof value === "object") {
			for (const [k, v] of Object.entries(value)) walk(`${prefix}[${k}]`, v);
			return;
		}
		parts.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(`${value}`)}`);
	};
	for (const [k, v] of Object.entries(params)) walk(k, v);
	return parts.join("&");
};
/** Webhook signatures older than this are rejected (Stripe's own default). */
const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;
/**
* Check a `Stripe-Signature` header (`t=<unix>,v1=<hex>[,v1=...]`) against the raw body. `hs256(data, secret)` returns
* the hex HMAC-SHA256 (PocketBase's `$security.hs256`), `equal` compares in constant time.
*/
const verifyStripeSignature = (p) => {
	if (!p.header || !p.secret) return false;
	let t = "";
	const v1 = [];
	for (const part of p.header.split(",")) {
		const [k, ...rest] = part.trim().split("=");
		const v = rest.join("=");
		if (k === "t") t = v;
		else if (k === "v1" && v) v1.push(v);
	}
	const ts = Number(t);
	if (!t || !Number.isFinite(ts) || !v1.length) return false;
	if (Math.abs(p.nowSeconds - ts) > 300) return false;
	const expected = p.hs256(`${t}.${p.raw}`, p.secret);
	return v1.some((sig) => p.equal(expected, sig));
};

//#endregion
//#region src/lib/handlers/stripe/lib/stripeApi.ts
/** Overridable for local testing against a mock; production uses the real API. */
const STRIPE_API = process.env.STRIPE_API_BASE || `https://api.stripe.com/v1`;
const stripeSecretKey = () => {
	const key = process.env.STRIPE_SECRET_KEY || $os.getenv(`STRIPE_SECRET_KEY`);
	if (!key) throw new BadRequestError(`Stripe is not configured (set STRIPE_SECRET_KEY on mothership)`);
	return key;
};
/** One Stripe API call. GET params go in the query string, POST params as a form body. */
const stripeRequest = (method, path, params = {}) => {
	const form = stripeForm(params);
	const url = `${STRIPE_API}${path}${method === "GET" && form ? `${path.includes("?") ? "&" : "?"}${form}` : ""}`;
	const res = $http.send({
		url,
		method,
		headers: {
			Authorization: `Bearer ${stripeSecretKey()}`,
			"Stripe-Version": STRIPE_API_VERSION,
			"Content-Type": `application/x-www-form-urlencoded`
		},
		body: method === "GET" ? "" : form,
		timeout: 30
	});
	if (res.statusCode < 200 || res.statusCode >= 300) {
		const detail = res.json?.error?.message || JSON.stringify(res.json);
		throw new BadRequestError(`Stripe ${method} ${path} failed (${res.statusCode}): ${detail}`);
	}
	return res.json;
};
/** The active price for a SKU (its lookup key), with its product. */
const stripePriceForSku = (sku) => {
	const price = stripeRequest(`GET`, `/prices`, {
		lookup_keys: [sku],
		active: true,
		expand: [`data.product`]
	})?.data?.[0];
	if (!price) throw new BadRequestError(`No active Stripe price with lookup key ${sku}`);
	return price;
};
/** A subscription with each item's price and product, as billing items need it. */
const stripeSubscription = (id) => stripeRequest(`GET`, `/subscriptions/${encodeURIComponent(id)}`, { expand: [`items.data.price.product`] });
const stripeCheckoutLineItems = (sessionId) => stripeRequest(`GET`, `/checkout/sessions/${encodeURIComponent(sessionId)}/line_items`, {
	limit: 100,
	expand: [`data.price.product`]
})?.data || [];
/** Cancel at period end (the customer keeps access until then). Returns the updated subscription. */
const stripeCancelSubscription = (id) => {
	stripeRequest(`POST`, `/subscriptions/${encodeURIComponent(id)}`, { cancel_at_period_end: true });
	return stripeSubscription(id);
};

//#endregion
//#region src/lib/handlers/lemon/api/HandleLemonSqueezyCancel.ts
const CANCELABLE_SKUS = [`hosting.slot.recurring.month`, `hosting.slot.recurring.month.legacy`];
/**
* Cancel the authenticated user's monthly membership at period end.
*
* Body (optional): `{ "itemId": "<billing_items id>" }` cancels one subscription. Without it, every active monthly
* subscription on the account is cancelled — users can hold several (e.g. PayPal subscriptions that could not change
* quantity), and "cancel membership" means all of them. Covers Lemon Squeezy and Stripe subscriptions alike.
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
			return [`lemonsqueezy`, `stripe`].includes(rec.getString(`provider`)) && rec.getString(`kind`) === `subscription` && CANCELABLE_SKUS.includes(rec.getString(`sku`)) && rec.getString(`status`) !== `cancelled` && isBillingItemActive({
				kind: `subscription`,
				status: rec.getString(`status`)
			}, now);
		});
		if (targets.length === 0) throw new BadRequestError(`No cancellable membership on this account`);
		const cancelled = [];
		for (const rec of targets) {
			const subscriptionId = rec.getString(`external_id`);
			if (rec.getString(`provider`) === `stripe`) {
				const sub = stripeCancelSubscription(subscriptionId);
				const item = billingItemFromStripeSubscription(sub);
				if (item) upsertBillingItem($app, userRec.id, item, { providerData: sub });
				cancelled.push({
					itemId: rec.id,
					subscriptionId,
					endsAt: item?.ends_at || null
				});
				continue;
			}
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
const SITE$1 = `https://pockethost.io`;
const ALNUM$1 = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`;
const HandleLemonSqueezyCheckout = (e) => {
	const log = mkLog(`ls-checkout`);
	try {
		const authRecord = e.auth;
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
		const claim = authRecord ? `` : $security.randomStringWithAlphabet(40, ALNUM$1);
		const checkoutData = authRecord ? {
			email: authRecord.get(`email`),
			custom: { user_id: authRecord.id }
		} : { custom: { claim } };
		const redirectUrl = authRecord ? `${SITE$1}/dashboard?paid=1` : `${SITE$1}/claim`;
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
				attributes: {
					checkout_data: checkoutData,
					product_options: { redirect_url: redirectUrl }
				},
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
		log(`checkout created`, authRecord ? authRecord.id : `guest`, pvId);
		return e.json(200, authRecord ? { url } : {
			url,
			claim
		});
	} catch (err) {
		log(`${err}`);
		throw err;
	}
};

//#endregion
//#region ../common/billing/lsClaims.ts
const str = (v) => `${v ?? ""}`.trim();
const lc$2 = (v) => str(v).toLowerCase();
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
		const email = lc$2(c.data?.data?.attributes?.user_email);
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
const lc$1 = (s) => `${s ?? ""}`.trim().toLowerCase();
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
		const k = lc$1(email);
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
		const email = lc$1(userRec.getString(`email`));
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
				const lsEmail = lc$1(fresh.providerData?.user_email);
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
			email: lc$1(rec.getString(`email`)),
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
/** Events that post to the lemon_cancel_discord template. */
const CANCEL_EVENTS = [`subscription_cancelled`];
/** Events that post to the lemon_refund_discord template (a refund isn't a cancellation). */
const REFUND_EVENTS = [`order_refunded`, `subscription_payment_refunded`];
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
			if (!email) throw new Error(`No user ID or checkout email`);
			for (const candidate of [...new Set([email, email.toLowerCase()])]) try {
				const match = $app.findFirstRecordByData(`users`, `email`, candidate);
				context.user_id_source = `email`;
				return match;
			} catch {}
			const claim = payload.meta?.custom_data?.claim;
			if (!claim) throw new Error(`No PocketHost user for checkout email ${email}`);
			const { user, created } = createBuyerAccount($app, email, claim, log);
			context.user_id_source = created ? `create` : `email`;
			context.account_created = created;
			return user;
		})();
		context.user_id = userRec.id;
		context.user_email = userRec.getString(`email`);
		const guestClaim = payload.meta?.custom_data?.claim;
		context.guest_checkout = !!guestClaim;
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
		let loyalty;
		try {
			loyalty = syncLoyalty($app, userRec.id);
			context.bonus_before = loyalty.before;
			context.bonus_after = loyalty.bonus;
		} catch (err) {
			context.bonus_error = `${err}`;
			log(`loyalty sync failed`, `${err}`);
		}
		const billingEmail = `${attrs.user_email || firstAttrs.user_email || ""}`.trim();
		try {
			if (context.account_created && billingEmail) sendClaimEmail($app, userRec, billingEmail, log);
			else if (guestClaim && context.user_id_source === `email` && billingEmail) {
				if (userRec.getString(`claim_hash`) !== $security.sha256(`${guestClaim}`)) {
					rememberBrowserClaim($app, userRec, guestClaim);
					if (!userRec.getBool(`claim_open`)) sendPurchaseAddedEmail($app, userRec, billingEmail, log);
				}
			}
		} catch (err) {
			log(`claim email failed`, `${err}`);
		}
		const notify = mkNotifier(log, $app);
		if (context.event_name === `order_created`) notify(`lemonbot`, `lemon_order_discord`, userRec.id, context);
		else if (CANCEL_EVENTS.includes(context.event_name)) notify(`lemonbot`, `lemon_cancel_discord`, userRec.id, context);
		else if (REFUND_EVENTS.includes(context.event_name)) notify(`lemonbot`, `lemon_refund_discord`, userRec.id, context);
		const sendLoyaltyEmail = (email) => {
			if (!email) return;
			try {
				const tpl = $app.findFirstRecordByData(`message_templates`, `slug`, email.template);
				if (!$app.findRecordsByFilter(`notifications`, `user = {:user} && message_template = {:tpl} && payload ~ {:ref}`, ``, 1, 0, {
					user: userRec.id,
					tpl: tpl.id,
					ref: `"loyalty_ref":"${email.ref}"`
				}).length) notify(`email`, email.template, userRec.id, {
					...email.vars,
					loyalty_ref: email.ref
				});
			} catch (err) {
				log(`${email.template} email failed`, `${err}`);
			}
		};
		if (loyalty && context.event_name === `subscription_payment_success` && isPaidRenewalInvoice(attrs)) sendLoyaltyEmail(loyaltyRenewalEmail(loyalty));
		if (loyalty && context.event_name === `subscription_created` && first) {
			const sku = billingItemFromLsSubscription(first)?.sku;
			if (sku) sendLoyaltyEmail(loyaltyPurchaseEmail(loyalty, sku, `subscription:${first.id}`));
		}
		if (loyalty && context.event_name === `order_created` && order) sendLoyaltyEmail(loyaltyPurchaseEmail(loyalty, order.sku, `order:${context.resource_id}`));
		if (first && (context.event_name === `subscription_cancelled` || context.event_name === `subscription_expired`)) try {
			const id = `${first.id}`;
			sendLoyaltyEmail(loyaltyEndingEmail(context.event_name === `subscription_cancelled` ? `cancel` : `expired`, loadBillingItems($app, userRec.id), id, firstAttrs.ends_at || void 0, /* @__PURE__ */ new Date(), userRec.getFloat(`subscription_quantity`), {
				resume: `${mothershipPublicUrl()}/api/loyalty/resume?t=${encodeURIComponent(resumeToken($security.hs256, `${process.env.LS_WEBHOOK_SECRET || ""}`, id))}`,
				pricing: `https://pockethost.io/pricing`
			}));
		} catch (err) {
			log(`loyalty ending email failed`, `${err}`);
		}
		const bonusMsg = context.bonus_before !== void 0 && context.bonus_before !== context.bonus_after ? ` Loyalty bonus ${context.bonus_before} → ${context.bonus_after}.` : context.bonus_error ? ` Loyalty sync failed.` : ``;
		audit(`LS`, `${context.event_name}: slots ${before} → ${after}.${bonusMsg}`, context);
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
//#region src/lib/handlers/lemon/api/HandleLoyaltyBackfill.ts
/**
* Superuser: `POST /api/loyalty/backfill` - recompute loyalty bonuses for existing customers. Dry run by default.
*
* - `apply=1` writes the `loyalty` grant rows.
* - `user=<id>` one user.
* - `offset`, `limit` (default 0, 40): one page of candidates. Call again with `next` until it is null.
*/
const HandleLoyaltyBackfill = (e) => {
	const q = e.request.url.query();
	const apply = q.get(`apply`) === `1`;
	const onlyUser = q.get(`user`);
	const offset = Math.max(0, Number(q.get(`offset`) || 0) || 0);
	const limit = Math.min(200, Math.max(1, Number(q.get(`limit`) || 40) || 40));
	const all = onlyUser ? [onlyUser] : loyaltyCandidateUserIds($app);
	const page = all.slice(offset, offset + limit);
	const changes = [];
	const errors = [];
	let unchanged = 0;
	for (const user of page) try {
		const r = syncLoyalty($app, user, { apply });
		if (r.changed) changes.push({
			user,
			before: r.before,
			after: r.bonus,
			basis: r.basis,
			months: r.renewals
		});
		else unchanged++;
	} catch (err) {
		errors.push({
			user,
			error: `${err}`
		});
	}
	const next = offset + page.length < all.length ? offset + page.length : null;
	const report = {
		mode: apply ? `apply` : `dry-run`,
		total: all.length,
		offset,
		next,
		unchanged,
		changes,
		errors
	};
	if (apply && (changes.length || errors.length)) mkAudit(mkLog(`loyalty-backfill`), $app)(`LS`, `Loyalty backfill (offset ${offset}): ${changes.length} changed, ${errors.length} errors.`, {
		changes,
		errors
	});
	return e.json(200, report);
};

//#endregion
//#region src/lib/handlers/lemon/api/HandleLoyaltyResume.ts
/**
* One-click resume from the "sorry to see you go" email: `GET /api/loyalty/resume?t=<token>` shows a confirm button (a
* GET never changes anything, because link scanners open every URL in a message); the button POSTs back and the
* cancelled Lemon Squeezy subscription is resumed (`cancelled: false`), keeping its chain and bonus instances.
*/
const page = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;line-height:1.5}button{font-size:1rem;padding:.6rem 1.2rem;border-radius:.4rem;border:0;background:#2563eb;color:#fff;cursor:pointer}</style></head><body><h1>${title}</h1>${body}</body></html>`;
const secret = () => `${process.env.LS_WEBHOOK_SECRET || ""}`;
const ACCOUNT = `<p><a href="https://pockethost.io/account">Go to your account</a></p>`;
const HandleLoyaltyResumePage = (e) => {
	const token = e.request.url.query().get("t");
	if (!parseResumeToken($security.hs256, secret(), token)) return e.html(400, page(`Invalid link`, `<p>This resume link isn't valid.</p>${ACCOUNT}`));
	return e.html(200, page(`Resume your subscription`, `<p>Pick up right where you left off. You keep every bonus instance and keep earning.</p><form method="post"><input type="hidden" name="t" value="${token.replace(/"/g, "&quot;")}"><button type="submit">Resume my subscription</button></form>`));
};
const HandleLoyaltyResume = (e) => {
	const log = mkLog(`loyalty-resume`);
	const audit = mkAudit(log, $app);
	let token = e.request.url.query().get("t");
	try {
		const form = e.requestInfo().body || {};
		if (form["t"]) token = `${form["t"]}`;
	} catch (_e) {}
	const subscriptionId = parseResumeToken($security.hs256, secret(), token);
	if (!subscriptionId) return e.html(400, page(`Invalid link`, `<p>This resume link isn't valid.</p>${ACCOUNT}`));
	const rec = findBillingItemRecord($app, {
		provider: `lemonsqueezy`,
		kind: `subscription`,
		external_id: subscriptionId
	});
	if (!rec) return e.html(404, page(`Not found`, `<p>We couldn't find that subscription.</p>${ACCOUNT}`));
	if (rec.getString(`status`) !== `cancelled`) {
		const ended = [`expired`, `unpaid`].includes(rec.getString(`status`));
		return e.html(200, page(ended ? `This subscription has ended` : `You're all set`, ended ? `<p>It can't be resumed anymore, but you can <a href="https://pockethost.io/pricing">subscribe again</a>.</p>` : `<p>Your subscription is already active.</p>${ACCOUNT}`));
	}
	try {
		const sub = lsRequest(`PATCH`, `/subscriptions/${encodeURIComponent(subscriptionId)}`, { data: {
			type: `subscriptions`,
			id: subscriptionId,
			attributes: { cancelled: false }
		} })?.data;
		const userId = rec.getString(`user`);
		if (sub) upsertLsSubscription($app, userId, sub);
		reconcileUser($app, $app.findRecordById(`users`, userId));
		syncLoyalty($app, userId);
		audit(`LS`, `Resumed subscription ${subscriptionId} from the loyalty email.`, {
			user: userId,
			subscriptionId
		});
		return e.html(200, page(`Welcome back!`, `<p>Your subscription is active again, and your bonus instances stay with you.</p>${ACCOUNT}`));
	} catch (err) {
		log(`resume failed`, `${err}`);
		return e.html(500, page(`Something went wrong`, `<p>We couldn't resume it automatically. Just reply to the email and we'll sort it out.</p>`));
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
	return e.json(200, { updated });
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
	const suppressBulk = (emailAddress, reason) => {
		try {
			suppress(emailAddress, reason, "ses");
		} catch (e) {
			log(`bulk mail suppression failed for ${emailAddress}: ${e}`);
		}
	};
	const processBounce = (emailAddress) => {
		log(`Processing bounce ${emailAddress}`);
		suppressBulk(emailAddress, "bounced");
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
		suppressBulk(emailAddress, "complained");
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
//#region src/lib/handlers/stripe/api/HandleBillingCheckout.ts
const SITE = `https://pockethost.io`;
const ALNUM = `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`;
/** `stripe` sends new checkouts to Stripe Managed Payments; anything else (or unset) keeps Lemon Squeezy. */
const checkoutProvider = () => `${process.env.BILLING_CHECKOUT_PROVIDER || $os.getenv(`BILLING_CHECKOUT_PROVIDER`) || ""}`.trim().toLowerCase() === `stripe` ? `stripe` : `lemonsqueezy`;
/**
* An account that still has a live Lemon Squeezy subscription keeps buying on Lemon Squeezy until Lemon Squeezy's
* migration moves it, so one account is never billed by both for recurring plans.
*/
const hasLiveLsSubscription = (userId) => {
	const now = /* @__PURE__ */ new Date();
	return loadBillingItems($app, userId).some((i) => i.provider === `lemonsqueezy` && i.kind === `subscription` && isBillingItemActive(i, now));
};
const readPvId = (e) => {
	const data = new DynamicModel({ pvId: "" });
	e.bindBody(data);
	return `${JSON.parse(JSON.stringify(data)).pvId || ""}`.trim();
};
/**
* Start a checkout. The dashboard sends the plan as its Lemon Squeezy pv_id (as before); this picks the provider. Lemon
* Squeezy: the existing handler, response `{ url, claim? }`. Stripe: a Managed Payments Checkout Session, response `{
* url, claim?, provider: 'stripe' }`, which the dashboard opens as a page (no overlay).
*/
const HandleBillingCheckout = (e) => {
	const log = mkLog(`billing-checkout`);
	const authRecord = e.auth;
	if (checkoutProvider() !== `stripe` || authRecord && hasLiveLsSubscription(authRecord.id)) return HandleLemonSqueezyCheckout(e);
	try {
		const pvId = readPvId(e);
		if (!pvId) throw new BadRequestError(`pvId is required`);
		const sku = CHECKOUT_PV_IDS.includes(pvId) ? resolveProviderSku(`lemonsqueezy`, pvId) : void 0;
		if (!isStripeCheckoutSku(sku)) throw new BadRequestError(`Unknown plan: ${pvId}`);
		const price = stripePriceForSku(sku);
		const recurring = sku !== `hosting.slot.lifetime`;
		const claim = authRecord ? `` : $security.randomStringWithAlphabet(40, ALNUM);
		const metadata = authRecord ? { user_id: authRecord.id } : { claim };
		const session = stripeRequest(`POST`, `/checkout/sessions`, {
			mode: recurring ? `subscription` : `payment`,
			managed_payments: { enabled: true },
			line_items: [{
				price: price.id,
				quantity: 1
			}],
			success_url: authRecord ? `${SITE}/dashboard?paid=1` : `${SITE}/claim`,
			cancel_url: `${SITE}/pricing`,
			client_reference_id: authRecord ? authRecord.id : void 0,
			customer_email: authRecord ? authRecord.getString(`email`) : void 0,
			metadata,
			subscription_data: recurring ? { metadata } : void 0
		});
		if (!session?.url) throw new Error(`No checkout URL in Stripe response`);
		log(`stripe checkout created`, authRecord ? authRecord.id : `guest`, sku, session.id);
		return e.json(200, authRecord ? {
			url: session.url,
			provider: `stripe`
		} : {
			url: session.url,
			claim,
			provider: `stripe`
		});
	} catch (err) {
		log(`${err}`);
		throw err;
	}
};

//#endregion
//#region src/lib/handlers/stripe/api/HandleStripeWebhook.ts
const lc = (s) => `${s ?? ""}`.trim().toLowerCase();
const idOf = (v) => typeof v === "string" ? v : v?.id ? `${v.id}` : "";
/**
* Stripe (Managed Payments) webhook. Like the Lemon Squeezy one: each event updates the billing item it is about, then
* the user's instance count is recomputed from all of their billing items. Subscriptions are always re-read from the
* Stripe API, so events arriving out of order can't roll state back.
*
* Events: `checkout.session.completed` (a new purchase: finds or creates the account), `customer.subscription.*` and
* `invoice.*` (renewals, failed payments, cancellations), `charge.refunded` (lifetime refunds).
*/
const HandleStripeWebhook = (e) => {
	const log = mkLog(`stripe`);
	const audit = mkAudit(log, $app);
	const context = {};
	try {
		const secret = process.env.STRIPE_WEBHOOK_SECRET || $os.getenv(`STRIPE_WEBHOOK_SECRET`);
		if (!secret) throw new Error(`No secret`);
		const raw = readerToString(e.request.body);
		if (!verifyStripeSignature({
			header: e.request.header.get(`Stripe-Signature`),
			raw,
			secret,
			nowSeconds: Math.floor(Date.now() / 1e3),
			hs256: (data, key) => $security.hs256(data, key),
			equal: (a, b) => $security.equal(a, b)
		})) throw new BadRequestError(`Invalid signature`);
		const event = JSON.parse(raw);
		const obj = event.data?.object || {};
		context.event_id = event.id;
		context.event_name = event.type;
		context.resource_id = idOf(obj);
		log(`event`, event.type, event.id, context.resource_id);
		/** What this event is about: a subscription to re-read, or a one-time payment. */
		const target = (() => {
			switch (event.type) {
				case `checkout.session.completed`:
				case `checkout.session.async_payment_succeeded`:
					if (obj.payment_status !== `paid` && obj.payment_status !== `no_payment_required`) return void 0;
					return obj.mode === `subscription` ? {
						subscriptionId: idOf(obj.subscription),
						session: obj
					} : { session: obj };
				case `customer.subscription.created`:
				case `customer.subscription.updated`:
				case `customer.subscription.deleted`:
				case `customer.subscription.paused`:
				case `customer.subscription.resumed`: return { subscriptionId: obj.id };
				case `invoice.paid`:
				case `invoice.payment_failed`: {
					const subscriptionId = invoiceSubscriptionId(obj);
					return subscriptionId ? { subscriptionId } : void 0;
				}
				case `charge.refunded`: return obj.payment_intent ? { refundCharge: obj } : void 0;
				default: return;
			}
		})();
		if (!target) {
			audit(`STRIPE`, `Ignored ${event.type}.`, context);
			return e.json(200, { status: `ignored` });
		}
		let item;
		let providerData;
		if (target.subscriptionId) {
			const sub = stripeSubscription(target.subscriptionId);
			item = billingItemFromStripeSubscription(sub);
			if (!item) {
				audit(`STRIPE`, `Ignored ${event.type}: subscription ${sub.id} has no SKU price.`, context);
				return e.json(200, { status: `ignored` });
			}
			providerData = sub;
		} else if (target.session) {
			const paymentIntentId = idOf(target.session.payment_intent);
			if (!paymentIntentId) throw new Error(`Checkout ${target.session.id} has no payment intent`);
			item = billingItemFromStripePayment({
				paymentIntentId,
				created: target.session.created,
				lineItems: stripeCheckoutLineItems(target.session.id)
			});
			if (!item) throw new Error(`No lifetime price on checkout ${target.session.id}`);
			providerData = {
				checkout_session: target.session.id,
				payment_intent: paymentIntentId,
				created: target.session.created
			};
		} else if (target.refundCharge) {
			const known = findBillingItemRecord($app, {
				provider: `stripe`,
				kind: `order`,
				external_id: idOf(target.refundCharge.payment_intent)
			});
			if (!known) {
				audit(`STRIPE`, `Refund on a non-lifetime charge ${target.refundCharge.id}; nothing to update.`, context);
				return e.json(200, { status: `ignored` });
			}
			try {
				providerData = {
					...JSON.parse(known.getString(`provider_data`) || `{}`),
					refund_charge: target.refundCharge.id
				};
			} catch {}
			item = {
				provider: `stripe`,
				kind: `order`,
				external_id: known.getString(`external_id`),
				sku: known.getString(`sku`),
				quantity: known.getInt(`quantity`),
				status: stripeRefundStatus(target.refundCharge),
				variant_id: known.getString(`variant_id`),
				product_name: known.getString(`product_name`),
				variant_name: known.getString(`variant_name`)
			};
		}
		if (!item) throw new Error(`Nothing to apply for ${event.type}`);
		context.product_name = item.product_name;
		context.variant_name = item.variant_name;
		context.quantity = item.quantity;
		const session = target.session;
		const metadata = session?.metadata || providerData?.metadata || {};
		const userRec = (() => {
			const known = findBillingItemRecord($app, item);
			if (known) {
				context.user_id_source = `billing_item`;
				return $app.findRecordById(`users`, known.getString(`user`));
			}
			if (metadata.user_id) {
				context.user_id_source = `metadata`;
				try {
					return $app.findRecordById(`users`, metadata.user_id);
				} catch {
					throw new Error(`User ${metadata.user_id} not found`);
				}
			}
			if (!session) return void 0;
			const email = `${session.customer_details?.email || session.customer_email || ""}`.trim();
			if (!email) throw new Error(`No user ID or checkout email on ${session.id}`);
			for (const candidate of [...new Set([email, lc(email)])]) try {
				const match = $app.findFirstRecordByData(`users`, `email`, candidate);
				context.user_id_source = `email`;
				return match;
			} catch {}
			if (!metadata.claim) throw new Error(`No PocketHost user for checkout email ${email}`);
			const { user, created } = createBuyerAccount($app, email, metadata.claim, log);
			context.user_id_source = created ? `create` : `email`;
			context.account_created = created;
			return user;
		})();
		if (!userRec) {
			audit(`STRIPE`, `Skipped ${event.type}: ${context.resource_id} not tied to an account yet.`, context);
			return e.json(200, { status: `ignored` });
		}
		context.user_id = userRec.id;
		context.user_email = userRec.getString(`email`);
		context.guest_checkout = !!metadata.claim;
		ensureUserBootstrapped($app, userRec);
		upsertBillingItem($app, userRec.id, item, { providerData });
		const { before, after } = reconcileUser($app, userRec);
		context.slots_before = before;
		context.slots_after = after;
		let loyalty;
		try {
			loyalty = syncLoyalty($app, userRec.id);
			context.bonus_before = loyalty.before;
			context.bonus_after = loyalty.bonus;
		} catch (err) {
			context.bonus_error = `${err}`;
			log(`loyalty sync failed`, `${err}`);
		}
		const isNewPurchase = !!session;
		const billingEmail = `${session?.customer_details?.email || ""}`.trim();
		if (isNewPurchase) try {
			if (context.account_created && billingEmail) sendClaimEmail($app, userRec, billingEmail, log);
			else if (metadata.claim && context.user_id_source === `email` && billingEmail) {
				if (userRec.getString(`claim_hash`) !== $security.sha256(`${metadata.claim}`)) {
					rememberBrowserClaim($app, userRec, metadata.claim);
					if (!userRec.getBool(`claim_open`)) sendPurchaseAddedEmail($app, userRec, billingEmail, log);
				}
			}
		} catch (err) {
			log(`claim email failed`, `${err}`);
		}
		const notify = mkNotifier(log, $app);
		try {
			if (isNewPurchase) notify(`lemonbot`, `lemon_order_discord`, userRec.id, context);
			else if (event.type === `customer.subscription.updated` && item.status === `cancelled`) notify(`lemonbot`, `lemon_cancel_discord`, userRec.id, context);
			else if (event.type === `charge.refunded`) notify(`lemonbot`, `lemon_refund_discord`, userRec.id, context);
		} catch (err) {
			log(`discord notice failed`, `${err}`);
		}
		const sendLoyaltyEmail = (email) => {
			if (!email) return;
			try {
				const tpl = $app.findFirstRecordByData(`message_templates`, `slug`, email.template);
				if (!$app.findRecordsByFilter(`notifications`, `user = {:user} && message_template = {:tpl} && payload ~ {:ref}`, ``, 1, 0, {
					user: userRec.id,
					tpl: tpl.id,
					ref: `"loyalty_ref":"${email.ref}"`
				}).length) notify(`email`, email.template, userRec.id, {
					...email.vars,
					loyalty_ref: email.ref
				});
			} catch (err) {
				log(`${email.template} email failed`, `${err}`);
			}
		};
		if (loyalty && isNewPurchase) sendLoyaltyEmail(loyaltyPurchaseEmail(loyalty, item.sku, `stripe:${item.kind}:${item.external_id}`));
		const bonusMsg = context.bonus_before !== void 0 && context.bonus_before !== context.bonus_after ? ` Loyalty bonus ${context.bonus_before} → ${context.bonus_after}.` : context.bonus_error ? ` Loyalty sync failed.` : ``;
		audit(`STRIPE`, `${event.type}: slots ${before} → ${after}.${bonusMsg}`, context);
		return e.json(200, { status: `ok` });
	} catch (err) {
		audit(`STRIPE_ERR`, `${err}`, context);
		return e.json(500, {
			status: `error`,
			error: `${err}`
		});
	}
};

//#endregion
//#region src/lib/handlers/user/model/bonusInstances.ts
const log$1 = mkLog(`bonus-instances`);
/** Recomputes `users.bonus_instances` from the user's `bonus_grants` (sum, floored at 0). */
const recomputeBonusInstances = (uid) => {
	if (!uid) return;
	const row = new DynamicModel({ total: 0 });
	$app.db().newQuery(`SELECT COALESCE(SUM(amount), 0) AS total FROM bonus_grants WHERE user = {:uid}`).bind({ uid }).one(row);
	const total = Math.max(0, Math.floor(Number(row.total) || 0));
	let user;
	try {
		user = $app.findRecordById("users", uid);
	} catch {
		return;
	}
	if (user.getInt("bonus_instances") === total) return;
	user.set("bonus_instances", total);
	$app.save(user);
	log$1(`${uid}: bonus_instances = ${total}`);
};
/** After a grant is created, updated or deleted: recompute its user (and the previous user if it moved). */
const AfterChange_bonusGrant = (e) => {
	const uid = e.record?.getString("user") ?? "";
	recomputeBonusInstances(uid);
	const before = e.record?.original()?.getString("user") ?? "";
	if (before && before !== uid) recomputeBonusInstances(before);
};
/**
* Only superusers (and the grants hook) change bonus_instances. Production's users collection has no update rule, so
* customers can't update their record at all; this guard keeps it that way even if that rule ever opens up.
*/
const BeforeUpdateRequest_guardBonusInstances = (e) => {
	if (e.hasSuperuserAuth() || !e.record) return;
	const stored = $app.findRecordById("users", e.record.id).getInt("bonus_instances");
	if (e.record.getInt("bonus_instances") !== stored) e.record.set("bonus_instances", stored);
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
	log(`bindBody: content-type=${e.request.header.get(`Content-Type`) || `(none)`}`);
	let data = new DynamicModel({ trusted_ips: [] });
	try {
		e.bindBody(data);
	} catch (error) {
		throw new BadRequestError(`Could not read trusted_ips from the request: ${clientErrorMessage(error)}`);
	}
	data = JSON.parse(JSON.stringify(data));
	log(`bindBody: trusted_ips=${describeValue(data.trusted_ips)}`);
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
exports.AfterChange_bonusGrant = AfterChange_bonusGrant;
exports.AfterCreate_notify_discord = AfterCreate_notify_discord;
exports.BM_CAMPAIGNS = BM_CAMPAIGNS;
exports.BM_SENDS = BM_SENDS;
exports.BM_SUPPRESSIONS = BM_SUPPRESSIONS;
exports.BeforeCreate_autoVacuum = BeforeCreate_autoVacuum;
exports.BeforeCreate_ssh_keys = BeforeCreate_ssh_keys;
exports.BeforeCreate_version = BeforeCreate_version;
exports.BeforeUpdateRequest_edge = BeforeUpdateRequest_edge;
exports.BeforeUpdateRequest_guardBonusInstances = BeforeUpdateRequest_guardBonusInstances;
exports.BeforeUpdate_cname = BeforeUpdate_cname;
exports.BeforeUpdate_ssh_keys = BeforeUpdate_ssh_keys;
exports.BeforeUpdate_version = BeforeUpdate_version;
exports.HandleArchiveDownload = HandleArchiveDownload;
exports.HandleBackupDownload = HandleBackupDownload;
exports.HandleBillingCheckout = HandleBillingCheckout;
exports.HandleBulkMailCampaignAction = HandleBulkMailCampaignAction;
exports.HandleBulkMailCampaignUpdateRequest = HandleBulkMailCampaignUpdateRequest;
exports.HandleBulkMailCount = HandleBulkMailCount;
exports.HandleBulkMailGetSettings = HandleBulkMailGetSettings;
exports.HandleBulkMailSaveSettings = HandleBulkMailSaveSettings;
exports.HandleBulkMailUnsubscribe = HandleBulkMailUnsubscribe;
exports.HandleBulkMailUnsubscribePage = HandleBulkMailUnsubscribePage;
exports.HandleBulkMailWebhook = HandleBulkMailWebhook;
exports.HandleClaimAttach = HandleClaimAttach;
exports.HandleClaimComplete = HandleClaimComplete;
exports.HandleClaimStatus = HandleClaimStatus;
exports.HandleCustomHostnameRegister = HandleCustomHostnameRegister;
exports.HandleCustomHostnamesSweep = HandleCustomHostnamesSweep;
exports.HandleEdgeHeartbeat = HandleEdgeHeartbeat;
exports.HandleInstanceCreate = HandleInstanceCreate;
exports.HandleInstanceDelete = HandleInstanceDelete;
exports.HandleInstanceDuplicate = HandleInstanceDuplicate;
exports.HandleInstanceUpdate = HandleInstanceUpdate;
exports.HandleInstancesResetIdle = HandleInstancesResetIdle;
exports.HandleInstancesRuntimeReset = HandleInstancesRuntimeReset;
exports.HandleLemonSqueezyCancel = HandleLemonSqueezyCancel;
exports.HandleLemonSqueezyCheckout = HandleLemonSqueezyCheckout;
exports.HandleLemonSqueezyReconcile = HandleLemonSqueezyReconcile;
exports.HandleLemonSqueezySale = HandleLemonSqueezySale;
exports.HandleLivePlatformRefresh = HandleLivePlatformRefresh;
exports.HandleLoyaltyBackfill = HandleLoyaltyBackfill;
exports.HandleLoyaltyResume = HandleLoyaltyResume;
exports.HandleLoyaltyResumePage = HandleLoyaltyResumePage;
exports.HandleMailSend = HandleMailSend;
exports.HandleMetaUpdateAtBoot = HandleMetaUpdateAtBoot;
exports.HandleMigrateCnamesToDomains = HandleMigrateCnamesToDomains;
exports.HandleMigrateInstanceVersions = HandleMigrateInstanceVersions;
exports.HandleMirrorSync = HandleMirrorSync;
exports.HandleOutpostUnsubscribe = HandleOutpostUnsubscribe;
exports.HandleProcessNotification = HandleProcessNotification;
exports.HandleProcessSingleNotification = HandleProcessSingleNotification;
exports.HandleSesError = HandleSesError;
exports.HandleSignupCheck = HandleSignupCheck;
exports.HandleSignupConfirm = HandleSignupConfirm;
exports.HandleStatsRefreshAtBoot = HandleStatsRefreshAtBoot;
exports.HandleStatsRequest = HandleStatsRequest;
exports.HandleStripeWebhook = HandleStripeWebhook;
exports.HandleUserTrustedIpsGet = HandleUserTrustedIpsGet;
exports.HandleUserTrustedIpsUpdate = HandleUserTrustedIpsUpdate;
exports.HandleUserWelcomeMessage = HandleUserWelcomeMessage;
exports.HandleVersionsRequest = HandleVersionsRequest;
exports.LIVE_PLATFORM_TOPIC = LIVE_PLATFORM_TOPIC;
exports.LIVE_VIEW_STATS_TOPIC = LIVE_VIEW_STATS_TOPIC;
exports.broadcastLivePlatformStats = broadcastLivePlatformStats;
exports.broadcastLiveViewStats = broadcastLiveViewStats;
exports.buildMessage = buildMessage;
exports.bulkMailLimits = bulkMailLimits;
exports.cancelCampaign = cancelCampaign;
exports.convertLegacyTemplate = convertLegacyTemplate;
exports.countAudience = countAudience;
exports.cronSweepCustomHostnames = cronSweepCustomHostnames;
exports.getLivePlatformStats = getLivePlatformStats;
exports.getLiveViewStats = getLiveViewStats;
exports.getSettings = getSettings;
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
exports.isSuppressed = isSuppressed;
exports.markStaleEdges = markStaleEdges;
exports.mkPublicStatsPath = mkPublicStatsPath;
exports.normalizeInstanceStatus = normalizeInstanceStatus;
exports.parseAudience = parseAudience;
exports.parseToken = parseToken;
exports.pauseCampaign = pauseCampaign;
exports.previewCampaign = previewCampaign;
exports.readTrustedIpsFromRecord = readTrustedIpsFromRecord;
exports.reasonToDelete = reasonToDelete;
exports.recomputeBonusInstances = recomputeBonusInstances;
exports.recountLivePlatformStats = recountLivePlatformStats;
exports.refreshAndBroadcastLivePlatformStats = refreshAndBroadcastLivePlatformStats;
exports.refreshAndBroadcastLiveViewStats = refreshAndBroadcastLiveViewStats;
exports.refreshCounters = refreshCounters;
exports.refreshLiveViewStats = refreshLiveViewStats;
exports.refreshPublicStats = refreshPublicStats;
exports.resumeCampaign = resumeCampaign;
exports.runBulkMailSender = runBulkMailSender;
exports.saveSettings = saveSettings;
exports.sendLivePlatformStatsToClient = sendLivePlatformStatsToClient;
exports.sendLiveViewStatsToClient = sendLiveViewStatsToClient;
exports.senderStep = senderStep;
exports.startCampaign = startCampaign;
exports.suppress = suppress;
exports.sweepCustomHostnames = sweepCustomHostnames;
exports.syncSuppressionToUser = syncSuppressionToUser;
exports.syncUserToSuppressions = syncUserToSuppressions;
exports.testCampaign = testCampaign;
exports.unsubscribeUrl = unsubscribeUrl;