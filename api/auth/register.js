import { ensureRuntimeStore, saveRuntimeStore, createPasswordHash, createToken } from './store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const body = await new Promise(r => {
    let data=''; req.on('data',c=>data+=c); req.on('end',()=>r(data?JSON.parse(data):{}));
  });
  const { username, password } = body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  const store = ensureRuntimeStore();
  if (store.users.find(u => u.username === username)) return res.status(409).json({ error: 'username exists' });

  const nextId = (store.users.reduce((m,u)=>Math.max(m,u.id),0) || 0) + 1;
  const { salt, hash } = createPasswordHash(password);
  const newUser = { id: nextId, username, salt, hash, is_admin: false };
  store.users.push(newUser);
  const token = createToken();
  store.sessions[token] = { user_id: newUser.id, created_at: Date.now() };
  saveRuntimeStore(store);

  res.status(201).json({ token, user: { id: newUser.id, username: newUser.username, is_admin: false } });
}
