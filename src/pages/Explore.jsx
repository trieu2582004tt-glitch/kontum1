import { Link } from 'react-router-dom';

export default function Explore() {
  return (
    <div className="page-shell">
      <header className="hero hero-about">
        <div>
          <p className="eyebrow">Khám Phá Vùng Đất Bazan</p>
          <h1>KonTum Confessions</h1>
          <p>
            Góc tâm sự gần gũi, công tâm & Cẩm nang du lịch tự do của giới trẻ xứ Núi Kon Tum.
          </p>
        </div>
      </header>

      <main className="content-container">
        {/* Intro grid introducing the community & Facebook channel */}
        <section className="about-grid">
          <div className="about-content">
            <h2>Chào mừng đến với KonTum Confessions</h2>
            <p>
              Khởi nguồn từ một cộng đồng chia sẻ tâm sự sôi nổi trên mạng xã hội Facebook, <strong>KonTum Confessions</strong> đã chính thức phát triển thành một không gian kết nối đa chiều, nơi giới trẻ Phố Núi gửi gắm những suy nghĩ thầm kín và cùng nhau khám phá quê hương.
            </p>
            <p>
              Chúng tôi hoạt động trên tinh thần <strong>gần gũi, công tâm và tự nhiên</strong>. Không có quảng cáo phiền toái, không thiên vị thương hiệu. Mọi chia sẻ của bạn đều được đăng tải ẩn danh hoàn toàn, đem lại những tiếng nói trung thực và sẻ chia chân thành nhất.
            </p>
            <p>
              Bên cạnh đó, trang web còn là cuốn cẩm nang nhỏ tổng hợp các địa điểm ăn uống, khách sạn homestay và điểm tham quan hấp dẫn tại Kon Tum & Măng Đen từ chính những chia sẻ thực tế của người dân bản địa.
            </p>
            <div className="homepage-action-row" style={{ display: 'flex', gap: '16px', marginTop: '24px', flexWrap: 'wrap' }}>
              <Link to="/confessions" className="button-link" style={{ textDecoration: 'none' }}>
                💬 Xem Confessions
              </Link>
              <Link to="/confessions" className="button-link" style={{ background: 'var(--secondary)', textDecoration: 'none' }}>
                ✍️ Gửi Confession Mới
              </Link>
            </div>
          </div>

          <div className="about-community-box" style={{ background: 'white', borderRadius: '28px', padding: '36px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--primary)', fontSize: '1.6rem', marginBottom: '16px', fontWeight: '700' }}>Kết nối Facebook</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.65', marginBottom: '20px' }}>
                Trang mạng xã hội chính thức của KonTum Confessions là nơi khởi nguồn của các cuộc thảo luận sôi nổi. Hãy đồng hành cùng hàng ngàn thành viên để cập nhật tin tức Phố Núi mỗi ngày.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                  <span style={{ fontSize: '1.2rem' }}>👥</span> 50,000+ Người theo dõi
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                  <span style={{ fontSize: '1.2rem' }}>🔥</span> Cập nhật nhanh chóng 24/7
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                  <span style={{ fontSize: '1.2rem' }}>🛡️</span> Duyệt bài công tâm & Bảo mật
                </div>
              </div>
            </div>
            <a href="https://www.facebook.com/mangdenconfessions/" target="_blank" rel="noopener noreferrer" className="button-link" style={{ width: '100%', textAlign: 'center', background: '#1877f2', textDecoration: 'none', boxShadow: 'none' }}>
              🌐 Ghé thăm Fanpage
            </a>
          </div>
        </section>

        {/* Travel highlight cards */}
        <section className="explore-explore-section" style={{ marginTop: '40px' }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.8rem', color: 'var(--primary)', textAlign: 'center', marginBottom: '8px' }}>🧭 Cẩm nang khám phá nhanh</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '32px' }}>
            Trải nghiệm du lịch Kon Tum trọn vẹn thông qua các gợi ý khách quan và chân thực.
          </p>
          <div className="highlight-cards">
            <Link to="/attractions" className="highlight-card">
              <span className="icon">🏕️</span>
              <h3>Địa điểm vi vu</h3>
              <p>Những danh lam thắng cảnh hoang sơ và điểm check-in không thể bỏ lỡ tại Kon Tum & Măng Đen.</p>
            </Link>
            <Link to="/dining" className="highlight-card">
              <span className="icon">☕</span>
              <h3>Ẩm thực & Quán ngon</h3>
              <p>Thưởng thức các đặc sản gỏi lá, cơm lam gà nướng tiêu rừng và quán cà phê view đồi thông.</p>
            </Link>
            <Link to="/accommodation" className="highlight-card">
              <span className="icon">🏨</span>
              <h3>Khách sạn & Homestay</h3>
              <p>Gợi ý các homestay nhà gỗ, khách sạn chất lượng tốt để có kỳ nghỉ trọn vẹn giữa đại ngàn.</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
