// utils/segmentClassifier.ts
// Utilidad para clasificar colas/skills en segmentos de cliente

import type { CustomerSegment, RawInteraction, StaticConfig } from '../types';

export interface SegmentMapping {
  high_value_queues: string[];
  medium_value_queues: string[];
  low_value_queues: string[];
}

/**
 * Parsea string de colas separadas por comas
 * Ejemplo: "VIP, Premium, Enterprise" → ["VIP", "Premium", "Enterprise"]
 */
export function parseQueueList(input: string): string[] {
  if (!input || input.trim().length === 0) {
    return [];
  }
  
  return input
    .split(',')
    .map(q => q.trim())
    .filter(q => q.length > 0);
}

/**
 * Clasifica una cola según el mapeo proporcionado
 * Usa matching parcial y case-insensitive
 * 
 * Ejemplo:
 * - queue: "VIP_Support" + mapping.high: ["VIP"] → "high"
 * - queue: "Soporte_General_N1" + mapping.medium: ["Soporte_General"] → "medium"
 * - queue: "Retencion" (no match) → "medium" (default)
 */
export function classifyQueue(
  queue: string, 
  mapping: SegmentMapping
): CustomerSegment {
  const normalizedQueue = queue.toLowerCase().trim();
  
  // Buscar en high value
  for (const highQueue of mapping.high_value_queues) {
    const normalizedHigh = highQueue.toLowerCase().trim();
    if (normalizedQueue.includes(normalizedHigh) || normalizedHigh.includes(normalizedQueue)) {
      return 'high';
    }
  }
  
  // Buscar en low value
  for (const lowQueue of mapping.low_value_queues) {
    const normalizedLow = lowQueue.toLowerCase().trim();
    if (normalizedQueue.includes(normalizedLow) || normalizedLow.includes(normalizedQueue)) {
      return 'low';
    }
  }
  
  // Buscar en medium value (explícito)
  for (const mediumQueue of mapping.medium_value_queues) {
    const normalizedMedium = mediumQueue.toLowerCase().trim();
    if (normalizedQueue.includes(normalizedMedium) || normalizedMedium.includes(normalizedQueue)) {
      return 'medium';
    }
  }
  
  // Default: medium (para colas no mapeadas)
  return 'medium';
}

/**
 * Clasifica todas las colas únicas de un conjunto de interacciones
 * Retorna un mapa de cola → segmento
 */
export function classifyAllQueues(
  interactions: RawInteraction[],
  mapping: SegmentMapping
): Map<string, CustomerSegment> {
  const queueSegments = new Map<string, CustomerSegment>();
  
  // Obtener colas únicas
  const uniqueQueues = [...new Set(interactions.map(i => i.queue_skill))];
  
  // Clasificar cada cola
  uniqueQueues.forEach(queue => {
    queueSegments.set(queue, classifyQueue(queue, mapping));
  });
  
  return queueSegments;
}

/**
 * Genera estadísticas de segmentación
 * Retorna conteo, porcentaje y lista de colas por segmento
 */
export function getSegmentationStats(
  interactions: RawInteraction[],
  queueSegments: Map<string, CustomerSegment>
): {
  high: { count: number; percentage: number; queues: string[] };
  medium: { count: number; percentage: number; queues: string[] };
  low: { count: number; percentage: number; queues: string[] };
  total: number;
} {
  const stats = {
    high: { count: 0, percentage: 0, queues: [] as string[] },
    medium: { count: 0, percentage: 0, queues: [] as string[] },
    low: { count: 0, percentage: 0, queues: [] as string[] },
    total: interactions.length
  };
  
  // Contar interacciones por segmento
  interactions.forEach(interaction => {
    const segment = queueSegments.get(interaction.queue_skill) || 'medium';
    stats[segment].count++;
  });
  
  // Calcular porcentajes
  const total = interactions.length;
  if (total > 0) {
    stats.high.percentage = Math.round((stats.high.count / total) * 100);
    stats.medium.percentage = Math.round((stats.medium.count / total) * 100);
    stats.low.percentage = Math.round((stats.low.count / total) * 100);
  }
  
  // Obtener colas por segmento (únicas)
  queueSegments.forEach((segment, queue) => {
    if (!stats[segment].queues.includes(queue)) {
      stats[segment].queues.push(queue);
    }
  });
  
  return stats;
}

/**
 * Valida que el mapeo tenga al menos una cola en algún segmento
 */
export function isValidMapping(mapping: SegmentMapping): boolean {
  return (
    mapping.high_value_queues.length > 0 ||
    mapping.medium_value_queues.length > 0 ||
    mapping.low_value_queues.length > 0
  );
}

/**
 * Crea un mapeo desde StaticConfig
 * Si no hay segment_mapping, retorna mapeo vacío
 */
export function getMappingFromConfig(config: StaticConfig): SegmentMapping | null {
  if (!config.segment_mapping) {
    return null;
  }
  
  return {
    high_value_queues: config.segment_mapping.high_value_queues || [],
    medium_value_queues: config.segment_mapping.medium_value_queues || [],
    low_value_queues: config.segment_mapping.low_value_queues || []
  };
}

/**
 * Obtiene el segmento para una cola específica desde el config
 * Si no hay mapeo, retorna 'medium' por defecto
 */
export function getSegmentForQueue(
  queue: string,
  config: StaticConfig
): CustomerSegment {
  const mapping = getMappingFromConfig(config);
  
  if (!mapping || !isValidMapping(mapping)) {
    return 'medium';
  }
  
  return classifyQueue(queue, mapping);
}

/**
 * Formatea estadísticas para mostrar en UI
 */
export function formatSegmentationSummary(
  stats: ReturnType<typeof getSegmentationStats>
): string {
  const parts: string[] = [];
  
  if (stats.high.count > 0) {
    parts.push(`${stats.high.percentage}% High Value (${stats.high.count} interacciones)`);
  }
  
  if (stats.medium.count > 0) {
    parts.push(`${stats.medium.percentage}% Medium Value (${stats.medium.count} interacciones)`);
  }
  
  if (stats.low.count > 0) {
    parts.push(`${stats.low.percentage}% Low Value (${stats.low.count} interacciones)`);
  }
  
  return parts.join(' | ');
}
