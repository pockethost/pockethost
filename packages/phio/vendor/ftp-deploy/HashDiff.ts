import { IDiff, IFileList, Record } from "./types";
import fs from "fs";
import crypto from "crypto";

export async function fileHash(filename: string, algorithm: "md5" | "sha1" | "sha256" | "sha512"): Promise<string> {
    return new Promise((resolve, reject) => {
        // Algorithm depends on availability of OpenSSL on platform
        // Another algorithms: "sha1", "md5", "sha256", "sha512" ...
        let shasum = crypto.createHash(algorithm);
        try {
            let s = fs.createReadStream(filename);
            s.on("data", function (data: any) {
                shasum.update(data)
            });

            s.on("error", function (error) {
                reject(error);
            });

            // making digest
            s.on("end", function () {
                const hash = shasum.digest("hex")
                return resolve(hash);
            });
        }
        catch (error) {
            return reject("calc fail");
        }
    });
}

export class HashDiff implements IDiff {
    getDiffs(localFiles: IFileList, serverFiles: IFileList) {
        const uploadList: Record[] = [];
        const deleteList: Record[] = [];
        const replaceList: Record[] = [];

        const sameList: Record[] = [];

        let sizeUpload = 0;
        let sizeDelete = 0;
        let sizeReplace = 0;

        // alphabetize each list based off path
        const localFilesSorted = localFiles.data.sort((first, second) => first.name.localeCompare(second.name));
        const serverFilesSorted = serverFiles.data.sort((first, second) => first.name.localeCompare(second.name));

        let localPosition = 0;
        let serverPosition = 0;
        while (localPosition + serverPosition < localFilesSorted.length + serverFilesSorted.length) {
            let localFile: Record | undefined = localFilesSorted[localPosition];
            let serverFile: Record | undefined = serverFilesSorted[serverPosition];

            let fileNameCompare = 0;
            if (localFile === undefined) {
                fileNameCompare = 1;
            }
            if (serverFile === undefined) {
                fileNameCompare = -1;
            }
            if (localFile !== undefined && serverFile !== undefined) {
                fileNameCompare = localFile.name.localeCompare(serverFile.name);
            }

            if (fileNameCompare < 0) {
                uploadList.push(localFile);
                sizeUpload += localFile.size ?? 0;
                localPosition += 1;
            }
            else if (fileNameCompare > 0) {
                deleteList.push(serverFile);
                sizeDelete += serverFile.size ?? 0;
                serverPosition += 1;
            }
            else if (fileNameCompare === 0) {
                // paths are a match
                if (localFile.type === "file" && serverFile.type === "file") {
                    if (localFile.hash === serverFile.hash) {
                        sameList.push(localFile);
                    }
                    else {
                        sizeReplace += localFile.size ?? 0;
                        replaceList.push(localFile);
                    }
                }

                localPosition += 1;
                serverPosition += 1;
            }
        }

        // optimize modifications
        let foldersToDelete = deleteList.filter((item) => item.type === "folder");

        // remove files/folders that have a nested parent folder we plan on deleting
        const optimizedDeleteList = deleteList.filter((itemToDelete) => {
            const parentFolderIsBeingDeleted = foldersToDelete.find((folder) => {
                const isSameFile = itemToDelete.name === folder.name;
                const parentFolderExists = itemToDelete.name.startsWith(folder.name);

                return parentFolderExists && !isSameFile;
            }) !== undefined;

            if (parentFolderIsBeingDeleted) {
                // a parent folder is being deleted, no need to delete this one
                return false;
            }

            return true;
        });

        return {
            upload: uploadList,
            delete: optimizedDeleteList,
            replace: replaceList,
            same: sameList,
            sizeDelete,
            sizeReplace,
            sizeUpload
        };
    }
}
