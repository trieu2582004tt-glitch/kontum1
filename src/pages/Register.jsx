import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { setAuthToken } from '../auth.js';

export default function Register({ onRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!username || !password || !confirm) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Đăng ký thất bại.');
      return;
    }

    const data = await res.json();
    setAuthToken(data.token);
    onRegister(data.user);
    navigate('/');
  };

  return (
    <div className="page-shell">
      <div className="auth-card">
        <h2>Đăng ký</h2>
        <p>Tạo tài khoản để lưu check-in của bạn và truy cập đầy đủ chức năng.</p>
        <form onSubmit={handleSubmit} className="form-grid auth-form">
          <label>
            Tên đăng nhập
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Tên đăng nhập" />
          </label>
          <label>
            Mật khẩu
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu" />
          </label>
          <label>
            Xác nhận mật khẩu
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Xác nhận mật khẩu" />
          </label>
          <button type="submit">Đăng ký</button>
          {error && <p className="message error">{error}</p>}
        </form>
        <p style={{ marginTop: '18px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Đã có tài khoản? <Link to="/login" style={{ fontSize: '0.85rem' }}>Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
