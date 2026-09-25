# Báo Cáo & Kế Hoạch Dọn Dẹp Repository (Repo Cleanup Plan)
**Dự án**: VietFi Advisor (`vietfi-advisor`)  
**Mã kiểm toán**: AUDIT-09-REPO-CLEANUP  
**Thời gian thực hiện**: 22/09/2026  
**Auditor**: Agent 09 - Repo Cleanup Planner  
**Trạng thái phase**: Lập kế hoạch (Planning Only) — Tuyệt đối không xóa/sửa file nguồn trong phase này.

---

## 1. Tóm Tắt Điều Hành (Executive Summary)

Sau đợt quét toàn diện toàn bộ cấu trúc thư mục, tệp tin gốc, mã nguồn `src/`, tệp tĩnh `public/`, các thư viện `package.json`, và lịch sử commit của repository `vietfi-advisor`, kết quả kiểm toán phát hiện **mức độ tích tụ rác kỹ thuật và tài nguyên mồ côi (dead assets/code) rất lớn** sau nhiều đợt sprint gấp rút:

1. **Rò rỉ bảo mật nghiêm trọng (Credential Leakage)**:
   - Thư mục `scratch/` chứa 4 tệp kịch bản kiểm thử API thô, trong đó có **API key Gemini thực tế** (`AIzaSyDIiq9g1aIq_vUjox8ANR_RPrMwCelCJxc`) được hardcode trong 3 tệp tin khác nhau (`scratch/list-models.mjs`, `scratch/test-gemini-direct.mjs`, `scratch/test-gemini-stream.mjs`).
2. **Lãng phí dung lượng tĩnh (Static Asset Bloat ~28 MB)**:
   - `public/docs/`: Chứa **57 ảnh chụp màn hình kiểm thử** (UI audit screenshots) với tổng dung lượng **10.14 MB**, bị đẩy vào thư mục `public` khiến Next.js đóng gói và phân phối công khai qua web server production.
   - `design-exports/`: Chứa 6 ảnh chụp clipboard ngẫu nhiên (`9nb0s.png`,...) và thư mục `feature-screenshots` tổng cộng **10.5 MB** không được bất kỳ tệp mã nguồn nào tham chiếu.
   - `public/audio/tts/`: Chứa **125 tệp MP3 (~6.92 MB)** tạo sẵn từ kịch bản cũ, nhưng mã nguồn ứng dụng hiện tại đã tắt endpoint TTS (`api/tts/route.ts` trả về HTTP 405) và không hề có trình phát audio nào trong UI.
   - `public/animations/`: Chứa các lát cắt ảnh và tệp Lottie JSON (`vet-vang-idle.json`, `parrot-body.png` ~412 KB) của component `AnimatedParrot` đã bị xóa bỏ từ commit `34f06ee`.
3. **Thư mục & Tệp tin mồ côi / Dead Code**:
   - `vietfi-appwrite/`: Thư mục rỗng (0 bytes) còn sót lại sau khi dự án chuyển dịch toàn bộ sang Supabase.
   - `voice_ref/`: Chỉ chứa 1 tệp phụ đề WebVTT (`zinzin.vi.vtt`), thiếu hoàn toàn tệp âm thanh gốc WAV (`zinzin_vocal.wav`), khiến toàn bộ kịch bản voice clone Python trong `scripts/` bị lỗi hỏng khi chạy.
   - `design-system/`: Thư mục sinh tự động bởi công cụ bên ngoài, chứa cấu hình màu tối (`#0F172A`, tím `#8B5CF6`) đi ngược lại quy chuẩn giao diện sáng (Light Mode) và Purple Ban của dự án, hoàn toàn không được `src/` sử dụng.
   - Các tệp rác tại thư mục gốc: `doji.xml`, `build_error.txt`, `eslint_report.txt`, `dev-3001.err.log`, `dev-3001.out.log`, `test-llm.mjs`, `vietfi_mascot_sly_...png`.
