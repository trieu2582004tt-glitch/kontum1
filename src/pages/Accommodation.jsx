import { useEffect, useMemo, useState } from 'react';
import konTumDistricts from '../data/konTumDistricts.json';
import ReviewForm from './ReviewForm.jsx';

/** Hiển thị ảnh trong review + lightbox */
function ReviewPhotoGallery({ images }) {
  const [lightbox, setLightbox] = useState(null);
  if (!images || images.length === 0) return null;
  return (
    <>
      <div className="review-photos-gallery">
        {images.map((url, i) => (
          <img
            key={i}
            src={url}
            alt={`Ảnh ${i + 1}`}
            className="review-gallery-img"
            onClick={() => setLightbox(url)}
          />
        ))}
      </div>
      {lightbox && (
        <div className="review-lightbox" onClick={() => setLightbox(null)}>
          <button className="review-lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <img src={lightbox} alt="Ảnh phóng to" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}


function getDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lat1 === null || lon1 === undefined || lon1 === null || 
      lat2 === undefined || lat2 === null || lon2 === undefined || lon2 === null) {
    return Infinity;
  }
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function AccommodationCard({ location, checkins, onAddCheckin, gpsCoords, onIncrementViews }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [msg, setMsg] = useState('');
  const [hasViewed, setHasViewed] = useState(false);

  const reviews = useMemo(() => {
    return checkins.filter((c) => c.restaurant_id === location.id);
  }, [checkins, location.id]);

  const stats = useMemo(() => {
    const count = reviews.length;
    if (count === 0) return { count: 0, average: 0 };
    const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    return { count, average: (sum / count).toFixed(1) };
  }, [reviews]);

  const distance = useMemo(() => {
    if (!gpsCoords || location.latitude === null || location.longitude === null) return null;
    const d = getDistance(gpsCoords.latitude, gpsCoords.longitude, location.latitude, location.longitude);
    return d === Infinity ? null : d.toFixed(1);
  }, [gpsCoords, location.latitude, location.longitude]);

  const incrementView = async () => {
    if (hasViewed) return;
    setHasViewed(true);
    try {
      const res = await fetch(`/api/locations/${location.id}/view`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (onIncrementViews) {
          onIncrementViews(location.id, data.views);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <article className="card">
      {location.imageUrl && (
        <div className="card-image-wrapper">
          <img src={location.imageUrl} alt={location.name} className="card-image" />
        </div>
      )}
      <div className="card-content-box">
        <h3>{location.name}</h3>
        <p className="meta">{location.city} • {location.category}</p>
        <p className="card-desc">{location.description}</p>
        <p className="small">{location.district || ''} {location.commune ? '• ' + location.commune : ''}</p>
        {location.address && <p className="small address-line">📍 {location.address}</p>}
        <p className="small price-range">Giá phòng: {location.priceRange}</p>

        <div className="card-rating" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {stats.count > 0 ? (
            <span className="rating-badge">⭐ {stats.average} ({stats.count} bình chọn)</span>
          ) : (
            <span className="rating-badge no-rating">⭐ Chưa có review</span>
          )}
          <span className="rating-badge views-badge">👁️ {location.views || 0} lượt xem</span>
          {distance && (
            <span className="rating-badge distance-badge" style={{ background: 'rgba(166, 93, 67, 0.08)', color: 'var(--secondary)' }}>
              📍 Cách bạn ~{distance} km
            </span>
          )}
        </div>

        <div className="card-footer-actions">
          <a
            href={location.mapUrl || (location.latitude && location.longitude ? `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}` : '#')}
            target={location.mapUrl || (location.latitude && location.longitude) ? "_blank" : "_self"}
            rel="noreferrer"
            className="map-link-btn"
            onClick={(e) => {
              if (!location.mapUrl && (!location.latitude || !location.longitude)) {
                e.preventDefault();
                alert('Chưa có thông tin bản đồ cho địa điểm này.');
              } else {
                incrementView();
              }
            }}
          >
            Xem bản đồ
          </a>
          <button type="button" className="btn-toggle-reviews" onClick={() => {
            setIsExpanded(!isExpanded);
            if (!isExpanded) {
              incrementView();
            }
          }}>
            {isExpanded ? 'Đóng' : `Đánh giá (${stats.count})`}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="card-reviews-section">
          <h4>Review khách hàng đã lưu trú</h4>
          {reviews.length === 0 ? (
            <p className="no-reviews-text">Chưa có review nào. Hãy chia sẻ trải nghiệm lưu trú của bạn!</p>
          ) : (
            <div className="card-reviews-list">
              {reviews.map((r) => (
                <div key={r.id} className="card-review-item">
                  <div className="review-header">
                    <span className="review-author">{r.name}</span>
                    <span className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    <span className="review-date">{new Date(r.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <p className="review-comment">{r.comment}</p>
                  {r.images && r.images.length > 0 && (
                    <ReviewPhotoGallery images={r.images} />
                  )}
                </div>
              ))}
            </div>
          )}

          <ReviewForm
            locationId={location.id}
            onSubmit={(newCheckin) => {
              onAddCheckin({ ...newCheckin, restaurant_name: location.name });
            }}
            placeholder="Nhập cảm nhận của bạn về phòng ốc, dịch vụ..."
            submitLabel="📄 Gửi review"
          />
          {msg && <p className={`form-msg ${msg.includes('lỗi') ? 'error' : 'success'}`}>{msg}</p>}
        </div>
      )}
    </article>
  );
}

export default function Accommodation() {
  const [locations, setLocations] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [sortBy, setSortBy] = useState('default');
  const [gpsCoords, setGpsCoords] = useState(null);
  const [loadingGps, setLoadingGps] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  const filteredCheckins = useMemo(() => {
    return checkins.filter((c) => locations.some((l) => l.id === c.restaurant_id));
  }, [checkins, locations]);

  useEffect(() => {
    fetch('/api/locations?type=hotel')
      .then((res) => res.json())
      .then((data) => {
        const normalized = data.map((l) => ({
          ...l,
          district: l.district === 'Kon Plông' ? 'Kon Plông (Măng Đen)' : l.district
        }));
        setLocations(normalized);
      })
      .catch(() => setLocations([]));

    fetch('/api/checkins')
      .then((res) => res.json())
      .then(setCheckins)
      .catch(() => setCheckins([]));
  }, []);

  const districts = useMemo(() => {
    const set = new Set();
    for (const l of locations) {
      if (l.district) set.add(l.district);
    }
    for (const d of konTumDistricts) {
      set.add(d);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [locations]);

  const processedLocations = useMemo(() => {
    // 1. Filter
    const filtered = locations.filter((l) => {
      if (selectedDistrict && l.district !== selectedDistrict) return false;
      if (selectedCategory !== 'Tất cả') {
        const cat = selectedCategory.toLowerCase();
        if (cat === 'homestay') {
          if (!l.category.toLowerCase().includes('homestay')) return false;
        } else {
          if (!l.category.toLowerCase().includes(cat)) return false;
        }
      }
      return true;
    });

    // 2. Sort
    if (sortBy === 'views') {
      return [...filtered].sort((a, b) => (b.views || 0) - (a.views || 0));
    }

    if (sortBy === 'rating') {
      const getAvgRating = (locId) => {
        const locReviews = checkins.filter((c) => c.restaurant_id === locId);
        if (locReviews.length === 0) return 0;
        const sum = locReviews.reduce((acc, curr) => acc + curr.rating, 0);
        return sum / locReviews.length;
      };

      const getReviewCount = (locId) => {
        return checkins.filter((c) => c.restaurant_id === locId).length;
      };

      return [...filtered].sort((a, b) => {
        const ratingDiff = getAvgRating(b.id) - getAvgRating(a.id);
        if (ratingDiff !== 0) return ratingDiff;
        return getReviewCount(b.id) - getReviewCount(a.id);
      });
    }

    if (sortBy === 'nearby' && gpsCoords) {
      return [...filtered].sort((a, b) => {
        const distA = getDistance(gpsCoords.latitude, gpsCoords.longitude, a.latitude, a.longitude);
        const distB = getDistance(gpsCoords.latitude, gpsCoords.longitude, b.latitude, b.longitude);
        return distA - distB;
      });
    }

    // Default sorting (Sponsored first, then alphabetical by name)
    return [...filtered].sort((a, b) => {
      if (b.is_sponsored !== a.is_sponsored) {
        return (b.is_sponsored || 0) - (a.is_sponsored || 0);
      }
      return a.name.localeCompare(b.name, 'vi');
    });
  }, [locations, selectedDistrict, selectedCategory, sortBy, gpsCoords, checkins]);

  const handleSortChange = (value) => {
    setSortBy(value);
    if (value === 'nearby') {
      setLoadingGps(true);
      setGpsError(null);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setGpsCoords({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
            setLoadingGps(false);
          },
          (error) => {
            console.error(error);
            setGpsError('Không thể lấy vị trí của bạn. Vui lòng bật định vị và cấp quyền.');
            setLoadingGps(false);
            setSortBy('default');
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      } else {
        setGpsError('Trình duyệt không hỗ trợ định vị GPS.');
        setLoadingGps(false);
        setSortBy('default');
      }
    }
  };

  const handleIncrementViews = (id, newViews) => {
    setLocations((prev) =>
      prev.map((l) => (l.id === id ? { ...l, views: newViews } : l))
    );
  };

  return (
    <div className="page-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Dừng chân nghỉ dưỡng</p>
          <h1>Khách Sạn & Homestay Kon Tum</h1>
          <p>
            Tìm kiếm phòng nghỉ khách sạn hiện đại hoặc những căn homestay gỗ xinh xắn ẩn mình giữa núi thông se lạnh của Măng Đen.
          </p>
        </div>
      </header>

      <main className="content-container">
        <section className="section-intro">
          <div className="filter-search-wrapper">
            <div className="filters-row">
              <div className="filter-group">
                <label className="filter-label">Huyện/Quận</label>
                <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)}>
                  <option value="">Tất cả huyện</option>
                  {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Sắp xếp theo</label>
                <select value={sortBy} onChange={(e) => handleSortChange(e.target.value)}>
                  <option value="default">Mặc định</option>
                  <option value="views">Lượt xem nhiều nhất</option>
                  <option value="rating">Đánh giá cao nhất</option>
                  <option value="nearby">Địa điểm gần đây (GPS)</option>
                </select>
              </div>

              {loadingGps && (
                <p className="gps-status-msg" style={{ gridColumn: '1 / -1', margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
                  ⏳ Đang xác định vị trí của bạn...
                </p>
              )}
              {gpsError && (
                <p className="gps-status-msg error" style={{ gridColumn: '1 / -1', margin: '4px 0 0', fontSize: '0.85rem', color: '#c0392b', fontWeight: 600 }}>
                  ⚠️ {gpsError}
                </p>
              )}
            </div>
          </div>

          <div className="quick-tags-wrapper" style={{ marginTop: '16px', marginBottom: '24px' }}>
            <span className="tags-label">Gợi ý nhanh:</span>
            <div className="quick-tags">
              {['Tất cả', 'Khách sạn 4 sao', 'Khách sạn 3 sao', 'Homestay'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`tag-btn ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <h2>Danh sách Khách sạn & Homestay ({processedLocations.length})</h2>
          {processedLocations.length === 0 ? (
            <p className="no-comments-text">Không tìm thấy khách sạn hay homestay nào phù hợp.</p>
          ) : (
            <div className="cards-grid">
              {processedLocations.map((location) => (
                <AccommodationCard 
                  key={location.id} 
                  location={location} 
                  checkins={checkins} 
                  gpsCoords={gpsCoords}
                  onIncrementViews={handleIncrementViews}
                  onAddCheckin={(newCheckin) => setCheckins((prev) => [newCheckin, ...prev])} 
                />
              ))}
            </div>
          )}
        </section>

        <section className="section-checkins">
          <h2>Nhật ký check-in khách sạn & homestay mới nhất ({filteredCheckins.length})</h2>
          {filteredCheckins.length === 0 ? (
            <p>Chưa có check-in nào. Hãy là người đầu tiên!</p>
          ) : (
            <div className="checkin-list">
              {filteredCheckins.map((checkin) => (
                <article key={checkin.id} className="checkin-card">
                  <p className="checkin-meta">{checkin.name} • {checkin.rating} sao • {new Date(checkin.created_at).toLocaleString('vi-VN')}</p>
                  <p>{checkin.comment}</p>
                  <p className="small">Nơi ở: {checkin.restaurant_name}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
