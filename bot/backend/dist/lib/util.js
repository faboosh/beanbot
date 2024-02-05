const replyToInteraction = (interaction, message, components)=>{
    return interaction.reply({
        content: message,
        components
    });
};
const parseButtonInteraction = (interaction)=>{
    const split = interaction.customId.split("__");
    // if(split[0].length === interaction.customId.length) throw new Error("Malformed button customId, could not parse")
    return {
        command: split[0],
        subcommand: split === null || split === void 0 ? void 0 : split[1]
    };
};
const buildButtonCustomId = (command, subcommand)=>{
    if (!subcommand) return command;
    return `${command}__${subcommand}`;
};
const getUniqueValues = (objArr, key)=>{
    const unique = [];
    for(let i = 0; i < objArr.length; i++){
        const obj = objArr[i];
        if (!unique.includes(obj[key])) {
            unique.push(obj[key]);
        }
    }
    return unique;
};
const getNumOccurences = (objArr, key)=>{
    const unique = [];
    for(let i = 0; i < objArr.length; i++){
        const obj = objArr[i];
        if (!unique.includes(obj[key])) {
            unique.push(obj[key]);
        }
    }
    return unique;
};
const secondsToTimestamp = (seconds)=>{
    seconds = Math.round(seconds);
    let minutes = Math.floor(seconds / 60);
    let remainingSeconds = seconds % 60;
    // Adding leading zero if minutes or seconds are less than 10
    let formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
    let formattedSeconds = remainingSeconds < 10 ? "0" + remainingSeconds : remainingSeconds;
    return formattedMinutes + ":" + formattedSeconds;
};
export { replyToInteraction, parseButtonInteraction, buildButtonCustomId, getUniqueValues, secondsToTimestamp };
