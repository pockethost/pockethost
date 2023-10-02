import { c as create_ssr_component, e as escape, n as null_to_empty, v as validate_component, a as add_attribute, b as subscribe } from "../../chunks/ssr.js";
import { i as isUserLoggedIn, A as AuthStateGuard } from "../../chunks/AuthStateGuard.js";
import { R as RetroBoxContainer } from "../../chunks/RetroBoxContainer.js";
import { a as PUBLIC_APP_DOMAIN } from "../../chunks/env.js";
import "chalk";
import "bottleneck";
import "ajv";
import "pocketbase";
import { generateSlug } from "random-word-slugs";
const getRandomElementFromArray = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};
const FeatureCard_svelte_svelte_type_style_lang = "";
const css$3 = {
  code: ".card.svelte-1m1bqed{border:0;box-shadow:var(--soft-box-shadow);border-radius:18px}.card-icon.svelte-1m1bqed{background-color:var(--bs-gray-200);width:35px;height:35px;border-radius:35px;font-size:20px;display:flex;align-items:center;justify-content:center}",
  map: null
};
const FeatureCard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { title = "" } = $$props;
  let { subtitle = "" } = $$props;
  let { icon = "" } = $$props;
  let { fullHeight = false } = $$props;
  if ($$props.title === void 0 && $$bindings.title && title !== void 0)
    $$bindings.title(title);
  if ($$props.subtitle === void 0 && $$bindings.subtitle && subtitle !== void 0)
    $$bindings.subtitle(subtitle);
  if ($$props.icon === void 0 && $$bindings.icon && icon !== void 0)
    $$bindings.icon(icon);
  if ($$props.fullHeight === void 0 && $$bindings.fullHeight && fullHeight !== void 0)
    $$bindings.fullHeight(fullHeight);
  $$result.css.add(css$3);
  return `<div class="${"card " + escape(fullHeight && "h-100", true) + " svelte-1m1bqed"}"><div class="card-body">${icon ? `<div class="d-flex align-items-center gap-3 mb-3"><div class="card-icon svelte-1m1bqed"><i class="${escape(null_to_empty(icon), true) + " svelte-1m1bqed"}"></i></div> <div>${title ? `<h5 class="${"card-title " + escape(!subtitle && "mb-0", true) + " svelte-1m1bqed"}">${escape(title)}</h5>` : ``} ${subtitle ? `<h6 class="card-subtitle mb-0 text-muted">${escape(subtitle)}</h6>` : ``}</div></div>` : `${title ? `<h5 class="card-title">${escape(title)}</h5>` : ``} ${subtitle ? `<h6 class="card-subtitle mb-2 text-muted">${escape(subtitle)}</h6>` : ``}`} ${slots.default ? slots.default({}) : ``}</div> </div>`;
});
const HomepageHeroAnimation_svelte_svelte_type_style_lang = "";
const css$2 = {
  code: ".hero-animation-content.svelte-189h6yz{color:#222}",
  map: null
};
const HomepageHeroAnimation = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$2);
  return `${validate_component(RetroBoxContainer, "RetroBoxContainer").$$render($$result, { minHeight: 500, bgColor: "#fff" }, {}, {
    default: () => {
      return `${`<div class="hero-animation-content text-center svelte-189h6yz" data-svelte-h="svelte-e23mg"><p>Creating Your New Instance...</p> <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`} ${``}`;
    }
  })}`;
});
const InstanceGeneratorWidget_svelte_svelte_type_style_lang = "";
const css$1 = {
  code: "form.svelte-9lqymi{max-width:600px}.row.svelte-9lqymi{--bs-gutter-x:0.5rem}.btn.btn-primary.svelte-9lqymi{--bs-btn-padding-y:12px}.regenerate-instance-name-btn.svelte-9lqymi{padding:0;width:40px;height:40px;position:absolute;z-index:500;top:10px;right:7px;transition:all 200ms}",
  map: null
};
const InstanceGeneratorWidget = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let rotationCounter = 0;
  let email = "";
  let password = "";
  let instanceName = generateSlug(2);
  let isFormButtonDisabled = true;
  let processingQuotesArray = [
    "Did you know it takes fourteen sentient robots to create each instance on PocketHost?"
  ];
  getRandomElementFromArray(processingQuotesArray);
  $$result.css.add(css$1);
  isFormButtonDisabled = email.length === 0 || password.length === 0 || instanceName.length === 0;
  return `${`<h3 class="mb-3" data-svelte-h="svelte-z36jtq">Create Your Instance Now</h3> <form class="row align-items-center svelte-9lqymi"><div class="col-lg-6 col-12"><div class="form-floating mb-3 mb-lg-3"><input type="email" class="form-control" id="email" placeholder="name@example.com" autocomplete="email" required${add_attribute("value", email, 0)}> <label for="email" data-svelte-h="svelte-1p9d3fm">Email</label></div></div> <div class="col-lg-6 col-12"><div class="form-floating mb-3 mb-lg-3"><input type="password" class="form-control" id="password" placeholder="Password" autocomplete="new-password" required${add_attribute("value", password, 0)}> <label for="password" data-svelte-h="svelte-pepa0a">Password</label></div></div> <div class="col-lg-6 col-12"><div class="form-floating mb-3 mb-lg-3"><input type="text" class="form-control" id="instance" placeholder="Instance" required${add_attribute("value", instanceName, 0)}> <label for="instance" data-svelte-h="svelte-dskw3z">Instance Name</label> <button aria-label="Regenerate Instance Name" type="button" style="${"transform: rotate(" + escape(rotationCounter, true) + "deg);"}" class="btn btn-light rounded-circle regenerate-instance-name-btn svelte-9lqymi"><i class="bi bi-arrow-repeat"></i></button></div></div> <div class="col-lg-6 col-12"><div class="mb-3 mb-lg-3 text-lg-start text-center"><button type="submit" class="btn btn-primary svelte-9lqymi" ${isFormButtonDisabled ? "disabled" : ""}>Create <i class="bi bi-arrow-right-short"></i></button></div></div> ${``}</form>`}`;
});
const _page_svelte_svelte_type_style_lang = "";
const css = {
  code: ".hero.svelte-10mxhnk.svelte-10mxhnk{padding:50px 0}.hero.svelte-10mxhnk h2.svelte-10mxhnk{font-size:35px}.hero.svelte-10mxhnk h2 span.svelte-10mxhnk{background-image:linear-gradient(\n      83.2deg,\n      rgba(150, 93, 233, 1) 10.8%,\n      rgba(99, 88, 238, 1) 94.3%\n    );-webkit-background-clip:text;-webkit-text-fill-color:transparent}.features.svelte-10mxhnk.svelte-10mxhnk{background-image:var(--gradient-white-lime)}.section.svelte-10mxhnk.svelte-10mxhnk{padding:120px 0}.section.svelte-10mxhnk h2.svelte-10mxhnk{font-size:56px}@media screen and (min-width: 768px){.hero.svelte-10mxhnk.svelte-10mxhnk{padding:100px 0}.hero.svelte-10mxhnk h2.svelte-10mxhnk{font-size:65px}}",
  map: null
};
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $isUserLoggedIn, $$unsubscribe_isUserLoggedIn;
  $$unsubscribe_isUserLoggedIn = subscribe(isUserLoggedIn, (value) => $isUserLoggedIn = value);
  $$result.css.add(css);
  $$unsubscribe_isUserLoggedIn();
  return `${$$result.head += `<!-- HEAD_svelte-toxitl_START -->${$$result.title = `<title>Home - PocketHost</title>`, ""}<!-- HEAD_svelte-toxitl_END -->`, ""} <div class="container"><div class="row align-items-center justify-content-between hero svelte-10mxhnk"><div class="col-lg-6 mb-5 mb-lg-0"><h2 class="svelte-10mxhnk" data-svelte-h="svelte-fi219c">Deploy <span class="svelte-10mxhnk">PocketBase</span> in 30 seconds</h2> <p class="mb-5" data-svelte-h="svelte-i1yzxu">Spend less time on configuring your backend, and more time building new features for your
        web app.</p> ${validate_component(AuthStateGuard, "AuthStateGuard").$$render($$result, {}, {}, {
    default: () => {
      return `${$isUserLoggedIn ? `<div data-svelte-h="svelte-4bzb2b"><a href="/dashboard" class="btn btn-primary">Go to Your Dashboard <i class="bi bi-arrow-right-short"></i></a></div>` : ``} ${!$isUserLoggedIn ? `${validate_component(InstanceGeneratorWidget, "InstanceGeneratorWidget").$$render($$result, {}, {}, {})}` : ``}`;
    }
  })}</div> <div class="col-lg-5 d-none d-sm-block">${validate_component(HomepageHeroAnimation, "HomepageHeroAnimation").$$render($$result, {}, {}, {})}</div></div></div> <div class="section features svelte-10mxhnk"><div class="container"><h2 class="mb-5 svelte-10mxhnk" data-svelte-h="svelte-1thjf3r">Features</h2> <div class="row"><div class="col-12 col-md-6 col-lg-4 mb-4">${validate_component(FeatureCard, "FeatureCard").$$render(
    $$result,
    {
      title: "Up in 30 seconds",
      icon: "bi bi-stopwatch",
      fullHeight: true
    },
    {},
    {
      default: () => {
        return `<p data-svelte-h="svelte-szrous">A backend for your next app is as fast as signing up. No provisioning servers, no Docker
            fiddling, just B(ad)aaS productivity.</p> <ul data-svelte-h="svelte-d5jdjm"><li>Sign up</li> <li>Pick a unique project name</li> <li>Connect with our JS client</li></ul>`;
      }
    }
  )}</div> <div class="col-12 col-md-6 col-lg-4 mb-4">${validate_component(FeatureCard, "FeatureCard").$$render(
    $$result,
    {
      title: "Zero Config",
      icon: "bi bi-check-lg",
      fullHeight: true
    },
    {},
    {
      default: () => {
        return `<p data-svelte-h="svelte-msn0t0">With PocketHost, batteries are included. You get a database, outgoing email, SSL,
            authentication, cloud functions, and high concurrency all in one stop.</p>`;
      }
    }
  )}</div> <div class="col-12 col-md-6 col-lg-4 mb-4">${validate_component(FeatureCard, "FeatureCard").$$render(
    $$result,
    {
      title: "Database",
      icon: "bi bi-hdd-stack",
      fullHeight: true
    },
    {},
    {
      default: () => {
        return `<p data-svelte-h="svelte-14ua1i2">Your PocketHost instance is powered by its own internal SQLite instance. SQLite is <a href="https://pocketbase.io/faq/" target="_blank">more performant than mySQL or Postgres</a>
            and is
            <a href="https://www.sqlite.org/whentouse.html" target="_blank">perfect for powering your next app</a>.</p>`;
      }
    }
  )}</div> <div class="col-12 col-md-6 col-lg-3 mb-4">${validate_component(FeatureCard, "FeatureCard").$$render(
    $$result,
    {
      title: "Auth",
      icon: "bi bi-shield-lock",
      fullHeight: true
    },
    {},
    {
      default: () => {
        return `<p>Email and oAuth authentication options work out of the box. Send transactional email to
            your users from our verified domain and your custom address <code>yoursubdomain@${escape(PUBLIC_APP_DOMAIN)}</code>.</p>`;
      }
    }
  )}</div> <div class="col-12 col-md-6 col-lg-3 mb-4">${validate_component(FeatureCard, "FeatureCard").$$render(
    $$result,
    {
      title: "Storage",
      icon: "bi bi-archive",
      fullHeight: true
    },
    {},
    {
      default: () => {
        return `<p data-svelte-h="svelte-1hib3yu">PocketHost securely stores your files on Amazon S3, or you can use your own key to
            manage your own storage.</p>`;
      }
    }
  )}</div> <div class="col-12 col-md-6 col-lg-3 mb-4">${validate_component(FeatureCard, "FeatureCard").$$render(
    $$result,
    {
      title: "Room to Grow",
      icon: "bi bi-cloud-arrow-up",
      fullHeight: true
    },
    {},
    {
      default: () => {
        return `<p data-svelte-h="svelte-406kba">PocketHost is perfect for hobbist, low, and medium volume sites and apps.</p> <p data-svelte-h="svelte-1pp72zg">PocketHost, and the underlying PocketBase, can scale to well over 10,000 simultaneous
            connections.</p>`;
      }
    }
  )}</div> <div class="col-12 col-md-6 col-lg-3 mb-4">${validate_component(FeatureCard, "FeatureCard").$$render(
    $$result,
    {
      title: "Self-host",
      icon: "bi bi-house-door",
      fullHeight: true
    },
    {},
    {
      default: () => {
        return `<p data-svelte-h="svelte-mdkh80">When you&#39;re ready to take your project in-house, we have you covered. You can export
            your entire PocketHost environment along with a Dockerfile to run it.</p>`;
      }
    }
  )}</div> <div class="col-12 col-md-6 col-lg-6 mb-4">${validate_component(FeatureCard, "FeatureCard").$$render(
    $$result,
    {
      title: "Open Source Stack",
      icon: "bi bi-code-slash",
      fullHeight: true
    },
    {},
    {
      default: () => {
        return `<p data-svelte-h="svelte-zj9gz6">PocketHost is powered by Svelte, Vite, Typescript, PocketBase, and SQLite. Because the
            entire stack is open source, you&#39;ll never be locked into the whims of a vendor.</p>`;
      }
    }
  )}</div> <div class="col-12 col-md-6 col-lg-6 mb-4">${validate_component(FeatureCard, "FeatureCard").$$render(
    $$result,
    {
      title: "Coming Soon",
      icon: "bi bi-card-checklist",
      fullHeight: true
    },
    {},
    {
      default: () => {
        return `<ul data-svelte-h="svelte-17r241t"><li>JS/TS cloud functions</li> <li>Deploy to Fly.io</li> <li>Litestream</li></ul>`;
      }
    }
  )}</div></div></div> </div>`;
});
export {
  Page as default
};
