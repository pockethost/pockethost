import { c as create_ssr_component, b as subscribe } from "../../../../chunks/ssr.js";
import { p as page } from "../../../../chunks/stores.js";
import "../../../../chunks/env.js";
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
  let $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => value);
  $$result.css.add(css);
  $$unsubscribe_page();
  return `${$$result.head += `<!-- HEAD_svelte-1vfovme_START -->${$$result.title = `<title>Confirming Your Account - PocketHost</title>`, ""}<!-- HEAD_svelte-1vfovme_END -->`, ""} <div class="page-bg svelte-1xtwgc3"><div class="card text-center svelte-1xtwgc3"><h2 class="mb-4" data-svelte-h="svelte-7s58jf">Confirming Your Account</h2> ${`<div class="spinner-border mx-auto" role="status" data-svelte-h="svelte-1cgfukx"><span class="visually-hidden">Loading...</span></div>`}</div> </div>`;
});
export {
  Page as default
};
