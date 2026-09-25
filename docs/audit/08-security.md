# BÁO CÁO AUDIT BẢO MẬT, QUẢN LÝ KHÓA & BÍ MẬT HỆ THỐNG (AGENT 08)
**Dự án:** VietFi Advisor (`vietfi-advisor`)  
**Vị trí dự án:** `D:\07-Competitions-Hackathons\vietfi`  
**Ngày thực hiện:** 22/09/2026  
**Người thực hiện:** Agent 08: Security, Key & Secrets Auditor  
**Phạm vi kiểm toán:** Toàn diện biến môi trường (`.env*`, `.env.example`, `NEXT_PUBLIC_*`), rò rỉ secrets ra client bundle, lưu trữ và vận hành API keys (Gemini, OpenAI, Supabase, Cron secret, Financial crawlers), các route admin/cron/debug/webhook/auth bypass, và kiến trúc quản lý bí mật chuẩn cho Cloudflare Workers.  
**Nguyên tắc thực thi:** Kiểm toán và lập báo cáo chi tiết; **tuyệt đối không sửa code dự án trong phase này**.

---

## 1. TỔNG QUAN HỆ THỐNG BẢO MẬT & BẢNG MA TRẬN RỦI RO

Qua quá trình rà soát mã nguồn tĩnh (SAST), lịch sử commit Git (`git log`), phân tích luồng dữ liệu (Data Flow Analysis) và cấu trúc triển khai, hệ thống hiện đang tồn tại **nhiều lỗ hổng bảo mật cấp độ CRITICAL và HIGH**. Các lỗ hổng này có thể dẫn tới việc **lộ API key đang hoạt động, rò rỉ cơ sở dữ liệu xác thực lịch sử, cho phép vượt qua cơ chế đăng nhập (Authentication Bypass), thực thi các tác vụ ngầm nặc danh (Fail-Open Cron), và rủi ro rò rỉ dữ liệu qua URL/Client bundle**.

### Bảng ma trận phân loại rủi ro (Risk Assessment Matrix)

| Cấp độ | Số lượng | Vấn đề trọng tâm |
| :--- | :---: | :--- |
| 🔴 **CRITICAL** | **5** | • Lộ Google Gemini API Key trong thư mục `scratch/` đã commit vào Git.<br/>• Lộ Hardcoded API Key DOJI Gold trong `crawler.ts`.<br/>• Backdoor header `x-demo-bypass: hungpixi-demo` vượt qua Auth Guard.<br/>• Fail-Open Auth Bypass trong các route cron (`market-alert`, `sync-market`).<br/>• File database xác thực `better-auth.sqlite` lưu trữ lịch sử người dùng trong Git history. |
| 🟠 **HIGH** | **4** | • Open Redirect tại `src/app/auth/callback/route.ts` do nối chuỗi `${origin}${next}` không kiểm duyệt.<br/>• Endpoint debug công khai `/test-ssr` và `/test-supabase` hiển thị cấu hình và stack trace DB.<br/>• Fallback nguy hiểm từ `SUPABASE_SERVICE_ROLE_KEY` sang `ANON_KEY` trong cron routes.<br/>• Rò rỉ `CRON_SECRET` qua URL query string (`?key=...`) và lỗ hổng so sánh chuỗi (Timing Attack). |
| 🟡 **MEDIUM** | **4** | • `.dev.vars` (Cloudflare Workers) và `scratch/` chưa được khai báo trong `.gitignore`.<br/>• `next.config.ts` bật `ignoreBuildErrors: true` và cho phép `generativelanguage.googleapis.com` trong client CSP.<br/>• Route `GET /api/strategy-engine` tính toán nặng không có xác thực và không có rate limit.<br/>• Hệ thống Rate Limiting phụ thuộc vào in-memory Map (mất tác dụng trên môi trường Serverless / Edge stateless). |
| 🟢 **LOW / INFO** | **2** | • Phân mảnh hai bộ Supabase client (`src/lib/supabase` và `src/utils/supabase`).<br/>• Scraping dữ liệu tài chính không chính thức (TCBS, DNSE, CafeF) có nguy cơ bị chặn IP diện rộng. |

---

## 2. AUDIT BIẾN MÔI TRƯỜNG & NGUY CƠ RÒ RỈ SECRETS RA CLIENT SIDE

### 2.1. Phân tích Git History & File Secrets Bị Commit

#### [CRITICAL] Lộ Google Gemini API Key hoạt động trong thư mục `scratch/`
- **Vị trí phát hiện:**
  - `scratch/list-models.mjs:7`
  - `scratch/test-chat-api.mjs:2`
  - `scratch/test-gemini-direct.mjs:8`
  - `scratch/test-gemini-stream.mjs:8`
