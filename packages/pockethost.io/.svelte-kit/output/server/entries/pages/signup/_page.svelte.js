import { c as create_ssr_component, a as add_attribute } from "../../../chunks/ssr.js";
import "../../../chunks/env.js";
import "chalk";
import "bottleneck";
import "ajv";
import "pocketbase";
const _page_svelte_svelte_type_style_lang = "";
const css = {
  code: ".page-bg.svelte-bu058q{background-color:#222;background-image:var(--gradient-dark-soft-blue);display:flex;align-items:center;justify-content:center;height:calc(100vh - 91px);padding:0 18px}.card.svelte-bu058q{border:0;box-shadow:var(--soft-box-shadow);padding:24px;max-width:425px;width:100%;border-radius:24px}@media screen and (min-width: 768px){.card.svelte-bu058q{padding:48px}}",
  map: null
};
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let email = "";
  let password = "";
  let isFormButtonDisabled = true;
  $$result.css.add(css);
  isFormButtonDisabled = email.length === 0 || password.length === 0;
  return `${$$result.head += `<!-- HEAD_svelte-dngslo_START -->${$$result.title = `<title>Sign Up - PocketHost</title>`, ""}<!-- HEAD_svelte-dngslo_END -->`, ""} <div class="page-bg svelte-bu058q"><div class="card svelte-bu058q"><h2 class="mb-4" data-svelte-h="svelte-b6jay5">Sign Up</h2> <form><div class="form-floating mb-3"><input type="email" class="form-control" id="email" placeholder="name@example.com" required autocomplete="email"${add_attribute("value", email, 0)}> <label for="email" data-svelte-h="svelte-1tjr146">Email address</label></div> <div class="form-floating mb-3"><input type="password" class="form-control" id="password" placeholder="Password" required autocomplete="new-password"${add_attribute("value", password, 0)}> <label for="password" data-svelte-h="svelte-pepa0a">Password</label></div> ${``} <button type="submit" class="btn btn-primary w-100" ${isFormButtonDisabled ? "disabled" : ""}>Sign Up <i class="bi bi-arrow-right-short"></i></button></form> <div class="py-4" data-svelte-h="svelte-18ir1wq"><hr></div> <div class="text-center" data-svelte-h="svelte-hzesah">Already have an account? <a href="/login">Log in</a></div></div> </div>`;
});
export {
  Page as default
};
