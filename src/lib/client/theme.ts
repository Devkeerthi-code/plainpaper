export const THEME_KEY = "pp-theme";
export type ThemeChoice = "light" | "dark";

export function isThemeChoice(v: unknown): v is ThemeChoice {
  return v === "light" || v === "dark";
}

export function currentTheme(): ThemeChoice {
  const set = document.documentElement.dataset.theme;
  return isThemeChoice(set) ? set : "light";
}

/**
 * Saved in a cookie so the server can put data-theme on <html> before first paint (no flash,
 * no inline script), and in localStorage as the user's remembered choice.
 */
export function applyTheme(theme: ThemeChoice): void {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${THEME_KEY}=${theme}; path=/; max-age=31536000; samesite=lax`;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private mode: the cookie still carries the choice.
  }
}

/** Older visits stored the choice only in localStorage; carry it over once. */
export function restoreSavedTheme(): void {
  if (document.cookie.includes(`${THEME_KEY}=`)) return;
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (isThemeChoice(saved)) applyTheme(saved);
  } catch {
    // Storage blocked: stay on the light default.
  }
}
