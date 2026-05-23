import { ensureRuntimeStore, authorize } from './store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  const token = authorize(req);
  if (!token) return res.status(401).json({ error: 'missing token' });
  const store = ensureRuntimeStore();
  const session = store.sessions[token];
  if (!session) return res.status(401).json({ error: 'invalid session' });
  const user = store.users.find(u => u.id === session.user_id);
  if (!user) return res.status(404).json({ error: 'user not found' });
  res.json({ user: { id: user.id, username: user.username, is_admin: !!user.is_admin } });
}
