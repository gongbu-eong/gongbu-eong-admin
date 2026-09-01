import fs from "node:fs";
import path from "node:path";
import { Pool, QueryResult, QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var adminPostgresPool: Pool | undefined;
}

function hasDatabaseConfig() {
  return Boolean(
    process.env.DATABASE_URL ||
      (process.env.DB_HOST &&
        process.env.DB_PORT &&
        process.env.DB_NAME &&
        process.env.DB_USER &&
        process.env.DB_PASSWORD),
  );
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  const contents = fs.readFileSync(filePath, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function ensureDatabaseEnv() {
  if (hasDatabaseConfig()) return;

  loadEnvFile(path.join(process.cwd(), ".env"));

  if (hasDatabaseConfig()) return;

  throw new Error(
    "Database config is missing. Set DATABASE_URL or DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD in gongbu-eong-admin/.env.",
  );
}

function shouldUseSslByDefault(connectionString?: string) {
  return (
    process.env.NODE_ENV === "production" ||
    connectionString?.includes("supabase.co") ||
    connectionString?.includes("sslmode=require")
  );
}

function getSslConfig(connectionString?: string) {
  const sslMode = (process.env.DB_SSLMODE || process.env.PGSSLMODE || "")
    .trim()
    .toLowerCase();

  if (["disable", "false", "off"].includes(sslMode)) return undefined;
  if (["require", "true", "on", "prefer"].includes(sslMode)) {
    return { rejectUnauthorized: false };
  }

  return shouldUseSslByDefault(connectionString)
    ? { rejectUnauthorized: false }
    : undefined;
}

function createPool() {
  ensureDatabaseEnv();

  const appName = process.env.APP_NAME || "gongbu-eong-admin";

  if (process.env.DATABASE_URL) {
    const connectionString = process.env.DATABASE_URL;

    return new Pool({
      connectionString,
      application_name: appName,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      max: 5,
      ssl: getSslConfig(connectionString),
    });
  }

  return new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    application_name: appName,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    max: 5,
    ssl: getSslConfig(),
  });
}

export const db = globalThis.adminPostgresPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalThis.adminPostgresPool = db;
}

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return db.query<T>(text, params);
}
