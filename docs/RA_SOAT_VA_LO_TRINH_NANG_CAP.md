# Rà soát hệ thống và đề xuất nâng cấp cho tiểu luận

Ngày rà soát: 13/11/2026.

## 1. Phạm vi và giới hạn

Đã rà soát kiến trúc backend/frontend, schema Prisma, migration, seed, controller, DTO, service, các trang theo vai trò, API client, xác thực, realtime, cấu hình triển khai và kiểm thử hiện có. Mã nguồn ứng dụng là căn cứ chính; README được đối chiếu với cách triển khai thực tế.

Đây là đánh giá tĩnh. Hai thư mục backend/frontend hiện chưa có node_modules; chưa cài dependency, build, chạy test, kết nối database hay kiểm tra giao diện trực tiếp. Các rủi ro đồng thời và tích hợp bên ngoài cần được tái hiện khi dựng môi trường. Không thay đổi mã nguồn nghiệp vụ hay dữ liệu trong lần rà soát này.

Chưa có yêu cầu chấm điểm, mẫu báo cáo hoặc hạn nộp từ giảng viên. Phạm vi bên dưới là đề xuất để thảo luận, chưa phải cam kết triển khai toàn bộ.

## 2. Bản đồ hệ thống hiện tại

| Thành phần | Triển khai đang có |
|---|---|
| Backend | NestJS 11, TypeScript, ứng dụng chia module theo nghiệp vụ |
| Database | PostgreSQL, Prisma 6.19.3, 19 model, migration SQL và seed |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS |
| Dữ liệu và form | TanStack Query, Zustand, React Hook Form, Zod |
| Xác thực | JWT access token trong bộ nhớ; refresh token băm trong DB, cookie HttpOnly, xoay token |
| Phân quyền | CUSTOMER, SELLER, ADMIN, STAFF; guard toàn cục và kiểm tra chủ sở hữu ở nhiều service |
| Thanh toán | COD và tích hợp MoMo sandbox, chữ ký HMAC, return URL và IPN |
| Realtime | Socket.IO cho chat và thông báo, room theo user/cuộc trò chuyện |
| Triển khai | Có render.yaml cho backend và cấu hình rewrite SPA cho Vercel |

### Các nhóm chức năng có thực hiện trong source

- Khách hàng: đăng ký/đăng nhập, xem sản phẩm/shop, tìm kiếm không dấu và gần đúng, gợi ý tìm kiếm, giỏ hàng, địa chỉ, đặt hàng, voucher, theo dõi/hủy đơn, đánh giá sau giao hàng, chat và thông báo.
- Người bán: đăng ký shop, sản phẩm/ảnh bằng URL, tồn kho tổng theo sản phẩm, xử lý đơn của shop, voucher riêng, gửi banner quảng cáo, chat và thống kê.
- Quản trị/nhân viên: quản lý người dùng, nhân viên, duyệt shop, danh mục, ẩn/hiện sản phẩm, xem đơn, voucher sàn, duyệt quảng cáo, hỗ trợ và thống kê.

### Cấu trúc dữ liệu cần giữ khi nâng cấp

- User → Shop: hiện mỗi seller có tối đa một shop.
- Product → ProductImage; Category hỗ trợ parentId.
- Order là lần đặt hàng của khách, gồm nhiều ShopOrder; mỗi ShopOrder có nhiều OrderItem.
- OrderItem đã lưu tên và giá tại lúc mua; Order đã lưu thông tin giao hàng tại lúc đặt.
- Payment hiện quan hệ một-một với Order; chưa có bảng cho nhiều lần thử thanh toán hoặc hoàn tiền.
- Voucher có phạm vi PLATFORM/SHOP; VoucherRedemption ghi nhận lượt dùng.
- Conversation, Message, Notification phục vụ tương tác và thông báo.

Luồng đặt hàng: đọc toàn bộ giỏ → kiểm tra sản phẩm/địa chỉ/tồn kho → nhóm theo shop → kiểm tra một voucher → transaction tạo Order/ShopOrder/Payment, trừ kho, ghi lượt dùng và xóa giỏ → gửi thông báo.

Các điểm vào quan trọng: frontend/src/App.tsx, frontend/src/api/client.ts, backend/src/app.module.ts, backend/src/main.ts, backend/prisma/schema.prisma.

