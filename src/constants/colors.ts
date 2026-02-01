// Color constants for consistent styling across the app

export const MATERIAL_COLORS = {
  conveyor: {
    primary: '#fa9549',
    selected: '#fff',
    ghost: 'rgba(250, 149, 73, 0.12)',
  },
  pipe: {
    primary: '#3b82f6',
    selected: '#60a5fa',
    ghost: 'rgba(59, 130, 246, 0.12)',
  },
} as const;

export const STATUS_COLORS = {
  optimal: {
    primary: '#10b981',
    background: 'rgba(16, 185, 129, 0.15)',
    glow: '0 0 10px #10b981',
  },
  under: {
    primary: '#ef4444',
    background: 'rgba(239, 68, 68, 0.25)',
    glow: '0 0 12px #ef4444, 0 0 24px rgba(239, 68, 68, 0.5)',
  },
  over: {
    primary: '#eab308',
    background: 'rgba(234, 179, 8, 0.15)',
    glow: '0 0 10px #eab308',
  },
} as const;

export const THEME_COLORS = {
  orange: { header: '#fa9549', body: '#252836', border: '#fa9549', text: '#1a1a2e' },
  purple: { header: '#8b5cf6', body: '#252836', border: '#8b5cf6', text: '#1a1a2e' },
  blue: { header: '#60a5fa', body: '#252836', border: '#60a5fa', text: '#0f172a' },
  dark: { header: '#111827', body: '#0b0f1a', border: '#374151', text: '#e5e7eb' },
  slate: { header: '#64748b', body: '#1f2937', border: '#94a3b8', text: '#0f172a' },
} as const;

export const UI_COLORS = {
  background: '#0f172a',
  surface: '#1a1a2e',
  surfaceLight: '#252836',
  textPrimary: '#e5e7eb',
  textSecondary: '#9ca3af',
  textMuted: '#666',
  border: '#374151',
} as const;

export type MaterialType = keyof typeof MATERIAL_COLORS;
export type StatusType = keyof typeof STATUS_COLORS;
export type ThemeType = keyof typeof THEME_COLORS;
