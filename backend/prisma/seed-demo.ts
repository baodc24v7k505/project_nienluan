import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { slugify } from '../src/common/utils/slugify';
const db = new PrismaClient();
const catalogue = [
  {
    category: 'Điện tử',
    photo: 'photo-1498049794561-7780e7231661',
    base: 390000,
    names: [
      'Tai nghe Bluetooth Studio',
      'Bàn phím cơ Mini',
      'Chuột không dây Silent',
      'Loa Bluetooth Travel',
      'Sạc dự phòng 10000mAh',
      'Đèn bàn học LED',
      'Giá đỡ điện thoại',
      'Webcam Full HD',
      'Cáp sạc Type-C',
      'Đồng hồ thông minh Fit',
    ],
  },
  {
    category: 'Thời trang',
    photo: 'photo-1489987707025-afc232f7ea0f',
    base: 159000,
    names: [
      'Áo thun cotton trơn',
      'Áo sơ mi Oxford',
      'Quần jeans dáng suông',
      'Áo khoác gió Urban',
      'Váy midi thanh lịch',
      'Quần short thể thao',
      'Áo polo Classic',
      'Áo hoodie Basic',
      'Chân váy chữ A',
      'Bộ đồ mặc nhà',
    ],
  },
  {
    category: 'Gia dụng',
    photo: 'photo-1556911220-bff31c812dba',
    base: 249000,
    names: [
      'Bình giữ nhiệt Inox',
      'Hộp đựng thực phẩm',
      'Chảo chống dính',
      'Bộ dao nhà bếp',
      'Kệ gia vị gỗ',
      'Đèn ngủ để bàn',
      'Máy xay sinh tố',
      'Bộ khăn tắm cotton',
      'Gối tựa lưng',
      'Giỏ đựng đồ đa năng',
    ],
  },
  {
    category: 'Sách & Văn phòng phẩm',
    photo: 'photo-1507842217343-583bb7270b66',
    base: 69000,
    names: [
      'Sổ tay kế hoạch',
      'Bút gel học sinh',
      'Sách tư duy lập trình',
      'Sách kỹ năng giao tiếp',
      'Bộ bút màu sáng tạo',
      'Giấy ghi chú nhiều màu',
      'Hộp bút vải Canvas',
      'Bìa hồ sơ A4',
      'Lịch để bàn',
      'Bút chì mỹ thuật',
    ],
  },
  {
    category: 'Làm đẹp',
    photo: 'photo-1596462502278-27bfdc403348',
    base: 129000,
    names: [
      'Sữa rửa mặt dịu nhẹ',
      'Kem chống nắng hằng ngày',
      'Son dưỡng không màu',
      'Nước tẩy trang',
      'Bộ cọ trang điểm',
      'Mặt nạ dưỡng ẩm',
      'Kem dưỡng da tay',
      'Dầu gội thảo mộc',
      'Lược chải tóc',
      'Gương trang điểm',
    ],
  },
  {
    category: 'Thể thao',
    photo: 'photo-1517836357463-d25dfeac3438',
    base: 189000,
    names: [
      'Thảm tập Yoga',
      'Dây nhảy thể lực',
      'Bóng đá tập luyện',
      'Bình nước thể thao',
      'Găng tay tập gym',
      'Dây kháng lực',
      'Túi đựng đồ tập',
      'Kính bơi chống sương',
      'Vợt cầu lông',
      'Băng bảo vệ cổ tay',
    ],
  },
  {
    category: 'Mẹ & Bé',
    photo: 'photo-1519689680058-324335c77eba',
    base: 119000,
    names: [
      'Khăn sữa cotton',
      'Bình uống nước cho bé',
      'Bộ thìa ăn dặm',
      'Yếm chống thấm',
      'Gối ôm em bé',
      'Đồ chơi xếp vòng',
      'Túi đựng đồ cho bé',
      'Mũ cotton trẻ em',
      'Bộ quần áo sơ sinh',
      'Sách vải tương tác',
    ],
  },
  {
    category: 'Thực phẩm',
    photo: 'photo-1542838132-92c53300491e',
    base: 79000,
    names: [
      'Cà phê rang xay',
      'Trà xanh túi lọc',
      'Hạt điều rang',
      'Yến mạch nguyên hạt',
      'Mật ong hoa nhãn',
      'Bánh quy bơ',
      'Trái cây sấy',
      'Bột cacao nguyên chất',
      'Gạo thơm đóng túi',
      'Ngũ cốc dinh dưỡng',
    ],
  },
  {
    category: 'Phụ kiện',
    photo: 'photo-1553062407-98eeb64c6a62',
    base: 99000,
    names: [
      'Balo đi học Canvas',
      'Túi đeo chéo Mini',
      'Ví da nhỏ gọn',
      'Mũ lưỡi trai',
      'Thắt lưng Classic',
      'Kính mát Urban',
      'Túi vải tái sử dụng',
      'Móc khóa kim loại',
      'Dây đeo đồng hồ',
      'Ô gấp du lịch',
    ],
  },
  {
    category: 'Đồ chơi',
    photo: 'photo-1558060370-d644479cb6f7',
    base: 89000,
    names: [
      'Bộ xếp hình sáng tạo',
      'Xe đồ chơi mô hình',
      'Thú bông gấu nhỏ',
      'Bộ cờ trí tuệ',
      'Đất nặn nhiều màu',
      'Bộ tranh tô màu',
      'Rubik tốc độ',
      'Bộ lắp ráp robot',
      'Đồ chơi câu cá',
      'Bộ thẻ học chữ',
    ],
  },
];
async function main() {
  const hash = await bcrypt.hash('password123', 10);
  const shops: { id: string }[] = [];
  for (const [idx, name] of [
    'Tech & Home',
    'Phong cách Việt',
    'Sống Khỏe Store',
    'Góc Học Tập',
    'Gia Đình Shop',
  ].entries()) {
    const owner = await db.user.upsert({
      where: { email: `seller${idx + 1}@ecom.local` },
      update: {},
      create: {
        email: `seller${idx + 1}@ecom.local`,
        fullName: `Người bán demo ${idx + 1}`,
        passwordHash: hash,
        role: 'SELLER',
      },
    });
    shops.push(
      await db.shop.upsert({
        where: { ownerId: owner.id },
        update: {},
        create: {
          ownerId: owner.id,
          name,
          description: 'Gian hàng dữ liệu mẫu phục vụ kiểm thử tiểu luận',
          address: 'TP. Hồ Chí Minh',
          status: 'APPROVED',
        },
      }),
    );
  }
  for (const item of catalogue)
    await db.category.upsert({
      where: { slug: slugify(item.category) },
      update: {},
      create: { slug: slugify(item.category), name: item.category },
    });
  const categories = await db.category.findMany({ orderBy: { name: 'asc' } });
  let created = 0;
  for (const [ci, category] of categories.entries()) {
    const source = catalogue.find((c) => slugify(c.category) === category.slug);
    for (let i = 0; i < 10; i++) {
      const slug = `demo-${category.slug}-${i + 1}`;
      if (await db.product.findUnique({ where: { slug } })) continue;
      const name =
        source?.names[i] ?? `${category.name} - Sản phẩm mẫu ${i + 1}`;
      const price = (source?.base ?? 99000) + i * 20000;
      const labels =
        category.slug === 'thoi-trang'
          ? ['Size M', 'Size L', 'Size XL']
          : ['Tiêu chuẩn', 'Nâng cấp', 'Phiên bản đặc biệt'];
      const variants = labels.map((label, vi) => ({
        sku: `DEMO-${ci + 1}-${i + 1}-${vi + 1}`,
        name: label,
        price: price + vi * 20000,
        stock: i === 9 ? 0 : i === 8 ? (vi === 0 ? 1 : 0) : 8 + i * 3 + vi,
      }));
      await db.product.create({
        data: {
          slug,
          name,
          description: `${name}. Sản phẩm dữ liệu mẫu phục vụ kiểm thử chức năng, giá và thông số chỉ mang tính minh họa. Có nhiều phân loại để thử giỏ hàng, thanh toán, tồn kho và đổi trả.`,
          shopId: shops[(ci + i) % shops.length].id,
          categoryId: category.id,
          price,
          stock: variants.reduce((s, v) => s + v.stock, 0),
          status: 'ACTIVE',
          variants: { create: variants },
          images: {
            create: {
              url: `https://images.unsplash.com/${source?.photo ?? 'photo-1498049794561-7780e7231661'}?auto=format&fit=crop&w=640&q=75`,
              sortOrder: 0,
            },
          },
        },
      });
      created++;
    }
  }
  const now = new Date();
  const customer = await db.user.findUnique({
    where: { email: 'customer@ecom.local' },
  });
  if (
    customer &&
    !(await db.address.findFirst({ where: { userId: customer.id } }))
  )
    await db.address.create({
      data: {
        userId: customer.id,
        recipientName: 'Khách hàng mẫu',
        phone: '0901234567',
        line: '123 Đường Demo, Phường Ninh Kiều',
        city: 'Cần Thơ',
        isDefault: true,
      },
    });
  await db.voucher.upsert({
    where: { code: 'TIEULUAN10' },
    update: {},
    create: {
      code: 'TIEULUAN10',
      scope: 'PLATFORM',
      discountType: 'PERCENT',
      discountValue: 10,
      maxDiscountAmount: 100000,
      minOrderAmount: 100000,
      usageLimit: 1000,
      perUserLimit: 20,
      startAt: new Date(now.getTime() - 86400000),
      endAt: new Date(now.getTime() + 365 * 86400000),
    },
  });
  console.log(
    `Đã thêm ${created} sản phẩm; mỗi danh mục có 10 sản phẩm demo, mỗi sản phẩm 3 SKU. Chạy lại không tạo trùng hoặc ghi đè dữ liệu đã sửa.`,
  );
  console.log(
    'Shop demo: seller1@ecom.local đến seller5@ecom.local / password123. Voucher: TIEULUAN10.',
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
