/**
 * Generación de análisis con datos reales (no sintéticos)
 */

import type { AnalysisData, Kpi, DimensionAnalysis, HeatmapDataPoint, Opportunity, RoadmapInitiative, EconomicModelData, BenchmarkDataPoint, Finding, Recommendation, TierKey, CustomerSegment, RawInteraction, AgenticReadinessResult, SubFactor, SkillMetrics, DrilldownDataPoint } from '../types';
import { RoadmapPhase } from '../types';
import { BarChartHorizontal, Zap, Target, Brain, Bot, DollarSign, Smile } from 'lucide-react';
import { calculateAgenticReadinessScore, type AgenticReadinessInput } from './agenticReadinessV2';
import { classifyQueue } from './segmentClassifier';

/**
 * Calcular distribución horaria desde interacciones
 * NOTA: Usa interaction_id únicos para consistencia con backend (aggfunc="nunique")
 */
function calculateHourlyDistribution(interactions: RawInteraction[]): { hourly: number[]; off_hours_pct: number; peak_hours: number[] } {
  const hourly = new Array(24).fill(0);

  // Deduplicar por interaction_id para consistencia con backend (nunique)
  const seenIds = new Set<string>();
  let duplicateCount = 0;

  for (const interaction of interactions) {
    // Saltar duplicados de interaction_id
    const id = interaction.interaction_id;
    if (id && seenIds.has(id)) {
      duplicateCount++;
      continue;
    }
    if (id) seenIds.add(id);

    try {
      const date = new Date(interaction.datetime_start);
      if (!isNaN(date.getTime())) {
        const hour = date.getHours();
        hourly[hour]++;
      }
    } catch {
      // Ignorar fechas inválidas
    }
  }

  if (duplicateCount > 0) {
    console.log(`⏰ calculateHourlyDistribution: ${duplicateCount} interaction_ids duplicados ignorados`);
  }

  const total = hourly.reduce((a, b) => a + b, 0);

  // Fuera de horario: 19:00-08:00
  const offHoursVolume = hourly.slice(0, 8).reduce((a, b) => a + b, 0) +
                         hourly.slice(19).reduce((a, b) => a + b, 0);
  const off_hours_pct = total > 0 ? Math.round((offHoursVolume / total) * 100) : 0;

  // Encontrar horas pico (top 3 consecutivas)
  let maxSum = 0;
  let peakStart = 0;
  for (let i = 0; i < 22; i++) {
    const sum = hourly[i] + hourly[i + 1] + hourly[i + 2];
    if (sum > maxSum) {
      maxSum = sum;
      peakStart = i;
    }
  }
  const peak_hours = [peakStart, peakStart + 1, peakStart + 2];

  // Log para debugging
  const hourlyNonZero = hourly.filter(v => v > 0);
  const peakVolume = Math.max(...hourlyNonZero, 1);
  const valleyVolume = Math.min(...hourlyNonZero.filter(v => v > 0), 1);
  console.log(`⏰ Hourly distribution: total=${total}, peak=${peakVolume}, valley=${valleyVolume}, ratio=${(peakVolume/valleyVolume).toFixed(2)}`);

  return { hourly, off_hours_pct, peak_hours };
}

/**
 * Calcular rango de fechas desde interacciones (optimizado para archivos grandes)
 */
function calculateDateRange(interactions: RawInteraction[]): { min: string; max: string } | undefined {
  let minTime = Infinity;
  let maxTime = -Infinity;
  let validCount = 0;

  for (const interaction of interactions) {
    const date = new Date(interaction.datetime_start);
    const time = date.getTime();
    if (!isNaN(time)) {
      validCount++;
      if (time < minTime) minTime = time;
      if (time > maxTime) maxTime = time;
    }
  }

  if (validCount === 0) return undefined;

  return {
    min: new Date(minTime).toISOString().split('T')[0],
    max: new Date(maxTime).toISOString().split('T')[0]
  };
}

/**
 * Generar análisis completo con datos reales
 */
export function generateAnalysisFromRealData(
  tier: TierKey,
  interactions: RawInteraction[],
  costPerHour: number,
  avgCsat: number,
  segmentMapping?: { high_value_queues: string[]; medium_value_queues: string[]; low_value_queues: string[] }
): AnalysisData {
  console.log(`🔄 Generating analysis from ${interactions.length} real interactions`);

  // PASO 0: Detectar si tenemos datos de repeat_call_7d
  const repeatCallTrueCount = interactions.filter(i => i.repeat_call_7d === true).length;
  const repeatCallFalseCount = interactions.filter(i => i.repeat_call_7d === false).length;
  const repeatCallUndefinedCount = interactions.filter(i => i.repeat_call_7d === undefined).length;
  const transferTrueCount = interactions.filter(i => i.transfer_flag === true).length;
  const transferFalseCount = interactions.filter(i => i.transfer_flag === false).length;

  const hasRepeatCallData = repeatCallTrueCount > 0;

  console.log('📞 DETAILED DATA CHECK:');
  console.log(`  - repeat_call_7d TRUE: ${repeatCallTrueCount} (${((repeatCallTrueCount/interactions.length)*100).toFixed(1)}%)`);
  console.log(`  - repeat_call_7d FALSE: ${repeatCallFalseCount} (${((repeatCallFalseCount/interactions.length)*100).toFixed(1)}%)`);
  console.log(`  - repeat_call_7d UNDEFINED: ${repeatCallUndefinedCount}`);
  console.log(`  - transfer_flag TRUE: ${transferTrueCount} (${((transferTrueCount/interactions.length)*100).toFixed(1)}%)`);
  console.log(`  - transfer_flag FALSE: ${transferFalseCount} (${((transferFalseCount/interactions.length)*100).toFixed(1)}%)`);

  // Calcular FCR esperado manualmente
  const fcrRecords = interactions.filter(i => i.transfer_flag !== true && i.repeat_call_7d !== true);
  const expectedFCR = (fcrRecords.length / interactions.length) * 100;
  console.log(`📊 EXPECTED FCR (manual): ${expectedFCR.toFixed(1)}% (${fcrRecords.length}/${interactions.length} calls without transfer AND without repeat)`);

  // Mostrar sample de datos para debugging
  if (interactions.length > 0) {
    console.log('📋 SAMPLE DATA (first 5 rows):', interactions.slice(0, 5).map(i => ({
      id: i.interaction_id?.substring(0, 8),
      transfer_flag: i.transfer_flag,
      repeat_call_7d: i.repeat_call_7d,
      is_abandoned: i.is_abandoned
    })));
  }

  console.log(`📞 Repeat call data: ${repeatCallTrueCount} calls marked as repeat (${hasRepeatCallData ? 'USING repeat_call_7d' : 'NO repeat_call_7d data - FCR = 100% - transfer_rate'})`);

  // PASO 0.5: Calcular rango de fechas
  const dateRange = calculateDateRange(interactions);
  console.log(`📅 Date range: ${dateRange?.min} to ${dateRange?.max}`);

  // PASO 1: Analizar record_status (ya no filtramos, el filtrado se hace internamente en calculateSkillMetrics)
  // Normalizar a uppercase para comparación case-insensitive
  const getStatus = (i: RawInteraction) => (i.record_status || '').toString().toUpperCase().trim();
  const statusCounts = {
    valid: interactions.filter(i => !i.record_status || getStatus(i) === 'VALID').length,
    noise: interactions.filter(i => getStatus(i) === 'NOISE').length,
    zombie: interactions.filter(i => getStatus(i) === 'ZOMBIE').length,
    abandon: interactions.filter(i => getStatus(i) === 'ABANDON').length
  };
  console.log(`📊 Record status breakdown:`, statusCounts);

  // PASO 1.5: Calcular distribución horaria (sobre TODAS las interacciones para ver patrones completos)
  const hourlyDistribution = calculateHourlyDistribution(interactions);
  console.log(`⏰ Off-hours: ${hourlyDistribution.off_hours_pct}%, Peak hours: ${hourlyDistribution.peak_hours.join('-')}h`);

  // PASO 2: Calcular métricas por skill (pasa TODAS las interacciones, el filtrado se hace internamente)
  const skillMetrics = calculateSkillMetrics(interactions, costPerHour);

  console.log(`📊 Calculated metrics for ${skillMetrics.length} skills`);

  // PASO 3: Generar heatmap data con dimensiones
  const heatmapData = generateHeatmapFromMetrics(skillMetrics, avgCsat, segmentMapping);

  // PASO 4: Calcular métricas globales
  // Volumen total: TODAS las interacciones
  const totalInteractions = interactions.length;
  // Volumen válido para AHT: suma de volume_valid de cada skill
  const totalValidInteractions = skillMetrics.reduce((sum, s) => sum + s.volume_valid, 0);

  // AHT promedio: calculado solo sobre interacciones válidas (ponderado por volumen)
  const totalWeightedAHT = skillMetrics.reduce((sum, s) => sum + (s.aht_mean * s.volume_valid), 0);
  const avgAHT = totalValidInteractions > 0 ? Math.round(totalWeightedAHT / totalValidInteractions) : 0;

  // FCR Técnico: 100 - transfer_rate (comparable con benchmarks de industria)
  // Ponderado por volumen de cada skill
  const totalVolumeForFCR = skillMetrics.reduce((sum, s) => sum + s.volume_valid, 0);
  const avgFCR = totalVolumeForFCR > 0
    ? Math.round(skillMetrics.reduce((sum, s) => sum + (s.fcr_tecnico * s.volume_valid), 0) / totalVolumeForFCR)
    : 0;

  // Coste total
  const totalCost = Math.round(skillMetrics.reduce((sum, s) => sum + s.total_cost, 0));

  // KPIs principales
  const summaryKpis: Kpi[] = [
    { label: "Interacciones Totales", value: totalInteractions.toLocaleString('es-ES') },
    { label: "AHT Promedio", value: `${avgAHT}s` },
    { label: "FCR Técnico", value: `${avgFCR}%` },
    { label: "CSAT", value: `${(avgCsat / 20).toFixed(1)}/5` }
  ];
  
  // Health Score basado en métricas reales
  const overallHealthScore = calculateHealthScore(heatmapData);
  
  // Dimensiones (simplificadas para datos reales)
  const dimensions: DimensionAnalysis[] = generateDimensionsFromRealData(
    interactions,
    skillMetrics,
    avgCsat,
    avgAHT,
    hourlyDistribution
  );
  
  // Agentic Readiness Score
  const agenticReadiness = calculateAgenticReadinessFromRealData(skillMetrics);

  // Findings y Recommendations (incluyendo análisis de fuera de horario)
  const findings = generateFindingsFromRealData(skillMetrics, interactions, hourlyDistribution);
  const recommendations = generateRecommendationsFromRealData(skillMetrics, hourlyDistribution, interactions.length);

  // v3.3: Drill-down por Cola + Tipificación - CALCULAR PRIMERO para usar en opportunities y roadmap
  const drilldownData = calculateDrilldownMetrics(interactions, costPerHour);

  // v3.3: Opportunities y Roadmap basados en drilldownData (colas con CV < 75% = automatizables)
  const opportunities = generateOpportunitiesFromDrilldown(drilldownData, costPerHour);

  // Roadmap basado en drilldownData
  const roadmap = generateRoadmapFromDrilldown(drilldownData, costPerHour);

  // Economic Model (v3.10: alineado con TCO del Roadmap)
  const economicModel = generateEconomicModelFromRealData(skillMetrics, costPerHour, roadmap, drilldownData);

  // Benchmark
  const benchmarkData = generateBenchmarkFromRealData(skillMetrics);

  return {
    tier,
    overallHealthScore,
    summaryKpis,
    dimensions,
    heatmapData,
    agenticReadiness,
    findings,
    recommendations,
    opportunities,
    roadmap,
    economicModel,
    benchmarkData,
    dateRange,
    drilldownData
  };
}

/**
 * PASO 2: Calcular métricas base por skill
 *
 * LÓGICA DE FILTRADO POR record_status:
 * - valid: llamadas normales válidas
 * - noise: llamadas < 10 segundos (excluir de AHT, pero suma en volumen/coste)
 * - zombie: llamadas > 3 horas (excluir de AHT, pero suma en volumen/coste)
 * - abandon: cliente cuelga (excluir de AHT, no suma coste conversación, pero ocupa línea)
 *
 * Dashboard calidad/eficiencia: filtrar solo valid + abandon para AHT
 * Cálculos financieros: usar todo (volume, coste total)
 */
interface SkillMetrics {
  skill: string;
  volume: number;           // Total de interacciones (todas)
  volume_valid: number;     // Interacciones válidas para AHT (valid + abandon)
  aht_mean: number;         // AHT "limpio" calculado solo sobre valid (sin noise/zombie/abandon) - para métricas de calidad, CV
  aht_total: number;        // AHT "total" calculado con TODAS las filas (noise/zombie/abandon incluidas) - solo informativo
  aht_benchmark: number;    // AHT "tradicional" (incluye noise, excluye zombie/abandon) - para comparación con benchmarks de industria
  aht_std: number;
  cv_aht: number;
  transfer_rate: number;    // Calculado sobre valid + abandon
  fcr_rate: number;         // FCR Real: (transfer_flag == FALSE) AND (repeat_call_7d == FALSE) - sin recontacto 7 días
  fcr_tecnico: number;      // FCR Técnico: (transfer_flag == FALSE) - solo sin transferencia, comparable con benchmarks de industria
  abandonment_rate: number; // % de abandonos sobre total
  total_cost: number;       // Coste total (todas las interacciones excepto abandon)
  cost_volume: number;      // Volumen usado para calcular coste (non-abandon)
  cpi: number;              // Coste por interacción = total_cost / cost_volume
  hold_time_mean: number;   // Calculado sobre valid
  cv_talk_time: number;
  // Métricas adicionales para debug
  noise_count: number;
  zombie_count: number;
  abandon_count: number;
}

