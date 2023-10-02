import { c as create_ssr_component, a as add_attribute } from "../../../../chunks/ssr.js";
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
  let email = "";
  let isFormButtonDisabled = true;
  $$result.css.add(css);
  isFormButtonDisabled = email.length === 0;
  return `${$$result.head += `<!-- HEAD_svelte-1hrw9hq_START -->${$$result.title = `<title>Password Reset - PocketHost</title>`, ""}<!-- HEAD_svelte-1hrw9hq_END -->`, ""} <div class="page-bg svelte-1xtwgc3"><div class="card svelte-1xtwgc3">${`<h2 class="mb-4" data-svelte-h="svelte-1r8eaix">Password Reset</h2> <form><div class="form-floating mb-3"><input type="email" class="form-control" id="email" placeholder="name@example.com" required autocomplete="email"${add_attribute("value", email, 0)}> <label for="email" data-svelte-h="svelte-1tjr146">Email address</label></div> ${``} <button type="submit" class="btn btn-primary w-100" ${isFormButtonDisabled ? "disabled" : ""}>Send Verification Email <i class="bi bi-arrow-right-short"></i></button></form>`} <div class="py-4" data-svelte-h="svelte-18ir1wq"><hr></div> <div class="text-center" data-svelte-h="svelte-g57wcc">Need to <a href="/signup">create an account</a>?</div></div> </div>`;
});
export {
  Page as default
};
