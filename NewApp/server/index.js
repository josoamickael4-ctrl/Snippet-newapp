import 'dotenv/config';
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
 
// ─── Config Snipe-IT ─────────────────────────────────────────────────────────
const SNIPE_URL = process.env.SNIPE_API_URL || 'http://localhost:8000';
const SNIPE_TOKEN = process.env.SNIPE_API_TOKEN || '';
 
const snipeHeaders = {
  'Authorization': `Bearer ${SNIPE_TOKEN}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};
 
// ─── SQLite ───────────────────────────────────────────────────────────────────
const dbPath = path.resolve(__dirname, '../database/newapp.sqlite');
const db = new Database(dbPath);
 
db.exec(`
  CREATE TABLE IF NOT EXISTS imported_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT,
    content JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    num_ticket INTEGER,
    date TEXT,
    heure TEXT,
    titre TEXT,
    description TEXT,
    status TEXT DEFAULT 'New',
    priority TEXT DEFAULT 'Medium',
    items TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
 
// ─── Routes SQLite ────────────────────────────────────────────────────────────
 
app.get('/api/sources', (req, res) => {
  try {
    const rows = db.prepare('SELECT DISTINCT source FROM imported_data').all();
    res.json(rows.map(r => r.source));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
 
app.post('/api/import', (req, res) => {
  const { source, content, mode } = req.body;
  try {
    db.transaction(() => {
      if (mode === 'replace') db.prepare('DELETE FROM imported_data WHERE source = ?').run(source);
      db.prepare('INSERT INTO imported_data (source, content) VALUES (?, ?)').run(source, JSON.stringify(content));
    })();
    res.json({ message: 'Données importées avec succès' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
 
app.get('/api/data', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM imported_data ORDER BY created_at DESC').all();
    res.json(rows.map(row => ({ ...row, content: JSON.parse(row.content) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
 
// ─── Proxy GET Snipe-IT ───────────────────────────────────────────────────────
 
app.get('/api/snipe-it/:endpoint', async (req, res) => {
  try {
    const response = await axios.get(`${SNIPE_URL}/api/v1/${req.params.endpoint}`, { headers: snipeHeaders });
    res.json(response.data);
  } catch (e) { res.status(e.response?.status || 500).json({ error: e.message }); }
});
 
// ─── RESET : SQLite + Snipe-IT ────────────────────────────────────────────────
 
app.post('/api/reset/:type', async (req, res) => {
  const { type } = req.params;
  const typesValides = ['all', 'assets', 'accessories', 'components', 'consumables', 'licenses'];
 
  if (!typesValides.includes(type)) {
    return res.status(400).json({ status: 'error', message: `Type invalide : ${type}` });
  }
 
  const resultats = { sqlite: '', snipeit: '' };
 
  try {
    if (type === 'all') {
      db.prepare('DELETE FROM imported_data').run();
      db.prepare('DELETE FROM tickets').run();
      resultats.sqlite = 'SQLite vidé (imported_data + tickets) ✅';
    } else {
      db.prepare('DELETE FROM imported_data WHERE source = ?').run(type);
      resultats.sqlite = `SQLite : "${type}" supprimé ✅`;
    }
  } catch (e) {
    resultats.sqlite = `Erreur SQLite ❌ : ${e.message}`;
  }
 
  try {
    const snipeResponse = await axios.post(
      `${SNIPE_URL}/api/v1/reset/${type}`,
      {},
      { headers: snipeHeaders }
    );
    resultats.snipeit = snipeResponse.data?.message || 'Snipe-IT réinitialisé ✅';
  } catch (e) {
    resultats.snipeit = `Erreur Snipe-IT ❌ : ${e.response?.data?.message || e.message}`;
  }
 
  const aDesErreurs = resultats.sqlite.includes('❌') || resultats.snipeit.includes('❌');
  res.json({
    status: aDesErreurs ? 'partiel' : 'success',
    message: aDesErreurs ? '⚠️ Reset partiel, voir détail' : '✅ Reset complet (SQLite + Snipe-IT)',
    detail: resultats,
  });
});
 
// ─── Tickets ──────────────────────────────────────────────────────────────────
 
app.get('/api/tickets', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM tickets ORDER BY created_at DESC').all();
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
 
app.post('/api/tickets', (req, res) => {
  const { num_ticket, date, heure, titre, description, status, priority, items } = req.body;
  try {
    const result = db.prepare(
      'INSERT INTO tickets (num_ticket, date, heure, titre, description, status, priority, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(num_ticket, date, heure, titre, description, status || 'New', priority || 'Medium', items || '[]');
    res.json({ id: result.lastInsertRowid, message: 'Ticket créé ✅' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
 
// ─── Import assets → Snipe-IT ─────────────────────────────────────────────────
 
app.post('/api/import/assets', async (req, res) => {
  const { rows } = req.body;
  const resultats = { success: 0, errors: [] };
 
  // On charge les status labels UNE SEULE FOIS pour tous les assets
  let statusLabels = [];
  try {
    const statusRes = await axios.get(`${SNIPE_URL}/api/v1/statuslabels`, { headers: snipeHeaders });
    statusLabels = statusRes.data?.rows || [];
  } catch (e) {
    console.error('Impossible de charger les status labels:', e.message);
  }
 
  for (const row of rows) {
    try {
      // Étape 1 : trouver ou créer la catégorie
      const catRes = await axios.get(
        `${SNIPE_URL}/api/v1/categories?search=${encodeURIComponent(row.category)}&limit=1`,
        { headers: snipeHeaders }
      );
      let categoryId = catRes.data?.rows?.[0]?.id;
      if (!categoryId) {
        const newCat = await axios.post(`${SNIPE_URL}/api/v1/categories`, {
          name: row.category,
          category_type: 'asset',
        }, { headers: snipeHeaders });
        categoryId = newCat.data?.payload?.id;
      }
 
      // Étape 2 : trouver ou créer le fabricant
      const mfrRes = await axios.get(
        `${SNIPE_URL}/api/v1/manufacturers?search=${encodeURIComponent(row.manufacturer)}&limit=1`,
        { headers: snipeHeaders }
      );
      let manufacturerId = mfrRes.data?.rows?.[0]?.id;
      if (!manufacturerId) {
        const newMfr = await axios.post(`${SNIPE_URL}/api/v1/manufacturers`,
          { name: row.manufacturer },
          { headers: snipeHeaders }
        );
        manufacturerId = newMfr.data?.payload?.id;
      }
 
      // Étape 3 : trouver ou créer le modèle
      const mdlRes = await axios.get(
        `${SNIPE_URL}/api/v1/models?search=${encodeURIComponent(row.model)}&limit=1`,
        { headers: snipeHeaders }
      );
      let modelId = mdlRes.data?.rows?.[0]?.id;
      if (!modelId) {
        const newMdl = await axios.post(`${SNIPE_URL}/api/v1/models`, {
          name: row.model,
          category_id: categoryId,
          manufacturer_id: manufacturerId,
        }, { headers: snipeHeaders });
        modelId = newMdl.data?.payload?.id;
      }
 
      // Étape 4 : trouver le status_id dynamiquement depuis les vrais statuts Snipe-IT
      // "Deployed" dans le CSV → on cherche un statut "deployable" dans Snipe-IT
      const statusNom = (row.status || '').toLowerCase().trim();
      let statusId = 1; // défaut : Ready to Deploy (id=1 dans ta base)
 
      // Cherche d'abord une correspondance exacte par nom
      const exact = statusLabels.find(l => l.name.toLowerCase() === statusNom);
      if (exact) {
        statusId = exact.id;
      } else if (statusNom === 'deployed') {
        // "Deployed" n'existe pas dans Snipe-IT par défaut
        // → on prend le premier statut de type "deployable"
        const deployable = statusLabels.find(l => l.type === 'deployable');
        if (deployable) statusId = deployable.id;
      } else if (statusNom === 'pending') {
        const pending = statusLabels.find(l => l.type === 'pending');
        if (pending) statusId = pending.id;
      } else if (statusNom === 'archived') {
        const archived = statusLabels.find(l => l.type === 'archived');
        if (archived) statusId = archived.id;
      }
 
      // Étape 5 : créer l'asset dans Snipe-IT
      const assetRes = await axios.post(`${SNIPE_URL}/api/v1/hardware`, {
        asset_tag: row.asset_tag,
        serial: row.serial,
        name: row.name,
        model_id: modelId,
        status_id: statusId,
        purchase_date: row.purchase_date ? row.purchase_date.split('/').reverse().join('-') : null,
        purchase_cost: row.purchase_cost || null,
      }, { headers: snipeHeaders });
 
      // Vérifie que Snipe-IT a bien créé l'asset (status: success dans le payload)
      if (assetRes.data?.status === 'error') {
        throw new Error(JSON.stringify(assetRes.data?.messages));
      }
 
      resultats.success++;
    } catch (err) {
      resultats.errors.push({
        asset_tag: row.asset_tag,
        erreur: err.response?.data?.messages || err.message,
      });
    }
  }
 
  res.json({
    status: resultats.errors.length === 0 ? 'success' : 'partiel',
    message: `${resultats.success}/${rows.length} assets importés dans Snipe-IT`,
    errors: resultats.errors,
  });
});
 
// ─── Import tickets → SQLite ──────────────────────────────────────────────────
 
app.post('/api/import/tickets', (req, res) => {
  const { rows } = req.body;
  let success = 0;
  const errors = [];
 
  for (const row of rows) {
    try {
      db.prepare(`
        INSERT INTO tickets (num_ticket, date, heure, titre, description, status, priority, items)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        row.Num_Ticket || row.num_ticket,
        row.Date || row.date,
        row.Heure || row.heure,
        row.Titre || row.titre,
        row.Description || row.description,
        row.Status || row.status || 'New',
        row.Priority || row.priority || 'Medium',
        row.Items || row.items || '[]'
      );
      success++;
    } catch (err) {
      errors.push({ num: row.Num_Ticket, erreur: err.message });
    }
  }
 
  res.json({
    status: errors.length === 0 ? 'success' : 'partiel',
    message: `${success}/${rows.length} tickets importés dans SQLite`,
    errors,
  });
});
 
// ─── Start ────────────────────────────────────────────────────────────────────
 
app.listen(port, () => {
  console.log(`\n NewApp Backend → http://localhost:${port}`);
  console.log(`🔗 Snipe-IT URL   → ${SNIPE_URL}`);
  console.log(`🔑 Token configuré → ${SNIPE_TOKEN ? 'OUI ' : 'NON  (vérifie ton .env)'}\n`);
});