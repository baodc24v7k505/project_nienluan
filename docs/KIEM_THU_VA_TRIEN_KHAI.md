# Kiểm thử và triển khai

## Kết quả kiểm chứng trên máy ngày 13/11/2026

Môi trường: Node.js 22.20.0, PostgreSQL 18.3, Windows; Chromium qua Playwright cho giao diện.

| Kiểm tra | Kết quả |
|---|---|
| Backend build và lint:check | Đạt, không lỗi/cảnh báo lint |
| Unit test | 1/1 đạt |
| Integration trên PostgreSQL riêng | 24/24 đạt |
| Frontend build và lint | Đạt |
| Playwright desktop/mobile | 6/6 đạt |
| Prisma validate và đối chiếu schema/database | Đạt; không khác biệt schema |
| Migration bản sao và database local | Đạt; có backup trước nâng cấp |
| Seed chạy lại | Không thêm trùng; đã thêm 100 sản phẩm/300 SKU demo |
| npm audit --omit=dev | 0 cảnh báo ở cả backend/frontend sau cập nhật bản vá |

Audit toàn bộ backend vẫn có cảnh báo ở dependency của công cụ phát triển/kiểm thử; chưa ép nâng major Nest CLI/Jest. Không suy diễn kết quả audit production thành bảo đảm an toàn tuyệt đối. Bộ UI có tạo/hủy đơn kiểm thử với tài khoản customer@ecom.local; có thể nhận biết qua lý do hủy “Kiểm thử giao diện đặt và hủy đơn”.

## Chạy local

Backend cần Node.js, PostgreSQL và các biến trong backend/.env.example. Frontend dùng frontend/.env.example. Không đưa file .env thật vào Git.

```powershell
cd backend
npm ci
npm run build
npx prisma migrate deploy
npm run db:seed:demo
npm run start:dev
```

Terminal khác:

```powershell
cd frontend
npm ci
npm run dev
```

`npm run build` backend tự generate Prisma Client. Trên Windows, dừng backend trước khi generate lại Prisma để tránh khóa query_engine DLL.

## Kiểm thử tự động

```powershell
cd backend
npm test -- --runInBand
$env:TEST_DATABASE_URL='postgresql://postgres:your-password@127.0.0.1:5432/ecom_upgrade_test'
npm run test:integration
```

Tạo database kiểm thử riêng trước lần chạy đầu. Script từ chối tên database không kết thúc bằng `_test`, chạy migration và dùng tài khoản/đơn hàng thử với định danh riêng. Không trỏ kiểm thử vào database đang dùng demo/production.

Các ca integration bao gồm: xác thực và quyền sở hữu; SKU; tranh kho; idempotency; tranh lượt voucher; hủy đồng thời; chọn dòng giỏ/mua ngay; phân bổ hai shop; quyền STAFF/ADMIN; chặn MoMo chưa trả tiền; IPN số/chữ ký/số tiền/callback trùng; hết hạn và callback muộn; COD/vận đơn/đổi trả/hoàn tiền; đối chiếu COD cũ; khoảng ngày; upload ảnh; khóa tài khoản/đổi mật khẩu; chat và phân trang; chu trình danh mục; voucher 0đ; thanh toán trùng và đối chiếu thống kê.

Đợt cập nhật giao diện/quảng cáo bổ sung kiểm thử quyền sở hữu yêu cầu xóa, lý do trống, yêu cầu trùng, hủy/gửi lại, phản hồi từ chối, STAFF bị chặn quyền xóa, ADMIN xóa trực tiếp, banner đã xóa và banner shop đình chỉ bị loại khỏi API công khai. Đợt sửa kết nối MoMo ngày 17/11 bổ sung kiểm thử HTTP 403 không phải JSON, lỗi JSON 4xx, timeout, mạng, cấu hình thiếu, giới hạn số tiền và giữ nguyên mã lần thử khi kết nối chưa xác định kết quả. Tổng: 27 integration + 14 unit.

MoMo được giả lập ở bước tạo payUrl trong integration test; xác thực chữ ký và callback được kiểm tra qua HTTP thật vào ứng dụng. Đây không phải bằng chứng đã thực hiện giao dịch ví MoMo thực tế.

Nếu MoMo không tạo được liên kết:

