import { useState, useRef } from 'react';
import { fetchWithAuth } from '../auth.js';

const MAX_PHOTOS = 3;

/**
 * ReviewForm – form đánh giá tích hợp upload ảnh (tối đa 3 ảnh).
 * Props:
 *   locationId  – id địa điểm
 *   onSubmit    – callback(newCheckin) sau khi gửi thành công
 *   placeholder – placeholder textarea
 *   submitLabel – nhãn nút submit
 */
export default function ReviewForm({ locationId, onSubmit, placeholder, submitLabel }) {
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState([]); // array of { file, preview, url }
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const fileInputRef = useRef();

  const handlePhotoChange = async (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > MAX_PHOTOS) {
      setMsg(`Chỉ được thêm tối đa ${MAX_PHOTOS} ảnh.`);
      e.target.value = '';
      return;
    }
    setUploading(true);
    setMsg('');

    const newPhotos = [];
    for (const file of files) {
      const preview = URL.createObjectURL(file);
      const formData = new FormData();
      formData.append('image', file);
      try {
        const res = await fetchWithAuth('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) {
          newPhotos.push({ preview, url: data.url });
        } else {
          setMsg(data.error || 'Upload thất bại.');
        }
      } catch {
        setMsg('Lỗi kết nối khi tải ảnh.');
      }
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
    setUploading(false);
    e.target.value = '';
  };

  const removePhoto = (idx) => {
    setPhotos((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[idx].preview);
      copy.splice(idx, 1);
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !comment.trim()) {
      setMsg('Vui lòng điền đầy đủ tên và nội dung.');
      return;
    }

    const payload = {
      restaurantId: locationId,
      name: name.trim(),
      rating: Number(rating),
      comment: comment.trim(),
      images: photos.map((p) => p.url),
    };

    try {
      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setMsg('Đã có lỗi xảy ra khi gửi đánh giá.');
        return;
      }

      const newCheckin = await res.json();
      onSubmit && onSubmit(newCheckin);
      setName('');
      setComment('');
      setRating(5);
      setPhotos([]);
      setMsg('✅ Đăng thành công!');
      setTimeout(() => setMsg(''), 4000);
    } catch {
      setMsg('Lỗi kết nối máy chủ.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="review-form-v2">
      <h5>📝 Chia sẻ trải nghiệm của bạn</h5>

      {/* Tên + sao */}
      <div className="form-group-row">
        <input
          type="text"
          placeholder="Tên của bạn"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          <option value={5}>⭐⭐⭐⭐⭐ Tuyệt vời</option>
          <option value={4}>⭐⭐⭐⭐ Rất tốt</option>
          <option value={3}>⭐⭐⭐ Bình thường</option>
          <option value={2}>⭐⭐ Tạm được</option>
          <option value={1}>⭐ Tệ</option>
        </select>
      </div>

      {/* Nội dung */}
      <textarea
        placeholder={placeholder || 'Chia sẻ cảm nhận của bạn...'}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        required
      />

      {/* Upload ảnh */}
      <div className="review-photo-upload-area">
        {photos.map((p, i) => (
          <div key={i} className="review-photo-thumb">
            <img src={p.preview} alt={`Ảnh ${i + 1}`} />
            <button
              type="button"
              className="review-photo-remove"
              onClick={() => removePhoto(i)}
              title="Xóa ảnh"
            >
              ✕
            </button>
          </div>
        ))}

        {photos.length < MAX_PHOTOS && (
          <label className="review-photo-add-btn" title="Thêm ảnh">
            {uploading ? (
              <span className="upload-spinner">⏳</span>
            ) : (
              <>
                <span className="upload-icon">📷</span>
                <span className="upload-label">
                  {photos.length === 0 ? 'Thêm ảnh' : 'Thêm'}
                </span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        )}

        {photos.length === 0 && !uploading && (
          <p className="review-photo-hint">
            📸 Thêm tối đa {MAX_PHOTOS} ảnh để minh hoạ trải nghiệm
          </p>
        )}
      </div>

      <button type="submit" className="submit-review-btn" disabled={uploading}>
        {uploading ? '⏳ Đang tải ảnh...' : (submitLabel || '📤 Gửi đánh giá')}
      </button>

      {msg && (
        <p className={`form-msg ${msg.includes('lỗi') || msg.includes('Lỗi') || msg.includes('thất bại') ? 'error' : 'success'}`}>
          {msg}
        </p>
      )}
    </form>
  );
}
