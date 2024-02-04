import "dotenv-esm/config";
import fs from "fs";
import { Client, Events, GatewayIntentBits, Message } from "discord.js";
import type { Channel } from "discord.js";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import {
  downloadById,
  getTopResult,
} from "../lib/MusicPlayer/platforms/youtube.js";
import InteractionService from "../lib/MusicPlayer/modules/InteractionService.js";
import { logError, logMessage } from "../lib/log.js";

const token = process.env.DISCORD_TOKEN;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});
const channelId = "837399202819604543";
const guildId = "836017459982106714";
const clientID = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
if (!clientID || !clientSecret)
  throw new Error("Spotify Client ID or Client Secret missing");

async function getMessages(
  channel: Channel,
  limit: number = 100
): Promise<Message[]> {
  const sum_messages: any[] = [];
  let last_id;

  while (true) {
    const options = { limit: 100 };
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

const downloadMessages = async () => {
  const channel = await client.channels.fetch(channelId);
  if (!channel) process.exit(0);
  const messages = await getMessages(channel, 100000);
  fs.writeFileSync("./messages.json", JSON.stringify(messages, undefined, 2), {
    encoding: "utf-8",
  });
  process.exit(0);
};

function getYoutubeVideoId(url: string) {
  var regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  var match = url.match(regExp);
  return match && match[7].length == 11 ? match[7] : undefined;
}

type MessageParser = {
  name: string;
  test: (message: Message) => boolean;
  parse: (message: Message) => string | null;
};

function extractBetweenBackticks(str: string) {
  const regex = /`([^`]+)`/g;
  let matches: any[] = [];
  let match;

  while ((match = regex.exec(str)) !== null) {
    matches.push(match[1]);
  }

  return matches;
}

function extractSpotifyTrackId(url: string) {
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

const extractCommandArgs = (str: string) => {
  let parts = str.split(" ", 2); // Splits the string into two parts
  if (!parts.length) return null;
  let firstPart = parts[0]; // The part before the first space
  let remainingPart = str.substring(firstPart.length + 1); // The rest of the string after the first space
  if (!remainingPart) return null;
  return remainingPart;
};

const messageParsers: MessageParser[] = [
  {
    name: "Jockie (Text)",
    test: (message: Message) => /^m!p/gm.test(message.content),
    parse: (message: Message) => {
      return extractCommandArgs(message.content);
    },
  },
  {
    name: "Tempo/Rhythm/Groovy (Text)",
    test: (message: Message) =>
      /^-play/gm.test(message.content) || /^-p/gm.test(message.content),
    parse: (message: Message) => {
      return extractCommandArgs(message.content);
    },
  },
  {
    name: "Tempo (Command)",
    test: (message: Message) =>
      /^<@[0-9]*> \| Added `/gm.test(message.content) && message.type === 20,
    parse: (message: Message) => {
      return extractBetweenBackticks(message.content).join(" ");
    },
  },
  {
    name: "Vibr (Command)",
    test: (message: Message) => {
      return (
        // @ts-ignore
        message?.authorId === "882491278581977179" &&
        !message.embeds[0]?.description?.startsWith("Connected to ")
      );
    },
    parse: (message: Message) => {
      const embed = message.embeds?.[0];
      if (!embed) return null;

      const title = embed.title;
      const author = embed?.author?.name;
      if (!title || !author) return null;
      return `${title} ${author}`;
    },
  },
  {
    name: "Vexera (Text)",
    test: (message: Message) =>
      /^!p/gm.test(message.content) || /^!play/gm.test(message.content),
    parse: (message: Message) => {
      return extractCommandArgs(message.content);
    },
  },
];

type URLParser = {
  name: string;
  test: (str: string) => boolean;
  parse: (str: string) => Promise<string | null>;
};

const spotifySDK = SpotifyApi.withClientCredentials(clientID, clientSecret);

const urlParsers: URLParser[] = [
  {
    name: "YouTube",
    test: (str) => {
      const ytRegex =
        /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
      return ytRegex.test(str);
    },
    parse: async (str) => {
      return str;
    },
  },
  {
    name: "Spotify",
    test: (str) => {
      const spotifyRegex =
        /https:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/gm;
      return spotifyRegex.test(str);
    },
    parse: async (str) => {
      const trackID = extractSpotifyTrackId(str);
      if (!trackID) return null;
      try {
        const res = await spotifySDK.tracks.get(trackID);
        const artists = res.artists.map((artist) => artist.name).join(" ");
        const name = res.name;

        return `${name} ${artists}`;
      } catch (e) {
        logError(e);
        return null;
      }
    },
  },
];
const isUrl = (str: string) => /^http/.test(str);

const getQueryFromMessage = async (message: Message) => {
  for (let i = 0; i < messageParsers.length; i++) {
    const parser = messageParsers[i];

    if (!parser.test(message)) continue;
    logMessage(`Parsing entry from bot ${parser.name}`);
    try {
      const result = parser.parse(message)?.trim();
      if (!result) return null;
      if (!isUrl(result)) return result;
      for (let j = 0; j < urlParsers.length; j++) {
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

function timeoutPromise(milliseconds: number) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error(`Timed out after ${milliseconds} ms`));
    }, milliseconds);
  });
}

function withTimeout(asyncFn: any, timeoutMs: number) {
  return Promise.race([asyncFn(), timeoutPromise(timeoutMs)]);
}

const interactionService = new InteractionService(guildId);

const parseMessage = async (msg: Message) => {
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
    timestamp: new Date(msg.createdTimestamp),
  });

  logMessage(`Finished download for id ${id}`);
};

client.once(Events.ClientReady, async (readyClient) => {
  logMessage(`Ready! Logged in as ${readyClient.user.tag}`);
  if (!fs.existsSync("./messages.json")) await downloadMessages();

  const messages: [string, Message][] = JSON.parse(
    fs.readFileSync("./messages.json", { encoding: "utf-8" })
  );

  const messagesClean: Message[] = messages.map(([id, message]) => message);

  for (let i = 0; i < messagesClean.length; i++) {
    try {
      const message = messagesClean[i];
      await withTimeout(() => parseMessage(message), 15000);
    } catch (e) {
      logError(e);
    }
  }
});

client.login(token);
