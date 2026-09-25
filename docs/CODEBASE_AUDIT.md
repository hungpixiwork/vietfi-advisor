# BÁO CÁO TỔNG HỢP KIỂM TOÁN CODEBASE VIETFI ADVISOR (MASTER CODEBASE AUDIT)

**Dự án**: VietFi Advisor (`vietfi-advisor`)  
**Tài liệu SSOT**: `docs/CODEBASE_AUDIT.md`  
**Ngày thực hiện**: 22/09/2026  
**Đơn vị thực hiện**: Antigravity Orchestrator (Tổng hợp từ 10 Subagent chuyên sâu)  
**Cam kết phương pháp luận**: Runtime truth > Documentation > Assumptions. Mọi kết luận đều dựa trên kiểm chứng mã nguồn thực tế, lịch sử Git, kiểm thử và đo lường định lượng.

---

## 1. Kiến Trúc Hiện Tại (Current Architecture)

### 1.1. Thực Trạng Hạ Tầng & Runtime
- **Frontend**: Next.js 16.2.3 (App Router), React 19.2.3, Tailwind CSS v4, Framer Motion v12.
  - Lạm dụng chỉ thị `'use client'`: Toàn bộ Landing Page (`src/app/page.tsx` - 1,386 dòng) và 13/14 trang Dashboard đều là Client Components. Server Components hầu như không được khai thác.
  - Cưỡng bức giao diện Dark Mode (`<html className="dark">`, `--color-bg: #0a0a0f`) và tràn ngập 70+ điểm dùng Glassmorphism (`backdrop-blur-*`, `.glass-card`), vi phạm nghiêm trọng quy chuẩn bắt buộc Light Mode (`#F8FAFC`, `#0F172A`).
- **Backend & API**: Next.js Route Handlers (Node.js & Edge runtime), cấu hình Vercel Serverless (`vercel.json`).
  - 14 route handlers đang hoạt động; 1 ghost route (`POST /api/chat`) đã bị xóa trong commit `34f06ee` nhưng vẫn được mô tả trong `AGENTS.md`.
  - Cron routes (`/api/cron/*`) thiết kế cho Vercel Cron, trong đó `/api/cron/morning-brief` chỉ khai báo `POST` dẫn đến lỗi HTTP 405 vì Vercel Cron mặc định gửi HTTP `GET`.
- **Dữ liệu & Đồng bộ (Data Layer)**:
  - Dual-DAL phân mảnh: Phía khách vãng lai (Guest) dùng `localStorage` (36 accessors trong `src/lib/storage.ts`); phía đăng nhập dùng Supabase PostgreSQL.
  - Tồn tại 2 bộ wrapper Supabase song song (`src/lib/supabase/` và `src/utils/supabase/`).
  - Thiếu DDL migrations gốc: Toàn bộ bảng người dùng (`profiles`, `budget_pots`, `expenses`, `debts`, `gamification`) chỉ có script vá RLS, thiếu hoàn toàn câu lệnh `CREATE TABLE` trong repo.
- **AI & External Data**:
  - LLM: Vercel AI SDK (`ai`, `@ai-sdk/google`, `@ai-sdk/openai`), gọi Gemini 2.5 Flash Lite với fallback OpenAI/Zen qua `src/lib/infrastructure/llm/client.ts`.
  - Cào thị trường: CafeF, GiaVang, DOJI, SBV, Yahoo Finance, CoinGecko kết nối trực tiếp trong Route Handlers.

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Trình duyệt)"]
        UI["Next.js 16 Pages ('use client' 95%)"]
        LS["localStorage (Guest Data)"]
        UI -->|Đọc/Ghi cục bộ| LS
    end

    subgraph Serverless ["Next.js Serverless (Vercel)"]
        API["14 API Route Handlers"]
        Cron["Vercel Cron (Lỗi 405 do POST/GET)"]
        DAL["Dual DAL (src/lib/supabase vs src/utils/supabase)"]
        Crawler["Crawler Services (CafeF, DOJI, SBV)"]
        LLM["AI Infrastructure (Gemini 2.5 Flash Lite)"]
    end

    subgraph DataStore ["External Services"]
        Supa[("Supabase PostgreSQL (Thiếu DDL gốc)")]
        ExtAPI["TCBS, DOJI, SBV, CafeF, CoinGecko"]
        Google["Google Gemini API"]
    end

    UI -->|Fetch không debounce / no-store| API
    API --> DAL
    DAL -->|PostgREST| Supa
    API --> Crawler --> ExtAPI
    API --> LLM --> Google
    Cron -->|Bypass header không an toàn| API
