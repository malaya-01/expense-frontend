/** Client preview of the space split. The server is the source of truth. */

export type SplitMethod = "equal" | "exact" | "percentage" | "shares" | "itemized";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function previewEqual(total: number, memberIds: string[]) {
  const amount = round2(total);
  const base = Math.floor((amount * 100) / memberIds.length) / 100;
  const rows = memberIds.map((memberId) => ({ memberId, share: base }));
  let remainder = round2(amount - base * memberIds.length);
  let idx = 0;
  while (remainder >= 0.01 && idx < rows.length) {
    rows[idx].share = round2(rows[idx].share + 0.01);
    remainder = round2(remainder - 0.01);
    idx += 1;
  }
  return rows;
}

export function previewItemized(
  items: Array<{ amount: number; memberIds: string[] }>,
) {
  const cents = new Map<string, number>();
  for (const item of items) {
    const itemCents = Math.round(round2(item.amount) * 100);
    const members = Array.from(new Set(item.memberIds));
    if (!members.length || itemCents <= 0) continue;
    const base = Math.floor(itemCents / members.length);
    let remainder = itemCents - base * members.length;
    for (const memberId of members) {
      const part = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      cents.set(memberId, (cents.get(memberId) || 0) + part);
    }
  }
  return Array.from(cents.entries()).map(([memberId, value]) => ({
    memberId,
    share: round2(value / 100),
  }));
}

export type SharePreview = { memberId: string; paid: number; share: number; net: number };

export function previewPositions(input: {
  method: SplitMethod;
  total: number;
  participantIds: string[];
  shareValues: Record<string, string>;
  payers: Array<{ memberId: string; amount: number }>;
  items: Array<{ amount: number; memberIds: string[] }>;
}): { error: string | null; rows: SharePreview[] } {
  const total = round2(input.total);
  if (!(total > 0)) return { error: "Enter an amount greater than zero.", rows: [] };
  if (!input.payers.length) return { error: "Choose who paid.", rows: [] };
  if (input.payers.some((p) => !(p.amount > 0))) {
    return { error: "Each person who paid needs an amount.", rows: [] };
  }
  const paidSum = round2(input.payers.reduce((s, p) => s + p.amount, 0));
  if (Math.abs(paidSum - total) > 0.02) {
    return {
      error: `Amounts paid must add up to ${total.toFixed(2)} (currently ${paidSum.toFixed(2)}).`,
      rows: [],
    };
  }

  let shares: Array<{ memberId: string; share: number }> = [];
  if (input.method === "itemized") {
    if (!input.items.length) return { error: "Add at least one line from the bill.", rows: [] };
    if (input.items.some((item) => !(item.amount > 0) || !item.memberIds.length)) {
      return { error: "Each line needs an amount and at least one person.", rows: [] };
    }
    const itemSum = round2(input.items.reduce((s, item) => s + item.amount, 0));
    if (Math.abs(itemSum - total) > 0.02) {
      return {
        error: `Lines must add up to ${total.toFixed(2)} (currently ${itemSum.toFixed(2)}).`,
        rows: [],
      };
    }
    shares = previewItemized(input.items);
  } else if (!input.participantIds.length) {
    return { error: "Select at least one participant.", rows: [] };
  } else if (input.method === "equal") {
    shares = previewEqual(total, input.participantIds);
  } else {
    const values = input.participantIds.map((id) => Number(input.shareValues[id] || 0));
    if (values.some((v) => !Number.isFinite(v) || v < 0)) {
      return { error: "Split values cannot be negative.", rows: [] };
    }
    const sum = values.reduce((a, b) => a + b, 0);
    if (input.method === "exact" && Math.abs(sum - total) > 0.01) {
      return {
        error: `Exact amounts must add up to ${total.toFixed(2)} (currently ${sum.toFixed(2)}).`,
        rows: [],
      };
    }
    if (input.method === "percentage" && Math.abs(sum - 100) > 0.01) {
      return {
        error: `Percentages must add up to 100 (currently ${sum.toFixed(2)}).`,
        rows: [],
      };
    }
    if (input.method === "shares" && !(sum > 0)) {
      return { error: "Give at least one participant a share.", rows: [] };
    }
    if (input.method === "exact") {
      shares = input.participantIds.map((memberId) => ({
        memberId,
        share: round2(Number(input.shareValues[memberId] || 0)),
      }));
    } else if (input.method === "percentage") {
      shares = input.participantIds.map((memberId) => ({
        memberId,
        share: round2((total * Number(input.shareValues[memberId] || 0)) / 100),
      }));
      const drift = round2(total - shares.reduce((s, r) => s + r.share, 0));
      if (shares.length && Math.abs(drift) >= 0.01) {
        shares[0].share = round2(shares[0].share + drift);
      }
    } else {
      shares = input.participantIds.map((memberId) => ({
        memberId,
        share: round2((total * Number(input.shareValues[memberId] || 0)) / sum),
      }));
      const drift = round2(total - shares.reduce((s, r) => s + r.share, 0));
      if (shares.length && Math.abs(drift) >= 0.01) {
        shares[0].share = round2(shares[0].share + drift);
      }
    }
  }

  const paid = new Map(input.payers.map((p) => [p.memberId, round2(p.amount)]));
  const ids = Array.from(
    new Set([...shares.map((s) => s.memberId), ...input.payers.map((p) => p.memberId)]),
  );
  const shareOf = new Map(shares.map((s) => [s.memberId, s.share]));
  return {
    error: null,
    rows: ids.map((memberId) => {
      const paidAmount = paid.get(memberId) || 0;
      const share = shareOf.get(memberId) || 0;
      return {
        memberId,
        paid: paidAmount,
        share,
        net: round2(paidAmount - share),
      };
    }),
  };
}
