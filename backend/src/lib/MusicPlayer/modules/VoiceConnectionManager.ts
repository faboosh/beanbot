import {
  AudioPlayer,
  VoiceConnection,
  VoiceConnectionStatus,
  entersState,
  joinVoiceChannel,
} from "@discordjs/voice";
import { Guild } from "discord.js";

class VoiceConnectionManager {
  voiceConnection?: VoiceConnection;
  connected = false;
  guild: Guild;
  channelId: string;
  connectedStatusChangedCallback?: (connectedStatus: boolean) => void;

  constructor(guild: Guild, channelId: string) {
    this.guild = guild;
    this.channelId = channelId;
  }

  onConnectedStatusChanged(callback: (connectedStatus: boolean) => void) {
    this.connectedStatusChangedCallback = callback;
  }

  async tryConnect() {
    if (this.connected) return;

    this.voiceConnection = joinVoiceChannel({
      channelId: this.channelId,
      guildId: this.guild.id,
      adapterCreator: this.guild.voiceAdapterCreator,
    });

    this.voiceConnection.on(VoiceConnectionStatus.Ready, () => {
      this.setConnectedStatus(true);
    });

    this.voiceConnection.on(VoiceConnectionStatus.Disconnected, () => {
      this.setConnectedStatus(false);
    });

    await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 5000);
    console.log(`Voice connection to channel ${this.channelId} ready`);
  }

  private setConnectedStatus(connectedStatus: boolean) {
    this.connected = connectedStatus;
    if (this.connectedStatusChangedCallback)
      this.connectedStatusChangedCallback(connectedStatus);
  }

  destroy() {
    this.voiceConnection?.destroy(true);
  }

  async ensureConnected() {
    if (!this.connected) await this.tryConnect();
  }
}

export default VoiceConnectionManager;
