import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Latent shares a Neon instance with the week-1 and week-2 projects;
  // everything lives in the `latent` pg schema and drizzle-kit is fenced to
  // it so a push can never touch the other projects' tables.
  schemaFilter: ["latent"],
});
