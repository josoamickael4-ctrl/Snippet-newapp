import express from 'express';
import db from '../db.js';

const router = express.Router();

function findOrCreateStatus(name) {
  let status = db
    .prepare('SELECT * FROM statuses WHERE name = ?')
    .get(name);

  if (!status) {
    const result = db
      .prepare('INSERT INTO statuses(name) VALUES (?)')
      .run(name);

    status = {
      id: result.lastInsertRowid,
      name
    };
  }

  return status;
}

function findOrCreatePriority(name) {
  let priority = db
    .prepare('SELECT * FROM priorities WHERE name = ?')
    .get(name);

  if (!priority) {
    const result = db
      .prepare('INSERT INTO priorities(name) VALUES (?)')
      .run(name);

    priority = {
      id: result.lastInsertRowid,
      name
    };
  }

  return priority;
}


router.get('/', (req, res) => {
  try {
    const rows = db.prepare(`
  SELECT
    t.*,
    s.name AS status,
    p.name AS priority
  FROM tickets t
  LEFT JOIN statuses s
    ON t.status_id = s.id
  LEFT JOIN priorities p
    ON t.priority_id = p.id
  ORDER BY t.created_at DESC
`).all();
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  const {
    num_ticket,
    date,
    heure,
    titre,
    description,
    status,
    priority,
    items
  } = req.body;

  try {

    const statusObj = findOrCreateStatus(
      status || 'New'
    );

    const priorityObj = findOrCreatePriority(
      priority || 'Medium'
    );

    const result = db.prepare(`
      INSERT INTO tickets (
        num_ticket,
        date,
        heure,
        titre,
        description,
        status_id,
        priority_id,
        items
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      num_ticket,
      date,
      heure,
      titre,
      description,
      statusObj.id,
      priorityObj.id,
      items || '[]'
    );

    res.json({
      id: result.lastInsertRowid,
      message: 'Ticket créé'
    });

  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

router.post('/kanban-config', (req, res) => {
  const { statut_key, color, traduction } = req.body;
  if (!statut_key) return res.status(400).json({ error: 'statut_key requis' });
  try {
    db.prepare(
      'INSERT OR REPLACE INTO color_statut (statut_key, color, traduction) VALUES (?, ?, ?)'
    ).run(statut_key, color, traduction || '');
    res.json({ message: `Couleur de "${statut_key}" sauvegardée` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/kanban-config', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM color_statut').all();
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/couts', (req, res) => {
  try {
    // total par categorie
    const parCategorie = db.prepare(`
      SELECT categorie, SUM(montant) as total
      FROM cout_tickets
      GROUP BY categorie
      ORDER BY total DESC
    `).all();

    // detail par ticket
    const detail = db.prepare(`
      SELECT num_ticket, asset_tag, categorie, montant
      FROM cout_tickets
      ORDER BY num_ticket ASC
    `).all();

    // total general
    const totalGeneral = db.prepare(`
      SELECT SUM(montant) as total FROM cout_tickets
    `).get();

    res.json({ parCategorie, detail, totalGeneral: totalGeneral.total || 0 });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// UN SEUL PATCH — gère status + resolution ensemble
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, montant, items } = req.body;

  try {
    const statusObj = findOrCreateStatus(status);
    db.prepare(`UPDATE tickets SET status_id = ? WHERE id = ?`).run(statusObj.id, id);

    if (montant && status === 'Closed' && items) {
      const parsed = typeof items === 'string' ? JSON.parse(items) : items;
      const nbAssets = parsed.length;

      if (nbAssets > 0) {
        const partParAsset = montant / nbAssets;
        db.prepare(`DELETE FROM cout_tickets WHERE ticket_id = ?`).run(id);
        const ticket = db.prepare(`SELECT num_ticket FROM tickets WHERE id = ?`).get(id);

        // aller chercher les assets dans Snipe-IT pour avoir la categorie
        let assetsSnipe = [];
        try {
          const { default: axios } = await import('axios');
          const { SNIPE_URL, snipeHeaders } = await import('../config.js');
          const res = await axios.get(`${SNIPE_URL}/api/v1/hardware`, {
            headers: snipeHeaders,
            params: { limit: 500 }
          });
          assetsSnipe = res.data?.rows || [];
        } catch (e) {
          console.error('impossible de joindre Snipe-IT:', e.message);
        }

        for (const el of parsed) {
          const tag = typeof el === 'object' ? el.asset_tag : el;
          let cat  = typeof el === 'object' ? (el.category || el.categorie || null) : null;

          // si pas de categorie, chercher dans Snipe-IT
          if (!cat) {
            const found = assetsSnipe.find(a => a.asset_tag === tag);
            cat = found?.category?.name || 'Inconnu';
          }

          db.prepare(`
            INSERT INTO cout_tickets (ticket_id, num_ticket, asset_tag, categorie, montant)
            VALUES (?, ?, ?, ?, ?)
          `).run(id, ticket.num_ticket, tag, cat, partParAsset);
        }
      }
    }

    res.json({ message: 'Ticket mis a jour' });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


export default router;