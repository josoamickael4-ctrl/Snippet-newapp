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

router.get('/sources', (req, res) => {
  try {
    const rows = db
      .prepare('SELECT DISTINCT source FROM imported_data')
      .all();

    res.json(rows.map(r => r.source));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/data', (req, res) => {
  try {
    const rows = db
      .prepare('SELECT * FROM imported_data ORDER BY created_at DESC')
      .all();

    res.json(
      rows.map(row => ({
        ...row,
        content: JSON.parse(row.content)
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/import', (req, res) => {
  const { source, content, mode } = req.body;

  try {
    db.transaction(() => {
      if (mode === 'replace') {
        db.prepare(
          'DELETE FROM imported_data WHERE source = ?'
        ).run(source);
      }

      db.prepare(
        'INSERT INTO imported_data (source, content) VALUES (?, ?)'
      ).run(source, JSON.stringify(content));
    })();

    res.json({
      message: 'Données importées avec succès'
    });

  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

router.post('/import/tickets', (req, res) => {

  const { rows } = req.body;

  let success = 0;
  const errors = [];

  for (const row of rows) {

    try {

      const numTicket =
        row.Num_Ticket ||
        row.num_ticket;

      const statusObj = findOrCreateStatus(
        row.Status ||
        row.status ||
        'New'
      );

      const priorityObj = findOrCreatePriority(
        row.Priority ||
        row.priority ||
        'Medium'
      );

      const existing = db.prepare(`
        SELECT id
        FROM tickets
        WHERE num_ticket = ?
      `).get(numTicket);

      if (existing) {
        // UPDATE existant
        db.prepare(`
          UPDATE tickets
          SET
            date = ?,
            heure = ?,
            titre = ?,
            description = ?,
            status_id = ?,
            priority_id = ?,
            items = ?,
            montant = ?
          WHERE num_ticket = ?
        `).run(
          row.Date || row.date,
          row.Heure || row.heure,
          row.Titre || row.titre,
          row.Description || row.description,
          statusObj.id,
          priorityObj.id,
          row.Items || row.items || '[]',
          row.Montant || row.montant || '0',
          numTicket
        );
      } else {
        // INSERT nouveau
        db.prepare(`
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
          numTicket,
          row.Date || row.date,
          row.Heure || row.heure,
          row.Titre || row.titre,
          row.Description || row.description,
          statusObj.id,
          priorityObj.id,
          row.Items || row.items || '[]',
          row.Montant || row.montant || '0'
        );
      }

      success++;

    } catch (err) {

      errors.push({
        num: row.Num_Ticket || row.num_ticket,
        erreur: err.message
      });

    }

  }

  res.json({
    status: errors.length === 0 ? 'success' : 'partiel',
    message: `${success}/${rows.length} tickets importés dans SQLite`,
    errors
  });

});

export default router;