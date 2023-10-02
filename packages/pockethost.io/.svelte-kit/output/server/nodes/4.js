

export const index = 4;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/app/instances/_instanceId_/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/4.484f6f82.js","_app/immutable/chunks/scheduler.f7157b54.js","_app/immutable/chunks/index.0c0c8d6a.js","_app/immutable/chunks/index.1926c527.js","_app/immutable/chunks/store.bdda0320.js","_app/immutable/chunks/index.99927711.js","_app/immutable/chunks/ProvisioningStatus.3d118cfd.js"];
export const stylesheets = ["_app/immutable/assets/4.2f3aca23.css","_app/immutable/assets/ProvisioningStatus.c1294ebf.css"];
export const fonts = [];
