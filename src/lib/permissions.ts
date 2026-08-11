export const CRUD_ACTIONS = ["create", "read", "update", "delete"] as const;
export type CrudAction = (typeof CRUD_ACTIONS)[number];

export function perm(module: string, action: string): string {
  return `${module}.${action}`;
}

export function crudPerm(module: string, action: CrudAction): string {
  return perm(module, action);
}

export const PERMISSION_CODES = {
  DASHBOARD_ACCESS: "dashboard.access",
  DASHBOARD_READ: "dashboard.read",

  ACCOUNTS_ACCESS: "accounts.access",
  ACCOUNTS_CREATE: "accounts.create",
  ACCOUNTS_READ: "accounts.read",
  ACCOUNTS_UPDATE: "accounts.update",
  ACCOUNTS_DELETE: "accounts.delete",

  EXPENSES_ACCESS: "expenses.access",
  EXPENSES_CREATE: "expenses.create",
  EXPENSES_READ: "expenses.read",
  EXPENSES_UPDATE: "expenses.update",
  EXPENSES_DELETE: "expenses.delete",

  RECURRING_ACCESS: "recurring.access",
  RECURRING_CREATE: "recurring.create",
  RECURRING_READ: "recurring.read",
  RECURRING_UPDATE: "recurring.update",
  RECURRING_DELETE: "recurring.delete",

  INVESTMENTS_ACCESS: "investments.access",
  INVESTMENTS_CREATE: "investments.create",
  INVESTMENTS_READ: "investments.read",
  INVESTMENTS_UPDATE: "investments.update",
  INVESTMENTS_DELETE: "investments.delete",

  LOANS_ACCESS: "loans.access",
  LOANS_CREATE: "loans.create",
  LOANS_READ: "loans.read",
  LOANS_UPDATE: "loans.update",
  LOANS_DELETE: "loans.delete",

  BUDGETS_ACCESS: "budgets.access",
  BUDGETS_CREATE: "budgets.create",
  BUDGETS_READ: "budgets.read",
  BUDGETS_UPDATE: "budgets.update",
  BUDGETS_DELETE: "budgets.delete",

  GOALS_ACCESS: "goals.access",
  GOALS_CREATE: "goals.create",
  GOALS_READ: "goals.read",
  GOALS_UPDATE: "goals.update",
  GOALS_DELETE: "goals.delete",

  CATEGORIES_ACCESS: "categories.access",
  CATEGORIES_CREATE: "categories.create",
  CATEGORIES_READ: "categories.read",
  CATEGORIES_UPDATE: "categories.update",
  CATEGORIES_DELETE: "categories.delete",

  REPORTS_ACCESS: "reports.access",
  REPORTS_READ: "reports.read",

  SPACES_ACCESS: "spaces.access",
  SPACES_CREATE: "spaces.create",
  SPACES_READ: "spaces.read",
  SPACES_UPDATE: "spaces.update",
  SPACES_DELETE: "spaces.delete",

  AI_ACCESS: "ai.access",
  AI_CREATE: "ai.create",
  AI_READ: "ai.read",
  AI_UPDATE: "ai.update",
  AI_DELETE: "ai.delete",

  SETTINGS_ACCESS: "settings.access",
  SETTINGS_READ: "settings.read",
  SETTINGS_UPDATE: "settings.update",

  SYNC_ACCESS: "sync.access",
  SYNC_CREATE: "sync.create",
  SYNC_READ: "sync.read",

  ADMIN_ACCESS: "admin.access",
  ADMIN_MANAGE_USERS: "admin.manage_users",
  ADMIN_MANAGE_PERMISSIONS: "admin.manage_permissions",
} as const;

export type PermissionCode =
  (typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES];

