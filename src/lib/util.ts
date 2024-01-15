import {
  Interaction,
  Message,
  ChatInputCommandInteraction,
  ButtonInteraction,
} from "discord.js";

const replyToInteraction = (
  interaction: ChatInputCommandInteraction,
  message: string,
  components?: any
) => {
  return interaction.reply({ content: message, components });
};

const parseButtonInteraction = (interaction: ButtonInteraction) => {
  const split = interaction.customId.split("__");
  // if(split[0].length === interaction.customId.length) throw new Error("Malformed button customId, could not parse")

  return {
    command: split[0],
    subcommand: split?.[1],
  };
};

const buildButtonCustomId = (command: string, subcommand?: string) => {
  if (!subcommand) return command;
  return `${command}__${subcommand}`;
};

const getUniqueValues = <T>(objArr: T[], key: keyof T) => {
  const unique: any = [];

  for (let i = 0; i < objArr.length; i++) {
    const obj = objArr[i];
    if (!unique.includes(obj[key])) {
      unique.push(obj[key]);
    }
  }

  return unique;
};

const getNumOccurences = <T>(objArr: T[], key: keyof T) => {
  const unique: any = [];

  for (let i = 0; i < objArr.length; i++) {
    const obj = objArr[i];
    if (!unique.includes(obj[key])) {
      unique.push(obj[key]);
    }
  }

  return unique;
};

export {
  replyToInteraction,
  parseButtonInteraction,
  buildButtonCustomId,
  getUniqueValues,
};