## 3. Những điểm cần xử lý trước khi mở rộng

P0 là các vấn đề về giao dịch và quyền truy cập cần ưu tiên; P1 là phần cần hoàn thiện để nghiệp vụ và demo nhất quán. Mức ưu tiên không đồng nghĩa mọi lỗi đã được tái hiện khi chạy.

| Mức | Phát hiện từ source | Hệ quả / việc nên làm | Vị trí |
|---|---|---|---|
| P0 | Kiểm tra stock trước transaction; bên trong chỉ decrement theo id | Hai người có thể cùng vượt qua kiểm tra và làm âm kho. Cần trừ kho có điều kiện, kiểm tra số dòng cập nhật, rollback và kiểm soát xung đột | backend/src/orders/orders.service.ts: checkout |
| P0 | Kiểm tra usageLimit/perUserLimit trước transaction tạo redemption | Nhiều checkout có thể dùng quá hạn mức. Đưa kiểm tra và ghi nhận vào cơ chế đồng thời thống nhất | backend/src/vouchers/vouchers.service.ts: findValidVoucher; orders.service.ts |
| P0 | Kiểm tra trạng thái rồi cập nhật/hồi kho ở bước khác | Hai yêu cầu hủy/chuyển trạng thái có thể cùng vượt qua kiểm tra; có nguy cơ hồi kho hai lần hoặc ghi đè trạng thái. Cần cập nhật có điều kiện theo trạng thái cũ trong transaction | backend/src/orders/orders.service.ts: applyStatusChange, updateShopOrderStatus, cancelByCustomer |
| P0 | UsersController cho cả ADMIN và STAFF truy cập toàn bộ endpoint bên trong, gồm tạo/xóa staff và đổi trạng thái user | STAFF có quyền rộng hơn mô tả README; backend chưa chặn đổi trạng thái ADMIN dù UI ẩn nút. Cần quy định ma trận quyền và kiểm tra tại API | backend/src/users/users.controller.ts; users.service.ts |
| P0 | JWT strategy chỉ trả payload; socket chỉ xác minh token lúc kết nối | Tài khoản bị khóa hoặc quyền thay đổi chưa được phản ánh ngay cho token/socket đang tồn tại. Cần chính sách kiểm tra trạng thái và thu hồi phiên | backend/src/auth/strategies/jwt.strategy.ts; realtime/realtime.gateway.ts |
| P0 | Callback MoMo xác minh chữ ký nhưng chưa đối chiếu amount/partnerCode với dữ liệu kỳ vọng, chưa lưu requestId/lần thử | Cần ràng buộc giao dịch với đơn, số tiền, phương thức và trạng thái; cập nhật idempotent trong điều kiện callback lặp hoặc đến khác thứ tự | backend/src/payments/payments.service.ts |
| P0 | DTO callback yêu cầu amount/resultCode/transId/responseTime là string; IPN JSON mẫu MoMo dùng số; endpoint IPN chưa đặt HTTP 204 | Có nguy cơ IPN bị ValidationPipe từ chối và phản hồi chưa đúng hợp đồng tích hợp. Cần chuẩn hóa dữ liệu và test payload giống nhà cung cấp | backend/src/payments/dto/momo-callback.dto.ts; payments.controller.ts |
| P1 | Seller có thể chuyển đơn MOMO chưa thanh toán sang CONFIRMED/SHIPPING; COD không có luồng ghi nhận thu tiền | Phải tách trạng thái thanh toán với giao nhận; COD nhiều shop cần ghi nhận khoản thu theo shop và tổng hợp lên Order | backend/src/orders/orders.service.ts; payments.service.ts |
| P1 | Đơn MoMo được tạo và trừ kho trước lúc tạo payUrl; không có hết hạn giữ hàng/khôi phục khi bỏ thanh toán | Cần timeout giữ kho, thanh toán lại, xử lý lỗi tạo payUrl và callback đến sau hết hạn; giải phóng kho/lượt voucher theo chính sách rõ ràng | orders.service.ts; payments.service.ts; frontend/src/pages/customer/CheckoutPage.tsx |
| P1 | Hủy một ShopOrder chỉ đổi trạng thái và hồi kho | Chưa xử lý tiền đã thanh toán, phân bổ giảm giá, số tiền còn phải thu hoặc hoàn tiền một phần. Cần giữ số tiền gốc và ghi điều chỉnh/hoàn tiền riêng | backend/src/orders/orders.service.ts; prisma/schema.prisma |
| P1 | Thống kê cộng subtotal của ShopOrder DELIVERED; không dựa trên tiền đã thu, giảm giá phân bổ hay phí sàn | Chỉ nên mô tả đúng là giá trị hàng đã giao trước giảm giá; cần phân biệt GMV, thực thu, khoản hoàn và doanh thu phí sàn | backend/src/statistics/statistics.service.ts |
| P1 | days chỉ điều khiển số ngày trên biểu đồ; tổng doanh thu/top sản phẩm/top shop/voucher vẫn lấy toàn thời gian; ngày dùng updatedAt và UTC | Cần bộ lọc thời gian thống nhất, mốc deliveredAt/paidAt và múi giờ nghiệp vụ; ghi rõ chỉ số nào toàn thời gian | backend/src/statistics/statistics.service.ts |
| P1 | Nút Mua ngay thêm sản phẩm vào giỏ rồi checkout toàn bộ giỏ | Có thể đưa cả món cũ vào đơn. Cần mua trực tiếp hoặc chọn dòng giỏ cần thanh toán | frontend/src/pages/customer/ProductDetailPage.tsx; backend/src/orders/orders.service.ts |
| P1 | Query key dữ liệu riêng không gắn userId; logout chưa xóa cache | Cần dọn cache/cancel request khi chuyển tài khoản để tránh hiển thị dữ liệu cũ trong cùng trình duyệt | frontend/src/App.tsx; layouts/RootLayout.tsx; components/MobileBottomNav.tsx |
| P1 | Test nghiệp vụ chưa có; hai test hiện tại kiểm tra Hello World | Cần integration/E2E cho đặt hàng, quyền, thanh toán, hủy/hoàn kho và đổi trả; chưa thể coi luồng quan trọng là đã được kiểm thử | backend/src/app.controller.spec.ts; backend/test/app.e2e-spec.ts |

