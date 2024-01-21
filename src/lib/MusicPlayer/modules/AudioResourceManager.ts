import { AudioResource, createAudioResource } from "@discordjs/voice";
import { getOrCreateMetadata } from "../util/metadata";
import { downloadById } from "../platforms/youtube";
const TARGET_LOUDNESS_LUFS = -14;

class AudioResourceManager {
  static async createAudioResource(
    youtubeId: string
  ): Promise<AudioResource | null> {
    console.time("Download");
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
      console.log(
        `Adjusted track by: ${volumeDiff}dB\nOriginal LUFS: ${metadata.lufs}`
      );
      audioResource.volume.setVolumeDecibels(volumeDiff);
    }
    console.timeEnd("Download");

    return audioResource;
  }
}

export default AudioResourceManager;