4. **Route thừa & Mã trùng lặp trong `src/app`**:
   - `src/app/test-ssr/` và `src/app/test-supabase/`: Các trang kiểm thử kết nối bảng `todos` giả định, làm lộ cấu hình Supabase ra client khi bảng không tồn tại.
   - `src/utils/`: Chứa một bộ client/middleware Supabase cũ, trùng lặp và kém an toàn hơn `src/lib/supabase/`.
   - `src/app/login/actions.ts`: 91 dòng Server Actions không còn tệp nào import (form đăng nhập hiện tại dùng client-side Supabase).
   - `src/app/dashboard/spending-insights/page.tsx`: Chỉ bọc lại `PersonalCPIPage`, trong khi proxy lại chuyển tiếp chéo giữa 2 route này.
5. **Gói thư viện rác (Phantom / Zombie Dependencies)**:
   - Phát hiện **5 gói phụ thuộc hoàn toàn không có import nào trong `src/`**: `"hooks"` (gói npm từ năm 2012 bị cài nhầm), `"class-variance-authority"`, `"@ai-sdk/react"`, `"@google/generative-ai"`, `"lottie-react"`.
   - `"edge-tts-universal"` và `"dotenv"` chỉ phục vụ các script kiểm thử ngoại tuyến trong `scripts/`, không nên nằm trong `dependencies` runtime của ứng dụng Next.js.
6. **Tài liệu gốc bị phân mảnh & Đặt sai tên**:
   - `CLAUDE.md`: Thực chất là **Báo cáo Kiểm toán Thuật toán Định lượng & Backtest** (`Senior Quant & Backtest Auditor Report`), bị đặt nhầm tên file ở root.
   - `BAO_CAO_VONG_1_WDA2026.md`, `PLAN_CHI_TIET.md`, `WDA2026_PHAN_CONG.md`, `security_best_practices_report.md` nằm ngổn ngang tại root thay vì được tổ chức vào `docs/reports/` hoặc `docs/archive/`.

---

## 2. Bảng Kế Hoạch Dọn Dẹp Tổng Thể (Master Cleanup Table)

Bảng phân loại chi tiết theo 5 hành động chuẩn:
- **`DELETE`**: Xóa vĩnh viễn (tệp rác, log, rò rỉ khóa, thư mục rỗng, dependency vô dụng).
- **`MOVE`**: Di chuyển sang vị trí lưu trữ lịch sử (`docs/archive/`) hoặc thư mục quy chuẩn (`docs/reports/`, `docs/audit/`, `scripts/`).
- **`KEEP`**: Giữ nguyên (tệp đang vận hành hoặc cần thiết cho giai đoạn tiếp theo).
- **`MERGE`**: Hợp nhất nội dung vào tệp đích để loại bỏ trùng lặp.
- **`REWRITE`**: Sửa đổi đường dẫn import hoặc viết lại logic định tuyến trước khi dọn dẹp.