### Các điểm hoàn thiện bổ sung

- Product chỉ có một price/stock; chưa có SKU theo màu, size hoặc dung lượng.
- RETURNED mới là trạng thái seller có thể đặt qua API; UI seller chưa có luồng đổi trả, chưa có yêu cầu của khách, chứng cứ, xét duyệt hay hoàn tiền.
- Seller tạo sản phẩm mặc định ACTIVE và có thể gửi status khi cập nhật; hiện admin ẩn/hiện sản phẩm, chưa phải quy trình duyệt trước khi bán. Nếu cần kiểm duyệt, tách trạng thái xuất bản khỏi trạng thái kiểm duyệt.
- Ảnh sản phẩm/banner nhập URL, chưa có upload file và quản lý tài nguyên ảnh.
- API địa chỉ hỗ trợ sửa/xóa nhưng frontend mới dùng danh sách và tạo địa chỉ tại checkout; chưa có trang quản lý tài khoản/địa chỉ, đổi mật khẩu hay quên mật khẩu.
- Nhiều danh sách đã phân trang ở API nhưng UI chỉ hiển thị trang đầu: đơn hàng, sản phẩm seller và một số trang quản trị. Hoàn thiện tham số, bộ lọc và nút chuyển trang hai phía.
- Chat chỉ lấy một trang tin mới nhất, chưa dùng page/cursor cho lịch sử; readAt chưa có quy trình cập nhật. Thông báo chat trực tiếp luôn trỏ /chat, chưa chọn đường dẫn riêng cho seller.
- Socket singleton giữ kết nối cũ khi token mới được cấp; cần thiết kế cập nhật token, reconnect, join lại room và tải bù tin nhắn, tránh tạo thêm socket khi kết nối cũ đang thử kết nối lại.
- Voucher: form số tùy chọn dùng valueAsNumber có thể tạo NaN khi để trống; cần tái hiện và chuẩn hóa giá trị trống. Backend cần giới hạn phần trăm, kiểm tra ngày khi cập nhật và chuẩn hóa mã trước khi kiểm tra trùng.
- Cập nhật địa chỉ mặc định chưa nằm trong transaction; cấu trúc danh mục chỉ chặn tự làm cha, chưa chặn chu trình nhiều cấp.
- Xóa cứng sản phẩm có thể vướng khóa ngoại khi đã có OrderItem; nên chuyển sang lưu trữ/ngừng bán để bảo toàn lịch sử.
- Gửi thông báo xảy ra sau commit; nếu gửi thất bại, API có thể trả lỗi dù đơn đã tạo. Nên tách lỗi tác vụ phụ, bổ sung retry; cân nhắc outbox khi cần bảo đảm sự kiện.
- Exception filter có thể trả exception.message của lỗi nội bộ; cần thông báo công khai gọn, log server kèm mã truy vết.
- Chưa thấy rate limit cho đăng nhập/chat, nhật ký thao tác quản trị và tài liệu OpenAPI trong source.
- Seed hiện chỉ có một shop và hai sản phẩm, chưa đủ trình diễn các tình huống nhiều shop, đơn lỗi, đổi trả hoặc thống kê theo kỳ.
- README có mô tả môi trường đã cài sẵn nhưng bản thư mục hiện tại chưa có node_modules; cần cập nhật theo bản bàn giao, thêm .env.example không chứa bí mật. Chưa thấy tài liệu báo cáo học thuật trong thư mục được cung cấp.

