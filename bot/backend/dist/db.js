import { drizzle } from "drizzle-orm/postgres-js";
import knex from "knex";
import postgres from "postgres";
import * as schema from "./schema.js";
const db = knex({
    client: "sqlite3",
    connection: {
        filename: "./dev.sqlite3"
    },
    useNullAsDefault: true
});
const connectionString = process.env.POSTGRES_URL;
if (!connectionString) throw new Error("postgres_url not set in .env");
const client = postgres(connectionString, {
    max: 1
});
const drizzleDB = drizzle(client, {
    schema
});
export { drizzleDB };
export default db;
