# BÁO CÁO Ý TƯỞNG — VÒNG 1 (Phiên bản 4.0)

# CUỘC THI LẬP TRÌNH WEB/ỨNG DỤNG "WEBDEV ADVENTURE 2026"

---

**Tên sản phẩm:** VietFi Advisor — Cố Vấn Tài Chính AI Cho Người Việt
**Chủ đề:** Vấn đề 5 – Tài chính (Tích hợp cả Vấn đề 1: Quản trị nợ & Vấn đề 2: Cố vấn tài chính ảo)
**Đội thi:** [Tên đội]
**Ngày nộp:** [Ngày nộp]

---

## MỤC LỤC

1. Đặt vấn đề
2. Mục tiêu, phạm vi và User Persona
3. Cơ sở lý thuyết
4. Giải pháp đề xuất
5. Kiến trúc hệ thống
6. Yêu cầu chức năng và phi chức năng
7. Các tính năng chi tiết
8. Biểu đồ Use Case (UML)
9. Quy trình hoạt động (BPMN)
10. Tối ưu hiệu năng
11. Tính khả thi
12. Chiến lược tăng trưởng và mô hình doanh thu
13. Phân tích cạnh tranh
14. Hướng mở rộng
15. Kết luận
16. Tài liệu tham khảo
17. Bảng chú giải thuật ngữ

---

## 1. ĐẶT VẤN ĐỀ

### 1.1. Bối cảnh vĩ mô

Nền kinh tế Việt Nam đang trong giai đoạn biến động phức tạp. Lạm phát, biến thiên lãi suất và sự bùng nổ của các kênh đầu tư rủi ro đặt cá nhân vào môi trường tài chính bất ổn. Trong bối cảnh đó, sự bùng nổ Fintech và ví điện tử tạo tiện lợi thanh toán nhưng vô tình thúc đẩy hành vi tiêu dùng bốc đồng, "Lifestyle Creep" và gánh nặng từ tín dụng tiêu dùng lãi suất cao [Đề bài].

**Các con số đáng báo động:**

| Chỉ số                                                     | Giá trị | Nguồn                                            |
| ------------------------------------------------------------ | --------- | ------------------------------------------------- |
| CPI trung bình 2025                                         | 3.31%     | Tổng cục Thống kê [1]                         |
| Tỷ lệ hiểu biết tài chính (adults VN)                  | ~24%      | Standard & Poor's Global FinLit Survey (2014) [2] |
| Trung bình ASEAN                                            | 38%       | S&P FinLit Survey [2]                             |
| Gen Z cảm thấy an toàn tài chính (Asia)                 | 57%       | Sun Life Asia Financial Resilience Index 2025 [3] |
| Gen Z áp lực tài chính                                   | 44%       | Sun Life Asia Health Index 2025 [3]               |
| Gen Z thiếu tự tin tài chính                             | 43%       | Sun Life Asia Health Index 2025 [3]               |
| Gen Z thiếu nguồn lực hỗ trợ quyết định              | 28%       | Sun Life Asia Health Index 2025 [3]               |
| Người Việt bối rối quản lý tài chính                | 67%       | Goover.ai Survey 2024 [4]                         |
| Gen Z chọn đầu tư an toàn thay vì tối ưu             | 57%       | Sun Life Asia 2025 [3]                            |
| Gen Z/Millennials "rất mới" hoặc "cơ bản" về đầu tư | 60%       | Asian Banking & Finance [5]                       |

### 1.2. Hai vấn đề cốt lõi (mapping với đề bài)

**Vấn đề 5.1 — "Bẫy nợ phân mảnh" (Debt Fragmentation Trap):**
Theo đề bài, một cá nhân có thể đồng thời sở hữu: 1 thẻ tín dụng, 2 khoản SPayLater/LazPayLater, 1 khoản vay ví điện tử — mỗi khoản có lãi suất, kỳ hạn, phí phạt khác nhau. Tổng nợ có thể chiếm 60-70% thu nhập mà người dùng không nhận ra. Theo nghiên cứu "Pain of Paying" (Cambridge University), việc "chia nhỏ nợ" làm giảm nỗi đau tâm lý, dẫn đến chi tiêu vượt khả năng [Đề bài, 6].

**Vấn đề 5.2 — "Analysis Paralysis" (Tê liệt quyết định đầu tư):**
Người trẻ nhận thức gửi tiết kiệm (5.0-5.5%/năm) không đủ bù lạm phát thực. Nhưng khi nhìn vào "ma trận" kênh đầu tư (vàng, chứng khoán, BĐS, crypto), họ bị "tê liệt" bởi nhiễu loạn thông tin từ MXH. Như đề bài chỉ ra: *"Phần lớn cá nhân rơi vào trạng thái hoang mang, tiến thoái lưỡng nan"*.

→ VietFi Advisor tích hợp giải quyết **CẢ HAI** vấn đề trong một nền tảng thống nhất.

### 1.3. Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

#### 1.3.1. Phương pháp 5 Whys — Truy vấn gốc rễ

**Chuỗi "Why" #1 — Tại sao Gen Z rơi vào "Bẫy nợ phân mảnh"?**

```
Why 1: Tại sao Gen Z mang nợ vượt khả năng chi trả?
  → Vì họ không nhận biết tổng dư nợ thực tế (phân mảnh qua 3-5 nền tảng).

Why 2: Tại sao không nhận biết tổng nợ?
  → Vì mỗi khoản nợ nằm trên 1 app riêng (SPayLater, thẻ tín dụng,
    MoMo, ZaloPay), không có 1 dashboard hợp nhất.

Why 3: Tại sao không có dashboard hợp nhất?
  → Vì chưa có hệ sinh thái Open Banking bắt buộc, và chưa có
    sản phẩm nào tập trung giải quyết bài toán này cho VN.

Why 4: Tại sao việc "chia nhỏ nợ" lại nguy hiểm?
  → Vì hiệu ứng "Pain of Paying" bị triệt tiêu: mỗi khoản nhỏ
    (500K-3M) không đủ gây cảm giác đau đớn tài chính → tiếp tục vay.

Why 5 (ROOT CAUSE): Tại sao người dùng không "cảm thấy đau"?
  → Vì thiếu (a) công cụ trực quan hóa tổng nợ, (b) cảnh báo
    Debt-to-Income ratio, (c) tính toán lãi ẩn tích lũy theo thời gian.
```

**→ VietFi giải quyết ROOT CAUSE #1 bằng: Quỹ Chi tiêu (quản lý ngân sách) + Quỹ Nợ (công cụ thoát nợ) + DTI Alert + Hidden Interest Calculator.**

**Chuỗi "Why" #2 — Tại sao Gen Z biết cần đầu tư nhưng không hành động?**

```
Why 1: Tại sao Gen Z biết cần đầu tư nhưng không hành động?
  → Vì họ không biết BẮT ĐẦU TỪ ĐÂU: thị trường nào? Mã nào? Thời điểm nào?
    Không có ai phân tích sâu từng thị trường (CK, vàng, BĐS, crypto)
    bằng tiếng Việt dễ hiểu cho người mới.

Why 2: Tại sao không có phân tích sâu cho từng thị trường?
  → Vì các nguồn hiện có (CafeF, F319, TikTok) chỉ cung cấp
    tin tức hoặc ý kiến cá nhân, KHÔNG có phân tích cơ hội cụ thể:
    "Thị trường đang ở trạng thái nào? Nên làm gì? Cơ hội ở đâu?"

Why 3: Tại sao không ai làm "cơ hội radar" cho người Việt?
  → Vì cần kết hợp nhiều loại dữ liệu: vĩ mô (GDP, CPI, lãi suất)
    + vi mô (giá CK, vàng, BĐS) + sentiment (MXH, tin tức)
    + bối cảnh cá nhân (thu nhập, nợ, mục tiêu).
    Không công cụ nào tổng hợp tất cả.

Why 4: Tại sao nỗi lo lớn nhất — nhà ở — không được giải quyết?
  → Vì Gen Z lo "không bao giờ mua được nhà" (giá BĐS tăng 8-15%/năm)
    nhưng không có công cụ giúp: (a) theo dõi giá BĐS theo khu vực,
    (b) tính khả năng mua (affordability), (c) so sánh mua vs thuê,
    (d) thông tin nhà ở xã hội, vay ưu đãi.

Why 5 (ROOT CAUSE): Tại sao không có công cụ tổng hợp?
  → Vì cần: (a) AI phân tích đa thị trường (CK + vàng + BĐS + crypto),
    (b) cơ hội radar dựa trên data thực, (c) nhà ở intelligence,
    (d) gợi ý hành động cụ thể theo bối cảnh từng user.
    Điều này chỉ khả thi với Multi-Agent AI + NLP tiếng Việt (Gemini 2.0+).
```

**→ VietFi giải quyết ROOT CAUSE #2 bằng: Market Deep-Dive (phân tích sâu per asset) + Opportunity Radar (nhận diện cơ hội) + Housing Intel (thông tin mua/thuê nhà) + Morning Brief AI + F&G Index VN.**

#### 1.3.2. Cây Vấn đề (Problem Tree)

```
                    [HỆ QUẢ — Impacts]
    ┌────────────────────┼──────────────────────┐
    │                    │                      │
 Nợ xấu tăng      Tài sản không      Bất bình đẳng
 Gen Z (2-5%       tăng trưởng        tài chính
 thu nhập)         (tiết kiệm         thế hệ
                   < lạm phát)
    │                    │                      │
    └────────────────────┼──────────────────────┘
                         │
           ┌─────────────┴─────────────┐
           │    VẤN ĐỀ CỐT LÕI:       │
           │ "Gen Z VN không có khả    │
           │  năng ra quyết định tài   │
           │  chính tối ưu"            │
           └─────────────┬─────────────┘
                         │
    ┌────────────┬───────┼───────┬────────────┐
    │            │       │       │            │
 Thiếu công  Nhiễu    Thiếu   "Pain of    Thiếu
 cụ hợp nhất thông    chỉ số  Paying"    advisor
 quản lý nợ  tin MXH  tâm lý  bị triệt   vừa túi
             (FOMO/   thị     tiêu bởi    tiền
              FUD)    trường  BNPL
    │            │    VN      │            │
    └────────────┴──────┬─────┴────────────┘
                        │
              [NGUYÊN NHÂN GỐC RỄ]
    ┌──────────────┬────┴────┬──────────────┐
    │              │         │              │
 Không có      Chưa có    Chưa có      Chi phí
 Open Banking  F&G Index  Personal     tư vấn TC
 bắt buộc     cho VN     CPI tool     quá cao
```

#### 1.3.3. Biểu đồ Xương cá (Fishbone/Ishikawa) — Tại sao Gen Z VN tê liệt tài chính?

```
  Con người (People)              Quy trình (Process)
  ─────────────────               ──────────────────
  • 76% thiếu kiến thức TC [2]    • Không có SOP quản lý TC cá nhân
  • Loss aversion 2.25x           • Nợ phân mảnh, không có quy trình
  • FOMO/FUD từ bạn bè              tổng hợp cross-platform
        \                               /
         \                             /
          ──────────────────────────────
         /  "GEN Z VN KHÔNG THỂ RA    \
        /    QUYẾT ĐỊNH TÀI CHÍNH     \
        \    TỐI ƯU"                   /
         \                             /
          ──────────────────────────────
         /                             \
        /                               \
  Công nghệ (Technology)         Thông tin (Information)
  ──────────────────────         ──────────────────────
  • Chưa có AI advisor           • CPI chính thức ≠ CPI cá nhân
    localized VN                 • Không có chỉ số tâm lý TT VN
  • BNPL dễ truy cập,           • Tin tức tài chính khó hiểu cho
    Debt Tool không tồn tại       người bình dân
```

