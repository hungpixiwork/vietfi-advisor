# KẾ HOẠCH THỰC HIỆN CHI TIẾT — VIETFI ADVISOR (v2.0)

## WebDev Adventure 2026 | Team 2 người | Cập nhật 19/03/2026

---

## 📅 Timeline Cuộc thi

| Mốc | Thời gian | Nội dung | Trạng thái |
|------|----------|---------|-----------| 
| 📝 Vòng 1 | 23-29/03/2026 | Nộp báo cáo ý tưởng | ✅ v4.0 done |
| 💻 Vòng 2 | 06-20/04/2026 | Hiện thực hóa (15 ngày) | ⬜ |
| 🎤 Vòng 3 | 09/05/2026 | Thuyết trình + Live demo | ⬜ |

---

## 🖥️ HIỆN TRẠNG DỰ ÁN (19/03/2026)

### Đã có sẵn:

| File/Folder | Trạng thái | Ghi chú |
|-------------|-----------|---------|
| `ui-prototype/index.html` | ✅ Hoàn chỉnh | Landing page mới nhất — **FILE CHUẨN** |
| `ui-prototype/style.css` | ✅ Hoàn chỉnh | Space Grotesk + IBM Plex Mono, dark theme |
| `ui-prototype/script.js` | ✅ Hoàn chỉnh | Scroll animations, roast rotator |
| `ui-prototype/vet-demo.html` | ✅ Hoàn chỉnh | Demo Vẹt Vàng interactive, standalone |
| `ui-prototype/quotes.json` | ✅ Hoàn chỉnh | Quote bank cho Vẹt Vàng |
| `ui-prototype/assets/` | ✅ Có sẵn | mascot.png, level images, icon.png |
| `src/app/page.tsx` | ⬜ Cần rebuild | Next.js landing page — phải match index.html |
| `src/app/dashboard/` | ⬜ Skeleton | Chỉ có folder, chưa có page con |
| `public/` | ⬜ Cần điền | Chỉ có SVG mặc định Next.js |
| `scripts/generate_audio.py` | ✅ Có sẵn | Gen audio cho Vẹt Vàng |

### Design System (từ `ui-prototype/style.css` — CHUẨN):

```css
/* Fonts */
--font: 'Space Grotesk', sans-serif   (KHÔNG dùng Be Vietnam Pro)
--mono: 'IBM Plex Mono', monospace

/* Colors */
--gold: #E6B84F
--dark: #0A0B0F
--card: #111318
--border: rgba(255,255,255,.06)
--text-primary: #F5F3EE
--text-secondary: #8B8D96
--green: #22C55E
--red: #EF4444

/* Vẹt Level System (4 cấp - CHUẨN MỚI từ index.html): */
Lv1: 🐣 Vẹt Con (0 XP)
Lv2: 🦜 Vẹt Teen (500 XP)
Lv3: 🦜✨ Vẹt Phố (2,000 XP)
Lv4: 👑 Vẹt Nhà Giàu (5,000 XP)
```

---

## 🚀 DEPLOY PIPELINE — Luồng thực tế từ Code đến Production

### Kiến trúc Deploy tổng thể:

```
Developer (local)
    │
    ├─ Next.js App (src/) ──── `npm run dev` → localhost:3000
    │
    ├─ Python Scripts (scripts/) ─── Chạy local, NOT deploy
    │   └─ generate_audio.py: gen WAV → copy vào /public/audio/
    │
    └─ Push to GitHub → Vercel (auto-deploy)
            │
            ├─ Build: `next build` (TypeScript → HTML/JS/CSS bundle)
            ├─ Output: Static pages (SSG) + Server functions (API routes)
            └─ Serve: Vercel Edge CDN (global)

External Services (KẾT NỐI TỪ SERVER/CLIENT):
    ├─ Supabase (https://supabase.com) ← Auth, DB, RLS
    ├─ Gemini API (api.gemini.google.com) ← AI agents
    ├─ vnstock (PyPI package) ← Dùng trong Python, wrap sang API route
    └─ World Bank API (public, no auth) ← Macro data
```