| Action | Path | Reason & Evidence | Risk / Impact |
| :--- | :--- | :--- | :--- |
| **DELETE** | `scratch/` (toàn bộ thư mục: `list-models.mjs`, `test-chat-api.mjs`, `test-gemini-direct.mjs`, `test-gemini-stream.mjs`) | Script nháp ad-hoc; **CHỨA HARDCODED GEMINI API KEY THẬT** gây nguy cơ rò rỉ nghiêm trọng; không phục vụ runtime hay test suite tự động. | **Tích cực (Security Win)**: Triệt tiêu nguy cơ lộ lọt credential, 0 ảnh hưởng ứng dụng. |
| **DELETE** | `vietfi-appwrite/` | Thư mục rỗng (0 bytes), tàn tích từ giai đoạn thử nghiệm Appwrite trước khi chuyển hẳn sang Supabase. Đã được đưa vào `.gitignore`. | **Không có rủi ro**: Thư mục trống. |
| **DELETE** | `voice_ref/` (`voice_ref/zinzin.vi.vtt`) | Tệp phụ đề mồ côi (3 KB), không có tệp audio `.wav` đi kèm. Toàn bộ script voice clone Python phụ thuộc vào nó đều không thể chạy. Feature voice clone đã dừng. | **Không có rủi ro**: Tệp mồ côi, không tệp nào tham chiếu. |
| **DELETE** | `design-exports/*.png` (`9nb0s.png`, `AL84F.png`, `ge27S.png`, `IuBLF.png`, `K66sZ.png`, `XfdAr.png`) | 6 ảnh clipboard/export ngẫu nhiên (~700 KB) không tên tuổi, không được tệp mã nguồn hay tài liệu nào nhắc tới. | **Không có rủi ro**: Ảnh rác. |
| **MOVE** | `design-exports/feature-screenshots/` | 13 ảnh chụp màn hình UI dashboard cũ (~9.8 MB). Cần chuyển sang `docs/archive/design-exports/feature-screenshots/` để làm minh chứng/tư liệu nộp bài thi vòng 2 nếu cần. | **Thấp**: Lưu trữ tư liệu lịch sử, giải phóng root. |
| **DELETE** | `design-system/` (`design-system/vietfi-advisor/MASTER.md`, `pages/sentiment.md`) | Tệp tài liệu sinh tự động từ script `ui-ux-pro-max`, chứa cấu hình Dark Mode (`#0F172A`, tím) vi phạm quy chuẩn Light Mode & Purple Ban. Mã nguồn ứng dụng dùng trực tiếp Tailwind v4 trong `src/app/globals.css`. | **Không có rủi ro**: Không ảnh hưởng mã nguồn. |
| **DELETE** | `doji.xml` | Tệp XML tĩnh (3.7 KB) lưu giá vàng DOJI ngày 26/03/2026 từ lệnh cào thủ công. Hiện tại app cào giá vàng tự động qua `market-data/crawler.ts`. | **Không có rủi ro**: Dữ liệu lịch sử chết. |
| **DELETE** | `build_error.txt` | Tệp log ghi lỗi build Next.js cũ (8.6 KB) từ lúc thử nghiệm tùy chọn eslint không còn được hỗ trợ. | **Không có rủi ro**: Log rác. |
| **DELETE** | `eslint_report.txt` | Tệp log ghi 1 lỗi eslint cũ trong `rebalance.ts` (đã được fix). | **Không có rủi ro**: Log rác. |
| **DELETE** | `dev-3001.err.log`, `dev-3001.out.log` | Tệp log chạy nền `next dev --port 3001` (0 KB và 795 bytes). Vô tình bị Git theo dõi. | **Không có rủi ro**: Log rác. |
| **DELETE** | `test-llm.mjs` | Script Node độc lập tại root dùng để test API Gemini/Zen, không thuộc hệ thống kiểm thử Vitest hay Playwright. | **Không có rủi ro**: Tệp test ngoài luồng. |
| **DELETE** | `vietfi_mascot_sly_1773897837198.png` | Ảnh sinh tự động (50 KB) bị rơi tại root trong một phiên làm việc của Agent. Mọi tài nguyên mascot chính thức đã nằm chuẩn trong `public/assets/`. | **Không có rủi ro**: File rác. |
| **MOVE** | `generate-vet-vang-lottie.js` | Chuyển sang `scripts/generate-vet-vang-lottie.js` (hoặc lưu trữ tại `docs/archive/scripts/`). Script sinh JSON hoạt họa Vẹt Vàng, không nên nằm ở thư mục root. | **Thấp**: Dọn dẹp root, giữ lại công cụ sinh JSON nếu cần tái kích hoạt Lottie. |
| **DELETE** | `.grapuco/`, `.omc/`, `.opencode/` | Bộ đệm nội bộ (AST cache, checkpoint session) của các agent/tooling cục bộ, bị lọt vào Git tracking. | **Không có rủi ro**: Cache nội bộ, cần bổ sung vào `.gitignore`. |
| **DELETE** | `src/app/test-ssr/page.tsx` | Route thử nghiệm SSR truy vấn bảng `todos` giả định qua `@/utils/supabase/server`. Gây hiểu lầm và lộ URL Supabase khi bảng thiếu. | **Tích cực**: Xóa route thừa, đóng lỗ hổng lộ thông tin. |
| **DELETE** | `src/app/test-supabase/page.tsx` | Route thử nghiệm Client truy vấn bảng `todos` giả định qua `@/utils/supabase`. | **Tích cực**: Xóa route thừa. |
| **REWRITE** | `src/utils/` (`supabase.ts`, `client.ts`, `server.ts`, `middleware.ts`) | Thay đổi các import còn sót lại (`src/app/auth/callback/route.ts`, `src/proxy.ts`) sang `@/lib/supabase/*`, sau đó **DELETE** toàn bộ thư mục `src/utils/`. `src/lib/supabase/` có bảo mật cookie và xử lý lỗi tốt hơn hẳn. | **Trung bình**: Cần kiểm tra kỹ TypeScript và auth flow sau khi đổi import trước khi xóa. |
| **DELETE** | `src/app/login/actions.ts` | 91 dòng Server Actions xác thực email/password cũ. 0% tệp tin trong toàn bộ repo import hay sử dụng (trang login chính dùng `LoginForm.tsx` client-side Supabase). | **Không có rủi ro**: Dead code hoàn toàn. |
| **MERGE** | `src/app/login/page.tsx` | Chỉ chứa 6 dòng redirect sang `/auth/login`. Nên hợp nhất quy tắc redirect này vào `middleware.ts` hoặc `next.config.ts`, sau đó **DELETE** thư mục `src/app/login/`. | **Thấp**: Giảm bớt 1 route rỗng. |
| **MERGE** | `src/app/dashboard/spending-insights/page.tsx` & `personal-cpi/page.tsx` | `spending-insights/page.tsx` chỉ là wrapper bọc `PersonalCPIPage`, trong khi `proxy.ts` chuyển hướng `/dashboard/personal-cpi` sang `/dashboard/spending-insights`. Cần chuẩn hóa chọn 1 route canonical duy nhất và xóa route thừa. | **Thấp**: Tránh phân mảnh URL và vòng lặp redirect. |
| **MOVE** | `src/app/dashboard/budget/page.tsx` & `src/app/dashboard/ledger/page.tsx` | Hai trang này đã được nhúng làm Tab bên trong `/dashboard/cashflow`, và `proxy.ts` đã redirect sang cashflow. Để là `page.tsx` khiến Next.js sinh route thừa. Nên đổi tên thành `BudgetTab.tsx` và `LedgerTab.tsx` đặt trong `src/app/dashboard/cashflow/_components/`. | **Trung bình**: Cần cập nhật import trong `src/app/dashboard/cashflow/page.tsx` và xóa route cũ. |
| **DELETE** | `scripts/report.txt`, `scripts/report_utf8.txt`, `scripts/report_after_utf8.txt` | Các tệp xuất kết quả dạng text tĩnh (1.8 - 3.7 KB) từ lần chạy test backtest cũ, không phải mã nguồn chạy được. | **Không có rủi ro**: Log rác trong scripts. |
| **DELETE** | `scripts/debug_clone.py`, `scripts/test_clone.py`, `scripts/test_clone2.py`, `scripts/list_voices.py` | Các script Python thử nghiệm voice clone VieNeu cũ; hardcode đường dẫn ổ đĩa tuyệt đối `d:\Cá nhân\...` và các tệp wav không tồn tại. | **Không có rủi ro**: Script chết không thể chạy. |
| **DELETE** | `scripts/aggregate.js` | Script tổng hợp backtest nhưng đọc tệp `./backtest_results.json` không tồn tại trong repo. | **Không có rủi ro**: Dead script. |
| **KEEP** | `scripts/sync_market_data.py`, `scripts/sync_market_eod.ts`, `scripts/check_alphas.ts`, `scripts/comprehensive_backtest.ts`, `scripts/test_engine.ts`, `scripts/export_tts_data.ts` | Các script đồng bộ dữ liệu thị trường và kiểm thử chiến lược định lượng hợp lệ, phục vụ vận hành. | **Cần thiết**: Giữ nguyên cho pipeline dữ liệu. |
| **MOVE** | `public/docs/*.png` (57 tệp ảnh, 10.14 MB) | Chuyển toàn bộ 57 ảnh chụp UI audit từ `public/docs/` sang `docs/archive/audit-screenshots/`. Tuyệt đối không để trong `public/` vì Next.js sẽ bundle và public hóa chúng trên production web server. | **Tích cực lớn**: Giảm ngay 10.14 MB dung lượng static asset của ứng dụng. |
| **MOVE** | `public/animations/` (`vet-vang-idle.json` và thư mục `parts/` ~412 KB) | Chuyển sang `docs/archive/animations/` (hoặc DELETE nếu chắc chắn không hồi sinh mascot Lottie). Component `AnimatedParrot.tsx` đã bị gỡ bỏ. | **Không có rủi ro**: 0 import trong mã nguồn. |
| **MOVE** | `public/audio/tts/*.mp3` (125 tệp, 6.92 MB) | Chuyển sang `docs/archive/audio-tts/` nếu sản phẩm chính thức bỏ tính năng phát tiếng nói của Vẹt Vàng; hoặc **KEEP** nếu có kế hoạch kích hoạt lại audio player trong chat. Hiện tại ứng dụng không có thẻ `<audio>` nào gọi tới thư mục này. | **Thấp**: Giúp giảm thêm 6.92 MB static asset. |
| **MOVE** | `CLAUDE.md` (ở root) | Tên tệp gây hiểu lầm nghiêm trọng (tưởng là rules cho Claude AI). Nội dung thực chất là báo cáo kiểm toán Quant Backtest của chuyên gia. Cần chuyển thành `docs/audit/quant-backtest-audit.md`. | **Tích cực**: Sắp xếp tài liệu đúng vị trí, tránh nhầm lẫn. |
| **MOVE** | `BAO_CAO_VONG_1_WDA2026.md` (ở root) | Báo cáo ý tưởng Vòng 1 cuộc thi WDA2026 (94 KB). Cần chuyển vào `docs/reports/BAO_CAO_VONG_1_WDA2026.md`. | **Không có rủi ro**: Dọn dẹp root, bảo tồn báo cáo dự thi. |
| **MOVE** | `PLAN_CHI_TIET.md` (ở root) | Bản kế hoạch chi tiết từ 19/03/2026 (giai đoạn skeleton/prototype). Đã lỗi thời hoàn toàn so với kiến trúc hiện tại. Chuyển sang `docs/archive/plans/PLAN_CHI_TIET_v2.0_2026-03-19.md`. | **Không có rủi ro**: Lưu trữ lịch sử dự án. |
| **MOVE** | `WDA2026_PHAN_CONG.md` (ở root) | Bản phân công công việc ca ngày/đêm Hưng vs Hoàng. Nội dung đã được tóm tắt trong `AGENTS.md`. Chuyển sang `docs/archive/WDA2026_PHAN_CONG.md`. | **Không có rủi ro**: Tránh trùng lặp. |
| **MOVE** | `portfolio-backtest-projection.md` (ở root) | Đặc tả tính năng backtest/projection mini (1.5 KB). Chuyển vào `docs/superpowers/plans/portfolio-backtest-projection.md`. | **Không có rủi ro**: Gom nhóm tài liệu kỹ thuật. |
| **MOVE** | `security_best_practices_report.md` (ở root) | Báo cáo khắc phục lỗ hổng bảo mật ngày 16/04/2026 (6.1 KB). Chuyển vào `docs/audit/security-remediation-report.md`. | **Không có rủi ro**: Đúng danh mục audit. |
| **REWRITE** | `AGENTS.md` & `README.md` | Viết lại/cập nhật các đoạn tài liệu lỗi thời: bỏ mô tả về `POST /api/chat`, `AnimatedParrot.tsx`, `VetVangChat.tsx` (những thứ đã bị xóa trên thực tế); đồng bộ các đường dẫn tài liệu sau khi di chuyển. | **Tích cực**: Tài liệu phản ánh 100% sự thật mã nguồn (SSOT). |
| **KEEP** | `src/lib/*.ts` re-export barrels (`gamification.ts`, `storage.ts`, `gemini.ts`, `supabase.ts`,...) | **TẠM THỜI GIỮ NGUYÊN** trong giai đoạn này. Mặc dù được đánh dấu `@deprecated`, hơn 25 tệp UI/logic vẫn đang import từ các barrel này. Xóa ngay sẽ làm gãy build toàn bộ dự án. | **RẤT CAO NẾU XÓA NGAY**: Chỉ được xóa ở Phase sau khi đã hoàn tất migration các câu lệnh import trong mã nguồn. |

