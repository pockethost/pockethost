

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/login/confirm-account/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/8.18f47d71.js","_app/immutable/chunks/scheduler.f7157b54.js","_app/immutable/chunks/index.0c0c8d6a.js","_app/immutable/chunks/stores.7cf961d7.js","_app/immutable/chunks/singletons.cf10a44f.js","_app/immutable/chunks/index.99927711.js","_app/immutable/chunks/AlertBar.d1fe7d26.js","_app/immutable/chunks/index.1926c527.js"];
export const stylesheets = ["_app/immutable/assets/8.f7646cf1.css"];
export const fonts = [];
