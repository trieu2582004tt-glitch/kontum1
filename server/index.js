import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
    cb(null, unique + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Chỉ chấp nhận file ảnh.'));
  }
});

const app = express();
const port = process.env.PORT || 4000;

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function comparePassword(password, hash, salt) {
  const compare = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === compare;
}

app.use(cors());
app.use(express.json());
// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

const db = await initDb();

function getToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

async function authMiddleware(req, res, next) {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Yêu cầu đăng nhập.' });
  }

  const session = await db.get('SELECT user_id FROM sessions WHERE token = ?', token);
  if (!session) {
    return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.' });
  }

  const user = await db.get('SELECT id, username, is_admin FROM users WHERE id = ?', session.user_id);
  if (!user) {
    await db.run('DELETE FROM sessions WHERE token = ?', token);
    return res.status(401).json({ error: 'Người dùng không tồn tại.' });
  }

  req.user = user;
  req.token = token;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Chỉ admin mới có quyền truy cập.' });
  }
  next();
}

app.get('/api/locations', async (req, res) => {
  const { city, district, commune, category, type } = req.query;
  const where = ['status = \'approved\''];
  const params = [];
  
  if (city) {
    where.push('city = ?');
    params.push(city);
  }
  if (district) {
    where.push('district = ?');
    params.push(district);
  }
  if (commune) {
    where.push('commune = ?');
    params.push(commune);
  }
  if (category) {
    where.push('category = ?');
    params.push(category);
  }
  if (type) {
    where.push('type = ?');
    params.push(type);
  }

  const sql = `SELECT * FROM restaurants WHERE ${where.join(' AND ')} ORDER BY city, name`;
  const locations = await db.all(sql, ...params);
  res.json(locations);
});

// Authenticated: submit a location suggestion (pending admin approval)
app.post('/api/locations/suggest', authMiddleware, async (req, res) => {
  const { name, city, district, commune, category, description, priceRange, latitude, longitude, imageUrl, type, submitter_name, mapUrl, address } = req.body;
  if (!name || !city || !category || !type) {
    return res.status(400).json({ error: 'Tên, khu vực, danh mục và loại hình là bắt buộc.' });
  }
  const result = await db.run(
    'INSERT INTO restaurants (name, city, district, commune, category, type, description, priceRange, imageUrl, latitude, longitude, status, submitter_name, mapUrl, address, views) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    name.trim(), city.trim(),
    district ? district.trim() : null,
    commune ? commune.trim() : null,
    category.trim(), type,
    description ? description.trim() : '',
    priceRange ? priceRange.trim() : '',
    imageUrl ? imageUrl.trim() : null,
    latitude ? Number(latitude) : null,
    longitude ? Number(longitude) : null,
    'pending',
    submitter_name ? submitter_name.trim() : 'Ẩn danh',
    mapUrl ? mapUrl.trim() : null,
    address ? address.trim() : null,
    0
  );
  const suggestion = await db.get('SELECT id, name, status FROM restaurants WHERE id = ?', result.lastID);
  res.json(suggestion);
});

// Image upload endpoint (auth required)
app.post('/api/upload', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Không có file ảnh nào được gửi.' });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

app.post('/api/locations/:id/view', async (req, res) => {
  const { id } = req.params;
  const restaurant = await db.get('SELECT id FROM restaurants WHERE id = ?', id);
  if (!restaurant) {
    return res.status(404).json({ error: 'Địa điểm không tồn tại.' });
  }
  await db.run('UPDATE restaurants SET views = views + 1 WHERE id = ?', id);
  const updated = await db.get('SELECT id, views FROM restaurants WHERE id = ?', id);
  res.json(updated);
});

app.get('/api/checkins', async (req, res) => {
  const checkins = await db.all(
    `SELECT c.id, c.restaurant_id, c.name, c.rating, c.comment, c.images, c.created_at, r.name AS restaurant_name
     FROM checkins c
     JOIN restaurants r ON r.id = c.restaurant_id
     ORDER BY c.created_at DESC`
  );
  // Parse images JSON string back to array
  const parsed = checkins.map((c) => ({
    ...c,
    images: c.images ? JSON.parse(c.images) : []
  }));
  res.json(parsed);
});

app.post('/api/checkins', async (req, res) => {
  const { restaurantId, name, rating, comment, images } = req.body;

  if (!restaurantId || !name || !comment) {
    return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  }

  const restaurant = await db.get('SELECT id FROM restaurants WHERE id = ?', restaurantId);
  if (!restaurant) {
    return res.status(404).json({ error: 'Địa điểm không tồn tại' });
  }

  // Validate images: max 3, must be strings
  const imageList = Array.isArray(images) ? images.slice(0, 3).filter(Boolean) : [];
  const imagesJson = imageList.length > 0 ? JSON.stringify(imageList) : null;

  const result = await db.run(
    'INSERT INTO checkins (restaurant_id, name, rating, comment, images) VALUES (?, ?, ?, ?, ?)',
    restaurantId,
    name.trim(),
    Number(rating),
    comment.trim(),
    imagesJson
  );

  const checkin = await db.get('SELECT * FROM checkins WHERE id = ?', result.lastID);
  res.json({
    ...checkin,
    images: checkin.images ? JSON.parse(checkin.images) : []
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Tên đăng nhập và mật khẩu bắt buộc.' });
  }

  const user = await db.get('SELECT id, username, password_hash, password_salt, is_admin FROM users WHERE username = ?', username);
  if (!user || !comparePassword(password, user.password_hash, user.password_salt)) {
    return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
  }

  const token = crypto.randomUUID();
  await db.run('INSERT INTO sessions (token, user_id) VALUES (?, ?)', token, user.id);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      is_admin: user.is_admin === 1
    }
  });
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Tên đăng nhập và mật khẩu bắt buộc.' });
  }

  const existing = await db.get('SELECT id FROM users WHERE username = ?', username);
  if (existing) {
    return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại.' });
  }

  const passwordData = createPasswordHash(password);
  const result = await db.run(
    'INSERT INTO users (username, password_hash, password_salt, is_admin) VALUES (?, ?, ?, ?)',
    username,
    passwordData.hash,
    passwordData.salt,
    0
  );

  const token = crypto.randomUUID();
  await db.run('INSERT INTO sessions (token, user_id) VALUES (?, ?)', token, result.lastID);

  res.json({
    token,
    user: {
      id: result.lastID,
      username,
      is_admin: false
    }
  });
});

