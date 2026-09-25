# Quality Report

_Cập nhật: 2026-09-24 · Phạm vi: CORE 1 (Vẹt Vàng Financial Companion)._

Trạng thái được tách bạch: **UNIT** · **INTEGRATION** · **E2E** · **PRODUCTION VERIFIED**. Không gộp thành một con số hoàn thiện.

## 1. Baseline trước khi sửa

| Hạng mục | Kết quả |
|---|---|
| Vitest | 125 pass / **8 fail** (market-overview ×6, dashboard page ×2) |
| `tsc --noEmit` | **31 lỗi** (worker, simulator, scripts, 2 file test) |
| ESLint | 37 lỗi / 109 cảnh báo (toàn bộ ở file có sẵn) |
| Vẹt Vàng | Không tồn tại (xóa ở `34f06ee`) |

## 2. Sau khi triển khai

| Hạng mục | Kết quả |
|---|---|
| Vitest toàn repo | 8 fail **giống hệt baseline** (không thêm lỗi mới); toàn bộ test mới pass |
| Test mới (10 file) | **139 / 139 pass** |
| `tsc` | 31 lỗi — **0 lỗi trong file mới/sửa** |
| ESLint file mới/sửa | 0 lỗi mới (cảnh báo còn lại có sẵn trong `layout.tsx`, ledger components) |
| `npm run build` (webpack) | ✅ exit 0; route `/api/companion/interpret` có trong output |
| Playwright `chromium-companion` | **7 / 7 pass** |

### Coverage module mới (v8)

| File | Lines | Branches |
|---|---|---|
| `finance-snapshot.ts` (engine tính toán) | **100%** | 96.9% |
| `llm-interpret.ts` | 100% | 88.9% |
| `amount.ts` | 100% | 81.8% |
| `intent.ts` | 100% | 90% |
| `transaction-store.ts` | 97.9% | 77.8% |
| `engine.ts` | 94.1% | 76.8% |
| `api/companion/interpret/route.ts` | 84.2% (phần gọi LLM thật không chạy được local) | 94.1% |

## 3. Hành trình

| Journey | UNIT | INTEGRATION (jsdom) | E2E (Chromium) | PRODUCTION |
|---|---|---|---|---|
| J1 Người dùng có ngân sách ghi giao dịch đầu tiên | ✅ | ✅ | ✅ 6 viewport | ❌ chưa |
| J2 Chat → hiểu → xác nhận → lưu → ngân sách cập nhật | ✅ | ✅ | ✅ 6 viewport | ❌ chưa |
| J3 Hỏi tình hình → engine → trả lời đúng số | ✅ | ✅ (0 lệnh fetch) | ✅ ("Ngân sách tháng còn 3.740.000đ / 3.800.000đ") | ❌ chưa |
| J4 Mô phỏng mua sắm | — | — | — | ⏳ Phase 2 |
| J5 Mục tiêu tiết kiệm | — | — | — | ⏳ Phase 2 |
| J6 Quay lại hôm sau | ⚠️ lịch sử chat + dữ liệu khôi phục (integration) | ✅ | — | ⏳ Check-in ở Phase 2 |
| J7 Mất mạng / AI lỗi | ✅ | ✅ offline + AI unavailable | ✅ (API 503) | ❌ chưa |
| J8 Đăng nhập máy khác | ⚠️ đẩy lên (queue) có test; **kéo về chưa có** | — | — | ❌ chưa đạt |

### Tình huống thực tế (mục 9 của yêu cầu)

| Tình huống | Xử lý | Test |
|---|---|---|
| Một giao dịch | thẻ 1 dòng | ✅ |
| Nhiều giao dịch 1 câu | tách theo dấu câu / "và, rồi, +" / nhiều số liền nhau | ✅ |
| Sửa giao dịch | "sửa khoản vừa rồi thành 40k" → thẻ xác nhận; hoặc sửa trực tiếp trên thẻ | ✅ |
| Gửi trùng / nhấn đúp / retry | id là khóa idempotency; guard in-flight; store dedupe | ✅ |
| Số tiền mơ hồ ("phở 35") | hiểu 35.000đ + cảnh báo ⚠ trên thẻ | ✅ |
| Thiếu số tiền ("ăn phở") | hỏi lại, câu sau "35k" hoàn tất | ✅ |
| Đổi ý | Hủy trên thẻ / "thôi", "hủy" | ✅ |
| Mất kết nối | tầng 1 chạy offline; câu khó → báo offline | ✅ |
| LLM trả JSON sai / schema sai / số âm / quá lớn | `invalid` → trả lời cơ bản | ✅ |
| LLM không phản hồi / timeout | 8s abort → "AI tạm thời không phản hồi" | ✅ |
| LLM bịa số tiền | gắn cờ "Số tiền do AI suy ra…"; vẫn phải xác nhận | ✅ |
| Bộ nhớ đầy khi lưu | rollback, báo "Chưa lưu được…", không báo "Đã lưu" | ✅ |
| Supabase lỗi | op ở lại hàng đợi với `lastError`, `attempts++` | ✅ (mock) |
| Chưa đăng nhập | "Đã lưu trên thiết bị này (chưa sao lưu đám mây)" | ✅ |

## 4. Chỉ số

| Chỉ số | Giá trị | Ghi chú |
|---|---|---|
| Intent + số tiền, tầng 1, bộ 35 câu tiếng Việt (`nl-eval.test.ts`) | **100%** (35/35) | Bộ câu do chính người viết parser soạn → lạc quan; cần bộ câu từ người dùng thật |
| Ghi sai số tiền một cách tự tin | 0 / 35 | bất biến an toàn có test |
| Lệnh gọi API cho câu ghi chép/hỏi ngân sách | 0 | test khẳng định `fetch` không được gọi |
| Độ chính xác tầng 2 (LLM) | **chưa đo** | môi trường local không có API key |
| Latency tầng 2 | **chưa đo** | như trên |
| DB reads/writes mỗi tin nhắn | 0 remote cho khách; 1 upsert/lần xác nhận cho người đăng nhập | không đọc toàn bộ DB mỗi tin nhắn |

## 5. Vấn đề còn tồn tại

1. **Chưa PRODUCTION VERIFIED**: chưa deploy; migration Supabase chưa apply; tầng 2 chưa chạy với khóa thật.
2. **J8 chưa đạt**: chưa có đồng bộ kéo về từ Supabase.
3. Giao dịch cũ tạo trước phiên này có id dạng `Date.now()` — không đi qua hàng đợi đồng bộ mới.
4. Hoàn tác xóa trong Sổ giao dịch khôi phục giao dịch nhưng mất liên kết hũ.
5. Lỗi có sẵn chưa sửa: 8 test fail, 31 lỗi TS, Simulator dùng số giả, net worth giả trên Tổng quan.
