import "dotenv-esm/config";
import jwt from "jsonwebtoken";
import type { JWTData } from "../jwt.js";
const secret = process.env.jwt_secret;
if (!secret) throw new Error("jwt_secret not set in .env");

const authMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

    jwt.verify(token, secret, (err: any, user: any) => {
      if (err) {
        return res.sendStatus(403); // Forbidden access if the token is invalid
      }

      req.user = user as JWTData;
      next();
    });
  } else {
    res.sendStatus(401); // Unauthorized access if no token is provided
  }
};

export { authMiddleware };