- **Commit vi phạm:** `34f06eefb437a9ea23110448bd74dcedee444341` (Author: Nguyen Huy Hoang, Date: Mon Apr 20 00:00:29 2026).
- **Chi tiết mã vi phạm:**
  ```javascript
  // scratch/test-chat-api.mjs:2
  const GEMINI_API_KEY = "AIzaSyDIiq9g1aIq_vUjox8ANR_RPrMwCelCJxc"; // From .env

  // scratch/test-gemini-direct.mjs:8
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDIiq9g1aIq_vUjox8ANR_RPrMwCelCJxc";
  ```
- **Rủi ro:** Key Google Gemini API thật đã bị commit trực tiếp vào Git repository. Bất kỳ ai có quyền truy cập repo (hoặc nếu repo public) đều có thể trích xuất key này để gọi API trả phí, làm cạn hạn mức token hoặc gây phát sinh chi phí Google Cloud.
- **Biện pháp khắc phục bắt buộc:**
  1. Lập tức **Revoke (Hủy)** key `AIzaSyDIiq9g1aIq_vUjox8ANR_RPrMwCelCJxc` trên Google AI Studio / Google Cloud Console.
  2. Tạo key mới và chỉ lưu vào môi trường không commit.
  3. Thêm `scratch/` vào `.gitignore`.
  4. Dùng `git-filter-repo` hoặc BFG Repo-Cleaner để làm sạch lịch sử Git nếu repo cần public.

#### [CRITICAL] Cơ sở dữ liệu xác thực `better-auth.sqlite` tồn tại trong Git History
- **Vị trí phát hiện:** File `better-auth.sqlite` được commit tại `12324a2` và xóa tại commit `4466682675f73dfe90e10dceedb2ba6590627539`.
- **Cấu trúc dữ liệu bên trong:** Chứa các bảng `user`, `session`, `account`, `verification` với các trường nhạy cảm (`email`, `token`, `password`, `accessToken`, `refreshToken`).
- **Rủi ro:** Mặc dù file đã bị xóa ở commit sau (`git rm`), mã nhị phân của SQLite vẫn nằm vĩnh viễn trong object database của Git (`.git/objects`). Bất kỳ ai clone repo đều có thể khôi phục bằng lệnh:
  ```powershell
  git show 12324a2:better-auth.sqlite > restored.sqlite
  ```

#### [MEDIUM] Lỗ hổng cấu hình `.gitignore`
- **Vị trí:** `.gitignore`
- **Thực trạng:**
  ```gitignore
  # env files
  .env
  .env*.local
  .env.development
  .env.test
  .env.production
  !.env.example
  ```
- **Thiếu sót nghiêm trọng:**
  1. **Thiếu `.dev.vars`:** Đây là file chuẩn lưu secrets cục bộ khi phát triển Cloudflare Workers (tương đương `.env.local` của Next.js). Nếu dev tạo file này để test wrangler, Git sẽ track và đẩy lên remote.
  2. **Thiếu `scratch/`:** Toàn bộ script thử nghiệm trong `scratch/` không bị ignore.
  3. **Thiếu `.wrangler/`:** Thư mục cache và state của Cloudflare Wrangler có thể chứa thông tin triển khai nội bộ.

### 2.2. Kiểm tra `.env.example` đối chiếu với biến môi trường thực tế
Đối chiếu giữa `.env.example` và các file mã nguồn cho thấy `.env.example` đang **bị thiếu nhiều biến quan trọng** đang chạy thực tế trong code:

| Tên biến thực tế trong Code | Nơi sử dụng | Tình trạng trong `.env.example` | Nguy cơ |
| :--- | :--- | :---: | :--- |
| `DOJI_API_KEY` | `src/lib/market-data/crawler.ts` | ❌ **Thiếu** | Dẫn đến việc dev hardcode fallback key vào code |
| `TELEGRAM_WEBHOOK_URL` | `src/app/api/cron/market-alert/route.ts` | ❌ **Thiếu** | Không biết cấu hình webhook cảnh báo |
| `ZEN_API_KEY`, `ZEN_MODEL` | `src/lib/infrastructure/llm/client.ts` | ❌ **Thiếu** | Thiếu tài liệu cấu hình provider Zen |
| `OPENAI_MODEL`, `GEMINI_MODEL`| `src/lib/infrastructure/llm/client.ts` | ❌ **Thiếu** | Không thể tùy biến model qua env |
| `GOOGLE_GENERATIVE_AI_API_KEY`| `src/lib/infrastructure/llm/client.ts` | ❌ **Thiếu** | Biến alias phụ trợ |

### 2.3. Đánh giá tiền tố `NEXT_PUBLIC_*` và nguy cơ rò rỉ sang Client Side

1. **Nguyên lý Next.js:** Các biến bắt đầu bằng `NEXT_PUBLIC_` được Webpack/Turbopack biên dịch tĩnh (in-line replace) vào mã JavaScript tải về trình duyệt của người dùng.
2. **Các biến `NEXT_PUBLIC_` hiện diện:**
   - `NEXT_PUBLIC_SUPABASE_URL`: Địa chỉ dự án Supabase (Ví dụ: `https://xyz.supabase.co`).
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Khóa nặc danh công khai.
   - `NEXT_PUBLIC_SITE_URL`: Domain website phục vụ canonical URL và OAuth redirect.