### Chi tiết Deployment Flow:

```
BƯỚC 1: Local Development
─────────────────────────
cd vietfi-advisor
npm run dev          → http://localhost:3000

BƯỚC 2: Một feature xong → Push
─────────────────────────────────
git add .
git commit -m "feat: budget CRUD API"
git push origin feat/budget     ← branch riêng

BƯỚC 3: Vercel Auto-Deploy (Preview)
──────────────────────────────────────
Vercel phát hiện push → tự build
Preview URL: vietfi-advisor-feat-budget.vercel.app
Test URL này trước khi merge

BƯỚC 4: Merge to main → Production
────────────────────────────────────
Tạo PR feat/budget → main
Review → Merge
Vercel rebuild production: vietfi-advisor.vercel.app

BƯỚC 5: Environment Variables (Vercel Dashboard)
───────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=               ← Server-only, KHÔNG có NEXT_PUBLIC_
```

### Where code runs — phân biệt Client vs Server:

```
CLIENT (browser): 
  - src/app/*/page.tsx (React components)
  - src/components/**
  - Không được dùng GEMINI_API_KEY trực tiếp!

SERVER (Vercel serverless):
  - src/app/api/**/route.ts
  - Cron jobs (Vercel cron)
  - Tại đây mới đọc GEMINI_API_KEY, SUPABASE_SERVICE_KEY

PYTHON SCRIPTS (chỉ chạy local):
  - scripts/generate_audio.py → WAV → public/audio/
  - Không deploy lên Vercel
```

### Cron Jobs (Batch Processing — Data Pipeline):

```
# vercel.json (cần tạo)
{
  "crons": [
    {
      "path": "/api/cron/market-data",
      "schedule": "30 15 * * 1-5"   ← 15:30 thứ 2-6 (sau đóng cửa sàn)
    },
    {
      "path": "/api/cron/morning-brief", 
      "schedule": "0 6 * * *"         ← 6:00 AM hàng ngày
    },
    {
      "path": "/api/cron/macro-update",
      "schedule": "0 0 1 * *"         ← Đầu tháng (World Bank data)
    }
  ]
}
```

---

## 🎨 LANDING PAGE ALIGNMENT — Từ Prototype sang Next.js

### Nguyên tắc chuyển đổi:

```
ui-prototype/index.html  →→→  src/app/page.tsx
ui-prototype/style.css   →→→  src/app/globals.css + Tailwind classes
ui-prototype/script.js   →→→  Client components + Framer Motion
ui-prototype/assets/     →→→  public/assets/
```

### Sections cần rebuild trong page.tsx (theo order trong index.html):

| Section | ID | Status | Priority |
|---------|----|--------|----------|
| Nav | `.nav` | ⬜ | P0 |
| Hero | `.hero` | ⬜ | P0 |
| Features (3 cột) | `#features` | ⬜ | P0 |
| How it works (3 bước) | `#how` | ⬜ | P0 |
| Vẹt Vàng Showcase | `#vet` | ⬜ | P0 |
| Level System | `.vet-levels-grid` | ⬜ | P0 |
| Personas (Testimonials) | `#testimonials` | ⬜ | P1 |
| FAQ | `#faq` | ⬜ | P1 |
| CTA Section | `#cta` | ⬜ | P0 |
| Footer | `.footer` | ⬜ | P1 |

### Public folder — cần copy từ ui-prototype:

```
vietfi-advisor/public/
├── assets/
│   ├── icon.png          ← Copy từ ui-prototype/assets/
│   ├── mascot.png        ← Copy từ ui-prototype/assets/
│   ├── level-1-con.png   ← Copy từ ui-prototype/assets/
│   ├── level-2-teen.png  ← Copy từ ui-prototype/assets/
│   ├── level-3-truong-thanh.png
│   └── level-4-dai-gia.png
├── audio/                ← Gen bởi scripts/generate_audio.py
│   ├── vuot-lo-0.wav
│   ├── vuot-lo-1.wav
│   └── ... (per key, per index từ quotes.json)
├── quotes.json           ← Copy từ ui-prototype/quotes.json
└── [giữ các SVG mặc định Next.js]
```

