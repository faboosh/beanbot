function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
import { VoiceConnectionStatus, entersState, joinVoiceChannel } from "@discordjs/voice";
import { logMessage } from "../../log.js";
class VoiceConnectionManager {
    onConnectedStatusChanged(callback) {
        this.connectedStatusChangedCallback = callback;
    }
    async tryConnect() {
        if (this.connected) return;
        this.voiceConnection = joinVoiceChannel({
            channelId: this.channelId,
            guildId: this.guild.id,
            adapterCreator: this.guild.voiceAdapterCreator
        });
        this.voiceConnection.on(VoiceConnectionStatus.Ready, ()=>{
            this.setConnectedStatus(true);
        });
        this.voiceConnection.on(VoiceConnectionStatus.Disconnected, ()=>{
            this.setConnectedStatus(false);
        });
        await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 5000);
        logMessage(`Voice connection to channel ${this.channelId} ready`);
    }
    setConnectedStatus(connectedStatus) {
        this.connected = connectedStatus;
        if (this.connectedStatusChangedCallback) this.connectedStatusChangedCallback(connectedStatus);
    }
    destroy() {
        var _this_voiceConnection;
        (_this_voiceConnection = this.voiceConnection) === null || _this_voiceConnection === void 0 ? void 0 : _this_voiceConnection.destroy(true);
    }
    async ensureConnected() {
        if (!this.connected) await this.tryConnect();
    }
    getGuild() {
        return this.guild;
    }
    getVoiceChannelId() {
        return this.channelId;
    }
    async getCurrentVoiceMembers() {
        const channel = await this.guild.channels.fetch(this.channelId);
        const usersIds = channel.members.map((member)=>member.user.id);
        return usersIds;
    }
    getVoiceConnection() {
        return this.voiceConnection;
    }
    constructor(guild, channelId){
        _define_property(this, "voiceConnection", void 0);
        _define_property(this, "connected", false);
        _define_property(this, "guild", void 0);
        _define_property(this, "channelId", void 0);
        _define_property(this, "connectedStatusChangedCallback", void 0);
        this.guild = guild;
        this.channelId = channelId;
    }
}
export default VoiceConnectionManager;