3. **Đánh giá rủi ro Supabase Anon Key:**
   - Việc đưa `NEXT_PUBLIC_SUPABASE_ANON_KEY` xuống client là chuẩn thiết kế của Supabase client-side SDK. **Tuy nhiên**, điều này chỉ an toàn KHI VÀ CHỈ KHI **Row Level Security (RLS)** được kích hoạt trên 100% các bảng.
   - Nếu bất kỳ bảng nào (như `ohlcv_bars`, `cron_cache`, `profiles`, `todos`) bị tắt RLS hoặc viết policy `USING (true)` cho phép `INSERT/UPDATE/DELETE`, bất kỳ ai mở Console trình duyệt với Anon Key đều có thể xóa sạch toàn bộ cơ sở dữ liệu.
4. **Nguy cơ rò rỉ qua `next.config.ts`:**
   - `next.config.ts:13` định nghĩa Content Security Policy (CSP):
     ```typescript
     const connectSrc = [
       "connect-src 'self'",
       "https://*.googleapis.com",
       "https://*.supabase.co",
       "https://generativelanguage.googleapis.com", // ⚠️ NGUY CƠ
       ...(isProduction ? [] : ["ws:", "wss:"]),
     ].join(" ");
     ```
   - Việc mở CSP cho `generativelanguage.googleapis.com` là dấu hiệu client từng hoặc dự định gọi trực tiếp Google Gemini API từ browser. Nếu client gọi thẳng, `GEMINI_API_KEY` bắt buộc phải nằm ở client side, dẫn đến rò rỉ 100%. Mọi kết nối LLM phải đi qua backend server hoặc Cloudflare Worker.

---

## 3. KIỂM TRA LƯU TRỮ & VẬN HÀNH API KEYS CÁC DỊCH VỤ

### 3.1. Google Gemini API Key & Fallback LLM Infrastructure
- **Tập trung hóa:** Tại `src/lib/infrastructure/llm/client.ts`, hệ thống đã thiết kế hàm wrapper hỗ trợ nhiều provider:
  ```typescript
  function getGeminiApiKey() {
      return process.env.GEMINI_API_KEY
          || process.env.GOOGLE_GENERATIVE_AI_API_KEY
          || process.env.GOOGLE_API_KEY;
  }
  ```
- **Lỗ hổng phân tán:** Mặc dù đã có client tập trung, một số module khác như `src/lib/news/crawler.ts` và `src/lib/market-data/crawler.ts` vẫn đọc trực tiếp `process.env.GEMINI_API_KEY` mà không qua abstraction, gây khó khăn cho việc quản lý tập trung và chuyển đổi nhà cung cấp.
- **Proxy 9router (`https://9router.phamphunguyenhung.com/v1`):**
  - Code hỗ trợ fallback qua `NINEROUTER_KEY` và `NINEROUTER_REMOTE_URL`.
  - Đây là endpoint proxy cá nhân. Nếu server proxy này không cấu hình SSL/TLS nghiêm ngặt hoặc lưu log request/response thì toàn bộ nội dung chat tài chính cá nhân của người dùng sẽ bị lộ trên server proxy.

### 3.2. Supabase Keys & Lỗ Hổng Service Role Fallback
Hệ thống sử dụng hai loại key:
1. `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Quyền hạn chế, tuân thủ RLS.
2. `SUPABASE_SERVICE_ROLE_KEY`: Quyền quản trị tối cao (Bypass RLS).

#### [HIGH] Lỗ hổng nguy hiểm: Fallback từ Service Key sang Anon Key
Tại 3 file trọng yếu:
- `src/app/api/cron/market-alert/route.ts:10`
- `src/app/api/strategy-engine/route.ts:10`
- `src/app/api/cron/sync-market/route.ts:16`

Mã nguồn sử dụng cú pháp:
```typescript
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy';
```
- **Rủi ro:** Khi lập trình viên hoặc môi trường production vô tình không truyền `SUPABASE_SERVICE_ROLE_KEY`, ứng dụng âm thầm dùng `ANON_KEY` đóng giả làm Admin. Hậu quả:
  - Nếu thao tác ghi DB thành công $\rightarrow$ Chứng tỏ bảng đó **đang bị hổng RLS nghiêm trọng** (Anon user ghi được dữ liệu hệ thống).
  - Nếu thao tác thất bại $\rightarrow$ Toàn bộ cron ngầm bị lỗi mà không có thông báo cấu hình thiếu biến môi trường rõ ràng.
- **Sự tồn tại của file mồ côi `src/lib/supabase/admin.ts`:**
  - File này được viết rất chuẩn mực với `import "server-only";` và chặn `typeof window !== "undefined"`.
  - Tuy nhiên, **không một file nào trong toàn bộ dự án import file này!** Các route cron tự tiện import `@supabase/supabase-js` và khởi tạo ad-hoc.

### 3.3. Financial Crawler API Keys & Scraping Secrets

#### [CRITICAL] Hardcoded DOJI Gold API Key trong mã nguồn
- **Vị trí:** `src/lib/market-data/crawler.ts:260` và `src/lib/market-data/crawler.ts:400`
- **Mã nguồn vi phạm:**
  ```typescript
  // Dòng 260:
  const apiKey = process.env.DOJI_API_KEY || '258fbd2a72ce8481089d88c678e9fe4f'
  const dojiXml = await fetchWithCache(`https://giavang.doji.vn/api/giavang/?api_key=${apiKey}`, { ... })

  // Dòng 400:
  const apiKey = process.env.DOJI_API_KEY || '258fbd2a72ce8481089d88c678e9fe4f'
  ```
- **Rủi ro:** Chuỗi `'258fbd2a72ce8481089d88c678e9fe4f'` là API key truy cập dữ liệu XML của Tập đoàn Vàng bạc Đá quý DOJI. Việc hardcode chuỗi này trong source code vi phạm nghiêm trọng chính sách bảo mật thông tin xác thực. Bất kỳ ai dịch ngược hoặc đọc mã nguồn đều lấy được key này.

#### Rủi ro Scraping không xác thực (TCBS, DNSE, CafeF, SBV, CoinGecko)
- Hệ thống gửi request với header giả mạo trình duyệt:
  - TCBS: `Referer: https://tcinvest.tcbs.com.vn/`
  - CafeF: `Referer: https://cafef.vn/`
  - DNSE: Gọi trực tiếp `services.entrade.com.vn`
