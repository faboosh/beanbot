import { AudioResource, createAudioResource } from "@discordjs/voice";
import { downloadById } from "../platforms/youtube.js";
import SongMetadataService from "./SongMetadataService.js";
import perf from "../../perf.js";
import { log, logMessage } from "../../log.js";

const TARGET_LOUDNESS_LUFS = -14;

const audioResources: Record<string, AudioResource> = {};

class AudioResourceManager {
  @log
  @perf
  static async createAudioResource(
    youtubeId: string
  ): Promise<AudioResource | null> {
    if (audioResources[youtubeId]) {
      logMessage(`Using cached audio resource for "${youtubeId}"`);
      return audioResources[youtubeId];
    }
    const fileName = await downloadById(youtubeId);
    if (!fileName) return null;
    const metadata = await SongMetadataService.getOrCreatePlaybackMetadata(
      youtubeId
    );
    const audioResource = await createAudioResource(
      `${process.env.DOWNLOAD_FOLDER}/${fileName}`,
      {
        inlineVolume: true,
      }
    );

    if (
      metadata &&
      metadata.loudnessLufs !== null &&
      metadata.loudnessLufs !== undefined &&
      audioResource.volume
    ) {
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

export default AudioResourceManager;
