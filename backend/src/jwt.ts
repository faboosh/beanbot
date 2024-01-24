import "dotenv-esm/config";
import jwt from "jsonwebtoken";
const secret = process.env.jwt_secret;
if (!secret) throw new Error("jwt_secret not set in .env");

type JWTData = {
  userId: string;
  guildId: string;
};

const generateJWT = (guildId: string, userId: string) => {
  return jwt.sign({ guildId, userId }, secret, { expiresIn: "24h" });
};

const decodeJWT = (token: string): JWTData => {
  const decoded = jwt.decode(token);
  if (!decoded || !jwt.verify(token, secret)) throw new Error("Invalid JWT");

  return decoded as JWTData;
};

export type { JWTData };
export { generateJWT, decodeJWT };