---

## 3. Kiểm Toán Chi Tiết Thư Viện (`package.json`)

Tiến hành rà soát từng gói phụ thuộc trong `dependencies` và `devDependencies` dựa trên lệnh quét mã nguồn thực tế `git grep`:

```json
{
  "dependencies": {
    "@ai-sdk/google": "^3.0.43",          // [KEEP] Dùng trong src/lib/infrastructure/llm/client.ts
    "@ai-sdk/openai": "^3.0.49",          // [KEEP] Dùng trong src/lib/infrastructure/llm/client.ts
    "@ai-sdk/react": "^3.0.118",          // [DELETE] 0 import trong src/ (chat UI đã bị gỡ)
    "@google/generative-ai": "^0.24.1",   // [DELETE] 0 import trong src/ (dự án dùng Vercel AI SDK)
    "@supabase/ssr": "^0.9.0",            // [KEEP] Dùng trong src/lib/supabase/
    "@supabase/supabase-js": "^2.103.1",  // [KEEP] Dùng trong src/lib/supabase/
    "@tanstack/react-query": "^5.99.0",   // [KEEP] Dùng trong QueryProvider và useUserData
    "ai": "^6.0.116",                     // [KEEP] Dùng trong llm/client.ts
    "cheerio": "^1.2.0",                  // [KEEP] Dùng trong crawler cào tin tức & tỷ giá
    "class-variance-authority": "^0.7.1", // [DELETE] 0 import trong src/ (cài thừa từ mẫu shadcn)
    "clsx": "^2.1.1",                     // [KEEP] Dùng trong src/lib/utils.ts (cn helper)
    "dotenv": "^17.3.1",                  // [MOVE to devDependencies] Next.js tự nạp .env; chỉ scripts/ dùng
    "edge-tts-universal": "^1.4.0",       // [MOVE to devDependencies hoặc DELETE] Runtime đã tắt; chỉ scripts/ dùng
    "framer-motion": "^12.38.0",          // [KEEP] Animation toàn bộ UI
    "hooks": "^0.3.2",                    // [DELETE] Gói git hooks 2012 cài nhầm; 0 import
    "lightweight-charts": "^4.2.3",       // [KEEP] Dùng trong TradingViewChart.tsx
    "lottie-react": "^2.4.1",             // [DELETE] 0 import trong src/ (AnimatedParrot đã bị xóa)
    "lucide-react": "^0.577.0",           // [KEEP] Icon chính của hệ thống
    "next": "^16.2.3",                    // [KEEP] Framework chính
    "react": "19.2.3",                    // [KEEP] Thư viện UI
    "react-dom": "19.2.3",                // [KEEP] Thư viện DOM
    "recharts": "^3.8.0",                 // [KEEP] Biểu đồ phân bổ ngân sách & rủi ro
    "tailwind-merge": "^3.5.0"            // [KEEP] Dùng trong src/lib/utils.ts (cn helper)
  }
}
```

