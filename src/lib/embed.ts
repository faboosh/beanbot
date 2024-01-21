import { EmbedBuilder } from "discord.js";

type EmbedData = {
  title?: string;
  description?: string;
  thumbnail?: string;
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
};

const createEmbed = ({ title, description, thumbnail, fields }: EmbedData) => {
  const embed = new EmbedBuilder().setColor(0x30f2df);

  if (title) {
    embed.setTitle(title);
  }

  if (description) {
    embed.setDescription(description);
  }

  if (thumbnail) {
    embed.setThumbnail(thumbnail);
  }

  if (fields) {
    embed.addFields(...fields);
  }

  return embed;
};

export { EmbedData, createEmbed };
