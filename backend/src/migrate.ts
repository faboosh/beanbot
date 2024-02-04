import "dotenv-esm/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzleDB } from "./db";

await migrate(drizzleDB, { migrationsFolder: "drizzle" });
