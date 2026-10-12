# VietFi Advisor — Cố Vấn Tài Chính AI Cho Người Việt

<!-- ALL BADGES -->
<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![Gemini 2.0](https://img.shields.io/badge/Gemini_2.0-Vercel_AI_SDK-4285F4?logo=google)](https://ai.google.dev/)
[![Tailwind v4](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_%26_DB-3ECF8E?logo=supabase)](https://supabase.com/)
[![Better Auth](https://img.shields.io/badge/Better_Auth-SQLite-gray)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-Unit_Tests-6AB04C?logo=vitest)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-45ba4c?logo=playwright)](https://playwright.dev/)

**AI tài chính · Gamification · Thị trường thời gian thực · Trading Backtest Engine · Tiếng Việt**

Vẹt Vàng — con vẹt vàng thông minh nhất Việt Nam 🦜💛

[🚀 Live Demo](https://vietfi-advisor.vercel.app) · [📂 CLAUDE.md](./CLAUDE.md)

<br/>

<img src="docs/vietfi-hero-dashboard.png" alt="VietFi Advisor AI Financial Command Center Dashboard" width="920" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);" />

</div>

---

## 🎯 Phần I — Tổng Quan (The Pitch)

### 🚨 Bối Cảnh Lịch Sử & Vấn Đề

Thị trường tài chính hiện tại dành cho giới trẻ đang đứng trước hai thách thức vô cùng lớn:

1. Thiếu tính bản địa: Các ứng dụng quốc tế tuy tốt nhưng không nắm được "Local Context" của thị trường Việt Nam (từ Vàng SJC, DOJI, VN-Index, các quỹ ETF VN, cho đến biến động tỷ giá USD/VND mỏng, hay các chính sách lãi suất 12 tháng tại các ngân hàng).
2. Lỗ hổng quản trị dòng nợ: Ảo tưởng sức mua gây ra bởi thẻ tín dụng tiêu dùng, SPayLater và Margin dễ khiến cá nhân vỡ nợ dây chuyền, hiệu ứng Domino không được tính toán trong các App Finance truyền thống.

### 💡 Giải Pháp: "Command Center" Cho Lộ Trình Tài Chính

VietFi Advisor ra đời mang sứ mệnh kết nối con người với công nghệ tài chính tự động (Quantitative Trading + Personal Finance), pha trộn sức mạnh của **Duolingo**, **Mint**, và **ChatGPT** cùng nền tảng Trading Dashboard PROMAX.

Sản phẩm tạo ra một hệ sinh thái All-In-One, nổi bật với các tính năng cốt lõi đã được xây dựng từ thực tiễn codebase:

- **Centralized Debt Hub:** Tính toán sức khỏe tài chính bằng chỉ số DTI, lên lộ trình tiêu diệt nợ theo Waterfall (Snowball/Avalanche).
- **Vẹt Vàng Khổng Tước:** Trợ lý Gen AI tích hợp qua Vercel AI SDK giao tiếp tương tác với người dùng dưới nhân vật 1 con Vẹt thích "châm chọc" để luyện kỷ luật, phản hồi bằng Voice với `edge-tts-universal`.
- **Hệ Thống Phân Cấp Khách Hàng (XP, Leaderboard):** Thay vì buồn tẻ, các mốc tài chính được chia theo Level giúp tạo hưng phấn và "Streak".
- **Thị Trường (Screener, Overview) & Backtest:** Backtesting chân thực giải quyết bài toán giao dịch T+2.5 với Engine tự xây, phân tích thị trường bằng dữ liệu EOD (End Of Day).

---

## ⚙️ Phần II — Core Architecture & Feature Details

Dự án sở hữu kiến trúc chuyên môn (Domain-Driven) chia lớp rõ ràng, quản trị State UI với Context và Persistence ở Backend Database (PostgreSQL).

### 1. Kiến Trúc AI Pipeline Toàn Vẹn

Tối ưu hóa API costs với chiến lược **3-Tiers Pipeline**, bảo đảm tài nguyên không bị lãng phí cho các prompt cơ bản:

- **Tier 1 (Smart RegEx Analytics):** Phân tích local. Khi nhập "uống cà phê Highland 55k", regex engine trích xuất tự động `amount: 55000` và `label: Coffee`. Zero API call.
- **Tier 2 (Template & Decision Tree):** Trả về hơn 500 script có sẵn cho các tính toán cố định, đi kèm Text-to-Speech (bộ Audio file pre-generated của Vẹt Vàng).
- **Tier 3 (Gemini 2.0 Streaming):** Khi thực hiện các câu tham vấn tư vấn đầu tư, Vercel AI SDK `@ai-sdk/google` sẽ được gọi đi kèm với persona prompt cực kỳ "thâm thúy" của Vẹt Vàng.

### 2. Backtest Pro & Strategy Engine

Thay vì "giả lập" mua bán tức thời như TradingView, Engine xây dựng các quy trình khắc nghiệt đặc thù Việt Nam:

- **T+2.5 Logic Settlement:** Sau khi khớp lệnh, cổ phiếu chỉ có thể bán vào chiều ngày T+2. Các lệnh mua đứt gãy margin sẽ bị từ chối nếu DTI quá mức.
- **Slippage & Transaction Fees:** Tính toán trượt giá và phí giao dịch qua từng lệnh (Commission mặc định ~ 0.15% - 0.2%).
- **Strategy Code Example - Pullback Uptrend:**
  - Logic Engine (tại `strategies/pullback-uptrend.ts`) quét qua tín hiệu 200 Bars của D1 chart cổ phiếu.
  - Điều kiện lọc xu hướng: `MA50 > MA200` và giá đang nằm trên đường MA200.
  - Pullback Confirmation: Giá lui về MA20 với thanh khoản giảm mạnh (Dưới 80% trung bình MA20 Volume). Ngọn nến bật tăng (Bullish rejections).

### 3. Vận Hành Tự Động (Cron & EOD Sync)

- Data thị trường đổ về cuối ngày qua File `scripts/sync_market_eod.ts`.
- Cào dữ liệu theo list Symbol chuẩn của VN30, HNX, UPCOM sau giờ đóng cửa (15h30 chiều).
- Data OHLCV, Sentiment được bóc tách và chèn vào Database qua cron triggers được setup ở Vercel.

---

## 📦 Phần III — Tech Stack Hiện Tại Trong Codebase

1. **Frontend & Interface:**
   - **Framework:** Next.js 16.2.3, React 19.2.3.
   - **Giao Diện / Styling:** Tailwind CSS v4 mới nhất kết hợp với Framer Motion tạo animation mượt mà chuẩn Command Center dark-mode.
   - **Biểu đồ Kỹ Thuật (Charts):** `lightweight-charts` được ứng dụng để render nến Nhật chuyên nghiệp cho Stock Screener. `recharts` sử dụng cho Personal Net Worth.

2. **Dữ liệu AI & Gamification:**
   - **GenAI:** Vercel AI, `@ai-sdk/google`, `edge-tts-universal` cho Voice Generator.
   - **Gamification Assets:** Lottie Editor & `lottie-react` nhúng Vẹt Vàng động cho Mascot Dashboard.

3. **Backend, Security & Database:**
   - **ORM / Local Authentication:** Tích hợp `better-auth` liên kết bộ Local SQLite (`better-auth.sqlite`) bảo vệ trạng thái đăng nhập cho tốc độ cực cao ở front-end SSR.
   - **Database Cốt Lõi:** Supabase PostgreSQL xử lý phân tán CSDL qua các Migrations tĩnh, ví dụ: `20260418112300_market_data_schema.sql`.

---

## 🏗️ Phần IV — Cấu Trúc Mã Nguồn (Directory Structure)

Thư mục chính được thiết kế module hóa nhằm đáp ứng quy trình mở rộng D-D-D (Domain Driven Design).

```text
vietfi-advisor/
├── src/
│   ├── app/                              # Next.js 16 App Router UI + Backend Routes
│   │   ├── api/                          # Edge Functions & Serverless Logic
│   │   │   ├── cron/sync-market/         # Route cập nhật dữ liệu thị trường tự động cuối ngày
│   │   │   ├── strategy-engine/          # Route quét tín hiệu chứng khoán theo Strategy Algorithms
│   │   │   └── chat/                     # Vercel AI Streaming Route cho Trợ lý
│   │   ├── dashboard/                    # "Command Center" Views
│   │   │   ├── backtest/                 # View mô phỏng Backtesting Trading chiến thuật
│   │   │   ├── ledger/                   # Sổ thu chi tập trung
│   │   │   ├── portfolio/                # Cơ cấu phân bổ tài sản
│   │   │   ├── learn/                    # Vẹt Vàng Gamification Onboarding
│   │   │   └── screener/                 # Lọc cổ phiếu & Data Overview
│   ├── components/                       # Shared UI React Components
│   └── lib/
│       ├── domain/                       # Core Rules: Backtest Physics, Gamification logic, Personal Finance Maths
│       ├── application/strategy-engine/  # Khối chiến lược tự động: Pullback Uptrend, Momentum, Ranking
│       ├── market-data/                  # Utilities phục vụ xử lý Market, Nến OHLCV
│       ├── infrastructure/               # Liên kết Database Supabase, External APIs
│       └── vetvang-persona.ts            # Khai báo Prompt, cấu trúc tính cách của Mascot Vẹt Vàng
├── scripts/
│   ├── sync_market_eod.ts                # TypeScript Runner độc lập để cào Market EOD (End of day)
│   └── generate-vet-vang-lottie.js       # JSON Lottie Generator File
├── supabase/
│   └── migrations/                       # Bảng cấu trúc Data (tickers, daily_ohlcv, market_regime, sectors)
├── package.json                          # App Dependencies
├── vitest.config.ts                      # Unit testing setup
└── playwright.config.ts                  # E2E Automation tests setup
```

---

## 🗄️ Phần V — Database Schema & Dòng Lưu Chuyển Data

File cấu trúc Database (`20260418112300_market_data_schema.sql`) minh chứng năng lực tổ chức hệ thống:

1. `sectors` và `tickers`: Định danh Symbol chéo (từ VN30, HNX, UPCOM) để phân loại mã hóa.
2. `daily_ohlcv`: Ghi nhận dữ liệu siêu lớn với hàng chục ngàn Record (Mã - Ngày - Open - High - Low - Close - Volume). Index gắt gao (idx_daily_ohlcv_symbol_date) tối ưu truy vấn nến biểu đồ thời gian thực.
3. `market_regime`: Dashboard báo cáo tổng kết ngày (VN-INDEX Bull/Bear/Neutral, ADV/DEC Breadth, MA50/200 Baseline).

Dữ liệu được bảo mật bởi quy định TCBS Read-Only Integration để bảo vệ nghiêm ngặt các chìa khoá bí mật (Auth Keys) từ Account của người dùng.

---

## 🚀 Phần VI — Deploy Workflow & Runbooks (@[/deploy])

Luồng Deployment phải vượt qua rào cản kiểm duyệt tự động để đảm bảo môi trường Production bền vững nhất. Vận hành thông qua lệnh workflow nội bộ `@/deploy` giúp phòng thủ sập nguồn (Rollback strategies).

### 1. Pre-Deployment Checklist

Hệ thống CI/CD sẽ quét qua toàn bộ mã nguồn trước khi khởi tạo bản Build. Developer không được bypass bước này:

- **Quality Control:**
  - Compilation: Ensure `npx tsc --noEmit` hoàn toàn không còn Type Error nào báo đỏ.
  - Linter: `npx eslint .` chạy mượt mà theo chuẩn ESLint Config của Next 16.
  - Test Suite: `npm test` & `npm run test:e2e` đỗ xanh (Passthrough Playwright / Vitest).
- **Security Check:** Rà quét Secret Key Leakage, kiểm tra `dotenv` `.env.local` Audit. Đảm bảo Bundle Size không vượt quá payload max cho Vercel Edge.

### 2. Các Workflow Deployment Cơ Bản

Bạn có thể tương tác với bot bằng lệnh Deploy trên cửa sổ chat:

- `/deploy` — Khởi chạy tương tác Wizard hỗ trợ Deploy cho thành viên mới
- `/deploy check` — Kích hoạt Pre-flight checklist mà KHÔNG public môi trường.
- `/deploy preview` — Gửi ứng dụng sang môi trường chạy thử Staging.
- `/deploy production` — Khởi tạo quá trình đẩy lên nền tảng Product chính thức.
- `/deploy rollback` — Gọi Snapshot Rollback về Version an toàn trước đó nếu Error 5xx bùng phát.

### 3. Vòng Đời Một Quá Trình Deploy Hoàn Chỉnh (Output Status)

Khi một bản Deploy thành công, hệ thống nội bộ sẽ trả Audit log thông báo:

```text
## 🚀 Deployment Complete
Summary:
- Version: vX.Y.Z (Production)
- Duration: [Render Time]s
- Platform: Vercel Cloud Network / Serverless Region
What Changed: [GitHub Commit Auto-Scrape]
Health Check: API 200 OK, CSDL Connected.
```

Nếu bị `Fail` ở bước `TypeScript Compilation`, Hệ thống chặn Deploy và cấp ngay tuỳ chọn Rollback tự động.

---

## 🛡️ Phần VII — Chiến Lược Kiểm Thử (Testing Strategy)

VietFi xử lý dòng tiền thật, bởi vậy bộ Test Coverage chạy nghiệmthu là yêu cầu sinh tử cho Project.

```bash
# Lệnh chạy Test Tự Động
npm run test               # Vitest: Test các khối toán học (Debt Calc, Pullback Logic, DTI Metrics)
npm run test:e2e           # Playwright: Chạy headless giả lập user browser đăng nhập, tạo lệnh mua
npm run test:e2e:ui        # Chạy kiểm thử với giao diện trực quan Debug Inspector UI
npm run test:e2e:headed    # Mở browser thật để test animation Vẹt Vàng
```

1. **Core Domain Focus (Vitest):** Mọi sự kiện tính tiền DTI, T+2.5 Logic, Thuật toán Strategy Generator, Ranking Sorting bắt buộc Test.
2. **User Experience Focus (Playwright):** Render Landing page, Authentication Session JWT (Better-Auth), chuyển đổi route giữa các Dashboard.

---

## 👥 Phần VIII — Phân Quyền Tổ Đội Đóng Góp (Core Team)

Quy chuẩn GitHub Contributions, được vạch rõ ranh giới theo chức năng code để tuân thủ _Terminal-First Startup Protocol_:

- **Hưng (hungpixi):**
  - Khởi tạo System Architecture. Trọng tài thiết kế Business Logic về Personal Finance và Backtest Rules (Chuẩn T+2.5).
  - Vận hành Data Crawler Sync & Integrations (TCBS Read-only), Lập trình Market API và Strategy Engine. Maintain cơ sở hạ tầng chung.
  - Phụ trách luồng CICD và Database Migrations.

- **Hoàng:**
  - Đảm trách "Bộ Mặt" UX/UI Promax, Command Center Framework, và Component Layouts Animations với Tailwind v4/Framer.
  - Quản lý kho Security chung. Phụ trách Crawler lấy tin tức Data (Sentiment/Giá Vàng) về hệ thống.
  - Sáng tạo và gắn Vẹt Vàng Mascot (Lottie/TTS) vào giao diện.

- **Bảo:**
  - Dựng nhanh form nội bộ, board công việc và checklist để team phối hợp trơn tru mỗi ngày.
  - Hỗ trợ frontend ở lớp hoàn thiện trải nghiệm: rà soát UI flow, tinh chỉnh nội dung hiển thị và phối hợp chốt các chi tiết tương tác trước khi release.
  - Giữ nhịp tài liệu vận hành (how-to, bàn giao, changelog) và kiểm thử click-flow thực tế để phát hiện sớm điểm gãy UX.

- **Antigravity (AI Assistant / AWF System):**
  - Trợ lý AI thế hệ mới đồng hành trực tiếp, tư vấn Data Modelling, Sinh mã tự động (CodeGen).
  - Clean Code, Refactoring Module, Cố vấn System Architecture và cung cấp lệnh luồng `/deploy` chuẩn xác.

> **Cam kết nội quy phát triển:**
> Việc cập nhật hệ thống và bổ sung code MỚI phải đi kèm với Git commit message chuẩn ngữ nghĩa quy trình, và TUYỆT ĐỐI KHÔNG Bypass hệ thống Test trước khi gửi Pull Request. Không bao giờ commit `.env` file!

---

<div align="center">
<b>VietFi Advisor</b> — <i>Vì mục tiêu nâng tầm sức khoẻ tài chính người Việt 🇻🇳</i>
<br />
🦜💛 Vẹt Vàng — "Quản lý dòng tiền cũng như Trading, tất cả đều phải trả giá bằng kỳ vọng!" 
</div>