## 4. Phạm vi nâng cấp đề xuất

Giữ kiến trúc hiện tại, tổ chức chặt theo module nghiệp vụ. Các phần sau có thể làm thành từng đợt độc lập để demo và kiểm thử.

| Nhóm | Phần cần bổ sung | Giá trị cho tiểu luận | Độ phức tạp tương đối |
|---|---|---|---|
| Nền tảng giao dịch | Chống âm kho/quá lượt voucher, hủy đơn một lần, quyền staff, thanh toán đáng tin cậy | Chứng minh tính nhất quán và kiểm soát truy cập | Cao |
| Biến thể sản phẩm | Màu/size/dung lượng, SKU, giá/ảnh/tồn kho riêng, lưu biến thể tại lúc đặt | Thiết kế dữ liệu và quy trình mua hàng sát nghiệp vụ | Vừa–cao |
| Vận chuyển và lịch sử đơn | Phí theo shop, phương thức giao, mã vận đơn, mốc giao hàng, timeline | Hoàn chỉnh vòng đời đơn nhiều shop | Vừa |
| Đổi trả và hoàn tiền | Khách gửi yêu cầu/chứng cứ, seller xử lý, admin giải quyết tranh chấp, hoàn tiền theo khoản | Điểm nhấn về nghiệp vụ nhiều bên và điều chỉnh tiền/kho | Cao |
| Thống kê và xuất báo cáo | Từ ngày–đến ngày, GMV/thực thu/hoàn tiền, thống kê theo shop, xuất CSV/XLSX/PDF theo nhu cầu | Đối chiếu kết quả bằng dữ liệu và hỗ trợ quản trị | Vừa |
| Trải nghiệm người dùng | Hồ sơ, đổi/quên mật khẩu, sổ địa chỉ, upload ảnh, lọc giá/sắp xếp, chọn món checkout | Demo hoàn chỉnh, dễ sử dụng và giảm thao tác thủ công | Vừa |
| Quản trị sàn nâng cao | Phí hoa hồng, sổ giao dịch, đối soát seller, nhật ký kiểm duyệt | Thể hiện vai trò vận hành và nguồn thu của sàn | Cao |

Gói tập trung đề xuất: nền tảng giao dịch + biến thể/SKU + vận chuyển cơ bản/timeline + yêu cầu đổi trả có quy trình + thống kê đúng và kiểm thử. Hồ sơ và upload ảnh bổ sung tùy thời gian. Nếu thời gian ngắn, giảm phạm vi đổi trả còn nguyên ShopOrder và mô phỏng hoàn tiền có nhật ký; không mô tả mô phỏng là tiền đã được hoàn qua cổng thanh toán.

Các phần mở rộng khi còn thời gian: yêu thích/theo dõi shop, phản hồi đánh giá, voucher sàn kết hợp voucher shop, flash sale, đối soát phí sàn. Gợi ý cá nhân hóa chỉ nên làm khi có dữ liệu hành vi và chỉ số đánh giá; hiện chưa có lịch sử xem/click để chứng minh hiệu quả cá nhân hóa.