```

---

## 2. Bản Đồ Tính Năng Vận Hành (Runtime Feature Map)

Dựa trên kết quả rà soát của Agent 01 (`docs/audit/01-runtime-reality.md`), toàn bộ 19 tính năng được đối soát thực tế tại runtime:

| STT | Feature | UI | API | Logic | DB | AI | Runtime Status | Bằng chứng mã nguồn / Runtime Reality |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 1 | **Net worth** | Có | Không | Có | Local + Supabase | Không | **WORKING** | `src/app/dashboard/page.tsx` tính từ hũ tài sản và lịch sử giao dịch sổ cái. |
| 2 | **Budget** | Có | Không | Có | Local + Supabase | Không | **WORKING** | Quản lý 6 hũ chi tiêu, phân bổ ngân sách, ghi nhận chi tiêu tại `cashflow?tab=budget`. |
| 3 | **Debt** | Có | Không | Có | Local + Supabase | Không | **WORKING** | Tối ưu nợ Snowball/Avalanche, tính DTI domino, Bác sĩ nợ khẩn cấp khi DTI > 40%. |
| 4 | **Cashflow** | Có | Không | Có | Local + Supabase | Không | **WORKING** | Tích hợp đồng thời `BudgetPage` và `LedgerPage` qua URL tabs. |
| 5 | **Backtest Pro** | Có | Có | Có | Cần Supabase DB | Không | **PARTIAL** | UI TradingView + chỉ số Sharpe/Drawdown tốt; nhưng phụ thuộc bảng `ohlcv_bars`, lỗi 500 nếu thiếu dữ liệu seed. |
| 6 | **Guru personas** | Có | Không | Tĩnh | Không | Không | **MOCK** | 5 Guru; trang chi tiết `/gurus/[id]` dùng `Math.random()` và watchlist hardcode. |
| 7 | **Housing** | Có | Không | Có | Dữ liệu tĩnh | Không | **WORKING** | Bảng giá BĐS tham chiếu, so sánh chi phí Mua vs Thuê (`src/app/dashboard/housing`). |
| 8 | **Leaderboard** | Có | Không | Có | LocalStorage | Không | **MOCK** | UI Duolingo rank rất đẹp nhưng 14 đối thủ là bot ảo sinh bằng `seededRandom()`. |
| 9 | **Learn** | Có | Không | Có | LocalStorage | Không | **WORKING** | 5 bài học vi mô + Quiz trắc nghiệm + thưởng XP + Confetti (`/dashboard/learn`). |
| 10 | **Ledger** | Có | Không | Có | LocalStorage | Không | **WORKING** | Sổ ghi chép thu chi, lọc theo kỳ, hỗ trợ nút Undo giao dịch tức thì qua Toast. |
| 11 | **Market overview** | Có | Có | Có | Fallback cache | Không | **WORKING** | 3 tab (Tâm lý F&G, Tài sản VN-Index/Vàng/USD/BTC, Vĩ mô GDP/CPI). Fallback bền bỉ. |
| 12 | **News** | Có | Có | Có | In-memory cache | Heuristic | **WORKING** | Cào RSS CafeF, VnExpress, Tuổi Trẻ. Gắn nhãn cảm xúc bằng Heuristic Regex. |
| 13 | **Personal CPI** | Có | Không | Có | LocalStorage | Không | **WORKING** | Thanh trượt 7 nhóm rổ hàng hóa GSO, đồng bộ từ hũ thực tế, tính tỷ lệ lạm phát cá nhân. |
| 14 | **Portfolio** | Có | Có | Có | LocalStorage | Không | **WORKING** | Phân bổ tài sản thích ứng theo rủi ro & F&G, đồ thị dự phóng tài sản 10 năm. |
| 15 | **Risk profile** | Có | Không | Có | LocalStorage | Không | **WORKING** | Trắc nghiệm 5 câu hỏi tâm lý học tài chính Prospect Theory phân loại khẩu vị rủi ro. |
| 16 | **Spending insights**| Có | Không | Có | LocalStorage | Không | **WORKING** | Thực chất là alias re-export component `PersonalCPIPage` (`/dashboard/spending-insights`). |
| 17 | **Vẹt Vàng Chat** | Không | Không | Rác | Không | Không | **DEAD** | Đã bị xóa sạch UI và API `POST /api/chat` ở commit `34f06ee`. File persona và scripts trở thành dead code. |
| 18 | **Morning Brief** | Có | Có | Có | File cache 24h | Có (Fallback) | **WORKING** | Tự động tổng hợp số liệu thị trường + 4 tin nóng. Tự fallback sang Heuristic nếu thiếu LLM key. |
| 19 | **Stock screener** | Không | Có | Có | TCBS API Cache | Không | **PARTIAL** | API `GET /api/stock-screener` chạy tốt, nhưng 100% không có UI trong `src/app`. |

---

## 3. Tỷ Lệ Trạng Thái Tính Năng Định Lượng (Feature Health %)

Tổng số 19 module/tính năng được kiểm toán:

```
┌─────────────────────────────────────────────────────────────┐
│ WORKING (Hoạt động thực tế): 13/19 (68.4%)                 │
│ PARTIAL (Thiếu UI hoặc DB):    2/19 (10.5%)                 │
│ MOCK (Dữ liệu giả lập 100%):   2/19 (10.5%)                 │
│ DEAD (Đã bị xóa/Không chạy):   1/19 ( 5.3%)                 │
│ BROKEN (Lỗi runtime API/Cron): 1/19 ( 5.3%)                 │
└─────────────────────────────────────────────────────────────┘
```

- **Working (68.4%)**: Các engine tính toán tài chính thuần Client-side (Debt, Budget, Cashflow, CPI, Risk, Learn) và các API cào thị trường vĩ mô có fallback hoạt động rất xuất sắc.
- **Partial (10.5%)**: Backtest Pro (thiếu seed DB), Stock screener (có API nhưng thiếu UI).
- **Mock (10.5%)**: Chi tiết Gurus và Leaderboard hoàn toàn không có dữ liệu thực tế.
- **Dead (5.3%)**: Vẹt Vàng Chat AI và voice TTS (bị disable trả 405).
- **Broken (5.3%)**: Cron Morning Brief lỗi method Vercel, Bitcoin alert dùng sai tên field (`data.btcUsdt` thay vì `data.btc`).

---

## 4. Nợ Kỹ Thuật Chính (Main Technical Debt)

1. **Sai lệch Tài liệu và Runtime (Documentation Drift)**:
   - `AGENTS.md` và `README.md` vẫn mô tả Vẹt Vàng AI Chatbot là "viral core loop số 1" dù code đã bị xóa hoàn toàn.
   - `CLAUDE.md` ở thư mục gốc thực chất là báo cáo kiểm toán Quant của thành viên cũ, bị đặt sai vị trí.
2. **Polling Vô Tận Tàn Phá Hiệu Năng**:
   - `GamificationBar` trong `src/app/dashboard/layout.tsx:137-146` dùng `setInterval(..., 1000)` đọc `localStorage` mỗi giây, ép component re-render 60 lần/phút gây nóng máy và tốn pin.
3. **Spamming Fetch Không Debounce**:
   - `src/app/dashboard/portfolio/page.tsx:124-133` bắn đồng thời 2 API `/api/portfolio/backtest` và `/api/portfolio/projection` trên mỗi ký tự người dùng gõ vào ô nhập vốn đầu tư.
4. **Trùng Lặp và Xung Đột Nguồn Dữ Liệu**:
   - Hai cron job `/api/cron/sync-market` (DNSE) và `/api/cron/market-data` (TCBS) cùng ghi đè vào bảng `ohlcv_bars`. Cron DNSE dính bug `b.symbol` khiến trường ticker bị `undefined`.
5. **Zombie Packages**:
   - Cài đặt 7 thư viện thừa không sử dụng: `hooks` (gói năm 2012), `@google/generative-ai` (thừa), `edge-tts-universal` (đã tắt), `@ai-sdk/react`, `lottie-react`, `dotenv`, `@tanstack/react-query`.

---

## 5. Bản Đồ Phụ Thuộc Supabase (Supabase Dependency Map)

Kiểm toán từ Agent 04 xác định 16 vị trí phụ thuộc Supabase đang phân mảnh:

```
[src/lib/supabase/] (SSR chuẩn mới)
  ├── client.ts ───────── createBrowserClient
  ├── server.ts ───────── createServerClient (cookies)
  ├── middleware.ts ───── updateSession helper
  ├── user-data.ts ────── Hybrid DAL (Profiles, Pots, Debts, Expenses, Gamification)
  ├── migrate-local.ts ── localStorage -> Supabase one-way sync
  └── useUserData.ts ──── React Query hooks (Dead code - chưa mount)

