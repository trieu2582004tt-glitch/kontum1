import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { setAuthToken } from '../auth.js';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Đăng nhập thất bại.');
      return;
    }

    const data = await res.json();
    setAuthToken(data.token);
    onLogin(data.user);
    if (data.user?.is_admin) {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="page-shell">
      <div className="auth-card">
        <h2>Đăng nhập</h2>
        <p>Đăng nhập để truy cập tài khoản và sử dụng tính năng check-in.</p>
        <form onSubmit={handleSubmit} className="form-grid auth-form">
          <label>
            Tên đăng nhập
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Tên đăng nhập" />
          </label>
          <label>
            Mật khẩu
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" />
          </label>
          <button type="submit">Đăng nhập</button>
          {error && <p className="message error">{error}</p>}
        </form>
        <p style={{ marginTop: '18px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Chưa có tài khoản? <Link to="/register" style={{ fontSize: '0.85rem' }}>Đăng ký</Link>
        </p>
      </div>
    </div>
  );
}
