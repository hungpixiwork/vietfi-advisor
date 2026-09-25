# BÁO CÁO AUDIT KIẾN TRÚC FRONTEND (AGENT 02)
**Dự án:** VietFi Advisor (`vietfi-advisor`)  
**Mục tiêu kiểm toán:** Đánh giá toàn diện kiến trúc Frontend, Component Tree, State Management, Hydration/SSR, Performance, Bundle Size, và tuân thủ UI/UX Guidelines.  
**Ngày thực hiện:** 22/09/2026  
**Trạng thái:** Hoàn thành — Tuyệt đối không can thiệp sửa đổi mã nguồn trong phase này.

---

## MỤC LỤC
1. [Tổng Quan & Kiến Trúc Component Tree](#1-tổng-quan--kiến-trúc-component-tree)
2. [Phân Tích State Management & Luồng Dữ Liệu](#2-phân-tích-state-management--luồng-dữ-liệu)
3. [Đánh Giá Hydration & Ranh Giới Client/Server Component](#3-đánh-giá-hydration--ranh-giới-clientserver-component)
4. [Component Quá Lớn (>300 Dòng), N+1 Waterfall & Trùng Lặp Logic](#4-component-quá-lớn-300-dòng-n1-waterfall--trùng-lặp-logic)
5. [Bundle Size, Thư Viện Thừa Trong Package.json & Xung Đột Design System](#5-bundle-size-thư-viện-thừa-trong-packagejson--xung-đột-design-system)
6. [Rà Soát UI Giả (Mock Data), Huge JSON Payload & Vi Phạm Light Mode / Glassmorphism](#6-rà-soát-ui-giả-mock-data-huge-json-payload--vi-phạm-light-mode--glassmorphism)
7. [Bảng Đánh Giá Mức Độ Rủi Ro & Lộ Trình Khắc Phục (Actionable Roadmap)](#7-bảng-đánh-giá-mức-độ-rủi-ro--lộ-trình-khắc-phục-actionable-roadmap)

---

## 1. TỔNG QUAN & KIẾN TRÚC COMPONENT TREE

### 1.1 Sơ đồ phân bố định tuyến và Component Tree
Dự án sử dụng **Next.js 16 (App Router)** với cấu trúc thư mục chính:
- `src/app/layout.tsx`: Root Layout (Client metadata + Google Font Noto Sans).
- `src/app/page.tsx`: Monolithic Landing Page (1,386 dòng).
- `src/app/dashboard/layout.tsx`: Dashboard Layout wrapper tích hợp `Sidebar`, `GamificationBar`, và `CyberBackground`.
- `src/app/dashboard/*`: 14 route pages con phục vụ các tính năng tài chính.
- `src/components/*`: Chứa 24 components chia thành các domain: `auth/`, `charts/`, `dashboard/`, `debt/`, `gamification/`, `onboarding/`, `portfolio/`, `ui/`.

```
src/
├── app/
│   ├── layout.tsx (Root Layout)
│   ├── page.tsx (Landing Page - Monolith 1,386 LOC)
│   ├── login/ & auth/ (Trùng lặp & nuốt query param)
│   └── dashboard/
│       ├── layout.tsx (Dashboard Shell - Monolith 553 LOC)
│       ├── page.tsx (Dashboard Overview - Monolith 1,031 LOC)
│       ├── backtest/page.tsx (561 LOC)
│       ├── budget/page.tsx (536 LOC)
│       ├── cashflow/page.tsx (Wrapper trùng lặp)
│       ├── debt/page.tsx (382 LOC)
│       ├── gurus/ & gurus/[id]/page.tsx (Mock data)
│       ├── housing/page.tsx (309 LOC)
│       ├── leaderboard/page.tsx (325 LOC - Mock Bot)
│       ├── learn/page.tsx (396 LOC - Embedded JSON)
│       ├── ledger/page.tsx (Isolated Store)
│       ├── market-overview/page.tsx (Duy nhất Server Component)
│       ├── news/page.tsx (235 LOC)
│       ├── personal-cpi/page.tsx (347 LOC)
│       ├── portfolio/page.tsx (380 LOC)
│       ├── risk-profile/page.tsx (Lỗi không lưu kết quả)
│       └── spending-insights/page.tsx (Alias thừa)
└── components/
    ├── auth/ (LoginForm, RegisterForm, OAuthButtons)
    ├── charts/ (TradingViewChart)
    ├── debt/ (AddDebtModal, DTIDominoGauge, FinancialTriageModal, PayDebtModal, ...)
    ├── gamification/ (Badges, Celebration, RequireTier, ShareCard, WeeklyReport, XPToast)
    ├── onboarding/ (QuickSetupWizard)
    ├── portfolio/ (CashflowDNA, GoldTracker)
    └── ui/ (CyberBackground, CyberCard, CyberTypography)
```

### 1.2 Các bất thường kiến trúc & Dead / Orphaned Components
1. **Xung đột luồng Authentication (`/login` vs `/auth/login`):**
   - File [src/app/login/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/login/page.tsx#L1-L5) chỉ thực hiện `redirect("/auth/login")`.
   - Trong khi đó, [src/app/login/actions.ts](file:///D:/07-Competitions-Hackathons/vietfi/src/app/login/actions.ts#L35-L42) liên tục redirect về `/login?error=...` hoặc `/login?message=...`.
   - **Hậu quả:** Khi đăng nhập/đăng ký thất bại, Server Action redirect về `/login?error=...`, nhưng trang `/login` lập tức redirect tiếp sang `/auth/login` mà **không mang theo searchParams**. Thông báo lỗi bị nuốt hoàn toàn, người dùng không hiểu vì sao đăng nhập thất bại.
2. **Trùng lặp định tuyến vô nghĩa:**
   - [src/app/dashboard/spending-insights/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/spending-insights/page.tsx#L1-L8) chỉ có đúng 8 dòng code render `<PersonalCPIPage />`. Trang này là bản sao hoàn toàn của `/dashboard/personal-cpi`.
   - [src/app/dashboard/cashflow/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/cashflow/page.tsx#L72-L73) mount trực tiếp `<BudgetPage />` và `<LedgerPage />`. Trong khi đó, `/dashboard/budget` và `/dashboard/ledger` vẫn tồn tại độc lập thành 2 trang riêng, tạo ra 3 URL hiển thị cùng một nội dung.
3. **Mã nguồn rác (Dead / Orphaned Components) không ai import:**
   - [src/components/debt/DTIDominoGauge.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/components/debt/DTIDominoGauge.tsx) (120 dòng): RefCount = 0.
   - [src/components/gamification/ShareCard.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/components/gamification/ShareCard.tsx) (146 dòng): RefCount = 0.
   - [src/app/dashboard/ledger/components/CategorySheet.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/ledger/components/CategorySheet.tsx) (91 dòng): RefCount = 0.
   - [src/lib/scripted-responses.ts](file:///D:/07-Competitions-Hackathons/vietfi/src/lib/scripted-responses.ts) (806 dòng, 52 KB): Chỉ có test file import, không có bất kỳ component hay route nào sử dụng.
4. **Mascot Vẹt Vàng & Chat AI biến mất khỏi UI:**
   - Tài liệu `AGENTS.md` mô tả linh vật Vẹt Vàng và tính năng Chat AI qua `/api/chat` là "CRITICAL VIRAL FEATURE" được mount vào `dashboard/layout.tsx` (`VetVangFloat`).
   - Trên thực tế: Không có file `VetVangFloat.tsx`, không có thư mục `src/components/vet-vang`, và không hề có route `src/app/api/chat`.

---

## 2. PHÂN TÍCH STATE MANAGEMENT & LUỒNG DỮ LIỆU

### 2.1 Ma trận State Management thực tế

| Công nghệ | Khai báo trong `package.json` | Thực tế triển khai | Đánh giá kiến trúc |
| :--- | :--- | :--- | :--- |
| **Zustand** | ❌ Không có | ❌ Không có | Dự án hoàn toàn không có Global Store dạng Zustand. |
| **React Query (@tanstack)** |  Có (`^5.99.0`) | ❌ **Dead Code 100%** | `QueryProvider.tsx` **chưa từng được mount** vào bất kỳ Layout nào. Toàn bộ hook trong `useUserData.ts` (`useUserBudget`, `useUserDebts`, v.v.) không được gọi. |
| **React Context** |  Native React | ❌ **0 context** | Không có bất kỳ `createContext` hay `useContext` nào trong toàn bộ `src/`. |
| **Custom Hook Store** |  Code tay | ⚠️ Cục bộ (`useLedgerStore`) | [src/lib/stores/ledger-store.ts](file:///D:/07-Competitions-Hackathons/vietfi/src/lib/stores/ledger-store.ts#L52) sử dụng `useState` bên trong custom hook; mỗi lần gọi tạo ra state riêng biệt, không chia sẻ giữa các component. |
| **LocalStorage** |  Native Web API | 🔴 **Lạm dụng làm Global Store** | Đóng vai trò là single source of truth duy nhất, truy xuất phân tán, không đồng bộ reactivity. |

### 2.2 Bằng chứng lạm dụng Polling gây rò rỉ hiệu năng trong Layout
Tại [src/app/dashboard/layout.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/layout.tsx#L137-L150):
```typescript
// Dòng 137-146 tại src/app/dashboard/layout.tsx
const t = setInterval(() => {
  const newGam = getGamification();
  if (newGam.xp > prevXPRef.current) {
    setXpFlash(true);
    setTimeout(() => setXpFlash(false), 600);
    prevXPRef.current = newGam.xp;
  }
  setGam(newGam); // <-- LỖI NGHIÊM TRỌNG: newGam luôn là object reference mới
}, 1000);
```
**Phân tích tác động:**
- Hàm `getGamification()` tại [src/lib/application/gamification/index.ts](file:///D:/07-Competitions-Hackathons/vietfi/src/lib/application/gamification/index.ts#L48) luôn trả về `{ ...DEFAULT_GAMIFICATION_STATE, ...valid }` (new object reference).
- Lệnh `setGam(newGam)` được kích hoạt **mỗi giây 1 lần vô điều kiện**, khiến component `GamificationBar` cùng toàn bộ icon, animation Framer Motion và progress bar trong TopBar bị re-render liên tục 60 lần/phút ngay cả khi người dùng không thao tác gì.
- Dự án hoàn toàn thiếu cơ chế Event-driven (như `window.dispatchEvent(new CustomEvent('vietfi_xp_changed'))`) hoặc Custom hook lắng nghe `StorageEvent`.

### 2.3 Lỗi logic nghiêm trọng: Mất dữ liệu kết quả Risk Profile
Tại [src/app/dashboard/risk-profile/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/risk-profile/page.tsx#L45-L48):
```typescript
// Dòng 45-48 tại src/app/dashboard/risk-profile/page.tsx
const r = calculateRiskProfile(newAnswers);
setResult(r);
setStep(5);
// THIẾU HOÀN TOÀN: setRiskResult(r)
```
**Phân tích tác động:**
- Sau khi hoàn thành trắc nghiệm 5 câu hỏi tâm lý đầu tư, người dùng bấm nút chuyển tiếp sang "Xây danh mục AI" tại `/dashboard/portfolio`.
- Tại [src/app/dashboard/portfolio/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/portfolio/page.tsx#L831): `const riskResult = getRiskResult();` lập tức trả về `null` vì trang trước chưa bao giờ lưu kết quả vào `localStorage` hay Supabase. Toàn bộ luồng cá nhân hóa danh mục bị đứt gãy.

---

## 3. ĐÁNH GIÁ HYDRATION & RANH GIỚI CLIENT/SERVER COMPONENT

### 3.1 Tình trạng lạm dụng `'use client'`
Next.js App Router được thiết kế để render Server Component theo mặc định nhằm tối ưu TTFB, SEO và giảm bundle size. Tuy nhiên, tại VietFi:
- `src/app/page.tsx` (Toàn bộ Landing Page 1,386 dòng): Khai báo `'use client'` ngay dòng 1 vì chứa `framer-motion` và `useTilt`. Không hề có ranh giới Server/Client để stream nội dung tĩnh.
- `src/app/dashboard/layout.tsx`: Khai báo `'use client'`, biến toàn bộ cây layout con thành Client Context.
- **13/14 trang dashboard** đều đánh dấu `'use client'` ở dòng đầu tiên. Trang duy nhất có Server Component là `market-overview/page.tsx`, nhưng nó chỉ làm vỏ bọc chuyển tiếp props sang `MarketOverviewShell.tsx` (`'use client'`).

### 3.2 Lỗ hổng Hydration Mismatch do đọc LocalStorage trong Render Body
Tại [src/lib/infrastructure/persistence/storage.ts](file:///D:/07-Competitions-Hackathons/vietfi/src/lib/infrastructure/persistence/storage.ts#L53-L58):
```typescript
// Dòng 53-58 tại src/lib/infrastructure/persistence/storage.ts
function getItem<T>(key: string, fallback: T): T {
    if (isServer) return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return safeParseJSON<T>(raw) ?? fallback;
}
```
Khi các component gọi hàm này đồng bộ trong thân render (Body Render) thay vì trong `useEffect`:
- **Server Render:** `isServer === true` $\rightarrow$ Trả về giá trị mặc định (`fallback`).
- **Client Render lần đầu (Hydration phase):** `window` đã tồn tại $\rightarrow$ Trả về dữ liệu trong `localStorage`.
- **Hệ quả:** React 19 phát hiện DOM được render từ Server (`0đ` hoặc mảng rỗng) không trùng khớp với DOM trên Client (`15.000.000đ` hoặc mảng thật). Kết quả ném lỗi Hydration Error, huỷ bỏ HTML từ server và gây co giật giao diện (Layout Shift).

**Các vị trí vi phạm cụ thể:**
- [src/components/gamification/ShareCard.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/components/gamification/ShareCard.tsx#L28): `const gam = getGamification();` thực thi ngay trong thân hàm component.
- [src/app/dashboard/personal-cpi/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/personal-cpi/page.tsx#L52-L56): `useState` khởi tạo đồng bộ lấy `CPI_CATEGORIES.officialWeight` nhưng các component con đọc trực tiếp pots từ storage.
- [src/app/dashboard/debt/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/debt/page.tsx#L49): Khởi tạo `useState(defaultDebts)` (5 khoản nợ giả), sau đó trong `useEffect` mới set lại nợ thật từ storage $\rightarrow$ Người dùng luôn thấy 5 khoản nợ lạ nhấp nháy trước khi dữ liệu của mình hiện lên.

### 3.3 Chặn hiển thị SSR vô lý bằng `RequireTier`
Tại [src/components/gamification/RequireTier.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/components/gamification/RequireTier.tsx#L31-L37):
```typescript
// Dòng 31-37 tại src/components/gamification/RequireTier.tsx
if (!isClient) {
  // Return skeleton or null during SSR to avoid hydration mismatch
  return <div className="animate-pulse bg-white/5 h-64 rounded-xl w-full"></div>;
}
return <>{children}</>;
```
- Component này bọc bên ngoài toàn bộ nội dung của trang `/dashboard/backtest` và `/dashboard/personal-cpi`.
- **Hệ quả:** Server luôn render một thẻ `div` xám xịt 256px rỗng. Toàn bộ nội dung phân tích tài chính bị giấu khỏi Search Engine bots (SEO = 0) và người dùng mạng chậm phải nhìn khung xám chờ JS tải xong.

---

## 4. COMPONENT QUÁ LỚN (>300 DÒNG), N+1 WATERFALL & TRÙNG LẶP LOGIC

### 4.1 Danh sách 14 Component vượt ngưỡng 300 dòng

| Đường dẫn file | Số dòng (LOC) | Thành phần nhồi nhét chưa tách |
| :--- | :--- | :--- |
| [src/app/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/page.tsx) | **1,386** | Hero, TiltCard, 3D Tilt hook, Testimonials, FAQ, Pricing, Footer, Canvas particle. |
| [src/app/dashboard/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/page.tsx) | **1,031** | `AnimatedCounter`, `NetWorthCard`, `PortfolioMini`, `BriefCard`, `NewsFeed`, Net Worth state machine. |
| [src/app/dashboard/backtest/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/backtest/page.tsx) | **603** | Strategy selector, parameter form, metrics table, trade log table, TradingView wrapper. |
| [src/app/dashboard/components/MarketSection.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/components/MarketSection.tsx) | **597** | `MarketCard`, `FGGauge`, `MarketSkeletonCard`, Push Notification trigger, 5-phút interval. |
| [src/app/dashboard/budget/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/budget/page.tsx) | **591** | `AddPotModal`, `ExpenseModal`, Category icon list, CyberCard clone, PieChart config. |
| [src/app/dashboard/layout.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/layout.tsx) | **553** | `GamificationBar`, `Sidebar`, Logout Modal, navigation state, 1-second polling timer. |
| [src/components/onboarding/QuickSetupWizard.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/components/onboarding/QuickSetupWizard.tsx) | **483** | Form 4 bước, Risk quiz, Net worth chips, SVG corner decors, technical grid. |
| [src/components/debt/FinancialTriageModal.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/components/debt/FinancialTriageModal.tsx) | **435** | Scanner animation, Diagnosis phase, Surgery sliders, Triage doctor dialogue, Recharts area. |
| [src/app/dashboard/learn/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/learn/page.tsx) | **416** | 4 bài học đầy đủ (slides + quiz data), quiz state machine, Confetti controller. |
| [src/app/dashboard/debt/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/debt/page.tsx) | **416** | DTI gauge, Debt list, Avalanche/Snowball table, CSV export handler, Default mock data. |
| [src/app/dashboard/portfolio/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/portfolio/page.tsx) | **413** | Rebalancing engine, Allocation PieChart, Action list, 3 un-debounced fetch waterfalls. |
| [src/app/dashboard/personal-cpi/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/personal-cpi/page.tsx) | **381** | GSO preset weights, 7 weight sliders, inflation rebalancing calculation, breakdown list. |
| [src/app/dashboard/leaderboard/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/leaderboard/page.tsx) | **367** | Seeded random bot generator, Tier badges, Trend arrows, Rank progression bar. |
| [src/app/dashboard/housing/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/housing/page.tsx) | **336** | Hardcoded area prices, Buy vs Rent mortgage calculation, Social housing list. |

### 4.2 N+1 Waterfall Render & Spanning Requests không có Debounce

#### Trường hợp 1: Spanning Fetch trên mỗi phím gõ tại Portfolio Page
Tại [src/app/dashboard/portfolio/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/portfolio/page.tsx#L123-L133) và [L166](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/portfolio/page.tsx#L166):
```typescript
// Dòng 123-133 tại src/app/dashboard/portfolio/page.tsx
useEffect(() => {
  fetch(`/api/portfolio/backtest?capital=${capital}&riskType=${riskType}`)
    .then(r => r.json())
    .then(d => setBacktestData(d))
    .catch(() => { });

  fetch(`/api/portfolio/projection?capital=${capital}&riskType=${riskType}`)
    .then(r => r.json())
    .then(d => setProjectionData(d))
    .catch(() => { });
}, [capital, riskType]);

// Dòng 166:
<input type="number" value={capital} onChange={(e) => setCapital(Number(e.target.value))} />
```
**Hậu quả:** Khi người dùng nhập số tiền (ví dụ gõ `100000000` - 9 ký tự), ứng dụng lập tức bắn **18 HTTP requests đồng thời** tới 2 endpoint nặng của backend. Hoàn toàn không có `debounce`, không có `useTransition`, và không có `AbortController` huỷ request cũ, gây race condition khi kết quả cũ đến sau ghi đè kết quả mới.

#### Trường hợp 2: Waterfall Render phân tán trên Dashboard
Tại `src/app/dashboard/page.tsx`:
- Dòng 746: `fetchMorningBrief()` gửi `POST /api/morning-brief`.
- Dòng 812: `fetchNews()` gửi `GET /api/news`.
- Bên trong component con [src/app/dashboard/components/MarketSection.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/components/MarketSection.tsx#L469): lại tự kích hoạt `fetch("/api/market-data")`.
Mỗi request chạy trong một `useEffect` riêng biệt, không phối hợp chung qua Server Component hoặc React Query, dẫn đến hiện tượng UI giật cục (layout pop-in) 3 lần liên tiếp khi vào trang.

### 4.3 Trùng lặp Component & Phân mảnh Formatters
1. **Trùng lặp khai báo `CyberCard`:**
   - Đã được định nghĩa chuẩn tại [src/components/ui/CyberCard.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/components/ui/CyberCard.tsx).
   - Tuy nhiên tại [src/app/dashboard/budget/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/budget/page.tsx#L52-L71), một phiên bản `CyberCard` khác được copy-paste trực tiếp dài 20 dòng thay vì import từ thư viện dùng chung.
2. **Loạn hàm định dạng tiền tệ (`formatVND`):**
   - Tìm thấy ít nhất 5 triển khai `formatVND` độc lập tại:
     - `src/lib/stores/ledger-store.ts` (dòng 27)
     - `src/app/dashboard/budget/page.tsx` (dòng 41)
     - `src/components/debt/types.ts` (dòng 15)
     - `src/components/portfolio/CashflowDNA.tsx` (dòng 14)
     - `src/components/onboarding/QuickSetupWizard.tsx` (dòng 63)
   - Mỗi file lại làm tròn khác nhau: chỗ thì ra "tr", chỗ thì "K", chỗ thì "TRIỆU", chỗ thì có dấu cách, chỗ thì dùng `Intl.NumberFormat`.

---

## 5. BUNDLE SIZE, THƯ VIỆN THỪA TRONG PACKAGE.JSON & XUNG ĐỘT DESIGN SYSTEM

### 5.1 Danh sách thư viện rác / thừa trong `package.json`

| Thư viện | Phiên bản | Tình trạng trong `src/` | Hành động đề xuất |
| :--- | :--- | :--- | :--- |
| `hooks` | `^0.3.2` | ❌ **0 lượt sử dụng** (Gói cổ lỗ sĩ của mongoose) | Gỡ bỏ ngay lập tức (`npm rm hooks`). |
| `lottie-react` | `^2.4.1` | ❌ **0 lượt sử dụng** (Không có file Lottie nào trong component) | Gỡ bỏ hoặc hoàn thiện component Vẹt Vàng. |
| `@ai-sdk/react` | `^3.0.118` | ❌ **0 lượt sử dụng** (Không có useChat nào) | Gỡ bỏ để giảm bundle size. |
| `@google/generative-ai`| `^0.24.1` | ❌ **0 lượt sử dụng** (Backend dùng `@ai-sdk/google`) | Gỡ bỏ tránh xung đột duplicate SDK. |
| `class-variance-authority` | `^0.7.1` | ❌ **0 lượt sử dụng** (Không dùng CVA) | Gỡ bỏ. |
| `dotenv` | `^17.3.1` | ❌ **0 lượt sử dụng** (Next.js tự load `.env`) | Gỡ bỏ. |
| `edge-tts-universal` | `^1.4.0` | ❌ **0 lượt sử dụng** (Route `/api/tts` đã bị hardcode 405) | Gỡ bỏ. |

### 5.2 Xung đột kép 2 thư viện đồ thị: `recharts` vs `lightweight-charts`
- `recharts` (`^3.8.0`): Được import tại 7 vị trí (`budget`, `debt`, `gurus/[id]`, `housing`, `portfolio`, `risk-profile`, `FinancialTriageModal`). Kích thước bundle xấp xỉ ~400KB (chưa nén).
- `lightweight-charts` (`^4.2.3`): Được import duy nhất tại `src/components/charts/TradingViewChart.tsx`.
- **Hệ quả:** Dự án phải chịu tải cùng lúc 2 thư viện đồ thị đồ sộ. Mặc dù `TradingViewChart` được dynamic import, việc duy trì 2 engine vẽ Canvas/SVG khác biệt gây phân mảnh token màu sắc, tooltip và làm phình to `node_modules` cũng như dung lượng deploy Vercel.

### 5.3 Xung đột Design System (3 hệ tư tưởng đối lập nhau)
1. **Hệ 1: `.glass-card` (CSS Cổ Điển):**
   Tại [src/app/globals.css](file:///D:/07-Competitions-Hackathons/vietfi/src/app/globals.css#L92-L105):
   ```css
   .glass-card p, .glass-card span, .glass-card a, .glass-card h1, ... {
     color: rgba(240, 240, 245, 0.92) !important;
   }
   ```
   Việc gán `!important` lên **tất cả thẻ con** bên trong `.glass-card` phá vỡ hoàn toàn tính cascade của CSS. Các badge trạng thái xanh lá (`#22C55E`), đỏ (`#EF4444`) hay warning nếu nằm trong thẻ `p` hoặc `span` của `.glass-card` đều bị cưỡng bức biến thành màu trắng xám.
2. **Hệ 2: `CyberCard` / `CyberTypography` (Tech Dark Theme):**
   Tại [src/components/ui/CyberCard.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/components/ui/CyberCard.tsx#L23):
   Hardcode nền `bg-[#08110f]`, viền `border-white/10`, và hiệu ứng `group-hover:translate-x-1` (di chuyển 4px sang phải khi hover, gây rung lắc khi di chuột qua các button con).
3. **Phụ thuộc tài nguyên bên ngoài không an toàn:**
   Tại [src/components/ui/CyberBackground.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/components/ui/CyberBackground.tsx#L91):
   ```tsx
   style={{ backgroundImage: 'url("https://grains-img.vercel.app/noise.png")' }}
   ```
   Background toàn app đang load trực tiếp 1 file ảnh noise từ domain ngoài `grains-img.vercel.app`. Nếu domain này chết hoặc người dùng dùng PWA offline, ứng dụng sẽ dính lỗi request lỗi và mất hình nền.

---

## 6. RÀ SOÁT UI GIẢ (MOCK DATA), HUGE JSON PAYLOAD & VI PHẠM LIGHT MODE / GLASSMORPHISM

### 6.1 Bằng chứng UI Giả (Fake UI / Hardcoded Data)
1. **Leaderboard 100% là Bot tự sinh bằng Math.sin:**
   Tại [src/app/dashboard/leaderboard/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/leaderboard/page.tsx#L11-L83):
   14 đối thủ ("Hải Quay Xe", "Vẹt Đu Đỉnh", "Trader Mõm", "Cá Mập Con", "Bắt Đáy Cụt Tay", ...) được sinh ngẫu nhiên từ hàm `seededRandom()`. Không có API hay bảng DB nào phía sau.
2. **Trang Guru Detail 100% Mock:**
   Tại [src/app/dashboard/gurus/[id]/page.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/gurus/%5Bid%5D/page.tsx#L111-L144):
   Dù người dùng bấm vào Warren Buffett, Peter Lynch, hay George Soros, danh mục Watchlist hiển thị bên dưới luôn là **3 mã cổ phiếu cứng FPT, GMD, VIX** với đúng từng số thập phân ("115.0", "82.1 - 82.5", "-5.6%"). Biểu đồ là `Math.random()`.
3. **Thị trường BTC bị gán cứng:**
   Tại [src/app/dashboard/components/MarketSection.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/components/MarketSection.tsx#L55):
   Khi snapshot chưa có BTC, app gán cứng: `{ label: "BTC", value: "$83,450", change: -0.8 }`.
4. **Housing & Learn nhồi nhét JSON vào mã nguồn:**
   - `src/app/dashboard/housing/page.tsx`: Dữ liệu `AREA_PRICES` và `SOCIAL_HOUSING` là mảng tĩnh trong code, không kết nối nguồn dữ liệu nào.
   - `src/app/dashboard/learn/page.tsx`: Chứa hơn 20KB text bài học và câu hỏi trắc nghiệm nhét thẳng vào file client.

### 6.2 Nguy cơ Huge JSON Payload tại Backtest Engine
Tại [src/app/api/backtest/route.ts](file:///D:/07-Competitions-Hackathons/vietfi/src/app/api/backtest/route.ts#L147-L150):
API trả về client object chứa:
- `ohlcv: bars`: Toàn bộ dữ liệu giá nến lịch sử (250 đến 1,000 ngày, mỗi bar gồm timestamp, open, high, low, close, volume).
- `equity`: Chuỗi hàng ngàn điểm equity curve.
- `trades`: Danh sách toàn bộ lệnh giao dịch.
Toàn bộ JSON thô khổng lồ này được ném về trình duyệt và lưu vào state `useState<BacktestResponse | null>(null)` tại `backtest/page.tsx`, gây tiêu tốn bộ nhớ RAM trình duyệt di động và làm nghẽn main thread khi parse JSON.

### 6.3 Vi phạm nghiêm trọng Nguyên Tắc Giao Diện Toàn Cục (Light Mode & Glassmorphism)

> **Quy định bắt buộc từ User & Machine-Wide Rules:**
> 1. Giao diện **LUÔN SÁNG MÀU (Light Mode)**: nền sáng thì chữ đậm (`#0F172A`), nền đậm thì chữ sáng. Đơn giản, thực tế, dễ nhìn.
> 2. **TUYỆT ĐỐI KHÔNG XÀI GLASSMORPHISM** (không mờ mờ ảo ảo, không `backdrop-filter`).
> 3. Phải có `scrollbar-gutter: stable` và `text-wrap: pretty`.

**Thực tế vi phạm trong mã nguồn:**
1. **Cưỡng bức Dark Mode toàn hệ thống:**
   - [src/app/layout.tsx](file:///D:/07-Competitions-Hackathons/vietfi/src/app/layout.tsx#L41): `<html lang="vi" className="dark">` và `<meta name="theme-color" content="#0A0B0F" />`.
   - [src/app/globals.css](file:///D:/07-Competitions-Hackathons/vietfi/src/app/globals.css#L36-L40): `color-scheme: dark;` và `--color-bg: #0a0a0f;`.
   - Toàn bộ component trong `src/components/ui/` (`CyberCard`, `CyberTypography`) đều mang token màu tối kịt (`#08110f`, `#050A09`) và chữ màu trắng (`text-white`).
2. **Lạm dụng Glassmorphism tràn lan (70+ vị trí):**
   - Tìm thấy 70 trường hợp sử dụng `backdrop-blur-*`, `glass-card`, và `backdrop-filter: blur(...)`.
   - Landing page dùng `backdrop-blur-2xl`, `backdrop-blur-xl`.
   - Header, Sidebar, Modal (`AddDebtModal`, `FinancialTriageModal`, `QuickSetupWizard`) đều dùng `bg-black/80 backdrop-blur-xl`.
   - `globals.css` định nghĩa `.glass-card` với `backdrop-filter: blur(20px)`.
3. **Thiếu vắng thuộc tính chống giật khung hình:**
   - Không có `scrollbar-gutter: stable` trên `html`/`body` $\rightarrow$ Khi mở modal hoặc khi trang dài xuất hiện thanh cuộn, toàn bộ bố cục trang bị giật ngang 15-17px.
   - Không có `text-wrap: pretty` trên các tiêu đề $\rightarrow$ Chữ đơn lẻ bị rớt dòng cụt lủn (orphan words) trên màn hình di động.

---

## 7. BẢNG ĐÁNH GIÁ MỨC ĐỘ RỦI RO & LỘ TRÌNH KHẮC PHỤC (ACTIONABLE ROADMAP)

### 7.1 Bảng tổng kết mức độ nghiêm trọng (Severity Matrix)

| Vấn đề | Vị trí | Mức độ | Rủi ro chính |
| :--- | :--- | :---: | :--- |
| **Mất kết quả trắc nghiệm Risk Profile** | `risk-profile/page.tsx` (L45-48) | 🔴 **CRITICAL** | Gãy luồng người dùng: Portfolio không nhận diện được khẩu vị rủi ro. |
| **Nuốt thông báo lỗi Auth do redirect sai** | `login/page.tsx` & `actions.ts` | 🔴 **CRITICAL** | Người dùng không thể biết lỗi đăng nhập/đăng ký là gì. |
| **Lạm dụng Polling 1s/lần trong Layout** | `dashboard/layout.tsx` (L137) | 🔴 **CRITICAL** | CPU throttle, pin thiết bị cạn nhanh, liên tục re-render TopBar. |
| **Spanning Fetch không debounce** | `portfolio/page.tsx` (L124) | 🔴 **CRITICAL** | Bắn 18 request/lần gõ số vốn, race condition làm sai lệch biểu đồ. |
| **Vi phạm toàn bộ quy chuẩn Light Mode & Glass** | `layout.tsx`, `globals.css`, UI | 🔴 **CRITICAL** | Vi phạm trực tiếp Rule bắt buộc: nền tối đen kịt, lạm dụng blur 70+ nơi. |
| **Hydration Mismatch từ Storage đồng bộ** | `storage.ts`, `ShareCard.tsx` | 🟠 **HIGH** | React 19 văng cảnh báo đỏ console, layout shift, giật DOM. |
| **Khoá màn hình SSR bằng RequireTier** | `RequireTier.tsx` (L31) | 🟠 **HIGH** | Điểm SEO = 0 cho các trang quan trọng, màn hình xám khi mạng chậm. |
| **14 Monolithic Components (>300 LOC)** | `app/page.tsx`, `dashboard/*` | 🟠 **HIGH** | Code khó bảo trì, bundle phình to, vi phạm chuẩn Clean Code. |
| **7 Thư viện rác trong package.json** | `package.json` (`hooks`, `lottie`, etc.) | 🟡 **MEDIUM** | Làm nặng bundle, tăng nguy cơ bảo mật chuỗi cung ứng. |
| **UI giả chưa kết nối backend** | `leaderboard`, `gurus/[id]`, etc. | 🟡 **MEDIUM** | Người dùng phát hiện dữ liệu ảo, làm giảm độ uy tín sản phẩm. |

---

### 7.2 Đề xuất kiến trúc cho giai đoạn tái cấu trúc (Refactoring Plan)

```
┌──────────────────────────────────────────────────────────────┐
│                     Next.js Root Layout                      │
│             (Light Mode Theme: #F8FAFC / #0F172A)            │
│               scrollbar-gutter: stable                       │
└──────────────────────────────┬───────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
    ┌───────────▼───────────┐     ┌───────────▼───────────┐
    │ ReactQueryProvider    │     │ VietFi Event Bus      │
    │ (Mount tại Layout)    │     │ (CustomEvent/SyncStore│
    │ Cache market/news/pots│     │ thay thế polling 1s)  │
    └───────────┬───────────┘     └───────────┬───────────┘
                │                             │
    ┌───────────▼─────────────────────────────▼───────────┐
    │              Dashboard Shell (Light Mode)           │
    │  - Nền sáng `#F8FAFC`, chữ đậm `#0F172A`            │
    │  - Card phẳng viền mảnh `#E2E8F0`, bỏ backdrop-blur │
    │  - Dynamic Import tách biệt cho TradingView/Recharts│
    └─────────────────────────────────────────────────────┘
```

#### Bước 1: Khắc phục ngay các lỗi gãy luồng người dùng (P0)
1. Thêm `setRiskResult(r)` và đồng bộ `saveRiskResult` vào Supabase trong `src/app/dashboard/risk-profile/page.tsx`.
2. Xử lý forward `searchParams` trong `src/app/login/page.tsx` hoặc chuyển hướng thẳng Server Action về `/auth/login?error=...`.
3. Loại bỏ vòng lặp `setInterval(..., 1000)` trong `src/app/dashboard/layout.tsx`. Thay thế bằng custom hook `useGamification()` tích hợp `useSyncExternalStore` hoặc Event-driven update khi có hành động `addXP`.
4. Bổ sung `useDebounce` (300ms) và `AbortController` cho input vốn đầu tư trong `src/app/dashboard/portfolio/page.tsx`.

#### Bước 2: Tinh chỉnh Design System theo chuẩn Light Mode & No Glassmorphism (P0)
1. Trong `src/app/layout.tsx`: Chuyển `<html className="dark">` thành `<html className="light">` và đặt theme-color sáng (`#FFFFFF`).
2. Trong `src/app/globals.css`:
   - Định nghĩa lại bảng màu Light Mode chuẩn: nền chính `#F8FAFC`, nền thẻ `#FFFFFF`, màu chữ `#0F172A`, viền `#E2E8F0`.
   - Xóa bỏ class `.glass-card`, thay bằng `.card-clean` (nền trắng đặc, viền `1px solid #E2E8F0`, shadow tinh tế không blur).
   - Thêm `scrollbar-gutter: stable;` và `text-wrap: pretty;`.
3. Chuyển đổi `CyberCard` và `CyberTypography` sang palette Light mode hoặc thay thế bằng component chuẩn dùng thẻ nền sáng, chữ tối.
4. Tải file noise background về local `public/assets/noise.png`, chấm dứt việc load từ URL ngoài `grains-img.vercel.app`.

#### Bước 3: Dọn dẹp Package.json & Tách nhỏ Monolith Component (P1)
1. Gỡ bỏ 7 packages thừa: `npm rm hooks lottie-react @ai-sdk/react @google/generative-ai class-variance-authority dotenv edge-tts-universal`.
2. Tách nhỏ `src/app/page.tsx` (1,386 dòng) thành các section riêng biệt: `HeroSection.tsx`, `FeaturesGrid.tsx`, `TestimonialsSection.tsx`, `PricingFAQ.tsx`, `LandingFooter.tsx`.
3. Tách `src/app/dashboard/page.tsx` (1,031 dòng): Đưa `NetWorthCard`, `PortfolioMini`, `BriefCard`, `NewsFeed` thành các file độc lập trong thư mục `src/app/dashboard/components/`.
4. Kích hoạt `QueryProvider` tại Root Layout và chuyển các logic fetch tay rải rác (`/api/news`, `/api/market-data`, `/api/morning-brief`) về React Query với staleTime hợp lý (5-15 phút).

---
*Báo cáo được lập bởi: **Agent 02 (Frontend Architecture Auditor)** — Dự án VietFi Advisor.*