**Kết luận RCA:** Mỗi tính năng của VietFi Advisor đều giải quyết **đúng 1 nguyên nhân gốc rễ** — không phải tính năng "thêm cho vui":

| Nguyên nhân gốc rễ               | Feature giải quyết                       | Cơ chế                                          |
| ------------------------------------ | ------------------------------------------ | ------------------------------------------------- |
| Nợ phân mảnh, không trực quan   | **Quỹ Nợ**                         | Hợp nhất nợ + DTI Alert + công cụ thoát nợ |
| Thiếu kiểm soát chi tiêu         | **Quỹ Chi tiêu**                   | Chia "hũ" ngân sách kiểu MoMo                 |
| "Pain of Paying" bị triệt tiêu    | **Hidden Interest Calculator**       | Tính lãi ẩn tích lũy, shock value            |
| Thiếu chỉ số tâm lý TT VN       | **F&G Index VN**                     | 5 indicators Việt hóa                           |
| Không biết đầu tư gì, ở đâu | **Phân Tích Thị Trường + Housing Intel** | Phân tích per asset + giá BĐS + mua vs thuê  |
| CPI chính thức không cá nhân    | **Personal CPI**                     | Laspeyres cá nhân hóa                          |
| Nhiễu thông tin MXH                | **Morning Brief AI**                 | AI tổng hợp, dễ hiểu                          |
| Loss aversion khi đầu tư          | **Risk DNA**                         | Prospect Theory-based                             |
| Chi phí advisor quá cao            | **Portfolio Advisor AI**             | Free, personalized                                |
| Thiếu kỷ luật ghi chép chi tiêu   | **Vẹt Vàng AI 🦜**                  | Habit loop "cho vẹt ăn" + XP gamification + roast |

---

## 2. MỤC TIÊU VÀ PHẠM VI

### 2.1. Mục tiêu tổng quát

Xây dựng nền tảng "Cố vấn tài chính ảo" sử dụng Multi-Agent AI Pipeline, giúp người dùng:

- **Quản lý chi tiêu thông minh & thoát nợ** (mapping Vấn đề 5.1)
- **Vượt qua nhiễu loạn thông tin, đưa ra quyết định phân bổ vốn** (mapping Vấn đề 5.2)
- **Hiểu rõ tác động lạm phát cá nhân** lên tài chính

### 2.2. Đối tượng sử dụng

**Primary:** Gen Z và Millennials Việt Nam (20-35 tuổi) — chiếm ~33% lực lượng lao động, 19+ triệu người [7]. Đặc biệt nhóm 85% đã tiết kiệm trước 22 tuổi nhưng 57% chỉ chọn kênh an toàn [3].

**Secondary:** Người đi làm thu nhập 8-30 triệu/tháng có nhiều khoản nợ tiêu dùng phân tán.

### 2.3. User Persona — "Ai đang tuyệt vọng cần sản phẩm này?"

**Persona #1 — Linh, 24 tuổi, nhân viên văn phòng (Primary)**

- Lương 12 triệu/tháng, chi tiêu 10 triệu, tiết kiệm 2 triệu
- Vừa mở tài khoản chứng khoán TCBS, nạp 5 triệu, chưa biết mua gì
- Scroll F319, TikTok thấy bạn bè "khoe lãi" nhưng không biết nên FOMO hay chờ
- Có 1 khoản SPayLater 3 triệu + thẻ tín dụng dư 5 triệu
- **Pain:** *"Tôi biết phải đầu tư nhưng không biết bắt đầu từ đâu, sợ mất tiền, không biết thị trường nào phù hợp, và cũng muốn mua được nhà nhưng không biết bao giờ mới đủ."*
- **VietFi giải quyết:** Quỹ Chi tiêu chia lương 12 triệu vào "lọ". Quỹ Nợ cho thấy tổng nợ 8 triệu (67% lương) → lộ trình thoát nợ. **Market Deep-Dive** phân tích sâu CK: "VN-Index đang ở vùng Fear — cơ hội DCA nhóm blue-chip". **Housing Intel** tính: "Với 2 triệu/tháng tiết kiệm, Linh cần 8 năm để đủ đặt cọc căn hộ nhà ở xã hội." **Vẹt Vàng** nhắc Linh ghi chi tiêu mỗi ngày, mổ khi vượt lọ: *"Lại Shopee hả? Tuần thứ 3 rồi đấy 🦜"*

**Persona #2 — Minh, 22 tuổi, sinh viên năm cuối UIT (Secondary)**

- Thu nhập part-time 5 triệu/tháng
- Chi 60% cho ăn uống + nhà trọ, cảm thấy "tiền mất đi đâu hết"
- Muốn tiết kiệm nhưng thấy lãi suất 5% "chẳng thấm tháp gì"
- **Pain:** *"Mọi thứ đắt lên, lương không tăng, tiền thuê trọ chiếm phân nửa thu nhập. Không biết bao giờ mới có nhà riêng."*
- **VietFi giải quyết:** Personal CPI cho thấy lạm phát thực của Minh ~4.0% (nhà ở 6.08%) > CPI chính thức. **Market Deep-Dive** gợi ý: "Với 1 triệu/tháng dư, DCA vàng hoặc quỹ chỉ số là phù hợp". **Housing Intel** cho Minh thấy: lộ trình tích lũy đặt cọc + chương trình nhà ở xã hội cho SV mới ra trường. **Vẹt Vàng** giúp Minh tạo thói quen ghi chi tiêu mỗi bữa: *"Trưa rồi, ăn gì khai báo đi. Đừng bắt tao đợi 🦜"* — XP tích lũy, level up Vẹt.

### 2.3.1. Phân tích Jobs-to-be-Done (JTBD)

Thay vì chỉ mô tả "pain point", JTBD framework (Clayton Christensen, Harvard Business School) [17] giúp hiểu **công việc** mà người dùng đang "thuê" sản phẩm để hoàn thành:

| Job Type                                                   | Persona #1 — Linh (Nhân viên)                                              | Persona #2 — Minh (Sinh viên)                                            |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Functional Job** ("Giúp tôi...")                 | Biết thị trường CK đang ở trạng thái nào, cơ hội ở đâu, mua gì | Biết tiền mất đi đâu, nên đầu tư kênh nào với 1 triệu/tháng |
| **Emotional Job** ("Giúp tôi cảm thấy...")       | Tự tin vì có dữ liệu phân tích sâu, không còn FOMO/FUD              | An tâm rằng "mình đang đi đúng hướng", có lộ trình mua nhà    |
| **Social Job** ("Giúp tôi được nhìn nhận...") | Là người đầu tư có căn cứ, không đánh bạc                        | Là SV biết lập kế hoạch tài chính dài hạn                         |
| **Housing Job** ("Giúp tôi biết...")              | Bao giờ mua được nhà? Khu vực nào hợp túi?                           | Nhà ở XH cho SV mới ra trường? Vay ưu đãi?                         |
| **Habit Job** ("Giúp tôi tạo thói quen...")       | Ghi chi tiêu đều đặn, không quên, có motivation                      | Ghi chi tiêu như chơi game, có phần thưởng + social pressure          |
| **VietFi Feature**                                   | Market Deep-Dive + Housing Intel + F&G + Portfolio + Vẹt Vàng         | Quỹ Chi tiêu + Personal CPI + Housing Intel + Vẹt Vàng               |

**Trigger Event (Khi nào "thuê" VietFi):**

- Linh: Sáng mở MXH thấy bạn khoe lãi CK → mở VietFi xem **Market Deep-Dive**: "VN-Index vùng Fear, cơ hội DCA" thay vì scroll F319
- Minh: Cuối tháng hết tiền → mở VietFi xem Quỹ Chi tiêu + **Housing Intel** để biết lộ trình mua nhà

**Switch trigger:** VietFi được "thuê" khi user chuyển từ "hỏi bạn bè/MXH" sang "phân tích sâu với AI" — đòn bẩy chuyển đổi là **độ sâu phân tích** (Market Deep-Dive + Housing Intel + Personal CPI + Risk DNA đều unique cho mỗi user).

### 2.4. Phạm vi sản phẩm

| Module                          | Mapping đề bài | Killer Feature?                             |
| ------------------------------- | ----------------- | ------------------------------------------- |
| **Fear & Greed Index VN** | Vấn đề 5.2     | ⭐ Chỉ số đầu tiên cho TT Việt Nam    |
| **Morning Brief AI**      | Vấn đề 5.2     | ⭐ Habit loop hàng ngày                   |
| **Risk DNA Profile**      | Vấn đề 5.2     | ⭐ Viral loop (MBTI for Finance)            |
| **Quỹ Chi tiêu**        | Vấn đề 5.1     | ⭐ Chia "hũ" ngân sách thông minh       |
| **Quỹ Nợ**              | Vấn đề 5.1     | ⭐ Công cụ thoát nợ, Snowball/Avalanche |
| **Market Deep-Dive**      | Vấn đề 5.2     | ⭐ Phân tích sâu per asset class         |
| **Housing Intel**         | Vấn đề 5.2     | ⭐ Giá BĐS, khả năng mua, mua vs thuê  |
| **Vẹt Vàng AI 🦜**       | Vấn đề 5.1+5.2 | ⭐ Mascot viral + habit engine + gamification |
| Personal CPI Calculator         | Vấn đề 5.2     | Core                                        |
| Portfolio Advisor               | Vấn đề 5.2     | Core                                        |
| Macro Map                       | Vấn đề 5.2     | Core                                        |
| AI News Curation                | Vấn đề 5.2     | Core                                        |

---

## 3. CƠ SỞ LÝ THUYẾT

### 3.1. Fear & Greed Index — Phương pháp luận

CNN's Fear & Greed Index [8] đo tâm lý thị trường Mỹ qua 7 indicators: VIX, Put/Call Ratio, Stock Price Breadth, Junk Bond Demand, Market Momentum, Safe Haven Demand, Stock Price Strength. VietFi Advisor Việt hóa concept này bằng **5 indicators phù hợp thị trường VN**:

| # | Indicator bản VN                  | Tương đương CNN | Nguồn dữ liệu       | Trọng số |
| - | ---------------------------------- | -------------------- | ---------------------- | ---------- |
| 1 | VN-Index Momentum (20D vs 125D MA) | Market Momentum      | SSI API, Fireant       | 25%        |
| 2 | Khối ngoại mua/bán ròng        | Safe Haven Demand    | CafeF, HoSE            | 20%        |
| 3 | Sentiment tin tức (NLP)           | — (new)             | VnExpress, CafeF, F319 | 25%        |
| 4 | Tỷ lệ mã tăng/giảm (Breadth)  | Stock Price Breadth  | HoSE data              | 15%        |
| 5 | Spread TPCP vs tiết kiệm         | Junk Bond Demand     | NHNN, SBV              | 15%        |

**Công thức tổng hợp:**

```
F&G_VN = Σ(wᵢ × normalize(indicatorᵢ, 0, 100))
```

Mỗi indicator được normalize về thang 0-100 (0 = Extreme Fear, 100 = Extreme Greed), sau đó weighted average theo trọng số. Phương pháp normalize sử dụng Z-score chuẩn hóa với lookback 252 ngày giao dịch (1 năm).

