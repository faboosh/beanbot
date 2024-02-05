import db from "../../../db.js";
import Cache from "../../Cache.js";
import { getLoudness } from "./ffmpeg.js";
import { getTitleData } from "../platforms/spotify.js";
import { downloadById } from "../platforms/youtube.js";
const computeMetadata = async (youtubeId)=>{
    try {
        const result = await downloadById(youtubeId);
        if (!result) throw new Error("Could not download");
        const lengthSeconds = result.details.duration;
        const [lufs, titleData] = await Promise.all([
            getLoudness(result.filePath),
            getTitleData(youtubeId)
        ]);
        var _titleData_yt_title, _titleData_yt_author, _titleData_spotify_title, _titleData_spotify_author;
        const data = {
            yt_id: youtubeId,
            length_seconds: lengthSeconds,
            lufs: lufs,
            yt_title: (_titleData_yt_title = titleData === null || titleData === void 0 ? void 0 : titleData.yt_title) !== null && _titleData_yt_title !== void 0 ? _titleData_yt_title : "",
            yt_author: (_titleData_yt_author = titleData === null || titleData === void 0 ? void 0 : titleData.yt_author) !== null && _titleData_yt_author !== void 0 ? _titleData_yt_author : "",
            spotify_title: (_titleData_spotify_title = titleData === null || titleData === void 0 ? void 0 : titleData.spotify_title) !== null && _titleData_spotify_title !== void 0 ? _titleData_spotify_title : null,
            spotify_author: (_titleData_spotify_author = titleData === null || titleData === void 0 ? void 0 : titleData.spotify_author) !== null && _titleData_spotify_author !== void 0 ? _titleData_spotify_author : null
        };
        await db("song_metadata").insert(Object.fromEntries(Object.entries(data).filter(([_key, val])=>!!val))).onConflict("yt_id").merge();
        return data;
    } catch (e) {
        console.error(e);
        return null;
    }
};
const MetadataCache = new Cache("song-metadata");
const getMetadata = async (youtubeId)=>{
    const cachedMetadata = MetadataCache.get(youtubeId);
    if (cachedMetadata) return cachedMetadata;
    const metadata = await db("song_metadata").select("yt_id", "lufs", "length_seconds", "yt_title", "yt_author", "spotify_title", "spotify_author").where({
        yt_id: youtubeId
    }).whereNotNull("yt_title").whereNotNull("lufs").whereNotNull("length_seconds").whereNot("yt_title", "");
    if (metadata === null || metadata === void 0 ? void 0 : metadata[0]) {
        MetadataCache.set(youtubeId, metadata[0]);
        return metadata[0];
    }
    return null;
};
const getOrCreateMetadata = async (youtubeId)=>{
    console.log(youtubeId);
    console.time("Get/create metadata");
    const metadata = await getMetadata(youtubeId);
    if (metadata) {
        console.timeEnd("Get/create metadata");
        return metadata;
    }
    const computedMetadata = await computeMetadata(youtubeId);
    if (computedMetadata) MetadataCache.set(youtubeId, computedMetadata);
    console.timeEnd("Get/create metadata");
    return computedMetadata;
};
const getTitleAuthor = async (youtubeId)=>{
    console.time("Get title & author");
    const metadata = await getOrCreateMetadata(youtubeId);
    if (!metadata) return {
        title: "Could not get title",
        author: "Could not get author"
    };
    console.timeEnd("Get title & author");
    var _ref, _ref1;
    return {
        title: (_ref = metadata.spotify_title ? metadata.spotify_title : metadata.yt_title) !== null && _ref !== void 0 ? _ref : "",
        author: (_ref1 = metadata.spotify_author ? metadata.spotify_author : metadata.yt_author) !== null && _ref1 !== void 0 ? _ref1 : ""
    };
};
export { computeMetadata, getOrCreateMetadata, getMetadata, getTitleAuthor };
