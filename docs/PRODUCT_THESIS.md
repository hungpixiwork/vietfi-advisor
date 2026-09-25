# VietFi — Product Thesis

_Cập nhật: 2026-09-24_

## Một câu

VietFi là trợ lý tài chính cá nhân cho người trẻ Việt Nam: nói chuyện với Vẹt Vàng như nhắn tin, và mỗi câu nói biến thành dữ liệu thật, con số được tính đúng, và một hành động cụ thể.

## Khách hàng mục tiêu

Người đi làm 20–30 tuổi, thu nhập 8–25 triệu/tháng, chi tiêu chủ yếu qua ví điện tử và tiền mặt, **không** duy trì được thói quen ghi chép bằng app truyền thống (form dài, nhiều bước, dễ bỏ).

## Bài toán

1. **Tiền của tôi đang đi đâu?** — Ghi chép tốn công nên bị bỏ sau vài ngày; không có dữ liệu thì mọi phân tích đều vô nghĩa.
2. **Nếu tôi quyết định X thì sao?** — Mua trả góp, rút tiết kiệm… thường quyết theo cảm tính.
3. **Hôm nay tôi nên làm gì?** — Lời khuyên chung chung không gắn với số liệu của chính mình.

## Giải pháp — vòng lặp

```
Hội thoại → Hiểu ý định → Engine tính toán → Đề xuất → Người dùng xác nhận → Lưu → Phản hồi bằng số liệu mới
```

- **Ghi chép bằng một câu**: "ăn phở 35k, cà phê 25k" → 2 giao dịch soạn sẵn → bấm Lưu.
- **AI hiểu ngôn ngữ, Engine tính tiền**: mọi con số trong câu trả lời đến từ hàm thuần TypeScript có test, không từ LLM.
- **Người dùng quyết định cuối cùng**: mọi thao tác ghi/sửa/xóa đều qua thẻ xác nhận.
- **Trung thực về dữ liệu**: thiếu thu nhập thì nói thiếu; chưa đồng bộ thì ghi "chưa đồng bộ"; AI lỗi thì nói AI lỗi.

## Khác biệt

| Chatbot thông thường | Vẹt Vàng |
|---|---|
| Trả lời kiến thức chung | Trả lời bằng số liệu của chính bạn |
| LLM tự tính, có thể bịa | Engine xác định tính, LLM chỉ hiểu câu |
| "Đã ghi!" dù không lưu | Chỉ báo "Đã lưu" sau khi đọc lại storage xác nhận |
| Gửi toàn bộ dữ liệu lên LLM | LLM chỉ thấy câu chat, không thấy số dư/lịch sử |
| Cần mạng | Ghi chép và hỏi ngân sách chạy offline, 0 lệnh gọi API |

## Nguyên tắc giữ/bỏ tính năng

Mỗi tính năng phải phục vụ ít nhất một trong ba câu hỏi ở trên. Không chứng minh được → đóng băng (xem `MVP_SCOPE.md`).
