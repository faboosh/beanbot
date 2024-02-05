import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { readFileSync } from "fs";
const createEmbed = ({ title, description, image, thumbnail, fields })=>{
    const embed = new EmbedBuilder().setColor(0x30f2df);
    const attachments = [];
    if (title) {
        embed.setTitle(title);
    }
    if (description) {
        embed.setDescription(description);
    }
    if (image) {
        const imageBuffer = readFileSync(image);
        const attachment = new AttachmentBuilder(imageBuffer, {
            name: "image.png"
        });
        embed.setImage("attachment://image.png");
        attachments.push(attachment);
    }
    if (thumbnail) {
        embed.setThumbnail(thumbnail);
    }
    if (fields) {
        embed.addFields(...fields);
    }
    return [
        embed,
        attachments
    ];
};
export { createEmbed };
