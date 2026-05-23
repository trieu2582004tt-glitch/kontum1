import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

// Import các ảnh bìa vừa sinh bằng AI
import natureCover from '../mang_den_nature.png';
import cultureCover from '../gong_culture.png';
import resortCover from '../mang_den_resort.png';

const ARTICLES_DATA = {
  'thien-nhien': {
    title: 'Thiên Nhiên Mây Sương Măng Đen - Nàng Thơ Của Cao Nguyên',
    category: 'Thiên nhiên & Trải nghiệm',
    readTime: '4 phút đọc',
    date: '22 Tháng 5, 2026',
    author: 'Khám Phá Kon Tum',
    coverImage: natureCover,
    lead: 'Nằm ở độ cao hơn 1.200 mét so với mực nước biển, Măng Đen được ví như chiếc máy điều hòa khổng lồ của Tây Nguyên. Nơi đây sở hữu bầu không khí trong lành, sương mù lãng đãng quanh năm và những cánh rừng thông đại ngàn xanh bất tận.',
    sections: [
      {
        heading: 'Sương Mờ Và Rừng Thông - Đặc Sản Trăng Khuyết',
        content: 'Mỗi buổi sáng thức dậy tại Măng Đen, du khách sẽ được chìm đắm trong màn sương trắng xóa dày đặc tràn qua các triền đồi, luồn qua từng khe lá thông. Đi dạo dưới những tán thông xanh, hít hà bầu không khí se lạnh buốt nhẹ là trải nghiệm mang lại sự tĩnh lặng tuyệt đối cho tâm hồn, rũ bỏ mọi ồn ào nơi phố thị chật chội.',
        image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1000&q=80',
        imageCaption: 'Hồ Đắk Ke ẩn mình mơ màng trong làn sương sớm lạnh buốt'
      },
      {
        heading: 'Bản Nhạc Của Nước - Thác Pa Sỹ Hoang Sơ',
        content: 'Không chỉ có mây sương, thiên nhiên Kon Tum còn được tô điểm bởi những thác nước kỳ vĩ. Thác Pa Sỹ đổ từ độ cao 35 mét như một dải lụa trắng xóa thả giữa lòng rừng già nguyên sinh. Tiếng thác đổ ầm vang hòa cùng tiếng chim rừng tạo nên bản hòa ca hoang dại của núi rừng đại ngàn Tây Nguyên.',
        image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1000&q=80',
        imageCaption: 'Thác nước Pa Sỹ hùng vĩ giữa lòng đại ngàn Kon Plông'
      }
    ],
    gallery: [
      {
        url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80',
        title: 'Cầu treo Kon Klor bắc ngang sông Đắk Bla'
      },
      {
        url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80',
        title: 'Bình minh rực rỡ bên triền thông xanh'
      }
    ],
    ctaText: 'Khám phá các danh thắng Kon Tum thực tế',
    ctaLink: '/attractions',
    ctaSub: 'Xem thông tin chi tiết, tọa độ GPS bản đồ và review các điểm tham quan thiên nhiên ngay.'
  },
  'van-hoa': {
    title: 'Không Gian Văn Hóa Cồng Chiêng - Tiếng Vọng Ngàn Đời',
    category: 'Văn hóa & Lịch sử',
    readTime: '5 phút đọc',
    date: '20 Tháng 5, 2026',
    author: 'Di Sản Tây Nguyên',
    coverImage: cultureCover,
    lead: 'Nhắc đến Kon Tum là nhắc đến vùng đất đậm đặc bản sắc văn hóa của các dân tộc thiểu số Ba Na, Xơ Đăng, Giẻ Triêng... Trong đó, âm vang cồng chiêng và kiến trúc Nhà Rông chính là linh hồn kiêu hãnh của núi rừng.',
    sections: [
      {
        heading: 'Nhà Rông - Biểu Tượng Kiêu Hãnh Bên Đại Ngàn',
        content: 'Nhà Rông là trung tâm văn hóa sinh hoạt cộng đồng của các buôn làng Tây Nguyên. Với thiết kế mái tranh cao vút nhọn hoắt tựa lưỡi rìu chọc thẳng lên bầu trời, Nhà Rông được xây dựng hoàn toàn từ gỗ, tre, nứa do chính tay những nghệ nhân lành nghề nhất trong làng dựng nên mà không cần dùng tới một chiếc đinh sắt nào.',
        image: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=1000&q=80',
        imageCaption: 'Nhà thờ Chánh tòa Kon Tum - sự giao thoa độc đáo giữa kiến trúc Roman và mái Nhà Rông Ba Na'
      },
      {
        heading: 'Âm Vang Cồng Chiêng Và Vũ Điệu Xoang',
        content: 'Tiếng cồng chiêng ngân vang trầm bổng kết hợp cùng những vòng xoang uyển chuyển của các chàng trai, cô gái bản địa quanh bếp lửa bập bùng là di sản văn hóa phi vật thể nhân loại. Đó là sợi dây liên kết thiêng liêng giữa con người với thần linh, đất trời và cố kết cộng đồng sâu sắc qua hàng thế kỷ.',
        image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1000&q=80',
        imageCaption: 'Làng văn hóa truyền thống bên bờ sông Đăk Bla lịch sử'
      }
    ],
    gallery: [
      {
        url: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80',
        title: 'Mặt trước nhà thờ Gỗ hơn 100 năm tuổi'
      },
      {
        url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80',
        title: 'Không gian yên bình làng Kon Klor'
      }
    ],
    ctaText: 'Đọc những chia sẻ & cảm nhận từ cộng đồng',
    ctaLink: '/confessions',
    ctaSub: 'Tham gia góc nhỏ confessions để lắng nghe các câu chuyện văn hóa, đời sống người dân xứ núi.'
  },
  'am-thuc-nghi-duong': {
    title: 'Ẩm Thực Độc Đáo & Không Gian Nghỉ Dưỡng Giữa Rừng Thông',
    category: 'Ẩm thực & Lưu trú',
    readTime: '5 phút đọc',
    date: '18 Tháng 5, 2026',
    author: 'Ẩm Thực Kon Tum',
    coverImage: resortCover,
    lead: 'Chuyến hành trình về miền đất đỏ bazan sẽ không trọn vẹn nếu bạn chưa được đánh thức khứu giác bằng mùi gà nướng tiêu rừng thơm lừng bên ống cơm lam dẻo ngọt, hay nhâm nhi ly cà phê đậm đặc trong căn homestay gỗ ấm áp.',
    sections: [
      {
        heading: 'Hương Vị Núi Rừng: Gà Nướng Cơm Lam & Lẩu Xuyên Tiêu',
        content: 'Gà nướng Măng Đen được tẩm ướp công phu bằng lá tiêu rừng, sả, mật ong rừng rồi nướng vàng ruộm trên than hồng. Ăn kèm là những ống cơm lam nếp rẫy dẻo thơm phức mùi ống tre nướng. Trong tiết trời se lạnh của buổi tối vùng cao, một nồi lẩu xuyên tiêu cay nồng bốc khói nghi ngút sẽ sưởi ấm mọi giác quan của bạn.',
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1000&q=80',
        imageCaption: 'Gà nướng tiêu rừng và ẩm thực nướng ngói đậm vị bazan Tây Nguyên'
      },
      {
        heading: 'Bỏ Phố Về Rừng: Nghỉ Ngơi Giữa Thiên Nhiên',
        content: 'Rời xa khói bụi và những bức tường bê tông, hệ thống homestay gỗ mộc mạc ẩn hiện dưới những rặng thông già tại Măng Đen mang lại trải nghiệm lưu trú vô cùng ấm cúng. Tại đây, bạn có thể thức giấc đón ánh bình minh len lỏi qua ô cửa kính, nhâm nhi một tách trà nóng ngoài ban công và lắng nghe tiếng chim hót véo von.',
        image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1000&q=80',
        imageCaption: 'Homestay gỗ mộc mạc bên triền đồi ngập tràn sương sớm'
      }
    ],
    gallery: [
      {
        url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
        title: 'Tách cà phê phin nguyên chất đượm vị núi rừng'
      },
      {
        url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
        title: 'Khu lưu trú cao cấp ẩn hiện giữa rặng thông'
      }
    ],
    ctaText: 'Tìm kiếm quán ăn ngon & Homestay lý tưởng',
    ctaLink: '/accommodation',
    ctaSub: 'Đặt chân đến Kon Tum, tham khảo ngay danh sách khách sạn chất lượng và quán ăn trứ danh.'
  }
};

