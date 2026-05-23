import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const seedFilePath = path.join(process.cwd(), 'data', 'auth-seed.json');
const runtimeFilePath = path.join('/tmp', 'auth-store.json');

function ensureRuntimeStore() {
  if (!fs.existsSync(runtimeFilePath)) {
    if (fs.existsSync(seedFilePath)) {
      fs.mkdirSync(path.dirname(runtimeFilePath), { recursive: true });
      fs.copyFileSync(seedFilePath, runtimeFilePath);
    } else {
      const seed = {
        users: [],
        sessions: {}
      };
      fs.writeFileSync(runtimeFilePath, JSON.stringify(seed, null, 2));
    }
  }
  return JSON.parse(fs.readFileSync(runtimeFilePath, 'utf8'));
}

function saveRuntimeStore(store) {
  try {
    fs.writeFileSync(runtimeFilePath, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Unable to save auth runtime store:', error);
  }
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: hashPassword(password, salt) };
}

function createToken() {
  return crypto.randomUUID();
}

function jsonResponse(res, status, body) {
  res.status(status).json(body);
}

function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  jsonResponse(res, 405, { error: 'Method Not Allowed' });
}

export default function handler(req, res) {
  const { path } = req.query;
  const segments = Array.isArray(path) ? path : [path].filter(Boolean);
  const action = segments[0];

  if (action === 'login') {
    return login(req, res);
  }
  if (action === 'register') {
    return register(req, res);
  }
  if (action === 'me') {
    return me(req, res);
  }
  if (action === 'logout') {
    return logout(req, res);
  }

  jsonResponse(res, 404, { error: 'Không tìm thấy API auth.' });
}

function getStore() {
  const store = ensureRuntimeStore();
  if (!store.users) store.users = [];
  if (!store.sessions) store.sessions = {};
  return store;
}

function authorize(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

function findUserByToken(token) {
  const store = getStore();
  const session = store.sessions[token];
  if (!session) return null;
  return store.users.find((user) => user.id === session.userId) || null;
}

function login(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }
  const { username, password } = req.body || {};
  if (!username || !password) {
    return jsonResponse(res, 400, { error: 'Tên đăng nhập và mật khẩu bắt buộc.' });
  }

  const store = getStore();
  const user = store.users.find((item) => item.username === username);
  if (!user || hashPassword(password, user.salt) !== user.passwordHash) {
    return jsonResponse(res, 401, { error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
  }

  const token = createToken();
  store.sessions[token] = { userId: user.id, createdAt: new Date().toISOString() };
  saveRuntimeStore(store);

  jsonResponse(res, 200, {
    token,
    user: {
      id: user.id,
      username: user.username,
      is_admin: !!user.isAdmin
    }
  });
}

function register(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }
  const { username, password } = req.body || {};
  if (!username || !password) {
    return jsonResponse(res, 400, { error: 'Tên đăng nhập và mật khẩu bắt buộc.' });
  }

  const store = getStore();
  const existing = store.users.find((item) => item.username === username);
  if (existing) {
    return jsonResponse(res, 409, { error: 'Tên đăng nhập đã tồn tại.' });
  }

  const passwordData = createPasswordHash(password);
  const id = store.users.length > 0 ? Math.max(...store.users.map((u) => u.id)) + 1 : 1;
  const newUser = {
    id,
    username,
    passwordHash: passwordData.hash,
    salt: passwordData.salt,
    isAdmin: false
  };

  store.users.push(newUser);
  const token = createToken();
  store.sessions[token] = { userId: id, createdAt: new Date().toISOString() };
  saveRuntimeStore(store);

  jsonResponse(res, 200, {
    token,
    user: {
      id,
      username,
      is_admin: false
    }
  });
}

function me(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  const token = authorize(req);
  if (!token) {
    return jsonResponse(res, 401, { error: 'Yêu cầu đăng nhập.' });
  }

  const user = findUserByToken(token);
  if (!user) {
    return jsonResponse(res, 401, { error: 'Phiên đăng nhập không hợp lệ.' });
  }

  jsonResponse(res, 200, {
    user: {
      id: user.id,
      username: user.username,
      is_admin: !!user.isAdmin
    }
  });
}

function logout(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  const token = authorize(req);
  if (!token) {
    return jsonResponse(res, 401, { error: 'Yêu cầu đăng nhập.' });
  }

  const store = getStore();
  if (store.sessions[token]) {
    delete store.sessions[token];
    saveRuntimeStore(store);
  }

  jsonResponse(res, 200, { ok: true });
}
