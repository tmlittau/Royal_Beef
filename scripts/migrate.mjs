// Standalone migration runner — used locally (`npm run db:migrate`) and as the
// Docker entrypoint step. Uses Drizzle's programmatic migrator so it needs only
// runtime deps (better-sqlite3 + drizzle-orm), not drizzle-kit.
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const url = process.env.DATABASE_URL ?? 'royalbeef.db';

// Ensure the parent directory exists (e.g. /app/data on the Docker volume).
const dir = dirname(url);
if (dir && dir !== '.') mkdirSync(dir, { recursive: true });

const sqlite = new Database(url);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const db = drizzle(sqlite);
migrate(db, { migrationsFolder: './drizzle' });
sqlite.close();

console.log(`[migrate] schema up to date at ${url}`);
