import { AudioResource, createAudioResource } from "@discordjs/voice";
import { getOrCreateMetadata } from "../util/metadata.js";
import { downloadById } from "../platforms/youtube.js";

const TARGET_LOUDNESS_LUFS = -14;

const audioResources: Record<string, AudioResource> = {};

class AudioResourceManager {
  static async createAudioResource(
    youtubeId: string
  ): Promise<AudioResource | null> {
    if (audioResources[youtubeId]) {
      console.log(`Using cached audio resource for "${youtubeId}"`);
      return audioResources[youtubeId];
    }
    console.time("Create audio resource");
    const result = await downloadById(youtubeId);
    if (!result) return null;
    const metadata = await getOrCreateMetadata(result.details.id);
    const audioResource = await createAudioResource(result.filePath, {
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
    console.timeEnd("Create audio resource");
    audioResources[youtubeId] = audioResource;
    return audioResource;
  }
}

export default AudioResourceManager;
