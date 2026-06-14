import express from 'express';
import axios from 'axios';
import { SNIPE_URL, snipeHeaders } from '../config.js';

const router = express.Router();

router.get('/:endpoint', async (req, res) => {
  try {
    const url = `${SNIPE_URL}/api/v1/${req.params.endpoint}`;
    const response = await axios.get(url, {
      headers: snipeHeaders,
      params: req.query
    });
    res.json(response.data);
  } catch (e) { res.status(e.response?.status || 500).json({ error: e.message }); }
});



export default router;