### Gợi ý dữ liệu mới, chưa phải schema đã chốt

- ProductVariant và bảng lựa chọn thuộc tính; CartItem tham chiếu biến thể; OrderItem lưu SKU/thuộc tính/ảnh tại thời điểm mua.
- InventoryMovement để truy vết nhập, giữ, bán, hủy và hoàn kho. Nếu dùng giữ hàng theo thời hạn, bổ sung Reservation thay vì trừ kho vĩnh viễn ngay lúc tạo đơn chưa trả tiền.
- ShopOrder bổ sung subtotal, discountAmount được phân bổ, shippingFee, payableAmount và các mốc trạng thái với ý nghĩa rõ ràng.
- Shipment và OrderStatusHistory để lưu giao nhận và lịch sử thao tác.
- PaymentAttempt, PaymentEvent, Refund để theo dõi thử thanh toán, callback và hoàn tiền một phần/toàn phần.
- ReturnRequest, ReturnItem và bằng chứng; định nghĩa chính sách hoàn kho sau khi thực nhận/kiểm tra hàng.
- AuditLog; Commission/Settlement chỉ thêm khi phạm vi có đối soát.

Khi thêm SKU phải chuyển đổi sản phẩm cũ sang biến thể mặc định, giữ lịch sử OrderItem cũ và kiểm tra migration trên bản sao dữ liệu trước khi áp dụng.

## 5. Thứ tự triển khai và tiêu chí hoàn thành

### Đợt 0 — Xác lập bản gốc có thể kiểm chứng

- Dựng môi trường dev/test riêng, cài theo lockfile, kiểm tra build/lint/test hiện tại và ghi lại lỗi có sẵn.
- Sao lưu dữ liệu trước thay đổi schema; dùng quản lý phiên bản cho mã nguồn. Thư mục rà soát hiện không có metadata .git.
- Chuẩn bị nhiều shop, khách hàng và sản phẩm mẫu; không dùng database thật cho test phá trạng thái.
- Hoàn thành khi có hướng dẫn chạy tái lập và biên bản chức năng hiện tại.

### Đợt 1 — Sửa nghiệp vụ nền

- Xử lý các mục P0 và tính nhất quán thanh toán/COD, hủy đơn, giữ hàng, giảm giá.
- Bổ sung ma trận quyền và kiểm thử nhiều request đồng thời.
- Hoàn thành khi không thể âm kho, hoàn kho hai lần, dùng quá lượt voucher hay thao tác ngoài quyền trong các test được xác định.

### Đợt 2 — Biến thể và trải nghiệm mua

- SKU, giá/kho theo biến thể, upload ảnh, lựa chọn món cần mua và mua trực tiếp.
- Hoàn thành khi khách mua đúng biến thể, giá và số lượng được lưu đúng tại thời điểm đặt; đơn cũ vẫn đọc được.

### Đợt 3 — Vòng đời sau đặt hàng

- Vận chuyển cơ bản, timeline, yêu cầu đổi trả và hoàn tiền; cho phép mô phỏng nhà vận chuyển nếu chưa tích hợp dịch vụ thật.
- Hoàn thành khi các vai trò xử lý được luồng thành công, từ chối và ngoại lệ; dữ liệu tiền/kho nhất quán.

### Đợt 4 — Thống kê, báo cáo và bàn giao

- Chuẩn hóa khoảng ngày, múi giờ, định nghĩa chỉ số; thêm xuất báo cáo theo định dạng cần dùng.
- Hoàn thiện tài liệu API, dữ liệu demo, kiểm thử và ảnh minh chứng.
- Hoàn thành khi số liệu dashboard đối chiếu được với tập đơn đã biết kết quả.

## 6. Nội dung cần bổ sung cho báo cáo tiểu luận

Tên đề tài tham khảo: “Phát triển hệ thống sàn thương mại điện tử đa người bán hỗ trợ quản lý biến thể sản phẩm và quy trình đổi trả”. Chỉ đưa các chức năng đã triển khai và kiểm chứng vào tên/phạm vi chính thức.

