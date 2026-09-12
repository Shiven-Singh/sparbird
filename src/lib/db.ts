/**
 * Local store for accounts and drill history.
 *
 * SQLite when better-sqlite3 is available and the filesystem is writable, otherwise an
 * in-memory store so the app still runs on a read-only or ephemeral host. Losing the store
 * loses history and accounts, not correctness.
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
  /** The account that took the call. Null for the seeded samples and for guests. */
  userId: string | null;
  /** How to find this call in the CALL-E dashboard, and audio if there ever is any. */
  providerCallId: string | null;
  recordingUrl: string | null;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  /** The plan they picked at signup. Billing is not wired yet; this is intent. */
  plan: string;
  /**
   * The number Sparbird rings for this person, E.164. Null until they add it, which is why a
   * new account cannot take a live call until they visit settings.
   */
  phone: string | null;
  createdAt: string;
}

/** Somebody asking about the Custom plan. Kept so the ask does not vanish into a mail client. */
export interface EnquiryRecord {
  id: string;
  email: string;
  /** What they need. Everything else about them can be asked in the reply. */
  requirement: string;
  createdAt: string;
}

export interface ListOptions {
  personaId?: string;
  /** Records visible to this account: the shared samples plus their own. */
  viewer?: string | null;
}

interface Store {
  readonly kind: string;
  save(record: AttemptRecord): void;
  list(options?: ListOptions): AttemptRecord[];
  get(id: string): AttemptRecord | null;
  createUser(user: UserRecord): void;
  updateUser(user: UserRecord): void;
  getUser(id: string): UserRecord | null;
  getUserByEmail(email: string): UserRecord | null;
  saveEnquiry(enquiry: EnquiryRecord): void;
  listEnquiries(): EnquiryRecord[];
}

function visible(record: AttemptRecord, viewer: string | null | undefined): boolean {
  return record.userId === null || record.userId === (viewer ?? null);
}

class MemoryStore implements Store {
  readonly kind = "memory";
  private readonly rows: AttemptRecord[] = [];
  private readonly users = new Map<string, UserRecord>();
  private readonly enquiries: EnquiryRecord[] = [];

  save(record: AttemptRecord): void {
    const at = this.rows.findIndex((r) => r.id === record.id);
    if (at >= 0) this.rows[at] = record;
    else this.rows.unshift(record);
  }
  list(options: ListOptions = {}): AttemptRecord[] {
    return this.rows.filter(
      (r) => (!options.personaId || r.personaId === options.personaId) && visible(r, options.viewer),
    );
  }
  get(id: string): AttemptRecord | null {
    return this.rows.find((r) => r.id === id) ?? null;
  }
  createUser(user: UserRecord): void {
    this.users.set(user.id, user);
  }
  updateUser(user: UserRecord): void {
    this.users.set(user.id, user);
  }
  getUser(id: string): UserRecord | null {
    return this.users.get(id) ?? null;
  }
  getUserByEmail(email: string): UserRecord | null {
    const wanted = email.toLowerCase();
    for (const u of this.users.values()) if (u.email === wanted) return u;
    return null;
  }
  saveEnquiry(enquiry: EnquiryRecord): void {
    this.enquiries.unshift(enquiry);
  }
  listEnquiries(): EnquiryRecord[] {
    return [...this.enquiries];
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
  user_id: string | null;
  provider_call_id: string | null;
  recording_url: string | null;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  plan: string;
  phone: string | null;
  created_at: string;
}

interface EnquiryRow {
  id: string;
  email: string;
  requirement: string;
  created_at: string;
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
    userId: row.user_id ?? null,
    providerCallId: row.provider_call_id ?? null,
    recordingUrl: row.recording_url ?? null,
  };
}

function toUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    plan: row.plan,
    phone: row.phone ?? null,
    createdAt: row.created_at,
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
        transcript_json TEXT NOT NULL,
        user_id TEXT,
        provider_call_id TEXT,
        recording_url TEXT
      );
      CREATE INDEX IF NOT EXISTS attempts_persona ON attempts (persona_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        plan TEXT NOT NULL DEFAULT 'solo',
        phone TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS enquiries (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        requirement TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    // A database made by an older version is missing the newer columns.
    for (const column of ["user_id TEXT", "provider_call_id TEXT", "recording_url TEXT"]) {
      try {
        this.db.exec(`ALTER TABLE attempts ADD COLUMN ${column}`);
      } catch {
        // Already there.
      }
    }
    try {
      this.db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
    } catch {
      // Already there.
    }
    try {
      const columns = this.db.prepare("PRAGMA table_info(enquiries)").all() as Array<{ name: string }>;
      if (columns.some((c) => c.name === "name")) {
        this.db.exec("DROP TABLE enquiries");
        this.db.exec(`
          CREATE TABLE enquiries (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            requirement TEXT NOT NULL,
            created_at TEXT NOT NULL
          );
        `);
      }
    } catch {
      // No such table, which is the usual case.
    }
  }

  save(record: AttemptRecord): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO attempts
         (id, persona_id, call_id, live, disposition, disputed, points, max_points,
          items_with_evidence, items_total, seconds_to_first_number, created_at,
          card_json, transcript_json, user_id, provider_call_id, recording_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        record.userId,
        record.providerCallId,
        record.recordingUrl,
      );
  }

  list(options: ListOptions = {}): AttemptRecord[] {
    const rows = options.personaId
      ? this.db
          .prepare("SELECT * FROM attempts WHERE persona_id = ? ORDER BY created_at DESC")
          .all(options.personaId)
      : this.db.prepare("SELECT * FROM attempts ORDER BY created_at DESC").all();
    return (rows as SqliteRow[]).map(toRecord).filter((r) => visible(r, options.viewer));
  }

  get(id: string): AttemptRecord | null {
    const row = this.db.prepare("SELECT * FROM attempts WHERE id = ?").get(id);
    return row ? toRecord(row as SqliteRow) : null;
  }

  createUser(user: UserRecord): void {
    this.db
      .prepare("INSERT INTO users (id, email, name, password_hash, plan, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(user.id, user.email, user.name, user.passwordHash, user.plan, user.phone, user.createdAt);
  }

  updateUser(user: UserRecord): void {
    this.db
      .prepare("UPDATE users SET name = ?, plan = ?, phone = ? WHERE id = ?")
      .run(user.name, user.plan, user.phone, user.id);
  }

  saveEnquiry(enquiry: EnquiryRecord): void {
    this.db
      .prepare("INSERT INTO enquiries (id, email, requirement, created_at) VALUES (?, ?, ?, ?)")
      .run(enquiry.id, enquiry.email, enquiry.requirement, enquiry.createdAt);
  }

  listEnquiries(): EnquiryRecord[] {
    const rows = this.db.prepare("SELECT * FROM enquiries ORDER BY created_at DESC").all() as EnquiryRow[];
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      requirement: r.requirement,
      createdAt: r.created_at,
    }));
  }

  getUser(id: string): UserRecord | null {
    const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    return row ? toUser(row as UserRow) : null;
  }

  getUserByEmail(email: string): UserRecord | null {
    const row = this.db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
    return row ? toUser(row as UserRow) : null;
  }
}

/**
 * One store per process, not one per module instance. Next.js can load this module more than
 * once (route handlers and server components are bundled separately), and a plain module-level
 * variable would give each of them its own empty MemoryStore: a call placed through the API
 * would then be invisible to the page that renders it.
 */
const globalForStore = globalThis as unknown as { __sparbirdStore?: Store };

export async function getStore(): Promise<Store> {
  if (globalForStore.__sparbirdStore) return globalForStore.__sparbirdStore;
  let store: Store;

  // A read-only or ephemeral host keeps history in memory rather than failing a drill.
  const ephemeral =
    process.env.SPARBIRD_EPHEMERAL === "1" ||
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.AWS_EXECUTION_ENV) ||
    Boolean(process.env.K_SERVICE);

  if (ephemeral) {
    store = new MemoryStore();
    globalForStore.__sparbirdStore = store;
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
  globalForStore.__sparbirdStore = store;
  return store;
}

/** Builds the row for one finished drill. Free text is scrubbed of anything phone-shaped. */
export function toAttemptRecord(outcome: DrillOutcome, card: Scorecard, userId: string | null = null): AttemptRecord {
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
    userId,
    providerCallId: outcome.providerCallId ?? null,
    recordingUrl: outcome.recordingUrl ?? null,
  };
}
