import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import UserDataService from "../lib/UserDataService.js";
import { logMessage } from "../lib/log.js";
const Subcommands = {
    OptOut: "optout",
    OptIn: "optin",
    RequestData: "request-data",
    DeleteData: "delete-data",
    PrivacyPolicy: "privacy-policy"
};
const commandName = "privacy";
const data = new SlashCommandBuilder().setName(commandName).setDescription("Control settings regarding how BeanBot uses your data").addSubcommand((subcommand)=>subcommand.setName(Subcommands.OptOut).setDescription("Opt out of data collection")).addSubcommand((subcommand)=>subcommand.setName(Subcommands.OptIn).setDescription("Opt in to data collection")).addSubcommand((subcommand)=>subcommand.setName(Subcommands.RequestData).setDescription("Get a copy of your data in .json format")).addSubcommand((subcommand)=>subcommand.setName(Subcommands.PrivacyPolicy).setDescription("Get a link to the privacy policy")).addSubcommand((subcommand)=>subcommand.setName(Subcommands.DeleteData).setDescription("Delete all data BeanBot has about you (irreversible)"));
const execute = async (interaction)=>{
    if (!(interaction instanceof ChatInputCommandInteraction)) return;
    if (!interaction.guild || !(interaction.member instanceof GuildMember)) return;
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    switch(subcommand){
        case Subcommands.OptIn:
            await UserDataService.optIn(userId);
            interaction.reply({
                ephemeral: true,
                content: "You've now opted in to your plays being used to recommend music, thank you! You can opt out at any time by running `/privacy optout`"
            });
            break;
        case Subcommands.OptOut:
            await UserDataService.optOut(userId);
            interaction.reply({
                ephemeral: true,
                content: "You've now opted out from all data collection, you can re-enable it at any time by running `/privacy optin`"
            });
            break;
        case Subcommands.RequestData:
            const userData = await UserDataService.requestData(userId);
            const attachment = new AttachmentBuilder(Buffer.from(JSON.stringify(userData, undefined, 2))).setName("userdata.json");
            interaction.reply({
                ephemeral: true,
                content: "Here's a copy of your data!",
                files: [
                    attachment
                ]
            });
            break;
        case Subcommands.DeleteData:
            // Create a button
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("delete_data").setLabel("Yes, I'm sure").setStyle(ButtonStyle.Danger));
            // Send a message with the button
            const message = await interaction.reply({
                content: "Are you sure? This action cannot be undone.",
                ephemeral: true,
                components: [
                    row
                ]
            });
            // Create a collector
            const filter = (interaction)=>interaction.customId === "delete_data" && // @ts-ignore
                interaction.user.id === message.author.id;
            const collector = message.createMessageComponentCollector({
                filter,
                time: 15000
            });
            // Collect button interactions
            collector.on("collect", async (interaction)=>{
                // Ensure the interaction is a button press
                if (!interaction.isButton()) return;
                await UserDataService.deleteUserData(userId);
                // Respond to the interaction (ephemeral response)
                await interaction.reply({
                    content: "Whoosh, it's gone!",
                    ephemeral: true
                });
            });
            // Handle end of collection
            collector.on("end", (collected)=>logMessage(`Collected ${collected.size} interactions.`));
            break;
        case Subcommands.PrivacyPolicy:
            interaction.reply("https://beanbot.faboosh.cloud/privacy-policy");
            break;
        default:
            interaction.reply({
                content: "Unsupported command :/"
            });
            break;
    }
};
export { data, execute, Subcommands };