1. Tổng quan: vấn đề, mục tiêu, đối tượng sử dụng, giới hạn; bảng so sánh bản niên luận và bản nâng cấp.
2. Cơ sở lý thuyết/công nghệ: kiến trúc client–server, API, xác thực/phân quyền, transaction và đồng thời, realtime, nguyên tắc tích hợp thanh toán. Giải thích lựa chọn gắn với bài toán cụ thể.
3. Phân tích và thiết kế: yêu cầu chức năng/phi chức năng, ma trận quyền, use case và đặc tả, ERD/từ điển dữ liệu, sơ đồ trạng thái, sequence checkout/thanh toán/đổi trả, quy tắc giá/voucher/phí/hoàn tiền.
4. Xây dựng hệ thống: kiến trúc triển khai, module, giao diện theo vai trò, cách tích hợp; tách chức năng kế thừa với đóng góp mới.
5. Kiểm thử và đánh giá: môi trường, dữ liệu, test case có kết quả thực, minh chứng, kiểm thử đồng thời và phân quyền, số liệu hiệu năng đo được, hạn chế và hướng phát triển.

Nếu trường quy định cấu trúc chương khác thì ánh xạ nội dung này theo mẫu của trường. Chưa có căn cứ để khẳng định số trang hoặc mức chức năng nào chắc chắn đạt yêu cầu chấm điểm.

### Bộ tình huống kiểm thử nên có

- Hai khách mua đồng thời sản phẩm chỉ còn một đơn vị: chỉ một giao dịch được chấp nhận.
- Nhiều request tranh lượt voucher cuối: không vượt tổng lượt hoặc lượt theo khách.
- Khách gửi checkout lặp: không tạo đơn trùng ngoài ý muốn.
- Hai yêu cầu hủy cùng đơn: chỉ hồi kho một lần; yêu cầu hủy cạnh tranh với chuyển giao hàng phải có kết quả nhất quán.
- Một Order có hai shop, một shop hủy: tiền được phân bổ, khoản phải thu/hoàn và số liệu còn lại đúng.
- MoMo trả payload số đúng mẫu; chữ ký sai, số tiền sai, callback trùng/đảo thứ tự và callback muộn đều được xử lý theo chính sách.
- Tạo payUrl lỗi, khách đóng trang hoặc hết hạn thanh toán: có thể tiếp tục hoặc giải phóng giữ hàng đúng quy tắc.
- COD giao/thu tiền từng shop: tổng hợp trạng thái và khoản thu của Order đúng.
- Seller không sửa/xem đơn hoặc sản phẩm của shop khác; STAFF không quản lý ADMIN hay tự cấp quyền.
- Tài khoản bị khóa và chuyển tài khoản trong cùng trình duyệt: kiểm tra API, socket và dữ liệu cache.
- Đổi trả bị từ chối/được chấp thuận: tiền và hàng chỉ điều chỉnh ở đúng bước, có lịch sử.
- Báo cáo theo kỳ khớp tập dữ liệu mẫu, gồm giảm giá, hủy, hoàn tiền và giao dịch gần ranh giới ngày.

Chỉ đặt ngưỡng hiệu năng sau khi biết môi trường và tải kỳ vọng. Báo cáo cần ghi cấu hình, số bản ghi, số người dùng đồng thời, tỷ lệ lỗi và thời gian phản hồi đo thực tế; chưa có số đo trong lần rà soát này.

## 7. Tài liệu kỹ thuật đối chiếu

- [Prisma 6 — Transactions and batch queries](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions): tham khảo transaction isolation, xử lý xung đột và retry. Chỉ tăng isolation level không sửa được các kiểm tra vẫn đặt ngoài transaction; cần thiết kế lại thao tác đọc–kiểm tra–ghi.
- [MoMo — Payment Notification](https://developers.momo.vn/v3/docs/payment/api/result-handling/notification/): IPN mẫu dùng kiểu số cho một số trường; tài liệu yêu cầu xác minh chữ ký, khuyến nghị đối chiếu đơn/số tiền/đối tác và phản hồi HTTP 204. Cần kiểm tra thêm đúng hợp đồng API sandbox khi triển khai bản sửa.

Đề xuất bắt đầu triển khai ở đợt 0–1, sau đó làm biến thể/SKU. Trước mỗi đợt, chốt quy tắc nghiệp vụ, migration, API, giao diện và tiêu chí nghiệm thu của chính đợt đó.
