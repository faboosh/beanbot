import db from "../db.js";
import { encrypt } from "./crypto.js";

class UserDataService {
  static async deleteUserData(userId: string) {
    try {
      await db("plays").where("user_id", "=", encrypt(userId)).delete();
      await db("skips").where("user_id", "=", encrypt(userId)).delete();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  static async requestData(userId: string) {
    const plays = (await db("plays")
      .select("*")
      .where("user_id", "=", encrypt(userId))) as {
      id: string;
      user_id: string;
      guild_id: string;
      timestamp: number;
      imported: boolean;
      yt_id: string;
    }[];
    const skips = (await db("skips")
      .select("*")
      .where("user_id", "=", encrypt(userId))) as {
      id: string;
      user_id: string;
      guild_id: string;
      timestamp: number;
      yt_id: string;
    }[];
    return {
      plays,
      skips,
    };
  }

  static async optIn(userId: string) {
    const hasConsented = await UserDataService.hasConsented(userId);

    if (hasConsented) return;
    await db("data-consent").insert({ user_id: encrypt(userId) });
  }

  static async optOut(userId: string) {
    const hasConsented = await UserDataService.hasConsented(userId);
    if (!hasConsented) return;
    await db("data-consent")
      .where({ user_id: encrypt(userId) })
      .delete();
  }

  static async hasConsented(userId: string) {
    const exists = await db("data-consent").where(
      "user_id",
      "=",
      encrypt(userId)
    );

    return !!exists.length;
  }
}

export default UserDataService;
