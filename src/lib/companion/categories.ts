/**
 * Transaction categories shared by the ledger UI and Vẹt Vàng.
 * One list, so a transaction logged by chat looks identical to one typed by hand.
 */

export const EXPENSE_CATEGORIES = [
  { name: "Ăn uống", emoji: "🍜" },
  { name: "Đi lại", emoji: "🚗" },
  { name: "Nhà ở", emoji: "🏠" },
  { name: "Y tế", emoji: "💊" },
  { name: "Học tập", emoji: "📚" },
  { name: "Giải trí", emoji: "🎮" },
  { name: "Mua sắm", emoji: "🛍️" },
  { name: "Đầu tư", emoji: "📈" },
  { name: "Từ thiện", emoji: "🎁" },
  { name: "Khác", emoji: "🔄" },
] as const;

export const INCOME_CATEGORIES = [
  { name: "Lương", emoji: "💼" },
  { name: "Thưởng", emoji: "🎁" },
  { name: "Thêm ca", emoji: "🔄" },
  { name: "Đầu tư", emoji: "📈" },
  { name: "Quà tặng", emoji: "🎁" },
  { name: "Khác", emoji: "🔄" },
] as const;

export type TransactionType = "income" | "expense";

const EXPENSE_KEYWORDS: Record<string, string[]> = {
  "Ăn uống": [
    "phở", "bún", "cơm", "mì", "miến", "bánh mì", "bánh", "xôi", "cháo", "hủ tiếu", "bò kho", "lẩu", "nướng",
    "ăn", "ăn sáng", "ăn trưa", "ăn tối", "ăn vặt", "nhậu", "bia", "rượu",
    "cà phê", "cafe", "cafê", "coffee", "trà sữa", "trà đá", "trà", "nước mía", "sinh tố", "kem", "highlands", "starbucks",
    "grabfood", "grab food", "shopeefood", "shopee food", "baemin", "kfc", "pizza", "burger", "gà rán",
    "đi chợ", "siêu thị", "bách hóa", "bách hoá", "winmart", "vinmart", "co.op", "trái cây", "hoa quả", "đồ ăn",
  ],
  "Đi lại": [
    "grab", "grabbike", "grabcar", "be", "xanh sm", "gojek", "taxi", "xe ôm", "xe buýt", "bus", "xăng", "đổ xăng",
    "gửi xe", "vé xe", "vé tàu", "vé máy bay", "sửa xe", "rửa xe", "thay nhớt", "phí cầu đường", "metro",
  ],
  "Nhà ở": [
    "tiền nhà", "tiền trọ", "thuê nhà", "thuê phòng", "tiền điện", "tiền nước", "điện nước", "wifi", "internet",
    "tiền mạng", "cước điện thoại", "nạp điện thoại", "nạp card", "bình gas", "phí quản lý", "dịch vụ chung cư",
  ],
  "Y tế": ["thuốc", "bệnh viện", "khám", "bác sĩ", "nha khoa", "nhổ răng", "bảo hiểm", "bhyt", "vitamin", "xét nghiệm"],
  "Học tập": ["học phí", "khóa học", "khoá học", "sách", "ielts", "toeic", "udemy", "coursera", "giáo trình", "học thêm", "lớp"],
  "Giải trí": [
    "xem phim", "phim", "rạp", "cgv", "game", "netflix", "spotify", "youtube premium", "karaoke", "du lịch",
    "khách sạn", "concert", "vé xem", "bar", "club", "spa", "massage", "gym",
  ],
  "Mua sắm": [
    "mua", "shopee", "lazada", "tiki", "tiktok shop", "quần", "áo", "giày", "dép", "túi", "mỹ phẩm", "son",
    "điện thoại", "tai nghe", "laptop", "đồng hồ", "cắt tóc", "làm tóc", "làm nail",
  ],
  "Đầu tư": ["gửi tiết kiệm", "tiết kiệm", "đầu tư", "chứng khoán", "cổ phiếu", "mua vàng", "vàng", "chứng chỉ quỹ", "crypto", "bitcoin"],
  "Từ thiện": ["từ thiện", "quyên góp", "ủng hộ", "biếu", "tặng", "quà", "lì xì", "mừng cưới", "đám cưới", "phong bì", "sinh nhật"],
};

const INCOME_KEYWORDS: Record<string, string[]> = {
  "Lương": ["lương", "nhận lương", "lãnh lương", "về lương", "tiền lương"],
  "Thưởng": ["thưởng", "bonus", "hoa hồng"],
  "Thêm ca": ["thêm ca", "tăng ca", "làm thêm", "freelance", "job", "dạy thêm", "part time", "part-time"],
  "Đầu tư": ["lãi tiết kiệm", "cổ tức", "lời", "lãi"],
  "Quà tặng": ["được cho", "được tặng", "mẹ cho", "bố cho", "ba cho", "được lì xì", "được biếu"],
  "Khác": ["hoàn tiền", "cashback", "bán đồ", "bán", "thu nhập", "được trả", "nhận được", "nhận tiền", "ai đó trả", "trả nợ mình"],
};

// Phrases that flip a sentence to income even when an expense keyword is present
// ("được mẹ cho tiền ăn" is income, not food spending).
const INCOME_MARKERS = ["nhận", "được", "lương", "thưởng", "thu nhập", "hoàn tiền", "cashback", "bán", "lãi", "cổ tức", "kiếm được", "freelance"];

function hasPhrase(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, "iu").test(text);
}

interface CategoryGuess {
  category: string;
  /** 0..1 — below 0.5 the confirmation card asks the user to pick. */
  confidence: number;
}

function bestKeywordMatch(text: string, table: Record<string, string[]>): CategoryGuess | null {
  let best: CategoryGuess | null = null;
  let bestLen = 0;
  for (const [category, keywords] of Object.entries(table)) {
    for (const kw of keywords) {
      if (kw.length > bestLen && hasPhrase(text, kw)) {
        bestLen = kw.length;
        best = { category, confidence: kw.length >= 4 ? 0.9 : 0.7 };
      }
    }
  }
  return best;
}

export function detectTransactionType(text: string): TransactionType {
  const lower = text.toLowerCase();
  // "trả", "mua", "chi" dominate "được" in things like "được giảm giá mua áo 200k"
  if (/(?<![\p{L}])(mua|chi|trả tiền|thanh toán|đóng|nạp)(?![\p{L}])/iu.test(lower) && !/(?<![\p{L}])(lương|thưởng)(?![\p{L}])/iu.test(lower)) {
    return "expense";
  }
  return INCOME_MARKERS.some((m) => hasPhrase(lower, m)) ? "income" : "expense";
}

export function guessCategory(text: string, type: TransactionType): CategoryGuess {
  const lower = text.toLowerCase();
  const hit = bestKeywordMatch(lower, type === "income" ? INCOME_KEYWORDS : EXPENSE_KEYWORDS);
  return hit ?? { category: "Khác", confidence: 0.3 };
}

export function isKnownCategory(name: string, type: TransactionType): boolean {
  const list = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.some((c) => c.name === name);
}

export function categoryEmoji(name: string, type: TransactionType): string {
  const list = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find((c) => c.name === name)?.emoji ?? "🔄";
}

/** Words that suggest the user is describing a spend, used to ask for a missing amount. */
export function looksLikeSpending(text: string): boolean {
  const lower = text.toLowerCase();
  if (/(?<![\p{L}])(mua|ăn|uống|trả|đóng|nạp|đổ|chi|tiêu|hết|mất|tốn)(?![\p{L}])/iu.test(lower)) return true;
  return bestKeywordMatch(lower, EXPENSE_KEYWORDS) !== null;
}