app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  await db.run('DELETE FROM sessions WHERE token = ?', req.token);
  res.json({ ok: true });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/admin/restaurants', authMiddleware, requireAdmin, async (req, res) => {
  const restaurants = await db.all("SELECT * FROM restaurants WHERE status = 'approved' ORDER BY city, name");
  res.json(restaurants);
});

// Admin: list all pending location suggestions
app.get('/api/admin/locations/pending', authMiddleware, requireAdmin, async (req, res) => {
  const pending = await db.all("SELECT * FROM restaurants WHERE status = 'pending' ORDER BY rowid DESC");
  res.json(pending);
});

// Admin: approve or reject a pending location
app.put('/api/admin/locations/:id/status', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
  }
  const loc = await db.get('SELECT id FROM restaurants WHERE id = ?', id);
  if (!loc) return res.status(404).json({ error: 'Không tìm thấy.' });
  await db.run('UPDATE restaurants SET status = ? WHERE id = ?', status, id);
  const updated = await db.get('SELECT id, name, status FROM restaurants WHERE id = ?', id);
  res.json(updated);
});

app.post('/api/admin/restaurants', authMiddleware, requireAdmin, async (req, res) => {
  const { name, city, district, commune, category, description, priceRange, latitude, longitude, imageUrl, type, mapUrl, address } = req.body;
  if (!name || !city || !category) {
    return res.status(400).json({ error: 'Tên, thành phố và danh mục là bắt buộc.' });
  }

  const result = await db.run(
    'INSERT INTO restaurants (name, city, district, commune, category, description, priceRange, latitude, longitude, imageUrl, type, mapUrl, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    name,
    city,
    district || null,
    commune || null,
    category,
    description || '',
    priceRange || '',
    latitude || null,
    longitude || null,
    imageUrl || null,
    type || 'food',
    mapUrl || null,
    address || null
  );

  const restaurant = await db.get('SELECT * FROM restaurants WHERE id = ?', result.lastID);
  res.json(restaurant);
});

app.put('/api/admin/restaurants/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, city, district, commune, category, description, priceRange, latitude, longitude, imageUrl, type, mapUrl, address } = req.body;
  if (!name || !city || !category) {
    return res.status(400).json({ error: 'Tên, thành phố và danh mục là bắt buộc.' });
  }

  const restaurant = await db.get('SELECT * FROM restaurants WHERE id = ?', id);
  if (!restaurant) {
    return res.status(404).json({ error: 'Địa điểm không tồn tại.' });
  }

  await db.run(
    'UPDATE restaurants SET name = ?, city = ?, district = ?, commune = ?, category = ?, description = ?, priceRange = ?, latitude = ?, longitude = ?, imageUrl = ?, type = ?, mapUrl = ?, address = ? WHERE id = ?',
    name,
    city,
    district || null,
    commune || null,
    category,
    description || '',
    priceRange || '',
    latitude || null,
    longitude || null,
    imageUrl || null,
    type || 'food',
    mapUrl || null,
    address || null,
    id
  );

  const updated = await db.get('SELECT * FROM restaurants WHERE id = ?', id);
  res.json(updated);
});

app.delete('/api/admin/restaurants/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  await db.run('DELETE FROM restaurants WHERE id = ?', id);
  res.json({ ok: true });
});

app.get('/api/admin/checkins', authMiddleware, requireAdmin, async (req, res) => {
  const checkins = await db.all(
    `SELECT c.id, c.name, c.rating, c.comment, c.created_at, r.name AS restaurant_name
     FROM checkins c
     JOIN restaurants r ON r.id = c.restaurant_id
     ORDER BY c.created_at DESC`
  );
  res.json(checkins);
});