### Danh mục phụ thuộc cần gỡ bỏ ngay (Phục vụ Phase Thực Thi):
1. `npm uninstall hooks` — Loại bỏ gói nhầm lẫn từ 2012.
2. `npm uninstall class-variance-authority` — Loại bỏ gói dư thừa.
3. `npm uninstall @ai-sdk/react` — Loại bỏ gói React hook của Vercel AI không sử dụng.
4. `npm uninstall @google/generative-ai` — Loại bỏ Google SDK dư thừa (đã dùng `@ai-sdk/google`).
5. `npm uninstall lottie-react` — Loại bỏ runtime Lottie khi mascot động đã được gỡ bỏ.
6. Chuyển `dotenv` và `edge-tts-universal` từ `dependencies` sang `devDependencies`:
   `npm install -D dotenv edge-tts-universal`

---

## 4. Kế Hoạch Tổ Chức Lại Tài Liệu & Thư Mục Lưu Trữ (`docs/archive/`)

Nhằm biến thư mục root thành không gian sạch sẽ, chuẩn mực của một repository mã nguồn mở cấp doanh nghiệp, cấu trúc đích của `docs/` sau khi dọn dẹp sẽ như sau:

```
vietfi/
├── .agents/
│   └── lessons_learned.md              # SSOT bài học kinh nghiệm
├── memorybank/
│   └── timeline.md                     # SSOT timeline dự án
├── docs/
│   ├── architecture/
│   │   └── cloudflare-target.md        # Kiến trúc Edge-first Cloudflare (Agent 05)
│   ├── audit/
│   │   ├── 01-runtime-reality.md       # Kiểm toán runtime thực tế (Agent 01)
│   │   ├── 03-api.md                   # Kiểm toán API (Agent 03)
│   │   ├── 04-data-migration.md        # Kiểm toán schema & migration (Agent 04)
│   │   ├── 06-ai.md                    # Kiểm toán AI architecture (Agent 06)
│   │   ├── 07-performance.md           # Kiểm toán Web Perf (Agent 07)
│   │   ├── 09-cleanup-plan.md          # Kế hoạch dọn dẹp repo (Agent 09 - Bản báo cáo này)
│   │   ├── quant-backtest-audit.md     # Đổi tên từ CLAUDE.md
│   │   └── security-remediation.md     # Chuyển từ security_best_practices_report.md
│   ├── product/
│   │   └── finhackathon-story.md       # Định vị sản phẩm & kịch bản demo (Agent 10)
│   ├── reports/
│   │   └── BAO_CAO_VONG_1_WDA2026.md   # Chuyển từ root
│   ├── superpowers/                    # Các kế hoạch tính năng và specs chi tiết
│   │   ├── plans/
│   │   │   └── portfolio-backtest-projection.md  # Chuyển từ root
│   │   └── specs/
│   └── archive/                        # THƯ MỤC LƯU TRỮ LỊCH SỬ (TẠO MỚI)
│       ├── design-exports/
│       │   └── feature-screenshots/    # Lưu 13 ảnh screenshot cũ
│       ├── audit-screenshots/          # Lưu 57 ảnh chụp từ public/docs/
│       ├── animations/                 # Lưu vet-vang-idle.json và parrot parts
│       ├── audio-tts/                  # Lưu 125 file MP3 pre-rendered
│       ├── plans/
│       │   └── PLAN_CHI_TIET_v2.0.md   # Bản kế hoạch 19/03/2026 cũ
│       └── WDA2026_PHAN_CONG.md        # Bản phân công ca ngày/đêm cũ
```

