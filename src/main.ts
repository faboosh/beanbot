import "dotenv/config";
import {
  Client,
  Events,
  GatewayIntentBits,
  Collection,
  ChatInputCommandInteraction,
  ButtonInteraction,
} from "discord.js";
import commands from "./commands";
import { parseButtonInteraction } from "./lib/util";
const token = process.env.token;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Log in to Discord with your client's token
client.login(token);

client.on(Events.InteractionCreate, async (interaction) => {
  // if (!interaction.isChatInputCommand() || !interaction.isButton()) return;
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
    console.error(e);
    if (interaction.isRepliable())
      interaction.editReply({ content: "Something went HORRIBLY wrong" });
  }
});
