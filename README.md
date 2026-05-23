# Kon Tum Food Check-in

Dự án React + backend SQL demo cho website check-in ẩm thực Kon Tum.

## Chạy dự án

1. Mở terminal trong `d:\WebKonTum`
2. Cài đặt phụ thuộc:

```bash
npm install
```

3. Khởi chạy đồng thời client và server:

```bash
npm run dev
```

4. Mở trình duyệt:

- Frontend: `http://localhost:5173`
- API backend: `http://localhost:4000/api/locations`

## Ghi chú

- Backend dùng `sqlite` để lưu dữ liệu demo.
- Admin mặc định: `admin` / `admin123`
- API:
  - `GET /api/locations`
  - `GET /api/checkins`
  - `POST /api/checkins`
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
  - `GET /api/admin/restaurants`
  - `POST /api/admin/restaurants`
  - `PUT /api/admin/restaurants/:id`
  - `DELETE /api/admin/restaurants/:id`
  - `GET /api/admin/checkins`

## Cấu trúc chính

- `src/` - React frontend
- `server/` - Express + SQLite backend

<!-- Redeploy trigger -->
<!-- redeploy: 2026-05-23T08:38:00Z -->
