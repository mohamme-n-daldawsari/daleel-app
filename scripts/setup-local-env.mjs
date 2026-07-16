import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const envFile = path.join(root, ".env.local");

function readExistingValues() {
  if (!fs.existsSync(envFile)) return new Map();

  const values = new Map();
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) values.set(match[1], match[2]);
  }
  return values;
}

const existing = readExistingValues();
const password =
  existing.get("POSTGRES_PASSWORD") ?? randomBytes(32).toString("base64url");
const database = existing.get("POSTGRES_DB") ?? "daleel_dev";
const user = existing.get("POSTGRES_USER") ?? "daleel_dev";
const port = existing.get("POSTGRES_PORT") ?? "55432";
const databaseUrl = `postgresql://${user}:${encodeURIComponent(password)}@127.0.0.1:${port}/${database}`;

const managed = new Map([
  ["POSTGRES_PORT", port],
  ["POSTGRES_USER", user],
  ["POSTGRES_PASSWORD", password],
  ["POSTGRES_DB", database],
  ["DATABASE_URL", databaseUrl],
  ["API_PORT", existing.get("API_PORT") ?? "5000"],
  ["WEB_PORT", existing.get("WEB_PORT") ?? "5173"],
  ["BASE_PATH", existing.get("BASE_PATH") ?? "/"],
  ["API_URL", existing.get("API_URL") ?? "http://127.0.0.1:5000"],
  ["OPENAI_MODEL", existing.get("OPENAI_MODEL") ?? "gpt-5.6-terra"],
]);

for (const [key, value] of existing) {
  if (key !== "VITE_CLERK_PROXY_URL" && !managed.has(key)) {
    managed.set(key, value);
  }
}

const lines = [
  "# Generated local development configuration. Never commit this file.",
  "# PostgreSQL is exposed only on this computer with development-only credentials.",
  ...[...managed].map(([key, value]) => `${key}=${value}`),
  "",
  "# Clerk Development instance values (copy locally; never paste them into chat):",
  "# VITE_CLERK_PUBLISHABLE_KEY=",
  "# CLERK_PUBLISHABLE_KEY=",
  "# CLERK_SECRET_KEY=",
  "# VITE_CLERK_PROXY_URL=  # Production proxy only; leave unset locally.",
  "",
  "# OpenAI Responses API (backend only; never expose this value to Vite):",
  "# OPENAI_API_KEY=",
  "",
];

fs.writeFileSync(envFile, lines.join("\n"), {
  encoding: "utf8",
  mode: 0o600,
});

console.log(
  "Created or refreshed the ignored .env.local file. Database credentials were generated locally and were not printed.",
);
