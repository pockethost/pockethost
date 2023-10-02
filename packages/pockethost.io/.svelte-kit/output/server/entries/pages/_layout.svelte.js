import { c as create_ssr_component, e as escape, a as add_attribute, b as subscribe, v as validate_component } from "../../chunks/ssr.js";
import "chalk";
import "bottleneck";
import { P as PUBLIC_POCKETHOST_VERSION, a as PUBLIC_APP_DOMAIN, b as PUBLIC_APP_PROTOCOL } from "../../chunks/env.js";
import "ajv";
import "pocketbase";
import "js-cookie";
import { i as isUserLoggedIn, A as AuthStateGuard, a as isUserVerified } from "../../chunks/AuthStateGuard.js";
function client_method(key) {
  {
    if (key === "before_navigate" || key === "after_navigate" || key === "on_navigate") {
      return () => {
      };
    } else {
      const name_lookup = {
        disable_scroll_handling: "disableScrollHandling",
        preload_data: "preloadData",
        preload_code: "preloadCode",
        invalidate_all: "invalidateAll"
      };
      return () => {
        throw new Error(`Cannot call ${name_lookup[key] ?? key}(...) on the server`);
      };
    }
  }
}
const afterNavigate = /* @__PURE__ */ client_method("after_navigate");
const InitializeTooltips = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  afterNavigate(() => {
  });
  return ``;
});
const MediaQuery = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { query = "" } = $$props;
  let matches = false;
  if ($$props.query === void 0 && $$bindings.query && query !== void 0)
    $$bindings.query(query);
  return `${slots.default ? slots.default({ matches }) : ``}`;
});
const ThemeToggle = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { navLink = false } = $$props;
  let iconClass = "";
  if ($$props.navLink === void 0 && $$bindings.navLink && navLink !== void 0)
    $$bindings.navLink(navLink);
  return `<button type="button" class="${escape(navLink && "nav-link", true) + " btn border-0 d-inline-block"}" aria-label="Toggle the site theme" title="Toggle the site theme"><i${add_attribute("class", iconClass, 0)}></i></button>`;
});
const Navbar_svelte_svelte_type_style_lang = "";
const css$1 = {
  code: "header.svelte-1ahdf44.svelte-1ahdf44{background-color:var(--bs-body-bg);padding:12px 24px;border-bottom:1px solid var(--bs-gray-300)}.logo.svelte-1ahdf44 img.svelte-1ahdf44{max-width:50px;margin-right:16px}.logo.svelte-1ahdf44 h1.svelte-1ahdf44{font-size:36px;font-weight:300;margin:0;color:var(--bs-body-color)}.logo.svelte-1ahdf44 h1 span.svelte-1ahdf44{font-weight:700;background-image:linear-gradient(83.2deg, rgb(150, 93, 233) 10.8%, rgb(99, 88, 238) 94.3%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.logo.svelte-1ahdf44 sup.svelte-1ahdf44{margin-left:4px;font-size:12px;font-weight:700;color:var(--bs-gray-600)}.mobile-nav-button.svelte-1ahdf44.svelte-1ahdf44{font-size:20px}.nav-item.svelte-1ahdf44.svelte-1ahdf44{margin:8px 0}.nav-link.svelte-1ahdf44.svelte-1ahdf44{font-weight:500;margin:0 5px}.nav-github-link.svelte-1ahdf44.svelte-1ahdf44{display:inline-block;margin-left:4px}@media screen and (min-width: 768px){.nav-github-link.svelte-1ahdf44.svelte-1ahdf44{display:none}.nav-item.svelte-1ahdf44.svelte-1ahdf44{margin:0}}",
  map: null
};
const Navbar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $isUserLoggedIn, $$unsubscribe_isUserLoggedIn;
  $$unsubscribe_isUserLoggedIn = subscribe(isUserLoggedIn, (value) => $isUserLoggedIn = value);
  $$result.css.add(css$1);
  $$unsubscribe_isUserLoggedIn();
  return `<header class="container-fluid svelte-1ahdf44"><nav class="navbar navbar-expand-md"><a href="/" class="logo text-decoration-none d-flex align-items-center svelte-1ahdf44"><img src="/images/logo-square.png" alt="PocketHost Logo" class="img-fluid svelte-1ahdf44"> <h1 class="svelte-1ahdf44" data-svelte-h="svelte-33gspr">Pocket<span class="svelte-1ahdf44">Host</span></h1> <sup class=" svelte-1ahdf44">${escape(PUBLIC_POCKETHOST_VERSION)}</sup></a> <button class="btn btn-light mobile-nav-button navbar-toggler svelte-1ahdf44" type="button" data-bs-toggle="collapse" data-bs-target="#nav-links" aria-controls="nav-links" aria-expanded="false" aria-label="Toggle navigation" data-svelte-h="svelte-14jksr1"><i class="bi bi-list"></i></button> <div class="collapse navbar-collapse" id="nav-links"><ul class="navbar-nav ms-auto mb-2 mb-md-0">${validate_component(AuthStateGuard, "AuthStateGuard").$$render($$result, {}, {}, {
    default: () => {
      return `${$isUserLoggedIn ? `<li class="nav-item text-md-start text-center svelte-1ahdf44" data-svelte-h="svelte-1j25to8"><a class="nav-link svelte-1ahdf44" href="/dashboard">Dashboard</a></li> ${validate_component(MediaQuery, "MediaQuery").$$render($$result, { query: "(min-width: 768px)" }, {}, {
        default: ({ matches }) => {
          return `${matches ? `<li class="nav-item dropdown svelte-1ahdf44"><button class="btn border-0 nav-link dropdown-toggle svelte-1ahdf44" type="button" data-bs-toggle="dropdown" aria-label="Click to expand the Account Dropdown" title="Account Dropdown" aria-expanded="false" data-svelte-h="svelte-cu21pk">Account</button> <ul class="dropdown-menu dropdown-menu-end"><li><button class="dropdown-item" type="button" data-svelte-h="svelte-smuaw4">Logout</button></li></ul></li>` : `<li class="nav-item svelte-1ahdf44"><a class="nav-link text-md-start text-center svelte-1ahdf44" href="/" data-svelte-h="svelte-e6dg40">Logout</a></li>`}`;
        }
      })}` : ``} ${!$isUserLoggedIn ? `<li class="nav-item svelte-1ahdf44" data-svelte-h="svelte-1hmrcpa"><a class="nav-link text-md-start text-center svelte-1ahdf44" href="/signup">Sign up</a></li> <li class="nav-item svelte-1ahdf44" data-svelte-h="svelte-1kibhrk"><a class="nav-link text-md-start text-center svelte-1ahdf44" href="/login">Log in</a></li>` : ``}`;
    }
  })} <li class="nav-item text-center svelte-1ahdf44" data-svelte-h="svelte-gk4z98"><a href="https://pockethost.gitbook.io/manual/overview/faq" class="nav-link btn btn-outline-dark rounded-1 d-inline-block px-3 svelte-1ahdf44" rel="noreferrer">FAQ</a></li> <li class="nav-item text-center svelte-1ahdf44" data-svelte-h="svelte-156zugf"><a href="https://github.com/benallfree/pockethost/discussions" class="nav-link btn btn-outline-dark rounded-1 d-inline-block px-3 svelte-1ahdf44" target="_blank" rel="noreferrer">Support</a></li> <li class="nav-item text-center svelte-1ahdf44" data-svelte-h="svelte-gufokf"><a href="https://pockethost.gitbook.io/manual/" class="nav-link btn btn-outline-dark rounded-1 d-inline-block px-3 svelte-1ahdf44" rel="noreferrer">Docs</a></li> <li class="nav-item svelte-1ahdf44" data-svelte-h="svelte-1s07lor"><a class="nav-link text-md-start text-center svelte-1ahdf44" href="https://github.com/benallfree/pockethost" target="_blank" aria-label="Link to our Github Project" title="Link to our Github Project" rel="noopener"><i class="bi bi-github"></i><span class="nav-github-link svelte-1ahdf44">Github</span></a></li> <li class="nav-item text-center svelte-1ahdf44">${validate_component(ThemeToggle, "ThemeToggle").$$render($$result, { navLink: true }, {}, {})}</li></ul></div></nav> </header>`;
});
var AlertTypes = /* @__PURE__ */ ((AlertTypes2) => {
  AlertTypes2["Primary"] = "primary";
  AlertTypes2["Secondary"] = "secondary";
  AlertTypes2["Success"] = "success";
  AlertTypes2["Danger"] = "danger";
  AlertTypes2["Warning"] = "warning";
  AlertTypes2["Info"] = "info";
  AlertTypes2["Light"] = "light";
  AlertTypes2["Dark"] = "dark";
  return AlertTypes2;
})(AlertTypes || {});
const AlertBar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { title = "" } = $$props;
  let { text = "" } = $$props;
  let { icon = "" } = $$props;
  let { alertType = AlertTypes.Warning } = $$props;
  if ($$props.title === void 0 && $$bindings.title && title !== void 0)
    $$bindings.title(title);
  if ($$props.text === void 0 && $$bindings.text && text !== void 0)
    $$bindings.text(text);
  if ($$props.icon === void 0 && $$bindings.icon && icon !== void 0)
    $$bindings.icon(icon);
  if ($$props.alertType === void 0 && $$bindings.alertType && alertType !== void 0)
    $$bindings.alertType(alertType);
  return `<div class="${"alert alert-" + escape(alertType, true) + " d-flex gap-3 align-items-center"}" role="alert">${icon ? `<i${add_attribute("class", icon, 0)}></i>` : ``} <div class="w-100">${title ? `<p class="fw-bold mb-0">${escape(title)}</p>` : ``} ${text ? `${escape(text)}` : `${slots.default ? slots.default({}) : ``}`}</div></div>`;
});
const VerifyAccountBar_svelte_svelte_type_style_lang = "";
const css = {
  code: ".success-icon.svelte-3oxvmj{padding:0.375rem 0.75rem}",
  map: null
};
const VerifyAccountBar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $isUserLoggedIn, $$unsubscribe_isUserLoggedIn;
  let $isUserVerified, $$unsubscribe_isUserVerified;
  $$unsubscribe_isUserLoggedIn = subscribe(isUserLoggedIn, (value) => $isUserLoggedIn = value);
  $$unsubscribe_isUserVerified = subscribe(isUserVerified, (value) => $isUserVerified = value);
  let defaultAlertBarType = AlertTypes.Warning;
  $$result.css.add(css);
  $$unsubscribe_isUserLoggedIn();
  $$unsubscribe_isUserVerified();
  return `${$isUserLoggedIn && !$isUserVerified ? `<div class="container py-3">${validate_component(AlertBar, "AlertBar").$$render($$result, { alertType: defaultAlertBarType }, {}, {
    default: () => {
      return `<div class="d-flex flex-wrap align-items-center justify-content-center gap-3"><i class="bi bi-envelope-exclamation"></i> <div data-svelte-h="svelte-pq1nsn">Please verify your account by clicking the link in your email</div> ${`<button type="button" class="btn btn-outline-secondary" data-svelte-h="svelte-14hnyaz">Resend Email</button>`}</div> ${``}`;
    }
  })}</div>` : ``}`;
});
const Meta = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const baseUrl = `${PUBLIC_APP_PROTOCOL}://${PUBLIC_APP_DOMAIN}/`;
  const imageUrl = `${baseUrl}poster.png`;
  const tagline = `Get a PocketBase backend for your next app in under 10 seconds.`;
  return `${$$result.head += `<!-- HEAD_svelte-4bmry3_START -->${$$result.title = `<title>PocketHost</title>`, ""}<meta name="description"${add_attribute("content", tagline, 0)}><link rel="manifest" href="/manifest.json"><meta property="og:url"${add_attribute("content", baseUrl, 0)}><meta property="og:type" content="website"><meta property="og:title" content="PocketHost"><meta property="og:description"${add_attribute("content", tagline, 0)}><meta property="og:image"${add_attribute("content", imageUrl, 0)}><meta name="twitter:card" content="summary_large_image"><meta property="twitter:domain"${add_attribute("content", PUBLIC_APP_DOMAIN, 0)}><meta property="twitter:url"${add_attribute("content", baseUrl, 0)}><meta name="twitter:title" content="PocketHost"><meta name="twitter:description"${add_attribute("content", tagline, 0)}><meta name="twitter:image"${add_attribute("content", imageUrl, 0)}><!-- HEAD_svelte-4bmry3_END -->`, ""}`;
});
const Protect = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return ``;
});
const ThemeDetector = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${$$result.head += `<!-- HEAD_svelte-11qq8p9_START --><script data-svelte-h="svelte-19wu3v0">{
      const THEME_ATTRIBUTE = 'data-bs-theme'
      const currentTheme =
        document.cookie
          .split('; ')
          .find((row) => row.startsWith('theme='))
          ?.split('=')?.[1] || 'light'

      document.querySelector('html')?.setAttribute(THEME_ATTRIBUTE, currentTheme)
      const theme = document.querySelector('#hljs-link')
      if (currentTheme === 'light') {
        theme.href =
          'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/default.min.css'
      }
    }<\/script><!-- HEAD_svelte-11qq8p9_END -->`, ""}`;
});
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${validate_component(Meta, "Meta").$$render($$result, {}, {}, {})} ${validate_component(Protect, "Protect").$$render($$result, {}, {}, {})} ${validate_component(ThemeDetector, "ThemeDetector").$$render($$result, {}, {}, {})} ${validate_component(Navbar, "Navbar").$$render($$result, {}, {}, {})} ${validate_component(AuthStateGuard, "AuthStateGuard").$$render($$result, {}, {}, {
    default: () => {
      return `${validate_component(VerifyAccountBar, "VerifyAccountBar").$$render($$result, {}, {}, {})}`;
    }
  })} <main data-sveltekit-prefetch>${slots.default ? slots.default({}) : ``}</main> ${validate_component(InitializeTooltips, "InitializeTooltips").$$render($$result, {}, {}, {})}`;
});
export {
  Layout as default
};
