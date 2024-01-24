import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { readFileSync } from "fs";

type EmbedData = {
  title?: string;
  description?: string;
  thumbnail?: string;
  image?: string;
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
};

const createEmbed = ({
  title,
  description,
  image,
  thumbnail,
  fields,
}: EmbedData): [EmbedBuilder, AttachmentBuilder[]] => {
  const embed = new EmbedBuilder().setColor(0x30f2df);
  const attachments: AttachmentBuilder[] = [];

  if (title) {
    embed.setTitle(title);
  }

  if (description) {
    embed.setDescription(description);
  }

  if (image) {
    const imageBuffer = readFileSync(image);
    const attachment = new AttachmentBuilder(imageBuffer, {
      name: "image.png",
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

  return [embed, attachments];
};

export type { EmbedData };
export { createEmbed };
