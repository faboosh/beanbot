import * as fs from "fs";
import { fileTypeFromStream } from "file-type";
import { logError } from "./log.js";

const isMP4File = async (filePath: string) => {
  try {
    // @ts-ignore
    const fileType = await fileTypeFromStream(fs.createReadStream(filePath));
    return fileType?.mime === "video/mp4";
  } catch (e) {
    logError("Error while checking file type: ", e);
    return false;
  }
};

export { isMP4File };
