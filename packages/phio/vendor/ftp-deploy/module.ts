import { deploy as deployCustom } from "./deploy";
import { IFtpDeployArguments } from "./types";
import { getDefaultSettings, Logger, Timings } from "./utilities";

/**
 * Default includes, everything by default
 */
export const includeDefaults = ["**/*"];

/**
 * Default excludes, ignores all git files and the node_modules folder
 * **\/.git* ignores all FILES that start with .git(in any folder or sub-folder)
 * **\/.git*\/** ignores all FOLDERS that start with .git (in any folder or sub-folder)
 * **\/node_modules\/** ignores all FOLDERS named node_modules (in any folder or sub-folder)
 */
export const excludeDefaults = ["**/.git*", "**/.git*/**", "**/node_modules/**"];

/**
 * Syncs a local folder with a remote folder over FTP. 
 * After the initial sync only differences are synced, making deployments super fast!
 */
export async function deploy(args: IFtpDeployArguments): Promise<void> {
  const argsWithDefaults = getDefaultSettings(args);
  const logger = new Logger(argsWithDefaults["log-level"]);
  const timings = new Timings();

  await deployCustom(argsWithDefaults, logger, timings);
}
