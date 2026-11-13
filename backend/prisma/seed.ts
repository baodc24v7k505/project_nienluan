import { PrismaClient, Role, ShopStatus, ProductStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecom.local' },
    update: {},
    create: {
      email: 'admin@ecom.local',
      passwordHash,
      fullName: 'Quản trị viên',
      role: Role.ADMIN,
    },
  });

  const seller = await prisma.user.upsert({
    where: { email: 'seller@ecom.local' },
    update: {},
    create: {
      email: 'seller@ecom.local',
      passwordHash,
      fullName: 'Người bán mẫu',
      role: Role.SELLER,
    },
  });

  await prisma.user.upsert({
    where: { email: 'customer@ecom.local' },
    update: {},
    create: {
      email: 'customer@ecom.local',
      passwordHash,
      fullName: 'Khách hàng mẫu',
      role: Role.CUSTOMER,
    },
  });

  const electronics = await prisma.category.upsert({
    where: { slug: 'dien-tu' },
    update: {},
    create: { name: 'Điện tử', slug: 'dien-tu' },
  });

  const fashion = await prisma.category.upsert({
    where: { slug: 'thoi-trang' },
    update: {},
    create: { name: 'Thời trang', slug: 'thoi-trang' },
  });

  const shop = await prisma.shop.upsert({
    where: { ownerId: seller.id },
    update: {},
    create: {
      ownerId: seller.id,
      name: 'Shop Mẫu',
      description: 'Gian hàng demo cho niên luận',
      address: '123 Đường ABC, Quận 1, TP.HCM',
      status: ShopStatus.APPROVED,
    },
  });

  await prisma.product.upsert({
    where: { slug: 'tai-nghe-bluetooth-x1' },
    update: {},
    create: {
      shopId: shop.id,
      categoryId: electronics.id,
      name: 'Tai nghe Bluetooth X1',
      slug: 'tai-nghe-bluetooth-x1',
      description: 'Tai nghe không dây chống ồn, pin 20 giờ.',
      price: 590000,
      stock: 50,
      status: ProductStatus.ACTIVE,
      images: {
        create: [
          {
            url: 'https://placehold.co/600x400?text=Tai+Nghe+X1',
            sortOrder: 0,
          },
        ],
      },
    },
  });

  await prisma.product.upsert({
    where: { slug: 'ao-thun-basic' },
    update: {},
    create: {
      shopId: shop.id,
      categoryId: fashion.id,
      name: 'Áo thun Basic',
      slug: 'ao-thun-basic',
      description: 'Áo thun cotton 100%, nhiều màu.',
      price: 149000,
      stock: 200,
      status: ProductStatus.ACTIVE,
      images: {
        create: [
          { url: 'https://placehold.co/600x400?text=Ao+Thun', sortOrder: 0 },
        ],
      },
    },
  });

  for (const product of await prisma.product.findMany({
    where: { variants: { none: {} } },
  })) {
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: 'DEFAULT',
        name: 'Mặc định',
        price: product.price,
        stock: product.stock,
      },
    });
  }
  console.log('Seed hoàn tất:');
  console.log('  Admin:    admin@ecom.local / password123');
  console.log('  Seller:   seller@ecom.local / password123');
  console.log('  Customer: customer@ecom.local / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
