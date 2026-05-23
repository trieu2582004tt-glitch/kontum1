import { useEffect, useState, useMemo } from 'react';
import { fetchWithAuth } from '../auth.js';

function ConfessionCard({ confession, onLike, onTagClick }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [comments, setComments] = useState([]);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [formMsg, setFormMsg] = useState('');

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/confessions/${confession.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      fetchComments();
    }
  }, [isExpanded]);

  const handleLikeClick = async () => {
    try {
      const res = await fetch(`/api/confessions/${confession.id}/like`, {
        method: 'POST'
      });
      if (res.ok) {
        const updated = await res.json();
        onLike(updated);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      const res = await fetch(`/api/confessions/${confession.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Ẩn danh',
          comment: comment.trim()
        })
      });

      if (res.ok) {
        const newC = await res.json();
        setComments((prev) => [...prev, newC]);
        setComment('');
        setName('');
        setFormMsg('Gửi bình luận thành công!');
        setTimeout(() => setFormMsg(''), 3000);
      } else {
        setFormMsg('Lỗi gửi bình luận.');
      }
    } catch (err) {
      setFormMsg('Có lỗi xảy ra.');
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'Tình yêu': return '#e74c3c';
      case 'Học đường': return '#3498db';
      case 'Đời sống': return '#2ecc71';
      case 'Ẩm thực': return '#e67e22';
      case 'Góc khuất': return '#9b59b6';
      default: return '#7f8c8d';
    }
  };

  return (
    <article className="confession-card">
      <div className="confession-header">
        <span 
          className="confession-cat-badge" 
          style={{ backgroundColor: getCategoryColor(confession.category) }}
        >
          {confession.category}
        </span>
        <span className="confession-id">#CF{confession.id}</span>
        <span className="confession-date">
          {new Date(confession.created_at).toLocaleDateString('vi-VN')}
        </span>
      </div>
      
      {confession.title && <h3 className="confession-card-title">{confession.title}</h3>}
      <p className="confession-card-content">{confession.content}</p>

      {confession.hashtags && (
        <div className="confession-hashtags">
          {confession.hashtags.split(',').map((tag) => (
            <span 
              key={tag} 
              className="confession-tag-pill" 
              onClick={() => onTagClick && onTagClick(tag)}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {confession.restaurant_id && confession.restaurant_name && (
        <div className="confession-venue-tag">
          <span className="venue-tag-icon">📍</span>
          <span className="venue-tag-label">Địa điểm được nhắc đến: </span>
          <a 
            href={
              confession.restaurant_type === 'food' ? '/dining' :
              confession.restaurant_type === 'hotel' ? '/accommodation' :
              '/attractions'
            } 
            className="venue-tag-link"
          >
            {confession.restaurant_name} ({confession.restaurant_city})
          </a>
        </div>
      )}

      <div className="confession-footer">
        <button type="button" className="btn-like" onClick={handleLikeClick}>
          ❤️ {confession.likes} Thích
        </button>
        <button 
          type="button" 
          className="btn-toggle-comments" 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          💬 Bình luận ({comments.length > 0 ? comments.length : '...'})
        </button>
      </div>

      {isExpanded && (
        <div className="confession-comments-section">
          <h4>Bình luận</h4>
          
          {loadingComments ? (
            <p className="small text-muted">Đang tải bình luận...</p>
          ) : comments.length === 0 ? (
            <p className="no-comments-text">Chưa có bình luận nào. Hãy chia sẻ suy nghĩ của bạn!</p>
          ) : (
            <div className="confession-comments-list">
              {comments.map((c) => (
                <div key={c.id} className="confession-comment-item">
                  <div className="comment-header">
                    <span className="comment-author">{c.name}</span>
                    <span className="comment-date">
                      {new Date(c.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <p className="comment-content">{c.comment}</p>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmitComment} className="confession-comment-form">
            <div className="form-group-row">
              <input
                type="text"
                placeholder="Biệt danh (mặc định: Ẩn danh)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <textarea
              placeholder="Nhập bình luận của bạn..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              required
            />
            <button type="submit" className="submit-comment-btn">Gửi bình luận</button>
            {formMsg && <p className="form-msg success">{formMsg}</p>}
          </form>
        </div>
      )}
    </article>
  );
}

export default function Confessions({ user }) {
  const [confessions, setConfessions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [nickname, setNickname] = useState('');
  const [category, setCategory] = useState('Tâm sự');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTag, setSelectedTag] = useState(null);

  useEffect(() => {
    fetch('/api/confessions')
      .then((res) => res.json())
      .then(setConfessions)
      .catch((err) => console.error(err));
  }, []);

  const handleLike = (updatedConfession) => {
    setConfessions((prev) =>
      prev.map((c) => (c.id === updatedConfession.id ? updatedConfession : c))
    );
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedTag(null); // Reset tag filter on category switch
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    // Clean and split hashtags
    const cleanedTags = tagsInput
      .split(/[\s,]+/)
      .map((t) => t.trim().replace(/^#+/, ''))
      .filter(Boolean)
      .join(',');

    try {
      const res = await fetch('/api/confessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: isAnonymous ? 'Ẩn danh' : (nickname.trim() || 'Ẩn danh'),
          category,
          content: content.trim(),
          hashtags: cleanedTags || null
        })
      });

      if (res.ok) {
        setNickname('');
        setContent('');
        setTagsInput('');
        setCategory('Tâm sự');
        setIsAnonymous(true);
        setMessage('Gửi confessions thành công! Đang chờ phê duyệt.');
        setTimeout(() => {
          setMessage('');
          setShowForm(false);
        }, 2500);
      } else {
        setMessage('Có lỗi xảy ra khi gửi confession.');
      }
    } catch (err) {
      setMessage('Lỗi kết nối máy chủ.');
    }
  };

  const filteredConfessions = useMemo(() => {
    let result = confessions;
    if (activeTab !== 'all') {
      result = result.filter((c) => c.category === activeTab);
    }
    if (selectedTag) {
      result = result.filter((c) => c.hashtags && c.hashtags.split(',').includes(selectedTag));
    }
    return result;
  }, [confessions, activeTab, selectedTag]);

  const categories = ['Tâm sự', 'Học đường', 'Đời sống', 'Ẩm thực', 'Góc khuất', 'Khác'];

  return (
    <div className="page-shell">
      <header className="hero hero-confessions">
        <div>
          <p className="eyebrow">Lắng Nghe & Chia Sẻ</p>
          <h1>KonTum Confessions</h1>
          <p>
            Nơi bạn có thể tự do giãi bày tâm sự, chia sẻ những câu chuyện thầm kín hoặc đơn giản là nhắn gửi yêu thương đến một ai đó ở mảnh đất Kon Tum nắng gió.
          </p>
        </div>
      </header>

      <main className="content-container">
        {/* Confession Feed is placed front-and-center */}
        <section className="section-intro">
          <div className="confession-toolbar">
            <div className="confession-tabs-wrapper">
              <strong>Danh mục bài đăng:</strong>
              <div className="confession-tabs">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => handleTabChange('all')}
                >
                  Tất cả
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`tab-btn ${activeTab === cat ? 'active' : ''}`}
                    onClick={() => handleTabChange(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <button 
              type="button" 
              className="btn-create-trigger"
              onClick={() => setShowForm(true)}
            >
              ✍️ Đăng Confession
            </button>
          </div>

          {/* Active Tag Filter Status Bar */}
          {selectedTag && (
            <div className="active-tag-filter">
              <span>Đang lọc theo hashtag: <strong>#{selectedTag}</strong></span>
              <button 
                type="button" 
                className="btn-clear-tag" 
                onClick={() => setSelectedTag(null)}
              >
                &times; Xóa lọc tag
              </button>
            </div>
          )}

          <div className="section-header-row">
            <h2>Bài đăng mới nhất</h2>
          </div>

          {filteredConfessions.length === 0 ? (
            <p className="no-confessions-text">Không có confession nào trong mục này hoặc đang chờ duyệt.</p>
          ) : (
            <div className="confessions-list">
              {filteredConfessions.map((c) => (
                <ConfessionCard 
                  key={c.id} 
                  confession={c} 
                  onLike={handleLike} 
                  onTagClick={setSelectedTag}
                />
              ))}
            </div>
          )}
        </section>

        {/* Minimized Write Confession Form inside a Modal overlay */}
        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal-content confession-modal" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="modal-close-btn" onClick={() => setShowForm(false)}>
                &times;
              </button>
              <h2>Gửi Confession mới</h2>
              <p className="modal-subtitle">
                Chia sẻ câu chuyện của bạn với mọi người. Bài viết sẽ hiển thị sau khi được phê duyệt.
              </p>
              
              <form onSubmit={handleSubmit} className="form-grid">
                {/* Anonymous Toggle Option */}
                <div className="anonymous-toggle-container full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                    />
                    <span className="checkbox-text">Đăng ẩn danh (Tên người gửi sẽ ẩn đi)</span>
                  </label>
                </div>

                {/* Nickname field is rendered only when not anonymous */}
                {!isAnonymous && (
                  <label className="full-width">
                    Biệt danh / Tên hiển thị của bạn
                    <input
                      type="text"
                      placeholder="Ví dụ: Trai phố núi, Cô gái Măng Đen..."
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      required={!isAnonymous}
                    />
                  </label>
                )}

                <label>
                  Chủ đề chính
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Hashtags phụ (ngăn cách bằng dấu phẩy)
                  <input
                    type="text"
                    placeholder="Ví dụ: crush, mangden, drama"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                  />
                </label>

                <label className="full-width">
                  Nội dung tâm sự
                  <textarea
                    placeholder="Hãy kể lại câu chuyện của bạn... (Tôn trọng cộng đồng, không sử dụng từ ngữ thô tục)"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    required
                  />
                </label>

                <button type="submit" className="full-width">
                  Gửi duyệt Confession
                </button>
              </form>
              {message && <p className="message modal-msg">{message}</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