### 3.2. Personal CPI — Phương pháp Laspeyres cá nhân hóa

CPI chính thức tại Việt Nam sử dụng rổ hàng hóa cố định (phương pháp Laspeyres [9]) với trọng số từ GSO dựa trên chi tiêu bình quân hộ gia đình. **Vấn đề**: trọng số này không phản ánh cơ cấu chi tiêu cá nhân.

**Công thức Personal CPI:**

```
PersonalCPI = Σ(wᵢ_user × CPIᵢ_category)
```

Trong đó:

- `wᵢ_user` = Chi tiêu danh mục i / Tổng chi tiêu (của user)
- `CPIᵢ_category` = Tốc độ tăng giá danh mục i (từ GSO)

**7 danh mục (CPI tăng giá theo ngành, GSO 2025 [1]):** Ăn uống (3.27%), Nhà ở & điện nước (6.08%), Đi lại (-2.14%), Giáo dục (2.15%), Y tế (13.07%), Giải trí (2.3%), Khác (3.0%).

**Ý nghĩa**: Một sinh viên chi 50% cho ăn uống + 25% nhà trọ có Personal CPI ≈ 3.17%, gần CPI chính thức. Nhưng nếu chi nhiều y tế (gia đình có người bệnh) thì Personal CPI có thể lên 7-8%, gấp đôi. Điểm mấu chốt: **mỗi người có CPI khác nhau**, VietFi giúp user thấy con số THỰC của mình.

### 3.3. Risk DNA — Behavioral Finance Framework

VietFi áp dụng **Prospect Theory** (Kahneman & Tversky, 1979) [10] — nghiên cứu chứng minh con người đánh giá rủi ro bất đối xứng: đau đớn mất $100 gấp ~2.25 lần hạnh phúc được $100 (Tversky & Kahneman, 1992). Thay vì bài test rủi ro truyền thống (hỏi "bạn chấp nhận rủi ro bao nhiêu %?"), VietFi dùng **5 câu hỏi tình huống thực** buộc user ra quyết định trong context cảm xúc:

- **Loss Aversion**: "Nếu mất 20% vốn, bạn cảm thấy thế nào?"
- **Time Preference**: "Bạn chờ lợi nhuận bao lâu?"
- **Endowment Effect**: "Phản ứng khi thị trường giảm 15%?"

Đây là phương pháp được Vanguard, Betterment (robo-advisors hàng đầu thế giới) sử dụng [11].

### 3.4. Multi-Agent AI Architecture — Lý thuyết chia để trị

Kiến trúc Multi-Agent dựa trên nghiên cứu "LLM Multi-Agent Systems" (Stanford HAI, 2024) [12]: thay vì 1 LLM xử lý tất cả, chia thành nhiều agents chuyên biệt giúp:

- Giảm hallucination (mỗi agent chỉ tập trung 1 domain)
- Tăng độ chính xác output
- Dễ debug và improve từng agent

Dự án tham khảo: TradingGoose (GitHub, 36 stars) — open-source Multi-Agent LLM Trading Framework [13].

### 3.5. Debt Snowball vs Avalanche — Phương pháp thoát nợ

Quỹ Nợ của VietFi sử dụng 2 phương pháp trả nợ được nghiên cứu bởi Dave Ramsey [14]:

- **Snowball**: Trả khoản nhỏ nhất trước → tạo momentum tâm lý
- **Avalanche**: Trả khoản lãi cao nhất trước → tối ưu tài chính

VietFi AI sẽ tính toán và so sánh cả 2 kịch bản, cho user chọn.

---

## 4. GIẢI PHÁP ĐỀ XUẤT — VIETFI ADVISOR

### 4.1. Tổng quan — Triết lý "3 Bước Tự Do Tài Chính"

VietFi Advisor được thiết kế quanh **3 bước** phản ánh hành trình tài chính cá nhân:

| Bước                                                                                    | Triết lý                                                                           | Features                                                                 | Tần suất     |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | -------------- |
| 🟢**Bước 1: Quản lý chi tiêu** — "Tiền đi đâu hết?"                      | Muốn thoát nợ & đầu tư, phải kiểm soát chi tiêu trước                    | Quỹ Chi tiêu (chia "hũ"), Personal CPI                                | Hàng ngày    |
| 🔴**Bước 2: Thoát nợ** — "Thoát bẫy nợ bằng cách nào?"                   | Tổng hợp mọi khoản nợ, tính lãi ẩn, lộ trình trả nợ tối ưu             | Quỹ Nợ (Snowball/Avalanche), DTI Alert                                 | Khi có nợ    |
| 🔵**Bước 3: Đầu tư thông minh** — "Đầu tư kênh nào? Cơ hội ở đâu?" | Phân tích sâu per asset class, nhận diện cơ hội, giải quyết nỗi lo nhà ở | **Phân Tích Thị Trường**, Housing Intel, Risk DNA, Portfolio Advisor, F&G, Brief | Khi sẵn sàng |

**Bước 1 — Quỹ Chi tiêu** (mapping Vấn đề 5.1): User chia thu nhập vào các "hũ" (ăn uống, nhà ở, giải trí, tiết kiệm...) như MoMo. Personal CPI cho thấy lạm phát thực tác động đến từng hũ.

**Bước 2 — Quỹ Nợ** (mapping Vấn đề 5.1): Tổng hợp nợ tín dụng, vay mua nhà, nợ bạn bè, tín dụng đen — tính lãi suất thực tế, so sánh Snowball vs Avalanche, lộ trình thoát nợ.

**Bước 3 — Đầu tư thông minh** (mapping Vấn đề 5.2): Không chỉ F&G + Brief, mà **Phân Tích Thị Trường** phân tích sâu từng thị trường (CK, vàng, crypto, BĐS) — trạng thái hiện tại, cơ hội, nên làm gì. **Housing Intel** giải quyết nỗi lo lớn nhất: mua nhà.

Cả 3 bước được vận hành bởi **Multi-Agent AI Pipeline** — 6 agents chuyên biệt xử lý song song.

### 4.2. Multi-Agent AI Pipeline (6 Agents)

```
┌────────────┐    ┌──────────────────┐    ┌────────────────────┐
│ Data       │    │ Agent 1          │    │ Agent 2            │
│ Sources    │───►│ News Collector   │───►│ Sentiment Analyzer │
│ (8+ nguồn) │    │ Scrape & classify│    │ → F&G Index VN     │
└────────────┘    └──────────────────┘    └─────────┬──────────┘
                                                    │
┌────────────┐    ┌──────────────────┐    ┌─────────▼──────────┐
│ User       │    │ Agent 5          │    │ Agent 4            │
│ Profile +  │───►│ Portfolio Advisor │◄──│ Research Synthesizer│
│ Risk DNA   │    │ + Quỹ Nợ Advisor │    │ → Morning Brief    │
└────────────┘    └──────────────────┘    └─────────▲──────────┘
                                                    │
┌──────────────────┐    ┌──────────────────┐    │
│ Agent 3          │    │ Agent 6          │────┘
│ Macro Analyst    │───►│ Market & Housing │
│ GDP,CPI,FX,Rates │    │ Analyst (Deep)   │
└──────────────────┘    └──────────────────┘
```

**Agent 1 — News Collector**: Scrape từ VnExpress (RSS), CafeF, NHNN, Fireant, GSO, BĐS data. Phân loại theo asset class. Tần suất: 1-4 giờ.

**Agent 2 — Sentiment Analyzer**: Input → tin tức + forum. Output → Fear & Greed Index VN (5 indicators, weighted score 0-100).

**Agent 3 — Macro Analyst**: Thu thập GDP, CPI, lãi suất, tỷ giá. Tính Personal CPI. Xác định xu hướng vĩ mô.

**Agent 4 — Research Synthesizer**: Tổng hợp output Agent 1+2+3+6. Tạo Morning Brief tiếng Việt dễ hiểu.

**Agent 5 — Portfolio Advisor + Quỹ Nợ Advisor**: Kết hợp Risk DNA + context vĩ mô → gợi ý phân bổ vốn. Tính toán lộ trình thoát nợ (Snowball/Avalanche).

**Agent 6 — Market & Housing Analyst** (MỚI): Phân tích sâu per asset class (CK: VN-Index + mã hot; Vàng: SJC + thế giới; BĐS: giá theo khu vực + nhà ở XH; Crypto: BTC + top altcoins). Output: trạng thái thị trường + cơ hội + hành động gợi ý. Housing Intel: affordability calculator, mua vs thuê, chương trình vay ưu đãi.

### 4.3. Điểm độc đáo (USP)

1. **Fear & Greed Index bản Việt** — Chỉ số đo tâm lý thị trường VN đầu tiên. 5 indicators Việt hóa, cập nhật daily.
2. **Market Deep-Dive** — Phân tích sâu per asset class (CK, vàng, BĐS, crypto): trạng thái hiện tại, cơ hội, hành động gợi ý. Không app nào tại VN làm được vì cần AI đa nguồn.
3. **Housing Intel** — Giải quyết nỗi lo lớn nhất của Gen Z: mua nhà. Giá BĐS per khu vực, affordability calculator, mua vs thuê, nhà ở xã hội.
4. **Personal CPI Calculator** — Tính lạm phát CÁ NHÂN. Concept mới, no competitor tại VN.
5. **Risk DNA (Behavioral)** — Prospect Theory-based, thay bài test lý thuyết bằng tình huống thực.
6. **Quỹ Chi tiêu + Quỹ Nợ** — Chia "hũ" ngân sách kiểu MoMo + Công cụ thoát nợ đa dạng.
7. **Morning Brief tiếng Việt** — Bloomberg-style nhưng dễ hiểu, cho người Việt bình dân.
8. **Vẹt Vàng AI 🦜** — Mascot roast chi tiêu bằng giọng văn xéo sắc Việt (Cleo + Duolingo style). 3 chế độ: Mổ/Khen/Thâm. Shareable roast cards. Tiềm năng viral cực cao.

---

## 5. KIẾN TRÚC HỆ THỐNG

### 5.1. Tech Stack (Đã kiểm chứng kỹ thuật)

| Layer                | Công nghệ                                | Free?           | Đã test?  | Lý do chọn                       |
| -------------------- | ------------------------------------------ | --------------- | ----------- | ---------------------------------- |
| Frontend             | Next.js 16 (React, TypeScript, App Router) | ✅              | ✅ Build OK | SSR/SSG hybrid + API routes        |
| Styling              | TailwindCSS + Framer Motion                | ✅              | ✅          | Dark theme premium, animations     |
| Charts               | Recharts (responsive)                      | ✅              | ✅          | Pie, Area, Line, Bar charts        |
| Auth + DB            | Supabase (PostgreSQL, GoTrue)              | ✅ Free tier    | ⬜          | Row Level Security, 50K auth users |
| AI/LLM               | Gemini API (gemini-2.0-flash)              | ✅ 1500 req/day | ⬜          | Vietnamese NLP sentiment           |
| **Stock Data** | **vnstock v3.5** (PyPI, wrap TCBS)   | ✅ FREE         | ✅ 20/20 OK | 1545 mã, M1→Monthly, VNINDEX     |
| **Macro Data** | **World Bank API**                   | ✅ No auth      | ✅          | GDP, CPI, Inflation VN (JSON)      |
| **News**       | **VnExpress RSS** (XML feed)         | ✅ Public       | ✅          | Tin tài chính, ~30 phút delay   |
| **FX/Crypto**  | vnstock FX + Crypto (MSN source)           | ✅              | ✅          | USD/VND, BTC, Vàng                |
| Deploy               | Vercel (Edge Network)                      | ✅ Hobby        | ✅          | CDN global, auto-deploy            |

