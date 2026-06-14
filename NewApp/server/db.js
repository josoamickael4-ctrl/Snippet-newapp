import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../database/newapp.sqlite');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS imported_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT,
    content JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS priorities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    num_ticket INTEGER UNIQUE,

    date TEXT,
    heure TEXT,

    titre TEXT,
    description TEXT,

    status_id INTEGER,
    priority_id INTEGER,

    items TEXT,

    resolution TEXT DEFAULT '',
    montant TEXT DEFAULT '',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,


    FOREIGN KEY(status_id) REFERENCES statuses(id),
    FOREIGN KEY(priority_id) REFERENCES priorities(id)
  );

  CREATE TABLE IF NOT EXISTS color_statut (
    statut_key TEXT PRIMARY KEY,
    color TEXT NOT NULL DEFAULT '#1e1e2e',
    traduction TEXT NOT NULL DEFAULT ''
  );

  -- Table d'historique des montants (pour les réouvertures)
  CREATE TABLE IF NOT EXISTS ticket_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    ancien_montant TEXT DEFAULT '0',
    nouveau_montant TEXT DEFAULT '0',
    action TEXT NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
  );
`);

export default db;