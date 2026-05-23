import { initDb } from './db.js';

const db = await initDb();
console.log('Database initialized. Nếu muốn reset, xóa server/database.sqlite và chạy lại lệnh này.');
await db.close();
