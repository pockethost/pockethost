import { c as create_ssr_component, b as subscribe, o as onDestroy, v as validate_component, p as each, e as escape, a as add_attribute } from "../../../chunks/ssr.js";
import { A as AuthStateGuard } from "../../../chunks/AuthStateGuard.js";
import { P as ProvisioningStatus } from "../../../chunks/ProvisioningStatus.js";
import { R as RetroBoxContainer } from "../../../chunks/RetroBoxContainer.js";
import { l as logger, a as PUBLIC_APP_DOMAIN } from "../../../chunks/env.js";
import { values } from "@s-libs/micro-dash";
import "bottleneck";
import "ajv";
import "pocketbase";
import "chalk";
import { w as writable } from "../../../chunks/index.js";
const _page_svelte_svelte_type_style_lang = "";
const css = {
  code: ".first-app-screen.svelte-1jlvfgo.svelte-1jlvfgo{text-align:center;display:flex;align-items:center;justify-content:center;padding:85px 0}.card.svelte-1jlvfgo.svelte-1jlvfgo{border:0;padding:42px 24px 24px 24px;box-shadow:var(--soft-box-shadow)}.server-status.svelte-1jlvfgo.svelte-1jlvfgo{position:absolute;top:8px;right:16px;width:calc(100% - 32px)}.server-status-minutes.svelte-1jlvfgo.svelte-1jlvfgo{font-size:13px}.pocketbase-button.svelte-1jlvfgo img.svelte-1jlvfgo{max-width:25px}@media screen and (min-width: 768px){.first-app-screen.svelte-1jlvfgo.svelte-1jlvfgo{min-height:70vh}}",
  map: null
};
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let isFirstApplication;
  let $instancesStore, $$unsubscribe_instancesStore;
  logger();
  const instancesStore = writable({});
  $$unsubscribe_instancesStore = subscribe(instancesStore, (value) => $instancesStore = value);
  onDestroy(() => {
  });
  $$result.css.add(css);
  isFirstApplication = values($instancesStore).length === 0;
  $$unsubscribe_instancesStore();
  return `${$$result.head += `<!-- HEAD_svelte-1dvcujy_START -->${$$result.title = `<title>Dashboard - PocketHost</title>`, ""}<!-- HEAD_svelte-1dvcujy_END -->`, ""} ${validate_component(AuthStateGuard, "AuthStateGuard").$$render($$result, {}, {}, {
    default: () => {
      return `<div class="container">${!isFirstApplication ? `<div class="py-4" data-svelte-h="svelte-mc6swp"><h1 class="text-center">Your Apps</h1></div> <div class="row justify-content-center">${each(values($instancesStore), (app) => {
        return `<div class="col-xl-4 col-md-6 col-12 mb-5"><div class="card svelte-1jlvfgo"><div class="server-status d-flex align-items-center justify-content-between svelte-1jlvfgo"><div class="server-status-minutes svelte-1jlvfgo">Usage: ${escape(Math.ceil(app.secondsThisMonth / 60))} mins
                  ${app.maintenance ? `<span class="text-warning" data-svelte-h="svelte-xqa21h">Maintenance Mode</span>` : ``}</div> <div class="d-flex align-items-center gap-3 server-status-minutes svelte-1jlvfgo">${escape(app.version)} ${validate_component(ProvisioningStatus, "ProvisioningStatus").$$render($$result, { status: app.status }, {}, {})} </div></div> <h2 class="mb-4 font-monospace">${escape(app.subdomain)}</h2> <div class="d-flex justify-content-around"><a${add_attribute("href", `/app/instances/${app.id}`, 0)} class="btn btn-light"><i class="bi bi-gear-fill"></i> <span data-svelte-h="svelte-17ve4f4">Details</span></a> <a class="btn btn-light pocketbase-button svelte-1jlvfgo"${add_attribute("href", `https://${app.subdomain}.${PUBLIC_APP_DOMAIN}/_`, 0)} target="_blank"><img src="/images/pocketbase-logo.svg" alt="PocketBase Logo" class="img-fluid svelte-1jlvfgo"> <span data-svelte-h="svelte-bk0mpz">Admin</span></a> </div></div> </div>`;
      })}</div>` : ``} <div class="first-app-screen svelte-1jlvfgo">${validate_component(RetroBoxContainer, "RetroBoxContainer").$$render($$result, { minHeight: isFirstApplication ? 500 : 0 }, {}, {
        default: () => {
          return `<div class="px-lg-5"><h2 class="mb-4">Create Your ${escape(isFirstApplication ? "First" : "Next")} App</h2> <a href="/app/new" class="btn btn-primary btn-lg" data-svelte-h="svelte-aqt6rg"><i class="bi bi-plus"></i> New App</a></div>`;
        }
      })}</div></div>`;
    }
  })}`;
});
export {
  Page as default
};
