import { d as set_current_component, r as run_all, f as current_component, c as create_ssr_component, a as add_attribute, e as escape, g as createEventDispatcher, v as validate_component, h as compute_rest_props, i as spread, j as escape_attribute_value, k as escape_object, l as add_classes, b as subscribe, o as onDestroy, p as each, n as null_to_empty } from "../../../../../chunks/ssr.js";
import { l as logger, b as PUBLIC_APP_PROTOCOL, a as PUBLIC_APP_DOMAIN } from "../../../../../chunks/env.js";
import "chalk";
import "bottleneck";
import "ajv";
import "pocketbase";
import { uniqueId } from "@s-libs/micro-dash";
import hljs from "highlight.js/lib/core";
import register$1 from "highlight.js/lib/languages/typescript";
import { i as instance, c as createCleanupManager } from "../../../../../chunks/store.js";
import register from "highlight.js/lib/languages/bash";
import { w as writable } from "../../../../../chunks/index.js";
import { P as ProvisioningStatus } from "../../../../../chunks/ProvisioningStatus.js";
import { scaleOrdinal } from "d3-scale";
import { schemeTableau10 } from "d3-scale-chromatic";
const dirty_components = [];
const binding_callbacks = [];
let render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = /* @__PURE__ */ Promise.resolve();
let update_scheduled = false;
function schedule_update() {
  if (!update_scheduled) {
    update_scheduled = true;
    resolved_promise.then(flush);
  }
}
function tick() {
  schedule_update();
  return resolved_promise;
}
function add_render_callback(fn) {
  render_callbacks.push(fn);
}
const seen_callbacks = /* @__PURE__ */ new Set();
let flushidx = 0;
function flush() {
  if (flushidx !== 0) {
    return;
  }
  const saved_component = current_component;
  do {
    try {
      while (flushidx < dirty_components.length) {
        const component = dirty_components[flushidx];
        flushidx++;
        set_current_component(component);
        update(component.$$);
      }
    } catch (e) {
      dirty_components.length = 0;
      flushidx = 0;
      throw e;
    }
    set_current_component(null);
    dirty_components.length = 0;
    flushidx = 0;
    while (binding_callbacks.length)
      binding_callbacks.pop()();
    for (let i = 0; i < render_callbacks.length; i += 1) {
      const callback = render_callbacks[i];
      if (!seen_callbacks.has(callback)) {
        seen_callbacks.add(callback);
        callback();
      }
    }
    render_callbacks.length = 0;
  } while (dirty_components.length);
  while (flush_callbacks.length) {
    flush_callbacks.pop()();
  }
  update_scheduled = false;
  seen_callbacks.clear();
  set_current_component(saved_component);
}
function update($$) {
  if ($$.fragment !== null) {
    $$.update();
    run_all($$.before_update);
    const dirty = $$.dirty;
    $$.dirty = [-1];
    $$.fragment && $$.fragment.p($$.ctx, dirty);
    $$.after_update.forEach(add_render_callback);
  }
}
function assertExists(v, message = `Value does not exist`) {
  if (typeof v === "undefined") {
    throw new Error(message);
  }
}
const SECRET_KEY_REGEX = /^[A-Z][A-Z0-9_]*$/;
const client = (() => {
  return () => {
    throw new Error(`PocketBase client not supported in SSR`);
  };
})();
const AccordionItem = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { title = "" } = $$props;
  let { show = false } = $$props;
  let { header = "primary" } = $$props;
  const uid = uniqueId("a");
  const headerId = `header${uid}`;
  const bodyId = `body${uid}`;
  if ($$props.title === void 0 && $$bindings.title && title !== void 0)
    $$bindings.title(title);
  if ($$props.show === void 0 && $$bindings.show && show !== void 0)
    $$bindings.show(show);
  if ($$props.header === void 0 && $$bindings.header && header !== void 0)
    $$bindings.header(header);
  return `<div class="accordion-item"><h2 class="accordion-header"${add_attribute("id", headerId, 0)}><button class="${"accordion-button " + escape(show ? "" : "collapsed", true) + " text-bg-" + escape(header, true)}" type="button" data-bs-toggle="collapse" data-bs-target="${"#" + escape(bodyId, true)}" aria-expanded="true"${add_attribute("aria-controls", bodyId, 0)}>${escape(title)}</button></h2> <div${add_attribute("id", bodyId, 0)} class="${"accordion-collapse collapse " + escape(show ? "show" : "", true)}"${add_attribute("aria-labelledby", bodyId, 0)} data-bs-parent="#accordionExample"><div class="accordion-body">${slots.default ? slots.default({}) : ``}</div></div></div>`;
});
const Clipboard_svelte_svelte_type_style_lang = "";
const css$6 = {
  code: "textarea.svelte-w8w2mp{left:0;bottom:0;margin:0;padding:0;opacity:0;width:1px;height:1px;border:none;display:block;position:absolute}",
  map: null
};
const Clipboard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const dispatch = createEventDispatcher();
  let { text } = $$props;
  let textarea;
  async function copy() {
    textarea.select();
    document.execCommand("Copy");
    await tick();
    textarea.blur();
    dispatch("copy");
  }
  if ($$props.text === void 0 && $$bindings.text && text !== void 0)
    $$bindings.text(text);
  $$result.css.add(css$6);
  return `${slots.default ? slots.default({ copy }) : ``} <textarea class="svelte-w8w2mp"${add_attribute("this", textarea, 0)}>${escape(text, false)}</textarea>`;
});
const TinyButton = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { disabled = false } = $$props;
  let { style = "primary" } = $$props;
  let { click = () => {
  } } = $$props;
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  if ($$props.style === void 0 && $$bindings.style && style !== void 0)
    $$bindings.style(style);
  if ($$props.click === void 0 && $$bindings.click && click !== void 0)
    $$bindings.click(click);
  return `<button type="button" class="${"btn btn-" + escape(style, true)}" ${disabled ? "disabled" : ""} style="--bs-btn-padding-y: .05rem; --bs-btn-padding-x: .5rem; --bs-btn-font-size: .75rem;">${slots.default ? slots.default({}) : ``}</button>`;
});
const CopyButton = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { code } = $$props;
  let { copy } = $$props;
  if ($$props.code === void 0 && $$bindings.code && code !== void 0)
    $$bindings.code(code);
  if ($$props.copy === void 0 && $$bindings.copy && copy !== void 0)
    $$bindings.copy(copy);
  return `${validate_component(Clipboard, "Clipboard").$$render($$result, { text: code }, {}, {
    default: ({ copy: copy2 }) => {
      return `${validate_component(TinyButton, "TinyButton").$$render(
        $$result,
        {
          click: copy2,
          style: "primary"
        },
        {},
        {
          default: () => {
            return `${escape("Copy")}`;
          }
        }
      )}`;
    }
  })}`;
});
const LangTag_svelte_svelte_type_style_lang = "";
const css$5 = {
  code: ".langtag.svelte-11sh29b{position:relative}.langtag.svelte-11sh29b::after{content:attr(data-language);position:absolute;top:0;right:0;padding:1em;display:flex;align-items:center;justify-content:center;background:var(--langtag-background, inherit);color:var(--langtag-color, inherit);border-radius:var(--langtag-border-radius)}",
  map: null
};
const LangTag = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["langtag", "highlighted", "code", "languageName"]);
  let { langtag = false } = $$props;
  let { highlighted } = $$props;
  let { code } = $$props;
  let { languageName = "plaintext" } = $$props;
  if ($$props.langtag === void 0 && $$bindings.langtag && langtag !== void 0)
    $$bindings.langtag(langtag);
  if ($$props.highlighted === void 0 && $$bindings.highlighted && highlighted !== void 0)
    $$bindings.highlighted(highlighted);
  if ($$props.code === void 0 && $$bindings.code && code !== void 0)
    $$bindings.code(code);
  if ($$props.languageName === void 0 && $$bindings.languageName && languageName !== void 0)
    $$bindings.languageName(languageName);
  $$result.css.add(css$5);
  return `<pre${spread(
    [
      {
        "data-language": escape_attribute_value(languageName)
      },
      escape_object($$restProps)
    ],
    {
      classes: (langtag ? "langtag" : "") + " svelte-11sh29b"
    }
  )}><code${add_classes("hljs".trim())}>${highlighted ? `<!-- HTML_TAG_START -->${highlighted}<!-- HTML_TAG_END -->` : `${escape(code)}`}</code></pre>`;
});
const LangTag$1 = LangTag;
const Highlight = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["language", "code", "langtag"]);
  let { language } = $$props;
  let { code } = $$props;
  let { langtag = false } = $$props;
  createEventDispatcher();
  let highlighted = "";
  if ($$props.language === void 0 && $$bindings.language && language !== void 0)
    $$bindings.language(language);
  if ($$props.code === void 0 && $$bindings.code && code !== void 0)
    $$bindings.code(code);
  if ($$props.langtag === void 0 && $$bindings.langtag && langtag !== void 0)
    $$bindings.langtag(langtag);
  {
    {
      hljs.registerLanguage(language.name, language.register);
      highlighted = hljs.highlight(code, { language: language.name }).value;
    }
  }
  return `${slots.default ? slots.default({ highlighted }) : ` ${validate_component(LangTag$1, "LangTag").$$render($$result, Object.assign({}, $$restProps, { languageName: language.name }, { langtag }, { highlighted }, { code }), {}, {})} `}`;
});
const Highlight$1 = Highlight;
const bash = { name: "bash", register };
const bash$1 = bash;
const typescript = { name: "typescript", register: register$1 };
const typescript$1 = typescript;
const CodeSample_svelte_svelte_type_style_lang = "";
const css$4 = {
  code: ".copy-container.svelte-mnx4t1.svelte-mnx4t1{position:relative;margin:5px;border:1px solid gray}.copy-container.svelte-mnx4t1 .copy-button.svelte-mnx4t1{position:absolute;top:2px;right:2px}",
  map: null
};
const CodeSample = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const { dbg } = logger();
  let { code } = $$props;
  let { language = typescript$1 } = $$props;
  const handleCopy = () => {
    dbg("copied");
  };
  if ($$props.code === void 0 && $$bindings.code && code !== void 0)
    $$bindings.code(code);
  if ($$props.language === void 0 && $$bindings.language && language !== void 0)
    $$bindings.language(language);
  $$result.css.add(css$4);
  return `<div class="copy-container svelte-mnx4t1">${validate_component(Highlight$1, "Highlight").$$render($$result, { language, code }, {}, {})} <div class="copy-button svelte-mnx4t1">${validate_component(CopyButton, "CopyButton").$$render($$result, { code, copy: handleCopy }, {}, {})}</div> </div>`;
});
const Code = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $instance, $$unsubscribe_instance;
  $$unsubscribe_instance = subscribe(instance, (value) => $instance = value);
  let code = "";
  {
    {
      const url = `${PUBLIC_APP_PROTOCOL}://${$instance.subdomain}.${PUBLIC_APP_DOMAIN}`;
      code = `const url = '${url}'
const client = new PocketBase(url)`;
    }
  }
  $$unsubscribe_instance();
  return `${validate_component(AccordionItem, "AccordionItem").$$render($$result, { title: "Code Samples" }, {}, {
    default: () => {
      return `JavaScript:
  ${validate_component(CodeSample, "CodeSample").$$render($$result, { code }, {}, {})}`;
    }
  })}`;
});
const MiniEdit = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { value = "" } = $$props;
  let { disabled = false } = $$props;
  let { save = async () => "saved" } = $$props;
  const { dbg, error } = logger().create("MiniEdit.svelte");
  let msg = "";
  let err = "";
  let oldValue = value;
  let editedValue = value;
  let editMode = false;
  let inputField;
  const startEdit = () => {
    msg = "";
    err = "";
    oldValue = editedValue;
    editMode = true;
    setTimeout(
      () => {
        inputField.focus();
        inputField.select();
      },
      0
    );
  };
  const cancelEdit = () => {
    editedValue = oldValue;
    editMode = false;
  };
  const saveEdit = () => {
    msg = "";
    err = "";
    save(editedValue).then((res) => {
      editMode = false;
      msg = res;
    }).catch((e) => {
      error(`Got an error on save`, e);
      err = e.data?.data?.subdomain?.message || e.message;
    });
  };
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  if ($$props.save === void 0 && $$bindings.save && save !== void 0)
    $$bindings.save(save);
  return `${!editMode || disabled ? `${escape(editedValue)} ${validate_component(TinyButton, "TinyButton").$$render($$result, { click: startEdit, disabled }, {}, {
    default: () => {
      return `edit`;
    }
  })}` : ``} ${editMode && !disabled ? `<input type="text"${add_attribute("this", inputField, 0)}${add_attribute("value", editedValue, 0)}> ${validate_component(TinyButton, "TinyButton").$$render(
    $$result,
    {
      style: "success",
      disabled,
      click: saveEdit
    },
    {},
    {
      default: () => {
        return `save`;
      }
    }
  )} ${validate_component(TinyButton, "TinyButton").$$render(
    $$result,
    {
      style: "danger",
      disabled,
      click: cancelEdit
    },
    {},
    {
      default: () => {
        return `cancel`;
      }
    }
  )}` : ``} ${msg ? `<span class="text-success">${escape(msg)}</span>` : ``} ${err ? `<span class="text-danger">${escape(err)}</span>` : ``}`;
});
const Version = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let id;
  let maintenance;
  let $instance, $$unsubscribe_instance;
  $$unsubscribe_instance = subscribe(instance, (value) => $instance = value);
  let _version = $instance.version;
  const saveEdit = async (newValue) => client().saveVersion({ instanceId: id, version: newValue }).then(() => {
    _version = newValue;
    return "saved";
  });
  ({ id, maintenance } = $instance);
  $$unsubscribe_instance();
  return `<div><h3 data-svelte-h="svelte-1vri6j7">Version Lock</h3> <p class="text-danger" data-svelte-h="svelte-wguach">Warning - changing your version number should only be done when the instance is in maintenance
    mode and you have already done a fresh backup. Depending on the upgrade/downgrade you are
    performing, your instance may become inoperable. If that happens, you may need to manually
    upgrade your database locally. See <a href="https://pockethost.gitbook.io/manual/daily-usage/upgrading">upgrading</a> for more information. name.</p>
  Version ${validate_component(MiniEdit, "MiniEdit").$$render(
    $$result,
    {
      value: _version,
      save: saveEdit,
      disabled: !maintenance
    },
    {},
    {}
  )}</div>`;
});
const MiniToggle = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { value = false } = $$props;
  let { save = async () => "saved" } = $$props;
  const id = uniqueId();
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.save === void 0 && $$bindings.save && save !== void 0)
    $$bindings.save(save);
  return `<div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch"${add_attribute("id", id, 0)}${add_attribute("checked", value, 1)}> <label class="form-check-label"${add_attribute("for", id, 0)}>${slots.default ? slots.default({}) : ``}</label></div>`;
});
const Maintenance = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let id;
  let maintenance;
  let $instance, $$unsubscribe_instance;
  $$unsubscribe_instance = subscribe(instance, (value) => $instance = value);
  const { setInstanceMaintenance } = client();
  const onMaintenance = (maintenance2) => setInstanceMaintenance({ instanceId: id, maintenance: maintenance2 }).then(() => "saved");
  ({ id, maintenance } = $instance);
  $$unsubscribe_instance();
  return `<div><h3 data-svelte-h="svelte-1wwjw6y">Maintenance Mode</h3> <p class="text-danger" data-svelte-h="svelte-1ojn9y8">Your PocketHost instance will not be accessible while in maintenance mode. Use this when you are
    upgrading, downgrading, or backing up your data. See <a href="https://pockethost.gitbook.io/manual/daily-usage/maintenance">Maintenance Mode</a> for more information.</p> ${validate_component(MiniToggle, "MiniToggle").$$render($$result, { value: maintenance, save: onMaintenance }, {}, {
    default: () => {
      return `Maintenance Mode`;
    }
  })}</div>`;
});
const Rename = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let subdomain;
  let id;
  let maintenance;
  let $instance, $$unsubscribe_instance;
  $$unsubscribe_instance = subscribe(instance, (value) => $instance = value);
  const { renameInstance, setInstanceMaintenance } = client();
  const onRename = (subdomain2) => renameInstance({ instanceId: id, subdomain: subdomain2 }).then(() => "saved");
  ({ subdomain, id, maintenance } = $instance);
  $$unsubscribe_instance();
  return `<div><h3 data-svelte-h="svelte-m4r7mh">Rename Instance</h3> <p class="text-danger" data-svelte-h="svelte-s3jde7">Warning - renaming your instance will cause it to become inaccessible by the old instance name.
    You also may not be able to change it back if someone else choose it. See <a href="https://pockethost.gitbook.io/manual/daily-usage/rename-instance">renaming</a> for more information.</p> ${validate_component(MiniEdit, "MiniEdit").$$render($$result, { value: subdomain, save: onRename }, {}, {})}</div>`;
});
const Danger = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${validate_component(AccordionItem, "AccordionItem").$$render($$result, { title: "Danger Zone", header: "danger" }, {}, {
    default: () => {
      return `${validate_component(Rename, "Rename").$$render($$result, {}, {}, {})} ${validate_component(Maintenance, "Maintenance").$$render($$result, {}, {}, {})} ${validate_component(Version, "Version").$$render($$result, {}, {}, {})}`;
    }
  })}`;
});
const Ftpx_svelte_svelte_type_style_lang = "";
const css$3 = {
  code: "table.svelte-nmqjkj.svelte-nmqjkj{margin:10px}table.svelte-nmqjkj td.svelte-nmqjkj,table.svelte-nmqjkj tr.svelte-nmqjkj,table.svelte-nmqjkj th.svelte-nmqjkj{border:2px solid rgb(92, 92, 157);padding:5px}",
  map: null
};
const Ftpx = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_instance;
  $$unsubscribe_instance = subscribe(instance, (value) => value);
  const { user } = client();
  const { email } = user() || {};
  if (!email) {
    throw new Error(`Email expected here`);
  }
  const ftpUrl = `ftp://${encodeURIComponent(email)}@${PUBLIC_APP_DOMAIN}`;
  $$result.css.add(css$3);
  $$unsubscribe_instance();
  return `${validate_component(AccordionItem, "AccordionItem").$$render($$result, { title: "FTP Access" }, {}, {
    default: () => {
      return `<p data-svelte-h="svelte-1hcic0o">Securely access your instance files via FTPS. Use your PocketHost account
    login and password.</p> <p data-svelte-h="svelte-dxwa44"><a href="https://pockethost.gitbook.io/manual/daily-usage/ftp">Full documentation</a></p> <p data-svelte-h="svelte-1toe44k">Bash:</p> ${validate_component(CodeSample, "CodeSample").$$render($$result, { code: `ftp ${ftpUrl}`, language: bash$1 }, {}, {})} <table class="svelte-nmqjkj" data-svelte-h="svelte-1205750"><thead><tr class="svelte-nmqjkj"><th class="svelte-nmqjkj">Directory</th><th class="svelte-nmqjkj">Description</th></tr></thead> <tr class="svelte-nmqjkj"><th class="svelte-nmqjkj">pb_data</th><td class="svelte-nmqjkj">The PocketBase data directory</td></tr> <tr class="svelte-nmqjkj"><th class="svelte-nmqjkj">pb_public</th><td class="svelte-nmqjkj">Public files, such as a web frontend</td></tr> <tr class="svelte-nmqjkj"><th class="svelte-nmqjkj">pb_migrations</th><td class="svelte-nmqjkj">The PocketBase migrations directory</td></tr> <tr class="svelte-nmqjkj"><th class="svelte-nmqjkj">pb_hooks</th><td class="svelte-nmqjkj">The PocketBase JS hooks directory</td></tr></table>`;
    }
  })}`;
});
const Logging_svelte_svelte_type_style_lang = "";
const css$2 = {
  code: ".log-window.svelte-fvvcvu.svelte-fvvcvu{border:1px solid gray;padding:5px;height:500px;overflow:auto;display:flex;flex-direction:column-reverse;white-space:nowrap}.log-window.svelte-fvvcvu .log.svelte-fvvcvu{position:relative;font-family:monospace}.log-window.svelte-fvvcvu .log .time.svelte-fvvcvu{color:gray;display:inline-block}.log-window.svelte-fvvcvu .log .stream.svelte-fvvcvu{color:gray;display:inline-block}.log-window.svelte-fvvcvu .log .stream.system.svelte-fvvcvu{color:orange}.log-window.svelte-fvvcvu .log .stream.info.svelte-fvvcvu{color:blue}.log-window.svelte-fvvcvu .log .stream.error.svelte-fvvcvu{color:red}.log-window.svelte-fvvcvu .log .message.svelte-fvvcvu{display:inline-block}",
  map: null
};
const Logging = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_logs;
  let $$unsubscribe_instance;
  $$unsubscribe_instance = subscribe(instance, (value) => value);
  logger().create(`Logging.svelte`);
  const logs = writable({});
  $$unsubscribe_logs = subscribe(logs, (value) => value);
  let logsArray = [];
  const cm = createCleanupManager();
  onDestroy(cm.shutdown);
  $$result.css.add(css$2);
  $$unsubscribe_logs();
  $$unsubscribe_instance();
  return `${validate_component(AccordionItem, "AccordionItem").$$render($$result, { title: "Instance Logging" }, {}, {
    default: () => {
      return `<p data-svelte-h="svelte-g7ab1f">Instance logs appear here in realtime, including <code>console.log</code> from
    JavaScript hooks.</p> <div class="log-window svelte-fvvcvu">${each(logsArray, (log) => {
        return `<div class="log svelte-fvvcvu"><div class="time svelte-fvvcvu">${escape(log.created)}</div> <div class="${escape(null_to_empty(`stream ${log.stream}`), true) + " svelte-fvvcvu"}">${escape(log.stream)}</div> <div class="${escape(null_to_empty(`message  ${log.stream}`), true) + " svelte-fvvcvu"}">${escape((() => {
          try {
            const parsed = JSON.parse(log.message);
            return `<pre><code>${parsed}</code></pre>`;
          } catch (e) {
            return log.message;
          }
        })())}</div> </div>`;
      })}</div>`;
    }
  })}`;
});
const Overview = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let subdomain;
  let status;
  let version;
  let secondsThisMonth;
  let $instance, $$unsubscribe_instance;
  $$unsubscribe_instance = subscribe(instance, (value) => $instance = value);
  ({ subdomain, status, version, secondsThisMonth } = $instance);
  $$unsubscribe_instance();
  return `${validate_component(AccordionItem, "AccordionItem").$$render($$result, { title: "Overview", show: true }, {}, {
    default: () => {
      return `<div>Status: ${validate_component(ProvisioningStatus, "ProvisioningStatus").$$render($$result, { status }, {}, {})}</div> <div>Usage: ${escape(Math.ceil(secondsThisMonth / 60))} mins</div> <div>Version: ${escape(version)} (change in Danger Zone)</div>`;
    }
  })}`;
});
const colorScale = scaleOrdinal(schemeTableau10);
function formatInput(input) {
  return input.sort((a, b) => a.name < b.name ? -1 : 1).map(({ name, value }, index) => ({
    name,
    value,
    color: colorScale(index.toString())
  }));
}
const sanitize = (item) => {
  return {
    name: item.name.toUpperCase().trim(),
    value: item.value.trim()
  };
};
function createItems(initialItems) {
  const { dbg } = logger().create(`Secrets/store.ts`);
  const { subscribe: subscribe2, set, update: update2 } = writable(initialItems);
  const api = {
    subscribe: subscribe2,
    clear: () => {
      set([]);
    },
    // create: add an object for the item at the end of the store's array
    upsert: (item) => {
      dbg(`Upserting`, item);
      const { name, value } = sanitize(item);
      return update2((n) => {
        return formatInput([
          ...n.filter((i) => i.name !== name),
          { name, value }
        ]);
      });
    },
    // delete: remove the item from the array
    delete: (name) => {
      dbg(`Delete`, name);
      return update2((n) => {
        const index = n.findIndex((item) => item.name === name);
        n = [...n.slice(0, index), ...n.slice(index + 1)];
        return formatInput(n);
      });
    }
  };
  return api;
}
const items = createItems(formatInput([]));
const Form_svelte_svelte_type_style_lang = "";
const css$1 = {
  code: ".container.svelte-g46rd.svelte-g46rd{border:1px solid black;margin:20px;padding:20px;width:300px}.container.svelte-g46rd h2.svelte-g46rd{font-size:13pt}.container.svelte-g46rd section.svelte-g46rd{display:flex;flex-wrap:wrap;align-items:center;color:var(--bs-gray-600);background:var(--bs-gray-100);padding:0.75rem 1rem;border-radius:5px;margin-bottom:20px}.container.svelte-g46rd section label.svelte-g46rd{flex-grow:1;display:flex;flex-direction:column;font-size:1rem;line-height:2;margin:10px}.container.svelte-g46rd section label input.svelte-g46rd{font-size:1.1rem;color:inherit;font-family:inherit;background:none;padding:0.5rem 0.75rem}",
  map: null
};
const Form = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_items;
  $$unsubscribe_items = subscribe(items, (value2) => value2);
  let name = "";
  let value = "";
  let isKeyValid = false;
  let isValueValid = false;
  let isFormValid = false;
  $$result.css.add(css$1);
  {
    {
      name = name.toUpperCase();
      value = value.trim();
      isKeyValid = !!name.match(SECRET_KEY_REGEX);
      isValueValid = value.length > 0;
      isFormValid = isKeyValid && isValueValid;
      console.log({ isFormValid });
    }
  }
  $$unsubscribe_items();
  return ` <div class="container svelte-g46rd"><h2 class="svelte-g46rd" data-svelte-h="svelte-yrg31t">Add an Environment Variable</h2> <section class="svelte-g46rd">  <label class="svelte-g46rd"><span data-svelte-h="svelte-15ueaex">Name</span> <input class="form-control svelte-g46rd" required type="text"${add_attribute("value", name, 0)}></label> <label class="svelte-g46rd"><span data-svelte-h="svelte-1m1flux">Value</span> <input class="form-control svelte-g46rd" placeholder="" type="password"${add_attribute("value", value, 0)}></label>  <button class="btn btn-primary" aria-label="Create entry" aria-describedby="description" ${!isFormValid ? "disabled" : ""}>Add</button> ${!isKeyValid && name.length > 0 ? `<div class="text-danger" data-svelte-h="svelte-7m65o9">All key names must be upper case, alphanumeric, and may include
        underscore (_).</div>` : ``}</section> </div>`;
});
const List_svelte_svelte_type_style_lang = "";
const css = {
  code: "main.svelte-1yauco9.svelte-1yauco9{display:grid;justify-content:center;grid-template-columns:repeat(auto-fill, 150px);grid-auto-rows:150px;grid-gap:2rem}article.svelte-1yauco9.svelte-1yauco9{display:flex;flex-direction:column;justify-content:center;align-items:center;background:hsla(240, 25%, 50%, 0.1);border:5px solid currentColor;border-radius:25px;position:relative}article.svelte-1yauco9 h2.svelte-1yauco9{font-weight:400;font-size:10pt}article.svelte-1yauco9 .value.svelte-1yauco9{font-size:10pt;text-overflow:ellipsis;white-space:nowrap;font-weight:700;overflow:hidden;width:100%;padding-left:5px;padding-right:5px}article.svelte-1yauco9 button.svelte-1yauco9{position:absolute;top:0%;right:0%;transform:translate(50%, -50%);background:none;border:none;border-radius:50%;width:1.5rem;height:1.5rem;color:inherit;background:currentColor;box-shadow:0 0 0 0.5rem hsl(240, 25%, 20%)}article.svelte-1yauco9 button svg.svelte-1yauco9{display:block;width:100%;height:100%;color:hsl(240, 25%, 20%)}",
  map: null
};
const List = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $items, $$unsubscribe_items;
  $$unsubscribe_items = subscribe(items, (value) => $items = value);
  $$result.css.add(css);
  $$unsubscribe_items();
  return `${$items.length > 0 ? ` <section> <main class="svelte-1yauco9">${each($items, (item) => {
    return `<article style="${"border-color: " + escape(item.color, true)}" class="svelte-1yauco9"><h2 class="svelte-1yauco9">${escape(item.name)}</h2> <div class="value svelte-1yauco9">${escape(item.value.slice(0, 2))}${escape(item.value.slice(2).replaceAll(/./g, "*"))}</div>  <button aria-label="Delete" class="svelte-1yauco9" data-svelte-h="svelte-t46hlx"><svg viewBox="0 0 100 100" width="30" height="30" class="svelte-1yauco9"><use href="#delete"></use></svg></button> </article>`;
  })}</main></section>` : ``}`;
});
const SvgIcons = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return ` <svg viewBox="0 0 100 100" width="40" height="40" style="display: none;"><symbol id="add"><g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><path d="M 50 35 v 30 m -15 -15 h 30"></path></g></symbol><symbol id="create"><g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><g transform="translate(76 24)"><path d="M -20 0 h -37.5 a 15 15 0 0 0 -15 15 v 42.5 a 15 15 0 0 0 15 15 h 42.5 a 15 15 0 0 0 15 -15 v -37.5"></path><circle cx="0" cy="0" r="20"></circle><path stroke-width="5" d="M 0 -7 v 14 m -7 -7 h 14"></path></g></g></symbol><symbol id="list"><g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><path d="M 50 35 h 20"></path><path d="M 30 50 h 40"></path><path d="M 30 65 h 20"></path></g></symbol><symbol id="delete"><g transform="translate(50 50)"><g transform="rotate(45)"><g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"><path d="M 0 -20 v 40 m -20 -20 h 40"></path></g></g></g></symbol><symbol id="highlight"><g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"><path d="M 35 65 v -7.5"></path><path d="M 50 65 v -15"></path><path d="M 65 65 v -30"></path></g></symbol></svg>`;
});
const Secrets = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_instance;
  let $items, $$unsubscribe_items;
  $$unsubscribe_instance = subscribe(instance, (value) => value);
  $$unsubscribe_items = subscribe(items, (value) => $items = value);
  logger().create(`Secrets.svelte`);
  const cm = createCleanupManager();
  onDestroy(cm.shutdown);
  $$unsubscribe_instance();
  $$unsubscribe_items();
  return `${validate_component(AccordionItem, "AccordionItem").$$render($$result, { title: "Secrets" }, {}, {
    default: () => {
      return `<p data-svelte-h="svelte-6kx94n">These secrets are passed into your <code>pocketbase</code> executable and
    can be accessed from <code>pb_hooks</code> JS hooks.</p> ${validate_component(CodeSample, "CodeSample").$$render(
        $$result,
        {
          code: $items.map((secret) => `const ${secret.name} = process.env.${secret.name}`).join("\n")
        },
        {},
        {}
      )} ${validate_component(SvgIcons, "SvgIcons").$$render($$result, {}, {}, {})} ${validate_component(Form, "Form").$$render($$result, {}, {}, {})} ${validate_component(List, "List").$$render($$result, {}, {}, {})}`;
    }
  })}`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $instance, $$unsubscribe_instance;
  $$unsubscribe_instance = subscribe(instance, (value) => $instance = value);
  assertExists($instance, `Expected instance here`);
  const { subdomain, maintenance } = $instance;
  $$unsubscribe_instance();
  return `${$$result.head += `<!-- HEAD_svelte-9kv450_START -->${$$result.title = `<title>${escape(subdomain)} details - PocketHost</title>`, ""}<!-- HEAD_svelte-9kv450_END -->`, ""} ${$instance ? `${$instance.maintenance ? `<div class="text-warning" data-svelte-h="svelte-1vp9dn7">This instance is in Maintenance Mode and will not respond to requests.</div>` : ``} <div class="accordion" id="accordionExample">${validate_component(Overview, "Overview").$$render($$result, {}, {}, {})} ${validate_component(Ftpx, "Ftp").$$render($$result, {}, {}, {})} ${validate_component(Code, "Code").$$render($$result, {}, {}, {})} ${validate_component(Secrets, "Secrets").$$render($$result, {}, {}, {})} ${validate_component(Logging, "Logging").$$render($$result, {}, {}, {})} ${validate_component(Danger, "Danger").$$render($$result, {}, {}, {})}</div>` : ``}`;
});
export {
  Page as default
};
