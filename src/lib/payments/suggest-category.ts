import type { Category, LedgerTransaction } from "@/types";

const KEYWORD_ALIASES: Record<string, string[]> = {
  "Dining Out": [
    "restaurant",
    "hotel",
    "cafe",
    "café",
    "dhaba",
    "kitchen",
    "biryani",
    "pizza",
    "burger",
    "dine",
    "eatery",
    "bakery",
  ],
  Groceries: ["mart", "supermarket", "grocery", "kirana", "fresh", "vegetables"],
  "Coffee & Snacks": ["coffee", "starbucks", "chai", "tea stall", "snacks"],
  Fuel: ["petrol", "diesel", "hpcl", "bpcl", "iocl", "indian oil", "shell", "nayara", "hp pump"],
  "Ride Hailing": ["uber", "ola", "rapido", "namma yatri"],
  "Public Transit": ["metro", "irctc", "railway", "bus ticket"],
  Electricity: ["electricity", "bescom", "mseb", "tata power"],
  "Mobile Phone": ["recharge", "prepaid", "jio", "airtel", "vi ", "vodafone"],
  Internet: ["broadband", "wifi", "airtel xtreme", "jiofiber"],
  Healthcare: ["hospital", "clinic", "pharma", "pharmacy", "medical", "apollo"],
  Shopping: ["amazon", "flipkart", "myntra", "ajio", "retail"],
  Entertainment: ["pvr", "inox", "movie", "bookmyshow", "spotify", "netflix"],
  Travel: ["makemytrip", "goibibo", "indigo", "air india", "hotel booking"],
  "Fees & Charges": ["fee", "penalty", "charge"],
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function suggestCategoryId(input: {
  merchant?: string | null;
  note?: string | null;
  categories: Category[];
  transactions: LedgerTransaction[];
}): string | null {
  const merchant = normalize(input.merchant || "");
  if (merchant) {
    const counts = new Map<string, number>();
    for (const tx of input.transactions) {
      if (!tx.category_id || tx.type !== "expense") continue;
      if (normalize(tx.merchant || "") !== merchant) continue;
      counts.set(tx.category_id, (counts.get(tx.category_id) || 0) + 1);
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [id, count] of counts) {
      if (count > bestCount) {
        best = id;
        bestCount = count;
      }
    }
    if (best) return best;
  }

  const hay = `${merchant} ${normalize(input.note || "")}`;
  if (!hay.trim()) return null;

  for (const category of input.categories) {
    const aliases = KEYWORD_ALIASES[category.name] || [];
    if (aliases.some((alias) => hay.includes(alias))) return category.id;
    const name = normalize(category.name);
    if (name.length > 3 && hay.includes(name)) return category.id;
  }
  return null;
}