export default function ArticleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const article = ARTICLES_DATA[id];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!article) {
    return (
      <div className="loading-screen">
        <div>
          <p style={{ marginBottom: '20px' }}>Bài viết không tồn tại!</p>
          <button onClick={() => navigate('/')}>Quay lại trang Khám phá</button>
        </div>
      </div>
    );
  }

  // Lấy danh sách bài viết khác để gợi ý đọc tiếp
  const otherArticles = Object.entries(ARTICLES_DATA)
    .filter(([key]) => key !== id)
    .map(([key, value]) => ({ id: key, ...value }));

  return (
    <div className="article-page-layout">
      {/* Nút quay lại góc trái phía trên */}
      <div className="article-back-nav">
        <Link to="/" className="back-explore-btn">
          ← Quay lại trang Khám phá
        </Link>
      </div>

      {/* Hero Banner ảnh bìa cực đại (Full Width & Visual Centric) */}
      <header 
        className="article-hero-banner" 
        style={{ backgroundImage: `url(${article.coverImage})` }}
      >
        <div className="article-hero-overlay">
          <div className="article-hero-title-box">
            <span className="article-tag">{article.category}</span>
            <h1>{article.title}</h1>
            <div className="article-meta-info">
              <span>✍️ {article.author}</span>
              <span>📅 {article.date}</span>
              <span>⏱️ {article.readTime}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Nội dung chính của bài viết */}
      <main className="article-main-container">
        <div className="article-content-wrapper">
          
          {/* Mở đầu / Lead Paragraph */}
          <p className="article-lead-text">{article.lead}</p>

          {/* Các section xen kẽ hình ảnh cực lớn */}
          {article.sections.map((section, idx) => (
            <section key={idx} className="article-section-block">
              {section.heading && <h2>{section.heading}</h2>}
              
              {/* Layout xen kẽ: Nếu idx chẵn thì ảnh bên phải, lẻ ảnh bên trái */}
              <div className={`article-grid-layout ${idx % 2 === 1 ? 'reverse' : ''}`}>
                <div className="article-text-col">
                  <p>{section.content}</p>
                </div>
                {section.image && (
                  <div className="article-img-col">
                    <div className="article-visual-wrapper">
                      <img src={section.image} alt={section.heading || 'Kon Tum image'} />
                      {section.imageCaption && (
                        <span className="visual-caption">{section.imageCaption}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          ))}

          {/* Bộ sưu tập lưới hình ảnh nghệ thuật (Photo Grid) */}
          <section className="article-gallery-section">
            <h2>Góc Nhìn Qua Ống Kính Lữ Hành</h2>
            <p className="gallery-intro">Những khoảnh khắc chân thực được ghi lại bởi các phượt thủ và du khách khi dừng chân ghé thăm mảnh đất này.</p>
            <div className="article-photo-grid">
              {article.gallery.map((item, idx) => (
                <div key={idx} className="gallery-item">
                  <img src={item.url} alt={item.title} />
                  <div className="gallery-hover-overlay">
                    <span>{item.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Khối Kêu Gọi Hành Động (CTA Box) nổi bật */}
          <section className="article-cta-box">
            <div className="cta-inner">
              <h3>Bạn muốn trực tiếp trải nghiệm điều này?</h3>
              <p>{article.ctaSub}</p>
              <Link to={article.ctaLink} className="cta-action-btn">
                {article.ctaText} →
              </Link>
            </div>
          </section>

        </div>
      </main>

      {/* Đọc tiếp các bài viết khác */}
      <section className="article-suggested-section">
        <div className="suggested-container">
          <h2>Bài Viết Gợi Ý Khác</h2>
          <div className="suggested-grid">
            {otherArticles.map((item) => (
              <Link 
                to={`/article/${item.id}`} 
                key={item.id} 
                className="suggested-card"
                style={{ backgroundImage: `url(${item.coverImage})` }}
              >
                <div className="suggested-card-overlay">
                  <span className="s-tag">{item.category}</span>
                  <h3>{item.title}</h3>
                  <span className="s-btn">Đọc bài viết →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
