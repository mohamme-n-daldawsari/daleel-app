import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

try {
  process.loadEnvFile(path.join(root, ".env.local"));
} catch (error) {
  if (error?.code === "ENOENT") {
    throw new Error(
      "Missing .env.local. Run `pnpm local:env:setup` before using local database commands.",
    );
  }
  throw error;
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from .env.local.");
}

const args = process.argv.slice(2);
if (args.length === 0) {
  throw new Error("No pnpm command was provided.");
}

const command = process.platform === "win32" ? process.env.ComSpec : "pnpm";
const commandArgs =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "pnpm", ...args]
    : args;
const result = spawnSync(command, commandArgs, {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
