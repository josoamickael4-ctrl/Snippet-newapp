import express from 'express';
import axios from 'axios';
import db from '../db.js';
import { deleteAllUsers } from '../mysql.js';
import { SNIPE_URL, snipeHeaders } from '../config.js';

const router = express.Router();

router.post('/:type', async (req, res) => {
  const { type } = req.params;
  const typesValides = ['all', 'assets', 'accessories', 'components', 'consumables', 'licenses'];

  if (!typesValides.includes(type)) {
    return res.status(400).json({ status: 'error', message: `Type invalide : ${type}` });
  }

  const resultats = { sqlite: '', snipeit: '' };

  try {
    if (type === 'all') {
      db.prepare('DELETE FROM imported_data').run();
      await deleteAllUsers();
      db.prepare('DELETE FROM tickets').run();
      resultats.sqlite = 'SQLite vidé (imported_data + tickets)';
    } else {
      db.prepare('DELETE FROM imported_data WHERE source = ?').run(type);
      resultats.sqlite = `SQLite : "${type}" supprimé`;
    }
  } catch (e) {
    resultats.sqlite = `Erreur SQLite : ${e.message}`;
  }

  try {
    const snipeResponse = await axios.post(
      `${SNIPE_URL}/api/v1/reset/${type}`,
      {},
      { headers: snipeHeaders }
    );
    resultats.snipeit = snipeResponse.data?.message || 'Snipe-IT réinitialisé';
  } catch (e) {
    resultats.snipeit = `Erreur Snipe-IT : ${e.response?.data?.message || e.message}`;
  }

  const aDesErreurs = resultats.sqlite.includes('Erreur') || resultats.snipeit.includes('Erreur');
  res.json({
    status: aDesErreurs ? 'partiel' : 'success',
    message: aDesErreurs ? 'Reset partiel, voir détail' : 'Reset complet (SQLite + Snipe-IT)',
    detail: resultats,
  });
});

export default router;