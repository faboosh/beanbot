import { AudioResource, createAudioResource } from "@discordjs/voice";
import { downloadById } from "../platforms/youtube.js";
import SongMetadataService from "./SongMetadataService.js";
import perf from "../../perf.js";

const TARGET_LOUDNESS_LUFS = -14;

const audioResources: Record<string, AudioResource> = {};

class AudioResourceManager {
  @perf
  static async createAudioResource(
    youtubeId: string
  ): Promise<AudioResource | null> {
    if (audioResources[youtubeId]) {
      console.log(`Using cached audio resource for "${youtubeId}"`);
      return audioResources[youtubeId];
    }
    const fileName = await downloadById(youtubeId);
    if (!fileName) return null;
    const metadata = await SongMetadataService.getOrCreatePlaybackMetadata(
      youtubeId
    );
    const audioResource = await createAudioResource(`./download/${fileName}`, {
      inlineVolume: true,
    });

    if (
      metadata &&
      metadata.lufs !== null &&
      metadata.lufs !== undefined &&
      audioResource.volume
    ) {
      const volumeDiff = TARGET_LOUDNESS_LUFS - metadata.lufs;
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
