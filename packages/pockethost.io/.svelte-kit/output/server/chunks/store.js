import { values, reduce } from "@s-libs/micro-dash";
import { nanoid } from "nanoid";
import { l as logger } from "./env.js";
import { w as writable } from "./index.js";
const CLEANUP_DEFAULT_PRIORITY = 10;
const createCleanupManager = (slug) => {
  const _slug = slug || nanoid();
  const { error, warn, dbg } = logger().create(`cleanupManager:${_slug}`);
  let i = 0;
  const cleanups = {};
  const add = (cb, priority = CLEANUP_DEFAULT_PRIORITY) => {
    const idx = i++;
    const cleanup = async () => {
      await cb();
      delete cleanups[idx];
    };
    cleanups[idx] = { cleanup, priority };
    return cleanup;
  };
  let _shutdownP = void 0;
  const shutdown = () => {
    if (_shutdownP)
      return _shutdownP;
    const _cleanupFuncs = values(cleanups).sort((a, b) => a.priority - b.priority).map((v) => v.cleanup);
    _shutdownP = reduce(
      _cleanupFuncs,
      (c, v) => {
        return c.then(() => v());
      },
      Promise.resolve()
    ).catch((e) => {
      error(
        `Cleanup functions are failing. This should never happen, check all cleanup functions to make sure they are trapping their exceptions.`
      );
      throw e;
    });
    return _shutdownP;
  };
  return { add, shutdown };
};
const instance = writable();
export {
  createCleanupManager as c,
  instance as i
};
