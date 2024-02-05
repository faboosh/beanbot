import "dotenv-esm/config";
import jwt from "jsonwebtoken";
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("jwt_secret not set in .env");
const generateJWT = (guildId, userId)=>{
    const iat = Math.floor(Date.now() / 1000); // current time in seconds since epoch
    const exp = iat + 24 * 60 * 60; // 24 hours from now
    return jwt.sign({
        guildId,
        userId,
        iat,
        exp
    }, secret);
};
const decodeJWT = (token)=>{
    const decoded = jwt.decode(token);
    if (!decoded || !jwt.verify(token, secret)) throw new Error("Invalid JWT");
    return decoded;
};
export { generateJWT, decodeJWT };
