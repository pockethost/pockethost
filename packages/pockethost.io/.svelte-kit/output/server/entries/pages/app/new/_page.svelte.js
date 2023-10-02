import { c as create_ssr_component, a as add_attribute, e as escape } from "../../../../chunks/ssr.js";
import { a as PUBLIC_APP_DOMAIN } from "../../../../chunks/env.js";
import "chalk";
import "bottleneck";
import "ajv";
import "pocketbase";
import { generateSlug } from "random-word-slugs";
const _page_svelte_svelte_type_style_lang = "";
const css = {
  code: ".container.svelte-1cgl37g{max-width:600px;min-height:70vh;display:flex;align-items:center;justify-content:center;flex-direction:column}.regenerate-instance-name-btn.svelte-1cgl37g{padding:0;width:34px;height:34px;position:absolute;z-index:500;top:2px;right:6px;transition:all 200ms}",
  map: null
};
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let instanceName = generateSlug(2);
  let rotationCounter = 0;
  let isFormButtonDisabled = true;
  let isSubmitting = false;
  $$result.css.add(css);
  isFormButtonDisabled = instanceName.length === 0 || isSubmitting;
  return `${$$result.head += `<!-- HEAD_svelte-yenslj_START -->${$$result.title = `<title>New Instance - PocketHost</title>`, ""}<!-- HEAD_svelte-yenslj_END -->`, ""} <div class="container svelte-1cgl37g"><div class="py-4" data-svelte-h="svelte-1ffi8mj"><h1 class="text-center">Choose a name for your PocketBase app.</h1></div> <div class="row g-3 align-items-center justify-content-center mb-4"><div class="col-auto" data-svelte-h="svelte-1nd1gz2"><label for="instance-name" class="col-form-label">Instance Name:</label></div> <div class="col-auto pe-1 position-relative"><input type="text" id="instance-name" class="form-control"${add_attribute("value", instanceName, 0)}> <button aria-label="Regenerate Instance Name" type="button" style="${"transform: rotate(" + escape(rotationCounter, true) + "deg);"}" class="btn btn-light rounded-circle regenerate-instance-name-btn svelte-1cgl37g"><i class="bi bi-arrow-repeat"></i></button></div> <div class="col-auto ps-0"><span class="form-text">.${escape(PUBLIC_APP_DOMAIN)}</span></div></div> ${``} <div class="text-center"><a href="/dashboard" class="btn btn-light" ${isFormButtonDisabled ? "disabled" : ""}>Cancel</a> <button class="btn btn-primary" ${isFormButtonDisabled ? "disabled" : ""}>Create <i class="bi bi-arrow-right-short"></i></button></div> </div>`;
});
export {
  Page as default
};
