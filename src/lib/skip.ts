import db from "../db";

const logSkip = (data: {
  guild_id: string;
  yt_id: string;
  timestamp: number;
  user_id: string;
}) => {
  return db("skips").insert(data);
};

export { logSkip };
