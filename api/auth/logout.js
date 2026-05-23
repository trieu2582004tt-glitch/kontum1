import { ensureRuntimeStore, saveRuntimeStore, authorize } from './store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const token = authorize(req);
  if (!token) return res.status(400).json({ error: 'missing token' });
  const store = ensureRuntimeStore();
  if (store.sessions[token]) {
    delete store.sessions[token];
    saveRuntimeStore(store);
  }
  res.json({ ok: true });
}
