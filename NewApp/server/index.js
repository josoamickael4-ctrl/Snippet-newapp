import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// SQLite Database Setup
const dbPath = path.resolve(__dirname, '../database/newapp.sqlite');
const db = new Database(dbPath);

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS imported_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT,
    content JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// API: Get distinct sources
app.get('/api/sources', (req, res) => {
  try {
    const rows = db.prepare('SELECT DISTINCT source FROM imported_data').all();
    res.json(rows.map(r => r.source));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Reinitialize Data (Reset)
app.post('/api/reset', (req, res) => {
  const { source } = req.body;
  try {
    if (source) {
      db.prepare('DELETE FROM imported_data WHERE source = ?').run(source);
    } else {
      db.prepare('DELETE FROM imported_data').run();
    }
    res.json({ message: 'Données réinitialisées avec succès' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Import Data
app.post('/api/import', (req, res) => {
  const { source, content, mode } = req.body; // mode: 'append' or 'replace'
  try {
    db.transaction(() => {
      if (mode === 'replace') {
        db.prepare('DELETE FROM imported_data WHERE source = ?').run(source);
      }
      const insert = db.prepare('INSERT INTO imported_data (source, content) VALUES (?, ?)');
      insert.run(source, JSON.stringify(content));
    })();
    res.json({ message: 'Données importées avec succès' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get Local Data
app.get('/api/data', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM imported_data ORDER BY created_at DESC').all();
    res.json(rows.map(row => ({ ...row, content: JSON.parse(row.content) })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy to Snipe-IT API (JSON)
app.get('/api/snipe-it/:endpoint', async (req, res) => {
  const { endpoint } = req.params;
  const snipeUrl = `http://localhost:8000/api/v1/${endpoint}`; // Adjust if Needed
  try {
    // Note: In a real scenario, you'd add the API Key in headers
    const response = await axios.get(snipeUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.SNIPE_API_KEY || 'YOUR_API_KEY_HERE'}`
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`NewApp Backend running at http://localhost:${port}`);
});