---

## 🧩 FRAMEWORK LÀM VIỆC NHÓM

```
┌────────────────────────────────────────────────────────┐
│  SPRINT ZERO (2 ngày)          ← CÙNG LÀM, KHÔNG CHIA │
│  Align design system, API contract, DB schema          │
├────────────────────────────────────────────────────────┤
│  SHAPE UP CYCLE 1 (5 ngày)     ← CHIA VIỆC SONG SONG  │
│  P0: Landing + Auth + Quỹ Chi tiêu + Quỹ Nợ + Risk DNA│
├────────────────────────────────────────────────────────┤
│  SHAPE UP CYCLE 2 (5 ngày)     ← CHIA VIỆC SONG SONG  │
│  P1: AI Agents + F&G + Brief + Vẹt Vàng + Deploy       │
├────────────────────────────────────────────────────────┤
│  COOL-DOWN (3 ngày)            ← CÙNG LÀM              │
│  Bug fix, polish, demo video, nộp bài                  │
└────────────────────────────────────────────────────────┘
```

| | Hưng | Hoàng |
|---|---|---|
| **Vai chính** | Backend + AI Pipeline + API routes | Frontend UI/UX + Tailwind + Animations |
| **Vai phụ** | DB schema + deploy pipeline | Testing + responsive + demo video |

---

## 🗂️ DB Schema (Supabase PostgreSQL)

```sql
users           → id, email, name, avatar, created_at
profiles        → user_id, income, risk_score, risk_type, onboarded
budget_pots     → id, user_id, name, amount, icon, color
expenses        → id, user_id, pot_id, amount, note, photo_url, date
debts           → id, user_id, name, type, principal, rate, min_payment, due_date
risk_answers    → id, user_id, q1-q5, score, type, completed_at
vet_vang        → user_id, xp, level, streak, last_fed, mood
achievements    → id, user_id, type, earned_at, shared
fg_daily        → date, score, zone, indicators(jsonb)
briefs          → date, content, takeaways(jsonb), sentiment
news            → id, title, url, source, sentiment, published_at
market_data     → date, asset, price, change, volume
```

## 📁 Folder Structure (Next.js App Router)

```
src/
├── app/
│   ├── page.tsx                    ← Landing (rebuild từ index.html)
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx                ← Overview
│   │   ├── budget/page.tsx
│   │   ├── debt/page.tsx
│   │   ├── risk-profile/page.tsx
│   │   ├── sentiment/page.tsx
│   │   ├── brief/page.tsx
│   │   ├── macro/page.tsx
│   │   ├── portfolio/page.tsx
│   │   ├── personal-cpi/page.tsx
│   │   ├── market/page.tsx
│   │   ├── housing/page.tsx
│   │   └── news/page.tsx
│   └── api/
│       ├── auth/[...]/route.ts
│       ├── budget/route.ts
│       ├── debt/route.ts
│       ├── risk/route.ts
│       ├── gemini/brief/route.ts
│       ├── gemini/portfolio/route.ts
│       ├── gemini/macro/route.ts
│       ├── cron/market-data/route.ts    ← Chạy sau đóng cửa sàn
│       ├── cron/morning-brief/route.ts  ← 6AM daily
│       ├── cron/macro-update/route.ts   ← Monthly
│       └── vet-vang/route.ts
├── components/
│   ├── layout/Sidebar.tsx
│   ├── layout/Header.tsx
│   ├── charts/GaugeChart.tsx
│   ├── charts/PieChart.tsx
│   ├── cards/MetricCard.tsx
│   ├── cards/RoastCard.tsx
│   ├── vet-vang/VetVang.tsx
│   ├── vet-vang/XPBar.tsx
│   └── ui/Button.tsx, Modal.tsx, Input.tsx...
├── lib/
│   ├── supabase.ts           ← Client + Server helpers
│   ├── gemini.ts             ← Wrapper + retry + rate limit
│   ├── scraper.ts            ← vnstock, VnExpress RSS
│   └── calculations/
│       ├── fg-index.ts
│       ├── personal-cpi.ts
│       ├── debt-optimizer.ts
│       └── risk-scoring.ts
└── styles/globals.css        ← Import từ style.css của ui-prototype
```

