import * as fs from "fs";
import { fileTypeFromStream } from "file-type";
import { logError } from "./log.js";
const isMP4File = async (filePath)=>{
    try {
        const fileType = await fileTypeFromStream(fs.createReadStream(filePath));
        return (fileType === null || fileType === void 0 ? void 0 : fileType.mime) === "video/mp4";
    } catch (e) {
        logError("Error while checking file type: ", e);
        return false;
    }
};
export { isMP4File };
