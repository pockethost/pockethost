import { c as create_ssr_component, b as subscribe } from "./ssr.js";
import "./env.js";
import "chalk";
import "bottleneck";
import "ajv";
import "pocketbase";
import { w as writable } from "./index.js";
const isUserLoggedIn = writable(false);
const isUserVerified = writable(false);
const isAuthStateInitialized = writable(false);
const AuthStateGuard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $isAuthStateInitialized, $$unsubscribe_isAuthStateInitialized;
  $$unsubscribe_isAuthStateInitialized = subscribe(isAuthStateInitialized, (value) => $isAuthStateInitialized = value);
  $$unsubscribe_isAuthStateInitialized();
  return `${$isAuthStateInitialized ? `${slots.default ? slots.default({}) : ``}` : ``}`;
});
export {
  AuthStateGuard as A,
  isUserVerified as a,
  isUserLoggedIn as i
};
