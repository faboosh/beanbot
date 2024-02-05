function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
import { createAudioResource } from "@discordjs/voice";
import { downloadById } from "../platforms/youtube.js";
import SongMetadataService from "./SongMetadataService.js";
import perf from "../../perf.js";
import { log, logMessage } from "../../log.js";
const TARGET_LOUDNESS_LUFS = -14;
const audioResources = {};
class AudioResourceManager {
    static async createAudioResource(youtubeId) {
        if (audioResources[youtubeId]) {
            logMessage(`Using cached audio resource for "${youtubeId}"`);
            return audioResources[youtubeId];
        }
        const fileName = await downloadById(youtubeId);
        if (!fileName) return null;
        const metadata = await SongMetadataService.getOrCreatePlaybackMetadata(youtubeId);
        const audioResource = await createAudioResource(`${process.env.DOWNLOAD_FOLDER}/${fileName}`, {
            inlineVolume: true
        });
        if (metadata && metadata.loudnessLufs !== null && metadata.loudnessLufs !== undefined && audioResource.volume) {
            const volumeDiff = TARGET_LOUDNESS_LUFS - metadata.loudnessLufs;
            // console.log(
            //   `Adjusted track by: ${volumeDiff}dB\nOriginal LUFS: ${metadata.lufs}`
            // );
            audioResource.volume.setVolumeDecibels(volumeDiff);
        }
        audioResources[youtubeId] = audioResource;
        return audioResource;
    }
}
_ts_decorate([
    log,
    perf,
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AudioResourceManager, "createAudioResource", null);
export default AudioResourceManager;
