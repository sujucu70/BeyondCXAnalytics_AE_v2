// utils/formatters.ts
// Shared formatting utilities

/**
 * Formats the current date as "Month Year" in Spanish
 * Example: "Enero 2025"
 */
export const formatDateMonthYear = (): string => {
  const now = new Date();
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
};