/** Route prefix → module access (or read) to enter page */
export const ROUTE_PERMISSIONS: { prefix: string; code: string }[] = [
  { prefix: "/admin", code: PERMISSION_CODES.ADMIN_ACCESS },
  { prefix: "/accounts", code: PERMISSION_CODES.ACCOUNTS_ACCESS },
  { prefix: "/expenses", code: PERMISSION_CODES.EXPENSES_ACCESS },
  { prefix: "/recurring", code: PERMISSION_CODES.RECURRING_ACCESS },
  { prefix: "/investments", code: PERMISSION_CODES.INVESTMENTS_ACCESS },
  { prefix: "/loans", code: PERMISSION_CODES.LOANS_ACCESS },
  { prefix: "/budgets", code: PERMISSION_CODES.BUDGETS_ACCESS },
  { prefix: "/goals", code: PERMISSION_CODES.GOALS_ACCESS },
  { prefix: "/categories", code: PERMISSION_CODES.CATEGORIES_ACCESS },
  { prefix: "/reports", code: PERMISSION_CODES.REPORTS_ACCESS },
  { prefix: "/spaces", code: PERMISSION_CODES.SPACES_ACCESS },
  { prefix: "/ai", code: PERMISSION_CODES.AI_ACCESS },
  { prefix: "/settings", code: PERMISSION_CODES.SETTINGS_ACCESS },
  { prefix: "/profile", code: PERMISSION_CODES.SETTINGS_ACCESS },
  { prefix: "/dashboard", code: PERMISSION_CODES.DASHBOARD_ACCESS },
];

export const NAV_PERMISSIONS: Record<string, string> = {
  "/dashboard": PERMISSION_CODES.DASHBOARD_ACCESS,
  "/accounts": PERMISSION_CODES.ACCOUNTS_ACCESS,
  "/expenses": PERMISSION_CODES.EXPENSES_ACCESS,
  "/recurring": PERMISSION_CODES.RECURRING_ACCESS,
  "/investments": PERMISSION_CODES.INVESTMENTS_ACCESS,
  "/loans": PERMISSION_CODES.LOANS_ACCESS,
  "/budgets": PERMISSION_CODES.BUDGETS_ACCESS,
  "/goals": PERMISSION_CODES.GOALS_ACCESS,
  "/reports": PERMISSION_CODES.REPORTS_ACCESS,
  "/ai": PERMISSION_CODES.AI_ACCESS,
  "/categories": PERMISSION_CODES.CATEGORIES_ACCESS,
  "/settings": PERMISSION_CODES.SETTINGS_ACCESS,
  "/admin": PERMISSION_CODES.ADMIN_ACCESS,
};

export function isTruthyAdmin(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true" ||
    value === "t"
  );
}

export function permissionSatisfied(
  granted: string[] | Set<string>,
  required: string,
): boolean {
  const set = granted instanceof Set ? granted : new Set(granted);
  if (set.has(required)) return true;

  const [module, action] = required.split(".");
  if (!module || !action) return false;

  // Opening a module: access OR any CRUD on that module
  if (action === "access") {
    return CRUD_ACTIONS.some((a) => set.has(perm(module, a)));
  }

  if (
    (CRUD_ACTIONS as readonly string[]).includes(action) &&
    set.has(perm(module, "access"))
  ) {
    return true;
  }

  return false;
}

export function hasPermission(
  user: { is_admin?: boolean; permissions?: string[] } | null | undefined,
  code: string,
): boolean {
  if (!user) return false;
  if (isTruthyAdmin(user.is_admin)) return true;
  const granted = user.permissions || [];
  // Platform admins (admin console) can use every product module.
  if (
    permissionSatisfied(granted, PERMISSION_CODES.ADMIN_ACCESS) &&
    !code.startsWith("admin.")
  ) {
    return true;
  }
  return permissionSatisfied(granted, code);
}

export function canCrud(
  user: { is_admin?: boolean; permissions?: string[] } | null | undefined,
  _module: string,
  _action: CrudAction,
): boolean {
  // Product CRUD is available to every signed-in account.
  // Admin-console routes still use hasPermission / canAccessAdmin.
  return Boolean(user);
}

export function canAccessAdmin(
  user: { is_admin?: boolean; permissions?: string[] } | null | undefined,
): boolean {
  return (
    isTruthyAdmin(user?.is_admin) ||
    hasPermission(user, PERMISSION_CODES.ADMIN_ACCESS) ||
    hasPermission(user, PERMISSION_CODES.ADMIN_MANAGE_USERS) ||
    hasPermission(user, PERMISSION_CODES.ADMIN_MANAGE_PERMISSIONS)
  );
}

export function permissionForPath(pathname: string): string | null {
  const match = ROUTE_PERMISSIONS.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  return match?.code ?? null;
}

export function firstAllowedPath(
  user: { is_admin?: boolean; permissions?: string[] } | null | undefined,
): string {
  const order = [
    "/dashboard",
    "/accounts",
    "/expenses",
    "/settings",
  ] as const;
  for (const href of order) {
    const code = NAV_PERMISSIONS[href];
    if (code && hasPermission(user, code)) return href;
  }
  return "/signin";
}
