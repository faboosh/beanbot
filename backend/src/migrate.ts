import "dotenv-esm/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString = process.env.postgres_url;
if (!connectionString) throw new Error("postgres_url not set in .env");
const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

await migrate(db, { migrationsFolder: "drizzle" });

await sql.end();
