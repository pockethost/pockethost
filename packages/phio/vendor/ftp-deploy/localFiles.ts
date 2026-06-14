import { Record, IFileList, syncFileDescription, currentSyncFileVersion, IFtpDeployArgumentsWithDefaults } from "./types";
import { fileHash } from "./HashDiff";
import { globSync} from 'glob'
import { lstatSync } from "fs";
import { ILogger } from "./utilities";

export async function getLocalFiles(args: IFtpDeployArgumentsWithDefaults, logger: ILogger): Promise<IFileList> {
    const files = globSync(args['include'], {ignore: args['exclude'], cwd: args['local-dir'], });
    logger.verbose(`Local files:`, JSON.stringify({files},null,2));

    const records: Record[] = [];

    for (const path of files) {
        const stat = lstatSync(path);
        if (stat.isDirectory()) {
            records.push({
                type: "folder",
                name: path,
                size: undefined
            });

            continue;
        }

        if (stat.isFile()) {
            records.push({
                type: "file",
                name: path,
                size: stat.size,
                hash: await fileHash(args["local-dir"] + path, "sha256")
            });

            continue;
        }

        if (stat.isSymbolicLink()) {
            console.warn("This script is currently unable to handle symbolic links - please add a feature request if you need this");
        }
    }

    return {
        description: syncFileDescription,
        version: currentSyncFileVersion,
        generatedTime: new Date().getTime(),
        data: records
    };
}
