# Implementation Plan

_Cập nhật: 2026-09-24. Nguyên tắc: xong trọn một năng lực (frontend + backend + dữ liệu + test) rồi mới sang năng lực tiếp theo._

## Phase 0 — Discover ✅

- Kiểm toán repo, Git history, baseline test (xem `QUALITY_REPORT.md` §1).
- Nguyên nhân chatbot chết (bằng chứng Git):
  - `0d31dad`/`00611f0`: `record_expense` được khai báo bằng API AI SDK v4 (`parameters`) trong khi dự án dùng `ai@6`; và `streamLLM()` (`lib/infrastructure/llm/client.ts`) **không truyền `tools`** vào `streamText` → tool không bao giờ chạy, model chỉ *nói* là đã ghi.
  - `zod` được import trong route nhưng không khai báo trong `package.json`.
  - Client ghi thẳng `localStorage` bằng `require()` ở 2 nơi, không xác nhận, không kiểm chứng; ngữ cảnh tài chính gửi lên dưới dạng chuỗi tự do.
  - `34f06ee`: xóa luôn `api/chat`, `VetVangChat.tsx`, `VetVangFloat.tsx` — chatbot thành dead code.
- Scope reduction: `MVP_SCOPE.md`.

## Phase 1 — CORE 1: Vẹt Vàng Financial Companion ✅ (local) / ⚠️ (production)

| Việc | Trạng thái |
|---|---|
| Parser số tiền tiếng Việt (30k, ba chục, 1tr2, 1,2 triệu, 1.200.000đ, rưỡi…) | ✅ |
| Tách nhiều giao dịch/câu, thu vs chi, "hôm qua" | ✅ |
| Intent tầng 1: ghi, hỏi hôm nay/tháng/ngân sách, sửa, xóa, hủy, hỏi số tiền còn thiếu | ✅ |
| Engine ngân sách/tháng/ngày thuần TS | ✅ |
| Tầng 2 LLM có schema + timeout + rate limit + chống injection | ✅ (chưa chạy với khóa thật) |
| Thẻ xác nhận sửa được số tiền/danh mục/hũ | ✅ |
| Đường ghi duy nhất, idempotent, rollback, xác minh sau ghi | ✅ |
| Budget page + Ledger dùng chung đường ghi, tự làm mới | ✅ |
| Hàng đợi đồng bộ Supabase + migration DDL/RLS | ✅ code · ⏳ **cần apply migration lên production** |
| E2E 6 viewport + unit/integration | ✅ |

**Việc cần người có quyền production thực hiện**
1. Review & apply `supabase/migrations/20260924000000_expenses_transactions.sql` (chỉ thêm cột/ràng buộc, không xóa dữ liệu). Sao lưu bảng `expenses` trước.
2. Kiểm tra `GEMINI_API_KEY` (hoặc provider khác) trên Vercel để bật tầng 2; chạy thử 20 câu từ `nl-eval.test.ts` qua `/api/companion/interpret`.
3. Deploy và chạy `BASE_URL=<preview-url> npx playwright test --project=chromium-companion`.

## Phase 2 — CORE 2 + nối trải nghiệm (tiếp theo)

| # | Việc | Phụ thuộc | Done khi |
|---|---|---|---|
| 2.1 | Sửa Simulator: bỏ `getPots` + số giả, lấy hồ sơ từ `readSnapshot()` + nợ thật; hiển thị "thiếu dữ liệu" thay vì bịa | Phase 1 | Không còn hằng số 18tr/35tr/8tr; test engine với dữ liệu thiếu |
| 2.2 | Tool `simulate_purchase` / `compare_payment_scenarios` trong Vẹt Vàng ("mua iPhone 15tr trả góp hay trả thẳng?") → hỏi thông tin thiếu → FACT/CALCULATION/ASSUMPTION | 2.1 | Journey 4 E2E pass |
| 2.3 | Mục tiêu tiết kiệm thật (`vietfi_goals` + bảng Supabase), tool `create_savings_goal` / `get_goal_progress` | Phase 1 | Journey 5 E2E pass |
| 2.4 | Daily Check-in trên Tổng quan: ngân sách còn/ngày, khoản sắp đến hạn, tiến độ mục tiêu, 1 hành động; bỏ net worth giả `income*2.5` | 2.3 | Journey 6 E2E pass |
| 2.5 | Thu gọn điều hướng còn Today / Money / Decisions (+ Vẹt Vàng nổi); ẩn module FREEZE | 2.4 | Sidebar ≤ 4 mục chính |

## Phase 3 — Harden

- Đồng bộ hai chiều khi đăng nhập (kéo `expenses` về, gộp theo id, xung đột: bản `updated_at` mới hơn thắng) → Journey 8.
- Xuất/xóa dữ liệu cá nhân (CSV + xóa toàn bộ local + remote).
- Sửa 8 test fail có sẵn (market-overview, dashboard page) và 31 lỗi TS có sẵn.

## Phase 4 — Verify

Chạy toàn bộ unit + E2E trên preview deploy, đo latency tầng 2, cập nhật `QUALITY_REPORT.md` với trạng thái PRODUCTION VERIFIED.
