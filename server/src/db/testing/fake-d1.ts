import type BetterSqlite3 from 'better-sqlite3';

type BindValue = string | number | null | Uint8Array;

type D1ResultLike = {
  success: boolean;
  results: unknown[];
  meta: { changes: number; last_row_id: number; duration: number };
};

class FakeD1PreparedStatement {
  private readonly db: BetterSqlite3.Database;
  private readonly query: string;
  private readonly values: BindValue[];

  constructor(db: BetterSqlite3.Database, query: string, values: BindValue[] = []) {
    this.db = db;
    this.query = query;
    this.values = values;
  }

  bind(...values: BindValue[]): FakeD1PreparedStatement {
    return new FakeD1PreparedStatement(this.db, this.query, values);
  }

  executeSync(): D1ResultLike {
    const stmt = this.db.prepare(this.query);
    if (stmt.reader) {
      return {
        success: true,
        results: stmt.all(...this.values) as unknown[],
        meta: { changes: 0, last_row_id: 0, duration: 0 },
      };
    }
    const info = stmt.run(...this.values);
    return {
      success: true,
      results: [],
      meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid), duration: 0 },
    };
  }

  async run(): Promise<D1ResultLike> {
    const stmt = this.db.prepare(this.query);
    const info = stmt.run(...this.values);
    return {
      success: true,
      results: [],
      meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid), duration: 0 },
    };
  }

  async all(): Promise<D1ResultLike> {
    const rows = this.db.prepare(this.query).all(...this.values) as unknown[];
    return { success: true, results: rows, meta: { changes: 0, last_row_id: 0, duration: 0 } };
  }

  async first(columnName?: string): Promise<unknown> {
    const row = this.db.prepare(this.query).get(...this.values);
    if (row === undefined || row === null) return null;
    if (columnName !== undefined) {
      return (row as Record<string, unknown>)[columnName] ?? null;
    }
    return row;
  }

  async raw(): Promise<unknown[][]> {
    const stmt = this.db.prepare(this.query);
    return stmt.raw().all(...this.values) as unknown[][];
  }
}

export class FakeD1Database {
  private readonly db: BetterSqlite3.Database;

  constructor(db: BetterSqlite3.Database) {
    this.db = db;
  }

  prepare(query: string): FakeD1PreparedStatement {
    return new FakeD1PreparedStatement(this.db, query);
  }

  async batch(statements: FakeD1PreparedStatement[]): Promise<D1ResultLike[]> {
    const runAll = this.db.transaction((stmts: FakeD1PreparedStatement[]) =>
      stmts.map((stmt) => stmt.executeSync()),
    );
    return runAll(statements);
  }

  async exec(query: string): Promise<{ count: number; duration: number }> {
    this.db.exec(query);
    return { count: 0, duration: 0 };
  }
}
