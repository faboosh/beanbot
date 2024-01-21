import "dotenv/config";
import commands from "../commands";
import { REST, Routes } from "discord.js";

const token = process.env.token;
const appId = process.env.app_id;

if (!token || !appId) throw new Error("missing credentials");

const payload = Object.entries(commands).map(
  ([key, command]: [string, any]) => {
    return command.data.toJSON();
  }
);

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// and deploy your commands!
(async () => {
  try {
    console.log(
      `Started refreshing ${payload.length} application (/) commands.`
    );

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = (await rest.put(Routes.applicationCommands(appId), {
      body: payload,
    })) as any;

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();
