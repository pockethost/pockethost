import { c as create_ssr_component, b as subscribe, o as onDestroy, v as validate_component, e as escape } from "../../../../../chunks/ssr.js";
import { p as page } from "../../../../../chunks/stores.js";
import { A as AuthStateGuard } from "../../../../../chunks/AuthStateGuard.js";
import { a as PUBLIC_APP_DOMAIN } from "../../../../../chunks/env.js";
import { c as createCleanupManager, i as instance } from "../../../../../chunks/store.js";
import "chalk";
import "bottleneck";
import "ajv";
import "pocketbase";
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  let $instance, $$unsubscribe_instance;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  $$unsubscribe_instance = subscribe(instance, (value) => $instance = value);
  $page.params;
  const cm = createCleanupManager();
  onDestroy(() => cm.shutdown());
  $$unsubscribe_page();
  $$unsubscribe_instance();
  return `${validate_component(AuthStateGuard, "AuthStateGuard").$$render($$result, {}, {}, {
    default: () => {
      return `<div class="container">${$instance ? `<h2>${escape($instance.subdomain)} <a href="${"https://" + escape($instance.subdomain, true) + "." + escape(PUBLIC_APP_DOMAIN, true) + "/_"}" target="_blank" rel="noreferrer"><i class="bi bi-box-arrow-up-right"></i></a></h2> ${slots.default ? slots.default({}) : ``} <div class="text-center py-5" data-svelte-h="svelte-itr8rx"><a href="/dashboard" class="btn btn-light"><i class="bi bi-arrow-left-short"></i> Back to Dashboard</a></div>` : ``}</div>`;
    }
  })}`;
});
export {
  Layout as default
};
