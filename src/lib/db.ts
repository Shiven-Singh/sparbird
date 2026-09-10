/**
 * Local store for drill history.
 *
 * SQLite when better-sqlite3 is available and the filesystem is writable, otherwise an
 * in-memory store so the app still runs on a read-only host. Nothing here is required for a
 * drill to work; losing the store loses history, not correctness.
 */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { redactNumbers } from "./mask";
import type { DrillOutcome, Scorecard } from "./types";

export interface AttemptRecord {
  id: string;
  personaId: string;
  callId: string;
  live: boolean;
  disposition: string;
  disputed: boolean;
  points: number;
  maxPoints: number;
  itemsWithEvidence: number;
  itemsTotal: number;
  secondsToFirstNumber: number | null;
  createdAt: string;
  card: Scorecard;
  transcript: DrillOutcome["transcript"];
}

interface Store {
  readonly kind: string;
  save(record: AttemptRecord): void;
  list(personaId?: string): AttemptRecord[];
  get(id: string): AttemptRecord | null;
}

class MemoryStore implements Store {
  readonly kind = "memory";
  private readonly rows: AttemptRecord[] = [];

  save(record: AttemptRecord): void {
    this.rows.unshift(record);
  }
  list(personaId?: string): AttemptRecord[] {
    return personaId ? this.rows.filter((r) => r.personaId === personaId) : [...this.rows];
  }
  get(id: string): AttemptRecord | null {
    return this.rows.find((r) => r.id === id) ?? null;
  }
}

interface SqliteRow {
  id: string;
  persona_id: string;
  call_id: string;
  live: number;
  disposition: string;
  disputed: number;
  points: number;
  max_points: number;
  items_with_evidence: number;
  items_total: number;
  seconds_to_first_number: number | null;
  created_at: string;
  card_json: string;
  transcript_json: string;
}

function toRecord(row: SqliteRow): AttemptRecord {
  return {
    id: row.id,
    personaId: row.persona_id,
    callId: row.call_id,
    live: row.live === 1,
    disposition: row.disposition,
    disputed: row.disputed === 1,
    points: row.points,
    maxPoints: row.max_points,
    itemsWithEvidence: row.items_with_evidence,
    itemsTotal: row.items_total,
    secondsToFirstNumber: row.seconds_to_first_number,
    createdAt: row.created_at,
    card: JSON.parse(row.card_json) as Scorecard,
    transcript: JSON.parse(row.transcript_json) as DrillOutcome["transcript"],
  };
}

class SqliteStore implements Store {
  readonly kind = "sqlite";
  // Typed loosely so the optional native dependency never becomes a build-time requirement.
  private readonly db: {
    prepare: (sql: string) => {
      run: (...args: unknown[]) => unknown;
      all: (...args: unknown[]) => unknown[];
      get: (...args: unknown[]) => unknown;
    };
    exec: (sql: string) => unknown;
  };

  constructor(db: SqliteStore["db"]) {
    this.db = db;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY,
        persona_id TEXT NOT NULL,
        call_id TEXT NOT NULL,
        live INTEGER NOT NULL,
        disposition TEXT NOT NULL,
        disputed INTEGER NOT NULL,
        points INTEGER NOT NULL,
        max_points INTEGER NOT NULL,
        items_with_evidence INTEGER NOT NULL,
        items_total INTEGER NOT NULL,
        seconds_to_first_number INTEGER,
        created_at TEXT NOT NULL,
        card_json TEXT NOT NULL,
        transcript_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS attempts_persona ON attempts (persona_id, created_at DESC);
    `);
  }

  save(record: AttemptRecord): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO attempts
         (id, persona_id, call_id, live, disposition, disputed, points, max_points,
          items_with_evidence, items_total, seconds_to_first_number, created_at,
          card_json, transcript_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.personaId,
        record.callId,
        record.live ? 1 : 0,
        record.disposition,
        record.disputed ? 1 : 0,
        record.points,
        record.maxPoints,
        record.itemsWithEvidence,
        record.itemsTotal,
        record.secondsToFirstNumber,
        record.createdAt,
        JSON.stringify(record.card),
        JSON.stringify(record.transcript),
      );
  }

  list(personaId?: string): AttemptRecord[] {
    const rows = personaId
      ? this.db
          .prepare("SELECT * FROM attempts WHERE persona_id = ? ORDER BY created_at DESC")
          .all(personaId)
      : this.db.prepare("SELECT * FROM attempts ORDER BY created_at DESC").all();
    return (rows as SqliteRow[]).map(toRecord);
  }

  get(id: string): AttemptRecord | null {
    const row = this.db.prepare("SELECT * FROM attempts WHERE id = ?").get(id);
    return row ? toRecord(row as SqliteRow) : null;
  }
}

let store: Store | null = null;

export async function getStore(): Promise<Store> {
  if (store) return store;

  // A read-only or ephemeral host keeps history in memory rather than failing a drill.
  if (process.env.SPARBIRD_EPHEMERAL === "1" || process.env.VERCEL) {
    store = new MemoryStore();
    return store;
  }

  try {
    const path = process.env.SPARBIRD_DB?.trim() || join(process.cwd(), "data", "sparbird.db");
    mkdirSync(dirname(path), { recursive: true });
    const { default: Database } = await import("better-sqlite3");
    store = new SqliteStore(new Database(path) as unknown as SqliteStore["db"]);
  } catch {
    store = new MemoryStore();
  }
  return store;
}

/** Builds the row for one finished drill. Free text is scrubbed of anything phone-shaped. */
export function toAttemptRecord(outcome: DrillOutcome, card: Scorecard): AttemptRecord {
  return {
    id: `${outcome.callId}-${Date.parse(outcome.startedAt) || Date.now()}`,
    personaId: outcome.personaId,
    callId: outcome.callId,
    live: outcome.live,
    disposition: card.disposition,
    disputed: card.disputed,
    points: card.points,
    maxPoints: card.maxPoints,
    itemsWithEvidence: card.itemsWithEvidence,
    itemsTotal: card.itemsTotal,
    secondsToFirstNumber: card.metrics.secondsToFirstNumber,
    createdAt: outcome.startedAt,
    card,
    transcript: outcome.transcript.map((turn) => ({
      ...turn,
      text: redactNumbers(turn.text),
    })),
  };
}