export function calculateSkillMetrics(interactions: RawInteraction[], costPerHour: number): SkillMetrics[] {
  // Agrupar por skill
  const skillGroups = new Map<string, RawInteraction[]>();

  interactions.forEach(i => {
    if (!skillGroups.has(i.queue_skill)) {
      skillGroups.set(i.queue_skill, []);
    }
    skillGroups.get(i.queue_skill)!.push(i);
  });

  // Calcular métricas para cada skill
  const metrics: SkillMetrics[] = [];

  skillGroups.forEach((group, skill) => {
    const volume = group.length;
    if (volume === 0) return;

    // === CÁLCULOS SIMPLES Y DIRECTOS DEL CSV ===

    // Abandonment: DIRECTO del campo is_abandoned del CSV
    const abandon_count = group.filter(i => i.is_abandoned === true).length;
    const abandonment_rate = (abandon_count / volume) * 100;

    // FCR Real: DIRECTO del campo fcr_real_flag del CSV
    // Definición: (transfer_flag == FALSE) AND (repeat_call_7d == FALSE)
    // Esta es la métrica MÁS ESTRICTA - sin transferencia Y sin recontacto en 7 días
    const fcrTrueCount = group.filter(i => i.fcr_real_flag === true).length;
    const fcr_rate = (fcrTrueCount / volume) * 100;

    // Transfer rate: DIRECTO del campo transfer_flag del CSV
    const transfers = group.filter(i => i.transfer_flag === true).length;
    const transfer_rate = (transfers / volume) * 100;

    // FCR Técnico: 100 - transfer_rate
    // Definición: (transfer_flag == FALSE) - solo sin transferencia
    // Esta métrica es COMPARABLE con benchmarks de industria (COPC, Dimension Data)
    // Los benchmarks de industria (~70%) miden FCR sin transferencia, NO sin recontacto
    const fcr_tecnico = 100 - transfer_rate;

    // Separar por record_status para AHT (normalizar a uppercase para comparación case-insensitive)
    const getStatus = (i: RawInteraction) => (i.record_status || '').toString().toUpperCase().trim();
    const noiseRecords = group.filter(i => getStatus(i) === 'NOISE');
    const zombieRecords = group.filter(i => getStatus(i) === 'ZOMBIE');
    const validRecords = group.filter(i => !i.record_status || getStatus(i) === 'VALID');
    // Registros que generan coste (todo excepto abandonos)
    const nonAbandonRecords = group.filter(i => i.is_abandoned !== true);

    const noise_count = noiseRecords.length;
    const zombie_count = zombieRecords.length;

    // AHT se calcula sobre registros 'valid' (excluye noise, zombie)
    const ahtRecords = validRecords;
    const volume_valid = ahtRecords.length;

    let aht_mean = 0;
    let aht_std = 0;
    let cv_aht = 0;
    let hold_time_mean = 0;
    let cv_talk_time = 0;

    if (volume_valid > 0) {
      // AHT = duration_talk + hold_time + wrap_up_time
      const ahts = ahtRecords.map(i => i.duration_talk + i.hold_time + i.wrap_up_time);
      aht_mean = ahts.reduce((sum, v) => sum + v, 0) / volume_valid;
      const aht_variance = ahts.reduce((sum, v) => sum + Math.pow(v - aht_mean, 2), 0) / volume_valid;
      aht_std = Math.sqrt(aht_variance);
      cv_aht = aht_mean > 0 ? aht_std / aht_mean : 0;

      // Talk time CV
      const talkTimes = ahtRecords.map(i => i.duration_talk);
      const talk_mean = talkTimes.reduce((sum, v) => sum + v, 0) / volume_valid;
      const talk_std = Math.sqrt(talkTimes.reduce((sum, v) => sum + Math.pow(v - talk_mean, 2), 0) / volume_valid);
      cv_talk_time = talk_mean > 0 ? talk_std / talk_mean : 0;

      // Hold time promedio
      hold_time_mean = ahtRecords.reduce((sum, i) => sum + i.hold_time, 0) / volume_valid;
    }

    // === AHT BENCHMARK: para comparación con benchmarks de industria ===
    // Incluye NOISE (llamadas cortas son trabajo real), excluye ZOMBIE (errores) y ABANDON (sin handle time)
    // Los benchmarks de industria (COPC, Dimension Data) NO filtran llamadas cortas
    const benchmarkRecords = group.filter(i =>
      getStatus(i) !== 'ZOMBIE' &&
      getStatus(i) !== 'ABANDON' &&
      i.is_abandoned !== true
    );
    const volume_benchmark = benchmarkRecords.length;

    let aht_benchmark = aht_mean; // Fallback al AHT limpio si no hay registros benchmark
    if (volume_benchmark > 0) {
      const benchmarkAhts = benchmarkRecords.map(i => i.duration_talk + i.hold_time + i.wrap_up_time);
      aht_benchmark = benchmarkAhts.reduce((sum, v) => sum + v, 0) / volume_benchmark;
    }

    // === AHT TOTAL: calculado con TODAS las filas (solo informativo) ===
    // Incluye NOISE, ZOMBIE, ABANDON - para comparación con AHT limpio
    let aht_total = 0;
    if (volume > 0) {
      const allAhts = group.map(i => i.duration_talk + i.hold_time + i.wrap_up_time);
      aht_total = allAhts.reduce((sum, v) => sum + v, 0) / volume;
    }

    // === CÁLCULOS FINANCIEROS: usar TODAS las interacciones ===
    // Coste total con productividad efectiva del 70%
    const effectiveProductivity = 0.70;

    // Para el coste, usamos todas las interacciones EXCEPTO abandonos (que no generan coste de conversación)
    // noise y zombie SÍ generan coste (ocupan agente aunque sea poco/mucho tiempo)
    // Usar nonAbandonRecords que ya filtra por is_abandoned y record_status
    const costRecords = nonAbandonRecords;
    const costVolume = costRecords.length;

    // Calcular AHT para coste usando todos los registros que generan coste
    let aht_for_cost = 0;
    if (costVolume > 0) {
      const costAhts = costRecords.map(i => i.duration_talk + i.hold_time + i.wrap_up_time);
      aht_for_cost = costAhts.reduce((sum, v) => sum + v, 0) / costVolume;
    }

    // Coste Real = (AHT en horas × Coste/hora × Volumen) / Productividad Efectiva
    const rawCost = (aht_for_cost / 3600) * costPerHour * costVolume;
    const total_cost = rawCost / effectiveProductivity;

    // CPI = Coste por interacción (usando el volumen correcto)
    const cpi = costVolume > 0 ? total_cost / costVolume : 0;

    metrics.push({
      skill,
      volume,
      volume_valid,
      aht_mean,
      aht_total,  // AHT con TODAS las filas (solo informativo)
      aht_benchmark,
      aht_std,
      cv_aht,
      transfer_rate,
      fcr_rate,
      fcr_tecnico,
      abandonment_rate,
      total_cost,
      cost_volume: costVolume,
      cpi,
      hold_time_mean,
      cv_talk_time,
      noise_count,
      zombie_count,
      abandon_count
    });
  });

  // === DEBUG: Verificar cálculos ===
  const totalVolume = metrics.reduce((sum, m) => sum + m.volume, 0);
  const totalValidVolume = metrics.reduce((sum, m) => sum + m.volume_valid, 0);
  const totalAbandons = metrics.reduce((sum, m) => sum + m.abandon_count, 0);
  const globalAbandonRate = totalVolume > 0 ? (totalAbandons / totalVolume) * 100 : 0;

  // FCR y Transfer rate globales (ponderados por volumen)
  const avgFCRRate = totalVolume > 0
    ? metrics.reduce((sum, m) => sum + m.fcr_rate * m.volume, 0) / totalVolume
    : 0;
  const avgFCRTecnicoRate = totalVolume > 0
    ? metrics.reduce((sum, m) => sum + m.fcr_tecnico * m.volume, 0) / totalVolume
    : 0;
  const avgTransferRate = totalVolume > 0
    ? metrics.reduce((sum, m) => sum + m.transfer_rate * m.volume, 0) / totalVolume
    : 0;

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 MÉTRICAS CALCULADAS POR SKILL');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total skills: ${metrics.length}`);
  console.log(`Total volumen: ${totalVolume}`);
  console.log(`Total abandonos (is_abandoned=TRUE): ${totalAbandons}`);
  console.log('');
  console.log('MÉTRICAS GLOBALES (ponderadas por volumen):');
  console.log(`  Abandonment Rate: ${globalAbandonRate.toFixed(2)}%`);
  console.log(`  FCR Real (sin transfer + sin recontacto 7d): ${avgFCRRate.toFixed(2)}%`);
  console.log(`  FCR Técnico (solo sin transfer, comparable con benchmarks): ${avgFCRTecnicoRate.toFixed(2)}%`);
  console.log(`  Transfer Rate: ${avgTransferRate.toFixed(2)}%`);
  console.log('');
  console.log('Detalle por skill (top 5):');
  metrics.slice(0, 5).forEach(m => {
    console.log(`  ${m.skill}: vol=${m.volume}, abandon=${m.abandon_count} (${m.abandonment_rate.toFixed(1)}%), FCR Real=${m.fcr_rate.toFixed(1)}%, FCR Técnico=${m.fcr_tecnico.toFixed(1)}%, transfer=${m.transfer_rate.toFixed(1)}%`);
  });
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Mostrar detalle del primer skill para debug
  if (metrics[0]) {
    console.log('📋 Sample skill detail:', {
      skill: metrics[0].skill,
      volume: metrics[0].volume,
      volume_valid: metrics[0].volume_valid,
      transfer_rate: `${metrics[0].transfer_rate.toFixed(2)}%`,
      fcr_rate: `${metrics[0].fcr_rate.toFixed(2)}%`,
      abandon_count: metrics[0].abandon_count,
      abandonment_rate: `${metrics[0].abandonment_rate.toFixed(2)}%`
    });
  }

  return metrics.sort((a, b) => b.volume - a.volume); // Ordenar por volumen descendente
}

/**
 * v4.4: Clasificar tier de automatización con datos del heatmap
 *
 * Esta función replica la lógica de clasificarTier() usando los datos
 * disponibles en el heatmap. Acepta parámetros opcionales (fcr, volume)
 * para mayor precisión cuando están disponibles.
 *
 * Se usa en generateDrilldownFromHeatmap() de analysisGenerator.ts para
 * asegurar consistencia entre la ruta fresh (datos completos) y la ruta
 * cached (datos del heatmap).
 *
 * @param score - Agentic Readiness Score (0-10)
 * @param cv - Coeficiente de Variación del AHT como decimal (0.75 = 75%)
 * @param transfer - Tasa de transferencia como decimal (0.20 = 20%)
 * @param fcr - FCR rate como decimal (0.80 = 80%), opcional
 * @param volume - Volumen mensual de interacciones, opcional
 * @returns AgenticTier ('AUTOMATE' | 'ASSIST' | 'AUGMENT' | 'HUMAN-ONLY')
 */
export function clasificarTierSimple(
  score: number,
  cv: number,      // CV como decimal (0.75 = 75%)
  transfer: number, // Transfer como decimal (0.20 = 20%)
  fcr?: number,    // FCR como decimal (0.80 = 80%)
  volume?: number  // Volumen mensual
): import('../types').AgenticTier {
  // RED FLAGS críticos - mismos que clasificarTier() completa
  // CV > 120% o Transfer > 50% son red flags absolutos
  if (cv > 1.20 || transfer > 0.50) {
    return 'HUMAN-ONLY';
  }
  // Volume < 50/mes es red flag si tenemos el dato
  if (volume !== undefined && volume < 50) {
    return 'HUMAN-ONLY';
  }

  // TIER 1: AUTOMATE - requiere métricas óptimas
  // Mismo criterio que clasificarTier(): score >= 7.5, cv <= 0.75, transfer <= 0.20, fcr >= 0.50
  const fcrOk = fcr === undefined || fcr >= 0.50; // Si no tenemos FCR, asumimos OK
  if (score >= 7.5 && cv <= 0.75 && transfer <= 0.20 && fcrOk) {
    return 'AUTOMATE';
  }

  // TIER 2: ASSIST - apto para copilot/asistencia
  if (score >= 5.5 && cv <= 0.90 && transfer <= 0.30) {
    return 'ASSIST';
  }

  // TIER 3: AUGMENT - requiere optimización previa
  if (score >= 3.5) {
    return 'AUGMENT';
  }

  // TIER 4: HUMAN-ONLY - proceso complejo
  return 'HUMAN-ONLY';
}

/**
 * v3.4: Calcular métricas drill-down con nueva fórmula de Agentic Readiness Score
 *
 * SCORE POR COLA (0-10):
 * - Factor 1: PREDICTIBILIDAD (30%) - basado en CV AHT
 * - Factor 2: RESOLUTIVIDAD (25%) - FCR (60%) + Transfer (40%)
 * - Factor 3: VOLUMEN (25%) - basado en volumen mensual
 * - Factor 4: CALIDAD DATOS (10%) - % registros válidos
 * - Factor 5: SIMPLICIDAD (10%) - basado en AHT
 *
 * CLASIFICACIÓN EN TIERS:
 * - AUTOMATE: score >= 7.5, CV <= 75%, transfer <= 20%, FCR >= 50%
 * - ASSIST: score >= 5.5, CV <= 90%, transfer <= 30%
 * - AUGMENT: score >= 3.5
 * - HUMAN-ONLY: score < 3.5 o red flags
 *
 * RED FLAGS (HUMAN-ONLY automático):
 * - CV > 120%
 * - Transfer > 50%
 * - Vol < 50/mes
 * - Valid < 30%
 */
