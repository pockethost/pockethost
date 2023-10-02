

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.c40c2e1e.js","_app/immutable/chunks/scheduler.f7157b54.js","_app/immutable/chunks/index.0c0c8d6a.js","_app/immutable/chunks/stores.7cf961d7.js","_app/immutable/chunks/singletons.cf10a44f.js","_app/immutable/chunks/index.99927711.js"];
export const stylesheets = ["_app/immutable/assets/1.ec9328af.css"];
export const fonts = [];
