# BÁO CÁO KIỂM TOÁN HIỆU NĂNG & TẢI TRỌNG DỮ LIỆU (AGENT 07: PERFORMANCE & PAYLOAD AUDITOR)
**Dự án:** VietFi Advisor (`D:\07-Competitions-Hackathons\vietfi`)  
**Thời gian thực hiện:** 22/09/2026  
**Vai trò:** Agent 07 — Performance & Payload Auditor  
**Nguyên tắc:** Báo cáo kiểm toán độc lập — **TUYỆT ĐỐI KHÔNG SỬA CODE DỰ ÁN TRONG PHASE NÀY**.

---

## TỔNG KẾT ĐÁNH GIÁ NHANH (EXECUTIVE SUMMARY)

| Hạng mục kiểm toán | Hiện trạng thực tế | Mức độ nghiêm trọng | Tiềm năng tối ưu |
| :--- | :--- | :--- | :--- |
| **Static Assets (`public/`)** | **18.84 MB** (205 files), trong đó **17.06 MB** là file rác/ảnh chụp audit/MP3 thừa không hề được code gọi tới (> 90.5% rác). | 🔴 **CRITICAL** | Giảm từ **18.84 MB** xuống **< 400 KB** (giảm **97.8%** kích thước CDN deploy). |
| **Dependencies Footprint** | 7 dependencies rác / zombie (`hooks`, `edge-tts-universal`, `@google/generative-ai`, `@ai-sdk/react`, `lottie-react`, `dotenv`, `@tanstack/react-query` không mount). Trùng lặp 2 thư viện chart (`recharts` + `lightweight-charts`). | 🟠 **HIGH** | Giảm bundle JS khách tải về ước tính **~250 KB - 380 KB (gzipped)**. |
| **Tải trọng API (Payload Size)** | API `/api/backtest` đổ thô **150 - 250 KB** JSON. API `/api/news` dump 96 bài báo (**35 - 50 KB**) trong khi giao diện chỉ vẽ 10 bài. API `/api/morning-brief` trả trùng lặp trường `raw` dạng chuỗi JSON hóa. | 🔴 **CRITICAL** | Giảm **75% - 90%** dung lượng payload mạng của các API chính. |
| **Request Waterfall & Storm** | Khi vào Dashboard, client bắn **4 request HTTP song song**, trong đó có 2 request gọi trùng `/api/market-data` kèm `cache: "no-store"`. Server backend bị kích hoạt crawl lặp lại tới 3 lần song song. | 🔴 **CRITICAL** | Gom thành 1 request tổng hợp duy nhất hoặc chia sẻ cache SWR, giảm **75%** số lượng request roundtrip. |
| **Cache Control & Edge Caching** | `/api/market-data` và `/api/morning-brief` **hoàn toàn thiếu header `Cache-Control`**. Phía client lại gắn cờ `{ cache: "no-store" }`, triệt tiêu toàn bộ CDN Edge Cache của Vercel. | 🟠 **HIGH** | Tiết kiệm **80% - 95%** CPU serverless compute và giảm TTFB từ ~1.8s xuống < 50ms (Edge Cache HIT). |

---

## 1. AUDIT STATIC ASSETS (`public/`) & TẢI TRỌNG CDN

### 1.1. Phân bổ dung lượng thư mục `public/`

Kiểm tra định lượng bằng lệnh PowerShell thực tế trên ổ cứng:
- **Tổng số file:** 205 files
- **Tổng dung lượng:** 18.84 MB

```
public/
├── docs/          : 57 files  ─── 10.14 MB (53.8%)  ─── [RÁC 100% - Ảnh chụp màn hình kiểm thử]
├── audio/         : 125 files ───  6.92 MB (36.7%)  ─── [RÁC 100% - File MP3 thừa khi TTS đã bị tắt]
├── assets/        : 10 files  ───  1.38 MB ( 7.3%)  ─── [Ảnh PNG chưa nén / tối ưu]
├── animations/    : 5 files   ───  0.39 MB ( 2.1%)  ─── [Lottie JSON không có component nào render]
└── root assets    : 8 files   ───  0.01 MB ( 0.1%)  ─── [sw.js, manifest.json, svgs chuẩn]
```

### 1.2. Phát hiện 3 ổ lãng phí dung lượng tĩnh nghiêm trọng

