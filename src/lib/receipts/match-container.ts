export type ReceiptAccountHint = {
  container_name?: string | null;
  bank_name?: string | null;
  account_last4?: string | null;
  account_label?: string | null;
};

const BANK_ALIASES: Array<{ needle: string; aliases: string[] }> = [
  { needle: "karur vysya", aliases: ["kvb", "karur vysya", "karur"] },
  { needle: "icici", aliases: ["icici"] },
  { needle: "hdfc", aliases: ["hdfc"] },
  { needle: "state bank", aliases: ["sbi", "state bank"] },
  { needle: "axis", aliases: ["axis"] },
  { needle: "kotak", aliases: ["kotak"] },
  { needle: "yes bank", aliases: ["yes bank"] },
  { needle: "indusind", aliases: ["indusind"] },
  { needle: "punjab national", aliases: ["pnb", "punjab national"] },
  { needle: "bank of baroda", aliases: ["bob", "baroda"] },
  { needle: "canara", aliases: ["canara"] },
  { needle: "union bank", aliases: ["union bank"] },
  { needle: "indian bank", aliases: ["indian bank"] },
  { needle: "federal", aliases: ["federal"] },
  { needle: "idfc", aliases: ["idfc"] },
];

function normalize(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function last4(value: string | null | undefined): string | null {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

export function matchExpenseSource<
  T extends { id: string; name: string; type?: string; institution?: string | null },
>(containers: T[], hint: ReceiptAccountHint | null | undefined): T | null {
  if (!hint || !containers.length) return null;
  const sources = containers.filter((row) => {
    const type = row.type || "bank";
    return (
      type === "bank" ||
      type === "wallet" ||
      type === "cash" ||
      type === "credit_card"
    );
  });
  const pool = sources.length ? sources : containers;
  const wantedName = normalize(hint.container_name || hint.account_label);
  const bank = normalize(hint.bank_name);
  const mask = (hint.account_last4 || last4(hint.account_label) || "").replace(
    /\D/g,
    "",
  );

  let best: T | null = null;
  let bestScore = 0;
  for (const row of pool) {
    const hay = `${normalize(row.name)} ${normalize(row.institution)}`;
    let score = 0;
    if (wantedName && normalize(row.name) === wantedName) score += 100;
    if (wantedName && hay.includes(wantedName) && wantedName.length > 4) {
      score += 40;
    }
    if (mask.length === 4 && (hay.includes(mask) || last4(row.name) === mask)) {
      score += 80;
    }
    if (bank && hay.includes(bank)) score += 45;
    for (const group of BANK_ALIASES) {
      const bankHit = bank && group.aliases.some((alias) => bank.includes(alias));
      const rowHit = group.aliases.some((alias) => hay.includes(alias));
      if (bankHit && rowHit) score += 35;
    }
    if (score > bestScore) {
      best = row;
      bestScore = score;
    }
  }
  return bestScore >= 40 ? best : null;
}
