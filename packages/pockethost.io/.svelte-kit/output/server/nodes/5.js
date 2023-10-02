

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/app/new/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/5.85e2e152.js","_app/immutable/chunks/scheduler.f7157b54.js","_app/immutable/chunks/index.0c0c8d6a.js","_app/immutable/chunks/AlertBar.d1fe7d26.js","_app/immutable/chunks/singletons.cf10a44f.js","_app/immutable/chunks/index.99927711.js","_app/immutable/chunks/index.1926c527.js","_app/immutable/chunks/index.14d8352b.js"];
export const stylesheets = ["_app/immutable/assets/5.f1b71263.css"];
export const fonts = [];
