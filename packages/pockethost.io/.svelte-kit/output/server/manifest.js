export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png","global.css","icons/icon-192x192.png","icons/icon-256x256.png","icons/icon-384x384.png","icons/icon-512x512.png","images/logo-square.png","images/pocketbase-intro-screen.jpg","images/pocketbase-logo.svg","manifest.json","poster.png"]),
	mimeTypes: {".png":"image/png",".css":"text/css",".jpg":"image/jpeg",".svg":"image/svg+xml",".json":"application/json"},
	_: {
		client: {"start":"_app/immutable/entry/start.d4be6e70.js","app":"_app/immutable/entry/app.05b5b276.js","imports":["_app/immutable/entry/start.d4be6e70.js","_app/immutable/chunks/scheduler.f7157b54.js","_app/immutable/chunks/singletons.cf10a44f.js","_app/immutable/chunks/index.99927711.js","_app/immutable/entry/app.05b5b276.js","_app/immutable/chunks/scheduler.f7157b54.js","_app/immutable/chunks/index.0c0c8d6a.js"],"stylesheets":[],"fonts":[]},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js')),
			__memo(() => import('./nodes/9.js')),
			__memo(() => import('./nodes/10.js')),
			__memo(() => import('./nodes/11.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/app/instances/[instanceId]",
				pattern: /^\/app\/instances\/([^/]+?)\/?$/,
				params: [{"name":"instanceId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/app/new",
				pattern: /^\/app\/new\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/dashboard",
				pattern: /^\/dashboard\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/login/confirm-account",
				pattern: /^\/login\/confirm-account\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/login/password-reset",
				pattern: /^\/login\/password-reset\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/login/password-reset/confirm",
				pattern: /^\/login\/password-reset\/confirm\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/signup",
				pattern: /^\/signup\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 11 },
				endpoint: null
			}
		],
		matchers: async () => {
			
			return {  };
		}
	}
}
})();
