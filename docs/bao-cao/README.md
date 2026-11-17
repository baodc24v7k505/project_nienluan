# Báo cáo tiểu luận

- `BAO_CAO_TIEU_LUAN.md`: bản nguồn để chỉnh sửa nội dung.
- `BAO_CAO_TIEU_LUAN.html`: bản đọc trên trình duyệt, có thể in hoặc mở bằng công cụ soạn thảo hỗ trợ HTML.
- `../../output/pdf/BAO_CAO_TIEU_LUAN_LE_GIA_BAO.pdf`: bản PDF để đọc và đối chiếu bố cục.
- `assets/`: sơ đồ và ảnh chụp từ kiểm thử trên dữ liệu demo. Các ảnh đánh giá trong môi trường test là ảnh minh họa dùng để kiểm tra chức năng, không phải phản hồi khách thật.

Đã soạn nội dung theo source và kết quả kiểm thử ngày 17/11/2026. Cần điền tên trường, khoa/bộ môn, học phần và giảng viên; đối chiếu tên sinh viên, mã số và quy định trình bày của trường trước khi nộp. Chưa có mẫu chính thức từ giảng viên nên không xem bố cục này là đã khớp một mẫu trường cụ thể.

Sau khi cài dependency của frontend và Chromium cho Playwright, tạo lại bản HTML/PDF bằng:

```powershell
node tools/build-report.cjs --pdf
```

Muốn làm mới ảnh, chạy toàn bộ `npm run test:ui` trên API/database kiểm thử riêng trước khi build báo cáo. Script giữ các ảnh đã lưu khi test-results không còn ảnh cũ. Không chạy các kịch bản UI có ghi dữ liệu vào database production.

Mục lục và danh mục hình hiện đã đối chiếu với PDF 27 trang. Nếu thay nội dung, cỡ chữ hoặc ảnh làm đổi phân trang, cần cập nhật hai bảng này rồi xuất lại PDF.

Để kiểm tra bố cục PDF, dùng `pdfinfo` và `pdftoppm` rồi xem ảnh từng trang; việc đọc được nội dung văn bản chưa chứng minh bảng/ảnh không bị lỗi bố cục.