### 5.2. Data Pipeline thực tế (Batch Processing)

Thay vì gọi API realtime liên tục, VietFi sử dụng **batch processing** — thu thập data vào thời điểm cố định, xử lý AI, lưu DB:

```
┌──────────────── BATCH JOBS (node-cron) ────────────────┐
│                                                         │
│  [15:30] Sau đóng cửa sàn                               │
│    vnstock → VN-Index OHLC 125 ngày (tính MA)          │
│    vnstock → VN30 daily prices (tính Breadth)          │
│    vnstock → Foreign flow (khối ngoại ròng)            │
│    vnstock → FX, Gold, BTC giá daily                   │
│    → Lưu Supabase                                       │
│                                                         │
│  [15:45] Tính F&G Index VN                              │
│    5 indicators → weighted average → Score 0-100       │
│    → Lưu fng_daily table                                │
│                                                         │
│  [06:00] Morning Brief                                  │
│    VnExpress RSS → 20 headlines mới nhất               │
│    Gemini: sentiment scoring (-1 → +1)                 │
│    Gemini: tổng hợp → Morning Brief tiếng Việt         │
│    → Lưu briefs table                                   │
│                                                         │
│  [Monthly] Macro Update                                 │
│    World Bank API → GDP, CPI, FDI Vietnam              │
│    → Lưu macro table                                    │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────▼───────────┐
        │   SUPABASE (PostgreSQL)│
        │   + Auth + RLS         │
        └───────────┬───────────┘
                    │
        ┌───────────▼───────────┐
        │  NEXT.JS (Frontend)    │
        │  Dashboard → read DB  │
        │  API Routes → serve   │
        │  Vercel Edge CDN      │
        └───────────────────────┘
```

**Tổng API calls/ngày: ~35 calls** (vnstock 30 + RSS 1 + Gemini 2 + World Bank 1/tháng) → Free tier dư sức.

### 5.3. Kiến trúc tổng thể

```
┌───────────────── CDN (Vercel Edge) ─────────────────┐
│                                                      │
│   ┌──────────────── CLIENT ─────────────────┐       │
│   │  Next.js App Router (SSR + CSR hybrid)  │       │
│   │  ┌─────────┐ ┌──────────┐ ┌──────────┐ │       │
│   │  │Landing  │ │Dashboard │ │Auth Flow │ │       │
│   │  │(SSG)    │ │(SSR+CSR) │ │(Supabase)│ │       │
│   │  └─────────┘ └──────────┘ └──────────┘ │       │
│   └────────────────┬────────────────────────┘       │
│                    │ HTTPS                           │
│   ┌────────────────▼────────────────────────┐       │
│   │        SERVER (Next.js API Routes)       │       │
│   │  ┌──────────┐ ┌───────────┐ ┌─────────┐│       │
│   │  │Cron Jobs │ │Gemini API │ │ISR Cache││       │
│   │  │(vnstock) │ │(NLP+Brief)│ │         ││       │
│   │  └────┬─────┘ └─────┬─────┘ └─────────┘│       │
│   └───────┼──────────────┼──────────────────┘       │
└───────────┼──────────────┼──────────────────────────┘
            │              │
  ┌─────────▼────┐  ┌──────▼─────┐  ┌─────────────┐
  │vnstock (TCBS)│  │Gemini API  │  │Supabase     │
  │VnExpress RSS │  │2.0 Flash   │  │PostgreSQL   │
  │World Bank API│  │            │  │+ Auth + RLS │
  └──────────────┘  └────────────┘  └─────────────┘
```

---

## 6. YÊU CẦU CHỨC NĂNG VÀ PHI CHỨC NĂNG

### 6.1. Yêu cầu chức năng (Functional Requirements)

| ID   | Module         | Chức năng                               | CRUD          | Mô tả                                         |
| ---- | -------------- | ----------------------------------------- | ------------- | ----------------------------------------------- |
| FR01 | Auth           | Đăng ký tài khoản                    | **C**   | Email + Google OAuth via Supabase               |
| FR02 | Auth           | Đăng nhập / Đăng xuất               | **R**   | JWT session management                          |
| FR03 | Profile        | Tạo/cập nhật hồ sơ tài chính       | **C/U** | Thu nhập, chi tiêu, mục tiêu                |
| FR04 | Profile        | Xem hồ sơ                               | **R**   | Tổng quan tài chính cá nhân                |
| FR05 | Risk DNA       | Hoàn thành assessment                   | **C**   | 5 câu hỏi tình huống                        |
| FR06 | Risk DNA       | Xem/làm lại kết quả                   | **R/U** | Profile + traits + AI advice                    |
| FR07 | Quỹ Chi tiêu | Chia thu nhập vào các "hũ"            | **C**   | Ăn uống, nhà ở, giải trí, tiết kiệm...  |
| FR08 | Quỹ Chi tiêu | Xem tổng quan chi tiêu                  | **R**   | Pie chart, so với ngân sách                  |
| FR09 | Quỹ Nợ       | Thêm khoản nợ                          | **C**   | Tín dụng, vay nhà, bạn bè, tín dụng đen |
| FR10 | Quỹ Nợ       | Xem dashboard nợ + lộ trình thoát nợ | **R**   | Pie chart, DTI, Snowball/Avalanche              |
| FR11 | Quỹ Nợ       | Cập nhật/xóa khoản nợ                | **U/D** | Khi thanh toán xong                            |
| FR12 | News           | Xem tin tức AI-curated                   | **R**   | Feed + sentiment tags                           |
| FR13 | News           | Bookmark tin tức                         | **C/D** | Lưu/bỏ lưu tin quan trọng                   |
| FR14 | Sentiment      | Xem F&G Index VN                          | **R**   | Gauge + 7-day history                           |
| FR15 | Macro          | Xem bản đồ vĩ mô                     | **R**   | 6 indicators + 3 charts                         |
| FR16 | Portfolio      | Nhập vốn + nhận gợi ý                | **C/R** | Pie chart + projection                          |
| FR17 | CPI            | Nhập chi tiêu → Personal CPI           | **C/R** | So sánh vs CPI chính thức                    |
| FR18 | Brief          | Xem Morning Brief                         | **R**   | AI tóm tắt hàng ngày                        |
| FR19 | Market         | Xem Phân Tích Thị Trường per asset         | **R**   | Trạng thái + cơ hội + hành động gợi ý  |
| FR20 | Market         | Xem Cơ hội Radar                        | **R**   | AI nhận diện cơ hội dựa trên data         |
| FR21 | Housing        | Tính Affordability                       | **R**   | Thu nhập + tiết kiệm → thời gian mua nhà  |
| FR22 | Housing        | So sánh Mua vs Thuê                     | **R**   | Breakeven analysis + lộ trình                 |
| FR23 | Vẹt Vàng      | Ghi chi tiêu hàng ngày ("cho vẹt ăn")  | **C**   | Habit loop + push notification 4 khung giờ    |
| FR24 | Vẹt Vàng      | XP & Level system                        | **R/U** | Kiếm XP, level up Vẹt Con → Vẹt Teen → Vẹt Phố → Vẹt Nhà Giàu |
| FR25 | Vẹt Vàng      | Roast/Khen/Thâm mode                    | **R**   | AI chọn chế độ dựa trên hành vi chi tiêu     |
| FR26 | Vẹt Vàng      | Shareable roast card                     | **C/R** | 1-tap tạo card share MXH                      |
| FR27 | Vẹt Vàng      | Streak tracking                          | **R/U** | Liên tiếp ghi chi tiêu = streak, bỏ = vẹt giận |

### 6.2. Yêu cầu phi chức năng (Non-functional Requirements)

| ID    | Yêu cầu                   | Chỉ số          | Target                                |
| ----- | --------------------------- | ----------------- | ------------------------------------- |
| NFR01 | Thời gian tải trang (LCP) | Lighthouse        | < 2.5s                                |
| NFR02 | Responsive design           | Breakpoints       | Mobile 375px → Desktop 1920px        |
| NFR03 | Bảo mật dữ liệu         | Supabase RLS      | Row-level, user chỉ thấy data mình |
| NFR04 | Uptime                      | Vercel SLA        | 99.9%                                 |
| NFR05 | API response time           | Gemini            | < 3s cho Morning Brief                |
| NFR06 | Cross-browser               | Compatibility     | Chrome, Firefox, Safari, Edge         |
| NFR07 | Accessibility               | WCAG 2.1 AA       | Contrast ratio 4.5:1+                 |
| NFR08 | Scalability                 | Vercel serverless | Auto-scale theo traffic               |

---

## 7. CÁC TÍNH NĂNG CHI TIẾT

### 7.1. Landing Page (Public — SSG)

- Hero section: headline + CTA + animated gradient
- 3 tính năng cốt lõi (Quỹ Chi tiêu, Quỹ Nợ, **Phân Tích Thị Trường**) — mỗi card có sub-feature tích hợp
- Pipeline diagram (6 agents visualization)
- Getting Started (3 bước: Đăng ký → Profile → Dashboard)
- Risk Disclaimer (⚠️ cảnh báo rủi ro)

### 7.2. Dashboard Overview

- **4 Metric Cards**: VN-Index, Vàng SJC, USD/VND, BTC (auto-refresh)
- **Morning Brief**: AI nhận định hàng ngày, 4 key takeaways per asset
- **Sentiment Gauge**: F&G Index VN mini (link chi tiết)
- **Portfolio Suggestion**: Pie chart phân bổ gợi ý
- **News Feed**: 4 tin mới nhất, sentiment tag, source label

### 7.3. Quỹ Chi tiêu (/dashboard/budget) — **MỚI, "hũ" ngân sách kiểu MoMo**

- **Chia "hũ"**: User nhập thu nhập → chia vào các hũ (ăn uống, nhà ở, đi lại, giải trí, tiết kiệm, đầu tư)
- **Theo dõi chi tiêu**: Nhập chi tiêu hàng ngày, pie chart so với ngân sách
- **Cảnh báo**: Khi vượt hũ → thông báo + AI gợi ý điều chỉnh
- **Kết nối Personal CPI**: Cho thấy lạm phát ảnh hưởng đến từng hũ như thế nào

### 7.4. Quỹ Nợ (/dashboard/debt) — **Công cụ Thoát Nợ, mapping Vấn đề 5.1**

- **CRUD khoản nợ**: Thêm/sửa/xóa đa dạng loại nợ (tín dụng, vay mua nhà xã hội, nợ bạn bè, tín dụng đen, nợ xây nhà)
- **Tổng quan nợ**: Pie chart (tỷ trọng nợ), tổng nợ, tổng lãi phải trả
- **Debt-to-Income ratio**: Cảnh báo khi > 40% (ngưỡng nguy hiểm)
- **Lộ trình Thoát Nợ AI**: Snowball vs Avalanche, so sánh timeline + tổng lãi
- **Lãi suất thực tế**: Tính bao gồm phí ẩn (POS fee, late fee, service charge, lãi tín dụng đen)

### 7.5. Fear & Greed Index VN (/dashboard/sentiment)

- Gauge chart 0-100 với 5 zones + color coding
- 7-day history bar chart
- Per-asset sentiment: 5 cards (CK, Vàng, Crypto, BĐS, Tiết kiệm)
- Methodology: 5 indicators với trọng số transparent

