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
  NODE_ENV: "development",
  PORT: process.env.API_PORT ?? process.env.PORT ?? "5000",
};

for (const script of ["build", "start"]) {
  const args = ["run", script];
  const command = process.platform === "win32" ? process.env.ComSpec : "pnpm";
  const commandArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", "pnpm", ...args]
      : args;
  const result = spawnSync(command, commandArgs, {
    env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
