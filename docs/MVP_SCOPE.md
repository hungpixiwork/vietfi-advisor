# MVP Scope — Scope Reduction Report

_Cập nhật: 2026-09-24 · Căn cứ: đọc mã nguồn + Git history ở commit `09df3fa` và working tree hiện tại._

## Ba năng lực cốt lõi

| # | Năng lực | Trạng thái |
|---|---|---|
| CORE 1 | Financial Companion (Vẹt Vàng ghi chép + hỏi đáp số liệu) | **Đã triển khai phiên này** — xem `QUALITY_REPORT.md` |
| CORE 2 | Decision Simulator | Có engine, UI dùng số liệu giả → **FIX** (phase tiếp) |
| CORE 3 | Daily Financial Progress (check-in, mục tiêu tiết kiệm) | Chưa có tính năng mục tiêu thật → **INTEGRATE/BUILD** |

## Phân loại module

### KEEP — phục vụ MVP, đang chạy
| Module | Bằng chứng |
|---|---|
| Ngân sách theo hũ (`dashboard/budget`) | Dùng chung đường ghi `transaction-store` từ phiên này |
| Sổ giao dịch (`dashboard/ledger`) | Đã chuyển sang `transaction-store`, tự làm mới khi Vẹt Vàng lưu |
| Onboarding (`QuickSetupWizard`) | Cung cấp thu nhập khai báo cho engine ngân sách |
| Debt optimizer (`lib/calculations/debt-optimizer.ts`) | Engine thuần, sẽ phục vụ CORE 2 |

### FIX — phục vụ MVP nhưng có lỗi
| Module | Lỗi (bằng chứng) | Trạng thái |
|---|---|---|
| Vẹt Vàng chat | API `/api/chat` và UI bị xóa ở commit `34f06ee`; trước đó tool `record_expense` không được truyền vào `streamText` (`streamLLM` bỏ qua `tools`) nên không bao giờ lưu | ✅ Xây lại |
| Trang ngân sách | Ghi đè toàn bộ `vietfi_expenses` từ state cũ → mất giao dịch do view khác vừa lưu; tính "đã chi" từ trước tới nay thay vì theo tháng; xóa hũ xóa luôn giao dịch | ✅ Đã sửa |
| Sổ giao dịch | Ghi đè toàn bộ `vietfi_ledger` từ state cũ (race condition) | ✅ Đã sửa |
| Đồng bộ Supabase | `.catch(() => {})` nuốt lỗi; `saveExpenses` xóa hết rồi chèn lại; bảng `expenses` không có DDL trong repo | ⚠️ Có hàng đợi đồng bộ + migration; **migration chưa apply lên production** |
| Decision Simulator (`dashboard/simulator`) | Import `getPots` không tồn tại → rơi vào số giả (thu nhập 18tr, tiền mặt 35tr, nợ 8tr) và hiển thị như dữ liệu người dùng; 5 lỗi TS | ⏳ Phase 2 |
| Tổng quan (`dashboard/page.tsx`) | Net worth giả `income * 2.5` khi chưa có dữ liệu | ⏳ Phase 2 |

### INTEGRATE — có thuật toán, chưa thành hành trình
| Module | Việc cần làm |
|---|---|
| `lib/finance/engine.ts` (health + simulate) | Nối vào Vẹt Vàng (`simulate_purchase`) với dữ liệu thật từ `readSnapshot()` |
| Morning Brief | Chuyển thành Daily Check-in cá nhân (ngân sách còn, khoản sắp đến hạn) |
| Personal CPI | Chỉ giữ nếu chứng minh được giá trị cho CORE 1–3 |

### FREEZE — ngoài MVP (không xóa, không đầu tư thêm)
Backtest Pro, Stock Screener API, Guru Personas (dùng `Math.random()`), Leaderboard (đối thủ là bot `seededRandom`), News, Market Overview, Housing, Portfolio, Learn, Risk Profile, Cloudflare Worker scaffold (`src/worker/*` — dữ liệu hardcode, chưa commit, chưa deploy).

> Chưa gỡ các mục FREEZE khỏi sidebar trong phiên này — việc thu gọn điều hướng còn 4 khu vực (Today / Companion / Money / Decisions) nằm ở Phase 2.

## Quyết định hạ tầng

Giữ **Next.js trên Vercel + localStorage (khách) + Supabase (đăng nhập)** — đây là stack đang chạy production. Worker Cloudflare/D1 trong working tree chỉ là bản nháp trả dữ liệu hardcode; không thực hiện thêm một cuộc migration khi chưa chứng minh được cần thiết.
