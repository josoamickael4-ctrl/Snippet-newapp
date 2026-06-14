import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { SNIPE_URL, SNIPE_TOKEN } from './config.js';

import ticketsRouter from './routes/tickets.js';
import snipeitRouter from './routes/snipeit.js';
import resetRouter from './routes/reset.js';
import importDataRouter from './routes/importData.js';
import importAssetsRouter from './routes/importAssets.js';

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.use('/api/tickets', ticketsRouter);
app.use('/api/snipe-it', snipeitRouter);
app.use('/api/reset', resetRouter);
app.use('/api', importDataRouter);
app.use('/api/import/assets', importAssetsRouter);

app.listen(port, () => {
  console.log(`\n NewApp Backend → http://localhost:${port}`);
  console.log(` Snipe-IT URL   → ${SNIPE_URL}`);
  console.log(` Token configuré → ${SNIPE_TOKEN ? 'OUI' : 'NON (vérifie ton .env)'}\n`);
});