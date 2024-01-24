import "dotenv-esm/config";
import fs from "fs";
import db from "../db.js";

const main = async () => {
  const plays = await db("plays").select("*").where("imported", "=", true);
  const messages = JSON.parse(
    fs.readFileSync("./messages.backup.json", { encoding: "utf-8" })
  );

  const findMessageByTimestamp = (timestamp: number) => {
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i][1];
      if (message.createdTimestamp == timestamp) return message;
    }

    return null;
  };

  for (let i = 0; i < plays.length; i++) {
    const play = plays[i];
    const timestamp = play.timestamp;
    const message = findMessageByTimestamp(timestamp);

    if (!message) continue;
    const updatedData = {
      user_id: message.authorId,
    };
    console.log("Updated play ", play, " with user id ", message.authorId);
    await db("plays").where({ id: play.id }).update(updatedData);
  }
  process.exit(0);
};

main();
