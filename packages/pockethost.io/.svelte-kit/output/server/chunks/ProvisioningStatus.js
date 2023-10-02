import { c as create_ssr_component, e as escape, n as null_to_empty } from "./ssr.js";
import "./env.js";
var InstanceStatus = /* @__PURE__ */ ((InstanceStatus2) => {
  InstanceStatus2["Unknown"] = "";
  InstanceStatus2["Idle"] = "idle";
  InstanceStatus2["Port"] = "porting";
  InstanceStatus2["Starting"] = "starting";
  InstanceStatus2["Running"] = "running";
  InstanceStatus2["Failed"] = "failed";
  return InstanceStatus2;
})(InstanceStatus || {});
const ProvisioningStatus_svelte_svelte_type_style_lang = "";
const css = {
  code: ".pulse.svelte-19r9p1p{box-shadow:0 0 0 0 rgb(46, 204, 113);transform:scale(1);animation:svelte-19r9p1p-pulse 2s infinite}@keyframes svelte-19r9p1p-pulse{0%{transform:scale(0.95);box-shadow:0 0 0 0 rgba(46, 204, 113, 0.7)}70%{transform:scale(1);box-shadow:0 0 0 10px rgba(46, 204, 113, 0)}100%{transform:scale(0.95);box-shadow:0 0 0 0 rgba(46, 204, 113, 0)}}",
  map: null
};
const ProvisioningStatus = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { status = InstanceStatus.Idle } = $$props;
  let badgeColor = "bg-secondary";
  if (!status) {
    status = InstanceStatus.Idle;
  }
  const handleBadgeColor = () => {
    switch (status) {
      case "idle":
        badgeColor = "bg-secondary";
        break;
      case "porting":
        badgeColor = "bg-info";
        break;
      case "starting":
        badgeColor = "bg-warning";
        break;
      case "running":
        badgeColor = "bg-success";
        break;
      case "failed":
        badgeColor = "bg-danger";
        break;
      default:
        badgeColor = "bg-secondary";
        break;
    }
  };
  if ($$props.status === void 0 && $$bindings.status && status !== void 0)
    $$bindings.status(status);
  $$result.css.add(css);
  {
    if (status)
      handleBadgeColor();
  }
  return `<div class="${escape(null_to_empty(`badge ${badgeColor} ${status === "running" && "pulse"}`), true) + " svelte-19r9p1p"}">${escape(status)}</div>`;
});
export {
  ProvisioningStatus as P
};
