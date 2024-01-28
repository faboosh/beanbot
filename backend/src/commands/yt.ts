import "dotenv-esm/config";
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  GuildMember,
  Guild,
} from "discord.js";

import type { CacheType, Interaction } from "discord.js";
import { buildButtonCustomId, parseButtonInteraction } from "../lib/util.js";
import Cache from "../lib/Cache.js";
import { createEmbed } from "../lib/embed.js";
import type { EmbedData } from "../lib/embed.js";
import MusicPlayer, {
  destroyPlayer,
  getOrCreatePlayer,
} from "../lib/MusicPlayer/index.js";
import { generateJWT } from "../jwt.js";

const Subcommands = {
  Play: "play",
  Skip: "skip",
  Leave: "leave",
  Pause: "pause",
  Unpause: "unpause",
  Playing: "playing",
  Stats: "stats",
  Shuffle: "shuffle",
  Blame: "blame",
  WebUI: "webui",
};

const commandName = "yt";

const data = new SlashCommandBuilder()
  .setName(commandName)
  .setDescription("Plays youtube video")
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommands.Play)
      .setDescription("Play Youtube video")
      .addStringOption((option) =>
        option.setName("search").setDescription("Search").setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand.setName(Subcommands.Skip).setDescription("Skip")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName(Subcommands.Leave).setDescription("Leave")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName(Subcommands.Pause).setDescription("Pause")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName(Subcommands.Unpause).setDescription("Unpause")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName(Subcommands.Stats).setDescription("Play stats")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommands.WebUI)
      .setDescription(
        "Get a unique link to control the player through your browser"
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommands.Blame)
      .setDescription(
        "Display who has queued the currently playing song in the past"
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommands.Shuffle)
      .setDescription("Manage shuffle settings")
      .addStringOption((option) =>
        option
          .setName("option")
          .setDescription("Option")
          .addChoices(
            ...[
              {
                name: "Enable",
                value: "enable",
              },
              {
                name: "Disable",
                value: "disable",
              },
              {
                name: "Status",
                value: "status",
              },
            ]
          )
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName(Subcommands.Playing)
      .setDescription("Currently playing audio")
  );

const messageCache = new Cache<{
  channelId: string;
  messageId: string;
}>("latest-message");

const getLatestMessage = async (guild: Guild) => {
  try {
    const ids = messageCache.get(guild.id);

    if (!ids) return null;

    const channel = await guild.client.channels.fetch(ids.channelId);

    if (!channel || !channel.isTextBased()) return null;

    const message = await channel.messages.fetch(ids.messageId);

    return message;
  } catch (e) {
    console.error(e);
    return null;
  }
};

const buildButtons = (player: MusicPlayer) => {
  return new ActionRowBuilder().addComponents(
    player.getPlaying()
      ? new ButtonBuilder()
          .setCustomId(buildButtonCustomId(commandName, Subcommands.Pause))
          .setLabel("⏸️")
          .setStyle(ButtonStyle.Primary)
      : new ButtonBuilder()
          .setCustomId(buildButtonCustomId(commandName, Subcommands.Play))
          .setLabel("▶️")
          .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(buildButtonCustomId(commandName, Subcommands.Skip))
      .setLabel("⏭️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(buildButtonCustomId(commandName, Subcommands.Playing))
      .setLabel("📝")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(buildButtonCustomId(commandName, Subcommands.Leave))
      .setLabel("Leave")
      .setStyle(ButtonStyle.Danger)
  );
};

const execute = async (interaction: Interaction): Promise<void> => {
  if (
    !(
      interaction instanceof ButtonInteraction ||
      interaction instanceof ChatInputCommandInteraction
    )
  )
    return;
  if (
    !interaction.guild ||
    !(interaction.member instanceof GuildMember) ||
    !interaction.member?.voice
  )
    return;

  const voiceId = interaction.member.voice.channelId as string;
  const guild = interaction.guild;

  const player = getOrCreatePlayer(guild, voiceId);

  if (voiceId !== player.getChannelId()) {
    console.log("Interaction not from same channel");
    await interaction.editReply({
      content: "You must be in the same voice channel to interact with the bot",
    });
  }

  let subcommand: string = "";
  if (interaction instanceof ChatInputCommandInteraction) {
    subcommand = interaction.options.getSubcommand() as string;
  }

  if (interaction instanceof ButtonInteraction) {
    subcommand = parseButtonInteraction(interaction).subcommand;
  }

  if (!subcommand) return;

  if (subcommand === Subcommands.WebUI) {
    interaction.reply({
      content: `${process.env.frontend_domain}?jwt=${generateJWT(
        interaction.guild.id,
        interaction.user.id
      )}`,
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const embedData = await handleSubcommand(interaction, player, subcommand);

  const messageData: {
    embeds: any;
    components: any;
    files: any;
  } = {
    embeds: [],
    components: [buildButtons(player)] as any,
    files: [],
  };

  if (embedData) {
    const [embed, attachments] = createEmbed(embedData);
    messageData.embeds.push(embed);
    attachments.forEach((attachment) => messageData.files.push(attachment));
  }

  await interaction.editReply(messageData);
};

const handleSubcommand = async (
  interaction:
    | ChatInputCommandInteraction<CacheType>
    | ButtonInteraction<CacheType>,
  player: MusicPlayer,
  subcommand: string
) => {
  const nowPlaying = await player.nowPlaying();

  switch (subcommand) {
    case Subcommands.Play:
      if (!(interaction instanceof ChatInputCommandInteraction)) return;
      const query = interaction.options.getString("search");
      if (!query) return { title: "No query provided" } as EmbedData;
      const queryResponse = await player.queueBySearch(
        query,
        interaction.member?.user.id
      );
      return queryResponse;

    case Subcommands.Skip:
      return await player.skip(interaction.user.id);

    case Subcommands.Pause:
      player.pause();
      return { title: "Pausing" };

    case Subcommands.Unpause:
      player.unpause();
      nowPlaying.title = "Unpausing";
      return nowPlaying;

    case Subcommands.Stats:
      const stats = await player.stats();
      return stats;

    case Subcommands.Shuffle:
      if (!(interaction instanceof ChatInputCommandInteraction)) return;
      const option = interaction.options.getString("option");
      if (option === "enable") {
        player.setShuffle(true);
        nowPlaying.title = "Enabling shuffle";
        return nowPlaying;
      }
      if (option === "disable") {
        player.setShuffle(false);
        nowPlaying.title = "Disable shuffle";
        return nowPlaying;
      }
      if (option === "status") {
        const title = player.getShuffleEnabled()
          ? "Shuffle is enabled"
          : "Shuffle is disabled";
        return { title } as EmbedData;
      }

    case Subcommands.Playing:
      return nowPlaying;

    case Subcommands.Blame:
      return await player.blame();

    case Subcommands.Leave:
      interaction.guild && destroyPlayer(interaction.guild);
      return {
        title: "Leaving",
        description: "I will be back...",
      } as EmbedData;

    default:
      return {} as EmbedData;
  }
};

export { data, execute, Subcommands };
