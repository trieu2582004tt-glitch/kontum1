import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const seedFilePath = path.join(process.cwd(), 'data', 'auth-seed.json');
const runtimeFilePath = path.join('/tmp', 'auth-store.json');

export function ensureRuntimeStore() {
  if (!fs.existsSync(runtimeFilePath)) {
    if (fs.existsSync(seedFilePath)) {
      fs.mkdirSync(path.dirname(runtimeFilePath), { recursive: true });
      fs.copyFileSync(seedFilePath, runtimeFilePath);
    } else {
      const seed = { users: [], sessions: {} };
      fs.writeFileSync(runtimeFilePath, JSON.stringify(seed, null, 2));
    }
  }
  const raw = fs.readFileSync(runtimeFilePath, 'utf8');
  return JSON.parse(raw);
}

export function saveRuntimeStore(store) {
  try {
    fs.writeFileSync(runtimeFilePath, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('Unable to save auth runtime store:', error);
  }
}

export function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: hashPassword(password, salt) };
}

export function createToken() {
  return crypto.randomUUID();
}

export function authorize(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export function jsonResponse(res, status, body) {
  res.status(status).json(body);
}
