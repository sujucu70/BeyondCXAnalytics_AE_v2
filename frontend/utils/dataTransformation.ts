// utils/dataTransformation.ts
// Pipeline de transformación de datos raw a métricas procesadas

import type { RawInteraction } from '../types';

/**
 * Paso 1: Limpieza de Ruido
 * Elimina interacciones con duration < 10 segundos (falsos contactos o errores de sistema)
 */
export function cleanNoiseFromData(interactions: RawInteraction[]): RawInteraction[] {
  const MIN_DURATION_SECONDS = 10;
  
  const cleaned = interactions.filter(interaction => {
    const totalDuration = 
      interaction.duration_talk + 
      interaction.hold_time + 
      interaction.wrap_up_time;
    
    return totalDuration >= MIN_DURATION_SECONDS;
  });
  
  const removedCount = interactions.length - cleaned.length;
  const removedPercentage = ((removedCount / interactions.length) * 100).toFixed(1);
  
  console.log(`🧹 Limpieza de Ruido: ${removedCount} interacciones eliminadas (${removedPercentage}% del total)`);
  console.log(`✅ Interacciones limpias: ${cleaned.length}`);
  
  return cleaned;
}

/**
 * Métricas base calculadas por skill
 */
export interface SkillBaseMetrics {
  skill: string;
  volume: number;                  // Número de interacciones
  aht_mean: number;                // AHT promedio (segundos)
  aht_std: number;                 // Desviación estándar del AHT
  transfer_rate: number;           // Tasa de transferencia (0-100)
  total_cost: number;              // Coste total (€)
  
  // Datos auxiliares para cálculos posteriores
  aht_values: number[];            // Array de todos los AHT para percentiles
}

/**
 * Paso 2: Calcular Métricas Base por Skill
 * Agrupa por skill y calcula volumen, AHT promedio, desviación estándar, tasa de transferencia y coste
 */
export function calculateSkillBaseMetrics(
  interactions: RawInteraction[],
  costPerHour: number
): SkillBaseMetrics[] {
  const COST_PER_SECOND = costPerHour / 3600;
  
  // Agrupar por skill
  const skillGroups = new Map<string, RawInteraction[]>();
  
  interactions.forEach(interaction => {
    const skill = interaction.queue_skill;
    if (!skillGroups.has(skill)) {
      skillGroups.set(skill, []);
    }
    skillGroups.get(skill)!.push(interaction);
  });
  
  // Calcular métricas por skill
  const metrics: SkillBaseMetrics[] = [];
  
  skillGroups.forEach((skillInteractions, skill) => {
    const volume = skillInteractions.length;
    
    // Calcular AHT para cada interacción
    const ahtValues = skillInteractions.map(i => 
      i.duration_talk + i.hold_time + i.wrap_up_time
    );
    
    // AHT promedio
    const ahtMean = ahtValues.reduce((sum, val) => sum + val, 0) / volume;
    
    // Desviación estándar del AHT
    const variance = ahtValues.reduce((sum, val) => 
      sum + Math.pow(val - ahtMean, 2), 0
    ) / volume;
    const ahtStd = Math.sqrt(variance);
    
    // Tasa de transferencia
    const transferCount = skillInteractions.filter(i => i.transfer_flag).length;
    const transferRate = (transferCount / volume) * 100;
    
    // Coste total
    const totalCost = ahtValues.reduce((sum, aht) => 
      sum + (aht * COST_PER_SECOND), 0
    );
    
    metrics.push({
      skill,
      volume,
      aht_mean: ahtMean,
      aht_std: ahtStd,
      transfer_rate: transferRate,
      total_cost: totalCost,
      aht_values: ahtValues
    });
  });
  
  // Ordenar por volumen descendente
  metrics.sort((a, b) => b.volume - a.volume);
  
  console.log(`📊 Métricas Base calculadas para ${metrics.length} skills`);
  
  return metrics;
}

/**
 * Dimensiones transformadas para Agentic Readiness Score
 */
export interface SkillDimensions {
  skill: string;
  volume: number;
  
