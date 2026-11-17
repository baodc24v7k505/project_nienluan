# Sàn thương mại điện tử (Niên luận)

> Bản nâng cấp tiểu luận ngày 13/11/2026: xem [chức năng và dữ liệu demo](docs/PHIEN_BAN_TIEU_LUAN.md) cùng [hướng dẫn kiểm thử/redeploy](docs/KIEM_THU_VA_TRIEN_KHAI.md). Các mô tả bên dưới là hướng dẫn của bản niên luận; ưu tiên hai tài liệu mới khi có khác biệt.

Hệ thống thương mại điện tử phong cách Shopee với 3 vai trò:

- **Khách hàng**: tìm kiếm, mua hàng, thanh toán trực tuyến, chat với shop/hỗ trợ, nhận thông báo real-time
- **Người bán**: quản lý sản phẩm, đơn hàng, doanh thu, voucher khuyến mãi, quảng cáo banner
- **Quản trị viên**: quản lý người dùng, nhân viên, shop, sản phẩm, đơn hàng, voucher, quảng cáo và thống kê báo cáo hoạt động toàn hệ thống

---

## 1. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Backend | Node.js + [NestJS](https://nestjs.com/) 11 (TypeScript) |
| ORM / Database | [Prisma](https://www.prisma.io/) 6.x + PostgreSQL |
| Xác thực | JWT access token (15 phút) + refresh token (7 ngày, xoay vòng, lưu qua HttpOnly cookie) |
| Real-time | Socket.IO (chat mua-bán/mua-admin, thông báo đẩy trong app) |
| Frontend | React 19 (Vite) + TypeScript + Tailwind CSS v4 (giao diện phong cách Shopee) |
| Quản lý dữ liệu server (frontend) | TanStack Query (React Query) |
| Form & validate (frontend) | React Hook Form + Zod |
| State auth (frontend) | Zustand |
| Thanh toán | Ví MoMo (test/sandbox công khai) + COD (thanh toán khi nhận hàng) |

---

## 2. Cấu trúc thư mục

```
Project/
├── README.md                    ← file này
├── backend/                     NestJS API — chạy tại http://localhost:3000/api
│   ├── prisma/
│   │   ├── schema.prisma        Toàn bộ model dữ liệu
│   │   ├── migrations/          Lịch sử migration SQL
│   │   └── seed.ts              Script tạo dữ liệu mẫu
│   ├── src/
│   │   ├── auth/                 Đăng ký/đăng nhập/refresh token, JWT strategy
│   │   ├── users/                 Admin quản lý người dùng & nhân viên
│   │   ├── shops/                  Seller đăng ký shop, Admin duyệt shop
│   │   ├── categories/            Danh mục sản phẩm
│   │   ├── products/               Sản phẩm (public/seller/admin)
│   │   ├── cart/                   Giỏ hàng
│   │   ├── addresses/               Địa chỉ giao hàng
│   │   ├── orders/                  Đơn hàng (checkout, seller xử lý, hủy đơn có lý do, admin xem)
│   │   ├── payments/                 Thanh toán MoMo sandbox + COD
│   │   ├── vouchers/                  Voucher/khuyến mãi (platform & shop), áp dụng khi checkout
│   │   ├── advertisements/             Quảng cáo banner: seller gửi, admin duyệt
│   │   ├── chat/                       Chat mua-bán & mua-admin (REST lịch sử + realtime)
│   │   ├── notifications/               Trung tâm thông báo (DB + đẩy qua socket)
│   │   ├── realtime/                     WebSocket gateway dùng chung cho chat & thông báo
│   │   ├── reviews/                       Đánh giá sản phẩm
│   │   ├── statistics/                     Thống kê doanh thu/báo cáo (theo khoảng ngày tuỳ chỉnh)
│   │   ├── common/                         Guard, decorator, filter dùng chung
│   │   └── prisma/                          PrismaService (kết nối database)
│   └── .env                      Biến môi trường (đã cấu hình sẵn)
└── frontend/                    React SPA (Vite) — chạy tại http://localhost:5173
    └── src/
        ├── pages/
        │   ├── auth/             Đăng nhập / Đăng ký
        │   ├── customer/         Trang chủ, sản phẩm, giỏ hàng, checkout, đơn hàng + chi tiết/hủy đơn
        │   ├── seller/            Shop, sản phẩm, đơn hàng, voucher, quảng cáo, thống kê, tin nhắn
        │   ├── admin/             Người dùng, nhân viên, shop, danh mục, sản phẩm, đơn hàng, voucher,
        │   │                      quảng cáo, thống kê, hỗ trợ (chat)
        │   └── chat/              Trang chat dùng chung cho cả 3 vai trò
        ├── layouts/               RootLayout (header Shopee-style + bottom nav mobile), SellerLayout, AdminLayout
        ├── auth/                  RequireAuth (route guard), AuthBootstrap (khôi phục phiên đăng nhập)
        ├── realtime/              Socket.IO client singleton + hook kết nối theo phiên đăng nhập
        ├── api/                    Các hàm gọi API (axios)
        ├── store/                  Zustand store (thông tin đăng nhập)
        └── components/            Component dùng chung (StatTile, Pagination, NotificationBell,
                                    CancelReasonModal, VoucherManager, AdBanner, biểu đồ...)
```

---

## 3. Yêu cầu hệ thống

- **Node.js 20+** và npm (kiểm tra: `node -v`, `npm -v`)
- **PostgreSQL** đang chạy — máy hiện tại đã cài sẵn PostgreSQL 18 chạy như Windows Service, không cần cài Docker
- (Tuỳ chọn) **pgAdmin4** để xem database bằng giao diện

---

## 4. Cài đặt lần đầu (bỏ qua nếu đã làm rồi)

> ⚠️ Trên máy hiện tại, các bước dưới đây **đã được thực hiện sẵn**: database đã tạo, đã cài `node_modules`, đã chạy migration và seed dữ liệu mẫu. Phần này dành cho trường hợp bạn cài lại từ đầu trên máy khác.

### 4.1. Tạo database PostgreSQL

```sql
CREATE ROLE ecom LOGIN PASSWORD 'ecom_dev_password' CREATEDB;
CREATE DATABASE ecom_db OWNER ecom;
```

- `CREATEDB` là bắt buộc vì Prisma cần tạo "shadow database" tạm thời khi chạy migration.
- Nếu database `ecom_db` đã có sẵn thì bỏ qua bước này.

### 4.2. Cài đặt Backend

```bash
cd backend
npm install
npx prisma migrate dev      # tạo toàn bộ bảng theo prisma/schema.prisma
npx prisma db seed          # tạo tài khoản admin/seller/customer mẫu + sản phẩm mẫu
```

### 4.3. Cài đặt Frontend

```bash
cd frontend
npm install
```

---

## 5. Chạy ứng dụng (mỗi lần muốn chạy demo)

Mở **2 cửa sổ terminal** riêng biệt:

**Terminal 1 — Backend:**
```bash
cd backend
npm run start:dev
```
→ API + WebSocket cùng chạy tại `http://localhost:3000` (REST dưới prefix `/api`).

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
→ Giao diện chạy tại `http://localhost:5173`.

> Sửa code sẽ tự động tải lại. Nếu sửa `prisma/schema.prisma`, cần dừng backend trước khi chạy `npx prisma migrate dev` (tránh lỗi khoá file query engine trên Windows), rồi khởi động lại.

---

## 6. Tài khoản mẫu (đã tạo sẵn từ bước seed)

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị viên | `admin@ecom.local` | `password123` |
| Người bán | `seller@ecom.local` | `password123` |
| Khách hàng | `customer@ecom.local` | `password123` |

Người bán mẫu đã có sẵn 1 shop được duyệt (`APPROVED`) và sản phẩm mẫu.

---

## 7. Giải thích các biến môi trường (`backend/.env`)

| Biến | Ý nghĩa |
|---|---|
| `DATABASE_URL` | Chuỗi kết nối tới PostgreSQL |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Khoá bí mật ký token — **đổi giá trị thật khi triển khai production**. Cũng dùng để xác thực kết nối WebSocket (chat/thông báo) |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Thời hạn token (mặc định `15m` / `7d`) |
| `PORT` | Cổng chạy backend, đồng thời là cổng WebSocket (mặc định `3000`) |
| `FRONTEND_URL` | Địa chỉ frontend — dùng cho CORS (REST và WebSocket) |
| `MOMO_*` | Thông tin test/sandbox công khai của MoMo — dùng để demo luồng thanh toán |

File `frontend/.env`:
```
VITE_API_URL=http://localhost:3000/api
```

---

## 8. Luồng nghiệp vụ chính

1. **Đăng ký/Đăng nhập**
   - Khách hàng và Người bán tự đăng ký tại `/register`
   - Tài khoản Admin/Nhân viên (Staff) chỉ được tạo bởi Admin tại `/admin/staff`

2. **Người bán**
   - Đăng ký shop → Admin duyệt tại `/admin/shops` → đăng sản phẩm tại `/seller/products`
   - Tạo voucher giảm giá riêng của shop tại `/seller/vouchers`
   - Gửi banner quảng cáo tại `/seller/ads` → chờ Admin duyệt → hiển thị ở trang chủ
   - Quản lý đơn hàng tại `/seller/orders`: `PENDING → CONFIRMED → SHIPPING → DELIVERED`, hoặc hủy kèm lý do (hoàn kho tự động)
   - Chat trực tiếp với khách hàng tại `/seller/chat`
   - Xem thống kê doanh thu, doanh thu theo danh mục, hiệu quả voucher tại `/seller/statistics`

3. **Khách hàng**
   - Duyệt/tìm sản phẩm → giỏ hàng → `/checkout`: chọn địa chỉ, nhập mã giảm giá (nếu có), chọn COD hoặc MoMo
   - Chat với shop ngay từ trang sản phẩm, hoặc chat với hỗ trợ sàn tại `/chat`
   - Xem chi tiết đơn hàng tại `/orders/:id`, có thể **hủy đơn kèm lý do** khi đơn chưa giao
   - Sau khi đơn `DELIVERED`, đánh giá sản phẩm tại `/orders`
   - Nhận thông báo real-time (đổi trạng thái đơn, tin nhắn mới...) qua chuông thông báo trên header

4. **Admin**
   - Quản lý người dùng/nhân viên, duyệt/từ chối shop, kiểm duyệt sản phẩm
   - Tạo voucher toàn sàn tại `/admin/vouchers`, duyệt/từ chối banner quảng cáo tại `/admin/ads`
   - Xem toàn bộ đơn hàng, trả lời tin nhắn hỗ trợ tại `/admin/chat`
   - Xem thống kê tổng quan có thể lọc theo khoảng ngày (7/14/30/90 ngày), hiệu quả voucher toàn sàn tại `/admin`

---

## 9. Hướng dẫn kiểm thử thủ công (demo đầy đủ luồng)

1. Đăng nhập `seller@ecom.local` → `/seller/products` thêm sản phẩm mới
2. Đăng nhập `admin@ecom.local` → tạo voucher tại `/admin/vouchers` (VD: giảm 10%)
3. Đăng nhập `customer@ecom.local` → mua sản phẩm → `/checkout` → nhập mã voucher → chọn COD hoặc MoMo → đặt hàng
4. Từ trang sản phẩm, bấm **Chat với shop** → gửi tin nhắn → đăng nhập seller ở tab khác, vào `/seller/chat` xem tin nhắn đến real-time
5. Seller cập nhật trạng thái đơn tại `/seller/orders` đến "Đã giao" → customer nhận được thông báo qua chuông trên header
6. Customer vào `/orders/:id` xem chi tiết, thử hủy một đơn khác (khi còn ở trạng thái chờ) kèm lý do
7. Customer đánh giá sản phẩm đã giao tại `/orders`
8. Seller gửi banner quảng cáo tại `/seller/ads` → Admin duyệt tại `/admin/ads` → xem banner xuất hiện ở trang chủ
9. Xem thống kê: `/seller/statistics` (đổi khoảng ngày, xem doanh thu theo danh mục, hiệu quả voucher) và `/admin` (tổng quan toàn hệ thống)

---

## 10. Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân / cách xử lý |
|---|---|
| `password authentication failed for user "postgres"` | Dùng `psql -U postgres -h 127.0.0.1` — nếu `pg_hba.conf` đã cấu hình `trust` cho `127.0.0.1` thì không cần mật khẩu |
| `permission denied to create database` khi chạy `prisma migrate dev` | Role `ecom` thiếu quyền `CREATEDB` — chạy `ALTER ROLE ecom CREATEDB;` bằng user `postgres` |
| `EPERM ... query_engine-windows.dll.node` khi chạy `prisma generate`/`migrate dev` | File đang bị khoá bởi backend đang chạy — dừng hẳn tiến trình `nest start --watch` trước, chạy lại migration, rồi khởi động lại backend |
| Backend báo lỗi không kết nối được database | Kiểm tra PostgreSQL service đang chạy và `DATABASE_URL` trong `.env` đúng |
| `EADDRINUSE` cổng 3000 hoặc 5173 đã dùng | Có tiến trình cũ vẫn đang chạy — đóng terminal cũ hoặc đổi `PORT` trong `.env` |
| Frontend gọi API bị lỗi CORS | Kiểm tra `FRONTEND_URL` trong `backend/.env` khớp với địa chỉ frontend đang chạy |
| Chat/thông báo không nhận real-time | Kiểm tra socket đã kết nối (mở DevTools → Network → WS) — access token hết hạn (>15 phút) không tự làm mất kết nối socket đã mở, nhưng nếu vừa đăng nhập lại cần load lại trang để socket kết nối bằng token mới |
| Đăng nhập xong nhưng F5 lại bị đăng xuất | Access token chỉ lưu trong bộ nhớ — khi tải lại trang, `AuthBootstrap` tự gọi `/auth/refresh` bằng cookie để khôi phục phiên; nếu refresh token cookie hết hạn (>7 ngày) thì phải đăng nhập lại |

---

## 11. Các lệnh hữu ích

**Backend** (chạy trong thư mục `backend/`):

| Lệnh | Chức năng |
|---|---|
| `npm run start:dev` | Chạy dev server (tự reload khi sửa code) |
| `npm run build` | Build production (`dist/`) |
| `npx prisma studio` | Mở giao diện web xem/sửa dữ liệu database |
| `npx prisma migrate dev --name <tên>` | Tạo migration mới sau khi sửa `schema.prisma` |
| `npx prisma migrate status` | Kiểm tra database đã khớp với schema chưa |
| `npx prisma db seed` | Chạy lại script tạo dữ liệu mẫu |

**Frontend** (chạy trong thư mục `frontend/`):

| Lệnh | Chức năng |
|---|---|
| `npm run dev` | Chạy dev server |
| `npm run build` | Build production (`dist/`) |
| `npx tsc -b --noEmit` | Kiểm tra lỗi kiểu dữ liệu TypeScript |

---

## 12. Deploy lên internet cho tester (miễn phí)

Stack đề xuất — cả 3 đều có gói miễn phí không cần thẻ, đủ cho giai đoạn tester:

| Thành phần | Dịch vụ | Vì sao |
|---|---|---|
| Database (PostgreSQL) | [Neon](https://neon.tech) | Free tier vĩnh viễn (không giới hạn 90 ngày như Render), serverless Postgres |
| Backend + WebSocket | [Render](https://render.com) | Web Service chạy Node.js liên tục, hỗ trợ WebSocket (cần cho chat/thông báo real-time) |
| Frontend | [Vercel](https://vercel.com) | Hosting SPA miễn phí, tự deploy khi push code, tốc độ tốt |

> Lưu ý: gói free của Render sẽ "ngủ" sau ~15 phút không có traffic, request đầu tiên sau đó mất khoảng 30-50 giây để "thức dậy". Bình thường với tester, chỉ cần báo trước hoặc nâng lên gói trả phí thấp nhất (~$7/tháng) nếu muốn tránh độ trễ này.

### Bước 1 — Đưa code lên GitHub

```bash
cd "D:\NIÊN LUẬN, LUẬN VĂN TN\Project"
git init
git add .
git commit -m "Initial commit"
```

Tạo repo mới trên [github.com/new](https://github.com/new) (Private hoặc Public đều được), rồi:

```bash
git remote add origin https://github.com/<username>/<ten-repo>.git
git branch -M main
git push -u origin main
```

### Bước 2 — Tạo database trên Neon

1. Đăng ký/đăng nhập [neon.tech](https://neon.tech) (dùng GitHub cho nhanh)
2. Tạo project mới → Neon tự tạo sẵn 1 database, region nên chọn gần VN nhất (Singapore nếu có)
3. Vào **Connection Details**, copy chuỗi kết nối dạng:
   `postgresql://<user>:<password>@<host>/<db>?sslmode=require`
4. Giữ lại chuỗi này — sẽ dùng làm `DATABASE_URL` ở bước 3

### Bước 3 — Deploy Backend lên Render

**Cách nhanh (dùng Blueprint có sẵn):** repo đã có sẵn file `render.yaml` ở thư mục gốc.

1. Đăng nhập [render.com](https://render.com) bằng GitHub
2. **New** → **Blueprint** → chọn repo vừa push → Render tự đọc `render.yaml` và tạo service `ecom-backend`
3. Trước khi bấm Apply, điền các biến môi trường được đánh dấu "cần nhập" (`sync: false`):
   - `DATABASE_URL` — chuỗi kết nối Neon ở bước 2
   - `FRONTEND_URL` — để tạm `https://placeholder.vercel.app`, sẽ sửa lại ở bước 5 sau khi có domain Vercel thật
   - `MOMO_REDIRECT_URL` — tạm `https://placeholder.vercel.app/payment/momo/return`
   - `MOMO_IPN_URL` — `https://<domain-backend-thực-tế>/api/payments/momo/ipn`; cập nhật ngay khi Render cấp URL, không đoán domain theo tên service
4. Bấm **Apply** — Render sẽ build và chạy `prisma migrate deploy` tự động để tạo bảng trên Neon
5. Sau khi chạy xong, chạy seed dữ liệu mẫu 1 lần từ máy bạn, trỏ vào DB Neon:
   ```bash
   cd backend
   DATABASE_URL="<chuỗi-kết-nối-Neon>" npx prisma db seed
   ```
   (PowerShell: `$env:DATABASE_URL="<chuỗi-kết-nối-Neon>"; npx prisma db seed`)
6. Ghi lại địa chỉ backend Render cấp và cập nhật `MOMO_IPN_URL` theo đúng địa chỉ đó. Bản đang triển khai dùng `https://ecom-backend-g2m7.onrender.com`, vì vậy IPN là `https://ecom-backend-g2m7.onrender.com/api/payments/momo/ipn`.

**Nếu không dùng Blueprint:** tạo **New → Web Service** thủ công, trỏ `Root Directory` = `backend`, Build Command = `npm install && npx prisma generate && npm run build`, Start Command = `npx prisma migrate deploy && npm run start:prod`, rồi tự thêm từng biến môi trường theo bảng ở mục 7.

### Bước 4 — Deploy Frontend lên Vercel

1. Đăng nhập [vercel.com](https://vercel.com) bằng GitHub
2. **Add New → Project** → chọn repo → **Root Directory** chọn `frontend`
3. Vercel tự nhận diện Vite, không cần sửa Build Command (`npm run build`) / Output Directory (`dist`)
4. Thêm biến môi trường: `VITE_API_URL` = `<địa-chỉ-backend-thực-tế>/api` (địa chỉ backend ở bước 3)
5. Deploy — Vercel cấp domain dạng `https://<ten-project>.vercel.app`

### Bước 5 — Nối lại 2 chiều

Quay lại Render, sửa 3 biến môi trường cho đúng domain Vercel thật:
- `FRONTEND_URL` = `https://<ten-project>.vercel.app`
- `MOMO_REDIRECT_URL` = `https://<ten-project>.vercel.app/payment/momo/return`
- `MOMO_IPN_URL` phải bằng `<địa-chỉ-backend-thực-tế>/api/payments/momo/ipn`, kiểm tra lại cả hậu tố domain Render

Lưu lại → Render tự redeploy với biến mới.

### Bước 6 — Kiểm tra

1. Mở domain Vercel → đăng nhập bằng tài khoản mẫu (mục 6) → xác nhận API gọi được (không lỗi CORS)
2. Test luồng mua hàng, chat real-time (mở 2 tab/2 tài khoản khác nhau), thanh toán MoMo sandbox
3. Gửi link Vercel cho tester

### Cập nhật sau này

Mỗi lần sửa code, chỉ cần `git push` — cả Render và Vercel tự động build & deploy lại (auto-deploy mặc định bật khi kết nối GitHub).
