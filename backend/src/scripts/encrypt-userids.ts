import "dotenv-esm/config";
import db from "../db.js";
import { encrypt } from "../lib/crypto.js";

const main = async () => {
  console.log(`using encryption key ${process.env.encryption_key}`);
  const plays = await db("plays").select("id", "guild_id", "user_id");
  const skips = await db("skips").select("id", "guild_id", "user_id");
  console.log("Encrypting plays");
  for (let i = 0; i < plays.length; i++) {
    const element = plays[i] as {
      user_id: string;
      guild_id: string;
      id: number;
    };

    await db("plays")
      .where("id", "=", element.id)
      .update({
        guild_id: encrypt(element.guild_id),
        user_id: encrypt(element.user_id),
      })
      .catch(console.error);

    console.log(`${i + 1}/${plays.length}`);
  }

  console.log("Encrypting skips");
  for (let i = 0; i < skips.length; i++) {
    const element = skips[i] as {
      user_id: string;
      guild_id: string;
      id: number;
    };

    await db("skips")
      .where("id", "=", element.id)
      .update({
        guild_id: encrypt(element.guild_id),
        user_id: encrypt(element.user_id),
      })
      .catch(console.error);

    console.log(`${i + 1}/${skips.length}`);
  }
};

main();