- `MOMO_GATEWAY_BLOCKED`: cổng trả HTTP 401/403 không có phản hồi JSON hợp lệ. Kiểm tra endpoint và khả năng truy cập từ chính máy chủ chạy API; không đồng nhất lỗi kết nối này với sai chữ ký hoặc thanh toán thất bại.
- `MOMO_TIMEOUT`/`MOMO_UNREACHABLE`: chưa xác định kết quả khởi tạo. Lần thử sau dùng lại `orderId`/`requestId` của MoMo, không tự tạo danh tính thanh toán mới hoặc đánh dấu đã trả tiền.
- Phản hồi JSON có `resultCode` được chuẩn hóa thành thông báo kèm mã MoMo. Không đưa chuỗi ký, credentials hoặc toàn bộ lỗi HTTP vào thông báo/log.
- Kết nối dùng HTTP POST JSON chuẩn, timeout 35 giây (tài liệu MoMo yêu cầu tối thiểu 30 giây). Số tiền giữ đúng số nguyên VND; không tự làm tròn để tránh sai số khi xác nhận callback.

### Kiểm thử MoMo sandbox local

Ngày 17/11/2026 đã tái hiện HTTP 403 từ cổng MoMo khi API gọi từ Render, dù endpoint đúng và cùng cấu hình/số tiền tạo được liên kết từ máy local. Sau bản sửa, Render trả 503 có mã `MOMO_GATEWAY_BLOCKED`, không còn lỗi 500 chung chung; đây là xử lý lỗi, chưa phải khắc phục được quyền kết nối của Render với cổng MoMo. Cần đối chiếu cấu hình merchant và kết nối với MoMo trước khi coi thanh toán online là hoạt động.

Đã kiểm tra local với đơn thật trong database demo: tạo đơn → gọi sandbox → nhận `payUrl` từ `test-payment.momo.vn`, trạng thái vẫn `PENDING`. Sau kiểm tra đã hủy riêng đơn thử và hoàn kho. Không thực hiện giao dịch ví hoặc giả lập ghi nhận `PAID`.

Sau khi cài dependency, migrate và seed database local theo hướng dẫn ở trên, chạy hai terminal:

```powershell
# Terminal 1: trong backend, dùng DATABASE_URL local trong .env
npx nest build
$env:PORT='3101'
$env:FRONTEND_URL='http://localhost:5173'
$env:PUBLIC_API_URL='http://localhost:3101/api'
$env:MOMO_REDIRECT_URL='http://localhost:5173/payment/momo/return'
$env:MOMO_IPN_URL='http://localhost:3101/api/payments/momo/ipn'
$env:NODE_ENV='development'
node dist/src/main.js
```

```powershell
# Terminal 2: trong frontend
$env:VITE_API_URL='http://localhost:3101/api'
npm run dev -- --host localhost --port 5173 --strictPort
```

Mở http://localhost:5173, đăng nhập tài khoản demo, chọn SKU → Mua Ngay → Ví MoMo (sandbox). API đọc bộ thông tin sandbox trong `backend/.env`; không dùng khóa production cho môi trường này.

