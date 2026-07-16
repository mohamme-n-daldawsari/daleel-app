import { spawnSync } from "node:child_process";
import path from "node:path";

try {
  process.loadEnvFile(path.resolve(import.meta.dirname, "../..", ".env.local"));
} catch (error) {
  if (error?.code !== "ENOENT") {
    throw error;
  }
}

const env = {
  ...process.env,
  PORT: process.env.WEB_PORT ?? process.env.PORT ?? "5173",
  BASE_PATH: process.env.BASE_PATH ?? "/",
  API_URL: process.env.API_URL ?? "http://127.0.0.1:5000",
};

const args = [
  "exec",
  "vite",
  "--config",
  "vite.config.ts",
  "--host",
  "0.0.0.0",
];
const command = process.platform === "win32" ? process.env.ComSpec : "pnpm";
const commandArgs =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "pnpm", ...args]
    : args;
const result = spawnSync(command, commandArgs, { env, stdio: "inherit" });

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
