import { api, unwrap } from "./client";

export type SpaceRole = "owner" | "admin" | "member" | "guest";

export type CollaborativeSpace = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  currency: string;
  wallet_container_id?: string | null;
  role?: SpaceRole;
  member_id?: string;
  member_count?: number;
  is_favorite?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type SpaceMember = {
  id: string;
  space_id: string;
  user_id: string;
  role: SpaceRole;
  status: string;
  display_name?: string | null;
  email?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  joined_at?: string | null;
};

export type SpaceBalance = {
  member_id: string;
  user_id: string;
  display_name: string;
  email?: string;
  avatar_url?: string | null;
  role: SpaceRole;
  net: number;
};

export type SpaceExpense = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  payer_member_id: string;
  split_method: string;
  category?: string | null;
  expense_date: string;
  notes?: string | null;
  splits: Array<{
    id?: string;
    member_id: string;
    share_value?: number | null;
    owed_amount: number;
  }>;
};

export type SpaceDashboard = {
  space: CollaborativeSpace;
  membership: SpaceMember;
  members: SpaceMember[];
  balances: SpaceBalance[];
  suggested_settlements: Array<{
    from_member_id: string;
    to_member_id: string;
    amount: number;
  }>;
  metrics: {
    total_spent: number;
    total_budget: number;
    budget_spent: number;
    outstanding_settlements: number;
    you_owe: number;
    you_are_owed: number;
    shared_wallet_balance: number;
    wallet: { id: string; name: string; balance: number; currency: string } | null;
  };
  budgets: any[];
  goals: any[];
  recent_settlements: any[];
  activity: any[];
  ai_summary: string;
};

export async function listSpaces(): Promise<CollaborativeSpace[]> {
  const res = await api.get("/spaces");
  return unwrap(res);
}

export async function createSpace(payload: {
  name: string;
  description?: string;
  currency?: string;
  icon?: string;
  color?: string;
}): Promise<CollaborativeSpace> {
  const res = await api.post("/spaces", payload);
  return unwrap(res);
}

export async function getSpaceDashboard(spaceId: string): Promise<SpaceDashboard> {
  const res = await api.get(`/spaces/${spaceId}`);
  return unwrap(res);
}

export async function updateSpace(
  spaceId: string,
  payload: Partial<{
    name: string;
    description: string;
    currency: string;
    icon: string;
    color: string;
  }>,
) {
  const res = await api.patch(`/spaces/${spaceId}`, payload);
  return unwrap(res);
}

export async function setSpaceFavorite(
  spaceId: string,
  favorite: boolean,
  position?: number,
) {
  const res = await api.post(`/spaces/${spaceId}/favorite`, {
    favorite,
    position,
  });
  return unwrap(res);
}

export async function inviteToSpace(
  spaceId: string,
  email: string,
  role: "admin" | "member" | "guest" = "member",
) {
  const res = await api.post(`/spaces/${spaceId}/invites`, { email, role });
  return unwrap(res);
}

export async function removeSpaceMember(spaceId: string, memberId: string) {
  const res = await api.delete(`/spaces/${spaceId}/members/${memberId}`);
  return unwrap(res);
}

export async function updateSpaceMemberRole(
  spaceId: string,
  memberId: string,
  role: SpaceRole,
) {
  const res = await api.patch(`/spaces/${spaceId}/members/${memberId}`, { role });
  return unwrap(res);
}

export async function acceptSpaceInvite(token: string) {
  const res = await api.post(`/spaces/invites/${token}/accept`);
  return unwrap(res);
}

export async function listSpaceExpenses(spaceId: string): Promise<SpaceExpense[]> {
  const res = await api.get(`/spaces/${spaceId}/expenses`);
  return unwrap(res);
}

export async function createSpaceExpense(spaceId: string, payload: Record<string, unknown>) {
  const res = await api.post(`/spaces/${spaceId}/expenses`, payload);
  return unwrap(res);
}

export async function createSpaceSettlement(
  spaceId: string,
  payload: Record<string, unknown>,
) {
  const res = await api.post(`/spaces/${spaceId}/settlements`, payload);
  return unwrap(res);
}

export async function listSpaceBudgets(spaceId: string) {
  const res = await api.get(`/spaces/${spaceId}/budgets`);
  return unwrap(res);
}

export async function createSpaceBudget(spaceId: string, payload: Record<string, unknown>) {
  const res = await api.post(`/spaces/${spaceId}/budgets`, payload);
  return unwrap(res);
}

export async function listSpaceGoals(spaceId: string) {
  const res = await api.get(`/spaces/${spaceId}/goals`);
  return unwrap(res);
}

export async function createSpaceGoal(spaceId: string, payload: Record<string, unknown>) {
  const res = await api.post(`/spaces/${spaceId}/goals`, payload);
  return unwrap(res);
}

export async function contributeSpaceGoal(
  spaceId: string,
  goalId: string,
  amount: number,
  note?: string,
) {
  const res = await api.post(`/spaces/${spaceId}/goals/${goalId}/contribute`, {
    amount,
    note,
  });
  return unwrap(res);
}

export async function getSpaceReports(spaceId: string) {
  const res = await api.get(`/spaces/${spaceId}/reports`);
  return unwrap(res);
}

export async function moveSpaceWallet(
  spaceId: string,
  kind: "deposit" | "withdrawal",
  amount: number,
  note?: string,
) {
  const res = await api.post(`/spaces/${spaceId}/wallet`, { kind, amount, note });
  return unwrap(res);
}

export async function enqueueSpaceSync(payload: {
  client_op_id: string;
  entity_type: string;
  space_id?: string;
  payload: Record<string, unknown>;
}) {
  const res = await api.post("/spaces/sync/outbox", payload);
  return unwrap(res);
}

export async function listSpaceSyncOutbox() {
  const res = await api.get("/spaces/sync/outbox");
  return unwrap(res);
}

export async function ackSpaceSync(ids: string[]) {
  const res = await api.post("/spaces/sync/ack", { ids });
  return unwrap(res);
}

export async function listSpaceNotifications() {
  const res = await api.get("/spaces/notifications");
  return unwrap(res);
}
