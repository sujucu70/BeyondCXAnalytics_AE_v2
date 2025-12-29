/**
 * BeyondCX.ai Corporate Color Palette
 * 
 * Colores corporativos de BeyondCX.ai para uso en backgrounds, cards, gradientes
 * Mantiene código de colores verde/amarillo/rojo para claridad en métricas
 */

// ============================================
// COLORES CORPORATIVOS BEYONDCX.AI
// ============================================

export const brandColors = {
  // Colores corporativos principales
  accent1: '#E4E3E3', // Gris claro
  accent2: '#B1B1B0', // Gris medio
  accent3: '#6D84E3', // Azul corporativo
  accent4: '#3F3F3F', // Gris oscuro
  accent5: '#000000', // Negro
  
  // Variantes del azul corporativo para gradientes
  primary: '#6D84E3',
  primaryLight: '#8A9EE8',
  primaryDark: '#5669D0',
  primaryPale: '#E8EBFA',
  
  // Variantes de grises corporativos
  grayLight: '#E4E3E3',
  grayMedium: '#B1B1B0',
  grayDark: '#3F3F3F',
  grayDarkest: '#000000',
};

// ============================================
// CÓDIGO DE COLORES PARA MÉTRICAS (Mantener)
// ============================================

export const statusColors = {
  // Verde para positivo/excelente
  success: '#059669',
  successLight: '#D1FAE5',
  successDark: '#047857',
  
  // Amarillo/Ámbar para warning/oportunidad
  warning: '#D97706',
  warningLight: '#FEF3C7',
  warningDark: '#B45309',
  
  // Rojo para crítico/negativo
  critical: '#DC2626',
  criticalLight: '#FEE2E2',
  criticalDark: '#B91C1C',
  
  // Azul para información
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  infoDark: '#1D4ED8',
};

// ============================================
// NEUTRALES (Usar grises corporativos)
// ============================================

export const neutralColors = {
  darkest: brandColors.accent5,  // #000000
  dark: brandColors.accent4,     // #3F3F3F
  medium: brandColors.accent2,   // #B1B1B0
  light: brandColors.accent1,    // #E4E3E3
  lightest: '#F9FAFB',
  white: '#FFFFFF',
};

// ============================================
// COLORES LEGACY (Para compatibilidad)
// ============================================

export const colors = {
  // Primary Colors (Strategic Use) - Usar corporativo
  primary: {
    blue: brandColors.primary,    // Azul corporativo
    green: statusColors.success,  // Verde para positivo
    red: statusColors.critical,   // Rojo para crítico
    amber: statusColors.warning,  // Ámbar para warning
  },

  // Neutral Colors (Context) - Usar grises corporativos
  neutral: {
    darkest: neutralColors.darkest,
    dark: neutralColors.dark,
    medium: neutralColors.medium,
    light: neutralColors.light,
    lightest: neutralColors.lightest,
    white: neutralColors.white,
  },

  // Semantic Colors
  semantic: {
    success: statusColors.success,
    warning: statusColors.warning,
    error: statusColors.critical,
    info: brandColors.primary,  // Usar azul corporativo
  },

  // Chart Colors (Data Visualization) - Usar corporativo
  chart: {
    primary: brandColors.primary,
    secondary: statusColors.success,
    tertiary: statusColors.warning,
    quaternary: '#8B5CF6',
    quinary: '#EC4899',
  },

  // Heatmap Scale (Performance) - Mantener código de colores
  heatmap: {
    critical: statusColors.critical,    // <70 - Critical
    low: statusColors.warning,          // 70-80 - Below average
    medium: '#FCD34D',                  // 80-85 - Average
    good: '#34D399',                    // 85-90 - Good
    excellent: statusColors.success,    // 90-95 - Excellent
    bestInClass: statusColors.successDark, // 95+ - Best in class
  },

  // Priority Matrix - Usar corporativo + código de colores
  matrix: {
    quickWins: statusColors.success,      // High impact, high feasibility
    strategic: brandColors.primary,       // High impact, low feasibility - Azul corporativo
    consider: statusColors.warning,       // Low impact, high feasibility
    discard: neutralColors.medium,        // Low impact, low feasibility - Gris corporativo
  },

  // Gradients (For hero sections, highlights) - Usar corporativo
  gradients: {
    primary: `from-[${brandColors.primaryDark}] via-[${brandColors.primary}] to-[${brandColors.primaryLight}]`,
    success: 'from-green-500 to-emerald-600',
    warning: 'from-amber-500 to-orange-600',
    info: `from-[${brandColors.primary}] to-cyan-600`,
  },
};

// ============================================
// GRADIENTES CORPORATIVOS
// ============================================

export const gradients = {
  // Gradiente principal con azul corporativo
  primary: `linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.primaryDark} 100%)`,
  
  // Gradiente hero con azul corporativo
  hero: `linear-gradient(135deg, ${brandColors.primaryDark} 0%, ${brandColors.primary} 50%, ${brandColors.primaryLight} 100%)`,
  
  // Gradiente sutil para backgrounds
  subtle: `linear-gradient(135deg, ${brandColors.primaryPale} 0%, ${neutralColors.lightest} 100%)`,
  
  // Gradientes de estado (mantener para claridad)
  success: `linear-gradient(135deg, ${statusColors.success} 0%, ${statusColors.successDark} 100%)`,
  warning: `linear-gradient(135deg, ${statusColors.warning} 0%, ${statusColors.warningDark} 100%)`,
  critical: `linear-gradient(135deg, ${statusColors.critical} 0%, ${statusColors.criticalDark} 100%)`,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Helper function to get color by value (for heatmap)
export const getHeatmapColor = (value: number): string => {
  if (value >= 95) return colors.heatmap.bestInClass;
  if (value >= 90) return colors.heatmap.excellent;
  if (value >= 85) return colors.heatmap.good;
  if (value >= 80) return colors.heatmap.medium;
  if (value >= 70) return colors.heatmap.low;
  return colors.heatmap.critical;
};

// Helper function to get Tailwind class by value
export const getHeatmapTailwindClass = (value: number): string => {
  if (value >= 95) return 'bg-emerald-600 text-white';
  if (value >= 90) return 'bg-emerald-500 text-white';
  if (value >= 85) return 'bg-green-400 text-green-900';
  if (value >= 80) return 'bg-yellow-300 text-yellow-900';
  if (value >= 70) return 'bg-amber-400 text-amber-900';
  return 'bg-red-500 text-white';
};

// Helper function for priority matrix quadrant colors
export const getMatrixQuadrantColor = (impact: number, feasibility: number): string => {
  if (impact >= 5 && feasibility >= 5) return colors.matrix.quickWins;
  if (impact >= 5 && feasibility < 5) return colors.matrix.strategic;
  if (impact < 5 && feasibility >= 5) return colors.matrix.consider;
  return colors.matrix.discard;
};

export default colors;