[src/utils/supabase/] (SSR clone cũ - trùng lặp)
  ├── client.ts
  ├── server.ts
  └── middleware.ts ───── middleware.ts ở root vẫn đang trỏ vào đây!

[SQL Migrations]
  ├── supabase/migrations/20260416000000_security_rls_policies.sql (Chỉ có RLS, THIẾU DDL CREATE TABLE)
  ├── supabase/migrations/20260418112300_market_data_schema.sql (Schema rác - không dùng)
  └── docs/supabase/ohlcv_bars_migration.sql (Dùng cho Backtest)
```

- **Mức độ phụ thuộc tính năng**:
  - RPC: **0%** sử dụng.
  - Realtime: **0%** sử dụng.
  - Storage: **0%** sử dụng.
  - Supabase Cron: **0%** sử dụng.
  - Auth & Database: Chỉ phục vụ lưu trữ 5 bảng tài chính người dùng và bảng nến chứng khoán.
  - 👉 **Kết luận**: Có thể loại bỏ Supabase 100% để chuyển sang Cloudflare D1 và KV mà không làm mất bất kỳ tính năng nghiệp vụ nào.

---

## 6. Bản Đồ Phụ Thuộc AI (AI Dependency Map)

Kiểm toán từ Agent 06 chỉ rõ hiện trạng gọi mô hình:

```
[External Triggers]
  ├── GET /api/morning-brief ──> generateMorningBrief() ──> Gemini 2.5 Flash Lite (Có Heuristic Fallback)
  ├── GET /api/news ───────────> reviewWithAi() ──────────> Lặp 6 lần tuần tự (Chậm 12s, nên gộp batch)
  └── [Cũ - Dead] ────────────> POST /api/chat (Đã xóa khỏi mã nguồn)