### 7.6. Macro Map (/dashboard/macro)

- 6 Indicator Cards: GDP, CPI YoY, Lãi suất 12T, USD/VND, FDI, Xuất khẩu
- 3 Interactive Charts: CPI trend (Area), Interest Rate (Line), FX (Area)
- AI Macro Commentary: Nhận định tác động per asset class

### 7.7. Portfolio Advisor (/dashboard/portfolio)

- Input: Tổng vốn (VNĐ) + Profile rủi ro
- Pie Chart: % phân bổ (Tiết kiệm / Vàng / CK / Crypto / BĐS-REIT)
- Bar Chart: Dự phóng tài sản 1-10 năm (3 scenarios)
- AI Insight: Lời khuyên dựa trên macro context + sentiment hiện tại

### 7.8. Personal CPI Calculator (/dashboard/personal-cpi)

- Input: Chi tiêu 7 danh mục (số tiền VNĐ/tháng)
- Output: Personal CPI% vs CPI chính thức (3.31%)
- Breakdown bar chart per category (color-coded by severity)
- AI Insight: Tính sức mua giảm sau 5 năm, so sánh lãi suất tiết kiệm

### 7.9. Risk DNA Profile (/dashboard/risk-profile)

- 5 câu hỏi tình huống (Behavioral Finance, Prospect Theory-based)
- 3 Profiles: Bảo thủ 🛡️ / Cân bằng ⚖️ / Tăng trưởng 🚀
- Score 5-15, visual progress bar, personality traits
- AI advice liên kết với Portfolio Advisor

### 7.10. AI News Feed (/dashboard/news)

- News feed từ 8+ nguồn VN (VnExpress, CafeF, NHNN, Fireant, CoinDesk VN, Batdongsan.com.vn)
- AI auto-tag: Bullish (🟢) / Bearish (🔴) / Neutral (⚪)
- Filter by asset class, Bookmark/Save functionality

### 7.11. Market Deep-Dive (/dashboard/market) — **MỚI, phân tích sâu per asset**

- **4 Asset Cards**: Chứng khoán (VN-Index + top mã), Vàng (SJC + thế giới), BĐS (giá per khu vực), Crypto (BTC + altcoins)
- **Trạng thái thị trường**: Fear/Neutral/Greed per asset (từ Agent 2 + Agent 6)
- **Cơ hội Radar**: AI nhận diện cơ hội dựa trên data (ví dụ: "VN-Index vùng Fear + P/E thấp = cơ hội DCA")
- **Hành động gợi ý**: "Nên làm gì?" — AI tư vấn dựa trên Risk DNA + context vĩ mô + tài chính cá nhân
- **Biểu đồ trend**: Price chart + volume + so với benchmark

### 7.12. Housing Intel (/dashboard/housing) — **MỚI, giải nỗi lo nhà ở**

- **Giá BĐS per khu vực**: Trung bình giá căn hộ/nhà phố theo quận/huyện (HCM, Hà Nội, Đà Nẵng)
- **Affordability Calculator**: Nhập thu nhập + tiết kiệm → "Bạn cần X năm để đủ đặt cọc căn hộ khu vực Y"
- **Mua vs Thuê**: So sánh chi phí mua (vay + lãi) vs thuê dài hạn (breakeven analysis)
- **Nhà ở xã hội**: Dữ liệu dự án đang mở bán + điều kiện + vay ưu đãi
- **Lộ trình mua nhà**: AI tính: "Với tiết kiệm X/tháng + đầu tư Y%, bạn có thể mua nhà sau Z năm"

### 7.13. Vẹt Vàng AI 🦜 — **Mascot Thương Hiệu + Habit Engine + Viral Machine**

> **VietFi** bỏ chữ "i" = **VetFi** = **Vẹt Fi**(nance) 🦜💰
> Mascot không chỉ là feature — mascot LÀ thương hiệu. Giống như **Cú Xanh = Duolingo**, **Vẹt Vàng = VietFi**.

Lấy cảm hứng từ **Cleo Roast Mode** (UK) + **Duolingo Owl** (US), Vẹt Vàng là mascot AI có **giọng choe choé, xéo sắc kiểu Hà Nội** — vừa mắng vừa thương, vừa nhắc vừa dỗ.

#### 7.13.1. Tính cách Vẹt Vàng

- **Giọng**: Choe choé, xéo sắc, hay than, dramatize mọi thứ
- **Xưng hô**: "Tao" - "Mày" (có thể chuyển "Tớ" - "Cậu" nếu user muốn nhẹ hơn)
- **Đặc điểm**: Hay kể khổ, mỉa mai tinh tế, dùng thành ngữ/tục ngữ VN
- **Vũ khí chính**: Guilt-tripping + dark humor + reverse psychology

#### 7.13.2. Habit Loop — "Cho Vẹt Ăn" = Ghi Chi Tiêu

Cơ chế **"nuôi vẹt"**: user ghi chi tiêu hàng ngày = cho vẹt ăn. Không ghi = vẹt đói.

```
[Sáng 8:00] → Vẹt: "Ê mày ơi, hôm qua mày ăn gì mà chưa khai báo?
              Tao đói lắm rồi đây này! 🦜😤"
→ [User mở app, ghi chi tiêu hôm qua]
→ Vẹt: "Ờ được rồi, 45K phở + 30K trà sữa... Lại trà sữa hả? 
        Thôi kệ, ít ra mày còn nhớ tao. +15 XP 🦜"
```

**Khung giờ nhắc nhở (Daily Tracking):**

| Giờ  | Vẹt nói gì                                                                                  | Mục đích        |
| ----- | ---------------------------------------------------------------------------------------------- | ------------------ |
| 7:00  | *"Dậy chưa? Hôm nay budget còn X đồng. Đừng phá hoại nha 🦜"*                      | Morning reminder   |
| 12:00 | *"Trưa rồi, ăn gì khai báo đi. Đừng bắt tao đợi 🦜"*                              | Midday expense log |
| 18:00 | *"Chiều rồi, mày tiêu bao nhiêu hôm nay? Nhanh khai báo 🦜"*                          | Evening summary    |
| 22:00 | *"Cuối ngày rồi. Hôm nay mày [tiết kiệm/phá hoại] được X đồng. [Khen/Mổ] 🦜"* | Daily recap        |

#### 7.13.3. XP & Gamification — Level Up Vẹt

**Cách kiếm XP:**

| Hành động                   | XP      | Bonus                           |
| ------------------------------ | ------- | ------------------------------- |
| Ghi chi tiêu hàng ngày      | +10 XP  | +5 nếu ghi trước 10:00 sáng |
| Chụp ảnh hóa đơn (OCR)    | +20 XP  | AI tự nhập chi tiêu từ ảnh |
| Tiết kiệm đạt target tuần | +50 XP  | Vẹt mặc outfit mới 🎩        |
| Streak 7 ngày liên tiếp     | +100 XP | Unlock "Vẹt Vàng Bling" skin  |
| Trả nợ đúng hạn           | +30 XP  | Vẹt "nhảy múa" celebration   |
| Share achievement lên MXH     | +15 XP  | Bạn bè click = +5 XP bonus    |

**Level System:**

| Level | Tên                      | XP cần | Vẹt trông như thế nào                                  |
| ----- | ------------------------- | ------- | ----------------------------------------------------------- |
| 1     | 🐣 Vẹt Con               | 0       | Vẹt nhỏ xíu, lông xơ xác, hay khóc                   |
| 2     | 🦜 Vẹt Teen              | 500     | Vẹt có lông vàng, bắt đầu nói xéo sắc             |
| 3     | 🦜✨ Vẹt Trưởng Thành | 2,000   | Lông vàng óng, đeo kính mát, chửi hay hơn           |
| 4     | 👑 Vẹt Đại Gia         | 5,000   | Lông vàng kim, đeo chain vàng, ngồi trên đống tiền |
| 5     | 🔥 Vẹt Phượng Hoàng   | 10,000  | Form cuối: cánh lửa, vương miện, "Tự Do Tài Chính" |

#### 7.13.4. Social Sharing — Truyền miệng qua Vẹt

**Shareable Content (1-tap share):**

- **Daily Roast Card**: Screenshot câu chửi hay nhất → share TikTok/Zalo
- **Streak Badge**: "Tôi nuôi Vẹt Vàng 30 ngày liên tiếp 🦜🔥"
- **Level Up Card**: "Vẹt của tôi vừa lên level Đại Gia 👑"
- **Achievement Cards**: "Tiết kiệm 1 triệu tháng này" / "Trả hết nợ tín dụng"
- **Vẹt Battle**: So sánh level vẹt với bạn bè ("Vẹt tao level 4, mày mới level 2 à? 😏")

**Word-of-mouth Marketing Strategy:**

```
[User bị Vẹt mổ] → [Screenshot câu chửi] → [Post TikTok: "Con vẹt
này chửi mình nặng quá 😂"] → [Comments: "App gì vậy?" "Link?"]
→ [Friend tải VietFi] → [Bị chửi] → [Lại screenshot share]
→ VIRAL LOOP TỰ NHIÊN ♻️
```

**Chiến lược Marketing Vẹt Vàng (pre-launch):**

| Kênh          | Nội dung                                                           | Mục tiêu      |
| -------------- | ------------------------------------------------------------------- | --------------- |
| TikTok         | Series "Vẹt Vàng chửi Gen Z" — clip ngắn 15s mỗi tình huống | 100K views      |
| Zalo OA        | Chatbot Vẹt Vàng miễn phí (teaser trước app)                  | 5K subscribers  |
| Facebook Group | "Hội những người bị Vẹt Vàng mổ" — community               | 2K members      |
| Sticker pack   | Vẹt Vàng sticker cho Zalo/iMessage                                | Brand awareness |

#### 7.13.5. 3 Chế độ tương tác

| Chế độ                                   | Khi nào                                            | Ví dụ                                                                                                                               |
| ------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 🔥**Mổ Mode** (Roast)                | Chi vượt hũ, bỏ app ≥2 ngày, quên trả nợ   | *"3 ngày không cho tao ăn, mày muốn tao chết đói hả? Mà tiền mày cũng đang chết đói luôn rồi đấy 🦜"*          |
| 💛**Khen Mode** (Hype)                | Tiết kiệm đạt target, ghi chi tiêu đúng giờ | *"Ơ hôm nay ghi chi tiêu trước 8h luôn á? Gà mà biết đẻ trứng vàng, tao phục! +20 XP 🦜🤩"*                          |
| 🧠**Thâm Mode** (Passive-aggressive) | Sắp vượt hũ, chi tiêu tăng dần               | *"Mua thêm 1 ly trà sữa nữa thôi nha, tao không nói gì đâu. Chắt già mới mua được nhà thôi mà... À mà kệ 🦜"* |

---

## 8. BIỂU ĐỒ USE CASE (UML)