export function calculateDrilldownMetrics(
  interactions: RawInteraction[],
  costPerHour: number
): DrilldownDataPoint[] {
  const effectiveProductivity = 0.70;

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCIÓN: Calcular Score por Cola (nueva fórmula v3.4)
  // ═══════════════════════════════════════════════════════════════════════════
  function calcularScoreCola(
    cv: number,      // CV AHT (0-2+, donde 1 = 100%)
    fcr: number,     // FCR rate (0-1)
    transfer: number, // Transfer rate (0-1)
    vol: number,     // Volumen mensual
    aht: number,     // AHT en segundos
    validPct: number // % registros válidos (0-1)
  ): { score: number; breakdown: import('../types').AgenticScoreBreakdown } {

    // FACTOR 1: PREDICTIBILIDAD (30%) - basado en CV AHT
    let scorePred: number;
    if (cv <= 0.50) {
      scorePred = 10;
    } else if (cv <= 0.65) {
      scorePred = 8 + (0.65 - cv) / 0.15 * 2;
    } else if (cv <= 0.75) {
      scorePred = 6 + (0.75 - cv) / 0.10 * 2;
    } else if (cv <= 0.90) {
      scorePred = 3 + (0.90 - cv) / 0.15 * 3;
    } else if (cv <= 1.10) {
      scorePred = 1 + (1.10 - cv) / 0.20 * 2;
    } else {
      scorePred = Math.max(0, 1 - (cv - 1.10) / 0.50);
    }

    // FACTOR 2: RESOLUTIVIDAD (25%) = FCR (60%) + Transfer (40%)
    let scoreFcr: number;
    if (fcr >= 0.80) {
      scoreFcr = 10;
    } else if (fcr >= 0.70) {
      scoreFcr = 7 + (fcr - 0.70) / 0.10 * 3;
    } else if (fcr >= 0.50) {
      scoreFcr = 4 + (fcr - 0.50) / 0.20 * 3;
    } else if (fcr >= 0.30) {
      scoreFcr = 2 + (fcr - 0.30) / 0.20 * 2;
    } else {
      scoreFcr = fcr / 0.30 * 2;
    }

    let scoreTrans: number;
    if (transfer <= 0.05) {
      scoreTrans = 10;
    } else if (transfer <= 0.15) {
      scoreTrans = 7 + (0.15 - transfer) / 0.10 * 3;
    } else if (transfer <= 0.25) {
      scoreTrans = 4 + (0.25 - transfer) / 0.10 * 3;
    } else if (transfer <= 0.40) {
      scoreTrans = 1 + (0.40 - transfer) / 0.15 * 3;
    } else {
      scoreTrans = Math.max(0, 1 - (transfer - 0.40) / 0.30);
    }

    const scoreResol = scoreFcr * 0.6 + scoreTrans * 0.4;

    // FACTOR 3: VOLUMEN (25%)
    let scoreVol: number;
    if (vol >= 10000) {
      scoreVol = 10;
    } else if (vol >= 5000) {
      scoreVol = 8 + (vol - 5000) / 5000 * 2;
    } else if (vol >= 1000) {
      scoreVol = 5 + (vol - 1000) / 4000 * 3;
    } else if (vol >= 500) {
      scoreVol = 3 + (vol - 500) / 500 * 2;
    } else if (vol >= 100) {
      scoreVol = 1 + (vol - 100) / 400 * 2;
    } else {
      scoreVol = vol / 100;
    }

    // FACTOR 4: CALIDAD DATOS (10%)
    let scoreCal: number;
    if (validPct >= 0.90) {
      scoreCal = 10;
    } else if (validPct >= 0.75) {
      scoreCal = 7 + (validPct - 0.75) / 0.15 * 3;
    } else if (validPct >= 0.50) {
      scoreCal = 4 + (validPct - 0.50) / 0.25 * 3;
    } else {
      scoreCal = validPct / 0.50 * 4;
    }

    // FACTOR 5: SIMPLICIDAD (10%) - basado en AHT
    let scoreSimp: number;
    if (aht <= 180) {
      scoreSimp = 10;
    } else if (aht <= 300) {
      scoreSimp = 8 + (300 - aht) / 120 * 2;
    } else if (aht <= 480) {
      scoreSimp = 5 + (480 - aht) / 180 * 3;
    } else if (aht <= 720) {
      scoreSimp = 2 + (720 - aht) / 240 * 3;
    } else {
      scoreSimp = Math.max(0, 2 - (aht - 720) / 600 * 2);
    }

    // SCORE TOTAL PONDERADO
    const scoreTotal = (
      scorePred * 0.30 +
      scoreResol * 0.25 +
      scoreVol * 0.25 +
      scoreCal * 0.10 +
      scoreSimp * 0.10
    );

    return {
      score: Math.round(scoreTotal * 10) / 10,
      breakdown: {
        predictibilidad: Math.round(scorePred * 10) / 10,
        resolutividad: Math.round(scoreResol * 10) / 10,
        volumen: Math.round(scoreVol * 10) / 10,
        calidadDatos: Math.round(scoreCal * 10) / 10,
        simplicidad: Math.round(scoreSimp * 10) / 10
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCIÓN: Clasificar Tier del Roadmap
  // ═══════════════════════════════════════════════════════════════════════════
  function clasificarTier(
    score: number,
    cv: number,      // CV como decimal (0.75 = 75%)
    transfer: number, // Transfer como decimal (0.20 = 20%)
    fcr: number,     // FCR como decimal (0.80 = 80%)
    vol: number,
    validPct: number
  ): { tier: import('../types').AgenticTier; motivo: string } {

    // RED FLAGS → HUMAN-ONLY automático
    const redFlags: string[] = [];
    if (cv > 1.20) redFlags.push("CV > 120%");
    if (transfer > 0.50) redFlags.push("Transfer > 50%");
    if (vol < 50) redFlags.push("Vol < 50/mes");
    if (validPct < 0.30) redFlags.push("Datos < 30% válidos");

    if (redFlags.length > 0) {
      return {
        tier: 'HUMAN-ONLY',
        motivo: `Red flags: ${redFlags.join(', ')}`
      };
    }

    // TIER 1: AUTOMATE
    if (score >= 7.5 && cv <= 0.75 && transfer <= 0.20 && fcr >= 0.50) {
      return {
        tier: 'AUTOMATE',
        motivo: `Score ${score}, métricas óptimas para automatización`
      };
    }

    // TIER 2: ASSIST
    if (score >= 5.5 && cv <= 0.90 && transfer <= 0.30) {
      return {
        tier: 'ASSIST',
        motivo: `Score ${score}, apto para copilot/asistencia`
      };
    }

    // TIER 3: AUGMENT
    if (score >= 3.5) {
      return {
        tier: 'AUGMENT',
        motivo: `Score ${score}, requiere optimización previa`
      };
    }

    // TIER 4: HUMAN-ONLY
    return {
      tier: 'HUMAN-ONLY',
      motivo: `Score ${score}, proceso complejo para automatización`
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCIÓN: Calcular métricas de un grupo de interacciones
  // ═══════════════════════════════════════════════════════════════════════════
  function calculateQueueMetrics(group: RawInteraction[]): import('../types').OriginalQueueMetrics | null {
    const volume = group.length;
    if (volume < 5) return null;

    // Filtrar solo VALID para cálculo de CV (normalizar a uppercase para comparación case-insensitive)
    const getStatus = (i: RawInteraction) => (i.record_status || '').toString().toUpperCase().trim();
    const validRecords = group.filter(i => !i.record_status || getStatus(i) === 'VALID');
    const volumeValid = validRecords.length;
    if (volumeValid < 3) return null;

    const validPct = volumeValid / volume;

    // AHT y CV sobre registros válidos
    const ahts = validRecords.map(i => i.duration_talk + i.hold_time + i.wrap_up_time);
    const aht_mean = ahts.reduce((sum, v) => sum + v, 0) / volumeValid;
    const aht_variance = ahts.reduce((sum, v) => sum + Math.pow(v - aht_mean, 2), 0) / volumeValid;
    const aht_std = Math.sqrt(aht_variance);
    const cv_aht_decimal = aht_mean > 0 ? aht_std / aht_mean : 1.5; // CV como decimal
    const cv_aht_percent = cv_aht_decimal * 100; // CV como %

    // Transfer y FCR (como decimales para cálculo, como % para display)
    const transfers = group.filter(i => i.transfer_flag === true).length;
    const transfer_decimal = transfers / volume;
    const transfer_percent = transfer_decimal * 100;

    // FCR Real: usa fcr_real_flag del CSV (sin transferencia Y sin recontacto 7d)
    const fcrCount = group.filter(i => i.fcr_real_flag === true).length;
    const fcr_decimal = fcrCount / volume;
    const fcr_percent = fcr_decimal * 100;

    // FCR Técnico: 100 - transfer_rate (comparable con benchmarks de industria)
    const fcr_tecnico_percent = 100 - transfer_percent;

    // Calcular score con nueva fórmula v3.4
    const { score, breakdown } = calcularScoreCola(
      cv_aht_decimal,
      fcr_decimal,
      transfer_decimal,
      volume,
      aht_mean,
      validPct
    );

    // Clasificar tier
    const { tier, motivo } = clasificarTier(
      score,
      cv_aht_decimal,
      transfer_decimal,
      fcr_decimal,
      volume,
      validPct
    );

    // v4.2: Convertir volumen de 11 meses a anual para el coste
    const annualVolume = (volume / 11) * 12;  // 11 meses → anual
    const annualCost = Math.round((aht_mean / 3600) * costPerHour * annualVolume / effectiveProductivity);

    return {
      original_queue_id: '', // Se asigna después
      volume,
      volumeValid,
      aht_mean: Math.round(aht_mean),
      cv_aht: Math.round(cv_aht_percent * 10) / 10,
      transfer_rate: Math.round(transfer_percent * 10) / 10,
      fcr_rate: Math.round(fcr_percent * 10) / 10,
      fcr_tecnico: Math.round(fcr_tecnico_percent * 10) / 10,  // FCR Técnico para consistencia con Summary
      agenticScore: score,
      scoreBreakdown: breakdown,
      tier,
      tierMotivo: motivo,
      isPriorityCandidate: tier === 'AUTOMATE',
      annualCost
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 1: Agrupar por queue_skill (nivel estratégico)
  // ═══════════════════════════════════════════════════════════════════════════
  const skillGroups = new Map<string, RawInteraction[]>();
  for (const interaction of interactions) {
    const skill = interaction.queue_skill;
    if (!skill) continue;
    if (!skillGroups.has(skill)) {
      skillGroups.set(skill, []);
    }
    skillGroups.get(skill)!.push(interaction);
  }

  console.log(`📊 Drill-down v3.4: ${skillGroups.size} queue_skills encontrados`);

  const drilldownData: DrilldownDataPoint[] = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 2: Para cada queue_skill, agrupar por original_queue_id
  // ═══════════════════════════════════════════════════════════════════════════
  skillGroups.forEach((skillGroup, skill) => {
    if (skillGroup.length < 10) return;

    const queueGroups = new Map<string, RawInteraction[]>();
    for (const interaction of skillGroup) {
      const queueId = interaction.original_queue_id || 'Sin identificar';
      if (!queueGroups.has(queueId)) {
        queueGroups.set(queueId, []);
      }
      queueGroups.get(queueId)!.push(interaction);
    }

    // Calcular métricas para cada original_queue_id
    const originalQueues: import('../types').OriginalQueueMetrics[] = [];
    queueGroups.forEach((queueGroup, queueId) => {
      const metrics = calculateQueueMetrics(queueGroup);
      if (metrics) {
        metrics.original_queue_id = queueId;
        originalQueues.push(metrics);
      }
    });

    if (originalQueues.length === 0) return;

    // Ordenar por score descendente, luego por volumen
    originalQueues.sort((a, b) => {
      if (Math.abs(a.agenticScore - b.agenticScore) > 0.5) {
        return b.agenticScore - a.agenticScore;
      }
      return b.volume - a.volume;
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Calcular métricas agregadas del skill (promedio ponderado por volumen)
    // ═══════════════════════════════════════════════════════════════════════
    const totalVolume = originalQueues.reduce((sum, q) => sum + q.volume, 0);
    const totalVolumeValid = originalQueues.reduce((sum, q) => sum + q.volumeValid, 0);
    const totalCost = originalQueues.reduce((sum, q) => sum + (q.annualCost || 0), 0);

    const avgAht = originalQueues.reduce((sum, q) => sum + q.aht_mean * q.volume, 0) / totalVolume;
    const avgCv = originalQueues.reduce((sum, q) => sum + q.cv_aht * q.volume, 0) / totalVolume;
    const avgTransfer = originalQueues.reduce((sum, q) => sum + q.transfer_rate * q.volume, 0) / totalVolume;
    const avgFcr = originalQueues.reduce((sum, q) => sum + q.fcr_rate * q.volume, 0) / totalVolume;
    const avgFcrTecnico = originalQueues.reduce((sum, q) => sum + q.fcr_tecnico * q.volume, 0) / totalVolume;

    // Score global ponderado por volumen
    const avgScore = originalQueues.reduce((sum, q) => sum + q.agenticScore * q.volume, 0) / totalVolume;

    // Tier predominante (el de mayor volumen)
    const tierCounts = { 'AUTOMATE': 0, 'ASSIST': 0, 'AUGMENT': 0, 'HUMAN-ONLY': 0 };
    originalQueues.forEach(q => {
      tierCounts[q.tier] += q.volume;
    });

    // isPriorityCandidate si hay al menos una cola AUTOMATE
    const hasAutomateQueue = originalQueues.some(q => q.tier === 'AUTOMATE');

    drilldownData.push({
      skill,
      originalQueues,
      volume: totalVolume,
      volumeValid: totalVolumeValid,
      aht_mean: Math.round(avgAht),
      cv_aht: Math.round(avgCv * 10) / 10,
      transfer_rate: Math.round(avgTransfer * 10) / 10,
      fcr_rate: Math.round(avgFcr * 10) / 10,
      fcr_tecnico: Math.round(avgFcrTecnico * 10) / 10,  // FCR Técnico para consistencia
      agenticScore: Math.round(avgScore * 10) / 10,
      isPriorityCandidate: hasAutomateQueue,
      annualCost: totalCost
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 3: Ordenar y log resumen
  // ═══════════════════════════════════════════════════════════════════════════
  drilldownData.sort((a, b) => b.agenticScore - a.agenticScore);

  // Contar tiers
  const allQueues = drilldownData.flatMap(s => s.originalQueues);
  const tierSummary = {
    AUTOMATE: allQueues.filter(q => q.tier === 'AUTOMATE').length,
    ASSIST: allQueues.filter(q => q.tier === 'ASSIST').length,
    AUGMENT: allQueues.filter(q => q.tier === 'AUGMENT').length,
    'HUMAN-ONLY': allQueues.filter(q => q.tier === 'HUMAN-ONLY').length
  };

  console.log(`📊 Drill-down v3.4: ${drilldownData.length} skills, ${allQueues.length} colas`);
  console.log(`🎯 Tiers: AUTOMATE=${tierSummary.AUTOMATE}, ASSIST=${tierSummary.ASSIST}, AUGMENT=${tierSummary.AUGMENT}, HUMAN-ONLY=${tierSummary['HUMAN-ONLY']}`);

  return drilldownData;
}

/**
 * PASO 3: Transformar métricas a dimensiones (0-10)
 */
export function generateHeatmapFromMetrics(
  metrics: SkillMetrics[],
  avgCsat: number,
  segmentMapping?: { high_value_queues: string[]; medium_value_queues: string[]; low_value_queues: string[] }
): HeatmapDataPoint[] {
  console.log('🔍 generateHeatmapFromMetrics called with:', {
    metricsLength: metrics.length,
    firstMetric: metrics[0],
    avgCsat,
    hasSegmentMapping: !!segmentMapping
  });
  
  const result = metrics.map(m => {
    // Dimensión 1: Predictibilidad (CV AHT)
    const predictability = Math.max(0, Math.min(10, 10 - ((m.cv_aht - 0.3) / 1.2 * 10)));
    
    // Dimensión 2: Complejidad Inversa (Transfer Rate)
    const complexity_inverse = Math.max(0, Math.min(10, 10 - ((m.transfer_rate / 100 - 0.05) / 0.25 * 10)));
    
    // Dimensión 3: Repetitividad (Volumen)
    let repetitiveness = 0;
    if (m.volume >= 5000) {
      repetitiveness = 10;
    } else if (m.volume <= 100) {
      repetitiveness = 0;
    } else {
      // Interpolación lineal entre 100 y 5000
      repetitiveness = ((m.volume - 100) / (5000 - 100)) * 10;
    }
    
    // Agentic Readiness Score (promedio ponderado)
    const agentic_readiness = (
      predictability * 0.40 +
      complexity_inverse * 0.35 +
      repetitiveness * 0.25
    );
    
    // Categoría
    let category: 'automate' | 'assist' | 'optimize';
    if (agentic_readiness >= 8.0) {
      category = 'automate';
    } else if (agentic_readiness >= 5.0) {
      category = 'assist';
    } else {
      category = 'optimize';
    }
    
    // Segmentación
    const segment = segmentMapping 
      ? classifyQueue(m.skill, segmentMapping.high_value_queues, segmentMapping.medium_value_queues, segmentMapping.low_value_queues)
      : 'medium' as CustomerSegment;
    
    // Scores de performance (normalizados 0-100)
    // FCR Real: (transfer_flag == FALSE) AND (repeat_call_7d == FALSE)
    // Esta es la métrica más estricta - sin transferencia Y sin recontacto en 7 días
    const fcr_score = Math.round(m.fcr_rate);
    // FCR Técnico: solo sin transferencia (comparable con benchmarks de industria COPC, Dimension Data)
    const fcr_tecnico_score = Math.round(m.fcr_tecnico);
    const aht_score = Math.round(Math.max(0, Math.min(100, 100 - ((m.aht_mean - 240) / 310) * 100)));
    const csat_score = avgCsat;
    const hold_time_score = Math.round(Math.max(0, Math.min(100, 100 - (m.hold_time_mean / 60) * 10)));
    // Transfer rate es el % real de transferencias (NO el complemento)
    const actual_transfer_rate = Math.round(m.transfer_rate);
    // Abandonment rate es el % real de abandonos
    const actual_abandonment_rate = Math.round(m.abandonment_rate * 10) / 10; // 1 decimal

    return {
      skill: m.skill,
      volume: m.volume,
      cost_volume: m.cost_volume,                  // Volumen usado para calcular coste (non-abandon)
      aht_seconds: Math.round(m.aht_mean),
      aht_total: Math.round(m.aht_total),          // AHT con TODAS las filas (solo informativo)
      aht_benchmark: Math.round(m.aht_benchmark),  // AHT tradicional para comparación con benchmarks de industria
      annual_cost: Math.round(m.total_cost),       // Coste calculado con TODOS los registros (noise + zombie + valid)
      cpi: m.cpi,                                  // Coste por interacción (calculado correctamente)
      metrics: {
        fcr: fcr_score,                    // FCR Real (más estricto, con filtro de recontacto 7d)
        fcr_tecnico: fcr_tecnico_score,    // FCR Técnico (comparable con benchmarks industria)
        aht: aht_score,
        csat: csat_score,
        hold_time: hold_time_score,
        transfer_rate: actual_transfer_rate,
        abandonment_rate: actual_abandonment_rate
      },
      automation_readiness: Math.round(agentic_readiness * 10),
      variability: {
        cv_aht: Math.round(m.cv_aht * 100),
        cv_talk_time: Math.round(m.cv_talk_time * 100),
        cv_hold_time: Math.round(m.cv_talk_time * 80), // Aproximación
        transfer_rate: Math.round(m.transfer_rate)
      },
      dimensions: {
        predictability: Math.round(predictability * 10) / 10,
        complexity_inverse: Math.round(complexity_inverse * 10) / 10,
        repetitiveness: Math.round(repetitiveness * 10) / 10
      },
      agentic_readiness: Math.round(agentic_readiness * 10) / 10,
      category,
      segment
    };
  });
  
  console.log('📊 Heatmap data generated from real data:', {
    length: result.length,
    firstItem: result[0],
    objectKeys: result[0] ? Object.keys(result[0]) : [],
    hasMetricsObject: result[0] && typeof result[0].metrics !== 'undefined',
    metricsKeys: result[0] && result[0].metrics ? Object.keys(result[0].metrics) : [],
    firstMetrics: result[0] && result[0].metrics ? result[0].metrics : null,
    automation_readiness: result[0] ? result[0].automation_readiness : null
  });
  
  return result;
}

/**
 * Calcular Health Score global - Nueva fórmula basada en benchmarks de industria
 *
 * PASO 1: Normalización de componentes usando percentiles de industria
 * PASO 2: Ponderación (FCR 35%, Abandono 30%, CSAT Proxy 20%, AHT 15%)
 * PASO 3: Penalizaciones por umbrales críticos
 *
 * Benchmarks de industria (Cross-Industry):
 * - FCR Técnico: P10=85%, P50=68%, P90=50%
 * - Abandono: P10=3%, P50=5%, P90=10%
 * - AHT: P10=240s, P50=380s, P90=540s
 */
function calculateHealthScore(heatmapData: HeatmapDataPoint[]): number {
  if (heatmapData.length === 0) return 50;

  const totalVolume = heatmapData.reduce((sum, d) => sum + d.volume, 0);
  if (totalVolume === 0) return 50;

  // ═══════════════════════════════════════════════════════════════
  // PASO 0: Extraer métricas ponderadas por volumen
  // ═══════════════════════════════════════════════════════════════

  // FCR Técnico (%)
  const fcrTecnico = heatmapData.reduce((sum, d) =>
    sum + (d.metrics?.fcr_tecnico ?? (100 - d.metrics.transfer_rate)) * d.volume, 0) / totalVolume;

  // Abandono (%)
  const abandono = heatmapData.reduce((sum, d) =>
    sum + (d.metrics?.abandonment_rate || 0) * d.volume, 0) / totalVolume;

  // AHT (segundos) - usar aht_seconds (AHT limpio sin noise/zombies)
  const aht = heatmapData.reduce((sum, d) =>
    sum + d.aht_seconds * d.volume, 0) / totalVolume;

  // Transferencia (%)
  const transferencia = heatmapData.reduce((sum, d) =>
    sum + (d.metrics?.transfer_rate || 0) * d.volume, 0) / totalVolume;

  // ═══════════════════════════════════════════════════════════════
  // PASO 1: Normalización de componentes (0-100 score)
  // ═══════════════════════════════════════════════════════════════

  // FCR Técnico: P10=85%, P50=68%, P90=50%
  // Más alto = mejor
  let fcrScore: number;
  if (fcrTecnico >= 85) {
    fcrScore = 95 + 5 * Math.min(1, (fcrTecnico - 85) / 15); // 95-100
  } else if (fcrTecnico >= 68) {
    fcrScore = 50 + 50 * (fcrTecnico - 68) / (85 - 68); // 50-100
  } else if (fcrTecnico >= 50) {
    fcrScore = 20 + 30 * (fcrTecnico - 50) / (68 - 50); // 20-50
  } else {
    fcrScore = Math.max(0, 20 * fcrTecnico / 50); // 0-20
  }

  // Abandono: P10=3%, P50=5%, P90=10%
  // Más bajo = mejor (invertido)
  let abandonoScore: number;
  if (abandono <= 3) {
    abandonoScore = 95 + 5 * Math.max(0, (3 - abandono) / 3); // 95-100
  } else if (abandono <= 5) {
    abandonoScore = 50 + 45 * (5 - abandono) / (5 - 3); // 50-95
  } else if (abandono <= 10) {
    abandonoScore = 20 + 30 * (10 - abandono) / (10 - 5); // 20-50
  } else {
    // Por encima de P90 (crítico): penalización fuerte
    abandonoScore = Math.max(0, 20 - 2 * (abandono - 10)); // 0-20, decrece rápido
  }

  // AHT: P10=240s, P50=380s, P90=540s
  // Más bajo = mejor (invertido)
  // PERO: Si FCR es bajo, AHT bajo puede indicar llamadas rushed (mala calidad)
  let ahtScore: number;
  if (aht <= 240) {
    // Por debajo de P10 (excelente eficiencia)
    // Si FCR > 65%, es genuinamente eficiente; si no, puede ser rushed
    if (fcrTecnico > 65) {
      ahtScore = 95 + 5 * Math.max(0, (240 - aht) / 60); // 95-100
    } else {
      ahtScore = 70; // Cap score si FCR es bajo (posible rushed calls)
    }
  } else if (aht <= 380) {
    ahtScore = 50 + 45 * (380 - aht) / (380 - 240); // 50-95
  } else if (aht <= 540) {
    ahtScore = 20 + 30 * (540 - aht) / (540 - 380); // 20-50
  } else {
    ahtScore = Math.max(0, 20 * (600 - aht) / 60); // 0-20
  }

  // CSAT Proxy: Calculado desde FCR + Abandono
  // Sin datos reales de CSAT, usamos proxy
  const csatProxy = 0.60 * fcrScore + 0.40 * abandonoScore;

  // ═══════════════════════════════════════════════════════════════
  // PASO 2: Aplicar pesos
  // FCR 35% + Abandono 30% + CSAT Proxy 20% + AHT 15%
  // ═══════════════════════════════════════════════════════════════

  const subtotal = (
    fcrScore * 0.35 +
    abandonoScore * 0.30 +
    csatProxy * 0.20 +
    ahtScore * 0.15
  );

  // ═══════════════════════════════════════════════════════════════
  // PASO 3: Calcular penalizaciones
  // ═══════════════════════════════════════════════════════════════

  let penalties = 0;

  // Penalización por abandono crítico (>10%)
  if (abandono > 10) {
    penalties += 10;
  }

  // Penalización por transferencia alta (>20%)
  if (transferencia > 20) {
    penalties += 5;
  }

  // Penalización combo: Abandono alto + FCR bajo
  // Indica problemas sistémicos de capacidad Y resolución
  if (abandono > 8 && fcrTecnico < 78) {
    penalties += 5;
  }

  // ═══════════════════════════════════════════════════════════════
  // PASO 4: Score final
  // ═══════════════════════════════════════════════════════════════

  const finalScore = Math.max(0, Math.min(100, subtotal - penalties));

  // Debug logging
  console.log('📊 Health Score Calculation:', {
    inputs: { fcrTecnico: fcrTecnico.toFixed(1), abandono: abandono.toFixed(1), aht: Math.round(aht), transferencia: transferencia.toFixed(1) },
    scores: { fcrScore: fcrScore.toFixed(1), abandonoScore: abandonoScore.toFixed(1), ahtScore: ahtScore.toFixed(1), csatProxy: csatProxy.toFixed(1) },
    weighted: { subtotal: subtotal.toFixed(1), penalties, final: Math.round(finalScore) }
  });

  return Math.round(finalScore);
}

/**
 * v4.0: Generar 7 dimensiones viables desde datos reales
 * Benchmarks sector aéreo: AHT P50=380s, FCR=70%, Abandono=5%, Ratio P90/P50 saludable<2.0
 */
function generateDimensionsFromRealData(
  interactions: RawInteraction[],
  metrics: SkillMetrics[],
  avgCsat: number,
  avgAHT: number,
  hourlyDistribution: { hourly: number[]; off_hours_pct: number; peak_hours: number[] }
): DimensionAnalysis[] {
  const totalVolume = interactions.length;
  const avgCV = metrics.reduce((sum, m) => sum + m.cv_aht, 0) / metrics.length;
  const avgTransferRate = metrics.reduce((sum, m) => sum + m.transfer_rate, 0) / metrics.length;
  const avgHoldTime = metrics.reduce((sum, m) => sum + m.hold_time_mean, 0) / metrics.length;
  const totalCost = metrics.reduce((sum, m) => sum + m.total_cost, 0);

  // FCR Técnico (100 - transfer_rate, ponderado por volumen) - comparable con benchmarks
  const totalVolumeForFCR = metrics.reduce((sum, m) => sum + m.volume_valid, 0);
  const avgFCR = totalVolumeForFCR > 0
    ? metrics.reduce((sum, m) => sum + (m.fcr_tecnico * m.volume_valid), 0) / totalVolumeForFCR
    : 0;

  // Calcular ratio P90/P50 aproximado desde CV
  const avgRatio = 1 + avgCV * 1.5; // Aproximación: ratio ≈ 1 + 1.5*CV

  // === SCORE EFICIENCIA: Escala basada en ratio P90/P50 ===
  // <1.5 = 100pts, 1.5-2.0 = 70pts, 2.0-2.5 = 50pts, 2.5-3.0 = 30pts, >3.0 = 20pts
  let efficiencyScore: number;
  if (avgRatio < 1.5) efficiencyScore = 100;
  else if (avgRatio < 2.0) efficiencyScore = 70 + (2.0 - avgRatio) * 60; // 70-100
  else if (avgRatio < 2.5) efficiencyScore = 50 + (2.5 - avgRatio) * 40; // 50-70
  else if (avgRatio < 3.0) efficiencyScore = 30 + (3.0 - avgRatio) * 40; // 30-50
  else efficiencyScore = 20;

  // === SCORE VOLUMETRÍA: Basado en % fuera horario y ratio pico/valle ===
  // % fuera horario >30% penaliza, ratio pico/valle >3x penaliza
  const offHoursPct = hourlyDistribution.off_hours_pct;

  // Calcular ratio pico/valle (consistente con backendMapper.ts)
  const hourlyValues = hourlyDistribution.hourly.filter(v => v > 0);
  const peakVolume = hourlyValues.length > 0 ? Math.max(...hourlyValues) : 0;
  const valleyVolume = hourlyValues.length > 0 ? Math.min(...hourlyValues) : 1;
  const peakValleyRatio = valleyVolume > 0 ? peakVolume / valleyVolume : 1;

  // Score volumetría: 100 base, penalizar por fuera de horario y ratio pico/valle
  // NOTA: Fórmulas sincronizadas con backendMapper.ts buildVolumetryDimension()
  let volumetryScore = 100;

  // Penalización por fuera de horario (misma fórmula que backendMapper)
  if (offHoursPct > 30) {
    volumetryScore -= Math.min(40, (offHoursPct - 30) * 2); // -2 pts por cada % sobre 30%
  } else if (offHoursPct > 20) {
    volumetryScore -= (offHoursPct - 20); // -1 pt por cada % entre 20-30%
  }

  // Penalización por ratio pico/valle alto (misma fórmula que backendMapper)
  if (peakValleyRatio > 5) {
    volumetryScore -= 30;
  } else if (peakValleyRatio > 3) {
    volumetryScore -= 20;
  } else if (peakValleyRatio > 2) {
    volumetryScore -= 10;
  }

  volumetryScore = Math.max(0, Math.min(100, Math.round(volumetryScore)));

  // === CPI: Coste por interacción (IDÉNTICO a Executive Summary) ===
  // Usar cost_volume (non-abandon) como denominador
  const totalCostVolume = metrics.reduce((sum, m) => sum + (m.cost_volume || m.volume), 0);
  const totalAnnualCost = metrics.reduce((sum, m) => sum + (m.total_cost || 0), 0);
  // Usar CPI pre-calculado si disponible, sino calcular desde total_cost / cost_volume
  const hasCpiField = metrics.some(m => m.cpi !== undefined && m.cpi > 0);
  const costPerInteraction = hasCpiField
    ? (totalCostVolume > 0
        ? metrics.reduce((sum, m) => sum + (m.cpi || 0) * (m.cost_volume || m.volume), 0) / totalCostVolume
        : 0)
    : (totalCostVolume > 0 ? totalAnnualCost / totalCostVolume : 0);

  // Calcular Agentic Score
  const predictability = Math.max(0, Math.min(10, 10 - ((avgCV - 0.3) / 1.2 * 10)));
  const complexityInverse = Math.max(0, Math.min(10, 10 - (avgTransferRate / 10)));
  const repetitivity = Math.min(10, totalVolume / 500);
  const agenticScore = predictability * 0.30 + complexityInverse * 0.30 + repetitivity * 0.25 + 2.5;

  // Determinar percentil de Eficiencia basado en benchmark sector aéreo (ratio <2.0 saludable)
  const efficiencyPercentile = avgRatio < 2.0 ? 75 : avgRatio < 2.5 ? 50 : avgRatio < 3.0 ? 35 : 20;

  // Determinar percentil de FCR basado en benchmark sector aéreo (70%)
  const fcrPercentile = avgFCR >= 70 ? 75 : avgFCR >= 60 ? 50 : avgFCR >= 50 ? 35 : 20;

  return [
    // 1. VOLUMETRÍA & DISTRIBUCIÓN
    {
      id: 'volumetry_distribution',
      name: 'volumetry_distribution',
      title: 'Volumetría & Distribución',
      score: volumetryScore,
      percentile: offHoursPct <= 20 ? 80 : offHoursPct <= 30 ? 60 : 40,
      summary: `${offHoursPct.toFixed(1)}% fuera de horario. Ratio pico/valle: ${peakValleyRatio.toFixed(1)}x. ${totalVolume.toLocaleString('es-ES')} interacciones totales.`,
      kpi: { label: 'Fuera de Horario', value: `${offHoursPct.toFixed(0)}%` },
      icon: BarChartHorizontal,
      distribution_data: {
        hourly: hourlyDistribution.hourly,
        off_hours_pct: hourlyDistribution.off_hours_pct,
        peak_hours: hourlyDistribution.peak_hours
      }
    },
    // 2. EFICIENCIA OPERATIVA - KPI principal: AHT P50 (industry standard)
    {
      id: 'operational_efficiency',
      name: 'operational_efficiency',
      title: 'Eficiencia Operativa',
      score: Math.round(efficiencyScore),
      percentile: efficiencyPercentile,
      summary: `AHT P50: ${avgAHT}s (benchmark: 300s). Ratio P90/P50: ${avgRatio.toFixed(2)} (benchmark: <2.0). Hold time: ${Math.round(avgHoldTime)}s.`,
      kpi: { label: 'AHT P50', value: `${avgAHT}s` },
      icon: Zap
    },
    // 3. EFECTIVIDAD & RESOLUCIÓN (FCR Técnico = 100 - transfer_rate)
    {
      id: 'effectiveness_resolution',
      name: 'effectiveness_resolution',
      title: 'Efectividad & Resolución',
      score: avgFCR >= 90 ? 100 : avgFCR >= 85 ? 80 : avgFCR >= 80 ? 60 : avgFCR >= 75 ? 40 : 20,
      percentile: fcrPercentile,
      summary: `FCR Técnico: ${avgFCR.toFixed(1)}% (benchmark: 85-90%). Transfer: ${avgTransferRate.toFixed(1)}%.`,
      kpi: { label: 'FCR Técnico', value: `${Math.round(avgFCR)}%` },
      icon: Target
    },
    // 4. COMPLEJIDAD & PREDICTIBILIDAD - KPI principal: CV AHT (industry standard for predictability)
    {
      id: 'complexity_predictability',
      name: 'complexity_predictability',
      title: 'Complejidad & Predictibilidad',
      score: avgCV <= 0.75 ? 100 : avgCV <= 1.0 ? 80 : avgCV <= 1.25 ? 60 : avgCV <= 1.5 ? 40 : 20, // Basado en CV AHT
      percentile: avgCV <= 0.75 ? 75 : avgCV <= 1.0 ? 55 : avgCV <= 1.25 ? 40 : 25,
      summary: `CV AHT: ${(avgCV * 100).toFixed(0)}% (benchmark: <75%). Hold time: ${Math.round(avgHoldTime)}s. ${avgCV <= 0.75 ? 'Alta predictibilidad para WFM.' : avgCV <= 1.0 ? 'Predictibilidad aceptable.' : 'Alta variabilidad, dificulta planificación.'}`,
      kpi: { label: 'CV AHT', value: `${(avgCV * 100).toFixed(0)}%` },
      icon: Brain
    },
    // 5. SATISFACCIÓN - CSAT
    {
      id: 'customer_satisfaction',
      name: 'customer_satisfaction',
      title: 'Satisfacción del Cliente',
      score: avgCsat > 0 ? Math.round(avgCsat) : 0,
      percentile: avgCsat > 0 ? (avgCsat >= 80 ? 70 : avgCsat >= 60 ? 50 : 30) : 0,
      summary: avgCsat > 0
        ? `CSAT: ${avgCsat.toFixed(1)}/100. ${avgCsat >= 80 ? 'Satisfacción alta.' : avgCsat >= 60 ? 'Satisfacción aceptable.' : 'Requiere atención.'}`
        : 'CSAT: No disponible en dataset. Considerar implementar encuestas post-llamada.',
      kpi: { label: 'CSAT', value: avgCsat > 0 ? `${Math.round(avgCsat)}/100` : 'N/A' },
      icon: Smile
    },
    // 6. ECONOMÍA - CPI
    {
      id: 'economy_cpi',
      name: 'economy_cpi',
      title: 'Economía Operacional',
      score: costPerInteraction < 4 ? 85 : costPerInteraction < 5 ? 70 : costPerInteraction < 6 ? 55 : 40,
      percentile: costPerInteraction < 4.5 ? 70 : costPerInteraction < 5.5 ? 50 : 30,
      summary: `CPI: €${costPerInteraction.toFixed(2)} por interacción. Coste anual: €${totalCost.toLocaleString('es-ES')}. Benchmark sector: €5.00 (Fuente: Gartner 2024).`,
      kpi: { label: 'Coste/Interacción', value: `€${costPerInteraction.toFixed(2)}` },
      icon: DollarSign
    },
    // 7. AGENTIC READINESS
    {
      id: 'agentic_readiness',
      name: 'agentic_readiness',
      title: 'Agentic Readiness',
      score: Math.round(agenticScore * 10),
      percentile: agenticScore >= 7 ? 75 : agenticScore >= 5 ? 55 : 35,
      summary: `Score: ${agenticScore.toFixed(1)}/10. ${agenticScore >= 8 ? 'Excelente para automatización.' : agenticScore >= 5 ? 'Candidato para asistencia IA.' : 'Requiere optimización previa.'}`,
      kpi: { label: 'Score', value: `${agenticScore.toFixed(1)}/10` },
      icon: Bot
    }
  ];
}

/**
 * Calcular Agentic Readiness desde datos reales
 * Score = Σ(factor_i × peso_i) con 6 factores únicos
 */
function calculateAgenticReadinessFromRealData(metrics: SkillMetrics[]): AgenticReadinessResult {
  const totalVolume = metrics.reduce((sum, m) => sum + m.volume, 0);
  const avgCV = metrics.reduce((sum, m) => sum + m.cv_aht, 0) / metrics.length;
  const avgCVTalk = metrics.reduce((sum, m) => sum + m.cv_talk_time, 0) / metrics.length;
  const avgTransferRate = metrics.reduce((sum, m) => sum + m.transfer_rate, 0) / metrics.length;
  const totalCost = metrics.reduce((sum, m) => sum + m.total_cost, 0);

  // === 6 FACTORES ÚNICOS ===

  // 1. Predictibilidad (CV AHT) - Peso 25%
  // Score = 10 - (CV_AHT × 10). CV < 30% = Score > 7
  const predictability = Math.max(0, Math.min(10, 10 - (avgCV * 10)));

  // 2. Simplicidad Operativa (Transfer Rate) - Peso 20%
  // Score = 10 - (Transfer / 5). Transfer < 10% = Score > 8
  const complexity_inverse = Math.max(0, Math.min(10, 10 - (avgTransferRate / 5)));

  // 3. Volumen e Impacto - Peso 15%
  // Score lineal: < 100 = 0, 100-5000 interpolación, > 5000 = 10
  let repetitiveness = 0;
  if (totalVolume >= 5000) repetitiveness = 10;
  else if (totalVolume <= 100) repetitiveness = 0;
  else repetitiveness = ((totalVolume - 100) / (5000 - 100)) * 10;

  // 4. Estructuración (CV Talk Time) - Peso 15%
  // Score = 10 - (CV_Talk × 8). Baja variabilidad = alta estructuración
  const estructuracion = Math.max(0, Math.min(10, 10 - (avgCVTalk * 8)));

  // 5. Estabilidad (ratio pico/valle simplificado) - Peso 10%
  // Simplificación: basado en CV general como proxy
  const estabilidad = Math.max(0, Math.min(10, 10 - (avgCV * 5)));

  // 6. ROI Potencial (basado en coste y volumen) - Peso 15%
  // Score = min(10, log10(Coste) - 2) para costes > €100
  const roiPotencial = totalCost > 100
    ? Math.max(0, Math.min(10, (Math.log10(totalCost) - 2) * 2.5))
    : 0;

  // Score final ponderado: (10×0.25)+(5×0.20)+(10×0.15)+(0×0.15)+(10×0.10)+(10×0.15)
  const score = Math.round((
    predictability * 0.25 +
    complexity_inverse * 0.20 +
    repetitiveness * 0.15 +
    estructuracion * 0.15 +
    estabilidad * 0.10 +
    roiPotencial * 0.15
  ) * 10) / 10;

  // Tier basado en score (umbrales actualizados)
  let tier: TierKey;
  if (score >= 6) tier = 'gold';    // Listo para Copilot
  else if (score >= 4) tier = 'silver';  // Optimizar primero
  else tier = 'bronze';  // Requiere gestión humana

  // Sub-factors con descripciones únicas y metodologías específicas
  const sub_factors: SubFactor[] = [
    {
      name: 'predictibilidad',
      displayName: 'Predictibilidad',
      score: Math.round(predictability * 10) / 10,
      weight: 0.25,
      description: `CV AHT: ${Math.round(avgCV * 100)}%. Score = 10 - (CV × 10)`
    },
    {
      name: 'complejidad_inversa',
      displayName: 'Simplicidad Operativa',
      score: Math.round(complexity_inverse * 10) / 10,
      weight: 0.20,
      description: `Transfer rate: ${Math.round(avgTransferRate)}%. Score = 10 - (Transfer / 5)`
    },
    {
      name: 'repetitividad',
      displayName: 'Volumen e Impacto',
      score: Math.round(repetitiveness * 10) / 10,
      weight: 0.15,
      description: `${totalVolume.toLocaleString('es-ES')} interacciones. Escala lineal 100-5000`
    },
    {
      name: 'estructuracion',
      displayName: 'Estructuración',
      score: Math.round(estructuracion * 10) / 10,
      weight: 0.15,
      description: `CV Talk: ${Math.round(avgCVTalk * 100)}%. Score = 10 - (CV_Talk × 8)`
    },
    {
      name: 'estabilidad',
      displayName: 'Estabilidad Temporal',
      score: Math.round(estabilidad * 10) / 10,
      weight: 0.10,
      description: `Basado en variabilidad general. Score = 10 - (CV × 5)`
    },
    {
      name: 'roi_potencial',
      displayName: 'ROI Potencial',
      score: Math.round(roiPotencial * 10) / 10,
      weight: 0.15,
      description: `Coste anual: €${totalCost.toLocaleString('es-ES')}. Score logarítmico`
    }
  ];

  // Interpretation basada en umbrales actualizados
  let interpretation: string;
  if (score >= 6) {
    interpretation = 'Listo para Copilot. Procesos con predictibilidad y simplicidad suficientes para asistencia IA.';
  } else if (score >= 4) {
    interpretation = 'Requiere optimización. Estandarizar procesos y reducir variabilidad antes de implementar IA.';
  } else {
    interpretation = 'Gestión humana recomendada. Procesos complejos o variables que requieren intervención humana.';
  }

  return {
    score,
    sub_factors,
    tier,
    confidence: totalVolume > 1000 ? 'high' as const : totalVolume > 500 ? 'medium' as const : 'low' as const,
    interpretation
  };
}

/**
 * Generar findings desde datos reales - SOLO datos calculados del dataset
 */
function generateFindingsFromRealData(
  metrics: SkillMetrics[],
  interactions: RawInteraction[],
  hourlyDistribution?: { hourly: number[]; off_hours_pct: number; peak_hours: number[] }
): Finding[] {
  const findings: Finding[] = [];
  const totalVolume = interactions.length;

  // Calcular métricas globales
  const avgCV = metrics.reduce((sum, m) => sum + m.cv_aht, 0) / metrics.length;
  const avgTransferRate = metrics.reduce((sum, m) => sum + m.transfer_rate, 0) / metrics.length;
  const avgRatio = 1 + avgCV * 1.5;

  // Calcular abandono real
  const totalAbandoned = metrics.reduce((sum, m) => sum + m.abandon_count, 0);
  const abandonRate = totalVolume > 0 ? (totalAbandoned / totalVolume) * 100 : 0;

  // Finding 0: Alto volumen fuera de horario - oportunidad para agente virtual
  const offHoursPct = hourlyDistribution?.off_hours_pct ?? 0;
  if (offHoursPct > 20) {
    const offHoursVolume = Math.round(totalVolume * offHoursPct / 100);
    findings.push({
      type: offHoursPct > 30 ? 'critical' : 'warning',
      title: 'Alto Volumen Fuera de Horario',
      text: `${offHoursPct.toFixed(0)}% de interacciones fuera de horario (8-19h)`,
      dimensionId: 'volumetry_distribution',
      description: `${offHoursVolume.toLocaleString()} interacciones (${offHoursPct.toFixed(1)}%) ocurren fuera de horario laboral. Oportunidad ideal para implementar agentes virtuales 24/7.`,
      impact: offHoursPct > 30 ? 'high' : 'medium'
    });
  }

  // Finding 1: Ratio P90/P50 si está fuera de benchmark
  if (avgRatio > 2.0) {
    findings.push({
      type: avgRatio > 3.0 ? 'critical' : 'warning',
      title: 'Ratio P90/P50 elevado',
      text: `Ratio P90/P50: ${avgRatio.toFixed(2)}`,
      dimensionId: 'operational_efficiency',
      description: `Ratio P90/P50 de ${avgRatio.toFixed(2)} supera el benchmark de 2.0. Indica alta dispersión en tiempos de gestión.`
    });
  }

  // Finding 2: Variabilidad alta (CV AHT)
  const highVariabilitySkills = metrics.filter(m => m.cv_aht > 0.45);
  if (highVariabilitySkills.length > 0) {
    findings.push({
      type: 'warning',
      title: 'Alta Variabilidad AHT',
      text: `${highVariabilitySkills.length} skills con CV > 45%`,
      dimensionId: 'complexity_predictability',
      description: `${highVariabilitySkills.length} de ${metrics.length} skills muestran CV AHT > 45%, sugiriendo procesos poco estandarizados.`
    });
  }

  // Finding 3: Transferencias altas
  if (avgTransferRate > 15) {
    findings.push({
      type: avgTransferRate > 25 ? 'critical' : 'warning',
      title: 'Tasa de Transferencia',
      text: `Transfer rate: ${avgTransferRate.toFixed(1)}%`,
      dimensionId: 'complexity_predictability',
      description: `Tasa de transferencia promedio de ${avgTransferRate.toFixed(1)}% indica necesidad de capacitación o routing.`
    });
  }

  // Finding 4: Abandono si supera benchmark
  if (abandonRate > 5) {
    findings.push({
      type: abandonRate > 10 ? 'critical' : 'warning',
      title: 'Tasa de Abandono',
      text: `Abandono: ${abandonRate.toFixed(1)}%`,
      dimensionId: 'effectiveness_resolution',
      description: `Tasa de abandono de ${abandonRate.toFixed(1)}% supera el benchmark de 5%. Revisar capacidad y tiempos de espera.`
    });
  }

  // Finding 5: Concentración de volumen (solo si hay suficientes skills)
  if (metrics.length >= 3) {
    const topSkill = metrics[0];
    const topSkillPct = (topSkill.volume / totalVolume) * 100;
    if (topSkillPct > 30) {
      findings.push({
        type: 'info',
        title: 'Concentración de Volumen',
        text: `${topSkill.skill}: ${topSkillPct.toFixed(0)}% del total`,
        dimensionId: 'volumetry_distribution',
        description: `El skill "${topSkill.skill}" concentra ${topSkillPct.toFixed(1)}% del volumen total (${topSkill.volume.toLocaleString()} interacciones).`
      });
    }
  }

  return findings;
}

/**
 * Generar recomendaciones desde datos reales
 */
function generateRecommendationsFromRealData(
  metrics: SkillMetrics[],
  hourlyDistribution?: { hourly: number[]; off_hours_pct: number; peak_hours: number[] },
  totalVolume?: number
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Recomendación prioritaria: Agente virtual para fuera de horario
  const offHoursPct = hourlyDistribution?.off_hours_pct ?? 0;
  const volume = totalVolume ?? metrics.reduce((sum, m) => sum + m.volume, 0);
  if (offHoursPct > 20) {
    const offHoursVolume = Math.round(volume * offHoursPct / 100);
    const estimatedContainment = offHoursPct > 30 ? 60 : 45; // % que puede resolver el bot
    const estimatedSavings = Math.round(offHoursVolume * estimatedContainment / 100);
    recommendations.push({
      priority: 'high',
      title: 'Implementar Agente Virtual 24/7',
      text: `Desplegar agente virtual para atender ${offHoursPct.toFixed(0)}% de interacciones fuera de horario`,
      description: `${offHoursVolume.toLocaleString()} interacciones ocurren fuera de horario laboral (19:00-08:00). Un agente virtual puede resolver ~${estimatedContainment}% de estas consultas automáticamente, liberando recursos humanos y mejorando la experiencia del cliente con atención inmediata 24/7.`,
      dimensionId: 'volumetry_distribution',
      impact: `Potencial de contención: ${estimatedSavings.toLocaleString()} interacciones/período`,
      timeline: '1-3 meses'
    });
  }

  const highVariabilitySkills = metrics.filter(m => m.cv_aht > 0.45);
  if (highVariabilitySkills.length > 0) {
    recommendations.push({
      priority: 'high',
      title: 'Estandarizar Procesos',
      text: `Crear guías y scripts para los ${highVariabilitySkills.length} skills con alta variabilidad`,
      description: `Crear guías y scripts para los ${highVariabilitySkills.length} skills con alta variabilidad.`,
      impact: 'Reducción del 20-30% en AHT'
    });
  }

  const highVolumeSkills = metrics.filter(m => m.volume > 500);
  if (highVolumeSkills.length > 0) {
    recommendations.push({
      priority: 'high',
      title: 'Automatizar Skills de Alto Volumen',
      text: `Implementar bots para los ${highVolumeSkills.length} skills con > 500 interacciones`,
      description: `Implementar bots para los ${highVolumeSkills.length} skills con > 500 interacciones.`,
      impact: 'Ahorro estimado del 40-60%'
    });
  }

  return recommendations;
}

/**
 * v3.3: Generar opportunities desde drilldownData (basado en colas con CV < 75%)
 * Las oportunidades se clasifican en 3 categorías:
 * - Automatizar: Colas con CV < 75% (estables, listas para IA)
 * - Asistir: Colas con CV 75-100% (necesitan copilot)
 * - Optimizar: Colas con CV > 100% (necesitan estandarización primero)
 */
/**
 * v3.5: Calcular ahorro realista usando fórmula TCO por tier
 *
 * Fórmula TCO por tier:
 * - AUTOMATE (Tier 1): 70% containment → ahorro = vol_annual × 0.70 × (CPI_humano - CPI_ia)
 * - ASSIST (Tier 2): 30% efficiency → ahorro = vol_annual × 0.30 × (CPI_humano - CPI_copilot)
 * - AUGMENT (Tier 3): 15% optimization → ahorro = vol_annual × 0.15 × (CPI_humano - CPI_optimizado)
 * - HUMAN-ONLY (Tier 4): 0% → sin ahorro
 *
 * Costes por interacción (CPI):
 * - CPI_humano: Se calcula desde AHT y cost_per_hour (~€4-5/interacción)
 * - CPI_ia: €0.15/interacción (chatbot/IVR)
 * - CPI_copilot: ~60% del CPI humano (agente asistido)
 * - CPI_optimizado: ~85% del CPI humano (mejora marginal)
 */
/**
 * v3.6: Constantes CPI para cálculo de ahorro TCO
 * Valores alineados con metodología Beyond
 */
const CPI_CONFIG = {
  CPI_HUMANO: 2.33,    // €/interacción - coste actual agente humano
  CPI_BOT: 0.15,       // €/interacción - coste bot/automatización
  CPI_ASSIST: 1.50,    // €/interacción - coste con copilot
  CPI_AUGMENT: 2.00,   // €/interacción - coste optimizado
  // Tasas de éxito/contención por tier
  RATE_AUTOMATE: 0.70, // 70% contención en automatización
  RATE_ASSIST: 0.30,   // 30% eficiencia en asistencia
  RATE_AUGMENT: 0.15   // 15% mejora en optimización
};

// Período de datos: el volumen en los datos corresponde a 11 meses, no es mensual
const DATA_PERIOD_MONTHS = 11;

/**
 * v4.2: Calcular ahorro TCO realista usando fórmula explícita con CPI fijos
 * IMPORTANTE: El volumen de los datos corresponde a 11 meses, por lo que:
 * - Primero calculamos volumen mensual: Vol / 11
 * - Luego anualizamos: × 12
 * Fórmulas:
 * - AUTOMATE: (Vol/11) × 12 × 70% × (CPI_humano - CPI_bot)
 * - ASSIST: (Vol/11) × 12 × 30% × (CPI_humano - CPI_assist)
 * - AUGMENT: (Vol/11) × 12 × 15% × (CPI_humano - CPI_augment)
 * - HUMAN-ONLY: 0€
 */
function calculateRealisticSavings(
  volume: number,
  _annualCost: number, // Mantenido para compatibilidad pero no usado
  tier: 'AUTOMATE' | 'ASSIST' | 'AUGMENT' | 'HUMAN-ONLY'
): number {
  if (volume === 0) return 0;

  const { CPI_HUMANO, CPI_BOT, CPI_ASSIST, CPI_AUGMENT, RATE_AUTOMATE, RATE_ASSIST, RATE_AUGMENT } = CPI_CONFIG;

  // Convertir volumen del período (11 meses) a volumen anual
  const annualVolume = (volume / DATA_PERIOD_MONTHS) * 12;

  switch (tier) {
    case 'AUTOMATE':
      // Ahorro = VolAnual × 70% × (CPI_humano - CPI_bot)
      return Math.round(annualVolume * RATE_AUTOMATE * (CPI_HUMANO - CPI_BOT));

    case 'ASSIST':
      // Ahorro = VolAnual × 30% × (CPI_humano - CPI_assist)
      return Math.round(annualVolume * RATE_ASSIST * (CPI_HUMANO - CPI_ASSIST));

    case 'AUGMENT':
      // Ahorro = VolAnual × 15% × (CPI_humano - CPI_augment)
      return Math.round(annualVolume * RATE_AUGMENT * (CPI_HUMANO - CPI_AUGMENT));

    case 'HUMAN-ONLY':
    default:
      return 0;
  }
}

export function generateOpportunitiesFromDrilldown(drilldownData: DrilldownDataPoint[], costPerHour: number): Opportunity[] {
  // v4.3: Top 10 iniciativas por potencial económico (todos los tiers, no solo AUTOMATE)
  // Cada cola = 1 burbuja con su score real y ahorro TCO real según su tier

  // Extraer todas las colas con su skill padre (excluir HUMAN-ONLY, no tienen ahorro)
  const allQueues = drilldownData.flatMap(skill =>
    skill.originalQueues
      .filter(q => q.tier !== 'HUMAN-ONLY')  // HUMAN-ONLY no genera ahorro
      .map(q => ({
        ...q,
        skillName: skill.skill
      }))
  );

  if (allQueues.length === 0) {
    console.warn('⚠️ No hay colas con potencial de ahorro para mostrar en Opportunity Matrix');
    return [];
  }

  // Calcular ahorro TCO por cola individual según su tier
  const queuesWithSavings = allQueues.map(q => {
    const savings = calculateRealisticSavings(q.volume, q.annualCost || 0, q.tier);
    return { ...q, savings };
  });

  // Ordenar por ahorro descendente
  queuesWithSavings.sort((a, b) => b.savings - a.savings);

  // Calcular max savings para escalar impact a 0-10
  const maxSavings = Math.max(...queuesWithSavings.map(q => q.savings), 1);

  // Mapeo de tier a dimensionId y customer_segment
  const tierToDimension: Record<string, string> = {
    'AUTOMATE': 'agentic_readiness',
    'ASSIST': 'effectiveness_resolution',
    'AUGMENT': 'complexity_predictability'
  };
  const tierToSegment: Record<string, CustomerSegment> = {
    'AUTOMATE': 'high',
    'ASSIST': 'medium',
    'AUGMENT': 'low'
  };

  // Generar oportunidades individuales (TOP 10 por potencial económico)
  const opportunities: Opportunity[] = queuesWithSavings
    .slice(0, 10)
    .map((q, idx) => {
      // Impact: ahorro escalado a 0-10
      const impactRaw = (q.savings / maxSavings) * 10;
      const impact = Math.max(1, Math.min(10, Math.round(impactRaw * 10) / 10));

      // Feasibility: agenticScore directo (ya es 0-10)
      const feasibility = Math.round(q.agenticScore * 10) / 10;

      // Nombre con prefijo de tier para claridad
      const tierPrefix = q.tier === 'AUTOMATE' ? '🤖' : q.tier === 'ASSIST' ? '🤝' : '📚';
      const shortName = q.original_queue_id.length > 22
        ? `${tierPrefix} ${q.original_queue_id.substring(0, 19)}...`
        : `${tierPrefix} ${q.original_queue_id}`;

      return {
        id: `opp-${q.tier.toLowerCase()}-${idx + 1}`,
        name: shortName,
        impact,
        feasibility,
        savings: q.savings,
        dimensionId: tierToDimension[q.tier] || 'agentic_readiness',
        customer_segment: tierToSegment[q.tier] || 'medium'
      };
    });

  console.log(`📊 Opportunity Matrix: Top ${opportunities.length} iniciativas por potencial económico (de ${allQueues.length} colas con ahorro)`);

  return opportunities;
}

/**
 * v3.5: Generar roadmap desde drilldownData usando sistema de Tiers
 * Iniciativas estructuradas en 3 fases basadas en clasificación Tier:
 * - Phase 1 (Automate): Colas tier AUTOMATE - implementación IA directa (70% containment)
 * - Phase 2 (Assist): Colas tier ASSIST - copilot y asistencia (30% efficiency)
 * - Phase 3 (Augment): Colas tier AUGMENT/HUMAN-ONLY - estandarización primero (15%)
 */
export function generateRoadmapFromDrilldown(drilldownData: DrilldownDataPoint[], costPerHour: number): RoadmapInitiative[] {
  const initiatives: RoadmapInitiative[] = [];
  let initCounter = 1;

  // Extraer y clasificar todas las colas por TIER
  const allQueues = drilldownData.flatMap(skill =>
    skill.originalQueues.map(q => ({
      ...q,
      skillName: skill.skill
    }))
  );

  // v3.5: Clasificar por TIER
  const automateQueues = allQueues.filter(q => q.tier === 'AUTOMATE');
  const assistQueues = allQueues.filter(q => q.tier === 'ASSIST');
  const augmentQueues = allQueues.filter(q => q.tier === 'AUGMENT');
  const humanQueues = allQueues.filter(q => q.tier === 'HUMAN-ONLY');

  // Calcular métricas por tier
  const automateVolume = automateQueues.reduce((sum, q) => sum + q.volume, 0);
  const automateCost = automateQueues.reduce((sum, q) => sum + (q.annualCost || 0), 0);
  const assistVolume = assistQueues.reduce((sum, q) => sum + q.volume, 0);
  const assistCost = assistQueues.reduce((sum, q) => sum + (q.annualCost || 0), 0);
  const augmentVolume = augmentQueues.reduce((sum, q) => sum + q.volume, 0);
  const augmentCost = augmentQueues.reduce((sum, q) => sum + (q.annualCost || 0), 0);

  // Helper para obtener top skills por volumen
  const getTopSkillNames = (queues: typeof allQueues, limit: number = 3): string[] => {
    const skillVolumes = new Map<string, number>();
    queues.forEach(q => {
      skillVolumes.set(q.skillName, (skillVolumes.get(q.skillName) || 0) + q.volume);
    });
    return Array.from(skillVolumes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name]) => name);
  };

  // ============ PHASE 1: AUTOMATE (Tier AUTOMATE - 70% containment) ============
  if (automateQueues.length > 0) {
    const topSkills = getTopSkillNames(automateQueues);
    const avgScore = automateQueues.reduce((sum, q) => sum + q.agenticScore, 0) / automateQueues.length;
    const avgCv = automateQueues.reduce((sum, q) => sum + q.cv_aht, 0) / automateQueues.length;

    // v3.5: Ahorro REALISTA con TCO
    const realisticSavings = calculateRealisticSavings(automateVolume, automateCost, 'AUTOMATE');

    // Chatbot para colas con score muy alto (>8)
    const highScoreQueues = automateQueues.filter(q => q.agenticScore >= 8);
    if (highScoreQueues.length > 0) {
      const hsVolume = highScoreQueues.reduce((sum, q) => sum + q.volume, 0);
      const hsCost = highScoreQueues.reduce((sum, q) => sum + (q.annualCost || 0), 0);
      const hsSavings = calculateRealisticSavings(hsVolume, hsCost, 'AUTOMATE');

      initiatives.push({
        id: `init-${initCounter++}`,
        name: `Chatbot IA para ${highScoreQueues.length} colas score ≥8`,
        phase: RoadmapPhase.Automate,
        timeline: 'Q1 2026',
        investment: Math.round(hsSavings * 0.3), // Inversión = 30% del ahorro
        resources: ['1x Bot Developer', 'API Integration', 'QA Team'],
        dimensionId: 'agentic_readiness',
        risk: 'low',
        skillsImpacted: getTopSkillNames(highScoreQueues, 2),
        volumeImpacted: hsVolume,
        kpiObjective: `Contener 70% del volumen vía chatbot`,
        rationale: `${highScoreQueues.length} colas tier AUTOMATE con score promedio ${avgScore.toFixed(1)}/10. Métricas óptimas para automatización completa.`,
        savingsDetail: `70% containment × (CPI humano - CPI IA) = ${hsSavings.toLocaleString()}€/año`,
        estimatedSavings: hsSavings,
        resourceHours: 400
      });
    }

    // IVR para resto de colas AUTOMATE
    const otherAutomateQueues = automateQueues.filter(q => q.agenticScore < 8);
    if (otherAutomateQueues.length > 0) {
      const oaVolume = otherAutomateQueues.reduce((sum, q) => sum + q.volume, 0);
      const oaCost = otherAutomateQueues.reduce((sum, q) => sum + (q.annualCost || 0), 0);
      const oaSavings = calculateRealisticSavings(oaVolume, oaCost, 'AUTOMATE');

      initiatives.push({
        id: `init-${initCounter++}`,
        name: `IVR inteligente para ${otherAutomateQueues.length} colas AUTOMATE`,
        phase: RoadmapPhase.Automate,
        timeline: 'Q2 2026',
        investment: Math.round(oaSavings * 0.25),
        resources: ['1x Voice UX Designer', 'Integration Team', 'QA'],
        dimensionId: 'agentic_readiness',
        risk: 'low',
        skillsImpacted: getTopSkillNames(otherAutomateQueues, 2),
        volumeImpacted: oaVolume,
        kpiObjective: `Pre-calificar y desviar 70% a self-service`,
        rationale: `${otherAutomateQueues.length} colas tier AUTOMATE listas para IVR con NLU.`,
        savingsDetail: `70% containment × diferencial CPI = ${oaSavings.toLocaleString()}€/año`,
        estimatedSavings: oaSavings,
        resourceHours: 320
      });
    }
  }

  // ============ PHASE 2: ASSIST (Tier ASSIST - 30% efficiency) ============
  if (assistQueues.length > 0) {
    const topSkills = getTopSkillNames(assistQueues);
    const avgScore = assistQueues.reduce((sum, q) => sum + q.agenticScore, 0) / assistQueues.length;

    // v3.5: Ahorro REALISTA
    const realisticSavings = calculateRealisticSavings(assistVolume, assistCost, 'ASSIST');

    // Knowledge Base con IA
    initiatives.push({
      id: `init-${initCounter++}`,
      name: `Knowledge Base IA para ${assistQueues.length} colas ASSIST`,
      phase: RoadmapPhase.Assist,
      timeline: 'Q2 2026',
      investment: Math.round(realisticSavings * 0.4),
      resources: ['1x PM', 'Content Team', 'AI Developer'],
      dimensionId: 'effectiveness_resolution',
      risk: 'low',
      skillsImpacted: topSkills,
      volumeImpacted: assistVolume,
      kpiObjective: `Reducir AHT 30% con sugerencias IA`,
      rationale: `${assistQueues.length} colas tier ASSIST (score ${avgScore.toFixed(1)}/10) se benefician de copilot contextual.`,
      savingsDetail: `30% efficiency × diferencial CPI = ${realisticSavings.toLocaleString()}€/año`,
      estimatedSavings: realisticSavings,
      resourceHours: 360
    });

    // Copilot para agentes si hay volumen alto
    if (assistVolume > 50000) {
      const copilotSavings = Math.round(realisticSavings * 0.6);
      initiatives.push({
        id: `init-${initCounter++}`,
        name: `Copilot IA para agentes (${topSkills.slice(0, 2).join(', ')})`,
        phase: RoadmapPhase.Assist,
        timeline: 'Q3 2026',
        investment: Math.round(copilotSavings * 0.5),
        resources: ['2x AI Developers', 'QA Team', 'Training'],
        dimensionId: 'effectiveness_resolution',
        risk: 'medium',
        skillsImpacted: topSkills.slice(0, 3),
        volumeImpacted: assistVolume,
        kpiObjective: `Reducir variabilidad y migrar colas a tier AUTOMATE`,
        rationale: `Copilot pre-llena campos, sugiere respuestas y guía al agente para estandarizar.`,
        savingsDetail: `Mejora efficiency 30% en ${assistVolume.toLocaleString()} int/mes`,
        estimatedSavings: copilotSavings,
        resourceHours: 520
      });
    }
  }

  // ============ PHASE 3: AUGMENT (Tier AUGMENT + HUMAN-ONLY - 15%) ============
  const optimizeQueues = [...augmentQueues, ...humanQueues];
  const optimizeVolume = optimizeQueues.reduce((sum, q) => sum + q.volume, 0);
  const optimizeCost = optimizeQueues.reduce((sum, q) => sum + (q.annualCost || 0), 0);

  if (optimizeQueues.length > 0) {
    const topSkills = getTopSkillNames(optimizeQueues);
    const avgScore = optimizeQueues.reduce((sum, q) => sum + q.agenticScore, 0) / optimizeQueues.length;

    // v3.5: Ahorro REALISTA (muy conservador para AUGMENT)
    const realisticSavings = calculateRealisticSavings(optimizeVolume, optimizeCost, 'AUGMENT');

    // Estandarización de procesos
    initiatives.push({
      id: `init-${initCounter++}`,
      name: `Estandarización (${optimizeQueues.length} colas variables)`,
      phase: RoadmapPhase.Augment,
      timeline: 'Q3 2026',
      investment: Math.round(realisticSavings * 0.8),
      resources: ['Process Analyst', 'Training Team', 'QA'],
      dimensionId: 'complexity_predictability',
      risk: 'medium',
      skillsImpacted: topSkills,
      volumeImpacted: optimizeVolume,
      kpiObjective: `Reducir CV para migrar colas a tier ASSIST/AUTOMATE`,
      rationale: `${optimizeQueues.length} colas tier AUGMENT/HUMAN (score ${avgScore.toFixed(1)}/10) requieren rediseño de procesos.`,
      savingsDetail: `15% optimización = ${realisticSavings.toLocaleString()}€/año (conservador)`,
      estimatedSavings: realisticSavings,
      resourceHours: 400
    });

    // Automatización post-estandarización (futuro)
    if (optimizeVolume > 30000) {
      const futureSavings = calculateRealisticSavings(Math.round(optimizeVolume * 0.4), Math.round(optimizeCost * 0.4), 'ASSIST');
      initiatives.push({
        id: `init-${initCounter++}`,
        name: `Automatización post-estandarización`,
        phase: RoadmapPhase.Augment,
        timeline: 'Q1 2027',
        investment: Math.round(futureSavings * 0.5),
        resources: ['Lead AI Engineer', 'Process Team', 'QA'],
        dimensionId: 'agentic_readiness',
        risk: 'medium',
        skillsImpacted: topSkills.slice(0, 2),
        volumeImpacted: Math.round(optimizeVolume * 0.4),
        kpiObjective: `Automatizar 40% del volumen tras estandarización`,
        rationale: `Una vez reducido CV, las colas serán aptas para automatización.`,
        savingsDetail: `Potencial futuro: ${futureSavings.toLocaleString()}€/año`,
        estimatedSavings: futureSavings,
        resourceHours: 480
      });
    }
  }

  return initiatives;
}

/**
 * @deprecated v3.3 - Usar generateOpportunitiesFromDrilldown en su lugar
 * Generar opportunities desde datos reales
 */
function generateOpportunitiesFromRealData(metrics: SkillMetrics[], costPerHour: number): Opportunity[] {
  // Encontrar el máximo ahorro para calcular impacto relativo
  const maxSavings = Math.max(...metrics.map(m => m.total_cost * 0.4), 1);

  return metrics.slice(0, 10).map((m, index) => {
    const potentialSavings = m.total_cost * 0.4; // 40% de ahorro potencial

    // Impacto: relativo al mayor ahorro (escala 1-10)
    const impactRaw = (potentialSavings / maxSavings) * 10;
    const impact = Math.max(3, Math.min(10, Math.round(impactRaw)));

    // Feasibilidad: basada en CV y transfer_rate (baja variabilidad = alta feasibilidad)
    const feasibilityRaw = 10 - (m.cv_aht * 5) - (m.transfer_rate / 10);
    const feasibility = Math.max(3, Math.min(10, Math.round(feasibilityRaw)));

    // Determinar dimensión según características
    let dimensionId: string;
    if (m.cv_aht < 0.3 && m.transfer_rate < 15) {
      dimensionId = 'agentic_readiness'; // Listo para automatizar
    } else if (m.cv_aht < 0.5) {
      dimensionId = 'effectiveness_resolution'; // Puede mejorar con asistencia
    } else {
      dimensionId = 'complexity_predictability'; // Necesita optimización
    }

    // Nombre descriptivo
    const prefix = m.cv_aht < 0.3 && m.transfer_rate < 15
      ? 'Automatizar '
      : m.cv_aht < 0.5
        ? 'Asistir con IA en '
        : 'Optimizar procesos en ';

    return {
      id: `opp-${index + 1}`,
      name: `${prefix}${m.skill}`,
      impact,
      feasibility,
      savings: Math.round(potentialSavings),
      dimensionId,
      customer_segment: 'medium' as CustomerSegment
    };
  });
}

/**
 * Generar roadmap desde opportunities y métricas de skills
 * v3.0: Iniciativas conectadas a skills reales con volumeImpacted, kpiObjective, rationale
 */
function generateRoadmapFromRealData(opportunities: Opportunity[], metrics?: SkillMetrics[]): RoadmapInitiative[] {
  // Ordenar por savings descendente para priorizar
  const sortedOpps = [...opportunities].sort((a, b) => (b.savings || 0) - (a.savings || 0));

  // Crear mapa de métricas por skill para lookup rápido
  const metricsMap = new Map<string, SkillMetrics>();
  if (metrics) {
    for (const m of metrics) {
      metricsMap.set(m.skill.toLowerCase(), m);
    }
  }

  // Helper para obtener métricas de un skill
  const getSkillMetrics = (skillName: string): SkillMetrics | undefined => {
    return metricsMap.get(skillName.toLowerCase()) ||
           Array.from(metricsMap.values()).find(m =>
             m.skill.toLowerCase().includes(skillName.toLowerCase()) ||
             skillName.toLowerCase().includes(m.skill.toLowerCase())
           );
  };

  const initiatives: RoadmapInitiative[] = [];
  let initCounter = 1;

  // WAVE 1: Automate - Skills con alto potencial de automatización
  const wave1Opps = sortedOpps.slice(0, 2);
  for (const opp of wave1Opps) {
    const skillName = opp.name?.replace(/^(Automatizar |Asistir con IA en |Optimizar procesos en )/, '') || `Skill ${initCounter}`;
    const savings = opp.savings || 0;
    const skillMetrics = getSkillMetrics(skillName);
    const volume = skillMetrics?.volume || Math.round(savings / 5);
    const cvAht = skillMetrics?.cv_aht || 50;
    const offHoursPct = skillMetrics?.off_hours_pct || 28;

    // Determinar tipo de iniciativa basado en características del skill
    const isHighVolume = volume > 100000;
    const hasOffHoursOpportunity = offHoursPct > 25;

    initiatives.push({
      id: `init-${initCounter}`,
      name: hasOffHoursOpportunity
        ? `Chatbot consultas ${skillName} (24/7)`
        : `IVR inteligente ${skillName}`,
      phase: RoadmapPhase.Automate,
      timeline: 'Q1 2026',
      investment: Math.round(savings * 0.3),
      resources: hasOffHoursOpportunity
        ? ['1x Bot Developer', 'API Integration', 'QA Team']
        : ['1x Voice UX Designer', 'Integration Team'],
      dimensionId: 'agentic_readiness',
      risk: 'low',
      skillsImpacted: [skillName],
      volumeImpacted: volume,
      kpiObjective: hasOffHoursOpportunity
        ? `Automatizar ${Math.round(offHoursPct)}% consultas fuera de horario`
        : `Desviar 25% a self-service para gestiones simples`,
      rationale: hasOffHoursOpportunity
        ? `${Math.round(offHoursPct)}% del volumen ocurre fuera de horario. Chatbot puede resolver consultas de estado sin agente.`
        : `CV AHT ${Math.round(cvAht)}% indica procesos variables. IVR puede pre-cualificar y resolver casos simples.`,
      savingsDetail: `Automatización ${Math.round(offHoursPct)}% volumen fuera horario`,
      estimatedSavings: savings,
      resourceHours: 440
    });
    initCounter++;
  }

  // WAVE 2: Assist - Knowledge Base + Copilot
  const wave2Opps = sortedOpps.slice(2, 4);

  // Iniciativa 1: Knowledge Base (agrupa varios skills)
  if (wave2Opps.length > 0) {
    const kbSkills = wave2Opps.map(o => o.name?.replace(/^(Automatizar |Asistir con IA en |Optimizar procesos en )/, '') || '');
    const kbSavings = wave2Opps.reduce((sum, o) => sum + (o.savings || 0), 0) * 0.4;
    const kbVolume = wave2Opps.reduce((sum, o) => {
      const m = getSkillMetrics(o.name || '');
      return sum + (m?.volume || 10000);
    }, 0);

    initiatives.push({
      id: `init-${initCounter}`,
      name: 'Knowledge Base dinámica con IA',
      phase: RoadmapPhase.Assist,
      timeline: 'Q2 2026',
      investment: Math.round(kbSavings * 0.25),
      resources: ['1x PM', 'Content Team', 'AI Developer'],
      dimensionId: 'effectiveness_resolution',
      risk: 'low',
      skillsImpacted: kbSkills.filter(s => s),
      volumeImpacted: kbVolume,
      kpiObjective: 'Reducir Hold Time 30% mediante sugerencias en tiempo real',
      rationale: 'FCR bajo indica que agentes no encuentran información rápidamente. KB con IA sugiere respuestas contextuales.',
      savingsDetail: `Reducción Hold Time 30% en ${kbSkills.length} skills`,
      estimatedSavings: Math.round(kbSavings),
      resourceHours: 400
    });
    initCounter++;
  }

  // Iniciativa 2: Copilot para skill principal
  if (wave2Opps.length > 0) {
    const mainOpp = wave2Opps[0];
    const skillName = mainOpp.name?.replace(/^(Automatizar |Asistir con IA en |Optimizar procesos en )/, '') || 'Principal';
    const savings = mainOpp.savings || 0;
    const skillMetrics = getSkillMetrics(skillName);
    const volume = skillMetrics?.volume || Math.round(savings / 5);
    const cvAht = skillMetrics?.cv_aht || 100;

    initiatives.push({
      id: `init-${initCounter}`,
      name: `Copilot para ${skillName}`,
      phase: RoadmapPhase.Assist,
      timeline: 'Q3 2026',
      investment: Math.round(savings * 0.35),
      resources: ['2x AI Developers', 'QA Team', 'Training'],
      dimensionId: 'effectiveness_resolution',
      risk: 'medium',
      skillsImpacted: [skillName],
      volumeImpacted: volume,
      kpiObjective: `Reducir AHT 15% y CV AHT de ${Math.round(cvAht)}% a <80%`,
      rationale: `Skill con alto volumen y variabilidad. Copilot puede pre-llenar formularios, sugerir respuestas y guiar al agente.`,
      savingsDetail: `Reducción AHT 15% + mejora FCR 10%`,
      estimatedSavings: savings,
      resourceHours: 600
    });
    initCounter++;
  }

  // WAVE 3: Augment - Estandarización y cobertura extendida
  const wave3Opps = sortedOpps.slice(4, 6);

  // Iniciativa 1: Estandarización (skill con mayor CV)
  if (wave3Opps.length > 0) {
    const highCvOpp = wave3Opps.reduce((max, o) => {
      const m = getSkillMetrics(o.name || '');
      const maxM = getSkillMetrics(max.name || '');
      return (m?.cv_aht || 0) > (maxM?.cv_aht || 0) ? o : max;
    }, wave3Opps[0]);

    const skillName = highCvOpp.name?.replace(/^(Automatizar |Asistir con IA en |Optimizar procesos en )/, '') || 'Variable';
    const savings = highCvOpp.savings || 0;
    const skillMetrics = getSkillMetrics(skillName);
    const volume = skillMetrics?.volume || Math.round(savings / 5);
    const cvAht = skillMetrics?.cv_aht || 150;

    initiatives.push({
      id: `init-${initCounter}`,
      name: `Estandarización procesos ${skillName}`,
      phase: RoadmapPhase.Augment,
      timeline: 'Q4 2026',
      investment: Math.round(savings * 0.4),
      resources: ['Process Analyst', 'Training Team', 'QA'],
      dimensionId: 'complexity_predictability',
      risk: 'medium',
      skillsImpacted: [skillName],
      volumeImpacted: volume,
      kpiObjective: `Reducir CV AHT de ${Math.round(cvAht)}% a <100%`,
      rationale: `CV AHT ${Math.round(cvAht)}% indica procesos no estandarizados. Requiere rediseño y documentación antes de automatizar.`,
      savingsDetail: `Estandarización reduce variabilidad y habilita automatización futura`,
      estimatedSavings: savings,
      resourceHours: 440
    });
    initCounter++;
  }

  // Iniciativa 2: Cobertura nocturna (si hay volumen fuera de horario)
  const totalOffHoursVolume = metrics?.reduce((sum, m) => sum + (m.volume * (m.off_hours_pct || 0) / 100), 0) || 0;
  if (totalOffHoursVolume > 10000 && wave3Opps.length > 1) {
    const offHoursSkills = metrics?.filter(m => (m.off_hours_pct || 0) > 20).map(m => m.skill).slice(0, 3) || [];
    const offHoursSavings = totalOffHoursVolume * 5 * 0.6; // CPI €5, 60% automatizable

    initiatives.push({
      id: `init-${initCounter}`,
      name: 'Cobertura nocturna con agentes virtuales',
      phase: RoadmapPhase.Augment,
      timeline: 'Q1 2027',
      investment: Math.round(offHoursSavings * 0.5),
      resources: ['Lead AI Engineer', 'Data Scientist', 'QA Team'],
      dimensionId: 'agentic_readiness',
      risk: 'high',
      skillsImpacted: offHoursSkills.length > 0 ? offHoursSkills : ['Customer Service', 'Support'],
      volumeImpacted: Math.round(totalOffHoursVolume),
      kpiObjective: 'Cobertura 24/7 con 60% resolución automática nocturna',
      rationale: `${Math.round(totalOffHoursVolume).toLocaleString()} interacciones fuera de horario. Agente virtual puede resolver consultas y programar callbacks.`,
      savingsDetail: `Cobertura 24/7 sin incremento plantilla nocturna`,
      estimatedSavings: Math.round(offHoursSavings),
      resourceHours: 600
    });
  }

  return initiatives;
}

/**
 * v3.10: Generar economic model desde datos reales
 * ALINEADO CON ROADMAP: Usa modelo TCO con CPI por tier
 * - AUTOMATE: 70% × (€2.33 - €0.15) = €1.526/interacción
 * - ASSIST: 30% × (€2.33 - €1.50) = €0.249/interacción
 * - AUGMENT: 15% × (€2.33 - €2.00) = €0.050/interacción
 */
function generateEconomicModelFromRealData(
  metrics: SkillMetrics[],
  costPerHour: number,
  roadmap?: RoadmapInitiative[],
  drilldownData?: DrilldownDataPoint[]
): EconomicModelData {
  const totalCost = metrics.reduce((sum, m) => sum + m.total_cost, 0);

  // v3.10: Calcular ahorro usando modelo TCO alineado con Roadmap
  const CPI_HUMANO = 2.33;
  const CPI_BOT = 0.15;
  const CPI_ASSIST = 1.50;
  const CPI_AUGMENT = 2.00;

  // Tasas de contención/deflection por tier
  const RATE_AUTOMATE = 0.70;
  const RATE_ASSIST = 0.30;
  const RATE_AUGMENT = 0.15;

  let annualSavingsTCO = 0;
  let volumeByTier = { AUTOMATE: 0, ASSIST: 0, AUGMENT: 0, 'HUMAN-ONLY': 0 };

  // Si tenemos drilldownData, calcular ahorro por tier real
  if (drilldownData && drilldownData.length > 0) {
    drilldownData.forEach(skill => {
      skill.originalQueues.forEach(queue => {
        volumeByTier[queue.tier] += queue.volume;
      });
    });

    // Ahorro anual = Volumen × 12 meses × Rate × Diferencial CPI
    const savingsAUTOMATE = volumeByTier.AUTOMATE * 12 * RATE_AUTOMATE * (CPI_HUMANO - CPI_BOT);
    const savingsASSIST = volumeByTier.ASSIST * 12 * RATE_ASSIST * (CPI_HUMANO - CPI_ASSIST);
    const savingsAUGMENT = volumeByTier.AUGMENT * 12 * RATE_AUGMENT * (CPI_HUMANO - CPI_AUGMENT);

    annualSavingsTCO = Math.round(savingsAUTOMATE + savingsASSIST + savingsAUGMENT);
  } else {
    // Fallback: estimar 35% del coste total (legacy)
    annualSavingsTCO = Math.round(totalCost * 0.35);
  }

  // Inversión inicial: del Roadmap alineado
  // Wave 1: €47K, Wave 2: €35K, Wave 3: €70K, Wave 4: €85K = €237K total
  let initialInvestment: number;
  if (roadmap && roadmap.length > 0) {
    initialInvestment = roadmap.reduce((sum, init) => sum + (init.investment || 0), 0);
  } else {
    // Default: Escenario conservador Wave 1-2
    initialInvestment = 82000; // €47K + €35K
  }

  // Costes recurrentes anuales (alineado con Roadmap)
  // Wave 2: €40K, Wave 3: €78K, Wave 4: €108K
  const recurrentCostAnnual = drilldownData && drilldownData.length > 0
    ? Math.round(initialInvestment * 0.5) // 50% de inversión como recurrente
    : Math.round(initialInvestment * 0.15);

  // Margen neto anual (ahorro - recurrente)
  const netAnnualSavings = annualSavingsTCO - recurrentCostAnnual;

  // Payback: Implementación + Recuperación (alineado con Roadmap v3.9)
  const mesesImplementacion = 9; // Wave 1 (6m) + mitad Wave 2 (3m/2)
  const margenMensual = netAnnualSavings / 12;
  const mesesRecuperacion = margenMensual > 0 ? Math.ceil(initialInvestment / margenMensual) : -1;
  const paybackMonths = margenMensual > 0 ? mesesImplementacion + mesesRecuperacion : -1;

  // ROI 3 años: ((Ahorro×3) - (Inversión + Recurrente×3)) / (Inversión + Recurrente×3) × 100
  const costeTotalTresAnos = initialInvestment + (recurrentCostAnnual * 3);
  const ahorroTotalTresAnos = annualSavingsTCO * 3;
  const roi3yr = costeTotalTresAnos > 0
    ? ((ahorroTotalTresAnos - costeTotalTresAnos) / costeTotalTresAnos) * 100
    : 0;

  // NPV con tasa de descuento 10%
  const discountRate = 0.10;
  const npv = -initialInvestment +
              (netAnnualSavings / (1 + discountRate)) +
              (netAnnualSavings / Math.pow(1 + discountRate, 2)) +
              (netAnnualSavings / Math.pow(1 + discountRate, 3));

  // Desglose de ahorro por tier (alineado con TCO)
  const savingsBreakdown: { category: string; amount: number; percentage: number }[] = [];

  if (drilldownData && drilldownData.length > 0) {
    const savingsAUTOMATE = Math.round(volumeByTier.AUTOMATE * 12 * RATE_AUTOMATE * (CPI_HUMANO - CPI_BOT));
    const savingsASSIST = Math.round(volumeByTier.ASSIST * 12 * RATE_ASSIST * (CPI_HUMANO - CPI_ASSIST));
    const savingsAUGMENT = Math.round(volumeByTier.AUGMENT * 12 * RATE_AUGMENT * (CPI_HUMANO - CPI_AUGMENT));
    const totalSav = savingsAUTOMATE + savingsASSIST + savingsAUGMENT || 1;

    if (savingsAUTOMATE > 0) {
      savingsBreakdown.push({
        category: `AUTOMATE (${volumeByTier.AUTOMATE.toLocaleString()} int/mes)`,
        amount: savingsAUTOMATE,
        percentage: Math.round((savingsAUTOMATE / totalSav) * 100)
      });
    }
    if (savingsASSIST > 0) {
      savingsBreakdown.push({
        category: `ASSIST (${volumeByTier.ASSIST.toLocaleString()} int/mes)`,
        amount: savingsASSIST,
        percentage: Math.round((savingsASSIST / totalSav) * 100)
      });
    }
    if (savingsAUGMENT > 0) {
      savingsBreakdown.push({
        category: `AUGMENT (${volumeByTier.AUGMENT.toLocaleString()} int/mes)`,
        amount: savingsAUGMENT,
        percentage: Math.round((savingsAUGMENT / totalSav) * 100)
      });
    }
  } else {
    // Fallback legacy
    const topSkills = metrics.slice(0, 4);
    topSkills.forEach((skill, idx) => {
      const skillSavings = Math.round(skill.total_cost * 0.4);
      savingsBreakdown.push({
        category: `Reducción AHT 15% ${skill.skill}`,
        amount: skillSavings,
        percentage: Math.round((skillSavings / (annualSavingsTCO || 1)) * 100)
      });
    });
  }

  const costBreakdown = [
    { category: 'Software y licencias', amount: Math.round(initialInvestment * 0.40), percentage: 40 },
    { category: 'Desarrollo e implementación', amount: Math.round(initialInvestment * 0.30), percentage: 30 },
    { category: 'Training y change mgmt', amount: Math.round(initialInvestment * 0.20), percentage: 20 },
    { category: 'Contingencia', amount: Math.round(initialInvestment * 0.10), percentage: 10 },
  ];

  return {
    currentAnnualCost: Math.round(totalCost),
    futureAnnualCost: Math.round(totalCost - netAnnualSavings),
    annualSavings: annualSavingsTCO, // Ahorro bruto TCO (para comparar con Roadmap)
    initialInvestment,
    paybackMonths: paybackMonths > 0 ? paybackMonths : 0,
    roi3yr: parseFloat(roi3yr.toFixed(1)),
    npv: Math.round(npv),
    savingsBreakdown,
    costBreakdown
  };
}

/**
 * Generar benchmark desde datos reales
 * BENCHMARKS SECTOR AÉREO: AHT P50=380s, FCR=70%, Abandono=5%, Ratio P90/P50<2.0
 */
function generateBenchmarkFromRealData(metrics: SkillMetrics[]): BenchmarkDataPoint[] {
  const avgAHT = metrics.reduce((sum, m) => sum + m.aht_mean, 0) / (metrics.length || 1);
  const avgCV = metrics.reduce((sum, m) => sum + m.cv_aht, 0) / (metrics.length || 1);
  const avgRatio = 1 + avgCV * 1.5; // Ratio P90/P50 aproximado

  // FCR Técnico: 100 - transfer_rate (ponderado por volumen)
  const totalVolume = metrics.reduce((sum, m) => sum + m.volume_valid, 0);
  const avgFCR = totalVolume > 0
    ? metrics.reduce((sum, m) => sum + (m.fcr_tecnico * m.volume_valid), 0) / totalVolume
    : 0;

  // Abandono real
  const totalInteractions = metrics.reduce((sum, m) => sum + m.volume, 0);
  const totalAbandoned = metrics.reduce((sum, m) => sum + m.abandon_count, 0);
  const abandonRate = totalInteractions > 0 ? (totalAbandoned / totalInteractions) * 100 : 0;

  // CPI: Coste total / Total interacciones
  const totalCost = metrics.reduce((sum, m) => sum + m.total_cost, 0);
  const avgCPI = totalInteractions > 0 ? totalCost / totalInteractions : 3.5;

  // Calcular percentiles basados en benchmarks sector aéreo
  const ahtPercentile = avgAHT <= 380 ? 75 : avgAHT <= 420 ? 60 : avgAHT <= 480 ? 40 : 25;
  const fcrPercentile = avgFCR >= 70 ? 70 : avgFCR >= 60 ? 50 : avgFCR >= 50 ? 35 : 20;
  const abandonPercentile = abandonRate <= 5 ? 75 : abandonRate <= 8 ? 55 : abandonRate <= 12 ? 35 : 20;
  const ratioPercentile = avgRatio <= 2.0 ? 75 : avgRatio <= 2.5 ? 50 : avgRatio <= 3.0 ? 30 : 15;

  return [
    {
      kpi: 'AHT P50',
      userValue: Math.round(avgAHT),
      userDisplay: `${Math.round(avgAHT)}s`,
      industryValue: 380,
      industryDisplay: '380s',
      percentile: ahtPercentile,
      p25: 320,
      p50: 380,
      p75: 450,
      p90: 520
    },
    {
      kpi: 'FCR',
      userValue: avgFCR,
      userDisplay: `${Math.round(avgFCR)}%`,
      industryValue: 70,
      industryDisplay: '70%',
      percentile: fcrPercentile,
      p25: 55,
      p50: 70,
      p75: 80,
      p90: 88
    },
    {
      kpi: 'Abandono',
      userValue: abandonRate,
      userDisplay: `${abandonRate.toFixed(1)}%`,
      industryValue: 5,
      industryDisplay: '5%',
      percentile: abandonPercentile,
      p25: 8,
      p50: 5,
      p75: 3,
      p90: 2
    },
    {
      kpi: 'Ratio P90/P50',
      userValue: avgRatio,
      userDisplay: avgRatio.toFixed(2),
      industryValue: 2.0,
      industryDisplay: '<2.0',
      percentile: ratioPercentile,
      p25: 2.5,
      p50: 2.0,
      p75: 1.7,
      p90: 1.4
    },
    {
      kpi: 'Coste/Interacción',
      userValue: avgCPI,
      userDisplay: `€${avgCPI.toFixed(2)}`,
      industryValue: 3.5,
      industryDisplay: '€3.50',
      percentile: avgCPI <= 3.5 ? 65 : avgCPI <= 4.5 ? 45 : 25,
      p25: 4.5,
      p50: 3.5,
      p75: 2.8,
      p90: 2.2
    }
  ];
}
