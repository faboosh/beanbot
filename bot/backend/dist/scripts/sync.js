import "dotenv-esm/config";
import { REST, Routes } from "discord.js";
import commands from "../commands/index.js";
import { logError, logMessage } from "../lib/log.js";
const token = process.env.DISCORD_TOKEN;
const appId = process.env.DISCORD_APP_ID;
if (!token || !appId) throw new Error("missing credentials");
const payload = Object.entries(commands).map(([key, command])=>{
    return command.data.toJSON();
});
// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);
// and deploy your commands!
(async ()=>{
    try {
        logMessage(`Started refreshing ${payload.length} application (/) commands.`);
        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(Routes.applicationCommands(appId), {
            body: payload
        });
        logMessage(data);
        logMessage(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        logError(error);
    }
})();
