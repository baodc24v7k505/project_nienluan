import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { UsersModule } from './users/users.module';
import { ShopsModule } from './shops/shops.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { AddressesModule } from './addresses/addresses.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { StatisticsModule } from './statistics/statistics.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatModule } from './chat/chat.module';
import { AdvertisementsModule } from './advertisements/advertisements.module';
import { MediaModule } from './media/media.module';
import { RateLimitGuard } from './common/guards/rate-limit.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ShopsModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    AddressesModule,
    PaymentsModule,
    ReviewsModule,
    StatisticsModule,
    VouchersModule,
    NotificationsModule,
    ChatModule,
    AdvertisementsModule,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: RateLimitGuard },
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