```
                ┌──────────────────────────────────────────────┐
                │              VietFi Advisor System            │
                │                                               │
  ┌──────┐      │  ┌─────────────────────┐                     │
  │      │─────►│  │ UC01: Đăng ký/      │                     │
  │      │      │  │       Đăng nhập     │                     │
  │      │      │  └─────────────────────┘                     │
  │      │      │                                               │
  │      │      │  ┌─────────────────────┐                     │
  │      │─────►│  │ UC02: Nhập hồ sơ    │                     │
  │      │      │  │       tài chính     │                     │
  │      │      │  └─────────────────────┘                     │
  │      │      │                                               │
  │      │      │  ┌─────────────────────┐ ┌─────────────────┐ │
  │      │─────►│  │ UC03: Quỹ Chi   │─│ UC04: Quỹ Nợ  │ │
  │      │      │  │ tiêu + Nợ      │ │   + Thoát Nợ  │ │
  │ User │      │  └─────────────────────┘ └─────────────────┘ │
  │      │      │                                               │
  │      │      │  ┌─────────────────────┐                     │
  │      │─────►│  │ UC05: Risk DNA      │                     │
  │      │      │  │       Assessment    │                     │
  │      │      │  └─────────────────────┘                     │
  │      │      │                                               │
  │      │      │  ┌─────────────────────┐ ┌─────────────────┐ │
  │      │─────►│  │ UC06: Dashboard     │─│ UC07: Morning   │ │
  │      │      │  │  (Tổng quan + Macro)│ │   Brief        │ │
  │      │      │  └─────────────────────┘ └─────────────────┘ │
  │      │      │                                               │
  │      │      │  ┌─────────────────────┐ ┌─────────────────┐ │
  │      │─────►│  │ UC08: F&G Index     │─│ UC09: Portfolio │ │
  │      │      │  │ + Personal CPI      │ │   Advisor      │ │
  └──────┘      │  └─────────────────────┘ └─────────────────┘ │
                │                                               │
  ┌──────┐      │  ┌─────────────────────┐                     │
  │ Cron │─────►│  │ UC10: Auto Scrape   │                     │
  │ Job  │      │  │ + AI Processing     │                     │
  └──────┘      │  └─────────────────────┘                     │
                └──────────────────────────────────────────────┘
```

---

## 9. QUY TRÌNH HOẠT ĐỘNG (BPMN)

### 9.1. Quy trình Morning Brief (Daily, 6:00 AM)

```
[●Start]──►[Cron 6AM]──►[Agent1: Scrape 6+ nguồn]──►[Agent2: Tính F&G Score]
                                                              │
[●End]◄──[Push notification]◄──[Lưu DB]◄──[Agent4: Tạo Brief VN]◄──┤
                                                              │
                                          [Agent3: Update Macro]◄──┘
```

### 9.2. Quy trình Quỹ Nợ — Lộ trình Thoát Nợ (User-triggered)

```
[●Start]──►[User thêm khoản nợ (CRUD: tín dụng, vay nhà, bạn bè, TDĐ)]──►[Tính tổng nợ + DTI ratio]
                                                    │
              ┌───────────[◇DTI > 40%?]◄────────────┘
              │Yes                  │No
    [⚠️Cảnh báo]                   │
              │                    │
              └──────►[Agent5: Tính Snowball + Avalanche]
                              │
                    [Hiển thị 2 kịch bản + AI recommend]──►[●End]
```

### 9.3. Quy trình Portfolio Advisor (User-triggered)

```
[●Start]──►[User nhập vốn + mục tiêu]──►[◇Có Risk DNA?]
                                               │No          │Yes
                                    [Redirect Risk DNA]      │
                                          │                  │
                                          └──────►[Agent5: Risk DNA + Macro + F&G]
                                                          │
                                              [Tính allocation tối ưu]
                                                          │
                                              [Pie chart + Projection + Insight]──►[●End]
```

---

## 10. TỐI ƯU HIỆU NĂNG

### 10.1. Rendering Strategy

| Trang               | Strategy                                        | Lý do                                 |
| ------------------- | ----------------------------------------------- | -------------------------------------- |
| Landing page        | **SSG** (Static Site Generation)          | Content tĩnh, build time, fastest LCP |
| Dashboard overview  | **SSR** (Server-Side Rendering)           | Data dynamic, SEO không cần          |
| News feed           | **ISR** (Incremental Static Regeneration) | Revalidate mỗi 5 phút                |
| Charts/Interactions | **CSR** (Client-Side)                     | Interactive, Recharts client-only      |

### 10.2. Optimization Techniques

| Kỹ thuật                   | Implement                                 | Impact                |
| ---------------------------- | ----------------------------------------- | --------------------- |
| **Code Splitting**     | Next.js App Router auto + dynamic imports | -40% initial bundle   |
| **Image Optimization** | next/image (WebP, lazy load)              | -60% image size       |
| **Font Optimization**  | next/font/google (Inter, preload)         | Eliminate FOUT        |
| **API Caching**        | ISR revalidate + SWR client-side          | Reduce API calls 80%  |
| **Debounce inputs**    | CPI calculator, Debt input                | Reduce re-renders     |
| **Skeleton loading**   | Framer Motion + CSS skeleton              | Better perceived perf |
| **Bundle analysis**    | @next/bundle-analyzer                     | Monitor bundle growth |

### 10.3. Target Lighthouse Score

| Metric         | Target | Phương pháp đạt                 |
| -------------- | ------ | ------------------------------------ |
| Performance    | 90+    | SSG landing, code splitting, ISR     |
| Accessibility  | 90+    | WCAG 2.1 AA, contrast 4.5:1          |
| Best Practices | 95+    | HTTPS, no mixed content              |
| SEO            | 95+    | Meta tags, semantic HTML, Vietnamese |

---

## 11. TÍNH KHẢ THI

### 11.1. Kỹ thuật

| Thành phần              | Công nghệ               | Độ phức tạp | Trạng thái          |
| ------------------------- | ------------------------- | --------------- | --------------------- |
| Frontend (10+ pages)      | Next.js + TailwindCSS     | Trung bình     | ✅ Build thành công |
| Quỹ Chi tiêu + Quỹ Nợ | React + Supabase CRUD     | Trung bình     | ⬜ Ready              |
| Scraper                   | Cheerio + RSS + node-cron | Thấp           | ⬜ Ready              |
| AI Pipeline               | Gemini API (5 agents)     | Trung bình     | ⬜ Ready              |
| Auth + DB + RLS           | Supabase                  | Thấp           | ⬜ Ready              |
| Deploy                    | Vercel                    | Rất thấp      | ⬜ Ready              |

**Prototype:** 9 pages functional (Landing + Dashboard + 6 sub-pages), dark theme premium, interactive charts, animations. Next.js build thành công 100%.

### 11.2. Chi phí

| Hạng mục          | Chi phí     | Ghi chú                       |
| ------------------- | ------------ | ------------------------------ |
| Gemini API          | $0           | Free tier: 1,500 req/day       |
| Supabase            | $0           | Free: 500MB DB, 50K auth users |
| Vercel              | $0           | Hobby plan, CDN included       |
| Domain              | $0-12/năm   | .vercel.app free               |
| **Tổng MVP** | **$0** | Toàn bộ miễn phí           |

### 11.3. Lộ trình triển khai chi tiết

| Phase             | Timeline | Tuần | Deliverables                                            |
| ----------------- | -------- | ----- | ------------------------------------------------------- |
| **Vòng 1** | 23-29/03 | W1    | Báo cáo 15 trang + UI prototype (9 pages, dark theme) |
| **Vòng 2** | 06-09/04 | W2    | Supabase Auth + DB schema + Debt CRUD + Risk DNA CRUD   |
|                   | 10-13/04 | W3    | Scraper pipeline (Cheerio + RSS) + Gemini AI agents 1-3 |
|                   | 14-17/04 | W4    | Agent 4-5 + F&G Index tính toán + Morning Brief auto  |
|                   | 18-20/04 | W5    | Integration test + Polish UI + Bug fix + Demo video     |
| **Vòng 3** | 09/05    | W8    | Presentation + Live demo + Q&A preparation              |

---

## 12. CHIẾN LƯỢC TĂNG TRƯỞNG VÀ MÔ HÌNH DOANH THU

### 12.1. North Star Metric

> **"Số lượng user đọc Morning Brief mỗi ngày" (Daily Brief Readers)**

Tại sao chọn metric này?

- Đây là hành vi cốt lõi: mở app mỗi sáng → đọc brief → ra quyết định tài chính
- Metric tăng = product-market fit (user thấy giá trị hàng ngày)
- Metric giảm = sản phẩm có vấn đề cần fix

**Metrics phụ:** D7 Retention Rate, F&G Card Share Rate, Risk DNA Completion Rate.

### 12.1.1. Quy mô Thị trường (TAM/SAM/SOM)

```
  ┌───────────────────────────────────────────┐
  │           TAM = 19 triệu người            │
  │    Gen Z + Millennials VN (20-35 tuổi)    │
  │    [7] Visa VN Report 2025                │
  │  ┌─────────────────────────────────────┐  │
  │  │       SAM = 8.4 triệu người        │  │
  │  │   44% có áp lực tài chính [3]      │  │
  │  │   + đã dùng FinTech (96% banking   │  │
  │  │     app [16])                       │  │
  │  │  ┌───────────────────────────────┐  │  │
  │  │  │    SOM = 50,000 users (Y1)    │  │  │
  │  │  │  5,000 premium (49K/tháng)    │  │  │
  │  │  │  = 2.94 tỷ VNĐ ARR           │  │  │
  │  │  └───────────────────────────────┘  │  │
  │  └─────────────────────────────────────┘  │
  └───────────────────────────────────────────┘
```

| Tầng                | Số lượng            | Logic tính                                      |
| -------------------- | ---------------------- | ------------------------------------------------ |
| **TAM**        | 19M người            | Gen Z/Millennials VN 20-35 tuổi [7]             |
| **SAM**        | 8.4M người           | 44% có áp lực TC [3] × đã dùng FinTech    |
| **SOM Y1**     | 50K free + 5K premium  | Viral loop (Risk DNA + F&G) × content marketing |
| **Revenue Y1** | 2.94 tỷ VNĐ (~$120K) | 5,000 × 49K × 12 tháng                        |

### 12.1.2. Theory of Change — Chuỗi Tác động (Logic Model)

Thay vì chỉ liệt kê tính năng, VietFi tuân theo **Theory of Change** — cho thấy đường đi từ INPUT → IMPACT:

```
 INPUT              ACTIVITIES           OUTPUT              OUTCOME             IMPACT
 ─────              ──────────           ──────              ───────             ──────
 • Gemini API       • Scrape data        • F&G Index VN      • User ra quyết    • Giảm tỷ lệ nợ
 • vnstock API        hàng ngày         • Morning Brief       định TC dựa        xấu Gen Z
 • VnExpress RSS    • AI sentiment      • Risk DNA Card       trên data,       • Tăng tỷ lệ
 • User data          analysis          • Debt Dashboard      không FOMO         đầu tư đúng
 • Supabase DB      • Generate Brief    • Personal CPI      • User nhận         kênh
                    • Risk profiling    • Portfolio           biết tổng nợ     • Thu hẹp khoảng
                    • Debt calculation    Advisor              thực tế            cách hiểu biết
                                                            • User phát hiện    TC thế hệ
                                                              lạm phát thực
```

**Đo lường Impact (6 tháng sau launch):**

| Outcome Metric                              | Baseline           | Target 6M | Cách đo                        |
| ------------------------------------------- | ------------------ | --------- | -------------------------------- |
| % user biết tổng nợ chính xác          | ~20% (ước tính) | >80%      | Survey in-app                    |
| % user biết lạm phát cá nhân           | ~5%                | >60%      | Personal CPI completion rate     |
| % user ra quyết định đầu tư sau Brief | N/A                | >30%      | Brief → Portfolio click-through |
| DTI ratio trung bình (users active)        | Tracking           | Giảm 10% | Debt Dashboard data              |

### 12.2. North Star Metric & Do Things That Don't Scale (YC Framework)