- **Rủi ro vận hành:** Các endpoint này không được bảo vệ bằng hợp đồng dịch vụ. Khi triển khai trên dải IP datacenter của Vercel hoặc Cloudflare, các hệ thống WAF/Anti-DDoS của TCBS và DNSE có thể đưa dải IP vào blacklist hoặc trả mã 403/429, làm tê liệt toàn bộ tính năng bảng giá và dữ liệu nến EOD.

---

## 4. AUDIT ROUTE CRON, ROUTE DEBUG, WEBHOOK & AUTHENTICATION BYPASS

### 4.1. Lỗ Hổng Authentication Bypass (Backdoor)

#### [CRITICAL] Backdoor Header `x-demo-bypass: hungpixi-demo`
- **Vị trí phát hiện:**
  - `src/app/api/backtest/route.ts:23-35`
  - `src/app/dashboard/backtest/page.tsx:199`
- **Mã nguồn vi phạm tại API Route:**
  ```typescript
  // src/app/api/backtest/route.ts:23
  const isDemoBypass = req.headers.get("x-demo-bypass") === "hungpixi-demo";

  if (!isDemoBypass) {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          const supabase = await createClient();
          const { data: { user }, error } = await supabase.auth.getUser();
          if (error || !user) {
              return NextResponse.json({ error: "Unauthorized. Vui lòng đăng nhập..." }, { status: 401 });
          }
      }
  }
  ```
- **Mã nguồn vi phạm tại Client UI:**
  ```typescript
  // src/app/dashboard/backtest/page.tsx:195-202
  const resp = await fetch("/api/backtest", {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
          "x-demo-bypass": "hungpixi-demo" // ⚠️ HARDCODED CLIENT HEADER
      },
      body: JSON.stringify(body),
  });
  ```
- **Phân tích rủi ro:**
  - Đây là một backdoor xác thực điển hình được cài cắm để phục vụ demo nhanh.
  - Phía client gửi lộ thiên header này qua HTTP Request. Bất kỳ ai mở F12 Network Tab hoặc chạy công cụ dò quét đều thấy chuỗi `hungpixi-demo`.
  - Hậu quả: Cơ chế kiểm tra đăng nhập Supabase (`auth.getUser()`) hoàn toàn bị vô hiệu hóa. Kẻ tấn công có thể spam chạy backtest tính toán nặng nề không giới hạn mà không cần tài khoản.

### 4.2. Lỗ Hổng Xác Thực Cron Routes (`/api/cron/*`)

#### [CRITICAL] Fail-Open Authentication Bypass khi thiếu `CRON_SECRET`
- **Vị trí phát hiện:**
  - `src/app/api/cron/market-alert/route.ts:19-23`
  - `src/app/api/cron/sync-market/route.ts:91-95`
- **Mã nguồn vi phạm:**
  ```typescript
  // Kiểm tra xác thực bị lỗi logic nghiêm trọng:
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      if (searchParams.get('key') !== process.env.CRON_SECRET) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
  }
  ```
- **Cơ chế lỗi:**
  - Lập trình viên viết: `if (process.env.CRON_SECRET && ...)`
  - Nếu trên môi trường deploy (Staging, Vercel Preview, hoặc Local) chưa cấu hình biến `CRON_SECRET` $\rightarrow$ `process.env.CRON_SECRET` là `undefined` (falsy).
  - Toàn bộ khối `if` bị **BỎ QUA HOÀN TOÀN**!
  - Kết quả: Bất kỳ ai gọi `GET /api/cron/sync-market` hoặc `GET /api/cron/market-alert` mà không cần bất kỳ header hay token nào đều được hệ thống thực thi 100%!