---

## 5. Lộ Trình Thực Thi Dọn Dẹp (Execution Roadmap - Cho Phase Tiếp Theo)

> ⚠️ **LƯU Ý:** Toàn bộ các bước dưới đây **CHƯA ĐƯỢC CHẠY TRONG PHIÊN NÀY** theo đúng chỉ thị cách ly rủi ro của người dùng. Đây là quy trình hướng dẫn từng bước an toàn cho Developer / Execution Agent khi bước vào phase thực thi:

### Bước 1: Dọn dẹp Root & Rò rỉ bảo mật (Zero Risk)
```powershell
# 1. Xóa các tệp log và rác tại root
git rm -f build_error.txt dev-3001.err.log dev-3001.out.log doji.xml eslint_report.txt test-llm.mjs vietfi_mascot_sly_1773897837198.png

# 2. Xóa thư mục scratch (chứa API key leak) & thư mục rỗng appwrite
git rm -rf scratch/
Remove-Item -Recurse -Force vietfi-appwrite -ErrorAction SilentlyContinue

# 3. Xóa các ảnh rác trong design-exports và voice_ref
git rm -f design-exports/*.png
git rm -rf voice_ref/ design-system/

# 4. Xóa cache tooling bị lọt vào git
git rm -rf --cached .grapuco .omc .opencode
```

