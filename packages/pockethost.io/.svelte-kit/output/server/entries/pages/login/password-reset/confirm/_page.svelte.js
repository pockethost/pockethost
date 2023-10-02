import { c as create_ssr_component, b as subscribe, a as add_attribute } from "../../../../../chunks/ssr.js";
import { p as page } from "../../../../../chunks/stores.js";
import "../../../../../chunks/env.js";
import "chalk";
import "bottleneck";
import "ajv";
import "pocketbase";
const _page_svelte_svelte_type_style_lang = "";
const css = {
  code: ".page-bg.svelte-1xtwgc3{background-color:#222;background-image:var(--gradient-light-soft-blue-vertical);display:flex;align-items:center;justify-content:center;height:calc(100vh - 91px);padding:0 18px}.card.svelte-1xtwgc3{border:0;box-shadow:var(--soft-box-shadow);padding:24px;max-width:425px;width:100%;border-radius:24px}@media screen and (min-width: 768px){.card.svelte-1xtwgc3{padding:48px}}",
  map: null
};
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  let password = "";
  let isFormButtonDisabled = true;
  $$result.css.add(css);
  $page?.url?.searchParams?.get("token");
  isFormButtonDisabled = password.length === 0;
  $$unsubscribe_page();
  return `${$$result.head += `<!-- HEAD_svelte-1at4xjh_START -->${$$result.title = `<title>Reset Your Password - PocketHost</title>`, ""}<!-- HEAD_svelte-1at4xjh_END -->`, ""} <div class="page-bg svelte-1xtwgc3"><div class="card svelte-1xtwgc3"><h2 class="mb-4" data-svelte-h="svelte-jq8iyi">New Password</h2> <form><div class="form-floating mb-3"><input type="password" class="form-control" id="password" placeholder="Password" required autocomplete="password"${add_attribute("value", password, 0)}> <label for="password" data-svelte-h="svelte-1fqrm48">New Password</label></div> ${``} <button type="submit" class="btn btn-primary w-100" ${isFormButtonDisabled ? "disabled" : ""}>Save <i class="bi bi-arrow-right-short"></i></button></form></div> </div>`;
});
export {
  Page as default
};
