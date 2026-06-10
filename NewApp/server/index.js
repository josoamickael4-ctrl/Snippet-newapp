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
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS kanban_config (
    status_key TEXT PRIMARY KEY,
    malagasy_name TEXT,
    bg_color TEXT
  );
`);

// Migration de secours si la table tickets existait déjà sans la colonne notes
try {
  db.exec("ALTER TABLE tickets ADD COLUMN notes TEXT;");
} catch (e) {
  // Ignorer si la colonne existe déjà
}

// Initialisation des configurations Kanban par défaut si vides
try {
  const configCount = db.prepare('SELECT COUNT(*) as count FROM kanban_config').get().count;
  if (configCount === 0) {
    db.prepare("INSERT INTO kanban_config (status_key, malagasy_name, bg_color) VALUES ('New', 'vaovao', '#312e81')").run();
    db.prepare("INSERT INTO kanban_config (status_key, malagasy_name, bg_color) VALUES ('In Progress', 'efa manao', '#854d0e')").run();
    db.prepare("INSERT INTO kanban_config (status_key, malagasy_name, bg_color) VALUES ('Closed', 'vita', '#14532d')").run();
  }
} catch (e) {
  console.error("Erreur d'initialisation kanban_config:", e.message);
}
 
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
  const { date, heure, titre, description, status, priority, items, notes } = req.body;
  try {
    // Auto-générer un numéro de ticket lisible : TK-0001, TK-0002...
    const lastTicket = db.prepare('SELECT num_ticket FROM tickets ORDER BY id DESC LIMIT 1').get();
    let lastNum = 0;
    if (lastTicket && lastTicket.num_ticket) {
      const match = String(lastTicket.num_ticket).match(/(\d+)$/);
      if (match) lastNum = parseInt(match[1], 10);
    }
    const newNum = lastNum + 1;
    const num_ticket = `TK-${String(newNum).padStart(4, '0')}`;

    const result = db.prepare(
      'INSERT INTO tickets (num_ticket, date, heure, titre, description, status, priority, items, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(num_ticket, date, heure, titre, description, status || 'New', priority || 'Medium', items || '[]', notes || '');
    res.json({ id: result.lastInsertRowid, num_ticket, message: 'Ticket créé ✅' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/tickets/:id', (req, res) => {
  const { id } = req.params;
  const { titre, description, status, priority, items, notes } = req.body;
  try {
    db.prepare(
      'UPDATE tickets SET titre = ?, description = ?, status = ?, priority = ?, items = ?, notes = ? WHERE id = ?'
    ).run(titre, description, status, priority, items || '[]', notes || '', id);
    res.json({ message: 'Ticket mis à jour ✅' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/tickets/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  try {
    db.prepare('UPDATE tickets SET status = ?, notes = ? WHERE id = ?').run(status, notes || '', id);
    res.json({ message: 'Statut du ticket mis à jour avec succès ✅' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/tickets/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM tickets WHERE id = ?').run(id);
    res.json({ message: 'Ticket supprimé ✅' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Configuration Kanban ──────────────────────────────────────────────────

app.get('/api/kanban/config', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM kanban_config').all();
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/kanban/config', (req, res) => {
  const configs = req.body; // Array of { status_key, malagasy_name, bg_color }
  try {
    db.transaction(() => {
      const stmt = db.prepare('INSERT OR REPLACE INTO kanban_config (status_key, malagasy_name, bg_color) VALUES (?, ?, ?)');
      for (const conf of configs) {
        stmt.run(conf.status_key, conf.malagasy_name, conf.bg_color);
      }
    })();
    res.json({ message: 'Configuration Kanban enregistrée ✅' });
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
 
app.post('/api/import/tickets', async (req, res) => {
  const { rows } = req.body;
  let success = 0;
  const errors = [];

  let hardwareList = [];
  try {
    const hardwareRes = await axios.get(`${SNIPE_URL}/api/v1/hardware?limit=1000`, { headers: snipeHeaders });
    hardwareList = hardwareRes.data?.rows || [];
  } catch (e) {
    console.error("Impossible de charger les matériels de Snipe-IT pour la résolution d'import de tickets:", e.message);
  }

  for (const row of rows) {
    try {
      const rawItems = row.Items || row.items || '[]';
      let parsedItems = [];
      try {
        parsedItems = typeof rawItems === 'string' ? JSON.parse(rawItems) : rawItems;
      } catch (e) {
        parsedItems = [];
      }

      if (!Array.isArray(parsedItems)) {
        parsedItems = [];
      }

      // Résoudre les tags d'asset en objets complets pour le Kanban et le BackOffice
      const resolvedItems = parsedItems.map(item => {
        const tag = typeof item === 'string' ? item : (item.asset_tag || '');
        const matched = hardwareList.find(h => h.asset_tag === tag);
        if (matched) {
          return {
            id: matched.id,
            asset_tag: matched.asset_tag,
            nom: matched.name || matched.model?.name,
            categorie: matched.category?.name || 'Asset'
          };
        }
        return {
          asset_tag: tag,
          nom: 'Importé (en attente)',
          categorie: 'Asset'
        };
      });

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
        JSON.stringify(resolvedItems)
      );
      success++;
    } catch (err) {
      errors.push({ num: row.Num_Ticket || row.num_ticket, erreur: err.message });
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