Giới hạn local: MoMo không gọi được IPN tới `localhost`. Việc ghi nhận kết quả phụ thuộc bước trình duyệt quay về website với callback có chữ ký hợp lệ; đóng trình duyệt trước bước này có thể khiến đơn chưa được cập nhật. Để kiểm thử đầy đủ IPN độc lập với trình duyệt, cần URL webhook công khai và cổng MoMo chấp nhận kết nối từ máy chủ. Luồng và timeout tham chiếu: [tài liệu thanh toán thông thường của MoMo](https://developers.momo.vn/v3/vi/docs/payment/api/wallet/onetime/).

Kiểm thử trình duyệt cần API bản nâng cấp và dữ liệu demo. Mặc định test UI dùng API `http://localhost:3100/api` và frontend `http://localhost:5173`.

```powershell
# Terminal backend: ví dụ dùng database demo riêng đã migrate/seed
$env:DATABASE_URL='postgresql://postgres:your-password@127.0.0.1:5432/ecom_upgrade_dev'
$env:PORT='3100'
$env:FRONTEND_URL='http://localhost:5173'
node dist/src/main.js
```

```powershell
# Terminal frontend
npx playwright install chromium
npm run test:ui
```

Playwright tự chạy Vite nếu cổng 5173 chưa được dùng. Nếu dùng API khác, đặt UI_API_URL; nếu frontend đã chạy trước, bảo đảm VITE_API_URL của tiến trình đó trỏ đúng API kiểm thử. Screenshot nằm trong frontend/test-results và được bỏ qua bởi Git.

8 ca UI bao gồm: danh mục/lọc/sắp xếp và bố cục điện thoại; chọn SKU/mua/hủy; quản lý SKU của seller; nhập ngày trong lúc báo cáo đang tải và xuất CSV đúng kỳ; hồ sơ; shop yêu cầu xóa → ADMIN phản hồi/xác nhận xóa; biểu đồ có số âm/kỳ dài và màn hình 390px; đổi tài khoản seller. Ca kiểm tra biểu đồ dùng response giả lập riêng trong Playwright để kiểm tra hiển thị, không ghi doanh thu giả vào database. Những ca đặt/hủy đơn và quản lý quảng cáo dùng API thật; chỉ chạy trên dữ liệu demo/kiểm thử.

Workflow `.github/workflows/verify.yml` chạy build, unit/integration, seed và UI test trên PostgreSQL riêng cho mỗi lần push/PR.

## Redeploy Render và Vercel

Backend Render:

- Root directory: backend.
- Build: `npm ci --include=dev && npm run build`.
- Start: `npx prisma migrate deploy && npm run start:prod`.
- Bản giao diện/quảng cáo yêu cầu migration `20261113120000_ad_deletion_requests` (4 trường nullable mới). Deploy backend và áp dụng migration trước khi kiểm tra trang quảng cáo mới.
- Health check: `/api`.
- Giữ DATABASE_URL/JWT/MOMO hiện có. FRONTEND_URL phải đúng origin frontend.
- `prestart:prod` chèn dữ liệu demo còn thiếu. Đặt SEED_DEMO_DATA=false nếu muốn tắt. Script dùng JavaScript đã build nên không cần ts-node khi khởi động.
- PUBLIC_API_URL là tùy chọn, ví dụ https://your-backend.onrender.com/api, dùng tạo URL ảnh upload. Nếu không đặt, API lấy URL từ request.

Frontend Vercel:

- Root directory: frontend.
- Build: `npm run build`; output: dist.
- VITE_API_URL=https://your-backend.onrender.com/api.
- Sau build phải redeploy frontend để biến VITE_API_URL mới có hiệu lực.

Domain production cập nhật ngày 17/11/2026:

- Frontend: https://ecom-tieuluan.vercel.app (project Vercel: `ecom-tieuluan`).
- https://ecom-nienluan.vercel.app chuyển hướng sang domain mới.
- API giữ nguyên https://ecom-backend-g2m7.onrender.com/api.
- Trên Render, `FRONTEND_URL=https://ecom-tieuluan.vercel.app` áp dụng cho CORS của HTTP và socket chat.
- `MOMO_REDIRECT_URL=https://ecom-tieuluan.vercel.app/payment/momo/return`; `MOMO_IPN_URL` vẫn dùng domain backend.
- Sau khi sửa biến môi trường Render, lưu và redeploy backend; kiểm tra đăng nhập từ domain mới để phát hiện sai CORS trước khi demo.

Các migration đều bổ sung và backfill SKU mặc định, ảnh chụp đơn, phân bổ giảm giá, lịch sử và khoản hoàn cũ cần đối chiếu. Đã kiểm tra migration trên bản sao dữ liệu local trước khi áp dụng database local đang dùng. Bản sao lưu trước nâng cấp nằm tại `.local/backups/ecom_db_before_upgrade_20261113.dump`, không được commit.

Trước migration production nên tạo snapshot/backup ở nhà cung cấp PostgreSQL. Không chạy migrate reset hoặc db push để thay cho migrate deploy. Khi đã áp dụng schema mới, rollback cần phối hợp bản code và database/snapshot; chỉ redeploy code cũ có thể không tương thích giỏ hàng theo SKU.

Sau deploy: xem danh mục và SKU; thử COD → nhập vận đơn → giao → trả hàng → xác nhận hoàn; thử upload ảnh; kiểm tra báo cáo và IPN MoMo với domain public. Bản nâng cấp chưa tự chuyển tiền hoàn hoặc tạo vận đơn tại hãng vận chuyển.