### Bước 2: Di chuyển tệp tin vào Archive & Reports (Non-Breaking)
```powershell
# Tạo cấu trúc thư mục lưu trữ
New-Item -ItemType Directory -Force -Path docs/archive/design-exports
New-Item -ItemType Directory -Force -Path docs/archive/audit-screenshots
New-Item -ItemType Directory -Force -Path docs/archive/animations
New-Item -ItemType Directory -Force -Path docs/archive/plans

# Di chuyển tài liệu root sang docs/
git mv CLAUDE.md docs/audit/quant-backtest-audit.md
git mv security_best_practices_report.md docs/audit/security-remediation-report.md
git mv BAO_CAO_VONG_1_WDA2026.md docs/reports/BAO_CAO_VONG_1_WDA2026.md
git mv PLAN_CHI_TIET.md docs/archive/plans/PLAN_CHI_TIET_v2.0_2026-03-19.md
git mv WDA2026_PHAN_CONG.md docs/archive/WDA2026_PHAN_CONG.md
git mv portfolio-backtest-projection.md docs/superpowers/plans/portfolio-backtest-projection.md
git mv generate-vet-vang-lottie.js scripts/generate-vet-vang-lottie.js

# Di chuyển ảnh lịch sử
git mv design-exports/feature-screenshots docs/archive/design-exports/
Remove-Item -Recurse -Force design-exports -ErrorAction SilentlyContinue

# Di chuyển ảnh public/docs sang archive
git mv public/docs/* docs/archive/audit-screenshots/
Remove-Item -Recurse -Force public/docs -ErrorAction SilentlyContinue
```

