export type ThemeChoice = "light" | "dark" | "system";

export const STORAGE_KEY = "expense-tracker-theme";

export function resolveDark(choice: ThemeChoice): boolean {
  if (choice === "dark") return true;
  if (choice === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Apply theme class directly on <html> — outside React's className control */
export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  const isDark = resolveDark(choice);
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
}

export function readStoredTheme(): ThemeChoice {
  const value = localStorage.getItem(STORAGE_KEY);
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

export function persistTheme(choice: ThemeChoice) {
  localStorage.setItem(STORAGE_KEY, choice);
  applyTheme(choice);
}
