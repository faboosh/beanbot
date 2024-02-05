import "dotenv-esm/config";
import db from "../db.js";
import { encrypt } from "../lib/crypto.js";
import { logError, logMessage } from "../lib/log.js";
const main = async ()=>{
    logMessage(`using encryption key ${process.env.ENCRYPTION_KEY}`);
    const plays = await db("plays").select("id", "guild_id", "user_id");
    const skips = await db("skips").select("id", "guild_id", "user_id");
    logMessage("Encrypting plays");
    for(let i = 0; i < plays.length; i++){
        const element = plays[i];
        await db("plays").where("id", "=", element.id).update({
            guild_id: encrypt(element.guild_id),
            user_id: encrypt(element.user_id)
        }).catch(logError);
        logMessage(`${i + 1}/${plays.length}`);
    }
    logMessage("Encrypting skips");
    for(let i = 0; i < skips.length; i++){
        const element = skips[i];
        await db("skips").where("id", "=", element.id).update({
            guild_id: encrypt(element.guild_id),
            user_id: encrypt(element.user_id)
        }).catch(logError);
        logMessage(`${i + 1}/${skips.length}`);
    }
};
main();
