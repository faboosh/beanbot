import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    //@ts-ignore
    connectionString: process.env.postgres_url,
  },
} satisfies Config;
