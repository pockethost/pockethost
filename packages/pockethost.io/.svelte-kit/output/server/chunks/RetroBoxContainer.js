import { c as create_ssr_component, a as add_attribute } from "./ssr.js";
const RetroBoxContainer_svelte_svelte_type_style_lang = "";
const css = {
  code: ".homepage-hero-animation.svelte-1wsiig7{box-shadow:var(--bs-primary) 0 0 0 3px inset, var(--bs-body-bg) 10px -10px 0px -3px,\n      var(--bs-success) 10px -10px, var(--bs-body-bg) 20px -20px 0px -3px,\n      var(--bs-warning) 20px -20px, var(--bs-body-bg) 30px -30px 0px -3px,\n      var(--bs-orange) 30px -30px, var(--bs-body-bg) 40px -40px 0px -3px,\n      var(--bs-danger) 40px -40px;border:0;border-radius:25px;padding:30px;margin-right:45px;margin-top:25px;display:flex;align-items:center;justify-content:center}@media screen and (min-width: 768px){.homepage-hero-animation.svelte-1wsiig7{margin:0}}",
  map: null
};
const RetroBoxContainer = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { minHeight = 0 } = $$props;
  let { bgColor = "var(--bs-body-bg)" } = $$props;
  let cssStyles = `min-height: ${minHeight}px; background-color: ${bgColor};`;
  if ($$props.minHeight === void 0 && $$bindings.minHeight && minHeight !== void 0)
    $$bindings.minHeight(minHeight);
  if ($$props.bgColor === void 0 && $$bindings.bgColor && bgColor !== void 0)
    $$bindings.bgColor(bgColor);
  $$result.css.add(css);
  return `<div class="homepage-hero-animation svelte-1wsiig7"${add_attribute("style", cssStyles, 0)}>${slots.default ? slots.default({}) : ``} </div>`;
});
export {
  RetroBoxContainer as R
};