#### 🔴 Phát hiện 1: `public/docs/` chứa 10.14 MB ảnh chụp màn hình kiểm thử
- **Thực tế:** Thư mục [`public/docs/`](file:///D:/07-Competitions-Hackathons/vietfi/public/docs) chứa 57 file ảnh PNG chụp lại màn hình các đợt audit trước đây (ví dụ: `cmc_middle_section_1773928007869.png` 451.8 KB, `audit_sentiment_...` 227.8 KB, `vet_vang_chat_open_...` 328.6 KB).
- **Hậu quả:** Next.js mặc định copy toàn bộ thư mục `public/` lên Vercel CDN và đẩy vào gói deployment artifact. Mỗi lần deploy, Vercel phải nén và phân phối 10.14 MB ảnh tư liệu nội bộ của dev ra production!
- **Đánh giá:** 100% file trong này không phục vụ người dùng cuối.

#### 🔴 Phát hiện 2: `public/audio/tts/` chứa 6.92 MB file MP3 khi Web Audio Synthesizer đã thay thế hoàn toàn
- **Thực tế:** Thư mục [`public/audio/tts/`](file:///D:/07-Competitions-Hackathons/vietfi/public/audio/tts) chứa 125 file MP3 (từ `tiet_kiem_1.mp3` 405.3 KB đến hàng loạt file roast, motivate).
- **Tuy nhiên đối chiếu code:**
  1. Tại [`src/app/api/tts/route.ts`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/api/tts/route.ts#L5-L8):
     ```typescript
     // TTS đã bị tắt theo yêu cầu product.
     export async function POST() {
       return jsonError("TTS đã bị tắt", 405);
     }
     ```
  2. Tại [`src/lib/sounds.ts`](file:///D:/07-Competitions-Hackathons/vietfi/src/lib/sounds.ts#L1-L5):
     ```typescript
     /**
      * Sound Effects — Web Audio API Synthesizer
      * Zero MP3 files. All sounds generated via oscillators + gain envelopes.
      */
     ```
  3. Quét toàn bộ mã nguồn `src/` bằng cú pháp regex `audio/|\.mp3`: **Kết quả trả về 0 dòng code tham chiếu tới bất kỳ file MP3 nào!**
- **Hậu quả:** 6.92 MB audio hoàn toàn bị bỏ quên và biến thành "gánh nặng vô hình" trên CDN.

#### 🟡 Phát hiện 3: Ảnh PNG trong `public/assets/` chưa tối ưu nén & thiếu định dạng WebP
- [`public/assets/mascot.png`](file:///D:/07-Competitions-Hackathons/vietfi/public/assets/mascot.png) có dung lượng tới **651.2 KB** ở định dạng PNG thô 32-bit.
- [`public/assets/icon.png`](file:///D:/07-Competitions-Hackathons/vietfi/public/assets/icon.png) có dung lượng tới **462.5 KB**.
- [`public/assets/level-5-phuong-hoang.png`](file:///D:/07-Competitions-Hackathons/vietfi/public/assets/level-5-phuong-hoang.png) dung lượng **122.5 KB**.
- **Giải pháp:** Nếu chuyển sang định dạng lossless/lossy WebP hoặc nén bằng `oxipng` / `sharp`, `mascot.png` sẽ giảm từ 651 KB xuống ~45 KB (giảm 93%), `icon.png` giảm từ 462 KB xuống ~25 KB.

#### 🟡 Phát hiện 4: 390 KB file Lottie trong `public/animations/` không được nạp
- Thư mục `public/animations/` chứa 5 file JSON Lottie (`vet-vang-idle.json` 73 KB và 4 file trong `parts/`).
- Quét toàn bộ mã nguồn `src/`: Không hề có component nào import hay `fetch()` tới các file này (Lottie component cũ đã bị gỡ).

---

## 2. AUDIT DEPENDENCIES & JS BUNDLE FOOTPRINT (`package.json`)

### 2.1. Danh sách Zombie & Unused Dependencies

Rà soát từng package trong [`package.json`](file:///D:/07-Competitions-Hackathons/vietfi/package.json) đối chiếu với các lệnh import thực tế trong thư mục `src/`:

| Package trong `package.json` | Phiên bản | Tình trạng trong `src/` | Ước tính kích thước | Đánh giá & Khuyến nghị |
| :--- | :--- | :--- | :--- | :--- |
| `hooks` | `^0.3.2` | **0 dòng code import** | ~8 KB | **Rác tuyệt đối.** Nhầm lẫn khi install hoặc dependency thừa. Cần `npm rm hooks`. |
| `edge-tts-universal` | `^1.4.0` | **0 dòng code import** | ~45 KB | **Thừa.** Endpoint `/api/tts` đã trả về lỗi 405 và disable. Cần gỡ bỏ. |
| `@google/generative-ai` | `^0.24.1` | **0 dòng code import** | ~120 KB | **Zombie.** Dự án đã dùng `@ai-sdk/google`. Gỡ bỏ ngay lập tức. |
| `@ai-sdk/react` | `^3.0.118` | **0 dòng code import** | ~35 KB | **Tạm thời thừa.** Component `VetVangChat` đã bị tháo ở commit `34f06ee`. |
| `lottie-react` | `^2.4.1` | **0 dòng code import** | ~90 KB (bundle) | **Zombie.** Không có bất kỳ component Lottie nào hoạt động trong `src/`. |
| `dotenv` | `^17.3.1` | Chỉ dùng trong `test-llm.mjs` | ~25 KB | **Thừa ở dependencies.** Next.js tự nạp `.env` từ gốc. Nên chuyển sang devDependencies hoặc dùng cờ native `node --env-file`. |
| `@tanstack/react-query` | `^5.99.0` | Có file wrapper nhưng **KHÔNG ĐƯỢC MOUNT** | ~40 KB (gzip) | **Kiến trúc dở dang.** Chi tiết tại mục 2.2 bên dưới. |

### 2.2. Vấn đề kiến trúc dở dang của `@tanstack/react-query`
- Trong [`src/lib/supabase/QueryProvider.tsx`](file:///D:/07-Competitions-Hackathons/vietfi/src/lib/supabase/QueryProvider.tsx) đã tạo `QueryProvider` và trong [`src/lib/supabase/useUserData.ts`](file:///D:/07-Competitions-Hackathons/vietfi/src/lib/supabase/useUserData.ts) đã viết các hook `useUserBudget`, `useUserDebts`, `useUserGamification`.
- **Tuy nhiên:**
  1. `QueryProvider` **chưa từng được bọc (mount)** vào [`src/app/layout.tsx`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/layout.tsx) hay [`src/app/dashboard/layout.tsx`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/layout.tsx).
  2. Toàn bộ các trang Dashboard (`/dashboard`, `/budget`, `/debt`, `/portfolio`...) **100% gọi thẳng localStorage** qua [`@/lib/storage`](file:///D:/07-Competitions-Hackathons/vietfi/src/lib/storage.ts) chứ không dùng `useUserData`.
- **Hậu quả:** Gói thư viện `@tanstack/react-query` nằm trong bundle nhưng hoàn toàn bị bỏ hoang.

### 2.3. Xung đột & Trùng lặp Charting Libraries: `recharts` vs `lightweight-charts`
Dự án đang cài đặt cùng lúc **2 thư viện biểu đồ lớn**:

1. **`recharts` (`^3.8.0`)**:
   - Đặc tính: Dựa trên SVG và kéo theo toàn bộ hệ sinh thái `d3` (`d3-scale`, `d3-shape`, `d3-interpolate`, `d3-path`...). Dung lượng minified ~420 KB (~115 KB gzipped).
   - Đang được import **tĩnh trực tiếp (Static Import)** tại 6 trang:
     - [`src/app/dashboard/budget/page.tsx`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/budget/page.tsx#L9)
     - [`src/app/dashboard/debt/page.tsx`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/debt/page.tsx#L22)
     - [`src/app/dashboard/housing/page.tsx`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/housing/page.tsx#L13)
     - [`src/app/dashboard/portfolio/page.tsx`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/portfolio/page.tsx#L6)
     - [`src/app/dashboard/risk-profile/page.tsx`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/risk-profile/page.tsx#L7)
     - [`src/app/dashboard/gurus/[id]/page.tsx`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/gurus/[id]/page.tsx#L9)
     - [`src/components/debt/FinancialTriageModal.tsx`](file:///D:/07-Competitions-Hackathons/vietfi/src/components/debt/FinancialTriageModal.tsx#L20)
   - Do import tĩnh, Recharts bị dính chặt vào chunk của trang, làm tăng đột biến TBT (Total Blocking Time) khi parse JS.
2. **`lightweight-charts` (`^4.2.3`)**:
   - Đặc tính: Dựa trên Canvas HTML5 của TradingView, tối ưu hiệu năng vẽ nến, dung lượng ~150 KB minified (~45 KB gzipped).
   - Đang được import dynamic tại [`src/app/dashboard/backtest/page.tsx`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/backtest/page.tsx#L28).
- **Đánh giá:**
  - Giữ `lightweight-charts` cho màn hình tài chính chuyên sâu (nến OHLCV) là quyết định đúng đắn.
  - Tuy nhiên với các biểu đồ đơn giản (Pie chart tỷ lệ phân bổ tài sản, Area chart dòng tiền), Recharts quá cồng kềnh. Ở các trang chỉ vẽ 1 hình tròn Pie Chart 3 phần (như `risk-profile` hay `budget`), kéo theo cả Recharts 400KB là lãng phí nghiêm trọng. Có thể dùng CSS conic-gradient SVG siêu nhẹ (< 2 KB) hoặc bắt buộc dùng `next/dynamic` cho Recharts.

### 2.4. Cấu hình Font Google & Lucide Icons trong [`next.config.ts`](file:///D:/07-Competitions-Hackathons/vietfi/next.config.ts)
1. **Thiếu `optimizePackageImports`:**
   - Trong `next.config.ts`, chưa cấu hình:
     ```typescript
     experimental: {
       optimizePackageImports: ["lucide-react", "recharts", "@tanstack/react-query"],
     }
     ```
   - Điều này khiến Webpack có nguy cơ nạp hàng trăm icon từ `lucide-react` vào module tree thay vì tree-shake từng icon riêng lẻ.
2. **Nạp dư thừa 7 font weights trong [`src/app/layout.tsx`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/layout.tsx#L6-L10):**
   - Đang yêu cầu: `weight: ["300", "400", "500", "600", "700", "800", "900"]`.
   - Mỗi font weight tạo ra 1 file woff2 tương ứng (khoảng 30-40 KB/file cho tập ký tự tiếng Việt mở rộng). Nạp cả 7 weight tốn hơn 220 KB font files không cần thiết. Thực tế giao diện chỉ dùng 3 weight chính: `400` (normal), `600` (semibold), `800` (extrabold/black).

---

## 3. AUDIT TẢI TRỌNG PAYLOAD CÁC API CHÍNH & PHÁT HIỆN DATA THÔ (RAW DUMP)

### 3.1. Bảng đo lường & ước tính kích thước Payload API

| Endpoint | Method | Kích thước Payload ước tính | Số record / items | Kích thước sau nén Gzip | Đánh giá tình trạng Data Dump |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [`/api/backtest`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/api/backtest/route.ts) | POST | **150 KB – 250 KB** | 1,250 bars OHLCV + 1,250 điểm equity + trades | ~35 – 55 KB | 🔴 **CRITICAL DUMP**. Dữ liệu trùng lặp field ngày tháng tới 2,500 lần. |
| [`/api/news`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/api/news/route.ts) | GET | **35 KB – 50 KB** | 70 – 96 bài báo + metrics 30 ngày | ~9 – 14 KB | 🔴 **OVERFETCHING**. Client chỉ hiển thị 10 bài, đổ thừa 86 bài và bỏ xó toàn bộ object metrics. |
| [`/api/stock-screener`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/api/stock-screener/route.ts) | GET | **12 KB – 16 KB** | Cố định 50 mã cổ phiếu x 14 fields | ~3.5 – 4.5 KB | 🟡 **THIẾU PAGINATION**. Luôn trả 50 mã dù client chỉ cần top 10. |
| [`/api/market-data`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/api/market-data/route.ts) | GET | **2.5 KB – 3.8 KB** | Snapshot VN-Index, Vàng, FX, BTC, News, Macro, GoldBrands | ~1.1 – 1.4 KB | 🟡 **FIELD REDUNDANCY**. Chứa 5 tin tức RSS và bảng giá vàng DOJI/Mi Hồng thừa thãi. |
| [`/api/morning-brief`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/api/morning-brief/route.ts) | GET | **1.8 KB – 2.5 KB** | Tóm tắt, takeaways, ngày tháng, `raw` | ~0.8 – 1.0 KB | 🟠 **JSON DUPLICATION**. Trường `raw` chứa chuỗi JSON serialize của chính nó. |
| [`/api/portfolio/backtest`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/api/portfolio/backtest/route.ts) | GET | **3.5 KB – 4.5 KB** | 61 điểm dữ liệu tháng (2021-2026) | ~1.0 – 1.2 KB | 🟡 **FAKE SERVER WORK**. Công thức toán mô phỏng nội suy thuần túy, nên chạy client-side. |
| [`/api/portfolio/projection`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/api/portfolio/projection/route.ts) | GET | **1.2 KB – 1.8 KB** | 11 mốc năm dự phóng lãi kép | ~0.5 KB | 🟡 **FAKE SERVER WORK**. Phép tính lãi kép thuần túy, không cần gọi mạng. |
| [`/api/tts`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/api/tts/route.ts) | POST | **< 0.1 KB** | Trả về 405 Method Not Allowed | ~0.1 KB | ⚪ Đã vô hiệu hóa. |

---

### 3.2. Bóc tách chi tiết các lỗi Payload & Data Dump

#### 🔴 Lỗi 1: `/api/backtest` — Payload phình to 250 KB do dump hai mảng song song trùng lặp
Tại [`src/app/api/backtest/route.ts`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/api/backtest/route.ts#L138-L152):
```typescript
return NextResponse.json({
    ticker,
    strategy,
    capital,
    fromDate,
    toDate,
    bars: bars.length,
    fetchedAt: new Date().toISOString(),
    ohlcv: bars,       // <-- MẢNG 1: 1,250 bars x { date, open, high, low, close, volume }
    ...result,         // <-- MẢNG 2: result.equity chứa 1,250 points x { date, equity, benchmark }
                       // <-- MẢNG 3: result.trades chứa hàng chục đến hàng trăm trade
});
```
- **Phân tích lãng phí:**
  1. Chuỗi ngày tháng `date` (ví dụ `"2023-08-15"`) bị lặp lại **2,500 lần** trong cùng 1 JSON payload (1 lần ở `ohlcv[i].date` và 1 lần ở `equity[i].date`).
  2. Các tên key (`"open"`, `"high"`, `"low"`, `"close"`, `"volume"`, `"benchmark"`, `"equity"`) bị lặp lại hàng nghìn lần trong mảng đối tượng.
- **Giải pháp tối ưu dạng Columnar / Tuple:**
  Thay vì:
  `ohlcv: [{ date: "2024-01-02", open: 1100, high: 1120, low: 1090, close: 1115, volume: 50000000 }, ...]`
  Chuyển thành Columnar format hoặc mảng n-tuple:
  `ohlcv: [["2024-01-02", 1100, 1120, 1090, 1115, 50000000], ...]`
  $\rightarrow$ **Giảm ngay 65% dung lượng uncompressed JSON (từ 250 KB xuống ~75 KB).**

#### 🔴 Lỗi 2: `/api/news` — Đổ 96 bài báo trong khi Dashboard chỉ lấy 10 bài
- Tại crawler [`src/lib/news/crawler.ts`](file:///D:/07-Competitions-Hackathons/vietfi/src/lib/news/crawler.ts#L50-L66), hệ thống fetch 8 RSS feeds, mỗi feed lấy 12 tin (`limitPerSection = 12`) $\rightarrow$ tạo ra mảng từ **70 đến 96 bài báo**.
- Mỗi bài báo chứa 11 trường: `id`, `category`, `title`, `link`, `published`, `summary` (đoạn mô tả HTML strip dài hàng trăm ký tự), `content`, `source`, `sentiment`, `sentimentScore`, `asset`.
- Toàn bộ mảng này được trả về ở route [`src/app/api/news/route.ts`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/api/news/route.ts).
- **Thế nhưng trên giao diện Dashboard:**
  Tại [`src/app/dashboard/page.tsx`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/page.tsx#L586-L602):
  ```typescript
  if (activeTab === "Tất cả") return items.slice(0, 10);
  return items.filter((item) => isMatch(item, activeTab)).slice(0, 10);
  ```
  Và tại dòng 816:
  ```typescript
  setLiveArticles(data.articles); // Lưu mảng articles, hoàn toàn KHÔNG đọc trường data.metrics
  ```
- **Hậu quả:** Gửi qua mạng 96 bài báo (~45 KB), client render đúng 10 bài, vứt bỏ 86 bài còn lại cùng toàn bộ mảng thống kê `data.metrics`. Lãng phí **80% băng thông** của mỗi lượt load trang Dashboard.

#### 🟠 Lỗi 3: `/api/morning-brief` — Duplicate JSON trong trường `raw`
Tại [`src/lib/application/morning-brief/index.ts`](file:///D:/07-Competitions-Hackathons/vietfi/src/lib/application/morning-brief/index.ts#L117):
```typescript
return {
    date: `Hôm nay, ${now.toLocaleDateString("vi-VN")}`,
    title: "Morning Brief AI",
    summary: normalized.summary,
    raw: JSON.stringify(normalized), // <-- DUPLICATE NGUYÊN BẢN CẢ SUMMARY VÀ TAKEAWAYS THÀNH STRING!
    source,
    takeaways: normalized.takeaways
};
```
- Trường `raw` stringify lại chính `summary` và `takeaways`, làm payload tăng gấp đôi không vì mục đích gì.
- Kiểm tra [`src/app/dashboard/page.tsx`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/page.tsx#L475-L490): Giao diện chỉ đọc `brief.date`, `brief.summary`, và `brief.takeaways`. Không có bất kỳ dòng nào dùng `brief.raw`.

#### 🟡 Lỗi 4: `/api/market-data` — Gánh dữ liệu thừa của các nhãn hiệu vàng và tin tức con
Tại [`src/lib/market-data/crawler.ts`](file:///D:/07-Competitions-Hackathons/vietfi/src/lib/market-data/crawler.ts#L541-L552):
- `MarketSnapshot` trả về cả `news` (5 tin VnExpress độc lập) và `goldBrands` (DOJI_SJC, DOJI_NHAN, BTMC_SJC, BTMC_NHAN, PNJ_SJC, PNJ_NHAN, Mi Hồng...).
- Khi Dashboard nạp `MarketSection`, component này chỉ hiển thị đúng 4 thẻ card: VN-Index, Vàng SJC chung, USD/VND và BTC. Toàn bộ `news` và `goldBrands` bên trong `MarketSnapshot` là payload thừa.

#### 🟡 Lỗi 5: `/api/portfolio/backtest` và `/api/portfolio/projection` — Serverless Endpoint "giả"
- Hai route này không hề kết nối cơ sở dữ liệu hay crawler ngoài:
  - `projection`: Chỉ chạy 1 vòng lặp `for (let i = 0; i < 10; i++)` tính `Math.pow(1 + rate, i)`.
  - `portfolio/backtest`: Nội suy mảng cứng `indices` bằng `Math.random()`.
- Việc tạo API Route cho các phép tính số học này vừa tiêu tốn kết nối HTTP (latency ~150-300ms), vừa tạo thêm attack surface rate limit, trong khi hoàn toàn có thể tính toán tức thì (0ms) ngay tại Client Component.

---

## 4. AUDIT REQUEST WATERFALL & HIỆN TƯỢNG BÃO REQUEST TRÊN DASHBOARD

### 4.1. Sơ đồ Request Waterfall hiện tại khi người dùng mở `/dashboard`

```
T0 (0ms)     : Người dùng truy cập /dashboard
              │
T1 (~200ms)  : HTML tải về, RootLayout & DashboardLayout bắt đầu mount
              ├─► GamificationBar: setInterval(1000ms) bắt đầu vòng lặp đọc localStorage liên tục
              ├─► Sidebar: checkMarketAlerts() kích hoạt
              │    └─► [REQUEST 1] GET /api/market-data { cache: "no-store" }  ───┐ TRÙNG LẶP!
              │                                                                    │ Bắn cùng lúc 2
T2 (~250ms)  : DashboardOverview (trang chính) mount                               │ request lấy cùng
              ├─► MarketSection: fetchMarketData() kích hoạt                       │ 1 bộ dữ liệu!
              │    └─► [REQUEST 2] GET /api/market-data (no cache header)      ───┘
              │
              ├─► fetchMorningBrief() kích hoạt
              │    └─► [REQUEST 3] GET /api/morning-brief
              │         │
              │         └──► [SERVER-SIDE STORM] Route Handler tự kích hoạt:
              │               ├─► crawlMarketData() (Crawl VN-Index, Vàng, FX, Doji...) ─── LẶP LẠI LẦN 3!
              │               └─► crawlNews() (Crawl 8 nguồn RSS CafeF, VnExpress...)
              │
              └─► fetchNews() kích hoạt
                   └─► [REQUEST 4] GET /api/news (dump 96 bài báo, 45 KB)
```

### 4.2. Bốn hệ quả nghiêm trọng của cấu trúc hiện tại

1. **Trùng lặp kép `/api/market-data` ngay tại client:**
   - [`src/lib/application/market-alert/index.ts`](file:///D:/07-Competitions-Hackathons/vietfi/src/lib/application/market-alert/index.ts#L64) gọi `fetch("/api/market-data", { cache: "no-store" })`.
   - [`src/app/dashboard/components/MarketSection.tsx`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/components/MarketSection.tsx#L469) gọi `fetch("/api/market-data")`.
   - Cả hai component cùng nằm trong cây DOM của `/dashboard`, được mount gần như đồng thời và bắn ra **2 HTTP requests độc lập** cho cùng một endpoint.
2. **Server-side Crawl Storm khi xử lý Morning Brief:**
   - Khi client gọi `/api/morning-brief`, tại [`src/lib/application/morning-brief/index.ts`](file:///D:/07-Competitions-Hackathons/vietfi/src/lib/application/morning-brief/index.ts#L134-L137):
     ```typescript
     const [marketResult, newsResult] = await Promise.allSettled([
         crawlMarketData(),
         crawlNews({ includeContent: false, enableAiReview: false, limitPerSection: 4 }),
     ]);
     ```
   - Serverless function của `morning-brief` lại tiếp tục crawl lại CafeF, Doji, SBV... một lần nữa. Nếu in-memory cache trên serverless instance bị miss (do instance mới được scale), ba luồng crawl sẽ tấn công đồng thời các website tài chính nguồn.
3. **Triệt tiêu Cache bằng `cache: "no-store"`:**
   - Trong [`useMarketOverview.ts`](file:///D:/07-Competitions-Hackathons/vietfi/src/lib/market-overview/useMarketOverview.ts#L67-L68), code truyền cứng `{ cache: "no-store" }` cho cả `/api/news` và `/api/market-data`.
   - Điều này vô hiệu hóa hoàn toàn cơ chế Data Cache và HTTP Browser Cache, ép serverless function phải chạy lại từ đầu ở mọi lần chuyển route.
4. **Vòng lặp Timer `setInterval` 1 giây vô tận:**
   - Trong [`src/app/dashboard/layout.tsx`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/layout.tsx#L137-L148):
     ```typescript
     const t = setInterval(() => {
       const newGam = getGamification();
       // ...
       setGam(newGam);
     }, 1000);
     ```
   - Cứ mỗi 1,000ms (1 giây), React lại gọi hàm parse JSON từ localStorage và gọi `setGam()`. Vòng lặp này chạy vĩnh viễn suốt phiên làm việc của user, gây tiêu tốn pin trên thiết bị di động và làm bận rộn Main Thread.

---

## 5. AUDIT CƠ CHẾ CACHING & TTL HIỆN TẠI CỦA BACKEND

| Route API | In-Memory Cache TTL | Supabase Cache TTL | Header `Cache-Control` | Đánh giá |
| :--- | :--- | :--- | :--- | :--- |
| `/api/market-data` | 1 phút | 15 phút (CronCache) | **KHÔNG CÓ (None)** | 🔴 Thiếu header HTTP Cache-Control, browser không lưu cache. |
| `/api/news` | 10 phút | Không có | **KHÔNG CÓ (None)** | 🔴 Thiếu header HTTP Cache-Control. Client gọi với `no-store`. |
| `/api/stock-screener` | 30 phút | Không có | `public, s-maxage=1800, stale-while-revalidate=60` | 🟢 **Chuẩn mực.** Có CDN Edge Caching 30 phút. |
| `/api/morning-brief` | 15 phút | 24 giờ (CronCache) | **KHÔNG CÓ** (`force-dynamic`) | 🟠 Thiếu CDN caching cho tài nguyên chỉ thay đổi 1 lần/ngày. |
| `/api/backtest` | Không có | Không có | `no-store` | 🟢 Hợp lý vì tham số ticker/ngày thay đổi theo người dùng. |

### Lỗ hổng In-Memory Cache trên Serverless Architecture:
Biến `let cache: CacheEntry | null = null` được khai báo ở phạm vi module trong Node.js / App Router:
- Trên môi trường VPS (Node.js persistent server), in-memory cache hoạt động tốt.
- Tuy nhiên trên môi trường **Vercel Serverless Functions**:
  - Mỗi khi có request mới rơi vào một lambda instance mới (cold start hoặc scale-out), biến `cache` luôn là `null`.
  - Các instance không chia sẻ bộ nhớ RAM với nhau.
  - Nếu không có HTTP header `Cache-Control: s-maxage=...` để Vercel Edge Network giữ lại ở tầng CDN, in-memory cache cấp module gần như mất 70% tác dụng khi có lượng truy cập đồng thời phân tán.

---

## 6. ĐỀ XUẤT GIẢI PHÁP TỐI ƯU HÓA CHI TIẾT (ACTIONABLE BLUEPRINT)

### 6.1. Dọn dẹp Static Assets & Giảm 97.8% dung lượng `public/` (P0)

1. **Di dời ảnh chụp kiểm thử ra khỏi `public/`:**
   - Chuyển toàn bộ 57 files trong `public/docs/` sang thư mục tài liệu nội bộ `docs/audit/screenshots/` (nằm ngoài thư mục `public/`).
   - $\rightarrow$ **Cắt giảm ngay lập tức 10.14 MB.**
2. **Loại bỏ 125 file MP3 thừa trong `public/audio/`:**
   - Xóa bỏ thư mục `public/audio/tts/` vì toàn bộ âm thanh ứng dụng đã dùng Web Audio API tổng hợp bằng sóng âm trong [`src/lib/sounds.ts`](file:///D:/07-Competitions-Hackathons/vietfi/src/lib/sounds.ts).
   - $\rightarrow$ **Cắt giảm ngay lập tức 6.92 MB.**
3. **Chuyển đổi hình ảnh sang WebP:**
   - Chuyển `mascot.png` (651 KB) và `icon.png` (462 KB) sang `.webp` với chất lượng nén 85%.
   - $\rightarrow$ **Tiết kiệm thêm ~1.0 MB.**
4. **Xóa Lottie JSON không sử dụng:**
   - Xóa `public/animations/` (390 KB).

> **Kết quả dự kiến sau khi dọn dẹp:** Thư mục `public/` giảm từ **18.84 MB** xuống **< 400 KB** (giảm **97.8%** dung lượng deploy).

---

### 6.2. Dọn dẹp Dependencies & Tối ưu Bundle JS (P0)

1. **Gỡ bỏ 6 zombie dependencies:**
   ```bash
   npm uninstall hooks edge-tts-universal @google/generative-ai @ai-sdk/react lottie-react dotenv
   ```
2. **Đồng bộ quyết định về `@tanstack/react-query`:**
   - *Lựa chọn tối ưu nhất cho VietFi:* Toàn bộ state tài chính (budget, debt, income, gamification) của ứng dụng theo triết lý WDA2026 là **Local-First (localStorage)**.
   - Do đó, không cần thiết phải duy trì React Query chỉ để bọc vài API crawler. Việc gỡ bỏ `@tanstack/react-query` sẽ giảm ngay **~40 KB gzipped** bundle cho toàn bộ các trang.
3. **Cấu hình Tree-Shaking trong `next.config.ts`:**
   ```typescript
   // next.config.ts
   const nextConfig = {
     experimental: {
       optimizePackageImports: ["lucide-react", "recharts"],
     },
     // ...
   };
   ```
4. **Giảm số lượng Google Font Weights:**
   Trong [`src/app/layout.tsx`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/layout.tsx):
   ```typescript
   const notoSans = Noto_Sans({
     variable: "--font-noto-sans",
     weight: ["400", "600", "700"], // Chỉ giữ 3 weights thay vì 7 weights
     subsets: ["latin", "vietnamese"],
     display: "swap",
   });
   ```
   $\rightarrow$ Tiết kiệm ~150 KB font woff2 tải về trong lần đầu FCP.

---

### 6.3. Tối ưu hóa API Payloads & Chống Data Dump (P1)

#### 1. Phân trang & Lọc trường cho `/api/news`
- Thêm query parameters: `?limit=10&page=1&category=all`.
- Cho phép client chỉ lấy các trường cần thiết:
  ```typescript
  // Thay vì trả 96 bài đầy đủ:
  const slimArticles = articles.slice(0, limit).map(a => ({
    id: a.id,
    title: a.title,
    source: a.source,
    published: a.published,
    sentiment: a.sentiment,
    category: a.category,
    link: a.link,
  }));
  ```
- $\rightarrow$ Payload giảm từ **45 KB xuống ~3.5 KB (giảm 92%)**.

#### 2. Định dạng Columnar cho `/api/backtest`
- Chuyển đổi dữ liệu chuỗi thời gian sang dạng cột (Column-oriented format):
  ```typescript
  // Thay vì 1,250 đối tượng lặp lại key:
  ohlcv: {
    dates: string[],      // 1 mảng ngày dùng chung
    opens: number[],
    highs: number[],
    lows: number[],
    closes: number[],
    volumes: number[],
  },
  equity: {
    values: number[],     // Dùng chung index với mảng dates ở trên!
    benchmarks: number[],
  }
  ```
- $\rightarrow$ Loại bỏ hoàn toàn sự trùng lặp 2,500 chuỗi ngày tháng. Payload giảm từ **250 KB xuống ~45 KB (giảm 82%)**.

#### 3. Bỏ trường `raw` trong `/api/morning-brief`
- Xóa `raw: JSON.stringify(normalized)` trong [`src/lib/application/morning-brief/index.ts`](file:///D:/07-Competitions-Hackathons/vietfi/src/lib/application/morning-brief/index.ts).
- Giảm ngay 50% kích thước payload của bản tin sáng.

#### 4. Chuyển `/api/portfolio/projection` và `backtest` sang Client Math Utility
- Đưa logic tính lãi kép và mô phỏng 5 lớp tài sản từ API Route về file [`src/lib/calculations/portfolio-projection.ts`](file:///D:/07-Competitions-Hackathons/vietfi/src/lib/calculations).
- Xóa bỏ 2 HTTP endpoints không cần thiết, phản hồi tức thì 0ms, không còn rủi ro rate limit.

---

### 6.4. Giải quyết Request Waterfall & Hợp nhất Endpoint Dashboard (P1)

#### Giải pháp A: Khử trùng lặp client-side bằng Hook chia sẻ dữ liệu
- Không để `Sidebar` tự gọi `/api/market-data` riêng biệt.
- Sử dụng Custom Hook `useMarketSnapshot()` có bộ nhớ đệm chia sẻ (hoặc đọc trực tiếp từ `getMarketCache()` trong `localStorage`).
- Chỉ một nơi duy nhất kích hoạt fetch, các component khác chỉ đăng ký lắng nghe (Subscriber pattern).

#### Giải pháp B (Đề xuất tối ưu cao cấp): Gom thành Unified Dashboard Endpoint
Tạo endpoint tổng hợp duy nhất: `GET /api/dashboard-init`
- Payload gói gọn:
  ```json
  {
    "market": { "vnIndex": {...}, "goldSjc": {...}, "usdVnd": {...}, "btc": {...} },
    "brief": { "date": "...", "summary": "...", "takeaways": [...] },
    "topNews": [ /* đúng 6 bài báo mới nhất */ ],
    "fetchedAt": "2026-09-22T..."
  }
  ```
- **Kích thước tổng hợp:** Chỉ khoảng **4.5 KB** JSON (sau Gzip còn ~1.8 KB).
- **Lợi ích:**
  - Thay vì client bắn 4 request (`market-data` x2, `morning-brief`, `news`) với tổng payload ~55 KB, client chỉ bắn **1 request duy nhất (4.5 KB)**.
  - Giảm 3 round-trips mạng, loại bỏ 100% tình trạng waterfall.
  - Server thực hiện crawl đồng bộ 1 lần duy nhất trong background.

---

### 6.5. Thiết lập Chuẩn Caching & Edge TTL (P1)

Áp dụng chuẩn HTTP Header `Cache-Control` cho các API công khai:

```typescript
// 1. Cho /api/market-data: Dữ liệu biến động theo phiên, cache 60s, cho phép stale 5 phút
headers: {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
}

// 2. Cho /api/news: Tin tức mới cập nhật mỗi 10-15 phút
headers: {
  'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120',
}

// 3. Cho /api/morning-brief: Bản tin sáng chỉ thay đổi 1 lần mỗi ngày
headers: {
  'Cache-Control': 'public, s-maxage=14400, stale-while-revalidate=3600', // 4 tiếng
}

// 4. Cho /api/stock-screener: Giữ nguyên chuẩn hiện tại
headers: {
  'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=60',
}
```

- **Loại bỏ `{ cache: "no-store" }`** trong các lệnh `fetch()` tại client components ([`useMarketOverview.ts`](file:///D:/07-Competitions-Hackathons/vietfi/src/lib/market-overview/useMarketOverview.ts), [`MarketSection.tsx`](file:///D:/07-Competitions-Hackathons/vietfi/src/app/dashboard/components/MarketSection.tsx)).
- Khi có header này, Vercel Edge Network (hoặc Cloudflare CDN) sẽ trả kết quả ngay từ Data Center tại Singapore/Hà Nội trong vòng **< 40ms** thay vì phải chờ spin up serverless function.

---

## 7. MA TRẬN ĐỐI CHIẾU TRƯỚC VÀ SAU TỐI ƯU (PROJECTED IMPACT)

| Chỉ số hiệu năng & tải trọng | Hiện trạng (Before) | Sau tối ưu (Target After) | Mức độ cải thiện |
| :--- | :--- | :--- | :--- |
| **Dung lượng thư mục `public/`** | **18.84 MB** | **< 0.40 MB** | 🟢 **Giảm 97.8%** |
| **Số lượng zombie dependencies** | 7 packages | 0 package | 🟢 **Sạch 100%** |
| **Payload load trang `/dashboard`** | **~55 KB** (4 requests) | **~4.5 KB** (1 unified request) | 🟢 **Giảm 91.8%** |
| **Payload API `/api/backtest`** | **150 – 250 KB** | **35 – 50 KB** (Columnar) | 🟢 **Giảm 78%** |
| **Số roundtrip HTTP khi mở Dashboard** | 4 requests song song | 1 request duy nhất | 🟢 **Giảm 75%** |
| **Tỷ lệ Edge Cache HIT (Market/News)** | ~0% (do thiếu header & `no-store`) | > 85% tại CDN Edge | 🟢 **Tiết kiệm 85% compute** |
| **Google Font WOFF2 overhead** | 7 weights (~220 KB) | 3 weights (~95 KB) | 🟢 **Giảm 56%** |
| **Chu kỳ timer Gamification** | `setInterval` 1,000ms | Event-driven (lắng nghe action) | 🟢 **Loại bỏ 100% idle churn** |

---

## 8. LỘ TRÌNH THỰC HIỆN ĐỀ XUẤT (ACTION PLAN FOR IMPLEMENTATION PHASE)

### Giai đoạn 1: Dọn dẹp rác & Tối ưu tĩnh (Quick Wins — Ưu tiên cao nhất)
- [ ] Di chuyển toàn bộ file ảnh trong `public/docs/` sang `docs/audit/screenshots/`.
- [ ] Xóa bỏ thư mục `public/audio/tts/` và `public/animations/`.
- [ ] Chuyển đổi `mascot.png` và `icon.png` sang định dạng WebP.
- [ ] Gỡ bỏ 6 dependencies zombie khỏi `package.json` (`hooks`, `edge-tts-universal`, `@google/generative-ai`, `@ai-sdk/react`, `lottie-react`, `dotenv`).
- [ ] Bổ sung `optimizePackageImports` cho `lucide-react` trong `next.config.ts`.
- [ ] Giảm font weights xuống 3 mốc (400, 600, 700) trong `layout.tsx`.

### Giai đoạn 2: Tối ưu Payload & Thêm Cache-Control (API Layer)
- [ ] Bổ sung header `Cache-Control` cho `/api/market-data`, `/api/news`, `/api/morning-brief`.
- [ ] Gỡ bỏ tham số `{ cache: "no-store" }` ở các hàm fetch phía client.
- [ ] Thêm query pagination và field filtering (`?limit=10`) cho `/api/news`.
- [ ] Loại bỏ trường `raw` dư thừa trong `/api/morning-brief`.
- [ ] Tái cấu trúc payload của `/api/backtest` sang định dạng Columnar.

### Giai đoạn 3: Tái cấu trúc luồng dữ liệu Dashboard (Client Architecture)
- [ ] Xóa bỏ lệnh gọi `fetch("/api/market-data")` trong `Sidebar` (`checkMarketAlerts`), chuyển sang dùng chung snapshot từ `MarketSection` hoặc localStorage cache.
- [ ] Chuyển timer 1s của `GamificationBar` sang Event-Driven (chỉ cập nhật khi có action cộng XP).
- [ ] Chuyển 2 API `/api/portfolio/backtest` và `/api/portfolio/projection` thành client-side utilities trong `src/lib/calculations/`.
- [ ] Xem xét xây dựng endpoint tổng hợp `/api/dashboard-init` để gom 4 request thành 1 request duy nhất.

---
*Báo cáo được hoàn thành bởi **Agent 07: Performance & Payload Auditor** vào lúc 22/09/2026. File báo cáo đã được lưu trữ tại [`docs/audit/07-performance.md`](file:///D:/07-Competitions-Hackathons/vietfi/docs/audit/07-performance.md).*
