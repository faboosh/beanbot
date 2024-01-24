import { spawn } from "child_process";
import { existsSync } from "fs";

const getMetadata = (path: string) => {
  return new Promise((resolve, reject) => {
    if (!existsSync(path)) reject(new Error(`${path} does not exist`));
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

const getLoudness = (path: string) => {
  return new Promise((resolve, reject) => {
    if (!existsSync(path)) reject(new Error(`${path} does not exist`));
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      path,
      "-filter_complex",
      "ebur128=peak=true",
      "-f",
      "null",
      "-",
    ]);

    let output = "";
    ffmpeg.stderr.on("data", (data) => {
      output += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`FFmpeg exited with code ${code}`));
      }

      // Find all matches for Integrated Loudness
      const matches = [
        ...output.matchAll(/Integrated loudness:\s+I:\s+(-?\d+\.?\d*) LUFS/gm),
      ];

      if (matches.length > 0) {
        // Get the last match (the 2nd block of Integrated Loudness)
        const lastMatch = matches[matches.length - 1];
        resolve(Number(lastMatch[1]));
      } else {
        reject(new Error("Couldn't parse integrated loudness"));
      }
    });
  });
};

export { getMetadata, getLoudness };