Theo Sam Altman: *"Hãy chọn một chỉ số duy nhất để tối ưu."* Và Paul Graham: *"Hãy làm những điều không thể mở rộng."*

**North Star Metric:** **WAU (Weekly Active Users) mở app + hoàn thành ≥1 hành động** (xem Brief, check F&G, nhập chi tiêu, hoặc xem Market Deep-Dive).

| Giai đoạn | Target WAU | Cách đạt                     |
| ----------- | ---------- | ------------------------------- |
| Tháng 1-3  | 500        | “Do things that don’t scale” |
| Tháng 4-6  | 5,000      | Viral loops kick in             |
| Tháng 7-12 | 25,000     | Organic + referral              |

**“Do Things That Don’t Scale” — Kế hoạch 500 users đầu tiên:**

| Tuần | Hành động                                                                 | Target     |
| ----- | ---------------------------------------------------------------------------- | ---------- |
| 1-2   | Gửi link cá nhân cho bạn bè UIT, FPT, RMIT + inbox từng người        | 50 users   |
| 3-4   | Post vào group SV tài chính (VN Finance, SV Đầu Tư) với Risk DNA quiz | 200 users  |
| 5-6   | DM các tiktoker tài chính nhỏ (5K-50K followers) để review             | 500 users  |
| 7-8   | Ngồi café UIT, hỏi SV dùng thử tại chỗ (kiểu Pinterest)              | +100 users |

> *"Ben Silberman (Pinterest) từng tiếp cận người lạ trong quán cà phê để nhờ họ dùng thử. Sau đó, anh ấy xây dựng những gì họ yêu cầu."* — Sổ tay Khởi nghiệp

**Vòng lặp cải tiến sản phẩm (5%/tuần):**

```
[500 users đầu tiên] → [Quan sát họ dùng app] → [Tìm phần nào tệ] → [Fix 5%/tuần]
→ [Đến khi họ TỰ NGUYỆN giới thiệu cho bạn bè] → [Đạt Product-Market Fit]
```

> *"Không có con đường nào khác. Hãy nghĩ về tất cả các công ty thành công — tất cả đều làm điều này."* — Sam Altman

### 12.3. Viral Loop Design — Vòng lặp tăng trưởng tự nhiên

VietFi thiết kế **4 viral loop** để tăng trưởng organic:

**Loop 1 — F&G Shareable Card (Daily):**

```
[User mở app] → [Thấy F&G Index hôm nay: 72 — Tham lam]
→ [1-tap tạo shareable card đẹp] → [Share lên Zalo/Facebook]
→ [Bạn bè click → mở VietFi] → [Đăng ký]
```

Việc share F&G Score tự nhiên như share thời tiết — mỗi ngày 1 con số, dễ hiểu, đáng share.

**Loop 2 — Risk DNA Card (Viral, giống MBTI):**

```
[User hoàn thành 5 câu hỏi] → [Nhận kết quả: "Nhà đầu tư Tăng trưởng 🚀"]
→ [Share card lên MXH] → [Bạn bè tò mò: "Mình thuộc loại nào?"]
→ [Click → làm quiz → đăng ký]
```

Tiềm năng viral cao nhất — giống MBTI/16Personalities cho tài chính.

**Loop 3 — Personal CPI Shock (Emotional):**

```
[User nhập chi tiêu] → [Kết quả: "Lạm phát của bạn: 7.2%, GẤP ĐÔI chính thức!"]
→ ["Aha moment" shock] → [Share: "Hoá ra lạm phát thực của mình gấp đôi công bố 😱"]
→ [Bạn bè muốn kiểm tra → đăng ký]
```

**Loop 4 — Vẹt Vàng Roast Mode 🦜 (Viral Mascot — LIÊN ĐẦU TIÊN VIỆT):**

Lấy cảm hứng từ **Cleo Roast Mode** (app tài chính UK, viral nhờ chửi user chi tiêu xấu) và **Duolingo Owl** (passive-aggressive notifications tăng DAU +51%). VietFi tạo **Vẹt Vàng** — mascot AI với tính cách xéo sắc kiểu dân Hà Nội:

```
[User chi vượt hũ ăn uống 150%] → [Vẹt Vàng mổ: "Ăn uống như sắp
được nghỉ việc thế, thảo nào cuối tháng lại hỏi 'tiền đi đâu hết' 🦜"]
→ [User screenshot + share lên TikTok/Zalo: "Con vẹt này chửi mình nặng quá 😂"]
→ [Bạn bè tò mò → tải app để bị chửi]
```

**Tại sao Vẹt Vàng gây viral:**

- 🦜 **"Nói như vẹt"** = lặp lại thói quen xấu vào mặt user ("Tuần này là tuần thứ 3 liên tiếp chi Shopee nhiều hơn tiết kiệm, người giỏi nhỉ?")
- 💰 **Vàng = tiền** — mascot tài chính natural, dễ nhớ
- 🇻🇳 **Xéo sắc kiểu Việt** — dùng thành ngữ ("Có thực mới vực được đạo, nhưng coi chừng thực hết không còn gì mà vực")
- 😂 **Ngược đời** = shareable. Người ta share cái xấu hổ của mình vì nó hài hước, tạo FOMO ngược ("bị chửi chưa?")

**3 chế độ của Vẹt Vàng:**

| Chế độ                                   | Khi nào                                       | Ví dụ                                                                                      |
| ------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 🔥**Mổ Mode** (Roast)                | Chi vượt hũ, không mở app 3 ngày         | *"3 ngày không mở app, tiền vẫn bay nha. Giỏi thật đấy 🦜"*                       |
| 💛**Khen Mode** (Hype)                | Tiết kiệm đạt target, trả nợ đúng hạn | *"Tuần này tiết kiệm được 500K, gà mà biết đẻ trứng vàng, giỏi! 🤩"*        |
| 🧠**Thâm Mode** (Passive-aggressive) | Sắp vượt hũ, chi tiêu tăng               | *"Mua thêm 1 ly trà sữa nữa thôi, chắt già mới mua được nhà... À mà kệ 🦜"* |

### 12.3. Mô hình doanh thu (Freemium)

| Tính năng           | Free                  | Premium (49k/tháng)                          |
| --------------------- | --------------------- | --------------------------------------------- |
| Morning Brief         | ✅ Tóm tắt 3 dòng  | ✅ Deep analysis + đề xuất action cụ thể |
| F&G Index             | ✅ Score hôm nay     | ✅ 30-day history + per-asset breakdown       |
| Risk DNA              | ✅ Kết quả cơ bản | ✅ Chi tiết + so sánh với cộng đồng     |
| Personal CPI          | ✅ Full               | ✅ Full                                       |
| Portfolio Advisor     | ❌                    | ✅ Gợi ý phân bổ + dự phóng 10 năm     |
| Quỹ Nợ + Thoát Nợ | ✅ Tổng quan nợ     | ✅ Snowball/Avalanche AI + timeline + DTI     |
| Vẹt Vàng AI 🦜     | ✅ Mổ Mode + 3 noti/ngày | ✅ Full 3 chế độ + unlimited noti + Vẹt Battle |
| Vẹt Vàng Skin/Level | ✅ Level 1-3          | ✅ Level 4-5 (Đại Gia + Phượng Hoàng)        |
| Push Morning Brief    | ❌                    | ✅ Zalo/Email mỗi sáng 7:00 AM              |

**Unit Economics:**

- 49,000 VNĐ/tháng (~$2) × 5,000 premium users = **$10,000/tháng**
- Chi phí: Gemini API ~$50 + Supabase ~$25 + Vercel ~$20 = **$95/tháng**
- → **Ramen Profitability** đạt được với 50 premium users

**Revenue bổ sung (Phase sau):**

- Affiliate: Mở tài khoản CK (TCBS, SSI, VNDirect) — $5-10/referral
- B2B API: Bán F&G Index VN cho tổ chức tài chính — licensing

---

## 13. PHÂN TÍCH CẠNH TRANH

### 13.1. Competitive Matrix

| Tính năng                         | VietFi | Money Lover | Finhay  | MoMo    | Infina  |
| ----------------------------------- | ------ | ----------- | ------- | ------- | ------- |
| Ghi chi tiêu                       | ⬜     | ✅          | ⬜      | ✅      | ⬜      |
| Đầu tư quỹ/CK                   | ⬜     | ⬜          | ✅      | ✅      | ✅      |
| **AI Financial Advisor**      | ✅     | ⬜          | ⬜      | ⬜      | ⬜      |
| **Fear & Greed Index VN**     | ✅     | ⬜          | ⬜      | ⬜      | ⬜      |
| **Personal CPI**              | ✅     | ⬜          | ⬜      | ⬜      | ⬜      |
| **Quỹ Chi tiêu + Quỹ Nợ** | ✅     | ⬜          | ⬜      | Partial | ⬜      |
| **Market Deep-Dive**          | ✅     | ⬜          | ⬜      | ⬜      | ⬜      |
| **Housing Intel**             | ✅     | ⬜          | ⬜      | ⬜      | ⬜      |
| **Risk DNA Behavioral**       | ✅     | ⬜          | ⬜      | ⬜      | ⬜      |
| **Morning Brief AI**          | ✅     | ⬜          | ⬜      | ⬜      | ⬜      |
| Sentiment Analysis                  | ✅     | ⬜          | ⬜      | ⬜      | ⬜      |
| Multi-asset advisory                | ✅     | ⬜          | Partial | Partial | Partial |
| Tiếng Việt native                 | ✅     | ✅          | ✅      | ✅      | ✅      |

**Kết luận:** VietFi là sản phẩm duy nhất kết hợp AI Advisory + Debt Management + Sentiment Analysis cho thị trường VN.

### 13.1.1. Luận điểm "10x Better" (YC Framework)

Theo Y Combinator: *"Một định nghĩa chấp nhận được của 'mới' là: tốt gấp 10 lần so với giải pháp hiện tại."* VietFi đạt được điều này:

| Vấn đề                         | Giải pháp hiện tại   | VietFi                          | Bao nhiêu lần tốt hơn?     |
| --------------------------------- | ------------------------ | ------------------------------- | ------------------------------ |
| Biết tâm lý thị trường VN   | Không có               | F&G Index VN                    | ∞ (chưa ai làm)             |
| Tư vấn đầu tư cá nhân      | Tư vấn viên 2M+/buổi | AI Advisor miễn phí           | **40x rẻ hơn**         |
| Biết lạm phát thực của mình | CPI chính thức (chung) | Personal CPI                    | ∞ (chưa ai làm)             |
| Quản lý nợ toàn diện         | Excel thủ công         | Quỹ Nợ + AI thoát nợ        | **10x nhanh hơn**       |
| Phân tích thị trường sâu    | Đọc báo/MXH rời rạc | Market Deep-Dive AI             | **10x toàn diện hơn** |
| Lộ trình mua nhà               | Không có               | Housing Intel                   | ∞ (chưa ai làm)             |
| Học tài chính                  | Sách/YouTube khô khan  | Vẹt Vàng roast + gamification | **10x engaging hơn**    |

> *"Ý tưởng tốt nhất thường nghe có vẻ tệ, nhưng thực ra lại rất tốt."* — Sam Altman
>
> VietFi nghe như *"một app tài chính nữa"* — nhưng không app nào tại VN có AI advisor + F&G Index + roast mascot + housing intel.

### 13.2. SWOT

