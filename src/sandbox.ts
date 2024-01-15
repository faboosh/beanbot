import { getLoudness } from "./lib/ffmpeg";

const main = async () => {
  const LOUD = await getLoudness(
    "./download/100-gecs-xxxiwudnvrstpuxxx-official-audio-stream-fQAjveYLtHQ.m4a"
  );

  console.log(LOUD);
  process.exit(0);
};

main();
