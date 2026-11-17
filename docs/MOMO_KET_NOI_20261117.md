# Đối chiếu lỗi kết nối MoMo sandbox ngày 17/11/2026

## Phạm vi và kết quả đã xác nhận

Người dùng xác nhận trước đây MoMo hoạt động cả trên localhost và website online, hiện chỉ có Render/Vercel và chưa có tài khoản merchant sandbox riêng. Các phép thử dùng thông tin mẫu sandbox đang có của dự án, không dùng khóa production, không thực hiện thanh toán ví.

Endpoint: `https://test-payment.momo.vn/v2/gateway/api/create`.

| Môi trường | Cách gọi | Kết quả |
|---|---|---|
| Windows local, Node 22.20.0 | Axios theo yêu cầu của bản cũ `defec74`, fetch hiện tại, HTTPS IPv4 | Cả ba HTTP 200, JSON `resultCode: 0`, có `payUrl` |
| Windows local, Node 24.14.1 | Cùng ba cách gọi | Cả ba HTTP 200, JSON `resultCode: 0`, có `payUrl` |
| Render, Node 24.14.1 | Cùng ba cách gọi | Cả ba HTTP 403, HTML từ nginx, không có JSON kết quả MoMo |
| Vercel Node | POST JSON rỗng, chỉ kiểm tra khả năng kết nối | HTTP 403, HTML từ nginx, không có JSON kết quả MoMo |
| Vercel Edge | POST JSON rỗng, chỉ kiểm tra khả năng kết nối | HTTP 403, HTML, không có JSON kết quả MoMo |

Các yêu cầu so sánh được ký đúng với mã thử riêng, số tiền 10.000 VND. Phép thử Vercel chỉ gửi `{}`, không có khóa, số tiền hoặc đơn hàng. Local và Render phân giải cùng địa chỉ IPv4 trong lần đối chiếu. Bản payload cũ cũng gặp lỗi trên Render; chưa có căn cứ cho rằng rollback code hoặc hạ Node sẽ khôi phục kết nối.

HTTP 403 dạng HTML khác với JSON `resultCode` của API thanh toán. Kết quả cho thấy sự khác biệt phụ thuộc môi trường kết nối, nhưng chưa xác định chính sách hoặc thành phần cụ thể nào từ chối. Không thể kết luận chắc chắn rằng đăng ký merchant mới sẽ tự giải quyết lỗi này.

Các endpoint chẩn đoán tạm thời chỉ dành cho ADMIN đã được gỡ sau đối chiếu. Không để lại relay thanh toán, không sao chép khóa MoMo sang Vercel hoặc trình duyệt.

## Lỗi cấu hình đã sửa

Trên Render, `MOMO_IPN_URL` trước đó trỏ sai domain `ecom-backend.onrender.com`. Đã đổi thành:

```text
https://ecom-backend-g2m7.onrender.com/api/payments/momo/ipn
```

Backend đã redeploy sau thay đổi. Đối chiếu lại vẫn nhận HTTP 403 ở bước tạo liên kết, vì vậy sửa IPN là cần thiết nhưng chưa khôi phục thanh toán online. README đã bỏ hướng dẫn đoán domain Render theo tên service.

## Trạng thái ứng dụng

- Đã xử lý lỗi gateway thành HTTP 503 có mã `MOMO_GATEWAY_BLOCKED`, thay cho HTTP 500 chung chung.
- Giữ nguyên định danh lần thử khi retry chưa xác định kết quả; không ghi nhận đã thanh toán từ lỗi kết nối.
- Chữ ký callback, mã đơn, số tiền và trạng thái đơn vẫn được kiểm tra phía backend.
- Đã tạo đơn thử trên database local, nhận liên kết sandbox thật, kiểm tra trạng thái `PENDING`, rồi hủy đúng đơn thử và hoàn kho. Chưa xác nhận giao dịch ví hoặc IPN thực tế.
- Bộ kiểm thử liên quan có 14 unit và 27 integration. MoMo được giả lập trong kiểm thử tự động; kết quả này không chứng minh giao dịch ví hoạt động online.

## Thông tin để trao đổi với đơn vị cung cấp

Nếu cần yêu cầu kiểm tra kết nối, cung cấp thời điểm kèm múi giờ, endpoint, HTTP status/content-type, môi trường Render/Vercel và mã lần thử được trích từ log đã lọc. Không gửi secret key, chuỗi ký hoặc toàn bộ biến môi trường.

Với hạ tầng hiện có, chỉ coi luồng online được khôi phục khi máy chủ tạo được `payUrl` và một giao dịch sandbox có callback hợp lệ cập nhật đúng đơn. Có thể dùng local để trình diễn bước tạo liên kết theo [hướng dẫn chạy local](KIEM_THU_VA_TRIEN_KHAI.md), lưu ý localhost không nhận được IPN công khai.
