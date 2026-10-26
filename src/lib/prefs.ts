// Only a convenience: remembers the last display name typed on this device.
// No game data or answers are ever stored in the browser.
const KEY = 'wml-couples-name';

export function rememberedName(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function rememberName(name: string) {
  try {
    localStorage.setItem(KEY, name.trim());
  } catch {
    /* storage unavailable: ignore */
  }
}
