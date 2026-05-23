import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../auth.js';

const initialForm = {
  name: '',
  submitter_name: '',
  city: '',
  district: '',
  category: '',
  type: 'attraction',
  description: '',
  priceRange: '',
  imageUrl: '',
  mapUrl: '',
  address: ''
};

export default function SuggestLocationModal({ user, onClose }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetchWithAuth('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setForm((prev) => ({ ...prev, imageUrl: data.url }));
      } else {
        setError(data.error || 'Upload thất bại.');
      }
    } catch {
      setError('Lỗi kết nối khi upload.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.city.trim() || !form.category.trim()) {
      setError('Vui lòng điền đầy đủ các trường bắt buộc (*).');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/locations/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gửi thất bại, thử lại sau.');
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('Lỗi kết nối, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box suggest-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Gợi ý địa điểm mới"
      >
        <button className="modal-close-btn" onClick={onClose} aria-label="Đóng">✕</button>

        {!user ? (
          <div className="suggest-login-prompt" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔒</div>
            <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '12px', fontFamily: 'Outfit, sans-serif' }}>Đăng nhập để đóng góp</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.6', maxWidth: '400px', margin: '0 auto 24px auto' }}>
              Hãy đăng nhập tài khoản của bạn để có thể gửi các gợi ý địa điểm ăn uống, du lịch hoặc homestay tuyệt vời tại Kon Tum tới ban quản trị!
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                type="button"
                className="btn-secondary" 
                onClick={onClose}
                style={{ padding: '10px 20px', borderRadius: '12px', fontWeight: 600 }}
              >
                Đóng
              </button>
              <button 
                type="button"
                className="btn-primary" 
                onClick={() => {
                  onClose();
                  navigate('/login');
                }}
                style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span>🔑 Đăng nhập ngay</span>
              </button>
            </div>
          </div>
        ) : submitted ? (
          <div className="suggest-success">
            <div className="suggest-success-icon">🎉</div>
            <h2>Cảm ơn bạn đã đóng góp!</h2>
            <p>
              Địa điểm <strong>"{form.name}"</strong> đã được gửi thành công.<br />
              Chúng tôi sẽ xem xét và duyệt trong thời gian sớm nhất. 🙏
            </p>

            {/* ---- DONATE PANEL ---- */}
            <div className="donate-panel">
              <div className="donate-header">
                <span className="donate-heart">💖</span>
                <div>
                  <h3>Ủng hộ dự án</h3>
                  <p>Mỗi đồng ủng hộ giúp team mình duy trì &amp; phát triển KonTum Confessions!</p>
                </div>
              </div>

              <div className="donate-body">
                {/* QR Code */}
                <div className="donate-qr-wrapper">
                  <img
                    src="https://img.vietqr.io/image/MB-0250820048888-compact2.png?addInfo=Ung%20ho%20du%20an%20KonTum%20Confessions&accountName=A%20VI%20TRIEU"
                    alt="QR chuyển khoản MB Bank – A VI TRIEU"
                    className="donate-qr-img"
                  />
                  <div className="donate-qr-badge">
                    <span>🏦</span> MB Bank
                  </div>
                </div>

                {/* Bank info */}
                <div className="donate-info-col">
                  <div className="donate-info-row">
                    <span className="donate-label">Ngân hàng</span>
                    <strong>MB Bank</strong>
                  </div>
                  <div className="donate-info-row">
                    <span className="donate-label">Chủ TK</span>
                    <strong>A VI TRIEU</strong>
                  </div>
                  <div className="donate-info-row">
                    <span className="donate-label">Số TK</span>
                    <div className="donate-account-copy">
                      <strong className="donate-account-num">0250820048888</strong>
                      <button
                        className="donate-copy-btn"
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('0250820048888');
                          const btn = document.getElementById('donate-copy-feedback');
                          if (btn) { btn.textContent = '✓ Đã sao!'; setTimeout(() => { btn.textContent = 'Sao chép'; }, 2000); }
                        }}
                        id="donate-copy-feedback"
                      >
                        Sao chép
                      </button>
                    </div>
                  </div>
                  <div className="donate-info-row">
                    <span className="donate-label">Nội dung</span>
                    <em style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Ung ho du an KonTum Confessions</em>
                  </div>
                  <p className="donate-note">
                    📲 Mở app ngân hàng &rarr; Quét QR hoặc chuyển khoản thủ công.<br/>
                    Mọi sự ủng hộ dù nhỏ đều rất ý nghĩa với team! ❤️
                  </p>
                </div>
              </div>
            </div>
            {/* ---- END DONATE PANEL ---- */}

            <button className="btn-primary donate-close-btn" onClick={onClose}>
              ✅ Đóng
            </button>
          </div>

        ) : (
          <>
            <div className="suggest-header">
              <span className="suggest-icon">📍</span>
              <div>
                <h2>Gợi ý địa điểm mới</h2>
                <p className="suggest-subtitle">Chia sẻ địa điểm yêu thích để cộng đồng cùng khám phá!</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="suggest-form">
              <div className="suggest-form-grid">
                <label className="suggest-label full-width">
                  <span>Tên địa điểm <span className="required">*</span></span>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Ví dụ: Homestay Hoa Hồng Măng Đen"
                    required
                  />
                </label>

                <label className="suggest-label">
                  <span>Tên của bạn</span>
                  <input
                    name="submitter_name"
                    value={form.submitter_name}
                    onChange={handleChange}
                    placeholder="Để trống nếu muốn ẩn danh"
                  />
                </label>

                <label className="suggest-label">
                  <span>Loại hình <span className="required">*</span></span>
                  <select name="type" value={form.type} onChange={handleChange} required>
                    <option value="attraction">🏕️ Địa điểm du lịch</option>
                    <option value="food">🍽️ Ẩm thực & Quán ngon</option>
                    <option value="hotel">🏨 Khách sạn / Homestay</option>
                  </select>
                </label>

                <label className="suggest-label full-width">
                  <span>Địa chỉ chi tiết</span>
                  <input
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Số nhà, Tên đường, Phường/Xã..."
                  />
                </label>

                <label className="suggest-label">
                  <span>Khu vực / Thành phố <span className="required">*</span></span>
                  <input
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="TP Kon Tum / Măng Đen / ..."
                    required
                  />
                </label>

                <label className="suggest-label">
                  <span>Huyện / Quận</span>
                  <input
                    name="district"
                    value={form.district}
                    onChange={handleChange}
                    placeholder="Ví dụ: Kon Plông (Măng Đen)"
                  />
                </label>

                <label className="suggest-label">
                  <span>Danh mục <span className="required">*</span></span>
                  <input
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    placeholder="Ví dụ: Thác nước, Cà phê, Homestay gỗ"
                    required
                  />
                </label>

                <label className="suggest-label">
                  <span>Giá tham khảo</span>
                  <input
                    name="priceRange"
                    value={form.priceRange}
                    onChange={handleChange}
                    placeholder="Ví dụ: 50k - 120k / Miễn phí"
                  />
                </label>

                <label className="suggest-label full-width">
                  <span>Mô tả ngắn</span>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Chia sẻ điều đặc biệt về địa điểm này..."
                    rows={3}
                  />
                </label>

                <label className="suggest-label full-width">
                  <span>Link bản đồ chỉ đường (Google Maps URL)</span>
                  <input
                    name="mapUrl"
                    value={form.mapUrl}
                    onChange={handleChange}
                    placeholder="https://maps.app.goo.gl/..."
                  />
                </label>

                <label className="suggest-label full-width">
                  <span>Ảnh mô tả (URL hoặc tải lên từ máy)</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', width: '100%', marginTop: '6px' }}>
                    <input
                      name="imageUrl"
                      value={form.imageUrl}
                      onChange={handleChange}
                      placeholder="Nhập URL ảnh hoặc chọn ảnh từ máy..."
                      style={{ flex: 1 }}
                    />
                    <label
                      htmlFor="suggest-upload-input"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        background: 'var(--primary)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                        opacity: uploading ? 0.7 : 1,
                        border: 'none',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'opacity 0.2s'
                      }}
                    >
                      {uploading ? '⏳ Đang tải...' : '📷 Chọn ảnh'}
                      <input
                        id="suggest-upload-input"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                  {form.imageUrl && (
                    <div style={{ marginTop: '12px', position: 'relative', display: 'inline-block' }}>
                      <img src={form.imageUrl} alt="Preview" style={{ maxHeight: '120px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          background: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </label>
              </div>

              {error && <p className="suggest-error">⚠️ {error}</p>}

              <div className="suggest-actions">
                <button type="button" className="btn-secondary" onClick={onClose}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? '⏳ Đang gửi...' : '📤 Gửi đề xuất'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
