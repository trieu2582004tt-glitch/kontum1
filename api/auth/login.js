import { ensureRuntimeStore, saveRuntimeStore, hashPassword, createToken } from './store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const body = await new Promise(r => {
    let data=''; req.on('data',c=>data+=c); req.on('end',()=>r(data?JSON.parse(data):{}));
  });
  const { username, password } = body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  const store = ensureRuntimeStore();
  const user = store.users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });

  const hashed = hashPassword(password, user.salt);
  if (hashed !== user.hash) return res.status(401).json({ error: 'invalid credentials' });

  const token = createToken();
  store.sessions[token] = { user_id: user.id, created_at: Date.now() };
  saveRuntimeStore(store);

  res.json({ token, user: { id: user.id, username: user.username, is_admin: !!user.is_admin } });
}
