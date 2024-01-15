import { spawn } from "child_process";

const getMetadata = (path: string) => {
  return new Promise((resolve, reject) => {
    const args = [
      "-i",
      path,
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      "-hide_banner",
    ];

    const process = spawn("ffprobe", args);

    let output = "";
    process.stdout.on("data", (data) => {
      output += data.toString();
    });

    process.stderr.on("data", (data) => {
      reject(data.toString());
    });

    process.on("close", (code) => {
      if (code === 0) {
        try {
          const parsedOutput = JSON.parse(output);
          resolve(parsedOutput);
        } catch (e) {
          reject(e);
        }
      } else {
        reject(`Process exited with code ${code}`);
      }
    });
  });
};

export { getMetadata };