- **So sánh với thiết kế đúng (Fail-Closed):**
  Trong `src/app/api/cron/morning-brief/route.ts:9-16`:
  ```typescript
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'Server misconfiguration: CRON_SECRET not set' }, { status: 500 })
  }
  ```
  Route `morning-brief` từ chối ngay lập tức nếu thiếu secret (Fail-Closed). Trong khi hai route trên lại mở toang cửa (Fail-Open).

#### [HIGH] Truyền bí mật qua URL Query Parameter (`?key=...`)
- Cả `market-alert` và `sync-market` đều cho phép:
  `if (searchParams.get('key') !== process.env.CRON_SECRET)`
- **Rủi ro:** Token bí mật truyền qua URL Query Parameter sẽ bị lưu vết tại:
  1. Access log của máy chủ web / CDN / reverse proxy.
  2. Lịch sử duyệt web của trình duyệt.
  3. Header `Referer` gửi tới các liên kết bên thứ ba.
  4. Hệ thống giám sát APM (Datadog, Sentry, Cloudflare Logs).

#### [HIGH] Lỗ hổng so sánh chuỗi nhạy cảm (Timing Attack)
- Việc so sánh: `authHeader !== 'Bearer ${cronSecret}'` sử dụng toán tử so sánh chuỗi thông thường của V8 engine, dừng lại ngay khi gặp ký tự khác biệt đầu tiên.
- Kẻ tấn công có thể đo thời gian phản hồi (vài microsecond) để đoán dần từng ký tự của `CRON_SECRET`. Cần sử dụng hàm `crypto.timingSafeEqual()`.

### 4.3. Các Endpoint Debug & Rủi Ro Lộ Lọt Thông Tin

#### [HIGH] Endpoint Debug công khai ngoài Production
- **Vị trí:**
  - `src/app/test-ssr/page.tsx` (`/test-ssr`)
  - `src/app/test-supabase/page.tsx` (`/test-supabase`)
- **Mã nguồn vi phạm:**
  ```typescript
  // src/app/test-ssr/page.tsx:27-38
  <pre className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
      {JSON.stringify(error, null, 2)}
  </pre>
  <p className="text-white/50">
      Không có dữ liệu hoặc bảng trống. (Project mới: {process.env.NEXT_PUBLIC_SUPABASE_URL})
  </p>
  ```
- **Rủi ro:**
  1. Hai trang này nằm trực tiếp trong thư mục `src/app/`, Next.js sẽ tự động render route công khai tại domain chính (`vietfi.app/test-ssr`).
  2. Bất kỳ ai cũng có thể truy cập để xem cấu trúc bảng cơ sở dữ liệu nội bộ (`todos`), chi tiết lỗi SQL (`JSON.stringify(error)`), mã lỗi PostgreSQL (`error.code`), và URL Supabase.
  3. Đây là nguồn rò rỉ thông tin phục vụ trinh sát (Reconnaissance) đắc lực cho tin tặc.

### 4.4. Lỗ Hổng Open Redirect trong Luồng Xác Thực

#### [HIGH] Thiếu kiểm duyệt URL chuyển hướng tại Auth Callback
- **Vị trí:** `src/app/auth/callback/route.ts:16`
- **Mã nguồn vi phạm:**
  ```typescript
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
      // ... exchange code ...
      if (!error) {
          return NextResponse.redirect(`${origin}${next}`); // ⚠️ NỐI CHUỖI KHÔNG KIỂM DUYỆT
      }
  }
  ```
- **Phân tích lỗ hổng:**
  - Tham số `next` lấy trực tiếp từ query params của request và được nối chuỗi thẳng với `origin`.
  - Nếu kẻ tấn công gửi link xác thực có dạng:
    `/auth/callback?code=xxx&next=@attacker.com` hoặc `/auth/callback?code=xxx&next=//attacker.com`
    Trình duyệt có thể phân tích `${origin}${next}` thành địa chỉ của kẻ tấn công, dẫn người dùng đến trang lừa đảo ngay sau khi đăng nhập thành công.
  - **Đáng chú ý:** File `src/app/auth/confirm/route.ts` đã được bảo vệ rất tốt bằng hàm `safeRedirectPath(next)` (từ `src/lib/security/origin.ts`), nhưng file `src/app/auth/callback/route.ts` lại hoàn toàn bị bỏ quên!

### 4.5. Các Endpoint Tính Toán Nặng Không Có Xác Thực (DoS)
- **`GET /api/strategy-engine`:**
  - Route này nhận tham số `ticker`, `from`, `to`, `strategy`.
  - Thực hiện gọi Supabase lấy lịch sử nến, chạy hai chiến thuật phân tích kỹ thuật phức tạp (`PullbackUptrendStrategy`, `VCPBreakoutStrategy`) và tổng hợp báo cáo.
  - **Không có bất kỳ cơ chế xác thực nào (No Auth), không có Rate Limiting.**
  - Kẻ tấn công có thể tạo script gửi hàng ngàn request đồng thời để làm nghẽn CPU serverless và cạn kiệt connection pool của cơ sở dữ liệu Supabase.

