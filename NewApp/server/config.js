import 'dotenv/config';

export const SNIPE_URL = process.env.SNIPE_API_URL || 'http://localhost:8000';
export const SNIPE_TOKEN = process.env.SNIPE_API_TOKEN || '';

export const snipeHeaders = {
  'Authorization': `Bearer ${SNIPE_TOKEN}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};