// Admin: list all users
app.get('/api/admin/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const users = await db.all('SELECT id, username, is_admin FROM users ORDER BY username ASC');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi máy chủ khi lấy danh sách tài khoản.' });
  }
});

// Admin: toggle admin role
app.put('/api/admin/users/:id/role', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { is_admin } = req.body; // should be 0 or 1

  if (is_admin !== 0 && is_admin !== 1) {
    return res.status(400).json({ error: 'Quyền hạn không hợp lệ.' });
  }

  // Prevent demoting yourself
  if (Number(id) === req.user.id) {
    return res.status(400).json({ error: 'Bạn không thể tự thu hồi quyền Admin của chính mình.' });
  }

  try {
    const user = await db.get('SELECT id FROM users WHERE id = ?', id);
    if (!user) {
      return res.status(404).json({ error: 'Người dùng không tồn tại.' });
    }

    await db.run('UPDATE users SET is_admin = ? WHERE id = ?', is_admin, id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi máy chủ khi cập nhật quyền hạn.' });
  }
});

// Admin: delete a user
app.delete('/api/admin/users/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;

  // Prevent deleting yourself
  if (Number(id) === req.user.id) {
    return res.status(400).json({ error: 'Bạn không thể tự xóa tài khoản của chính mình.' });
  }

  try {
    const user = await db.get('SELECT id FROM users WHERE id = ?', id);
    if (!user) {
      return res.status(404).json({ error: 'Người dùng không tồn tại.' });
    }

    await db.run('DELETE FROM users WHERE id = ?', id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi máy chủ khi xóa người dùng.' });
  }
});

// Confessions Routes
app.get('/api/confessions', async (req, res) => {
  const confessions = await db.all(
    `SELECT c.*, r.name AS restaurant_name, r.type AS restaurant_type, r.city AS restaurant_city
     FROM confessions c
     LEFT JOIN restaurants r ON r.id = c.restaurant_id
     WHERE c.status = "approved"
     ORDER BY c.created_at DESC`
  );
  res.json(confessions);
});

app.post('/api/confessions', async (req, res) => {
  const { title, content, category, hashtags } = req.body;
  if (!content || !category) {
    return res.status(400).json({ error: 'Nội dung và danh mục là bắt buộc.' });
  }

  const result = await db.run(
    'INSERT INTO confessions (title, content, category, status, likes, hashtags) VALUES (?, ?, ?, ?, ?, ?)',
    title ? title.trim() : 'Ẩn danh',
    content.trim(),
    category.trim(),
    'pending',
    0,
    hashtags ? hashtags.trim() : null
  );

  const newConfession = await db.get('SELECT * FROM confessions WHERE id = ?', result.lastID);
  res.json(newConfession);
});

app.post('/api/confessions/:id/like', async (req, res) => {
  const { id } = req.params;
  const confession = await db.get('SELECT id FROM confessions WHERE id = ?', id);
  if (!confession) {
    return res.status(404).json({ error: 'Không tìm thấy confession này.' });
  }

  await db.run('UPDATE confessions SET likes = likes + 1 WHERE id = ?', id);
  const updated = await db.get('SELECT * FROM confessions WHERE id = ?', id);
  res.json(updated);
});

app.get('/api/confessions/:id/comments', async (req, res) => {
  const { id } = req.params;
  const comments = await db.all(
    'SELECT * FROM confession_comments WHERE confession_id = ? ORDER BY created_at ASC',
    id
  );
  res.json(comments);
});

app.post('/api/confessions/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { name, comment } = req.body;

  if (!comment) {
    return res.status(400).json({ error: 'Bình luận không được để trống.' });
  }

  const confession = await db.get('SELECT id FROM confessions WHERE id = ?', id);
  if (!confession) {
    return res.status(404).json({ error: 'Không tìm thấy confession này.' });
  }

  const result = await db.run(
    'INSERT INTO confession_comments (confession_id, name, comment) VALUES (?, ?, ?)',
    id,
    name ? name.trim() : 'Ẩn danh',
    comment.trim()
  );

  const newComment = await db.get('SELECT * FROM confession_comments WHERE id = ?', result.lastID);
  res.json(newComment);
});

// Admin Confessions Management Routes
app.get('/api/admin/confessions', authMiddleware, requireAdmin, async (req, res) => {
  const confessions = await db.all('SELECT * FROM confessions ORDER BY created_at DESC');
  res.json(confessions);
});

app.put('/api/admin/confessions/:id/status', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
  }

  const confession = await db.get('SELECT id FROM confessions WHERE id = ?', id);
  if (!confession) {
    return res.status(404).json({ error: 'Không tìm thấy confession.' });
  }

  await db.run('UPDATE confessions SET status = ? WHERE id = ?', status, id);
  const updated = await db.get('SELECT * FROM confessions WHERE id = ?', id);
  res.json(updated);
});

app.delete('/api/admin/confessions/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  await db.run('DELETE FROM confessions WHERE id = ?', id);
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Backend server chạy trên http://localhost:${port}`);
});
