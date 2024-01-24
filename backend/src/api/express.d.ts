import { Request } from "express";

declare module "express-serve-static-core" {
  interface User {
    // Define the structure of your user object
    guildId: string;
    userId: string;
  }

  interface Request {
    user?: User; // Extend the Request interface
  }
}
