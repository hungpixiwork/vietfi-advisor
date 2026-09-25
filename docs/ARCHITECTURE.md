# Architecture — Vẹt Vàng Financial Companion

_Cập nhật: 2026-09-24 · Mô tả code đã triển khai, không phải kiến trúc mục tiêu._

## Luồng xử lý

```
Người dùng gõ câu
   │
   ▼
CompanionLauncher (UI, mọi trang dashboard)          src/components/companion/
   │  useCompanion.send()
   ▼
Tầng 1 — detectIntent()  (0 API, chạy offline)       src/lib/companion/intent.ts
   │   ├─ findAmounts()      30k · ba chục · 1tr2 · 1.200.000đ   amount.ts
   │   ├─ parseTransactions() tách nhiều khoản, ngày, thu/chi    transaction-parser.ts
   │   └─ guessCategory()     từ điển danh mục dùng chung        categories.ts
   │
   │  chỉ khi "unknown" hoặc số tiền đọc bằng chữ ("bốn lăm")
   ▼
Tầng 2 — POST /api/companion/interpret               src/app/api/companion/interpret/route.ts
   │   LLM chỉ nhận CÂU CHAT (không số dư, không lịch sử)
   │   → extractJson → zod schema → sanitize            src/lib/companion/llm-interpret.ts
   │   → số tiền không xuất hiện trong câu bị gắn cờ "AI suy ra"
   │   timeout 8s · rate limit 20/phút/IP · không log nội dung
   ▼
Tầng 3 — Engine (hàm thuần, có test)                  src/lib/companion/finance-snapshot.ts
   │   summarizeDay · summarizeMonth · computeBudgetStatus · matchPot
   │   mỗi kết quả kèm limitations (thiếu thu nhập, khoản chưa gắn hũ…)
   ▼
Tầng 4 — respond()  → văn bản + proposal              src/lib/companion/engine.ts
   │   con số chỉ lấy từ engine; ghi/sửa/xóa luôn là PROPOSAL
   ▼
ProposalCard — người dùng sửa số tiền/danh mục/hũ → Lưu / Hủy
   ▼
transaction-store (đường ghi DUY NHẤT)                src/lib/stores/transaction-store.ts
   │   validate → dedupe theo id → ghi ledger + expenses → rollback nếu lỗi
   │   → đọc lại xác minh → phát sự kiện vietfi:finance-changed
   ▼
Kết quả xác minh hiển thị: "✓ Đã lưu 2 giao dịch… Ngân sách tháng còn …"
   │
   ├─ Khách: "Đã lưu trên thiết bị này (chưa sao lưu đám mây)"
   └─ Đăng nhập: hàng đợi vietfi_sync_queue → Supabase upsert theo id   src/lib/supabase/transaction-sync.ts
```

## Công cụ (tool) của Vẹt Vàng

| Tool | Loại | Hàm |
|---|---|---|
| `create_transaction` | ghi (cần xác nhận) | `commitTransactions` |
| `update_transaction` | ghi (cần xác nhận) | `updateTransactionAmount` |
| `undo_transaction` | ghi (cần xác nhận) | `deleteTransaction` |
| `get_spending_today` | đọc | `summarizeDay` |
| `get_financial_summary` | đọc | `summarizeMonth` |
| `get_budget_status` | đọc | `computeBudgetStatus` |

Chưa có: `create_savings_goal`, `get_goal_progress`, `simulate_purchase`, `compare_payment_scenarios`, `get_financial_health` (Phase 2).

## Nguồn dữ liệu có thẩm quyền

| Dữ liệu | Khách | Đăng nhập |
|---|---|---|
| Giao dịch (thu + chi) | `vietfi_ledger` (chính) + `vietfi_expenses` (bản sao gắn hũ, chỉ khoản chi) | localStorage là nguồn chính; đẩy lên `public.expenses` qua hàng đợi |
| Hũ ngân sách | `vietfi_pots` | `vietfi_pots` + `budget_pots` (luồng cũ) |
| Thu nhập khai báo | `vietfi_income` | như khách + `profiles.income` |
| Hàng đợi đồng bộ | — | `vietfi_sync_queue` (id, op, attempts, lastError, queuedAt) |
| Lịch sử chat | `vietfi_companion_history` (40 tin gần nhất, không phải dữ liệu tài chính gốc) | như khách |

**Bất biến**
1. Chỉ `transaction-store` ghi giao dịch. Trang ngân sách, sổ giao dịch, Vẹt Vàng đều gọi nó → không view nào ghi đè dữ liệu view khác vừa lưu.
2. Id giao dịch do client sinh (`crypto.randomUUID`) và là khóa idempotency, cả local lẫn Supabase (`upsert onConflict: id`). Retry/nhấn đúp không tạo bản ghi trùng.
3. "Đã lưu" chỉ hiển thị sau khi đọc lại storage thấy đủ giao dịch.
4. Op đồng bộ thất bại ở lại hàng đợi kèm lỗi; không bao giờ được đánh dấu "đã đồng bộ" khi Supabase chưa xác nhận.

## Bảo mật & quyền riêng tư

- LLM không nhận số dư, lịch sử hay hồ sơ — chỉ câu chat (≤ 500 ký tự). Test `route.test.ts` kiểm tra trường lạ trong body không lọt vào prompt.
- Chống prompt injection: nội dung người dùng được rào trong thẻ `message`, ký tự `<>` bị loại; đầu ra chỉ có thể là 1 trong 8 intent cố định; mọi thao tác ghi vẫn phải qua thẻ xác nhận.
- Supabase: RLS `user_id = auth.uid()` trên `public.expenses` (migration `20260924000000_expenses_transactions.sql`).
- API key chỉ ở server (`getLlmModel`), không bao giờ gửi xuống client.

## Việc chưa làm (giới hạn đã biết)

- Đồng bộ **hai chiều** chưa có: đăng nhập máy khác chưa kéo giao dịch từ Supabase về (Journey 8 chưa đạt).
- Migration `20260924000000_expenses_transactions.sql` chưa apply lên Supabase production → giao dịch thu nhập sẽ nằm "chờ đồng bộ" cho tới khi apply.
- Worker Cloudflare (`src/worker`) không nằm trong luồng này.