  // Dimensión 1: Predictibilidad (0-10)
  predictability_score: number;
  predictability_cv: number;       // Coeficiente de Variación (para referencia)
  
  // Dimensión 2: Complejidad Inversa (0-10)
  complexity_inverse_score: number;
  complexity_transfer_rate: number; // Tasa de transferencia (para referencia)
  
  // Dimensión 3: Repetitividad/Impacto (0-10)
  repetitivity_score: number;
  
  // Datos auxiliares
  aht_mean: number;
  total_cost: number;
}

/**
 * Paso 3: Transformar Métricas Base a Dimensiones
 * Aplica las fórmulas de normalización para obtener scores 0-10
 */
export function transformToDimensions(
  baseMetrics: SkillBaseMetrics[]
): SkillDimensions[] {
  return baseMetrics.map(metric => {
    // Dimensión 1: Predictibilidad (Proxy: Variabilidad del AHT)
    // CV = desviación estándar / media
    const cv = metric.aht_std / metric.aht_mean;
    
    // Normalización: CV <= 0.3 → 10, CV >= 1.5 → 0
    // Fórmula: MAX(0, MIN(10, 10 - ((CV - 0.3) / 1.2 * 10)))
    const predictabilityScore = Math.max(0, Math.min(10, 
      10 - ((cv - 0.3) / 1.2 * 10)
    ));
    
    // Dimensión 2: Complejidad Inversa (Proxy: Tasa de Transferencia)
    // T = tasa de transferencia (%)
    const transferRate = metric.transfer_rate;
    
    // Normalización: T <= 5% → 10, T >= 30% → 0
    // Fórmula: MAX(0, MIN(10, 10 - ((T - 0.05) / 0.25 * 10)))
    const complexityInverseScore = Math.max(0, Math.min(10,
      10 - ((transferRate / 100 - 0.05) / 0.25 * 10)
    ));
    
    // Dimensión 3: Repetitividad/Impacto (Proxy: Volumen)
    // Normalización fija: > 5,000 llamadas/mes = 10, < 100 = 0
    let repetitivityScore: number;
    if (metric.volume >= 5000) {
      repetitivityScore = 10;
    } else if (metric.volume <= 100) {
      repetitivityScore = 0;
    } else {
      // Interpolación lineal entre 100 y 5000
      repetitivityScore = ((metric.volume - 100) / (5000 - 100)) * 10;
    }
    
    return {
      skill: metric.skill,
      volume: metric.volume,
      predictability_score: Math.round(predictabilityScore * 10) / 10, // 1 decimal
      predictability_cv: Math.round(cv * 100) / 100, // 2 decimales
      complexity_inverse_score: Math.round(complexityInverseScore * 10) / 10,
      complexity_transfer_rate: Math.round(transferRate * 10) / 10,
      repetitivity_score: Math.round(repetitivityScore * 10) / 10,
      aht_mean: Math.round(metric.aht_mean),
      total_cost: Math.round(metric.total_cost)
    };
  });
}

/**
 * Resultado final con Agentic Readiness Score
 */
export interface SkillAgenticReadiness extends SkillDimensions {
  agentic_readiness_score: number;  // 0-10
  readiness_category: 'automate_now' | 'assist_copilot' | 'optimize_first';
  readiness_label: string;
}

/**
 * Paso 4: Calcular Agentic Readiness Score
 * Promedio ponderado de las 3 dimensiones
 */
export function calculateAgenticReadinessScore(
  dimensions: SkillDimensions[],
  weights?: { predictability: number; complexity: number; repetitivity: number }
): SkillAgenticReadiness[] {
  // Pesos por defecto (ajustables)
  const w = weights || {
    predictability: 0.40,   // 40% - Más importante
    complexity: 0.35,       // 35%
    repetitivity: 0.25      // 25%
  };
  
  return dimensions.map(dim => {
    // Promedio ponderado
    const score = 
      dim.predictability_score * w.predictability +
      dim.complexity_inverse_score * w.complexity +
      dim.repetitivity_score * w.repetitivity;
    
    // Categorizar
    let category: 'automate_now' | 'assist_copilot' | 'optimize_first';
    let label: string;
    
    if (score >= 8.0) {
      category = 'automate_now';
      label = '🟢 Automate Now';
    } else if (score >= 5.0) {
      category = 'assist_copilot';
      label = '🟡 Assist / Copilot';
    } else {
      category = 'optimize_first';
      label = '🔴 Optimize First';
    }
    
    return {
      ...dim,
      agentic_readiness_score: Math.round(score * 10) / 10, // 1 decimal
      readiness_category: category,
      readiness_label: label
    };
  });
}

