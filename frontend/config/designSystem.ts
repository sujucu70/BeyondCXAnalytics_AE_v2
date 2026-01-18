/**
 * v3.15: Sistema de Diseño McKinsey
 *
 * Principios:
 * 1. Minimalismo funcional: Cada elemento debe tener un propósito
 * 2. Jerarquía clara: El ojo sabe dónde ir primero
 * 3. Datos como protagonistas: Los números destacan, no los adornos
 * 4. Color con significado: Solo para indicar status, no para decorar
 * 5. Espacio en blanco: Respira, no satura
 * 6. Consistencia absoluta: Mismo patrón en todas partes
 */

// ============================================
// PALETA DE COLORES (restringida)
// ============================================
export const COLORS = {
  // Colores base
  text: {
    primary: '#1a1a1a',      // Títulos, valores importantes
    secondary: '#4a4a4a',    // Texto normal
    muted: '#6b7280',        // Labels, texto secundario
    inverse: '#ffffff',      // Texto sobre fondos oscuros
  },

  // Fondos
  background: {
    page: '#f9fafb',         // Fondo de página
    card: '#ffffff',         // Fondo de cards
    subtle: '#f3f4f6',       // Fondos de secciones
    hover: '#f9fafb',        // Hover states
  },

  // Bordes
  border: {
    light: '#e5e7eb',        // Bordes sutiles
    medium: '#d1d5db',       // Bordes más visibles
  },

  // Semánticos (ÚNICOS colores con significado)
  status: {
    critical: '#dc2626',     // Rojo - Requiere acción
    warning: '#f59e0b',      // Ámbar - Atención
    success: '#10b981',      // Verde - Óptimo
    info: '#3b82f6',         // Azul - Informativo/Habilitador
    neutral: '#6b7280',      // Gris - Sin datos/NA
  },

  // Tiers de automatización
  tier: {
    automate: '#10b981',     // Verde
    assist: '#06b6d4',       // Cyan
    augment: '#f59e0b',      // Ámbar
    human: '#6b7280',        // Gris
  },

  // Acento (usar con moderación)
  accent: {
    primary: '#2563eb',      // Azul corporativo - CTAs, links
    primaryHover: '#1d4ed8',
  }
};

// Mapeo de colores para clases Tailwind
export const STATUS_CLASSES = {
  critical: {
    text: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    borderTop: 'border-t-red-500',
  },
  warning: {
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    borderTop: 'border-t-amber-500',
  },
  success: {
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    borderTop: 'border-t-emerald-500',
  },
  info: {
    text: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    borderTop: 'border-t-blue-500',
  },
  neutral: {
    text: 'text-gray-500',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    borderTop: 'border-t-gray-400',
  },
};

export const TIER_CLASSES = {
  AUTOMATE: {
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    fill: '#10b981',
  },
  ASSIST: {
    text: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    fill: '#06b6d4',
  },
  AUGMENT: {
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    fill: '#f59e0b',
  },
  'HUMAN-ONLY': {
    text: 'text-gray-500',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    fill: '#6b7280',
  },
};

// ============================================
// TIPOGRAFÍA
// ============================================
export const TYPOGRAPHY = {
  // Tamaños (escala restringida)
  fontSize: {
    xs: 'text-xs',       // 12px - Footnotes, badges
    sm: 'text-sm',       // 14px - Labels, texto secundario
    base: 'text-base',   // 16px - Texto normal
    lg: 'text-lg',       // 18px - Subtítulos
    xl: 'text-xl',       // 20px - Títulos de sección
    '2xl': 'text-2xl',   // 24px - Títulos de página
    '3xl': 'text-3xl',   // 32px - Métricas grandes
    '4xl': 'text-4xl',   // 40px - KPIs hero
  },

  // Pesos
  fontWeight: {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  },
};

// ============================================
// ESPACIADO
// ============================================
export const SPACING = {
  // Padding de cards
  card: {
    sm: 'p-4',       // Cards compactas
    md: 'p-5',       // Cards normales (changed from p-6)
    lg: 'p-6',       // Cards destacadas
  },

  // Gaps entre secciones
  section: {
    sm: 'space-y-4',    // Entre elementos dentro de sección
    md: 'space-y-6',    // Entre secciones
    lg: 'space-y-8',    // Entre bloques principales
  },

  // Grid gaps
  grid: {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  }
};

// ============================================
// COMPONENTES BASE (clases)
// ============================================

// Card base
export const CARD_BASE = 'bg-white rounded-lg border border-gray-200';

// Section header
export const SECTION_HEADER = {
  wrapper: 'flex items-start justify-between pb-3 mb-4 border-b border-gray-200',
  title: {
    h2: 'text-lg font-semibold text-gray-900',
    h3: 'text-base font-semibold text-gray-900',
    h4: 'text-sm font-medium text-gray-800',
  },
  subtitle: 'text-sm text-gray-500 mt-0.5',
};

// Badge
export const BADGE_BASE = 'inline-flex items-center font-medium rounded-md';
export const BADGE_SIZES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

// Metric
export const METRIC_BASE = {
  label: 'text-xs font-medium text-gray-500 uppercase tracking-wide',
  value: {
    sm: 'text-lg font-semibold',
    md: 'text-2xl font-semibold',
    lg: 'text-3xl font-semibold',
    xl: 'text-4xl font-bold',
  },
  unit: 'text-sm text-gray-500',
  comparison: 'text-xs text-gray-400',
};

// Table
export const TABLE_CLASSES = {
  wrapper: 'overflow-x-auto',
  table: 'w-full text-sm text-left',
  thead: 'text-xs text-gray-500 uppercase tracking-wide bg-gray-50',
  th: 'px-4 py-3 font-medium',
  tbody: 'divide-y divide-gray-100',
  tr: 'hover:bg-gray-50 transition-colors',
  td: 'px-4 py-3 text-gray-700',
};

// ============================================
// HELPERS
// ============================================

/**
 * Obtiene las clases de status basado en score
 */
export function getStatusFromScore(score: number | null | undefined): keyof typeof STATUS_CLASSES {
  if (score === null || score === undefined) return 'neutral';
  if (score < 40) return 'critical';
  if (score < 70) return 'warning';
  return 'success';
}

/**
 * Formatea moneda de forma consistente
 */
export function formatCurrency(value: number): string {
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${Math.round(value / 1000)}K`;
  return `€${value.toLocaleString()}`;
}

/**
 * Formatea número grande
 */
export function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return value.toLocaleString();
}

/**
 * Formatea porcentaje
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Combina clases de forma segura (simple cn helper)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
