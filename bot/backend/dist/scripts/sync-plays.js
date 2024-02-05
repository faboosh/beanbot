import "dotenv-esm/config";
import fs from "fs";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { downloadById, getTopResult } from "../lib/MusicPlayer/platforms/youtube.js";
import InteractionService from "../lib/MusicPlayer/modules/InteractionService.js";
import { logError, logMessage } from "../lib/log.js";
const token = process.env.DISCORD_TOKEN;
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});
const channelId = "837399202819604543";
const guildId = "836017459982106714";
const clientID = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
if (!clientID || !clientSecret) throw new Error("Spotify Client ID or Client Secret missing");
async function getMessages(channel, limit = 100) {
    const sum_messages = [];
    let last_id;
    while(true){
        const options = {
            limit: 100
        };
        if (last_id) {
            // @ts-ignore
            options.before = last_id;
        }
        // @ts-ignore
        const messages = await channel.messages.fetch(options);
        sum_messages.push(...messages);
        last_id = messages.last().id;
        logMessage(`${sum_messages.length} messages...`);
        if (messages.size != 100 || sum_messages.length >= limit) {
            break;
        }
    }
    return sum_messages;
}
const downloadMessages = async ()=>{
    const channel = await client.channels.fetch(channelId);
    if (!channel) process.exit(0);
    const messages = await getMessages(channel, 100000);
    fs.writeFileSync("./messages.json", JSON.stringify(messages, undefined, 2), {
        encoding: "utf-8"
    });
    process.exit(0);
};
function getYoutubeVideoId(url) {
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    var match = url.match(regExp);
    return match && match[7].length == 11 ? match[7] : undefined;
}
function extractBetweenBackticks(str) {
    const regex = /`([^`]+)`/g;
    let matches = [];
    let match;
    while((match = regex.exec(str)) !== null){
        matches.push(match[1]);
    }
    return matches;
}
function extractSpotifyTrackId(url) {
    const regex = /https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/;
    const match = url.match(regex);
    // Check if the URL matched the regex
    if (match) {
        // The first capturing group contains the track ID
        return match[1];
    } else {
        // Return null or an appropriate value if the URL is not a valid Spotify track link
        return null;
    }
}
const extractCommandArgs = (str)=>{
    let parts = str.split(" ", 2); // Splits the string into two parts
    if (!parts.length) return null;
    let firstPart = parts[0]; // The part before the first space
    let remainingPart = str.substring(firstPart.length + 1); // The rest of the string after the first space
    if (!remainingPart) return null;
    return remainingPart;
};
const messageParsers = [
    {
        name: "Jockie (Text)",
        test: (message)=>/^m!p/gm.test(message.content),
        parse: (message)=>{
            return extractCommandArgs(message.content);
        }
    },
    {
        name: "Tempo/Rhythm/Groovy (Text)",
        test: (message)=>/^-play/gm.test(message.content) || /^-p/gm.test(message.content),
        parse: (message)=>{
            return extractCommandArgs(message.content);
        }
    },
    {
        name: "Tempo (Command)",
        test: (message)=>/^<@[0-9]*> \| Added `/gm.test(message.content) && message.type === 20,
        parse: (message)=>{
            return extractBetweenBackticks(message.content).join(" ");
        }
    },
    {
        name: "Vibr (Command)",
        test: (message)=>{
            var _message_embeds__description, _message_embeds_;
            return(// @ts-ignore
            (message === null || message === void 0 ? void 0 : message.authorId) === "882491278581977179" && !((_message_embeds_ = message.embeds[0]) === null || _message_embeds_ === void 0 ? void 0 : (_message_embeds__description = _message_embeds_.description) === null || _message_embeds__description === void 0 ? void 0 : _message_embeds__description.startsWith("Connected to ")));
        },
        parse: (message)=>{
            var _message_embeds, _embed_author;
            const embed = (_message_embeds = message.embeds) === null || _message_embeds === void 0 ? void 0 : _message_embeds[0];
            if (!embed) return null;
            const title = embed.title;
            const author = embed === null || embed === void 0 ? void 0 : (_embed_author = embed.author) === null || _embed_author === void 0 ? void 0 : _embed_author.name;
            if (!title || !author) return null;
            return `${title} ${author}`;
        }
    },
    {
        name: "Vexera (Text)",
        test: (message)=>/^!p/gm.test(message.content) || /^!play/gm.test(message.content),
        parse: (message)=>{
            return extractCommandArgs(message.content);
        }
    }
];
const spotifySDK = SpotifyApi.withClientCredentials(clientID, clientSecret);
const urlParsers = [
    {
        name: "YouTube",
        test: (str)=>{
            const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
            return ytRegex.test(str);
        },
        parse: async (str)=>{
            return str;
        }
    },
    {
        name: "Spotify",
        test: (str)=>{
            const spotifyRegex = /https:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/gm;
            return spotifyRegex.test(str);
        },
        parse: async (str)=>{
            const trackID = extractSpotifyTrackId(str);
            if (!trackID) return null;
            try {
                const res = await spotifySDK.tracks.get(trackID);
                const artists = res.artists.map((artist)=>artist.name).join(" ");
                const name = res.name;
                return `${name} ${artists}`;
            } catch (e) {
                logError(e);
                return null;
            }
        }
    }
];
const isUrl = (str)=>/^http/.test(str);
const getQueryFromMessage = async (message)=>{
    for(let i = 0; i < messageParsers.length; i++){
        const parser = messageParsers[i];
        if (!parser.test(message)) continue;
        logMessage(`Parsing entry from bot ${parser.name}`);
        try {
            var _parser_parse;
            const result = (_parser_parse = parser.parse(message)) === null || _parser_parse === void 0 ? void 0 : _parser_parse.trim();
            if (!result) return null;
            if (!isUrl(result)) return result;
            for(let j = 0; j < urlParsers.length; j++){
                const urlParser = urlParsers[i];
                if (!urlParser.test(result)) continue;
                try {
                    logMessage(`Trying to parse URL of type ${urlParser.name}`);
                    return await urlParser.parse(result);
                } catch (e) {
                    logError(e);
                }
            }
        } catch (e) {
            logError(`Failed parsing entry from bot ${parser.name}`);
            logError(e);
            return null;
        }
    }
    return null;
};
function timeoutPromise(milliseconds) {
    return new Promise((resolve, reject)=>{
        setTimeout(()=>{
            reject(new Error(`Timed out after ${milliseconds} ms`));
        }, milliseconds);
    });
}
function withTimeout(asyncFn, timeoutMs) {
    return Promise.race([
        asyncFn(),
        timeoutPromise(timeoutMs)
    ]);
}
const interactionService = new InteractionService(guildId);
const parseMessage = async (msg)=>{
    const content = await getQueryFromMessage(msg);
    if (!content) return logError("No viable query found");
    let id = getYoutubeVideoId(content);
    if (!id) id = await getTopResult(content);
    if (!id) return logError("No youtube ID found");
    logMessage(`Starting download for id ${id} with search "${content}"`);
    const result = await downloadById(id);
    if (!result) return console.warn(`Failed download for id ${id}`);
    //TODO: Fix this error at some point lol
    // await PlaylistManager.logPlay(result.details.id, guildId, {
    //   imported: true,
    //   timestamp: msg.createdTimestamp,
    // });
    await interactionService.logPlay({
        imported: true,
        // @ts-ignore
        userId: msg.authorId,
        timestamp: new Date(msg.createdTimestamp)
    });
    logMessage(`Finished download for id ${id}`);
};
client.once(Events.ClientReady, async (readyClient)=>{
    logMessage(`Ready! Logged in as ${readyClient.user.tag}`);
    if (!fs.existsSync("./messages.json")) await downloadMessages();
    const messages = JSON.parse(fs.readFileSync("./messages.json", {
        encoding: "utf-8"
    }));
    const messagesClean = messages.map(([id, message])=>message);
    for(let i = 0; i < messagesClean.length; i++){
        try {
            const message = messagesClean[i];
            await withTimeout(()=>parseMessage(message), 15000);
        } catch (e) {
            logError(e);
        }
    }
});
client.login(token);
