import {
  SlashCommandBuilder,
  InteractionResponse,
  ChatInputCommandInteraction,
  ButtonInteraction,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  Message,
  InteractionCollector,
  InteractionCollectorOptions,
  CacheType,
  Interaction,
  GuildMember,
  Guild,
  Channel,
} from "discord.js";
import PlaylistManager from "../lib/playlistManager";
import { buildButtonCustomId, parseButtonInteraction } from "../lib/util";
import Cache from "../lib/cache";

const Subcommands = {
  Play: "play",
  Skip: "skip",
  Leave: "leave",
  Pause: "pause",
  Unpause: "unpause",
  Playing: "playing",
  Stats: "stats",
  Shuffle: "shuffle",
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

const players: Record<string, PlaylistManager> = {};

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

const buildButtons = (player: PlaylistManager) => {
  return new ActionRowBuilder().addComponents(
    // new ButtonBuilder()
    // .setCustomId(buildButtonCustomId(commandName, Subcommands.Shuffle))
    // .setLabel("🔀")
    // .setStyle(ButtonStyle.Primary),
    player.playing
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
  await interaction.deferReply();

  const voiceId = interaction.member.voice.channelId as string;
  const guild = interaction.guild;

  if (!players[guild.id])
    players[guild.id] = new PlaylistManager(guild, voiceId);

  const player = players[guild.id];

  if (voiceId !== player.channelId) {
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

  const messageText = await handleSubcommand(interaction, player, subcommand);

  const messageData = {
    content: messageText,
    components: [buildButtons(player)] as any,
  };
  // const message = await getLatestMessage(guild);
  // console.log("message from cache", message);
  // const message = null;
  const reply = await interaction.editReply({
    ...messageData,
  });
  // try {
  //   if (message) {
  //     await message.edit(messageData);
  //   } else {
  //     const reply = await interaction.editReply(messageData);
  //     messageCache.set(guild.id, {
  //       channelId: interaction.channelId,
  //       messageId: reply.id,
  //     });
  //   }
  // } catch (e) {
  //   console.error(e);
  //   interaction.editReply("Something broke :(");
  // }
};

const handleSubcommand = async (
  interaction:
    | ChatInputCommandInteraction<CacheType>
    | ButtonInteraction<CacheType>,
  player: PlaylistManager,
  subcommand: string
) => {
  const nowPlaying = player.nowPlaying();

  switch (subcommand) {
    case Subcommands.Play:
      if (!(interaction instanceof ChatInputCommandInteraction)) return;
      const query = interaction.options.getString("search");
      if (!query) return "";
      const queryResponse = await player.queueBySearch(
        query,
        interaction.member?.user.id
      );
      return queryResponse;

    case Subcommands.Skip:
      const nextTrack = await player.skip(interaction.user.id);
      return [
        `### __Skipping...__`,
        ...(nextTrack ? [`**Now playing:** ${nextTrack}`] : []),
      ].join("\n");

    case Subcommands.Pause:
      player.pause();
      return [`### Pausing...`, nowPlaying].join("\n");

    case Subcommands.Unpause:
      player.unpause();
      return [`### Unpausing...`, nowPlaying].join("\n");

    case Subcommands.Stats:
      const stats = await player.stats();
      return stats;

    case Subcommands.Shuffle:
      if (!(interaction instanceof ChatInputCommandInteraction)) return;
      const option = interaction.options.getString("option");
      if (option === "enable") {
        player.setShuffle(true);
        return ["### Enabling shuffle...", nowPlaying].join("\n");
      }
      if (option === "disable") {
        player.setShuffle(false);
        return ["### Disabling shuffle...", nowPlaying].join("\n");
      }
      if (option === "status")
        return player.shuffle ? "Shuffle is enabled" : "Shuffle is disabled";

      return "";

    case Subcommands.Playing:
      return nowPlaying;

    case Subcommands.Leave:
      player.disconnect();
      interaction.guild?.id && delete players[interaction.guild.id];
      return "### Leaving...";

    default:
      return "";
  }
};

export { data, execute };