### Bước 3: Dọn dẹp mã nguồn thừa trong `src/` (Code Refactor)
1. Cập nhật `src/app/auth/callback/route.ts` và `src/proxy.ts`: đổi import `@/utils/supabase/...` thành `@/lib/supabase/...`.
2. Xóa thư mục `src/utils/`.
3. Xóa `src/app/test-ssr/` và `src/app/test-supabase/`.
4. Xóa `src/app/login/actions.ts`.
5. Xóa các file script chết trong `scripts/`: `report*.txt`, `debug_clone.py`, `test_clone*.py`, `list_voices.py`, `aggregate.js`.

### Bước 4: Thanh lọc `package.json` & Xác minh chất lượng
```powershell
# Gỡ bỏ các thư viện mồ côi
npm uninstall hooks class-variance-authority @ai-sdk/react @google/generative-ai lottie-react

# Chuyển dotenv sang devDependencies
npm install -D dotenv

# Chạy kiểm thử xác minh tính toàn vẹn
npm run lint
npm run test:run
npm run build
```

---

## 6. Kết Luận & Đánh Giá Tác Động

Sau khi hoàn tất kế hoạch dọn dẹp này:
- **Dung lượng Repository**: Giảm ngay lập tức **~28 MB** tệp nhị phân tĩnh và rác (giảm tải triệt để cho git clone và CI/CD runner).
- **An toàn Bảo mật**: 100% rò rỉ API key trong `scratch/` và các route thử nghiệm SSR/client được dọn dẹp sạch sẽ khỏi working tree.
- **Tính chuẩn mực kiến trúc**: Loại bỏ hoàn toàn sự mập mờ giữa `src/utils` và `src/lib`, dọn sạch các route rỗng, đưa các tệp tài liệu quan trọng về đúng danh mục chuẩn hóa (`docs/audit`, `docs/reports`, `docs/archive`).
- **Build & Bundle Speed**: Loại bỏ 5 dependencies chết giúp thu nhỏ `node_modules`, tăng tốc độ phân tích AST của webpack/turbopack và giảm thời gian deploy lên Vercel/Cloudflare.
