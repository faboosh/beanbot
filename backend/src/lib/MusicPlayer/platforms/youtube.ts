import { Innertube, Utils } from "youtubei.js";
import * as fs from "fs";
import Cache from "../../Cache.js";

function slugify(str: string) {
  return String(str)
    .normalize("NFKD") // split accented characters into their base characters and diacritical marks
    .replace(/[\u0300-\u036f]/g, "") // remove all the accents, which happen to be all in the \u03xx UNICODE block.
    .trim() // trim leading or trailing whitespace
    .toLowerCase() // convert to lowercase
    .replace(/[^a-z0-9 -]/g, "") // remove non-alphanumeric characters
    .replace(/\s+/g, "-") // replace spaces with hyphens
    .replace(/-+/g, "-"); // remove consecutive hyphens
}

const generateFilename = (videoId: string, videoTitle: string) => {
  const fileName = `${slugify(`${videoTitle}`)}-${videoId}.m4a`;
  const fullPath = `./download/${fileName}`;

  return {
    fileName,
    fullPath,
  };
};

const VideoDetailCache = new Cache<any>("youtube-video-details");

const downloadById = async (videoId: string) => {
  const yt = await Innertube.create();
  let details = await getVideoDetails(videoId);
  if (!details) return;

  const filePath = generateFilename(videoId, details.title);

  if (fs.existsSync(filePath.fullPath)) return filePath.fileName;

  const stream = await yt.download(videoId as string, {
    type: "audio", // audio, video or video+audio
    quality: "best", // best, bestefficiency, 144p, 240p, 480p, 720p and so on.
    format: "mp4", // media container format
  });

  const file = fs.createWriteStream(filePath.fullPath);

  for await (const chunk of Utils.streamToIterable(stream)) {
    file.write(chunk);
  }

  return filePath.fileName;
};

const getTopResult = async (query: string) => {
  const yt = await Innertube.create();

  const res = await yt.search(query);
  const video = res.results?.filter((node) => node.type === "Video")?.[0];

  if (!video) return;
  // @ts-ignore
  const videoId = video.id as string;

  return videoId;
};

const getThumbnail = async (youtubeId: string): Promise<string> => {
  const result = await getVideoDetails(youtubeId);
  if (!result) return "";
  return result.thumbnail[0].url;
};

const search = async (query: string) => {
  const yt = await Innertube.create();

  const res = await yt.search(query);

  if (!res.results) return [];

  return res.results.filter((node) => node.type === "Video");
};

type YoutubeData = {
  id: string;
  author: string;
  title: string;
  thumbnail: { url: string }[];
  duration: number;
};

const getVideoDetails = async (videoId: string) => {
  const yt = await Innertube.create();
  let details: any | null;
  if (VideoDetailCache.isValid(videoId)) {
    details = VideoDetailCache.get(videoId);
  } else {
    details = (await yt.getInfo(videoId)).page[0].video_details ?? null;
    if (details) VideoDetailCache.set(videoId, details);
  }
  return details as YoutubeData;
};

export {
  getTopResult,
  downloadById,
  VideoDetailCache,
  getThumbnail,
  search,
  getVideoDetails,
};
