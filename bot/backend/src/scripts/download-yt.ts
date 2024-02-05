import fs from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
const url = "https://invidious.flokinet.to";
const youtubeId = "kIBdpFJyFkc";

const main = async () => {
  const data = new FormData();

  data.set("download_widget", '{"itag":251,"ext":"webm"}');
  data.set("title", "test");
  data.set("id", youtubeId);
  await fetch(`${url}/download`, {
    method: "POST",
    body: data,
  }).then(async (res) => {
    if (!res.body) throw new Error("No body");
    const dest = fs.createWriteStream("./tmp.webm");
    const nodeReadableStream = Readable.fromWeb(res.body);

    await pipeline(nodeReadableStream, dest);
  });
};

main();