---

## 5. THIẾT KẾ MÔ HÌNH QUẢN LÝ SECRETS CHUẨN CHO CLOUDFLARE WORKERS

Để đáp ứng yêu cầu kiến trúc của Hackathon và giải quyết triệt để các rủi ro bảo mật nêu trên, hệ thống cần chuẩn hóa mô hình quản trị khóa thông qua **Cloudflare Workers AI & API Gateway**.

### 5.1. Sơ Đồ Kiến Trúc Bí Mật Tập Trung (Centralized Secrets Architecture)

```mermaid
flowchart TD
    subgraph CLIENT_ZONE ["Trình Duyệt Người Dùng (Client Browser)"]
        Browser["Next.js Web Client<br/>(Chỉ giữ: Supabase Anon Key)"]
    end

    subgraph CLOUDFLARE_ZONE ["Cloudflare Edge Network"]
        WAF["Cloudflare WAF / DDoS Protection"]
        Worker["Cloudflare Worker (AI & Secrets Gateway)<br/><b>Tập trung giữ toàn bộ API Keys</b>"]
        KV_RL["Cloudflare KV / Rate Limit Cache"]
    end

    subgraph SECRETS_VAULT ["Cloudflare KMS (Encrypted Secrets)"]
        Sec_Gemini["GEMINI_API_KEY"]
        Sec_OpenAI["OPENAI_API_KEY"]
        Sec_Cron["CRON_SECRET"]
        Sec_SupaService["SUPABASE_SERVICE_ROLE_KEY"]
        Sec_Doji["DOJI_API_KEY"]
    end

    subgraph UPSTREAM_PROVIDERS ["Upstream Providers"]
        Google_AI["Google Gemini AI API"]
        OpenAI_API["OpenAI / Zen API"]
        Supabase_DB["Supabase PostgreSQL (Bypass RLS)"]
        DOJI_Server["DOJI Gold XML Service"]
    end

    Browser -->|"1. HTTPS Request<br/>(Kèm User Bearer JWT)"| WAF
    WAF --> Worker
    Worker <-->|"2. Kiểm tra Rate Limit & Throttling"| KV_RL
    SECRETS_VAULT -.->|"3. Injected via wrangler secret (Runtime Only)"| Worker
    Worker -->|"4. Gọi AI Prompt (Worker giữ Key)"| Google_AI
    Worker -->|"5. Gọi AI Fallback"| OpenAI_API
    Worker -->|"6. Ghi Cache / Cron Sync"| Supabase_DB
    Worker -->|"7. Fetch Giá Vàng"| DOJI_Server
    Worker -->|"8. Trả kết quả JSON/Stream (KHÔNG CÓ KEY)"| Browser

    style Worker fill:#10b981,stroke:#047857,color:#ffffff,stroke-width:2px
    style SECRETS_VAULT fill:#f59e0b,stroke:#b45309,color:#ffffff,stroke-width:2px
    style Browser fill:#3b82f6,stroke:#1d4ed8,color:#ffffff,stroke-width:2px
```

### 5.2. Chuẩn Mực Quản Lý Khóa Theo Môi Trường

#### 1. Môi Trường Local Development (`.dev.vars`)
- Cloudflare Workers sử dụng file `.dev.vars` ở thư mục gốc của Worker để chứa các biến bí mật khi chạy `wrangler dev`.
- File này có định dạng `KEY=VALUE`, **tuyệt đối không được commit vào Git**.
- **Cấu hình mẫu `.dev.vars`:**
  ```ini
  # === AI Provider Configuration ===
  AI_PROVIDER=gemini
  GEMINI_API_KEY=AIzaSy...your_local_dev_key...
  OPENAI_API_KEY=sk-...
  OPENAI_BASE_URL=https://api.openai.com/v1

  # === Core Infrastructure & Secrets ===
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...service_role_key...
  CRON_SECRET=cf_local_dev_cron_secret_32chars_min
  GATEWAY_SHARED_SECRET=local_gateway_secret_key_vietfi

  # === Financial Crawlers ===
  DOJI_API_KEY=258fbd2a72ce8481089d88c678e9fe4f
  TELEGRAM_WEBHOOK_URL=https://api.telegram.org/bot.../sendMessage
  ```
- **Quy tắc Git:** Bắt buộc bổ sung vào `.gitignore`:
  ```gitignore
  # Cloudflare Workers Secrets
  .dev.vars
  .dev.vars.*
  .wrangler/
  ```

