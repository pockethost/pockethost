import { D as DEV } from "./prod-ssr.js";
import { p as public_env } from "./shared-server.js";
import chalk from "chalk";
import "bottleneck";
import { customAlphabet } from "nanoid";
import Ajv from "ajv";
import "pocketbase";
import { boolean } from "boolean";
import UrlPattern from "url-pattern";
const dev = DEV;
const mkSingleton = (factory) => {
  let _service = void 0;
  return (config) => {
    if (_service && config) {
      throw new Error(`Attempted to initialize service twice`);
    }
    if (!_service) {
      if (!config) {
        throw new Error(`Attempted to use service before initialization`);
      }
      _service = factory(config);
    }
    return _service;
  };
};
const MAX_BUF = 1e3;
let _curIdx = 0;
const _buf = [];
const createLogger = (config) => {
  const _config = {
    raw: false,
    debug: true,
    trace: false,
    errorTrace: false,
    pfx: [""],
    ...config
  };
  const { pfx, errorTrace } = _config;
  const _pfx = (s) => [(/* @__PURE__ */ new Date()).toISOString(), s, ...pfx].filter((v) => !!v).map((p) => `[${p}]`).join(" ");
  const _log = (fn = "log", shouldDisplay, ...args) => {
    if (_buf.length < MAX_BUF) {
      _buf.push(args);
    } else {
      _buf[_curIdx] = args;
      _curIdx++;
      if (_curIdx === MAX_BUF)
        _curIdx = 0;
    }
    if (shouldDisplay)
      console[fn](
        ...args.map((arg) => {
          const t = typeof arg;
          if (t === "string" && !!arg.match(/\n/)) {
            return JSON.stringify(arg, null, 2);
          }
          if (t === "function") {
            return `<<function ${JSON.stringify(arg.toString())}>>`;
          }
          if (t === "object") {
            return JSON.stringify(arg, null, 2);
          }
          return arg;
        })
      );
  };
  const raw = (...args) => {
    _log("log", _config.raw, _pfx("RAW"), ...args);
  };
  const dbg = (...args) => {
    _log("debug", _config.debug, _pfx(chalk.blueBright("DBG")), ...args);
  };
  const warn = (...args) => {
    _log("warn", true, _pfx(chalk.yellow(chalk.cyanBright("WARN"))), ...args);
  };
  const info = (...args) => {
    _log("log", true, _pfx(chalk.gray(`INFO`)), ...args);
  };
  const trace = (...args) => {
    _log("trace", _config.trace, _pfx(`TRACE`), ...args);
  };
  const error = (...args) => {
    _log("error", true, _pfx(chalk.bgRed(`ERROR`)), ...args);
    if (!errorTrace)
      return;
    console.error(`========== ERROR TRACEBACK BEGIN ==============`);
    [..._buf.slice(_curIdx, MAX_BUF), ..._buf.slice(0, _curIdx)].forEach(
      (args2) => {
        console.error(...args2);
      }
    );
    console.error(`========== ERROR TRACEBACK END ==============`);
  };
  const abort = (...args) => {
    _log("error", true, _pfx(chalk.bgRed(`ABORT`)), ...args);
    throw new Error(`Fatal error: ${JSON.stringify(args)}`);
  };
  const create = (s, configOverride) => createLogger({
    ..._config,
    ...configOverride,
    pfx: [..._config.pfx, s]
  });
  const breadcrumb = (s) => {
    pfx.push(s);
    return api;
  };
  const child = (extra) => create(JSON.stringify(extra));
  const api = {
    raw,
    dbg,
    warn,
    info,
    error,
    create,
    child,
    trace,
    debug: dbg,
    breadcrumb,
    abort,
    shutdown() {
      dbg(`Logger shutting down`);
    }
  };
  return api;
};
const logger = mkSingleton((config) => createLogger(config));
customAlphabet("abcdefghijklmnopqrstuvwxyz");
new Ajv();
const publicRoutes = [
  "/",
  "/docs(/*)",
  "/signup",
  "/login",
  "/login/password-reset",
  "/login/password-reset/confirm",
  "/login/confirm-account",
  "/faq"
];
const name = "pockethost";
const version = "0.8.2";
const author = "Ben Allfree <ben@benallfree.com>";
const license = "MIT";
const scripts = {
  lint: 'prettier -c "./**/*.ts"',
  "lint:fix": 'prettier -w "./**/*.ts"',
  build: "concurrently 'yarn:build:*'",
  "build:www": "cd packages/pockethost.io && yarn build",
  "build:daemon": "cd packages/daemon && yarn build",
  dev: "NODE_ENV=development concurrently 'yarn:dev:*'",
  "dev:proxy": "cd packages/proxy && yarn dev",
  "dev:www": "cd packages/pockethost.io && yarn dev",
  "dev:daemon": "cd packages/daemon && yarn dev",
  start: "concurrently 'yarn:start:*'",
  "start:proxy": "cd packages/proxy && yarn start",
  "start:www": "cd packages/pockethost.io && yarn start",
  "start:daemon": "cd packages/daemon && yarn start",
  pm2: "concurrently 'yarn:pm2:*'",
  "pm2:proxy": "cd packages/proxy && yarn pm2",
  "pm2:www": "cd packages/pockethost.io && yarn pm2",
  "pm2:daemon": "cd packages/daemon && yarn pm2",
  postinstall: "patch-package",
  prepare: "husky install"
};
const workspaces = {
  packages: [
    "packages/*"
  ]
};
const prettier = {
  semi: false,
  useTabs: false,
  singleQuote: true,
  trailingComma: "all",
  plugins: [
    "./node_modules/prettier-plugin-organize-imports/index.js",
    "./node_modules/prettier-plugin-svelte/plugin.js"
  ]
};
const devDependencies = {
  "chokidar-cli": "^3.0.0",
  concurrently: "^8.2.1",
  "patch-package": "^8.0.0",
  prettier: "^3.0.3",
  "prettier-plugin-organize-imports": "^3.2.3",
  "prettier-plugin-svelte": "^3.0.3",
  tslib: "^2.6.2",
  tsx: "^3.12.8",
  typescript: "^5.0",
  husky: "^8.0.0"
};
const dependencies = {
  "postinstall-postinstall": "^2.1.0",
  "replace-in-file": "^7.0.1"
};
const base = {
  name,
  version,
  author,
  license,
  "private": true,
  scripts,
  workspaces,
  prettier,
  devDependencies,
  dependencies
};
const env = (name2, _default = "") => {
  const v = public_env[name2];
  if (!v)
    return _default;
  return v;
};
const envb = (name2, _default) => boolean(env(name2, _default.toString()));
env("PUBLIC_APP_DB", "pockethost-central");
const PUBLIC_APP_DOMAIN = env("PUBLIC_APP_DOMAIN", "pockethost.io");
const PUBLIC_APP_PROTOCOL = env("PUBLIC_APP_PROTOCOL", "https");
const PUBLIC_DEBUG = envb("PUBLIC_DEBUG", dev);
const PUBLIC_POCKETHOST_VERSION = base.version;
publicRoutes.map(
  (pattern) => new UrlPattern(pattern)
);
try {
  logger();
} catch {
  logger({ debug: PUBLIC_DEBUG, trace: false, errorTrace: false });
}
export {
  PUBLIC_POCKETHOST_VERSION as P,
  PUBLIC_APP_DOMAIN as a,
  PUBLIC_APP_PROTOCOL as b,
  logger as l
};