/**
 * Pipeline completo: Raw Data → Agentic Readiness Score
 */
export function transformRawDataToAgenticReadiness(
  rawInteractions: RawInteraction[],
  costPerHour: number,
  weights?: { predictability: number; complexity: number; repetitivity: number }
): SkillAgenticReadiness[] {
  console.log(`🚀 Iniciando pipeline de transformación con ${rawInteractions.length} interacciones...`);
  
  // Paso 1: Limpieza de ruido
  const cleanedData = cleanNoiseFromData(rawInteractions);
  
  // Paso 2: Calcular métricas base
  const baseMetrics = calculateSkillBaseMetrics(cleanedData, costPerHour);
  
  // Paso 3: Transformar a dimensiones
  const dimensions = transformToDimensions(baseMetrics);
  
  // Paso 4: Calcular Agentic Readiness Score
  const agenticReadiness = calculateAgenticReadinessScore(dimensions, weights);
  
  console.log(`✅ Pipeline completado: ${agenticReadiness.length} skills procesados`);
  console.log(`📈 Distribución:`);
  const automateCount = agenticReadiness.filter(s => s.readiness_category === 'automate_now').length;
  const assistCount = agenticReadiness.filter(s => s.readiness_category === 'assist_copilot').length;
  const optimizeCount = agenticReadiness.filter(s => s.readiness_category === 'optimize_first').length;
  console.log(`   🟢 Automate Now: ${automateCount} skills`);
  console.log(`   🟡 Assist/Copilot: ${assistCount} skills`);
  console.log(`   🔴 Optimize First: ${optimizeCount} skills`);
  
  return agenticReadiness;
}

/**
 * Utilidad: Generar resumen de estadísticas
 */
export function generateTransformationSummary(
  originalCount: number,
  cleanedCount: number,
  skillsCount: number,
  agenticReadiness: SkillAgenticReadiness[]
): string {
  const removedCount = originalCount - cleanedCount;
  const removedPercentage = originalCount > 0 ? ((removedCount / originalCount) * 100).toFixed(1) : '0';

  const automateCount = agenticReadiness.filter(s => s.readiness_category === 'automate_now').length;
  const assistCount = agenticReadiness.filter(s => s.readiness_category === 'assist_copilot').length;
  const optimizeCount = agenticReadiness.filter(s => s.readiness_category === 'optimize_first').length;

  // Validar que skillsCount no sea 0 para evitar división por cero
  const automatePercent = skillsCount > 0 ? ((automateCount/skillsCount)*100).toFixed(0) : '0';
  const assistPercent = skillsCount > 0 ? ((assistCount/skillsCount)*100).toFixed(0) : '0';
  const optimizePercent = skillsCount > 0 ? ((optimizeCount/skillsCount)*100).toFixed(0) : '0';

  return `
📊 Resumen de Transformación:
   • Interacciones originales: ${originalCount.toLocaleString()}
   • Ruido eliminado: ${removedCount.toLocaleString()} (${removedPercentage}%)
   • Interacciones limpias: ${cleanedCount.toLocaleString()}
   • Skills únicos: ${skillsCount}

🎯 Agentic Readiness:
   • 🟢 Automate Now: ${automateCount} skills (${automatePercent}%)
   • 🟡 Assist/Copilot: ${assistCount} skills (${assistPercent}%)
   • 🔴 Optimize First: ${optimizeCount} skills (${optimizePercent}%)
  `.trim();
}
