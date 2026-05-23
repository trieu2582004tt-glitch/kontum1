import { useEffect, useState } from 'react';
import { fetchWithAuth, clearAuthToken } from '../auth.js';
import konTumDistricts from '../data/konTumDistricts.json';

const initialData = {
  name: '',
  city: '',
  district: '',
  commune: '',
  category: '',
  description: '',
  priceRange: '',
  latitude: '',
  longitude: '',
  imageUrl: '',
  mapUrl: '',
  address: '',
  type: 'food'
};

export default function AdminPanel({ user, onLogout }) {
  const [restaurants, setRestaurants] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [confessions, setConfessions] = useState([]);
  const [pendingLocations, setPendingLocations] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Modal & Form States
  const [form, setForm] = useState(initialData);
  const [editingId, setEditingId] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  
  // Navigation & Search/Filter States
  const [activeTab, setActiveTab] = useState('restaurants');
  const [confessionsSubTab, setConfessionsSubTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDistrict, setFilterDistrict] = useState('all');
  
  // Feedback States
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Helper to trigger toast notification
  const triggerToast = (text, type = 'success') => {
    setToast({ text, type });
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return timer;
  };

  const loadAdminData = async () => {
    const [restaurantsRes, checkinsRes] = await Promise.all([
      fetchWithAuth('/api/admin/restaurants'),
      fetchWithAuth('/api/admin/checkins')
    ]);

    if (!restaurantsRes.ok || !checkinsRes.ok) {
      triggerToast('Không thể tải dữ liệu quản trị. Vui lòng đăng nhập lại.', 'error');
      return;
    }

    const restaurantsData = await restaurantsRes.json();
    const normalized = restaurantsData.map((r) => ({
      ...r,
      district: r.district === 'Kon Plông' ? 'Kon Plông (Măng Đen)' : r.district
    }));
    setRestaurants(normalized);
    setCheckins(await checkinsRes.json());
  };

  const loadConfessions = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/confessions');
      if (res.ok) {
        setConfessions(await res.json());
      } else {
        triggerToast('Không thể tải danh sách confessions.', 'error');
      }
    } catch (e) {
      console.error(e);
      triggerToast('Lỗi kết nối khi tải confessions.', 'error');
    }
  };

  const loadPendingLocations = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/locations/pending');
      if (res.ok) {
        setPendingLocations(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/users');
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAdminData();
    loadConfessions();
    loadPendingLocations();
    loadUsers();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetchWithAuth('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {} 
      });
      const data = await res.json();
      if (res.ok) {
        setForm((prev) => ({ ...prev, imageUrl: data.url }));
        triggerToast('Tải ảnh lên thành công!');
      } else {
        setUploadError(data.error || 'Upload thất bại.');
        triggerToast(data.error || 'Upload ảnh thất bại.', 'error');
      }
    } catch {
      setUploadError('Lỗi kết nối khi upload.');
      triggerToast('Lỗi kết nối khi upload ảnh.', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/admin/restaurants/${editingId}` : '/api/admin/restaurants';

    const payload = {
      ...form,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null
    };
    
    try {
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        triggerToast(body.error || 'Lưu địa điểm thất bại.', 'error');
        return;
      }

      setForm(initialData);
      setEditingId(null);
      setIsFormModalOpen(false);
      triggerToast(editingId ? 'Cập nhật địa điểm và đồng bộ SQLite thành công!' : 'Thêm địa điểm mới thành công!');
      await loadAdminData();
    } catch {
      triggerToast('Lỗi kết nối khi lưu địa điểm.', 'error');
    }
  };

  const handleEdit = (restaurant) => {
    setEditingId(restaurant.id);
    setForm({
      name: restaurant.name,
      city: restaurant.city,
      district: restaurant.district || '',
      commune: restaurant.commune || '',
      category: restaurant.category,
      description: restaurant.description || '',
      priceRange: restaurant.priceRange || '',
      latitude: restaurant.latitude || '',
      longitude: restaurant.longitude || '',
      imageUrl: restaurant.imageUrl || '',
      mapUrl: restaurant.mapUrl || '',
      address: restaurant.address || '',
      type: restaurant.type || 'food'
    });
    setUploadError('');
    setIsFormModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa địa điểm này vĩnh viễn? Dữ liệu trong cơ sở dữ liệu SQLite sẽ bị xóa sạch.')) return;
    try {
      const res = await fetchWithAuth(`/api/admin/restaurants/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        triggerToast('Xoá địa điểm thất bại.', 'error');
        return;
      }
      triggerToast('Đã xóa vĩnh viễn địa điểm và cập nhật cơ sở dữ liệu SQLite!');
      await loadAdminData();
    } catch {
      triggerToast('Lỗi kết nối khi xóa địa điểm.', 'error');
    }
  };

  const handleUpdateConfessionStatus = async (id, status) => {
    try {
      const res = await fetchWithAuth(`/api/admin/confessions/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        triggerToast(`Cập nhật trạng thái Confession #${id} sang "${status === 'approved' ? 'Đã duyệt' : 'Từ chối'}" thành công!`);
        await loadConfessions();
      } else {
        triggerToast('Cập nhật trạng thái confessions thất bại.', 'error');
      }
    } catch {
      triggerToast('Lỗi kết nối khi cập nhật trạng thái confessions.', 'error');
    }
  };

  const handleDeleteConfession = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa confession này vĩnh viễn khỏi SQLite không?')) return;
    try {
      const res = await fetchWithAuth(`/api/admin/confessions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerToast(`Đã xóa vĩnh viễn Confession #${id} khỏi cơ sở dữ liệu!`);
        await loadConfessions();
      } else {
        triggerToast('Xóa confession thất bại.', 'error');
      }
    } catch {
      triggerToast('Lỗi kết nối khi xóa confession.', 'error');
    }
  };

  const handleApproveLocation = async (id) => {
    try {
      const res = await fetchWithAuth(`/api/admin/locations/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'approved' })
      });
      if (res.ok) {
        triggerToast(`Đã phê duyệt địa điểm #${id}! Địa điểm đã được chuyển sang chế độ hiển thị.`);
        await loadPendingLocations();
        await loadAdminData();
      } else {
        triggerToast('Duyệt đề xuất thất bại.', 'error');
      }
    } catch {
      triggerToast('Lỗi kết nối khi duyệt đề xuất.', 'error');
    }
  };

  const handleRejectLocation = async (id) => {
    if (!window.confirm('Từ chối đề xuất này? Trạng thái sẽ được đặt thành "rejected".')) return;
    try {
      const res = await fetchWithAuth(`/api/admin/locations/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'rejected' })
      });
      if (res.ok) {
        triggerToast(`Đã từ chối địa điểm #${id}.`);
        await loadPendingLocations();
      } else {
        triggerToast('Từ chối đề xuất thất bại.', 'error');
      }
    } catch {
      triggerToast('Lỗi kết nối khi từ chối đề xuất.', 'error');
    }
  };

  const handleToggleAdmin = async (userId, username, currentIsAdmin) => {
    if (userId === user?.id) {
      triggerToast('Bạn không thể tự thu hồi quyền Admin của chính mình!', 'error');
      return;
    }

    const newIsAdmin = currentIsAdmin ? 0 : 1;
    const confirmMessage = newIsAdmin 
      ? `Bạn có chắc chắn muốn cấp quyền Admin cho tài khoản "${username}" không?`
      : `Bạn có chắc chắn muốn thu hồi quyền Admin của tài khoản "${username}" không?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await fetchWithAuth(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ is_admin: newIsAdmin })
      });

      if (res.ok) {
        triggerToast(`Đã ${newIsAdmin ? 'cấp quyền Admin cho' : 'thu hồi quyền Admin của'} tài khoản "${username}" thành công!`);
        await loadUsers();
      } else {
        const body = await res.json().catch(() => ({}));
        triggerToast(body.error || 'Cập nhật quyền hạn thất bại.', 'error');
      }
    } catch {
      triggerToast('Lỗi kết nối khi cập nhật quyền hạn.', 'error');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (userId === user?.id) {
      triggerToast('Bạn không thể tự xóa tài khoản của chính mình!', 'error');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${username}" vĩnh viễn khỏi hệ thống không? Hành động này không thể hoàn tác.`)) return;

    try {
      const res = await fetchWithAuth(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        triggerToast(`Đã xóa vĩnh viễn tài khoản "${username}" thành công!`);
        await loadUsers();
      } else {
        const body = await res.json().catch(() => ({}));
        triggerToast(body.error || 'Xóa tài khoản thất bại.', 'error');
      }
    } catch {
      triggerToast('Lỗi kết nối khi xóa tài khoản.', 'error');
    }
  };

  const handleLogoutClick = async () => {
    try {
      await fetchWithAuth('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      clearAuthToken();
      onLogout();
    }
  };

  // Filters calculation
  const filteredRestaurants = restaurants.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.address && r.address.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || r.type === filterType;
    const matchesDistrict = filterDistrict === 'all' || r.district === filterDistrict;
    return matchesSearch && matchesType && matchesDistrict;
  });

  const pendingConfessions = confessions.filter((c) => c.status === 'pending');
  const moderatedConfessions = confessions.filter((c) => c.status !== 'pending');

  return (
    <div className="page-shell">
      {/* Toast notifications */}
      {toast && (
        <div className="admin-toast-container">
          <div className={`admin-toast ${toast.type === 'error' ? 'error' : 'success'}`}>
            <span style={{ fontSize: '1.2rem' }}>{toast.type === 'error' ? '⚠️' : '✨'}</span>
            <p className="admin-toast-text">{toast.text}</p>
            <button className="admin-toast-close" onClick={() => setToast(null)}>&times;</button>
          </div>
        </div>
      )}

      {/* Modern Header */}
      <div className="admin-header">
        <div>
          <h1>Bảng Điều Khiển Quản Trị</h1>
          <p>Hệ thống quản lý thông tin ẩm thực, du lịch và confessions của tỉnh Kon Tum năm 2026.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="admin-user-profile">
            <div className="admin-user-avatar">{user?.username ? user.username[0].toUpperCase() : 'A'}</div>
            <span className="admin-user-name">{user?.username || 'Quản trị viên'} 👑</span>
          </div>
          <button className="small-button btn-secondary" onClick={handleLogoutClick} style={{ padding: '8px 16px', borderRadius: '12px' }}>
            🚪 Đăng xuất
          </button>
        </div>
      </div>

      {/* Metrics Cards Overview */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon">🏞️</div>
          <div className="admin-stat-info">
            <h3>Địa điểm hoạt động</h3>
            <span className="num">{restaurants.length}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">⏳</div>
          <div className="admin-stat-info">
            <h3>Đề xuất chờ duyệt</h3>
            <span className="num">{pendingLocations.length}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">💬</div>
          <div className="admin-stat-info">
            <h3>Confessions chờ duyệt</h3>
            <span className="num">{pendingConfessions.length}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">⭐</div>
          <div className="admin-stat-info">
            <h3>Lượt Check-in</h3>
            <span className="num">{checkins.length}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">👤</div>
          <div className="admin-stat-info">
            <h3>Thành viên</h3>
            <span className="num">{users.length}</span>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="admin-dashboard-container">
        {/* Sidebar Menu */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-title">Danh mục quản lý</div>
          <button 
            className={`admin-sidebar-btn ${activeTab === 'restaurants' ? 'active' : ''}`}
            onClick={() => { setActiveTab('restaurants'); }}
          >
            🍔 Địa điểm ẩm thực & Du lịch
          </button>
          <button 
            className={`admin-sidebar-btn ${activeTab === 'suggest' ? 'active' : ''}`}
            onClick={() => { setActiveTab('suggest'); }}
          >
            📍 Duyệt đề xuất địa điểm
            {pendingLocations.length > 0 && (
              <span className="badge">{pendingLocations.length}</span>
            )}
          </button>
          <button 
            className={`admin-sidebar-btn ${activeTab === 'confessions' ? 'active' : ''}`}
            onClick={() => { setActiveTab('confessions'); }}
          >
            💬 Phê duyệt Confessions
            {pendingConfessions.length > 0 && (
              <span className="badge">{pendingConfessions.length}</span>
            )}
          </button>
          <button 
            className={`admin-sidebar-btn ${activeTab === 'checkins' ? 'active' : ''}`}
            onClick={() => { setActiveTab('checkins'); }}
          >
            📸 Quản lý Check-ins
          </button>
          <button 
            className={`admin-sidebar-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => { setActiveTab('users'); }}
          >
            👤 Quản lý thành viên
            {users.length > 0 && (
              <span className="badge">{users.length}</span>
            )}
          </button>
        </aside>

        {/* Content Area */}
        <main style={{ minWidth: 0 }}>
          {/* TAB 1: RESTAURANTS */}
          {activeTab === 'restaurants' && (
            <div>
              <div className="admin-control-row">
                <div className="admin-search-wrapper">
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="Tìm kiếm địa điểm theo tên, danh mục..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <select 
                    className="admin-filter-select"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">Tất cả loại hình</option>
                    <option value="food">🍽️ Ăn uống & Đặc sản</option>
                    <option value="attraction">🏕️ Điểm tham quan</option>
                    <option value="hotel">🏨 Lưu trú / Homestay</option>
                  </select>
                  <select 
                    className="admin-filter-select"
                    value={filterDistrict}
                    onChange={(e) => setFilterDistrict(e.target.value)}
                  >
                    <option value="all">Tất cả huyện</option>
                    {konTumDistricts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <button 
                  className="btn-primary" 
                  onClick={() => {
                    setForm(initialData);
                    setEditingId(null);
                    setUploadError('');
                    setIsFormModalOpen(true);
                  }}
                  style={{ borderRadius: '12px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span>➕ Thêm địa điểm mới</span>
                </button>
              </div>

              <div className="admin-table-wrapper">
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>Ảnh</th>
                        <th>Tên địa điểm</th>
                        <th>Loại hình</th>
                        <th>Khu vực</th>
                        <th>Giá / Xem</th>
                        <th style={{ width: '150px' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRestaurants.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                            📭 Không tìm thấy địa điểm nào phù hợp.
                          </td>
                        </tr>
                      ) : (
                        filteredRestaurants.map((res) => (
                          <tr key={res.id}>
                            <td>
                              <img 
                                src={res.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=60'} 
                                alt={res.name} 
                                className="admin-table-thumb" 
                              />
                            </td>
                            <td>
                              <div className="admin-table-title">{res.name}</div>
                              <div className="admin-table-sub">{res.category}</div>
                            </td>
                            <td>
                              <span className={`admin-badge ${res.type}`}>
                                {res.type === 'food' ? '🍽️ Đặc sản' : res.type === 'attraction' ? '🏕️ Thắng cảnh' : '🏨 Lưu trú'}
                              </span>
                            </td>
                            <td>
                              <div className="admin-table-title" style={{ fontSize: '0.85rem' }}>{res.city}</div>
                              <div className="admin-table-sub">{res.district || 'Không rõ'}</div>
                            </td>
                            <td>
                              <div className="admin-table-title" style={{ fontSize: '0.85rem' }}>{res.priceRange || 'N/A'}</div>
                              <div className="admin-table-sub">👁️ {res.views || 0} lượt xem</div>
                            </td>
                            <td>
                              <div className="admin-table-actions">
                                <button className="admin-table-btn" onClick={() => handleEdit(res)}>✏️ Sửa</button>
                                <button className="admin-table-btn danger" onClick={() => handleDelete(res.id)}>🗑️ Xóa</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUGGESTED LOCATIONS */}
          {activeTab === 'suggest' && (
            <div>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--primary)', marginBottom: '18px', fontFamily: 'Outfit, sans-serif' }}>
                Đề xuất địa điểm từ cộng đồng ({pendingLocations.length})
              </h2>
              {pendingLocations.length === 0 ? (
                <div className="section-intro" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>🎉 Hiện tại không có đề xuất nào đang chờ xử lý.</p>
                </div>
              ) : (
                <div className="admin-list-container">
                  {pendingLocations.map((loc) => (
                    <article key={loc.id} className="admin-list-item">
                      <div className="admin-list-header">
                        <span className={`admin-badge ${loc.type}`}>
                          {loc.type === 'food' ? '🍽️ Ẩm thực' : loc.type === 'attraction' ? '🏕️ Du lịch' : '🏨 Lưu trú'}
                        </span>
                        <span className="admin-badge" style={{ background: 'rgba(86, 90, 55, 0.08)', color: 'var(--primary)' }}>
                          {loc.category}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          📍 {loc.city} {loc.district ? `• Huyện ${loc.district}` : ''}
                        </span>
                        {loc.submitter_name && (
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                            👤 Gửi bởi: <strong>{loc.submitter_name}</strong>
                          </span>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '20px', marginTop: '10px', flexWrap: 'wrap' }}>
                        {loc.imageUrl && (
                          <img 
                            src={loc.imageUrl} 
                            alt={loc.name} 
                            style={{ width: '150px', height: '100px', borderRadius: '12px', objectFit: 'cover', border: '1.5px solid var(--border)' }} 
                          />
                        )}
                        <div style={{ flex: 1, minWidth: '250px' }}>
                          <h3 className="admin-list-title">{loc.name}</h3>
                          {loc.address && <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: '4px 0' }}>📍 Địa chỉ: {loc.address}</p>}
                          {loc.priceRange && <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: '4px 0' }}>💰 Giá tham khảo: {loc.priceRange}</p>}
                          {loc.description && <p className="admin-list-content" style={{ marginTop: '8px' }}>{loc.description}</p>}
                          {loc.mapUrl && (
                            <a 
                              href={loc.mapUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ fontSize: '0.82rem', color: 'var(--secondary)', fontWeight: 'bold', textDecoration: 'none' }}
                            >
                              🗺️ Xem liên kết Google Maps chỉ đường
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="admin-list-actions">
                        <button className="btn-primary btn-approve" onClick={() => handleApproveLocation(loc.id)}>
                          ✓ Duyệt và Đăng tải lên trang
                        </button>
                        <button className="btn-secondary btn-reject" onClick={() => handleRejectLocation(loc.id)}>
                          ✕ Từ chối đề xuất
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONFESSIONS MODERATION */}
          {activeTab === 'confessions' && (
            <div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '2px solid var(--border)', paddingBottom: '10px' }}>
                <button
                  onClick={() => setConfessionsSubTab('pending')}
                  style={{
                    background: confessionsSubTab === 'pending' ? 'var(--primary)' : 'transparent',
                    color: confessionsSubTab === 'pending' ? 'white' : 'var(--text-secondary)',
                    boxShadow: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.88rem'
                  }}
                >
                  ⏳ Đang chờ duyệt ({pendingConfessions.length})
                </button>
                <button
                  onClick={() => setConfessionsSubTab('moderated')}
                  style={{
                    background: confessionsSubTab === 'moderated' ? 'var(--primary)' : 'transparent',
                    color: confessionsSubTab === 'moderated' ? 'white' : 'var(--text-secondary)',
                    boxShadow: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.88rem'
                  }}
                >
                  📜 Lịch sử xử lý ({moderatedConfessions.length})
                </button>
              </div>

              {confessionsSubTab === 'pending' ? (
                <div>
                  {pendingConfessions.length === 0 ? (
                    <div className="section-intro" style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <p style={{ color: 'var(--text-secondary)' }}>🎉 Không có confession nào đang chờ duyệt.</p>
                    </div>
                  ) : (
                    <div className="admin-list-container">
                      {pendingConfessions.map((c) => (
                        <article key={c.id} className="admin-list-item">
                          <div className="admin-list-header">
                            <span className="admin-badge attraction">{c.category}</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>#CF{c.id}</span>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              🕒 {new Date(c.created_at).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          {c.title && <h3 className="admin-list-title">{c.title}</h3>}
                          <p className="admin-list-content">{c.content}</p>
                          {c.hashtags && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                              {c.hashtags.split(',').map((tag) => (
                                <span key={tag} style={{ fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 600 }}>#{tag}</span>
                              ))}
                            </div>
                          )}
                          <div className="admin-list-actions">
                            <button className="btn-primary btn-approve" onClick={() => handleUpdateConfessionStatus(c.id, 'approved')}>
                              ✓ Phê duyệt bài viết
                            </button>
                            <button className="btn-secondary btn-reject" onClick={() => handleUpdateConfessionStatus(c.id, 'rejected')}>
                              ✕ Từ chối bài viết
                            </button>
                            <button className="btn-secondary btn-delete" onClick={() => handleDeleteConfession(c.id)}>
                              🗑️ Xoá vĩnh viễn khỏi SQLite
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {moderatedConfessions.length === 0 ? (
                    <div className="section-intro" style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <p style={{ color: 'var(--text-secondary)' }}>Chưa xử lý confession nào gần đây.</p>
                    </div>
                  ) : (
                    <div className="admin-list-container">
                      {moderatedConfessions.map((c) => (
                        <article key={c.id} className="admin-list-item" style={{ opacity: 0.85 }}>
                          <div className="admin-list-header">
                            <span className="admin-badge attraction">{c.category}</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>#CF{c.id}</span>
                            <span className={`status-tag ${c.status}`}>
                              {c.status === 'approved' ? 'Đã duyệt công khai' : 'Đã từ chối'}
                            </span>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              🕒 {new Date(c.created_at).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          {c.title && <h3 className="admin-list-title" style={{ fontSize: '1.05rem' }}>{c.title}</h3>}
                          <p className="admin-list-content" style={{ fontSize: '0.85rem' }}>{c.content}</p>
                          <div className="admin-list-actions">
                            {c.status === 'rejected' ? (
                              <button className="btn-primary btn-approve" onClick={() => handleUpdateConfessionStatus(c.id, 'approved')}>
                                ✓ Phê duyệt lại
                              </button>
                            ) : (
                              <button className="btn-secondary btn-reject" onClick={() => handleUpdateConfessionStatus(c.id, 'rejected')}>
                                ✕ Thu hồi duyệt
                              </button>
                            )}
                            <button className="btn-secondary btn-delete" onClick={() => handleDeleteConfession(c.id)}>
                              🗑️ Xoá vĩnh viễn khỏi SQLite
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CHECK-INS LIST */}
          {activeTab === 'checkins' && (
            <div>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--primary)', marginBottom: '18px', fontFamily: 'Outfit, sans-serif' }}>
                Danh sách check-in & Đánh giá gần đây ({checkins.length})
              </h2>
              {checkins.length === 0 ? (
                <div className="section-intro" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <p style={{ color: 'var(--text-secondary)' }}>Chưa có lượt check-in nào trong cơ sở dữ liệu.</p>
                </div>
              ) : (
                <div className="admin-list-container">
                  {checkins.map((checkin) => (
                    <article key={checkin.id} className="admin-list-item">
                      <div className="admin-list-header">
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>👤 {checkin.name}</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
                          {'★'.repeat(checkin.rating)}{'☆'.repeat(5 - checkin.rating)}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          🕒 {new Date(checkin.created_at).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <p className="admin-list-content" style={{ margin: '8px 0' }}>"{checkin.comment}"</p>
                      <div className="admin-list-meta-row" style={{ margin: '8px 0 0' }}>
                        <span>📍 Tại địa điểm: <strong>{checkin.restaurant_name}</strong></span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--primary)', marginBottom: '18px', fontFamily: 'Outfit, sans-serif' }}>
                Danh sách tài khoản & Phân quyền thành viên ({users.length})
              </h2>
              <div className="admin-table-wrapper">
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>ID</th>
                        <th>Tên đăng nhập (Username)</th>
                        <th>Vai trò hiện tại</th>
                        <th>Cấp / Hủy quyền quản trị</th>
                        <th style={{ width: '150px' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                            📭 Chưa có tài khoản nào được đăng ký.
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => {
                          const isSelf = u.id === user?.id;
                          return (
                            <tr key={u.id} style={isSelf ? { background: 'rgba(86, 90, 55, 0.03)' } : {}}>
                              <td>#{u.id}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span className="admin-table-title" style={{ fontSize: '0.95rem' }}>{u.username}</span>
                                  {isSelf && (
                                    <span style={{ fontSize: '0.75rem', background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '20px', fontWeight: 'bold' }}>
                                      Tài khoản hiện tại
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className={`admin-badge ${u.is_admin ? 'approved' : 'pending'}`} style={{ textTransform: 'none' }}>
                                  {u.is_admin ? '👑 Admin' : '👤 Thành viên'}
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="admin-table-btn"
                                  onClick={() => handleToggleAdmin(u.id, u.username, u.is_admin)}
                                  disabled={isSelf}
                                  style={{
                                    opacity: isSelf ? 0.5 : 1,
                                    cursor: isSelf ? 'not-allowed' : 'pointer',
                                    background: u.is_admin ? 'rgba(231, 76, 60, 0.08)' : 'rgba(46, 204, 113, 0.08)',
                                    color: u.is_admin ? '#c0392b' : '#27ae60',
                                    fontWeight: 'bold',
                                    padding: '6px 12px',
                                    borderRadius: '8px'
                                  }}
                                >
                                  {u.is_admin ? '🚫 Thu hồi quyền Admin' : '⚡ Cấp quyền Admin'}
                                </button>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="admin-table-btn danger"
                                  onClick={() => handleDeleteUser(u.id, u.username)}
                                  disabled={isSelf}
                                  style={{
                                    opacity: isSelf ? 0.5 : 1,
                                    cursor: isSelf ? 'not-allowed' : 'pointer',
                                    padding: '6px 12px',
                                    borderRadius: '8px'
                                  }}
                                >
                                  🗑️ Xóa vĩnh viễn
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* POPUP MODAL: ADD / EDIT RESTAURANT */}
      {isFormModalOpen && (
        <div className="modal-overlay" onClick={() => setIsFormModalOpen(false)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{editingId ? '✏️ Cập nhật địa điểm' : '➕ Thêm địa điểm mới'}</h2>
              <button className="modal-close-btn" onClick={() => setIsFormModalOpen(false)}>&times;</button>
            </div>
            <div className="admin-modal-body">
              <form onSubmit={handleSave} className="form-grid">
                <label>
                  Tên địa điểm *
                  <input 
                    name="name" 
                    value={form.name} 
                    onChange={handleChange} 
                    placeholder="VD: Cơm gà Linh, Resort Măng Đen..."
                    required 
                  />
                </label>
                <label>
                  Khu vực / Thành phố *
                  <input 
                    name="city" 
                    value={form.city} 
                    onChange={handleChange} 
                    placeholder="VD: TP Kon Tum hoặc Măng Đen" 
                    required 
                  />
                </label>
                <label>
                  Huyện / Quận *
                  <select name="district" value={form.district} onChange={handleChange} required>
                    <option value="">-- Chọn huyện --</option>
                    {konTumDistricts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Xã / Thị trấn
                  <input 
                    name="commune" 
                    value={form.commune} 
                    onChange={handleChange} 
                    placeholder="Ví dụ: Đăk Long" 
                  />
                </label>
                <label>
                  Danh mục / Thể loại *
                  <input 
                    name="category" 
                    value={form.category} 
                    onChange={handleChange} 
                    placeholder="Ví dụ: Thác nước, Homestay, Cà phê" 
                    required 
                  />
                </label>
                <label>
                  Loại hình du lịch *
                  <select name="type" value={form.type} onChange={handleChange} required>
                    <option value="food">🍽️ Đặc sản & ăn uống</option>
                    <option value="attraction">🏕️ Địa điểm du lịch / Danh thắng</option>
                    <option value="hotel">🏨 Khách sạn / Homestay / Resort</option>
                  </select>
                </label>
                <label>
                  Giá tham khảo / Giá vé / Giá phòng
                  <input 
                    name="priceRange" 
                    value={form.priceRange} 
                    onChange={handleChange} 
                    placeholder="VD: 50k - 120k / Miễn phí / 500k - 1tr" 
                  />
                </label>
                <label className="full-width">
                  Địa chỉ chi tiết
                  <input 
                    name="address" 
                    value={form.address} 
                    onChange={handleChange} 
                    placeholder="VD: 123 Lê Lợi, Phường Quyết Thắng, TP Kon Tum..." 
                  />
                </label>
                <label className="full-width">
                  Mô tả địa điểm
                  <textarea 
                    name="description" 
                    value={form.description} 
                    onChange={handleChange} 
                    placeholder="Nhập giới thiệu ngắn, điểm đặc sắc hoặc thực đơn tại đây..."
                    rows={3} 
                  />
                </label>
                <label className="full-width">
                  Liên kết bản đồ (Google Maps URL chỉ đường)
                  <input 
                    name="mapUrl" 
                    value={form.mapUrl} 
                    onChange={handleChange} 
                    placeholder="https://maps.app.goo.gl/..." 
                  />
                </label>
                <label className="full-width">
                  Hình ảnh địa điểm (URL ảnh hoặc tải lên file)
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
                    <input
                      name="imageUrl"
                      value={form.imageUrl}
                      onChange={handleChange}
                      placeholder="Nhập URL ảnh liên kết ngoài hoặc tải lên file..."
                      style={{ flex: 1 }}
                    />
                    <label
                      htmlFor="admin-upload-image-input"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '10px 18px', borderRadius: '12px', cursor: 'pointer',
                        background: 'var(--primary)', color: '#fff', fontWeight: 600,
                        fontSize: '0.85rem', whiteSpace: 'nowrap',
                        opacity: uploading ? 0.7 : 1, transition: 'opacity 0.2s'
                      }}
                    >
                      {uploading ? '⏳ Đang tải...' : '📷 Chọn file ảnh'}
                      <input
                        id="admin-upload-image-input"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                  {uploadError && <p style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: '6px', fontWeight: 600 }}>⚠️ {uploadError}</p>}
                  {form.imageUrl && (
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={form.imageUrl} alt="preview" style={{ maxHeight: '100px', borderRadius: '10px', border: '1px solid var(--border)', objectFit: 'cover' }} />
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <p style={{ color: '#27ae60', fontWeight: 'bold' }}>✓ Ảnh đã được liên kết thành công</p>
                        <button 
                          type="button" 
                          onClick={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}
                          style={{
                            background: 'transparent', color: '#c0392b', border: 'none', 
                            padding: '4px 0', fontSize: '0.78rem', fontWeight: 'bold', 
                            cursor: 'pointer', boxShadow: 'none'
                          }}
                        >
                          Xóa ảnh này
                        </button>
                      </div>
                    </div>
                  )}
                </label>
                <label>
                  Vĩ độ (GPS)
                  <input name="latitude" value={form.latitude} onChange={handleChange} placeholder="Ví dụ: 14.3482" />
                </label>
                <label>
                  Kinh độ (GPS)
                  <input name="longitude" value={form.longitude} onChange={handleChange} placeholder="Ví dụ: 108.0069" />
                </label>
                
                <div className="full-width" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setIsFormModalOpen(false)} style={{ padding: '10px 20px', borderRadius: '10px' }}>
                    Hủy bỏ
                  </button>
                  <button type="submit" className="btn-primary" style={{ padding: '10px 24px', borderRadius: '10px' }}>
                    {editingId ? '✓ Cập nhật địa điểm' : '✓ Thêm mới địa điểm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
