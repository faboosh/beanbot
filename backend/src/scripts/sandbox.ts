// import { encode } from "@msgpack/msgpack";
// import { readFileSync, readdirSync, writeFileSync } from "fs";

import { getOrCreateMetadata } from "../lib/MusicPlayer/util/metadata.js";
const youtubeId = "LqZpGYhyvr4";
const main = async () => {
  // const paths = readdirSync("./cache").map((file) => `./cache/${file}`);

  // paths.forEach((path) => {
  //   const json = readFileSync(path, { encoding: "utf-8" });
  //   const data = JSON.parse(json);
  //   writeFileSync(path.replace(".json", ".cache"), encode(data));
  // });

  console.log(await getOrCreateMetadata(youtubeId));

  process.exit(0);
};

main();