[Thành phần Deterministic bị giao nhầm cho LLM]
  ├── Chấm điểm sentiment tin tức (0-100) ──> Nên tính bằng trọng số từ điển Heuristic.
  ├── Phân bổ tài sản danh mục (%) ────────> Phải do thuật toán rebalance.ts phụ trách để chống Hallucination.
  └── Tỷ lệ DTI & Quy tắc 50/30/20 ────────> Đã có engine toán thuần, không để AI suy đoán.
```

- **Zombie SDK**: `@google/generative-ai` hoàn toàn không có import trong mã nguồn thực tế (chỉ dùng `@ai-sdk/google`).
- **Rủi ro cốt tử**: Thiếu Native Structured Outputs (`generateObject` với Zod schema). Code hiện tại dùng regex bóc tách JSON thủ công dễ gãy khi model trả về định dạng lạ.

---

## 7. Đánh Giá Độ Khó Chuyển Đổi Sang Cloudflare (Cloudflare Migration Difficulty)

| Hạng mục | Đích chuyển đổi | Độ khó | Rủi ro | Giải pháp kỹ thuật |
| :--- | :--- | :---: | :---: | :--- |
| **Frontend** | Cloudflare Workers Assets / Pages | **Thấp** | Thấp | Cấu hình Next.js `output: 'export'`, build HTML/CSS tĩnh siêu tốc. |
| **API Backend** | Cloudflare Worker (Hono Router) | **Thấp - TB** | Thấp | Chuyển 8 endpoint cốt lõi sang Hono, sử dụng `nodejs_compat`. |
| **Database** | Cloudflare D1 (SQLite) | **Thấp** | Rất thấp | Chuyển 12 bảng PostgreSQL sang SQLite D1, dùng DAL đơn giản hóa. |
| **Caching** | Cloudflare KV & Edge Cache API | **Rất thấp** | Không | Lưu trữ Screener (30m), Morning Brief (24h) và Market Live (5m). |
| **Scheduled Jobs**| Worker `scheduled()` Cron Trigger | **Rất thấp** | Không | Thay thế toàn bộ Vercel Cron bằng Cron Triggers nội bộ của Cloudflare. |
| **File Storage** | Cloudflare R2 | **Thấp** | Không | Lưu ảnh minh chứng và reports với 0đ chi phí Egress. |

👉 **Tổng điểm độ khó**: **THẤP - TRUNG BÌNH (3/10)**. Kiến trúc hiện tại phần lớn xử lý client-side hoặc tính toán TypeScript thuần, rất tương thích với Cloudflare Workers và D1.

---

## 8. Vấn Đề Bảo Mật & Lộ Khóa (Security Findings)

Theo báo cáo của Agent 08 (`docs/audit/08-security.md`):

1. 🔴 **CRITICAL - Rò rỉ Gemini API Key thật trong Git**:
   - `scratch/list-models.mjs`, `scratch/test-chat-api.mjs`, `scratch/test-gemini-direct.mjs`, `scratch/test-gemini-stream.mjs` chứa key: `AIzaSyDIiq9g1aIq_vUjox8ANR_RPrMwCelCJxc`. Cần xóa file và thu hồi key lập tức.
2. 🔴 **CRITICAL - Hardcoded DOJI API Key**:
   - `src/lib/market-data/crawler.ts:260, 400`: `apiKey = process.env.DOJI_API_KEY || '258fbd2a72ce8481089d88c678e9fe4f'`.
3. 🔴 **CRITICAL - Cửa sau Authentication Bypass**:
   - `src/app/api/backtest/route.ts:23` và `src/app/dashboard/backtest/page.tsx:199`: Hardcode kiểm tra `x-demo-bypass === "hungpixi-demo"` để bỏ qua auth guard.
4. 🔴 **CRITICAL - Fail-Open Auth trong Cron Routes**:
   - `src/app/api/cron/market-alert/route.ts` kiểm tra `if (process.env.CRON_SECRET && ...)`. Nếu biến môi trường chưa đặt, bất kỳ ai cũng kích hoạt cron được.
5. 🟠 **HIGH - Lộ lỗi cơ sở dữ liệu trên Production**:
   - Debug routes `/test-ssr` và `/test-supabase` in stack trace và cấu hình PostgreSQL ra giao diện người dùng.

---

## 9. Vấn Đề Hiệu Năng & Tải Trọng (Performance & Payload Findings)

Theo báo cáo của Agent 07 (`docs/audit/07-performance.md`):

1. **Thư mục tĩnh `public/` phình to 18.84 MB, trong đó 17.06 MB (> 90.5%) là RÁC**:
   - `public/docs/`: 57 ảnh chụp màn hình kiểm thử nội bộ (**10.14 MB**) bị đưa vào public bundle phát tán ra CDN.
   - `public/audio/tts/`: 125 file MP3 (**6.92 MB**) bỏ hoang (TTS route đã bị vô hiệu hóa trả về 405).
2. **Payload API quá khổ do Data Dump**:
   - `/api/backtest`: Trả về 150 - 250 KB JSON với 2,500 chuỗi ngày trùng lặp.
   - `/api/news`: Dump 96 bài báo (35 - 50 KB) trong khi UI Dashboard chỉ hiển thị 10 bài (`items.slice(0, 10)`).
3. **Xung đột 2 thư viện Chart**:
   - Vừa dùng `recharts` (~420 KB minified) vừa dùng `lightweight-charts`, không cấu hình dynamic import gây nghẽn bundle khởi động.

---

## 10. Định Vị Sản Phẩm Trọng Tâm FINHACKATHON (Product Focus)

Theo chiến lược của Agent 10 (`docs/product/finhackathon-story.md`):

- **Tuyên ngôn Cốt Lõi**:
  > *"Không phải chiếc gương chiếu hậu ghi chép việc đã rồi — VietFi là chiếc kính chắn gió mô phỏng tương lai tài chính trước mỗi quyết định xuống tiền."*
- **Vấn Đề Thật Của Người Trẻ**:
  Người trẻ Việt Nam không thiếu thông tin hay công cụ chat. Họ thiếu câu trả lời định lượng: *"Nếu tháng này tôi quyết định chi/vay khoản này, tương lai tài chính 3-12 tháng tới của tôi sẽ thay đổi như thế nào?"*
- **Quy Trình 4 Bước (U-S-E-T)**:
  1. **UNDERSTAND (Thấu hiểu)**: Thu nạp Dòng tiền, Quỹ khẩn cấp, DTI trong 20 giây.
  2. **SIMULATE (Mô phỏng)**: So sánh đối đầu Before vs After (Ví dụ: Mua Laptop 25 triệu: Trả thẳng vs Trả góp 12 tháng vs Lựa chọn thay thế Smart Alternative).
  3. **EXPLAIN (Giải mã AI)**: Vẹt Vàng phân tích thực tế, bóc trần rủi ro cạn tiền mặt và bẫy nợ BNPL.
  4. **TRACK & ACT (Hành động)**: 1-Click chuyển hóa thành hũ tiết kiệm mục tiêu và thưởng điểm kỷ luật.
- **5 Màn Hình Trọng Tâm Cho Demo < 3 Phút**:
  1. `01 Onboarding` (Thu nạp hồ sơ siêu tốc 20s)
  2. `02 Financial Dashboard` (Toàn cảnh sức khỏe & Net Worth)
  3. `03 Financial Health Check` (Chẩn đoán DTI & Cấp cứu dòng tiền)
  4. `04 Decision Simulator` (Hero Feature: Mô phỏng Before/After mua sắm lớn)
  5. `05 AI Explanation & Action Plan` (Phán quyết sắc lẹm + Lộ trình hành động 60 ngày)

---

## 11. Danh Sách Đề Xuất Dọn Dẹp (Recommended Deletion List)

Từ kế hoạch của Agent 09 (`docs/audit/09-cleanup-plan.md`):

### Nhóm DELETE (Xóa vĩnh viễn):
- `scratch/` (Xóa ngay lập tức để khử rò rỉ Gemini API key).
- `vietfi-appwrite/` (Thư mục mồ côi 0 byte).
- `voice_ref/` (Tệp subtitle mồ côi không có âm thanh).
- `design-system/` (Giao diện tím/tối vi phạm chuẩn Light Mode).
- `design-exports/*.png` (6 ảnh rác clipboard).
- `doji.xml`, `build_error.txt`, `eslint_report.txt`, `dev-3001.*`, `test-llm.mjs`, `vietfi_mascot_sly_*.png` ở root.
- `src/app/test-ssr/`, `src/app/test-supabase/` (Debug routes).
- `src/app/login/actions.ts` (Dead server actions).
- 5 zombie npm packages: `hooks`, `class-variance-authority`, `@ai-sdk/react`, `@google/generative-ai`, `lottie-react`.

### Nhóm MOVE (Lưu trữ vào `docs/archive/`):
- `public/docs/*.png` (57 ảnh audit 10.14 MB) $\longrightarrow$ `docs/archive/audit-screenshots/`.
- `public/audio/tts/*.mp3` (125 file 6.92 MB) $\longrightarrow$ `docs/archive/audio-tts/`.
- `public/animations/` (412 KB) $\longrightarrow$ `docs/archive/animations/`.
- `CLAUDE.md` $\longrightarrow$ `docs/audit/quant-backtest-audit.md`.
- `BAO_CAO_VONG_1_WDA2026.md`, `PLAN_CHI_TIET.md`, `WDA2026_PHAN_CONG.md`, `portfolio-backtest-projection.md`, `security_best_practices_report.md` $\longrightarrow$ `docs/archive/`.

---

## 12. Thứ Tự Triển Khai Chuyển Đổi (Migration Execution Order)

Để đảm bảo an toàn tuyệt đối và đạt tiêu chuẩn **Definition of Done**, quá trình thực thi từ Phase 2 đến Phase 15 được hoạch định như sau:

```
┌────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 1: Dọn Dẹp Repository & Khử Rủi Ro Bảo Mật (Cleanup & Security)   │
│ - Xóa scratch/, tệp rác root, thu hồi key lộ, dọn 17MB public/ thừa    │
│ - Gỡ 5 packages zombie khỏi package.json                              │
├────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 2: Chuẩn Hóa Giao Diện Light Mode & Khử Glassmorphism (UI Polish)  │
│ - Đưa HTML về Light Mode chuẩn (#F8FAFC nền sáng, #0F172A chữ đậm)    │
│ - Thay thế triệt để 70+ điểm glassmorphism bằng Border/Card phẳng tinh │
├────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 3: Thiết Kế & Khởi Tạo Cloudflare D1 + Wrangler (D1 Migration)   │
│ - Khởi tạo wrangler.jsonc, cấu hình D1 database vietfi                │
│ - Áp dụng schema D1 chuẩn hóa (12 bảng SQLite tinh giản)               │
├────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 4: Xây Dựng Deterministic Finance Engine & Decision Simulator    │
│ - Hoàn thiện module tính toán thuần (Cashflow, Emergency Fund, DTI)    │
│ - Xây dựng Hero Feature: Decision Simulator (Before vs After)          │
├────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 5: Xây Dựng Cloudflare Worker Backend (Hono) & Loại Bỏ Supabase  │
│ - Thiết lập Worker Hono API (/api/me, /api/health, /api/simulate)      │
│ - Chuyển toàn bộ read/write DAL từ Supabase sang D1 Client/Worker API  │
│ - Gỡ bỏ hoàn toàn @supabase/supabase-js và @supabase/ssr              │
├────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 6: Tối Ưu Hóa AI & Bảo Mật Khóa (AI Gateway & Key Management)    │
│ - Đưa key vào wrangler secret / .dev.vars, tuyệt đối không lộ client   │
│ - Structured output Zod schema cho Vẹt Vàng, chống Hallucination      │
├────────────────────────────────────────────────────────────────────────┤
│ BƯỚC 7: Tinh Giản Navigation & Kiểm Thử E2E Runtime Demo (< 3 Phút)   │
│ - Khóa 5 màn hình chính cho demo, ẩn màn hình phụ                     │
│ - Kiểm thử responsive 375px -> 1440px, kiểm tra dữ liệu reload        │
│ - Hoàn thiện docs/FINAL_REFACTOR_REPORT.md                            │
└────────────────────────────────────────────────────────────────────────┘
```

---
*Báo cáo được khởi tạo tự động và phê chuẩn bởi Antigravity Orchestrator ngày 22/09/2026.*
