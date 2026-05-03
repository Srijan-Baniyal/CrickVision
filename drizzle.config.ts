import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Same precedence as Next.js: `.env` then `.env.local` overrides.
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run drizzle-kit");
}

export default defineConfig({
  schema: "./lib/db/schema/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  // `true` prompts for confirmation on every push (needs an interactive TTY).
  strict: false,
  casing: "snake_case",
});
