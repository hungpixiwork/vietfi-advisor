# Lessons Learned & Architecture Notes

## Cloudflare-Native Architecture (2026-09-22)
- **Vercel Cron Bottleneck:** Vercel Hobby chỉ cho phép 1 cron/ngày và timeout 10s. Cần chuyển hẳn sang Cloudflare Cron Triggers hỗ trợ lịch trình linh hoạt theo từng phút mà không mất phí.
- **Node vs Edge Runtime cho TTS:** Gói `edge-tts-universal` cần Node.js runtime, không chạy trên Cloudflare Workerd. Giải pháp tối ưu: Pre-render toàn bộ 80+ câu thoại cố định của linh vật Vẹt Vàng thành MP3, lưu trữ trên Cloudflare R2 (0đ egress), Worker stream trực tiếp hoặc trả URL.
- **Client-Side First:** Toàn bộ tính toán tài chính (Debt Optimizer, Fear & Greed Index, Personal CPI) là pure TypeScript không cần backend, hoàn toàn tương thích với Next.js Static Export (`output: 'export'`) trên Workers Static Assets.
- **Hono Router:** Giúp backend siêu nhẹ (<15KB), cold-start 0ms, type-safe RPC client cho frontend.

## AI Architecture Audit (2026-09-22)
- **Anti-Pattern JSON Parsing:** Không dùng prompt regex gọt markdown để parse JSON (`callGeminiJSON`). Phải dùng Native Structured Outputs (`generateObject` với Zod schema) để triệt tiêu lỗi gãy JSON.
- **Deterministic First:** Mọi phép tính số học, tỷ lệ 50-30-20, DTI, phân bổ danh mục phải do code TypeScript thuần tính toán. LLM chỉ đóng vai trò thuyết minh ngữ cảnh & nhập vai Vẹt Vàng xéo xắt, cấm để LLM tự làm toán.
- **Zombie Dependency:** `@google/generative-ai` hoàn toàn dư thừa vì dự án đã chuyển hẳn sang `@ai-sdk/google`.
- **Trùng lặp gọi mô hình:** Gom `generateAiSummary` và `generateMorningBrief` thành 1 điểm gọi duy nhất để tránh lãng phí token và chạm trần RPM.


## FINHACKATHON Product Strategy & Demo Framing (2026-09-22)
- **Cạm bẫy Feature Creep:** Tuyệt đối không định vị VietFi là "AI chatbot tài chính nhiều tính năng". Chatbot tổng quát là commodity và làm phân tán sự chú ý của giám khảo.
- **Kính chắn gió vs. Gương chiếu hậu:** Người dùng không cần thêm một app chỉ để ghi chép tiền đã mất. Giá trị cốt lõi là **Decision Simulator (Mô phỏng tác động tương lai)** trước khi quẹt thẻ.
- **Mô hình U-S-E-T (Understand -> Simulate -> Explain -> Track):** Giúp cấu trúc luồng thuyết trình < 3 phút mạch lạc, sắc bén, đánh thẳng vào nỗi sợ bị bẫy nợ BNPL/thẻ tín dụng của người trẻ.
- **Tập trung hóa Navigation:** Khi demo hackathon, cần ẩn các tính năng chuyên sâu (Backtest, Gurus, News, Housing) để dồn toàn bộ sự chú ý vào kịch bản Hero Feature "Mua laptop 25 triệu".

## Repo Hygiene & Asset Management (2026-09-22)
- **Hiểm họa Thư mục Nháp (Scratch Folders):** Cấm commit thư mục `scratch/` hay script test ad-hoc lên git. Các script này có xu hướng hardcode API keys thật gây rò rỉ bảo mật. Luôn cho `scratch/` vào `.gitignore`.
- **Cạm bẫy Public Assets:** Tránh để các công cụ tự động (DevTools, E2E test, Agent) lưu ảnh screenshot kiểm thử vào `public/docs/`. Mọi file trong `public/` đều bị đóng gói đưa lên CDN/server sản xuất, gây phình dung lượng (>10MB rác).
- **Tránh Xóa Vội Vàng Barrel Files:** Khi dọn dẹp kiến trúc, các file barrel `@deprecated` (`@/lib/storage`, `@/lib/gamification`) vẫn đang được hàng chục file import. Bắt buộc phải thực hiện REWRITE import trước khi DELETE barrel, tránh làm sập vòng build.
## Frontend Architecture Audit (2026-09-22)
- **Hiểm họa Polling LocalStorage:** Tránh dùng `setInterval` 1s trong Layout để đọc storage và gán state. `setGam(newGam)` tạo object reference mới liên tục, ép TopBar và animation re-render 60 lần/phút. Phải dùng `useSyncExternalStore` hoặc Event-driven CustomEvent.
- **Lạm dụng 'use client' & Hydration:** Không đọc `localStorage.getItem` đồng bộ trong render body. Khi SSR trả về fallback mà client có data, React 19 văng hydration error.
- **Un-debounced API Requests:** Mọi input số gõ tay (như số vốn đầu tư) liên kết `useEffect` gọi backend bắt buộc phải debounce (300ms) + `AbortController` chống race condition.
- **Trùng lặp & Dead Dependencies:** Cần dọn 7 thư viện rác trong `package.json` (`hooks`, `lottie-react`, `@ai-sdk/react`, v.v.) và hợp nhất chuẩn đồ thị thay vì ôm đồm cả Recharts lẫn Lightweight-charts.
- **Tuân thủ Triết lý Light Mode & Zero Glassmorphism:** Cấm backdrop-blur và dark mode cưỡng bức; bắt buộc `scrollbar-gutter: stable` và `text-wrap: pretty`.

