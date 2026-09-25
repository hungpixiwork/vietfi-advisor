# 🎯 KẾ HOẠCH NÂNG CẤP & PHÂN CÔNG (WDA2026)
**Dành cho phiên làm việc hiện tại và ca đêm (10pm - ## 🧭 CHIẾN LƯỢC TRÁNH CONFLICT (Cập nhật mới)
Để Hoàng và AI (Hưng) làm việc song song hiệu quả nhất, chúng ta áp dụng phân công sau:

- **Hoàng (Dev - Ca Đêm 10pm - 2am):** Tập trung thuần vào **Crawl Data**, **Tinh chỉnh Bảo mật**, và chỉnh sửa/tối ưu **Giao diện (UI)**.
- **Hưng (AI - Ca Ngày):** Đảm nhiệm việc **Phát triển Tính năng (Business Logic, Tính toán, Flow)** và **Kiểm tra code/đối chiếu** xem sản phẩm có đáp ứng sát với yêu cầu của Đề thi WDA2026 hay không.

---

## 🚨 VẤN ĐỀ 1: TRUNG TÂM QUẢN TRỊ NỢ TẬP TRUNG
*Giải quyết nỗi đau: Chia nhỏ nợ (SPayLater, Thẻ tín dụng, Vay tiêu dùng) dẫn đến ảo tưởng khả năng chi trả, dính lãi ẩn/phí phạt cao, sụp đổ domino.*

### 🧑‍💻 Hưng (AI) - Logic Tính Năng & Đối chiếu Đề thi
1. **Phát triển Logic Tối ưu Nợ (`lib/calculations/debt-optimizer.ts`)**:
   - Viết các thuật toán tính "Lãi suất thực tế" (AER bao gồm phí ẩn).
   - Xây dựng mô hình tính toán "Hiệu ứng Domino Nợ" (Nợ/Thu nhập thực tế > 60%).
   - Hoàn thiện Logic Snowball & Avalanche Plan.
2. **Kiểm tra Đề thi**: Liên tục rà soát xem các tính năng này có đúng với pain-point mà WDA2026 đặt ra hay không (Centralized Hub, Hiệu ứng Domino).

### 🦉 Hoàng (Night Shift) - Giao diện, Cào Dữ Liệu & Bảo mật
1. **Tinh chỉnh UI Dashboard Nợ (`src/app/dashboard/debt/page.tsx`)**:
   - Làm đẹp giao diện biểu đồ, form nhập liệu lãi ẩn cho SPayLater/Credit Card.
2. **Bảo mật & Supabase**:
   - Đảm bảo dữ liệu nợ của User được lưu an toàn (RLS Policies).
3. **Crawl Data**: Cào thêm thông tin khung lãi suất phạt của các loại thẻ tín dụng phổ biến (nếu có thể).

---

## 📈 VẤN ĐỀ 2: CỐ VẤN ĐẦU TƯ ĐẢ THÔNG "TÊ LIỆT TÀI CHÍNH"
*Giải quyết nỗi đau: Lạm phát làm tiền nằm yên "bốc hơi", nhưng phân bổ vốn giữa các kênh lại quá phức tạp.*

### 🧑‍💻 Hưng (AI) - Prompting & Phát triển Tính năng
1. **Phát triển Flow "Risk DNA" & Action Cards**:
   - Gắn kết (1) Dòng tiền dư, (2) Điểm F&G, (3) Mục tiêu sống vào logic của Portfolio.
2. **Vẹt Vàng AI (`VetVangChat.tsx`)**: 
   - Viết/Nâng cấp Prompt để AI tư vấn dựa trên dữ liệu vĩ mô crawl được, đúng với tinh thần "thực dụng".
3. **Review WDA2026**: Đảm bảo app đóng vai trò "Cố vấn ảo" đúng nghĩa (không chỉ thống kê tĩnh).

### 🦉 Hoàng (Night Shift) - Giao diện, Cào Dữ Liệu & Alert
1. **Cào dữ liệu (Crawler) & Cron Jobs**:
   - Viết script cào lãi suất Ngân hàng (VCB, BIDV...), CPI định kỳ.
   - Viết Cron Jobs chạy background để chấm điểm Sentiment, bắn Alert.
2. **Giao diện Market/Portfolio**:
   - Tinh chỉnh UI cho các Action Cards, làm mượt animation của Vẹt Vàng.
3. **Bảo mật API**: Đảm bảo các route `/api/market-data` hay `/api/morning-brief` không bị gọi lạm dụng. Liệu Rộng Hơn & Real-time (Server-side)
1. **Nâng cấp API Market Data (`/api/market-data`)**:
   - Hiện tại đã có Gold, Crypto, VNIndex. Cần cào/tổng hợp thêm **Lãi suất huy động trung bình 12/6T của các Bank** (Vcb, Bidv, MB) để làm mỏ neo so sánh (VD: 4.8%).
   - Tìm cách cào **Lạm phát CPI định kỳ** hoặc dữ liệu giá cả để đối chiếu xem tiết kiệm đang thắng hay thua.
2. **Sentiment Crawler Nâng cao (`/lib/market-data`)**:
   - Tính logic Fear & Greed chuyên cho thị trường Việt Nam (thanh khoản phái sinh, tỷ lệ margin nếu cào được từ TCBS).
3. **Alert Hệ Thống (Cron Job)**:
   - Khi `marketAlert` kích hoạt (VD: VNIndex rơi > 20đ, Fear Index < 25), tự động lưu 1 record vào bảng `notifications` để sáng user vào app là Vẹt Vàng "Hú" lên ngay trong Chat.

---

## 📋 GIAO DỊCH QUY TẮC ("RULE OF ENGAGEMENT")
1. **Hưng (AI)** Không bao giờ update file trong thư mục `/api/` (nếu không được phép rõ ràng) và không lạm dụng API key trong UI, chỉ gọi fetcher tĩnh. Đẩy mượt animation và tính Actionable.
2. **Hoàng** Khi xử lý Supabase/API, chỉ cần ném Data JSON thô ra chuẩn (đúng Schema TypeScript). Hưng sẽ tự lo phần hiển thị mượt mà.
3. Trước khi đi ngủ hoặc xong ca, Hoàng luôn tạo tag/commit rõ ràng: `feat(api): ...` để Hưng sáng hôm sau đọc log là hiểu ngay.
