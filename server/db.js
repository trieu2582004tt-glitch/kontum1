import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'database.sqlite');

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export async function initDb() {
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      district TEXT,
      commune TEXT,
      category TEXT NOT NULL,
      description TEXT,
      priceRange TEXT,
      latitude REAL,
      longitude REAL,
      imageUrl TEXT,
      type TEXT DEFAULT 'food',
      is_sponsored INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      status TEXT DEFAULT 'approved',
      submitter_name TEXT,
      mapUrl TEXT,
      address TEXT
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY,
      restaurant_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS confessions (
      id INTEGER PRIMARY KEY,
      title TEXT,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      likes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      hashtags TEXT,
      restaurant_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS confession_comments (
      id INTEGER PRIMARY KEY,
      confession_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      comment TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (confession_id) REFERENCES confessions(id) ON DELETE CASCADE
    );
  `);

  // Ensure legacy DBs get new columns if missing
  const info = await db.all("PRAGMA table_info('restaurants')");
  const cols = info.map((c) => c.name);
  if (!cols.includes('district')) {
    await db.exec("ALTER TABLE restaurants ADD COLUMN district TEXT");
  }
  if (!cols.includes('commune')) {
    await db.exec("ALTER TABLE restaurants ADD COLUMN commune TEXT");
  }
  if (!cols.includes('imageUrl')) {
    await db.exec("ALTER TABLE restaurants ADD COLUMN imageUrl TEXT");
  }
  if (!cols.includes('type')) {
    await db.exec("ALTER TABLE restaurants ADD COLUMN type TEXT DEFAULT 'food'");
  }
  if (!cols.includes('is_sponsored')) {
    await db.exec("ALTER TABLE restaurants ADD COLUMN is_sponsored INTEGER DEFAULT 0");
  }
  if (!cols.includes('views')) {
    await db.exec("ALTER TABLE restaurants ADD COLUMN views INTEGER DEFAULT 0");
  }
  if (!cols.includes('status')) {
    await db.exec("ALTER TABLE restaurants ADD COLUMN status TEXT DEFAULT 'approved'");
  }
  if (!cols.includes('submitter_name')) {
    await db.exec("ALTER TABLE restaurants ADD COLUMN submitter_name TEXT");
  }
  if (!cols.includes('mapUrl')) {
    await db.exec("ALTER TABLE restaurants ADD COLUMN mapUrl TEXT");
  }
  if (!cols.includes('address')) {
    await db.exec("ALTER TABLE restaurants ADD COLUMN address TEXT");
  }
  // Ensure all existing approved records have status set
  await db.exec("UPDATE restaurants SET status = 'approved' WHERE status IS NULL");

  // Ensure confessions table has hashtags column
  const confInfo = await db.all("PRAGMA table_info('confessions')");
  const confCols = confInfo.map((c) => c.name);
  if (!confCols.includes('hashtags')) {
    await db.exec("ALTER TABLE confessions ADD COLUMN hashtags TEXT");
  }
  if (!confCols.includes('restaurant_id')) {
    await db.exec("ALTER TABLE confessions ADD COLUMN restaurant_id INTEGER");
  }

  // Add images column to checkins if missing
  const checkinInfo = await db.all("PRAGMA table_info('checkins')");
  const checkinCols = checkinInfo.map((c) => c.name);
  if (!checkinCols.includes('images')) {
    await db.exec("ALTER TABLE checkins ADD COLUMN images TEXT DEFAULT NULL");
  }

  // Update legacy Kon Plông records to Kon Plông (Măng Đen)
  await db.exec("UPDATE restaurants SET district = 'Kon Plông (Măng Đen)' WHERE district = 'Kon Plông'");

  // Randomize view counts for existing locations that have 0 or NULL views
  await db.exec("UPDATE restaurants SET views = ABS(RANDOM() % 900) + 100 WHERE views = 0 OR views IS NULL");

  const restaurantsCount = await db.get('SELECT COUNT(*) AS count FROM restaurants');
  // If count is less than 10, let's re-seed to get all the new hotels and tourist spots
  if (restaurantsCount.count < 10) {
    await db.exec('DELETE FROM restaurants');
    await seedLocations(db);
  }

  const usersCount = await db.get('SELECT COUNT(*) AS count FROM users');
  if (usersCount.count === 0) {
    const adminPassword = createPasswordHash('admin123');
    await db.run(
      'INSERT INTO users (username, password_hash, password_salt, is_admin) VALUES (?, ?, ?, ?)',
      'admin',
      adminPassword.hash,
      adminPassword.salt,
      1
    );
  }

  const confessionsCount = await db.get('SELECT COUNT(*) AS count FROM confessions');
  if (confessionsCount.count <= 3) {
    await db.exec('DELETE FROM confessions');
    await db.exec('DELETE FROM confession_comments');
    await seedConfessions(db);
  }

  return db;
}

async function seedLocations(db) {
  const locations = [
    // --- ĐỊA ĐIỂM DU LỊCH ('attraction') ---
    {
      name: 'Nhà thờ Chánh tòa Kon Tum (Nhà thờ Gỗ)',
      city: 'TP Kon Tum',
      district: 'TP Kon Tum',
      commune: 'Thống Nhất',
      category: 'Văn hóa & Lịch sử',
      description: 'Nhà thờ bằng gỗ độc nhất vô nhị được thiết kế theo kiến trúc Roman kết hợp với nhà rông Ba Na truyền thống, hoàn thành vào năm 1913.',
      priceRange: 'Miễn phí',
      latitude: 14.3482,
      longitude: 108.0069,
      imageUrl: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80',
      type: 'attraction'
    },
    {
      name: 'Cầu treo Kon Klor',
      city: 'TP Kon Tum',
      district: 'TP Kon Tum',
      commune: 'Thắng Lợi',
      category: 'Điểm check-in',
      description: 'Cầu treo dây văng lớn nhất khu vực Tây Nguyên, nối liền hai bờ sông Đăk Bla huyền thoại và dẫn lối vào làng văn hóa truyền thống Kon Klor.',
      priceRange: 'Miễn phí',
      latitude: 14.3541,
      longitude: 108.0264,
      imageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80',
      type: 'attraction'
    },
    {
      name: 'Khu du lịch sinh thái Thác Pa Sỹ',
      city: 'Măng Đen',
      district: 'Kon Plông (Măng Đen)',
      commune: 'Măng Đen',
      category: 'Thiên nhiên',
      description: 'Thác nước Pa Sỹ đẹp hoang sơ tựa như nàng thơ của đại ngàn, được hình thành từ 3 ngọn suối lớn nhất ở vùng đất Măng Đen huyền bí.',
      priceRange: '20k - 50k',
      latitude: 14.4310,
      longitude: 107.7240,
      imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80',
      type: 'attraction'
    },
    {
      name: 'Khu du lịch Hồ Đắk Ke',
      city: 'Măng Đen',
      district: 'Kon Plông (Măng Đen)',
      commune: 'Măng Đen',
      category: 'Hồ & Công viên',
      description: 'Hồ nước tự nhiên trong xanh nằm ẩn mình giữa đồi thông thơ mộng, nơi du khách có thể đạp vịt, chèo thuyền và ngắm hoa mai anh đào nở rộ.',
      priceRange: 'Miễn phí',
      latitude: 14.4095,
      longitude: 107.7550,
      imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80',
      type: 'attraction'
    },

    // --- ĐẶC SẢN & ĂN UỐNG ('food') ---
    {
      name: 'Quán cơm gà Linh',
      city: 'TP Kon Tum',
      district: 'TP Kon Tum',
      commune: 'Thắng Lợi',
      category: 'Cơm gà',
      description: 'Nổi tiếng với món cơm gà ta dai ngon, da vàng giòn rụm ăn cùng chén nước súp lòng gà nóng hổi, đậm đà hương vị gia đình.',
      priceRange: '50k - 90k',
      latitude: 14.3581,
      longitude: 107.9788,
      imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3e73ae83b?auto=format&fit=crop&w=600&q=80',
      type: 'food'
    },
    {
      name: 'Măng Đen Grill & BBQ',
      city: 'Măng Đen',
      district: 'Kon Plông (Măng Đen)',
      commune: 'Măng Đen',
      category: 'Nướng & lẩu',
      description: 'Chuyên đặc sản gà nướng tiêu rừng thơm lừng đặc trưng Tây Nguyên, ăn kèm ống cơm lam dẻo thơm nướng ống tre rừng.',
      priceRange: '100k - 180k',
      latitude: 14.4060,
      longitude: 107.7495,
      imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
      type: 'food',
      is_sponsored: 1
    },
    {
      name: 'Quán bún đỏ Kon Tum',
      city: 'TP Kon Tum',
      district: 'TP Kon Tum',
      commune: 'Quang Trung',
      category: 'Bún đặc sản',
      description: 'Bát bún đỏ trứ danh của TP. Kon Tum với sợi bún to nhuộm hạt điều đỏ, chan nước dùng cua đồng sánh ngọt cùng chả viên và trứng cút.',
      priceRange: '30k - 60k',
      latitude: 14.3564,
      longitude: 107.9772,
      imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
      type: 'food'
    },
    {
      name: 'Cà phê & Trà Gió Thông Măng Đen',
      city: 'Măng Đen',
      district: 'Kon Plông (Măng Đen)',
      commune: 'Đăk Long',
      category: 'Cà phê & đồ uống',
      description: 'Không gian cà phê nhà gỗ mộc mạc bên rừng thông lộng gió, thích hợp ngắm hoàng hôn rực rỡ và thưởng thức cà phê phin nguyên chất thơm nồng.',
      priceRange: '30k - 70k',
      latitude: 14.4068,
      longitude: 107.7520,
      imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
      type: 'food',
      is_sponsored: 1
    },

    // --- KHÁCH SẠN / HOMESTAY ('hotel') ---
    {
      name: 'Golden Boutique Hotel Măng Đen',
      city: 'Măng Đen',
      district: 'Kon Plông (Măng Đen)',
      commune: 'Măng Đen',
      category: 'Khách sạn 4 sao',
      description: 'Tòa khách sạn phong cách Châu Âu sang trọng ẩn mình giữa đồi thông xanh ngắt. Có hồ bơi nước ấm ngoài trời và phục vụ đồ Âu - Á thượng hạng.',
      priceRange: '1.2M - 2.5M',
      latitude: 14.4045,
      longitude: 107.7512,
      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
      type: 'hotel',
      is_sponsored: 1
    },
    {
      name: 'Sóc\'s House Homestay Măng Đen',
      city: 'Măng Đen',
      district: 'Kon Plông (Măng Đen)',
      commune: 'Đăk Long',
      category: 'Homestay gỗ mộc',
      description: 'Khu homestay nhà sàn gỗ mang đậm nét phong trần rừng núi. Có sân vườn rộng để tổ chức lửa trại, tiệc nướng BBQ ngoài trời đầy ấm cúng.',
      priceRange: '300k - 600k',
      latitude: 14.4072,
      longitude: 107.7538,
      imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80',
      type: 'hotel'
    },
    {
      name: 'Khách sạn Indochine Kon Tum',
      city: 'TP Kon Tum',
      district: 'TP Kon Tum',
      commune: 'Quyết Thắng',
      category: 'Khách sạn 3 sao',
      description: 'Vị trí tuyệt vời nằm ngay sát bờ sông Đăk Bla, nổi tiếng với công trình Indochine Cafe bằng tre độc đáo đạt nhiều giải thưởng quốc tế.',
      priceRange: '600k - 1.2M',
      latitude: 14.3490,
      longitude: 108.0125,
      imageUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=600&q=80',
      type: 'hotel'
    },
    {
      name: 'Rosy Homestay & Farm',
      city: 'Măng Đen',
      district: 'Kon Plông (Măng Đen)',
      commune: 'Măng Đen',
      category: 'Homestay săn mây',
      description: 'Nằm bên triền đồi ngập tràn hoa hồng rực rỡ, địa điểm lý tưởng để sớm thức giấc săn mây bồng bềnh và thư giãn trong tiết trời se lạnh.',
      priceRange: '400k - 850k',
      latitude: 14.4055,
      longitude: 107.7480,
      imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80',
      type: 'hotel',
      is_sponsored: 1
    }
  ];

  const statement = await db.prepare(
    'INSERT INTO restaurants (name, city, district, commune, category, description, priceRange, latitude, longitude, imageUrl, type, is_sponsored, views, mapUrl, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  for (const item of locations) {
    const randomViews = Math.floor(Math.random() * 900) + 100;
    await statement.run(
      item.name,
      item.city,
      item.district || null,
      item.commune || null,
      item.category,
      item.description,
      item.priceRange,
      item.latitude,
      item.longitude,
      item.imageUrl || null,
      item.type,
      item.is_sponsored || 0,
      randomViews,
      item.mapUrl || null,
      item.address || null
    );
  }

  await statement.finalize();
}

async function seedConfessions(db) {
  const confessions = [
    {
      title: 'Nhớ Măng Đen mùa sương mờ',
      content: 'Có ai từng đi Măng Đen vào những ngày tháng 12 không? Cái se lạnh của cao nguyên, đi dạo quanh hồ Đắk Ke dưới làn sương mỏng, ăn một bát lẩu xuyên tiêu cay nồng thực sự rất nhớ. Nhất là cảm giác đi cùng một người đặc biệt mà giờ đây người ấy đã ở xa...',
      category: 'Tâm sự',
      status: 'approved',
      likes: 12,
      hashtags: 'mang-den,tuyet-voi,ho-dak-ke',
      restaurant_id: 4
    },
    {
      title: 'Tìm bạn học chung trường chuyên Nguyễn Tất Thành',
      content: 'Chào mọi người, mình muốn tìm một bạn nữ hay mặc áo khoác đỏ, đi xe đạp điện màu trắng thường hay đứng đợi bạn ở cổng trường chuyên Nguyễn Tất Thành lúc 5h chiều. Mình muốn làm quen nhưng ngại quá. Ai biết bạn ấy nhắn mình nha!',
      category: 'Học đường',
      status: 'approved',
      likes: 8,
      hashtags: 'nguyen-tat-thanh,tim-ban,chuyen-tinh'
    },
    {
      title: 'Đặc sản gà nướng cơm lam ngon xuất sắc',
      content: 'Hôm nay mình vừa có trải nghiệm tuyệt vời tại Măng Đen. Đồ ăn siêu ngon, gà nướng da giòn sần sật thơm mùi lá tiêu rừng, cơm lam dẻo ngọt. Đúng là ẩm thực Tây Nguyên không bao giờ làm mình thất vọng!',
      category: 'Ẩm thực',
      status: 'approved',
      likes: 15,
      hashtags: 'am-thuc,mang-den,ga-nuong',
      restaurant_id: 6
    },
    {
      title: 'Bí ẩn trà sữa matcha cổng trường',
      content: 'Cảnh báo cho các bạn nữ ở THPT Kon Tum! Gần đây có một anh khóa trên lớp 12 chuyên Lý thường xuyên mua trà sữa matcha trân châu hoàng kim treo ở xe của các bạn nữ dễ thương kèm lời nhắn "Chúc buổi chiều vui vẻ". Nghe thì ngọt ngào đúng không? Nhưng hôm qua mình phát hiện ra anh này treo một lúc 4 xe của 4 bạn khác nhau ở 4 lớp! Cao thủ không bằng tranh thủ, bớt thả thính đi anh ơi!',
      category: 'Học đường',
      status: 'approved',
      likes: 42,
      hashtags: 'thpt-kon-tum,tra-sua,gossip,matcha'
    },
    {
      title: 'Drama check-in ở homestay Măng Đen',
      content: 'Drama nóng hổi từ một homestay khá nổi tiếng ở Măng Đen cuối tuần qua. Một cặp đôi lên đây nghỉ dưỡng săn mây cực kỳ lãng mạn. Nhưng đến tối, lúc anh người yêu đi mua gà nướng tiêu rừng thì chị người yêu ở phòng lại bị phát hiện đang nhắn tin "thương thương" với chính anh chủ homestay! Anh người yêu về bắt quả tang tại trận, cãi nhau om sòm cả khu rừng thông. Cuối cùng anh người yêu bỏ về giữa đêm dưới trời mưa 12 độ. Đúng là sương mù Măng Đen không lạnh bằng lòng người!',
      category: 'Góc khuất',
      status: 'approved',
      likes: 89,
      hashtags: 'mang-den,homestay,drama,be-lai',
      restaurant_id: 12
    },
    {
      title: 'Lời thú tội ngọt ngào trên cầu Kon Klor',
      content: 'Gửi anh chàng chụp ảnh dạo trên cầu treo Kon Klor chiều chủ nhật tuần trước. Anh mặc áo sơ mi trắng, cầm máy ảnh Sony. Anh có chụp hộ nhóm tụi em vài tấm ảnh và có xin Instagram của em. Lúc đó vì ngại trước mặt đám bạn nên em đưa đại một cái nick clone. Giờ em hối hận quá, hình anh chụp siêu đẹp mà em thì lỡ mất cơ hội bắt chuyện với anh rồi. Nếu anh đọc được confession này thì cho em xin lại liên lạc nha, em hứa sẽ dẫn anh đi ăn bún đỏ xịn nhất Kon Tum!',
      category: 'Tâm sự',
      status: 'approved',
      likes: 27,
      hashtags: 'kon-klor,tinh-yeu,cau-treo',
      restaurant_id: 2
    },
    {
      title: 'Gia đình bất hòa vì quả sâm Ngọc Linh',
      content: 'Nhà mình vừa có một phen dở khóc dở cười. Bố mình chắt chiu mua được củ sâm Ngọc Linh chuẩn Kon Tum trị giá cả chục triệu để ngâm rượu quý dành tiếp khách. Bố nâng niu như báu vật. Thế mà hôm qua mẹ mình tưởng củ sâm đó là củ gừng già bình thường nên đã lôi ra... giã nướng cùng thịt gà kho! Bố về thấy hũ rượu trống trơn, nhìn nồi thịt gà kho sâm Ngọc Linh mà khóc không ra nước mắt. Cả nhà ăn bữa cơm mà không ai dám cười, thịt gà đắt đỏ nhất lịch sử luôn!',
      category: 'Đời sống',
      status: 'approved',
      likes: 56,
      hashtags: 'sam-ngoc-linh,doi-song,hai-huoc'
    }
  ];

  const statement = await db.prepare(
    'INSERT INTO confessions (title, content, category, status, likes, hashtags, restaurant_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  for (const item of confessions) {
    await statement.run(
      item.title,
      item.content,
      item.category,
      item.status,
      item.likes,
      item.hashtags || null,
      item.restaurant_id || null
    );
  }

  await statement.finalize();
}
