export type ThemeMode = 'dark' | 'light' | 'hybrid';

export interface ThemePalette {
  mode: ThemeMode;
  isDark: boolean;
  // Backgrounds
  background: string;
  surface: string;
  surfaceLight: string;
  surfaceCard: string;
  surfaceGlass: string;
  surfaceGlassBorder: string;

  // Brand accents
  primary: string;
  primaryLight: string;
  primaryDark: string;
  mint: string;
  mintLight: string;
  mintDark: string;
  cyan: string;
  cyanLight: string;
  cyanDark: string;

  // Supplementary accents
  purple: string;
  pink: string;
  warning: string;
  danger: string;
  info: string;

  // Neutrals / Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  border: string;
  borderLight: string;
  divider: string;

  // Gradients presets
  gradients: {
    primary: readonly [string, string];
    mintCyan: readonly [string, string];
    indigoPurple: readonly [string, string];
    cardGlass: readonly [string, string];
    danger: readonly [string, string];
    warning: readonly [string, string];
    water: readonly [string, string];
    executiveHero: readonly [string, string, string];
    financeHero: readonly [string, string, string];
  };
}

export const THEME_PALETTES: Record<ThemeMode, ThemePalette> = {
  // 1. MODO OSCURO (El que se ve actualmente)
  dark: {
    mode: 'dark',
    isDark: true,
    background: '#0F172A', // Slate 900
    surface: '#1E293B',    // Slate 800
    surfaceLight: '#27354A',
    surfaceCard: 'rgba(30, 41, 59, 0.75)',
    surfaceGlass: 'rgba(30, 41, 59, 0.65)',
    surfaceGlassBorder: 'rgba(255, 255, 255, 0.08)',

    primary: '#4F46E5',    // Indigo
    primaryLight: '#6366F1',
    primaryDark: '#3730A3',
    mint: '#10B981',       // Mint Green
    mintLight: '#34D399',
    mintDark: '#059669',
    cyan: '#06B6D4',       // Cyan
    cyanLight: '#22D3EE',
    cyanDark: '#0891B2',

    purple: '#8B5CF6',
    pink: '#EC4899',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',

    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textDisabled: '#475569',
    border: '#334155',
    borderLight: 'rgba(255, 255, 255, 0.12)',
    divider: 'rgba(255, 255, 255, 0.06)',

    gradients: {
      primary: ['#4F46E5', '#06B6D4'],
      mintCyan: ['#10B981', '#06B6D4'],
      indigoPurple: ['#4F46E5', '#8B5CF6'],
      cardGlass: ['rgba(30, 41, 59, 0.85)', 'rgba(15, 23, 42, 0.75)'],
      danger: ['#EF4444', '#F43F5E'],
      warning: ['#F59E0B', '#D97706'],
      water: ['#06B6D4', '#3B82F6'],
      executiveHero: ['#1F2148', '#171B38', '#12152C'],
      financeHero: ['#1E1B4B', '#1E293B', '#0F172A'],
    },
  },

  // 2. MODO CLARO (Tono claro, muy legible, amigable y de carácter formal/ejecutivo)
  light: {
    mode: 'light',
    isDark: false,
    background: '#F1F5F9', // Gris perla ejecutivo muy amigable y limpio
    surface: '#FFFFFF',    // Blanco puro formal
    surfaceLight: '#E2E8F0', // Gris azulado suave para controles e inputs
    surfaceCard: '#FFFFFF',
    surfaceGlass: 'rgba(255, 255, 255, 0.95)',
    surfaceGlassBorder: '#CBD5E1',

    primary: '#1D4ED8',    // Azul corporativo formal
    primaryLight: '#2563EB',
    primaryDark: '#1E3A8A',
    mint: '#059669',       // Esmeralda formal de alto contraste sobre blanco
    mintLight: '#047857',
    mintDark: '#065F46',
    cyan: '#0284C7',       // Azul cerúleo formal
    cyanLight: '#0369A1',  // Azul zafiro legible para etiquetas, iconos y badges
    cyanDark: '#075985',

    purple: '#6D28D9',
    pink: '#BE185D',
    warning: '#D97706',
    danger: '#DC2626',
    info: '#2563EB',

    textPrimary: '#0F172A',   // Pizarra profundo casi negro (máxima legibilidad)
    textSecondary: '#334155', // Gris pizarra formal muy legible
    textMuted: '#475569',     // Gris medio formal claro y nítido
    textDisabled: '#94A3B8',
    border: '#CBD5E1',
    borderLight: '#CBD5E1',
    divider: '#E2E8F0',

    gradients: {
      primary: ['#1D4ED8', '#0284C7'],
      mintCyan: ['#059669', '#0284C7'],
      indigoPurple: ['#1D4ED8', '#4F46E5'],
      cardGlass: ['#FFFFFF', '#F8FAFC'],
      danger: ['#DC2626', '#E11D48'],
      warning: ['#D97706', '#B45309'],
      water: ['#0284C7', '#2563EB'],
      executiveHero: ['#EFF6FF', '#E0F2FE', '#F8FAFC'],
      financeHero: ['#F8FAFC', '#EFF6FF', '#E2E8F0'],
    },
  },

  // 3. MODO HÍBRIDO (Juvenil, moderno, vibrante y lleno de energía)
  hybrid: {
    mode: 'hybrid',
    isDark: true,
    background: '#170F2E', // Violeta cósmico juvenil
    surface: '#251848',    // Púrpura moderno
    surfaceLight: '#352266', // Lavanda intenso
    surfaceCard: 'rgba(42, 26, 82, 0.85)',
    surfaceGlass: 'rgba(53, 34, 102, 0.75)',
    surfaceGlassBorder: 'rgba(244, 114, 182, 0.30)',

    primary: '#9333EA',    // Violeta eléctrico
    primaryLight: '#C084FC',
    primaryDark: '#6B21A8',
    mint: '#14B8A6',       // Turquesa menta juvenil
    mintLight: '#2DD4BF',
    mintDark: '#0D9488',
    cyan: '#EC4899',       // Magenta / Rosa coral juvenil
    cyanLight: '#F472B6',  // Rosa neón suave para acentos juveniles
    cyanDark: '#DB2777',

    purple: '#A855F7',
    pink: '#FB7185',
    warning: '#FBBF24',
    danger: '#F43F5E',
    info: '#38BDF8',

    textPrimary: '#FDF4FF',
    textSecondary: '#E9D5FF',
    textMuted: '#C4B5FD',
    textDisabled: '#7E22CE',
    border: '#4C1D95',
    borderLight: 'rgba(244, 114, 182, 0.28)',
    divider: 'rgba(192, 132, 252, 0.14)',

    gradients: {
      primary: ['#EC4899', '#8B5CF6'],
      mintCyan: ['#14B8A6', '#38BDF8'],
      indigoPurple: ['#8B5CF6', '#EC4899'],
      cardGlass: ['rgba(53, 34, 102, 0.88)', 'rgba(28, 16, 56, 0.82)'],
      danger: ['#F43F5E', '#FB7185'],
      warning: ['#F59E0B', '#EC4899'],
      water: ['#38BDF8', '#8B5CF6'],
      executiveHero: ['#3B0764', '#4C1D95', '#701A75'],
      financeHero: ['#2E1065', '#4A044E', '#1E1B4B'],
    },
  },
};

// Mutable live colors reference (defaults to dark)
export const colors: ThemePalette = {
  ...THEME_PALETTES.dark,
  gradients: { ...THEME_PALETTES.dark.gradients },
};

export function applyPaletteToColors(mode: ThemeMode): ThemePalette {
  const palette = THEME_PALETTES[mode] || THEME_PALETTES.dark;
  Object.assign(colors, palette, {
    gradients: { ...palette.gradients },
  });
  return palette;
}
