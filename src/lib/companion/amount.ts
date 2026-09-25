/**
 * Vietnamese money-amount parser (deterministic, 0 API calls).
 *
 * Understands the ways people actually type amounts in chat:
 *   30k · 30K · 30 nghìn · 30 ngàn · ba chục · năm chục · 1tr2 · 3tr5 · 1,2 triệu
 *   1 triệu rưỡi · 1.200.000đ · 1,200,000 · 25000 · hai trăm nghìn · 1.5k
 *
 * Every hit carries its character span so callers can split multi-transaction
 * sentences, and an `assumption` when the unit had to be guessed (e.g. "phở 35").
 */

export interface AmountMatch {
  amount: number;
  start: number;
  end: number;
  raw: string;
  /** Set when the unit was inferred rather than stated. Shown to the user for review. */
  assumption?: string;
}

const DIGIT_WORDS: Record<string, number> = {
  "không": 0, "một": 1, "mốt": 1, "hai": 2, "ba": 3, "bốn": 4, "tư": 4,
  "năm": 5, "lăm": 5, "sáu": 6, "bảy": 7, "bẩy": 7, "tám": 8, "chín": 9, "mười": 10,
};

const L = "\\p{L}";
// Word boundary that understands Vietnamese letters (\b is ASCII-only).
const WB_START = `(?<![${L}\\d])`;
const WB_END = `(?![${L}])`;

const NUM = "\\d+(?:[.,]\\d+)?";
const WORD_NUM = `(?:${Object.keys(DIGIT_WORDS).join("|")})`;

function toNumber(raw: string): number {
  const trimmed = raw.trim();
  if (DIGIT_WORDS[trimmed] !== undefined) return DIGIT_WORDS[trimmed];
  // "1,2" / "1.5" as decimals (thousand-grouped values are handled elsewhere)
  return parseFloat(trimmed.replace(",", "."));
}

interface Rule {
  re: RegExp;
  value: (m: RegExpExecArray) => number | null;
  assumption?: (m: RegExpExecArray) => string | undefined;
}

// Ordered from most to least specific. Earlier rules claim their span first.
const RULES: Rule[] = [
  // 1tr2, 3tr5, 1tr25, 2 triệu 3, 1 triệu rưỡi
  {
    re: new RegExp(
      `${WB_START}(${NUM}|${WORD_NUM})\\s*(?:tr|triệu|trieu|m)(?:\\s*(\\d{1,3}|${WORD_NUM}|rưỡi|ruoi))?${WB_END}`,
      "giu",
    ),
    value: (m) => {
      const base = toNumber(m[1]);
      if (!Number.isFinite(base)) return null;
      const tail = m[2];
      if (!tail) return base * 1_000_000;
      if (tail === "rưỡi" || tail === "ruoi") return base * 1_000_000 + 500_000;
      const digits = /^\d+$/.test(tail) ? tail : String(DIGIT_WORDS[tail] ?? "");
      if (!digits) return base * 1_000_000;
      // "1tr2" → 1.2tr, "1tr25" → 1.25tr, "1tr250" → 1.25tr
      return Math.round(base * 1_000_000 + parseFloat(`0.${digits}`) * 1_000_000);
    },
  },
  // 1 tỷ, 2 tỉ
  {
    re: new RegExp(`${WB_START}(${NUM}|${WORD_NUM})\\s*(?:tỷ|tỉ|ty)${WB_END}`, "giu"),
    value: (m) => toNumber(m[1]) * 1_000_000_000,
  },
  // hai trăm nghìn, 2 trăm rưỡi, trăm rưỡi, ba trăm
  {
    re: new RegExp(
      `${WB_START}(?:(${NUM}|${WORD_NUM})\\s*)?trăm(?:\\s*(rưỡi|ruoi|${WORD_NUM}))?(?:\\s*(nghìn|ngàn|nghin|ngan|k))?${WB_END}`,
      "giu",
    ),
    value: (m) => {
      const hundreds = m[1] ? toNumber(m[1]) : 1;
      let value = hundreds * 100;
      if (m[2] === "rưỡi" || m[2] === "ruoi") value += 50;
      else if (m[2]) value += DIGIT_WORDS[m[2]] * 10;
      return value * 1000;
    },
    assumption: (m) => (m[3] ? undefined : "Hiểu là nghìn đồng"),
  },
  // ba chục, năm chục, 5 chục → 30k, 50k (colloquial "chục" = 10 nghìn)
  {
    re: new RegExp(`${WB_START}(${NUM}|${WORD_NUM})\\s*chục(?:\\s*(nghìn|ngàn|k))?${WB_END}`, "giu"),
    value: (m) => toNumber(m[1]) * 10_000,
  },
  // 1.200.000đ, 1,200,000, 25.000 đồng (grouped thousands)
  {
    re: new RegExp(`${WB_START}(\\d{1,3}(?:[.,]\\d{3})+)(?:\\s*(?:đ|đồng|dong|vnd|vnđ))?${WB_END}`, "giu"),
    value: (m) => parseInt(m[1].replace(/[.,]/g, ""), 10),
  },
  // 30k, 30 nghìn, 30 ngàn, 1.5k
  {
    re: new RegExp(`${WB_START}(${NUM}|${WORD_NUM})\\s*(?:k|nghìn|ngàn|nghin|ngan|ng)${WB_END}`, "giu"),
    value: (m) => Math.round(toNumber(m[1]) * 1000),
  },
  // 25000, 25000đ (plain integers ≥ 1000 are already VND)
  {
    re: new RegExp(`${WB_START}(\\d{4,})(?:\\s*(?:đ|đồng|dong|vnd|vnđ))?${WB_END}`, "giu"),
    value: (m) => parseInt(m[1], 10),
  },
  // 500đ, 500 đồng (explicit small amounts)
  {
    re: new RegExp(`${WB_START}(\\d{1,3})\\s*(?:đ|đồng|dong|vnd|vnđ)${WB_END}`, "giu"),
    value: (m) => parseInt(m[1], 10),
  },
  // Bare "35" at the end of a clause ("phở 35") → most people mean 35 nghìn.
  // Not "3 trà sữa" — a number followed by a noun is a quantity. Flagged for review.
  {
    re: new RegExp(`${WB_START}(\\d{1,3})(?=\\s*(?:$|[,;.!?\\n]|và(?![${L}])|rồi(?![${L}])))`, "giu"),
    value: (m) => parseInt(m[1], 10) * 1000,
    assumption: (m) => `Hiểu "${m[1]}" là ${parseInt(m[1], 10)}.000đ`,
  },
];

export const MIN_AMOUNT = 500;
export const MAX_AMOUNT = 10_000_000_000;

export function findAmounts(text: string): AmountMatch[] {
  const lower = text.toLowerCase();
  const taken: Array<[number, number]> = [];
  const matches: AmountMatch[] = [];

  const overlaps = (s: number, e: number) => taken.some(([a, b]) => s < b && e > a);

  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.re.exec(lower)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (m[0].trim() === "" || overlaps(start, end)) continue;
      const value = rule.value(m);
      if (value === null || !Number.isFinite(value)) continue;
      const amount = Math.round(value);
      if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) continue;
      taken.push([start, end]);
      matches.push({
        amount,
        start,
        end,
        raw: text.slice(start, end),
        ...(rule.assumption?.(m) ? { assumption: rule.assumption(m) } : {}),
      });
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}

/** Convenience: the single amount in a short string, or null. */
export function parseAmount(text: string): number | null {
  const found = findAmounts(text);
  return found.length > 0 ? found[0].amount : null;
}