#### 2. Môi Trường Production (`wrangler secret put`)
- Trên production, **tuyệt đối không khai báo API keys trong `wrangler.toml`** (vì file toml được commit vào git).
- Khởi tạo bí mật mã hóa trên Cloudflare KMS thông qua Wrangler CLI:
  ```powershell
  # Đẩy từng secret vào Cloudflare Worker an toàn:
  npx wrangler secret put GEMINI_API_KEY
  npx wrangler secret put OPENAI_API_KEY
  npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
  npx wrangler secret put CRON_SECRET
  npx wrangler secret put GATEWAY_SHARED_SECRET
  npx wrangler secret put DOJI_API_KEY
  npx wrangler secret put TELEGRAM_WEBHOOK_URL
  ```
- Các biến không bí mật (Public/Config) được giữ trong `wrangler.toml`:
  ```toml
  name = "vietfi-api-gateway"
  main = "src/index.ts"
  compatibility_date = "2026-04-01"

  [vars]
  ENVIRONMENT = "production"
  AI_PROVIDER = "gemini"
  DEFAULT_MODEL = "gemini-2.5-flash-lite"
  MAX_BODY_BYTES = "65536" # 64KB
  ```

### 5.3. Module Provider Abstraction (AI Gateway Pattern)

Worker đóng vai trò là lớp vỏ bọc bảo vệ khóa. Client không bao giờ biết API key là gì, chỉ tương tác qua endpoint `/api/gateway/ai/chat` hoặc `/api/gateway/ai/summary`.

```typescript
// worker/src/ai-gateway.ts
export interface Env {
  AI_PROVIDER: "gemini" | "openai";
  GEMINI_API_KEY: string;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
}

export async function handleAIRequest(request: Request, env: Env): Promise<Response> {
  const provider = env.AI_PROVIDER || "gemini";

  if (provider === "gemini") {
    if (!env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Gemini Key unconfigured on Gateway" }), { status: 500 });
    }
    // Thực hiện gọi Google Gemini với streaming hoặc text generation
    // Giữ kết nối an toàn từ Cloudflare Edge -> Google API
  } else if (provider === "openai") {
    if (!env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OpenAI Key unconfigured on Gateway" }), { status: 500 });
    }
    // Thực hiện gọi OpenAI/Zen/DeepSeek với streaming
  }

  // Luôn trả về dữ liệu nội dung, KHÔNG BAO GIỜ đính kèm key trong header hoặc payload
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" }
  });
}
```

### 5.4. Cơ Chế Rate-Limiting & Chống Lạm Dụng (Abuse Protection) Tối Giản Cho Hackathon

Đối với dự án Hackathon, giải pháp bảo vệ cần **gọn nhẹ, không tốn chi phí hạ tầng bổ sung nhưng phải ngăn chặn hiệu quả bot spam**.

```mermaid
flowchart LR
    Req["Request"] --> Check_Size{"1. Body Size <= 64KB?"}
    Check_Size -- Không --> Reject_413["413 Payload Too Large"]
    Check_Size -- Có --> Check_Auth{"2. Shared Secret hoặc User JWT?"}
    Check_Auth -- Không hợp lệ --> Reject_401["401 Unauthorized"]
    Check_Auth -- Hợp lệ --> Check_RL{"3. Rate Limit (20 req/min/IP)?"}
    Check_RL -- Vượt ngưỡng --> Reject_429["429 Too Many Requests"]
    Check_RL -- Trong ngưỡng --> Forward["4. Chuyển tiếp xử lý Core Logic"]

    style Forward fill:#10b981,stroke:#047857,color:#ffffff
    style Reject_413 fill:#ef4444,stroke:#b91c1c,color:#ffffff
    style Reject_401 fill:#ef4444,stroke:#b91c1c,color:#ffffff
    style Reject_429 fill:#ef4444,stroke:#b91c1c,color:#ffffff
```

#### 1. Kiểm soát dung lượng Body (Payload Bomb Protection)
- Giới hạn payload tối đa 64 KB (đủ cho tin nhắn chat và tham số tài chính, ngăn chặn DoS bằng chuỗi văn bản khổng lồ):
  ```typescript
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 65536) {
    return new Response(JSON.stringify({ error: "Payload too large (Max 64KB)" }), { status: 413 });
  }
  ```

#### 2. Xác thực qua Shared Secret giữa Next.js Frontend và Worker Gateway
- Để ngăn chặn việc bot bên ngoài quét trực tiếp domain `*.workers.dev`:
  - Frontend gọi Worker kèm header bí mật: `x-vietfi-gateway-secret: <GATEWAY_SHARED_SECRET>`.
  - Worker so sánh bằng thuật toán an toàn `crypto.subtle.timingSafeEqual()`.

#### 3. Rate Limiting trên Cloudflare Edge bằng IP hash
- Trích xuất IP thật từ header độc quyền của Cloudflare `cf-connecting-ip`.
- Triển khai Sliding Window tối giản thông qua Cloudflare Cache API hoặc in-memory Map trên Worker daemon:
  - Giới hạn: **30 requests / phút** cho các API dữ liệu thị trường.
  - Giới hạn: **10 requests / phút** cho các API AI Chat / Morning Brief.
  - Trả về header chuẩn `Retry-After: 60` khi vượt ngưỡng.

