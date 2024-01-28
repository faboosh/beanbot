// import { encode } from "@msgpack/msgpack";
// import { readFileSync, readdirSync, writeFileSync } from "fs";

import db from "../db.js";
import InteractionService from "../lib/MusicPlayer/modules/InteractionService.js";
import { getOrCreateMetadata } from "../lib/MusicPlayer/util/metadata.js";
import { encrypt } from "../lib/crypto.js";
const guildId = "555418700123996163";
const main = async () => {
  const interactionService = new InteractionService(guildId);
  const plays = await interactionService.getPlays();
  await db("plays").limit(10);
  console.log(plays);

  process.exit(0);
};

main();