---

# VÒNG 1 — ĐÃ HOÀN THÀNH ✅

Báo cáo v4.0, 9 tính năng, Vẹt Vàng mascot, YC framework.

**Việc còn lại trước 29/03:**

| Ngày | Hưng | Hoàng | Done khi |
|------|---------|---------|-----------| 
| 23/03 | Review + chỉnh báo cáo cuối | Đọc hiểu dự án + setup dev env | Báo cáo final |
| 24-25/03 | Export PDF + **copy assets từ ui-prototype → public/** | Clone repo, `npm run dev` OK, đọc index.html | Hoàng chạy được local |
| 26-29/03 | Nộp vòng 1 + viết DB schema draft + `vercel.json` skeleton | Xem index.html chi tiết, ghi note UI | ✅ Nộp xong + Hoàng ready |

**Checklist cụ thể trước 29/03:**

- [ ] Copy `ui-prototype/assets/*` → `public/assets/`
- [ ] Copy `ui-prototype/quotes.json` → `public/quotes.json`
- [ ] Tạo `vercel.json` với cron schedule
- [ ] Tạo `.env.local` với placeholder keys (không commit)
- [ ] Tạo `public/assets/` folder structure

---

# VÒNG 2 — HIỆN THỰC HÓA (06-20/04, 15 ngày)

## 🟡 SPRINT ZERO (06-07/04) — CÙNG LÀM, KHÔNG CHIA

> 2 người ngồi cùng, thống nhất MỌI THỨ trước khi tách ra. Không code feature nào cả.

### Ngày 1 — 06/04 — Design System + API Contract

**Session 1 (2h) — Chuyển design từ prototype sang Next.js:**
- [ ] Copy toàn bộ CSS variables từ `ui-prototype/style.css` vào `src/app/globals.css`
- [ ] Setup Google Fonts: Space Grotesk + IBM Plex Mono trong layout.tsx
- [ ] Tạo base components align với prototype:
  - `Button.tsx` — `.btn`, `.btn--primary`, `.btn--ghost`, `.btn--xl`
  - `Card.tsx` — `.feature-card`, glassmorphism style
  - `Badge.tsx` — `.badge` (animated dot)
  - `SectionLabel.tsx` — `.section__label` (uppercase monospace)
- [ ] Verify: components render đúng 1:1 với prototype

**Session 2 (2h) — API Contract + DB:**
- [ ] Viết `docs/API_CONTRACT.md` — format endpoint + request/response
- [ ] Setup Supabase: tạo project → tạo 12 tables → setup RLS
- [ ] Tạo `lib/supabase.ts` (browser client + server client)
- [ ] Test Supabase connection từ Next.js

**✅ Done khi:** Design tokens match prototype. DB tables tồn tại. API contract xong.

---

### Ngày 2 — 07/04 — Landing Page + Auth + Skeleton

**Session 1 (3h) — Landing page (QUAN TRỌNG NHẤT):**

> **Nguyên tắc**: `src/app/page.tsx` phải render 1:1 với `ui-prototype/index.html`.
> Không sáng tạo thêm. Copy structure, port sang JSX.

- [ ] Port từng section theo thứ tự trong `index.html`:
  1. `<Nav>` component — logo + links + CTA button
  2. `<HeroSection>` — headline, desc, stats (6 AI Agents, 8+ nguồn, 100% free), mascot + float cards
  3. `<FeaturesSection>` — 3 cột: Quỹ Chi tiêu / Quỹ Nợ / Phân Tích Thị Trường
  4. `<HowItWorks>` — 3 bước với connector
  5. `<VetVangSection>` — 3 modes showcase + scenarios + level system (4 cấp)
  6. `<TestimonialsSection>` — 2 personas + stats
  7. `<FAQSection>` — 5 câu với `<details>` native
  8. `<CTASection>` — full-width CTA + roast rotator
  9. `<Footer>` — 4 cột links

- [ ] Port `script.js` → Next.js:
  - Scroll animations: `data-animate="fade-up"` → Framer Motion InView
  - Roast rotator (CTA section) → useState + useEffect
  
- [ ] Xác nhận visual match: mở `index.html` + `localhost:3000` cạnh nhau → compare

**Session 2 (2h) — Auth + Git Setup:**
- [ ] CÙNG code auth:
  - `login/page.tsx`: email/password + Google OAuth
  - `register/page.tsx`: form + validation
  - Middleware: protect `/dashboard/*`
  - Test E2E: đăng ký → login → dashboard → logout
- [ ] Git flow: `main` protected, `feat/*` branches
- [ ] GitHub Projects board + Issues với labels P0/P1/P2

**✅ Done khi:** Landing page khớp prototype. Auth E2E chạy. Git flow setup.

---

## 🔵 SHAPE UP CYCLE 1 (08-12/04) — P0 FEATURES

### Ngày 3 — 08/04 — Market Data API + Dashboard Overview

**Hưng (Backend):**
- [ ] `src/app/api/cron/market-data/route.ts`:
  - Gọi vnstock (via spawn Python subprocess hoặc wrap API call)
  - Lấy: VN-Index last price, gold SJC, USD/VND, BTC
  - Lưu vào `market_data` table (Supabase)
  - Protected: chỉ Vercel Cron hoặc CRON_SECRET header
- [ ] `src/app/api/market/route.ts` (public GET):
  - Đọc từ Supabase → trả JSON latest market data
  - ISR cache 5 phút
- [ ] Setup `vercel.json` cron (test với manual trigger trước)

**Hoàng (Frontend):**
- [ ] `components/cards/MetricCard.tsx`:
  - Props: name, value, change (%), trend (up/down)
  - Color: xanh nếu change > 0, đỏ nếu < 0
  - Match style với `.feature-card` từ prototype
- [ ] `dashboard/page.tsx` skeleton:
  - Grid 4 MetricCards (VN-Index, Vàng, USD, BTC)
  - Placeholder sections: Mini F&G gauge, Brief preview, News preview
  - Dark theme, sidebar layout

**✅ Done khi:** Dashboard hiển thị 4 metric cards đọc từ API. Sidebar navigate OK.

---

### Ngày 4 — 09/04 — Quỹ Chi tiêu

**Hưng (Backend):**
- [ ] `api/budget/route.ts`: GET/POST/PUT/DELETE budget pots
- [ ] `api/expenses/route.ts`: POST expense, GET by pot/date
- [ ] Business logic: alert khi expense > 80% pot

**Hoàng (Frontend):**
- [ ] `dashboard/budget/page.tsx`:
  - Header: "Quỹ Chi tiêu" + tổng thu nhập
  - Grid "lọ": card per pot (icon, name, allocated/spent/remaining, progress bar)
  - Modal thêm lọ + modal ghi chi tiêu
  - Color: xanh (<60%), vàng (60-80%), đỏ (>80%)
- [ ] `components/charts/PieChart.tsx` (Recharts)

**✅ Done khi:** User tạo 5 lọ → ghi 3 khoản chi → pie chart cập nhật.

---

### Ngày 5 — 10/04 — Quỹ Nợ

**Hưng (Backend):**
- [ ] `api/debt/route.ts`: CRUD
- [ ] `lib/calculations/debt-optimizer.ts`:
  - `calculateDTI(debts, income)` → ratio %
  - `snowballPlan(debts)` → array timeline
  - `avalanchePlan(debts)` → array timeline
  - `hiddenInterestCalc(debt)` → tổng lãi ẩn

**Hoàng (Frontend):**
- [ ] `dashboard/debt/page.tsx`:
  - Summary: Tổng nợ, DTI gauge (xanh <20%, vàng 20-40%, đỏ >40%), Tổng lãi
  - Danh sách nợ: table với 5 loại
  - Modal thêm nợ
  - Tab "Lộ trình": toggle Snowball vs Avalanche

**✅ Done khi:** 3 khoản nợ → DTI hiển thị → chọn Snowball → thấy timeline.

---

### Ngày 6 — 11/04 — Risk DNA

**Hưng (Backend):**
- [ ] `lib/calculations/risk-scoring.ts`:
  - 5 câu Prospect Theory
  - Score 5-15 → Bảo thủ/Cân bằng/Tăng trưởng
- [ ] `api/risk/route.ts`: save + score

**Hoàng (Frontend):**
- [ ] `dashboard/risk-profile/page.tsx`:
  - Quiz flow: 5 screens, progress bar
  - Mỗi câu: 3 options dạng card, animation highlight
  - Result: profile name + emoji + score bar + traits
  - "Chia sẻ kết quả" → shareable card

**✅ Done khi:** 5 câu → "Nhà đầu tư Tăng trưởng 🚀" → share card.

---

### Ngày 7 — 12/04 — Cycle 1 Integration + Polish

**Hưng:**
- [ ] E2E test: Register → Login → Budget → Debt → Risk DNA
- [ ] Error handling: loading states, toast notifications
- [ ] Edge cases: empty states, 0 income, no data

**Hoàng:**
- [ ] Responsive: 375px, 768px, 1440px
- [ ] Sidebar collapse trên mobile (hamburger menu)
- [ ] Loading skeletons (shimmer)
- [ ] Micro-animations: Framer Motion card hover, page transition

**✅ Checkpoint Cycle 1:** Auth + Budget + Debt + Risk DNA chạy E2E. **→ MVP nộp được.**

---

## 🔵 SHAPE UP CYCLE 2 (13-20/04) — AI + TÍNH NĂNG NÂNG CAO

### Ngày 8 — 13/04 — F&G Index + Scraper

**Hưng:**
- [ ] `lib/scraper.ts`:
  - `scrapeVnExpress()`: parse RSS XML
  - `scrapeVnstock()`: VN-Index +125D MA, top gainers, khối ngoại
  - `scrapeFX()`: USD/VND, BTC, Gold từ vnstock
- [ ] `lib/calculations/fg-index.ts`:
  - 5 indicators → Z-score normalize → weighted avg
  - Zone mapping: 0-20 Extreme Fear ... 81-100 Extreme Greed
- [ ] `api/cron/market-data/route.ts`: update với full F&G calc + save `fg_daily`

**Hoàng:**
- [ ] `dashboard/sentiment/page.tsx`:
  - `components/charts/GaugeChart.tsx` (SVG arc + needle + animation)
  - 7-day history bar chart
  - 5 indicator cards
  - "Hôm nay nên...": AI gợi ý 1 dòng

**✅ Done khi:** F&G page hiển thị score real-time, gauge smooth, 7-day history đúng.

---

### Ngày 9 — 14/04 — AI Agents + Morning Brief

**Hưng:**
- [ ] `lib/gemini.ts`:
  - Wrapper với retry (3 lần), rate limit (delay giữa calls)
  - Types cho mỗi response format
- [ ] Agent pipeline `api/cron/morning-brief/route.ts`:
  - Step 1: Fetch VnExpress RSS → extract 20 headlines mới nhất
  - Step 2: Gemini batch sentiment (1 call, all headlines) → tags
  - Step 3: Gemini synthesize → 4 takeaways tiếng Việt (CK/Vàng/Crypto/Macro)
  - Step 4: Save vào `briefs` table
- [ ] `api/gemini/brief/route.ts`: serve latest brief (read Supabase)

**Hoàng:**
- [ ] `dashboard/brief/page.tsx`:
  - Header: date + F&G mini badge
  - 4 takeaway cards: icon + paragraph mỗi asset
  - "Hành động gợi ý": AI bullets
  - Disclaimer: "Powered by Gemini AI"
- [ ] `dashboard/news/page.tsx`:
  - Feed: title + source + time + sentiment tag 🟢🔴⚪
  - Filter: All / Bullish / Bearish / by asset

**✅ Done khi:** Brief hiển thị 4 AI takeaways. News feed có sentiment tags.

---

### Ngày 10 — 15/04 — Macro + Portfolio

**Hưng:**
- [ ] `api/cron/macro-update/route.ts`:
  - World Bank API → GDP, CPI, Interest Rate, FDI, Export Vietnam
  - Lưu `macro` table
- [ ] `api/gemini/macro/route.ts`: AI nhận định macro per asset
- [ ] `api/gemini/portfolio/route.ts`: 
  - Input: capital + risk profile
  - Output: % allocation + 10-year projection (3 scenarios)

**Hoàng:**
- [ ] `dashboard/macro/page.tsx`:
  - 6 indicator cards
  - 3 charts (AreaChart CPI, LineChart Interest Rate, AreaChart FX)
  - AI Commentary box
- [ ] `dashboard/portfolio/page.tsx`:
  - Input: tổng vốn + risk profile (auto từ Risk DNA)
  - PieChart phân bổ
  - BarChart dự phóng 10 năm
  - AI recommendation

---

### Ngày 11 — 16/04 — Personal CPI + Vẹt Vàng

**Hưng:**
- [ ] `lib/calculations/personal-cpi.ts`:
  - 7 categories + user weights
  - GSO CPI per category (hardcoded từ data thực 2025)
  - Formula: Σ(user_weight × category_CPI)
- [ ] `api/vet-vang/route.ts`:
  - `GET /mood`: streak + last_fed + behavior → mood
  - `POST /feed`: ghi chi tiêu = cho vẹt ăn → +XP
  - `GET /roast`: Gemini generate roast/khen/thâm
- [ ] Prompt engineering 3 chế độ (Mổ/Khen/Thâm)

**Hoàng:**
- [ ] `dashboard/personal-cpi/page.tsx`:
  - 7 sliders/inputs per category
  - Big number result + comparison bar chart
  - "Aha moment" animation nếu > 2x CPI chính thức
  - Share card
- [ ] `components/vet-vang/VetVang.tsx`: avatar + speech bubble floating
- [ ] `components/vet-vang/XPBar.tsx`: progress bar + level badge + streak 🔥
- [ ] `components/cards/RoastCard.tsx`: shareable gradient card

**✅ Done khi:** Vẹt hiện trên dashboard. Ghi chi tiêu → XP tăng. Share card OK.

---

### Ngày 12 — 17/04 — Integration + Polish

**Hưng:**
- [ ] Kết nối F&G vào Dashboard mini gauge
- [ ] Brief preview (3 dòng) vào Dashboard
- [ ] News (4 tin mới nhất) vào Dashboard
- [ ] Vẹt Vàng notifications: trigger khi vượt lọ, 3 ngày không mở
- [ ] Kiểm tra toàn bộ 27 FR từ báo cáo

**Hoàng:**
- [ ] Dashboard Overview: fill real data đầy đủ
- [ ] Navigation UX: active sidebar highlight, breadcrumb
- [ ] Toast notifications (react-hot-toast)
- [ ] Loading skeletons TẤT CẢ pages
- [ ] Page transitions: Framer Motion fade + slide

---

### Ngày 13 — 18/04 — Final Testing

**Hưng:**
- [ ] Full E2E: Register → Budget → Debt → Risk DNA → Brief → F&G → CPI → Portfolio → Vẹt
- [ ] Edge cases: empty state, 0 income, no internet
- [ ] Lighthouse audit → target 90+ Performance

**Hoàng:**
- [ ] Responsive: iPhone SE (375px), iPhone 14 (390px), iPad (768px)
- [ ] Cross-browser: Chrome, Firefox, Edge
- [ ] Accessibility: contrast 4.5:1+, focus states, aria-labels

---

### Ngày 14-15 — 19-20/04 — Deploy + Demo Video

**Hưng — Deploy Production:**

```bash
# 1. Chuẩn bị env vars trên Vercel Dashboard:
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
GEMINI_API_KEY=AIzaSyxxx    ← Server-only, KHÔNG có NEXT_PUBLIC_
CRON_SECRET=your-random-secret

# 2. Connect GitHub repo → Vercel
# 3. Enable cron jobs (Vercel Pro hoặc dùng free alternative)
# 4. Test production URL toàn bộ flow
# 5. Seed demo data:
# - 5 lọ + 10 expenses + 3 debts
# - Risk DNA completed
# - F&G 7 ngày lịch sử
# - 3 briefs lịch sử
```

**Hoàng — Demo video 3-5 phút:**
```
0:00-0:30  Landing page + đăng ký
0:30-1:30  Dashboard + Quỹ Chi tiêu
1:30-2:30  Quỹ Nợ + DTI + Snowball
2:30-3:30  Risk DNA quiz + shareable card + F&G
3:30-4:30  Morning Brief + Vẹt Vàng roast
4:30-5:00  Outro + branding
```

**✅ Checkpoint:** App live trên Vercel + demo video → ✅ **NỘP VÒNG 2**

---

## ⏳ BUFFER (21/04 - 08/05) — P2 + POLISH + THUYẾT TRÌNH

| Ngày | Hưng | Hoàng |
|------|---------|------------|
| 21-24/04 | Market Deep-Dive page (P2) | Housing Intel page (P2) |
| 25-27/04 | Fix bugs từ feedback + seed thêm data | UI polish: animations, hover, scroll effects |
| 28-30/04 | Slides thuyết trình (15 slides max) | Demo video pro (captions, music) |
| 01-04/05 | Q&A prep: 20 câu hỏi dự đoán | Final responsive check |
| 05-08/05 | Tập thuyết trình 3 lần (record + xem lại) | Backup video offline |

---

# VÒNG 3 — THUYẾT TRÌNH (09/05)

| Phút | Nội dung | Ai | Slide |
|------|---------|-----|-------|
| 0-2 | "18 tuổi, tôi ước có app này..." + vấn đề Gen Z | Hưng | 1-3 |
| 2-4 | Demo live: Dashboard → Quỹ Chi tiêu | Hoàng | Live |
| 4-6 | Demo: Quỹ Nợ → DTI → Snowball | Hoàng | Live |
| 6-8 | Demo: Risk DNA → Vẹt Vàng roast | Hoàng | Live |
| 8-10 | Kiến trúc 6 AI Agents + Deploy Pipeline | Hưng | 8-12 |
| 10-13 | Viral: Vẹt Vàng marketing + growth | Hưng | 13-14 |
| 13-15 | Kết luận + CTA | Hưng | 15 |
| 15-20 | Q&A | Cả 2 | — |

**Backup:** Nếu internet chết → video demo đã quay sẵn.

---

## ✅ CHECKLIST TRƯỚC KHI NỘP VÒNG 2

### Technical:
- [ ] Landing page match 1:1 với `ui-prototype/index.html`
- [ ] Level system: 4 cấp Vẹt Con / Teen / Phố / Nhà Giàu (không phải 5 cấp)
- [ ] Auth E2E: register → login → dashboard → logout
- [ ] Budget: tạo lọ + ghi chi tiêu + pie chart
- [ ] Debt: thêm nợ + DTI + Snowball/Avalanche
- [ ] Risk DNA: 5 câu + kết quả + share card
- [ ] F&G Index: gauge + 7-day history
- [ ] Morning Brief: AI-generated daily
- [ ] Vẹt Vàng: floating widget + roast + XP bar
- [ ] Cron jobs: market-data (15:30) + brief (6AM) + macro (monthly)
- [ ] Vercel deploy: production URL live
- [ ] Env vars không commit vào git
- [ ] `public/assets/` có đầy đủ images từ prototype

### Content:
- [ ] Demo data seeded (5 pots, 10 expenses, 3 debts)
- [ ] Demo video 3-5 phút
- [ ] Risk Disclaimer visible (đã có trong landing + FAQ)

### Security:
- [ ] GEMINI_API_KEY không có `NEXT_PUBLIC_` prefix
- [ ] Supabase RLS enabled cho tất cả tables
- [ ] `.env.local` trong `.gitignore` ✅
