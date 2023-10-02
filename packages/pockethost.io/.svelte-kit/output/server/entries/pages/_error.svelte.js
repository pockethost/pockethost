import { c as create_ssr_component, b as subscribe, e as escape } from "../../chunks/ssr.js";
import { p as page } from "../../chunks/stores.js";
const _error_svelte_svelte_type_style_lang = "";
const css = {
  code: ".gif.svelte-14rxcuv{max-width:600px;margin:0 auto}",
  map: null
};
const Error = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  $$result.css.add(css);
  $$unsubscribe_page();
  return `${$$result.head += `<!-- HEAD_svelte-9h4p1d_START -->${$$result.title = `<title>${escape($page.status)} - PocketHost</title>`, ""}<!-- HEAD_svelte-9h4p1d_END -->`, ""} <div class="container text-center py-4"><h1 class="mb-5">${escape($page.status)}: ${escape($page.error?.message)}</h1> <div class="gif mb-5 svelte-14rxcuv" data-svelte-h="svelte-6yek0n"><img src="https://media4.giphy.com/media/V9sdMLcmIFqqk/giphy.gif?cid=790b76118f409453704f5eaabaea1a3dc7380a9daf4fca63&rid=giphy.gif&ct=g" alt="Scene from a movie talking about something is missing" class="img-fluid w-100"></div> <a href="/" class="btn btn-light" data-svelte-h="svelte-zgi2ve"><i class="bi bi-arrow-left-short"></i> Back to Home</a> </div>`;
});
export {
  Error as default
};
