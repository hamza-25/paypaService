import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../../data/payments.db");

// create the data/ directory if it doesn't exist
import fs from "fs";
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// WAL mode = faster writes, safe concurrent reads
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    order_id     TEXT PRIMARY KEY,
    capture_id   TEXT UNIQUE,
    service_id   TEXT NOT NULL,
    buyer_email  TEXT,
    amount       TEXT NOT NULL,
    currency     TEXT NOT NULL DEFAULT 'USD',
    status       TEXT NOT NULL DEFAULT 'pending',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    fulfilled_at TEXT
  );

  CREATE TABLE IF NOT EXISTS webhook_events (
    event_id     TEXT PRIMARY KEY,
    event_type   TEXT NOT NULL,
    order_id     TEXT,
    capture_id   TEXT,
    processed_at TEXT NOT NULL DEFAULT (datetime('now')),
    raw_payload  TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
  );
`);

console.log("[db] connected:", DB_PATH);

export default db;
