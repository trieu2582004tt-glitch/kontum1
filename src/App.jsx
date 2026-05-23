import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom';
import Explore from './pages/Explore.jsx';
import Attractions from './pages/Attractions.jsx';
import Home from './pages/Home.jsx';
import Accommodation from './pages/Accommodation.jsx';
import Confessions from './pages/Confessions.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import ArticleDetail from './pages/ArticleDetail.jsx';
import SuggestLocationModal from './pages/SuggestLocationModal.jsx';
import { getAuthToken, clearAuthToken, fetchWithAuth } from './auth.js';
import logo from './logo.png';

function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showSuggest, setShowSuggest] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setLoadingUser(false);
      return;
    }

    fetchWithAuth('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) {
          clearAuthToken();
          setUser(null);
          return;
        }
        const data = await res.json();
        setUser(data.user);
      })
      .catch(() => {
        clearAuthToken();
        setUser(null);
      })
      .finally(() => setLoadingUser(false));
  }, []);

  const handleLogin = (loggedUser) => {
    setUser(loggedUser);
  };

  const handleLogout = () => {
    clearAuthToken();
    setUser(null);
  };

  const closeMenu = () => setMenuOpen(false);

  // keep checkbox state synced when JS toggles menuOpen
  useEffect(() => {
    const el = document.getElementById('nav-toggle');
    if (el) el.checked = menuOpen;
  }, [menuOpen]);

  if (loadingUser) {
    return <div className="loading-screen">Đang kiểm tra phiên đăng nhập...</div>;
  }

  return (
    <BrowserRouter>
      {/* Mobile Nav Overlay (JS-controlled) */}
      {menuOpen && (
        <div
          className="nav-mobile-overlay open"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      <div className="site-header">
        <div className="site-brand">
          <Link to="/" className="brand-link" onClick={closeMenu}>
            <img src={logo} alt="Kon Tum Confessions Logo" className="site-logo" />
            <div className="brand-text">
              <span className="brand-title">KonTum Confessions</span>
              <span className="brand-slogan">Góc tâm sự &amp; Cẩm nang vi vu của giới trẻ Phố Núi</span>
            </div>
          </Link>
        </div>

        {/* CSS fallback toggle (hidden checkbox) */}
        <input
          id="nav-toggle"
          className="nav-toggle"
          type="checkbox"
          aria-hidden="true"
          onChange={(e) => setMenuOpen(e.target.checked)}
        />

        {/* Hamburger (label tied to checkbox for CSS-only fallback). Keep JS handlers for richer environments. */}
        <label
          htmlFor="nav-toggle"
          role="button"
          tabIndex={0}
          className={`nav-hamburger ${menuOpen ? 'open' : ''}`}
          onPointerDown={(e) => {
            e.stopPropagation();
            console.log('hamburger pointerdown');
            setMenuOpen((v) => !v);
          }}
          onClick={(e) => {
            e.stopPropagation();
            console.log('hamburger clicked (click)');
            setMenuOpen((v) => !v);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            console.log('hamburger touched (touchstart)');
            setMenuOpen((v) => !v);
          }}
          aria-label={menuOpen ? 'Đóng menu' : 'Mở menu điều hướng'}
          aria-expanded={menuOpen}
        >
          <span className="sr-only">{menuOpen ? 'Đóng menu' : 'Mở menu'}</span>
          <span></span>
          <span></span>
          <span></span>
        </label>

        <nav id="site-nav" className={`site-nav ${menuOpen ? 'open' : ''}`}>
          <NavLink to="/" end onClick={closeMenu}>Trang chủ</NavLink>
          <NavLink to="/confessions" onClick={closeMenu}>Confessions</NavLink>
          <NavLink to="/attractions" onClick={closeMenu}>Địa điểm vi vu</NavLink>
          <NavLink to="/dining" onClick={closeMenu}>Ẩm thực &amp; Quán ngon</NavLink>
          <NavLink to="/accommodation" onClick={closeMenu}>Khách sạn &amp; Homestay</NavLink>
          {user?.is_admin ? <NavLink to="/admin" onClick={closeMenu}>Quản trị</NavLink> : null}
          {user ? (
            <button className="nav-logout" onClick={() => { handleLogout(); closeMenu(); }}>Đăng xuất</button>
          ) : (
            <NavLink to="/login" onClick={closeMenu}>Đăng nhập</NavLink>
          )}
        </nav>
      </div>

      <div className="app-main-content">
        <Routes>
          <Route path="/" element={<Explore />} />
          <Route path="/attractions" element={<Attractions user={user} />} />
          <Route path="/dining" element={<Home user={user} />} />
          <Route path="/accommodation" element={<Accommodation user={user} />} />
          <Route path="/confessions" element={<Confessions user={user} />} />
          <Route path="/article/:id" element={<ArticleDetail />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={<Register onRegister={handleLogin} />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin user={user}>
                <AdminPanel user={user} onLogout={handleLogout} />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Floating Suggest Button */}
      <button
        className="fab-suggest-btn"
        onClick={() => setShowSuggest(true)}
        title="Gợi ý địa điểm mới"
        id="fab-suggest"
      >
        <span className="fab-icon">📍</span>
        <span className="fab-label">Gợi ý địa điểm</span>
      </button>

      {showSuggest && <SuggestLocationModal user={user} onClose={() => setShowSuggest(false)} />}

      <Footer />
    </BrowserRouter>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-brand">
          <h3>KonTum Confessions</h3>
          <p>Trang tin tâm sự cộng đồng và cẩm nang khám phá địa điểm ăn uống, vui chơi, khách sạn homestay hàng đầu tại tỉnh Kon Tum.</p>
          <p className="footer-contact-discreet">Liên hệ: contact@kontumconfessions.vn</p>
        </div>
        <div className="footer-links">
          <h4>Liên kết nhanh</h4>
          <ul>
            <li><Link to="/">Trang chủ</Link></li>
            <li><Link to="/confessions">Confessions</Link></li>
            <li><Link to="/attractions">Địa điểm vi vu</Link></li>
            <li><Link to="/dining">Ẩm thực &amp; Quán ngon</Link></li>
            <li><Link to="/accommodation">Khách sạn &amp; Homestay</Link></li>
          </ul>
        </div>
        <div className="footer-social">
          <h4>Kênh truyền thông Facebook</h4>
          <p>Tương tác và theo dõi các tin tức, drama hot nhất trên fanpage Facebook chính thức của chúng tôi.</p>
          <div className="social-icons">
            <a href="https://www.facebook.com/mangdenconfessions/" target="_blank" rel="noopener noreferrer">🌐 Fanpage Facebook</a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">📸 Instagram</a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">🎥 Youtube</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} KonTum Confessions. Hỗ trợ truyền thông &amp; kết nối cộng đồng.</p>
      </div>
    </footer>
  );
}



function RequireAdmin({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!user.is_admin) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default App;
