import { Innertube } from "youtubei.js";
import * as fs from "fs";
import Cache from "../../Cache.js";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { isMP4File } from "../../audioFormat.js";
import { logMessage } from "../../log.js";
function slugify(str) {
    return String(str).normalize("NFKD") // split accented characters into their base characters and diacritical marks
    .replace(/[\u0300-\u036f]/g, "") // remove all the accents, which happen to be all in the \u03xx UNICODE block.
    .trim() // trim leading or trailing whitespace
    .toLowerCase() // convert to lowercase
    .replace(/[^a-z0-9 -]/g, "") // remove non-alphanumeric characters
    .replace(/\s+/g, "-") // replace spaces with hyphens
    .replace(/-+/g, "-"); // remove consecutive hyphens
}
const generateFilename = (videoId, videoTitle)=>{
    const fileName = `${slugify(`${videoTitle}`)}-${videoId}.m4a`;
    const fullPath = `${process.env.DOWNLOAD_FOLDER}/${fileName}`;
    return {
        fileName,
        fullPath
    };
};
var _process_env_YT_PROXY_URLS;
const proxyUrls = JSON.parse((_process_env_YT_PROXY_URLS = process.env.YT_PROXY_URLS) !== null && _process_env_YT_PROXY_URLS !== void 0 ? _process_env_YT_PROXY_URLS : "null");
logMessage(`Proxy urls:`, proxyUrls);
if (!proxyUrls) throw new Error("No proxy urls found");
const VideoDetailCache = new Cache("youtube-video-details");
const downloadById = async (videoId)=>{
    // const yt = await Innertube.create();
    let details = await getVideoDetails(videoId);
    if (!details) {
        logMessage("No video details found");
        return null;
    }
    const filePath = generateFilename(videoId, details.title);
    if (fs.existsSync(filePath.fullPath) && await isMP4File(filePath.fullPath)) return filePath.fileName;
    const data = new FormData();
    data.set("download_widget", '{"itag":140,"ext":"mp4"}');
    data.set("title", details.title);
    data.set("id", details.id);
    if (!proxyUrls) throw new Error("No proxy urls found");
    for (const proxyUrl of proxyUrls){
        logMessage(`Trying proxy url: ${proxyUrl}`);
        const res = await fetch(`${proxyUrl}/download`, {
            method: "POST",
            body: data
        });
        if (!res.body) throw new Error("No body");
        const dest = fs.createWriteStream(filePath.fullPath);
        const nodeReadableStream = Readable.fromWeb(res.body);
        await pipeline(nodeReadableStream, dest);
        const isMp4 = await isMP4File(filePath.fullPath);
        logMessage(`isMp4: ${isMp4}`);
        if (isMp4) return filePath.fileName;
    }
    logMessage("Failed to download file, no proxies returned valid file");
    return null;
// const stream = await yt.download(videoId as string, {
//   type: "audio", // audio, video or video+audio
//   quality: "best", // best, bestefficiency, 144p, 240p, 480p, 720p and so on.
//   format: "mp4", // media container format
// });
// let bytesWritten = 0;
// let startTime = performance.now();
// const file = fs.createWriteStream(filePath.fullPath);
// for await (const chunk of Utils.streamToIterable(stream)) {
//   bytesWritten += chunk.length;
//   file.write(chunk);
// }
// file.on("finish", () => {
//   let endTime = performance.now();
//   let durationInSeconds = (endTime - startTime) / 1000;
//   let speedBytesPerSecond = bytesWritten / durationInSeconds;
//   let speedKbps = speedBytesPerSecond / 1024;
//   console.log(`Total bytes written: ${bytesWritten}`);
//   console.log(`Total time: ${durationInSeconds.toFixed(2)} seconds`);
//   console.log(`Speed: ${speedKbps.toFixed(2)} KB/s`);
// });
// file.end();
};
const getTopResult = async (query)=>{
    var _res_results_filter, _res_results;
    const yt = await Innertube.create();
    const res = await yt.search(query);
    const video = (_res_results = res.results) === null || _res_results === void 0 ? void 0 : (_res_results_filter = _res_results.filter((node)=>node.type === "Video")) === null || _res_results_filter === void 0 ? void 0 : _res_results_filter[0];
    if (!video) return;
    // @ts-ignore
    const videoId = video.id;
    return videoId;
};
const getThumbnail = async (youtubeId)=>{
    const result = await getVideoDetails(youtubeId);
    if (!result) return "";
    return result.thumbnail[0].url;
};
const search = async (query)=>{
    const yt = await Innertube.create();
    const res = await yt.search(query);
    if (!res.results) return [];
    return res.results.filter((node)=>node.type === "Video");
};
const getVideoDetails = async (videoId)=>{
    const yt = await Innertube.create();
    let details;
    if (VideoDetailCache.isValid(videoId)) {
        details = VideoDetailCache.get(videoId);
    } else {
        var _page__video_details;
        details = (_page__video_details = (await yt.getInfo(videoId)).page[0].video_details) !== null && _page__video_details !== void 0 ? _page__video_details : null;
        if (details) VideoDetailCache.set(videoId, details);
    }
    return details;
};
export { getTopResult, downloadById, VideoDetailCache, getThumbnail, search, getVideoDetails };
