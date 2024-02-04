import { drizzle } from "drizzle-orm/postgres-js";
import knex from "knex";
import postgres from "postgres";
import * as schema from "./schema.js";

const db = knex({
  client: "sqlite3",
  connection: {
    filename: "./dev.sqlite3",
  },
  useNullAsDefault: true,
});

const client = postgres({
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : 5432,
  database: process.env.POSTGRES_DB ?? "beanbot",
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});
const drizzleDB = drizzle(client, { schema });

export { drizzleDB };

export default db;
