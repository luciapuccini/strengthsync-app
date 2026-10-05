import { readdirSync, readFileSync } from 'node:fs';

import BetterSqlite3 from 'better-sqlite3';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type { Db } from '../db.ts';
import * as schema from '../schema.ts';
import { getWeek, updateDayLog } from '../repositories/weeks.ts';
import { FakeD1Database } from './fake-d1.ts';

import { drizzle } from 'drizzle-orm/d1';

const DB_ARTIFACTS_ROOT = new URL('../../../db/', import.meta.url);

function readSqlDir(relativeDir: string): string[] {
  const dirUrl = new URL(`${relativeDir}/`, DB_ARTIFACTS_ROOT);
  return readdirSync(dirUrl)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => readFileSync(new URL(name, dirUrl), 'utf8'));
}

function applySqlFile(sqlite: BetterSqlite3.Database, sql: string): void {
  const statements = sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const statement of statements) {
    sqlite.exec(statement);
  }
}

export function createMigratedSqlite(): BetterSqlite3.Database {
  const sqlite = new BetterSqlite3(':memory:');
  for (const migration of readSqlDir('drizzle')) {
    applySqlFile(sqlite, migration);
  }
  return sqlite;
}

export function applySeeds(sqlite: BetterSqlite3.Database): void {
  const baseSeed = readFileSync(new URL('seeds/000_default_coach.sql', DB_ARTIFACTS_ROOT), 'utf8');
  applySqlFile(sqlite, baseSeed);
}

function toDb(sqlite: BetterSqlite3.Database): Db {
  return drizzle(new FakeD1Database(sqlite) as unknown as D1Database, {
    schema,
  }) as unknown as DrizzleD1Database<typeof schema> as Db;
}

export function createTestDb(): Db {
  const sqlite = createMigratedSqlite();
  applySeeds(sqlite);
  return toDb(sqlite);
}

export function createDemoSeededDb(): Db {
  const sqlite = createMigratedSqlite();
  for (const seed of readSqlDir('seeds')) {
    applySqlFile(sqlite, seed);
  }
  return toDb(sqlite);
}

export { addDays, todayIso } from '../dates.ts';

export async function markAllDaysCompleted(
  db: Db,
  clientId: string,
  weekId: string,
): Promise<void> {
  const week = await getWeek(db, clientId, weekId);
  if (!week) throw new Error(`week ${weekId} not found`);
  for (const day of week.schedule) {
    if (day.completed) continue;
    await updateDayLog(db, clientId, weekId, day.day_index, {
      completed: true,
      exercises: day.exercises.map((exercise) => ({
        exercise_key: exercise.exercise_key,
        skipped: false,
        feedback: null,
        sets: [],
      })),
    });
  }
}
