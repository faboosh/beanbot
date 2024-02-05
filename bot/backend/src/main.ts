import "dotenv-esm/config";
import {
  Client,
  Events,
  GatewayIntentBits,
  Collection,
  ChatInputCommandInteraction,
  ButtonInteraction,
} from "discord.js";
import { parseButtonInteraction } from "./lib/util.js";
import { logError, logMessage } from "./lib/log.js";

const main = async () => {
  const token = process.env.DISCORD_TOKEN;
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
    ],
  });

  client.once(Events.ClientReady, (readyClient) => {
    logMessage(`Ready! Logged in as ${readyClient.user.tag}`);
  });

  client.login(token);

  import("./commands/index.js").then((commandsImport) => {
    const commands = commandsImport.default;
    client.on(Events.InteractionCreate, async (interaction) => {
      let command: string = "";
      if (interaction instanceof ChatInputCommandInteraction) {
        command = interaction.commandName;
      }
      if (interaction instanceof ButtonInteraction) {
        command = parseButtonInteraction(interaction).command;
      }
      if (!command) return;
      try {
        // @ts-ignore
        await commands?.[command]?.execute(interaction);
      } catch (e) {
        logError(e);
        if (interaction.isRepliable())
          interaction.editReply({ content: "Something went HORRIBLY wrong" });
      }
    });
  });

  import("./api/main.js").then((api) => api.start());
};

main();
