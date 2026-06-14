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

// Ajoute un enregistrement dans l'historique
function addHistory(ticketId, ancienMontant, nouveauMontant, action) {
  try {
    db.prepare(`
      INSERT INTO ticket_history (ticket_id, ancien_montant, nouveau_montant, action)
      VALUES (?, ?, ?, ?)
    `).run(ticketId, String(ancienMontant || '0'), String(nouveauMontant || '0'), action);
  } catch (e) {
    console.error('Erreur historique:', e.message);
  }
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
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
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
    const statusObj = findOrCreateStatus(status || 'New');
    const priorityObj = findOrCreatePriority(priority || 'Medium');

    const result = db.prepare(`
      INSERT INTO tickets (
        num_ticket,
        date,
        heure,
        titre,
        description,
        status_id,
        priority_id,
        items,
        montant
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      num_ticket,
      date,
      heure,
      titre,
      description,
      statusObj.id,
      priorityObj.id,
      items || '[]',
      '0'
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
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
});

router.get('/kanban-config', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM color_statut').all();
    res.json(rows);
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
});

// Route pour récupérer l'historique d'un ticket
router.get('/:id/history', (req, res) => {
  const { id } = req.params;
  try {
    const rows = db.prepare(`
      SELECT * FROM ticket_history 
      WHERE ticket_id = ? 
      ORDER BY date DESC
    `).all(id);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH avec historique
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { status, resolution, montant } = req.body;

  try {
    // Récupérer l'ancien montant avant modification
    const ticketActuel = db.prepare('SELECT montant FROM tickets WHERE id = ?').get(id);
    const ancienMontant = ticketActuel?.montant || '0';

    const statusObj = findOrCreateStatus(status);

    // Si on passe en Closed avec un montant
    if (montant !== undefined && montant !== '') {
      db.prepare(`
        UPDATE tickets
        SET status_id = ?,
          montant = ?
        WHERE id = ?
      `).run(statusObj.id, String(montant), id);
      
      // Ajouter à l'historique
      if (Number(montant) !== Number(ancienMontant)) {
        const action = Number(ancienMontant) === 0 ? 'fermeture' : (Number(montant) > Number(ancienMontant) ? 'reouverture' : 'modification');
        addHistory(id, ancienMontant, montant, action);
      }
    } 
    // Si mise à jour avec résolution (gardé pour compatibilité)
    else if (resolution) {
      db.prepare(`
        UPDATE tickets
        SET status_id = ?,
            resolution = ?,
            montant = ?
        WHERE id = ?
      `).run(statusObj.id, resolution, montant || '', id);
      
      if (montant && Number(montant) !== Number(ancienMontant)) {
        addHistory(id, ancienMontant, montant, 'modification');
      }
    } 
    // Sinon juste changement de statut
    else {
      db.prepare(`
        UPDATE tickets
        SET status_id = ?
        WHERE id = ?
      `).run(statusObj.id, id);
    }

    res.json({ message: 'Ticket mis à jour' });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;