|                       | Tích cực                                                                                                                                                                                                                                     | Tiêu cực                                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nội bộ**    | **S:** First-mover F&G Index VN, 9 features độc quyền, $0 cost, Prototype ready, Tech stack verified, **Founder-Market Fit** (founder tự trải nghiệm nợ + đầu tư + chi tiêu SV — hiểu user vì chính mình là user) | **W:** Data lịch sử ngắn, phụ thuộc Gemini free tier, team nhỏ                                                                                |
| **Bên ngoài** | **O:** 44% Gen Z áp lực tài chính, FinTech VN CAGR 15%+, Open Banking (Thông tư 64/2024), Vẹt Vàng viral potential                                                                                                               | **T:** Đối thủ lớn (MoMo 40M users) có thể copy features (nhưng không copy được data moat + habit moat), Quy định tư vấn tài chính |

### 13.3. Chiến lược MOAT — Lợi thế cạnh tranh bền vững

Theo Peter Thiel (*Zero to One*): *"Một startup tốt phải có monopoly — lợi thế mà đối thủ không sao chép nổi."* VietFi xây dựng **4 tầng MOAT**:

**Tầng 1 — Brand Moat: "F&G Index VN = VietFi"**

- Nếu VietFi F&G Index được báo chí (VnExpress, CafeF) trích dẫn → trở thành chỉ số chuẩn (de facto standard)
- CNN Fear & Greed Index không ai copy nổi vì nó đã là BRAND → VietFi nhắm vị trí tương tự cho VN
- Đây là chỉ số tâm lý thị trường **đầu tiên** xây dựng riêng cho Việt Nam

**Tầng 2 — Data Moat: Dữ liệu hành vi tài chính**

- Thu thập Risk DNA + chi tiêu + portfolio preferences → dataset behavioral finance **lớn nhất** VN
- Càng nhiều user → AI càng chính xác → càng nhiều user (flywheel effect)
- Đối thủ mới không thể có dữ liệu này ngay cả khi copy features

**Tầng 3 — Habit Moat: Morning Brief hàng ngày**

- User check VietFi MỖI SÁNG trước khi mở app chứng khoán → habit loop
- Mở app → 1 số F&G → 1 brief → tự tin ra quyết định → switching cost cao

**Tầng 4 — IP Moat: Thuật toán riêng**

- 5 indicators Việt hóa + trọng số riêng + Z-score normalization
- Công thức Personal CPI + Debt Optimizer là IP riêng
- Càng chạy lâu → historical data càng dài → chỉ số càng đáng tin

---

## 14. HƯỚNG MỞ RỘNG

### 14.1. Ngắn hạn (3-6 tháng)

- Zalo Mini-app (70M+ users)
- Push notification Morning Brief hàng sáng
- Kết nối real-time API chứng khoán (SSI Fast Connect WebSocket)
- Open Banking integration (Napas, VN banks)

### 14.2. Trung hạn (6-12 tháng)

- AI Chatbot tài chính ("Nên mua vàng bây giờ không?")
- Community chia sẻ portfolio ẩn danh
- Tích hợp OCR đọc sao kê ngân hàng tự động

### 14.3. Dài hạn (1-2 năm)

- B2B API: Bán F&G Index VN cho tổ chức tài chính

### 14.4. Lean Validation Plan — "Kiểm tra giả thuyết với điều nhỏ nhất" (YC Framework)

Theo YC: *"Điều nhỏ nhất có thể xây dựng để kiểm tra giả thuyết là gì?"* VietFi áp dụng:

| Giả thuyết                       | MVP Test                             | Thành công =         | Thất bại =            |
| ---------------------------------- | ------------------------------------ | ---------------------- | ----------------------- |
| Gen Z muốn biết F&G VN           | Landing page + 1 con số mỗi ngày  | Share rate >5%         | Không ai quay lại     |
| Roast mode gây viral              | Vẹt Vàng chatbot trên Zalo OA     | Screenshot rate >10%   | Người dùng tắt noti |
| SV muốn biết lộ trình mua nhà | Google Form + AI tính affordability | 200+ submissions/tuần | <20 submissions         |
| Personal CPI gây "Aha moment"     | Web-only calculator (1 page)         | >30% share kết quả   | <5% share               |
| Quỹ Nợ giúp nhận thức nợ     | Simple form + DTI chart              | User nhập >3 khoản   | Chỉ nhập 1 và bỏ    |

> *"Ra mắt sản phẩm và xem điều gì xảy ra — cách này hiệu quả hơn với ý tưởng hướng đến người tiêu dùng."* — Sam Altman

**Phương châm:** Bắt đầu với sản phẩm đơn giản nhất, càng ít tính năng càng tốt, và ra mắt sớm hơn bạn nghĩ. **Sự đơn giản luôn luôn tốt.**

- Mobile App (React Native): iOS + Android
- Mở rộng Đông Nam Á (Thailand, Indonesia — cùng pain point)

### 14.4. Technical Scalability

- Microservices: Tách AI Pipeline thành independent services
- Message Queue: Redis/BullMQ cho scraping jobs
- CDN: Vercel Edge Functions cho API routes gần user
- Database: Supabase → self-hosted PostgreSQL khi scale

---

## 15. KẾT LUẬN

VietFi Advisor giải quyết **cả 2 vấn đề cốt lõi** của đề bài Tài chính, theo triết lý **"Chi tiêu → Thoát nợ → Đầu tư"**:

1. **Vấn đề 5.1 (Quản trị nợ):** Quỹ Chi tiêu (“hũ” ngân sách) + Quỹ Nợ (hợp nhất nợ tín dụng, vay nhà, bạn bè, tín dụng đen + lộ trình thoát nợ Snowball/Avalanche)
2. **Vấn đề 5.2 (Cố vấn đầu tư):** Multi-Agent AI Pipeline → Fear & Greed Index VN + Personal CPI + Risk DNA → Portfolio Advisor cá nhân hóa

> *Sản phẩm này được xây dựng từ câu hỏi thực tế: "Nếu 18-20 tuổi, chập chững bước vào đời sinh viên, tôi ước gì có một công cụ giúp quản lý tài chính, biết đầu tư gì, học gì, để vững tâm và sống tốt trong bối cảnh AI hiện tại."* VietFi Advisor là câu trả lời cho câu hỏi đó.

Với chi phí **$0**, prototype **đã build** (12+ pages), target **25+ triệu** Gen Z/Millennials VN, và **9 tính năng chưa đối thủ nào có** — VietFi Advisor có tiềm năng trở thành sản phẩm thực sự, không chỉ bài thi.

---

## 16. TÀI LIỆU THAM KHẢO

[1] Tổng cục Thống kê (GSO), VietnamNews — "CPI rises 3.31% in 2025", 2025.

[2] Standard & Poor's Global Financial Literacy Survey (2014) — "~24% of Vietnamese adults are financially literate (lower than ASEAN avg ~38%)", gflec.org/sp-global-finlit-survey.

[3] Sun Life Asia Financial Resilience Index 2025 — "57% Gen Z feel financially secure (Asia-wide); 44% financially pressured; 57% choose safe investments", sunlife.com, 2025.

[4] Goover.ai Survey 2024 — "67% of Vietnamese surveyed confused about financial management", goover.ai.

[5] Asian Banking & Finance — "60% of Gen Z/Millennials are 'very new' or 'basic' investors; FinTech adoption projected 65%→79% by 2030", asianbankingandfinance.net.

[6] Prelec, D. & Loewenstein, G. — "The Pain of Paying", Carnegie Mellon University. Cited in Cambridge University research on BNPL.

[7] Visa Vietnam Report 2025 — "Gen Z accounts for ~1/3 of Vietnam's workforce, 19M+ aged 14-27", vir.com.vn.

[8] CNN Business — "Fear & Greed Index Methodology", money.cnn.com/data/fear-and-greed.

[9] United Nations Statistics Division — "Consumer Price Index Manual: Theory and Practice (Laspeyres formula)", stats.un.org.

[10] Kahneman, D. & Tversky, A. (1979) — "Prospect Theory: An Analysis of Decision under Risk", Econometrica, 47(2), 263-291.

[11] Vanguard — "Risk Profile Questionnaire Methodology", vanguard.com. Betterment — "How We Assess Your Risk Tolerance", betterment.com.

[12] Park, J.S. et al. (2024) — "Generative Agents: Interactive Simulacra of Human Behavior", Stanford HAI.

[13] TradingGoose — Open-source Multi-Agent LLM Trading Framework, github.com/Trading-Goose, 36 stars.

[14] Ramsey, D. — "The Total Money Makeover" (Debt Snowball method). Avalanche method: mathematically optimal approach, widely cited in personal finance academia.

[15] IMARC Group, PS Market Research — "Vietnam FinTech market $18-20B in 2025, CAGR 15-17%", 2025.

[16] Open University HCMC Survey 2023 — "96% use banking apps, 70% use e-wallets", ou.edu.vn.

[17] Christensen, C.M. et al. (2016) — "Competing Against Luck: The Story of Innovation and Customer Choice", Harvard Business School. Jobs-to-be-Done (JTBD) framework.

---

## 17. BẢNG CHÚ GIẢI THUẬT NGỮ

| Thuật ngữ        | Giải thích                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------- |
| CPI                | Consumer Price Index — Chỉ số giá tiêu dùng                                             |
| Personal CPI       | Lạm phát cá nhân, tính dựa trên cơ cấu chi tiêu thực tế của user                 |
| Fear & Greed Index | Chỉ số đo tâm lý thị trường (0=sợ hãi cực độ, 100=tham lam cực độ)            |
| LLM                | Large Language Model — Mô hình ngôn ngữ lớn (AI)                                        |
| Multi-Agent        | Hệ thống nhiều AI agents chuyên biệt phối hợp xử lý                                  |
| Risk DNA           | Profile rủi ro cá nhân dựa trên phân tích hành vi (Behavioral Finance)                |
| FOMO               | Fear Of Missing Out — Sợ bỏ lỡ cơ hội đầu tư                                         |
| FUD                | Fear, Uncertainty, Doubt — Sợ hãi, không chắc chắn, nghi ngờ                           |
| Analysis Paralysis | Tê liệt quyết định do quá nhiều thông tin, lựa chọn                                 |
| NLP                | Natural Language Processing — Xử lý ngôn ngữ tự nhiên                                  |
| TAM/SAM/SOM        | Total/Serviceable Addressable/Obtainable Market — Các tầng thị trường                   |
| BPMN               | Business Process Model and Notation — Mô hình quy trình nghiệp vụ                       |
| UML                | Unified Modeling Language — Ngôn ngữ mô hình thống nhất                                |
| Robo-Advisor       | Cố vấn tài chính tự động dựa trên thuật toán & AI                                  |
| DCA                | Dollar Cost Averaging — Phân bổ vốn đều đặn theo thời gian                           |
| Behavioral Finance | Tài chính hành vi — nghiên cứu tâm lý trong quyết định tài chính                 |
| SSR/SSG/ISR        | Server-Side Rendering / Static Site Generation / Incremental Static Regeneration              |
| DTI                | Debt-to-Income ratio — Tỷ lệ nợ trên thu nhập                                           |
| Snowball/Avalanche | Phương pháp trả nợ: ưu tiên khoản nhỏ (tâm lý) vs lãi cao (tối ưu tài chính)  |
| RLS                | Row Level Security — Bảo mật cấp dòng dữ liệu (Supabase/PostgreSQL)                    |
| Prospect Theory    | Lý thuyết triển vọng — con người đánh giá rủi ro bất đối xứng (Kahneman, 1979) |