#### 4. Xác thực Cron an toàn tuyệt đối (Fail-Closed & Timing-Safe)
Chuẩn hóa toàn bộ endpoint `/api/cron/*` theo mẫu bảo mật cao nhất:
```typescript
import crypto from "crypto";

export async function verifyCronAuth(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  // BẮT BUỘC: Fail-closed nếu thiếu secret
  if (!cronSecret || cronSecret.length < 16) {
    console.error("[SECURITY] CRON_SECRET is missing or too short!");
    return false;
  }

  const authHeader = request.headers.get("authorization") || "";
  const expectedHeader = `Bearer ${cronSecret}`;

  // Chống Timing Attack bằng timingSafeEqual
  if (authHeader.length !== expectedHeader.length) return false;
  return crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedHeader));
}
```

---

## 6. BẢNG TỔNG HỢP KIẾN NGHỊ VÀ LỘ TRÌNH KHẮC PHỤC (REMEDIATION ROADMAP)

> **LƯU Ý:** Thực hiện nghiêm túc yêu cầu của phase này: **Chưa sửa code dự án**. Bảng dưới đây vạch rõ các đầu việc cần thực hiện ngay khi bước vào phase tiếp theo.

### Giai Đoạn 1: Khắc Phục Khẩn Cấp (Trong 24 Giờ - P0 Fixes)
1. **Thu hồi và cấp mới API Keys:**
   - [ ] Thu hồi Google Gemini API Key `AIzaSyDIiq9g1aIq_vUjox8ANR_RPrMwCelCJxc` trên Google Cloud Console.
   - [ ] Tạo key mới và chỉ lưu vào biến môi trường trên Vercel / Cloudflare Worker.
2. **Loại bỏ Backdoor & Debug Endpoints:**
   - [ ] Xóa bỏ header `x-demo-bypass: hungpixi-demo` trong `src/app/api/backtest/route.ts` và `src/app/dashboard/backtest/page.tsx`.
   - [ ] Xóa hoặc bảo vệ bằng auth kiểm tra quyền admin cho `/test-ssr` và `/test-supabase`.
3. **Vá lỗ hổng Fail-Open Cron:**
   - [ ] Sửa `api/cron/market-alert` và `api/cron/sync-market` thành Fail-Closed: từ chối 500 nếu thiếu `CRON_SECRET`.
   - [ ] Loại bỏ hoàn toàn việc nhận `?key=` qua URL query string.
   - [ ] Chuyển method của cron endpoints từ `GET` sang `POST`.
4. **Cập nhật `.gitignore`:**
   - [ ] Bổ sung ngay `.dev.vars`, `.dev.vars.*`, `.wrangler/`, và `scratch/` vào `.gitignore`.

### Giai Đoạn 2: Chuẩn Hóa Kiến Trúc & Tách Biệt Bí Mật (P1 Improvements)
1. **Sửa lỗi Open Redirect:**
   - [ ] Áp dụng hàm `safeRedirectPath()` và `getCanonicalAppOrigin()` cho `src/app/auth/callback/route.ts`.
2. **Khắc phục DOJI Gold Hardcoded Key:**
   - [ ] Đưa `DOJI_API_KEY` vào biến môi trường server-side, xóa bỏ chuỗi fallback `'258fbd2a72ce8481089d88c678e9fe4f'` trong `crawler.ts`.
3. **Thống nhất Supabase Client:**
   - [ ] Loại bỏ sự phân tán giữa `@/lib/supabase` và `@/utils/supabase`.
   - [ ] Tái sử dụng `src/lib/supabase/admin.ts` với cờ `server-only` cho toàn bộ các tác vụ backend/cron cần bypass RLS.
   - [ ] Xóa bỏ đoạn mã fallback nguy hiểm `SUPABASE_SERVICE_KEY = ... || ANON_KEY`.

### Giai Đoạn 3: Triển Khai Cloudflare Gateway & Hardening (P2 Scaling)
1. **Triển khai Cloudflare Worker Gateway:**
   - [ ] Chuyển toàn bộ logic gọi LLM (`gemini`, `openai`) sang Cloudflare Worker giữ secret qua `wrangler secret put`.
   - [ ] Áp dụng rate limiting 30 req/min theo `cf-connecting-ip`.
2. **Làm sạch Git History:**
   - [ ] Sử dụng công cụ `git-filter-repo` để xóa vĩnh viễn file `better-auth.sqlite` và các commit chứa key `AIzaSy...` ra khỏi Git packfiles nếu dự án được đưa lên kho mã nguồn mở.
3. **Tích hợp Secret Scanning:**
   - [ ] Thiết lập GitHub Secret Scanning / Gitleaks trong GitHub Actions CI để ngăn chặn mọi hành vi commit file nhạy cảm trong tương lai.

---
**Người lập báo cáo:** Agent 08: Security, Key & Secrets Auditor  
**Chữ ký xác thực:** `SEC-AUDIT-VIETFI-2026-PASS08`
