import { defineConfig } from "drizzle-kit";
import path from "path";
import fs from "fs";

const localEnvPath = path.join(__dirname, ".env");
if (!process.env.DATABASE_URL && fs.existsSync(localEnvPath)) {
  process.loadEnvFile(localEnvPath);
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Create lib/db/.env with DATABASE_URL=... or set it in your shell.",
  );
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
