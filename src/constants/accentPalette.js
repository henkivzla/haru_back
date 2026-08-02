const ACCENT_PALETTE = {
  default: { label: 'Sin color (original)' },
  blue: { label: 'Azul zafiro' },
  emerald: { label: 'Verde esmeralda' },
  violet: { label: 'Violeta' },
  rose: { label: 'Rosa' },
  amber: { label: 'Ámbar' },
  cyan: { label: 'Cian' },
  indigo: { label: 'Índigo' },
  orange: { label: 'Naranja' },
};

const THEME_MODES = ['light', 'dark'];
const DEFAULT_ACCENT_KEY = 'default';
const DEFAULT_THEME_MODE = 'dark';

function isValidAccentKey(value) {
  return typeof value === 'string' && Object.hasOwn(ACCENT_PALETTE, value);
}

function isValidThemeMode(value) {
  return typeof value === 'string' && THEME_MODES.includes(value);
}

function normalizeAccentKey(value) {
  return isValidAccentKey(value) ? value : DEFAULT_ACCENT_KEY;
}

function normalizeThemeMode(value) {
  return isValidThemeMode(value) ? value : DEFAULT_THEME_MODE;
}

function resolveAppearance(user = {}) {
  const isSuperAdmin = user.rol === 'SUPERADMIN';

  if (isSuperAdmin) {
    return {
      themeMode: normalizeThemeMode(user.user_theme_mode || user.theme_mode),
      accentKey: normalizeAccentKey(user.user_accent_key || user.accent_key),
      scope: 'user',
    };
  }

  return {
    themeMode: normalizeThemeMode(user.tienda_theme_mode),
    accentKey: normalizeAccentKey(user.tienda_accent_key),
    scope: 'store',
  };
}

module.exports = {
  ACCENT_PALETTE,
  THEME_MODES,
  DEFAULT_ACCENT_KEY,
  DEFAULT_THEME_MODE,
  isValidAccentKey,
  isValidThemeMode,
  normalizeAccentKey,
  normalizeThemeMode,
  resolveAppearance,
};
