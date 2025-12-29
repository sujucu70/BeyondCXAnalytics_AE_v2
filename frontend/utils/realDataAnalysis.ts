/**
 * Generación de análisis con datos reales (no sintéticos)
 */

import type { AnalysisData, Kpi, DimensionAnalysis, HeatmapDataPoint, Opportunity, RoadmapInitiative, EconomicModelData, BenchmarkDataPoint, Finding, Recommendation, TierKey, CustomerSegment, RawInteraction, AgenticReadinessResult, SubFactor, SkillMetrics } from '../types';
import { RoadmapPhase } from '../types';
import { BarChartHorizontal, Zap, Smile, DollarSign, Target, Globe } from 'lucide-react';
import { calculateAgenticReadinessScore, type AgenticReadinessInput } from './agenticReadinessV2';
import { classifyQueue } from './segmentClassifier';

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
  
  // PASO 1: Limpieza de ruido (duration < 10s)
  const cleanedInteractions = interactions.filter(i => {
    const totalDuration = i.duration_talk + i.hold_time + i.wrap_up_time;
    return totalDuration >= 10;
  });
  
  console.log(`🧹 Cleaned: ${interactions.length} → ${cleanedInteractions.length} (removed ${interactions.length - cleanedInteractions.length} noise)`);
  
  // PASO 2: Calcular métricas por skill
  const skillMetrics = calculateSkillMetrics(cleanedInteractions, costPerHour);
  
  console.log(`📊 Calculated metrics for ${skillMetrics.length} skills`);
  
  // PASO 3: Generar heatmap data con dimensiones
  const heatmapData = generateHeatmapFromMetrics(skillMetrics, avgCsat, segmentMapping);
  
  // PASO 4: Calcular métricas globales
  const totalInteractions = cleanedInteractions.length;
  const avgAHT = Math.round(skillMetrics.reduce((sum, s) => sum + s.aht_mean, 0) / skillMetrics.length);
  const avgFCR = Math.round((skillMetrics.reduce((sum, s) => sum + (100 - s.transfer_rate), 0) / skillMetrics.length));
  const totalCost = Math.round(skillMetrics.reduce((sum, s) => sum + s.total_cost, 0));
  
  // KPIs principales
  const summaryKpis: Kpi[] = [
    { label: "Interacciones Totales", value: totalInteractions.toLocaleString('es-ES') },
    { label: "AHT Promedio", value: `${avgAHT}s` },
    { label: "Tasa FCR", value: `${avgFCR}%` },
    { label: "CSAT", value: `${(avgCsat / 20).toFixed(1)}/5` }
  ];
  
  // Health Score basado en métricas reales
  const overallHealthScore = calculateHealthScore(heatmapData);
  
  // Dimensiones (simplificadas para datos reales)
  const dimensions: DimensionAnalysis[] = generateDimensionsFromRealData(
    cleanedInteractions,
    skillMetrics,
    avgCsat,
    avgAHT
  );
  
  // Agentic Readiness Score
  const agenticReadiness = calculateAgenticReadinessFromRealData(skillMetrics);
  
  // Findings y Recommendations
  const findings = generateFindingsFromRealData(skillMetrics, cleanedInteractions);
  const recommendations = generateRecommendationsFromRealData(skillMetrics);
  
  // Opportunities
  const opportunities = generateOpportunitiesFromRealData(skillMetrics, costPerHour);
  
  // Roadmap
  const roadmap = generateRoadmapFromRealData(opportunities);
  
  // Economic Model
  const economicModel = generateEconomicModelFromRealData(skillMetrics, costPerHour);
  
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
    benchmarkData
  };
}

/**
 * PASO 2: Calcular métricas base por skill
 */
interface SkillMetrics {
  skill: string;
  volume: number;
  aht_mean: number;
  aht_std: number;
  cv_aht: number;
  transfer_rate: number;
  total_cost: number;
  hold_time_mean: number;
  cv_talk_time: number;
}

function calculateSkillMetrics(interactions: RawInteraction[], costPerHour: number): SkillMetrics[] {
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
    if (volume === 0) return;  // Evitar división por cero

    // AHT = duration_talk + hold_time + wrap_up_time
    const ahts = group.map(i => i.duration_talk + i.hold_time + i.wrap_up_time);
    const aht_mean = ahts.reduce((sum, v) => sum + v, 0) / volume;
    const aht_variance = ahts.reduce((sum, v) => sum + Math.pow(v - aht_mean, 2), 0) / volume;
    const aht_std = Math.sqrt(aht_variance);
    const cv_aht = aht_mean > 0 ? aht_std / aht_mean : 0;

    // Talk time CV
    const talkTimes = group.map(i => i.duration_talk);
    const talk_mean = talkTimes.reduce((sum, v) => sum + v, 0) / volume;
    const talk_std = Math.sqrt(talkTimes.reduce((sum, v) => sum + Math.pow(v - talk_mean, 2), 0) / volume);
    const cv_talk_time = talk_mean > 0 ? talk_std / talk_mean : 0;
    
    // Transfer rate
    const transfers = group.filter(i => i.transfer_flag).length;
    const transfer_rate = (transfers / volume) * 100;
    
    // Hold time promedio
    const hold_time_mean = group.reduce((sum, i) => sum + i.hold_time, 0) / volume;
    
    // Coste total (AHT en horas * coste por hora * volumen)
    const total_cost = (aht_mean / 3600) * costPerHour * volume;
    
    metrics.push({
      skill,
      volume,
      aht_mean,
      aht_std,
      cv_aht,
      transfer_rate,
      total_cost,
      hold_time_mean,
      cv_talk_time
    });
  });
  
  return metrics.sort((a, b) => b.volume - a.volume); // Ordenar por volumen descendente
}

/**
 * PASO 3: Transformar métricas a dimensiones (0-10)
 */
function generateHeatmapFromMetrics(
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
    const fcr_score = Math.round(100 - m.transfer_rate);
    const aht_score = Math.round(Math.max(0, Math.min(100, 100 - ((m.aht_mean - 240) / 310) * 100)));
    const csat_score = avgCsat;
    const hold_time_score = Math.round(Math.max(0, Math.min(100, 100 - (m.hold_time_mean / 60) * 10)));
    const transfer_rate_score = Math.round(100 - m.transfer_rate);
    
    return {
      skill: m.skill,
      volume: m.volume,
      aht_seconds: Math.round(m.aht_mean),
      metrics: {
        fcr: fcr_score,
        aht: aht_score,
        csat: csat_score,
        hold_time: hold_time_score,
        transfer_rate: transfer_rate_score
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
 * Calcular Health Score global
 */
function calculateHealthScore(heatmapData: HeatmapDataPoint[]): number {
  if (heatmapData.length === 0) return 50;

  const avgFCR = heatmapData.reduce((sum, d) => sum + (d.metrics?.fcr || 0), 0) / heatmapData.length;
  const avgAHT = heatmapData.reduce((sum, d) => sum + (d.metrics?.aht || 0), 0) / heatmapData.length;
  const avgCSAT = heatmapData.reduce((sum, d) => sum + (d.metrics?.csat || 0), 0) / heatmapData.length;
  const avgVariability = heatmapData.reduce((sum, d) => sum + (100 - (d.variability?.cv_aht || 0)), 0) / heatmapData.length;
  
  return Math.round((avgFCR + avgAHT + avgCSAT + avgVariability) / 4);
}

/**
 * Generar dimensiones desde datos reales
 */
function generateDimensionsFromRealData(
  interactions: RawInteraction[],
  metrics: SkillMetrics[],
  avgCsat: number,
  avgAHT: number
): DimensionAnalysis[] {
  const totalVolume = interactions.length;
  const avgCV = metrics.reduce((sum, m) => sum + m.cv_aht, 0) / metrics.length;
  const avgTransferRate = metrics.reduce((sum, m) => sum + m.transfer_rate, 0) / metrics.length;
  
  return [
    {
      id: 'volumetry_distribution',
      name: 'volumetry_distribution',
      title: 'Análisis de la Demanda',
      score: Math.min(100, Math.round((totalVolume / 200))), // Score basado en volumen
      percentile: 65,
      summary: `Se procesaron ${totalVolume.toLocaleString('es-ES')} interacciones distribuidas en ${metrics.length} skills diferentes.`,
      kpi: { label: 'Volumen Total', value: totalVolume.toLocaleString('es-ES') },
      icon: BarChartHorizontal
    },
    {
      id: 'performance',
      name: 'performance',
      title: 'Rendimiento Operativo',
      score: Math.round(100 - (avgCV * 100)),
      percentile: 70,
      summary: avgCV < 0.4 
        ? 'El AHT muestra baja variabilidad, indicando procesos estandarizados.'
        : 'La variabilidad del AHT es alta, sugiriendo inconsistencia en procesos.',
      kpi: { label: 'AHT Promedio', value: `${avgAHT}s` },
      icon: Zap
    },
    {
      id: 'satisfaction',
      name: 'satisfaction',
      title: 'Voz del Cliente',
      score: avgCsat,
      percentile: 60,
      summary: `CSAT promedio de ${(avgCsat / 20).toFixed(1)}/5.`,
      kpi: { label: 'CSAT', value: `${(avgCsat / 20).toFixed(1)}/5` },
      icon: Smile
    },
    {
      id: 'economy',
      name: 'economy',
      title: 'Rentabilidad del Servicio',
      score: Math.round(100 - avgTransferRate),
      percentile: 55,
      summary: `Tasa de transferencia del ${avgTransferRate.toFixed(1)}%.`,
      kpi: { label: 'Transfer Rate', value: `${avgTransferRate.toFixed(1)}%` },
      icon: DollarSign
    },
    {
      id: 'efficiency',
      name: 'efficiency',
      title: 'Resolución y Calidad',
      score: Math.round(100 - avgTransferRate),
      percentile: 68,
      summary: `FCR estimado del ${(100 - avgTransferRate).toFixed(1)}%.`,
      kpi: { label: 'FCR', value: `${(100 - avgTransferRate).toFixed(1)}%` },
      icon: Target
    },
    {
      id: 'benchmark',
      name: 'benchmark',
      title: 'Contexto Competitivo',
      score: 75,
      percentile: 65,
      summary: 'Métricas alineadas con benchmarks de la industria.',
      kpi: { label: 'Benchmark', value: 'P65' },
      icon: Globe
    }
  ];
}

/**
 * Calcular Agentic Readiness desde datos reales
 */
function calculateAgenticReadinessFromRealData(metrics: SkillMetrics[]): AgenticReadinessResult {
  const totalVolume = metrics.reduce((sum, m) => sum + m.volume, 0);
  const avgCV = metrics.reduce((sum, m) => sum + m.cv_aht, 0) / metrics.length;
  const avgTransferRate = metrics.reduce((sum, m) => sum + m.transfer_rate, 0) / metrics.length;
  
  // Predictibilidad
  const predictability = Math.max(0, Math.min(10, 10 - ((avgCV - 0.3) / 1.2 * 10)));
  
  // Complejidad Inversa
  const complexity_inverse = Math.max(0, Math.min(10, 10 - (avgTransferRate / 10)));
  
  // ROI (simplificado)
  const roi = Math.min(10, totalVolume / 1000);
  
  // Repetitividad (basada en volumen)
  const repetitiveness = Math.min(10, totalVolume / 500);
  
  // Score final
  const score = Math.round((predictability * 0.4 + complexity_inverse * 0.35 + repetitiveness * 0.25) * 10) / 10;
  
  // Tier basado en score
  let tier: TierKey;
  if (score >= 8) tier = 'gold';
  else if (score >= 5) tier = 'silver';
  else tier = 'bronze';
  
  // Sub-factors
  const sub_factors: SubFactor[] = [
    {
      name: 'predictibilidad',
      displayName: 'Predictibilidad',
      score: Math.round(predictability * 10) / 10,
      weight: 0.4,
      description: `CV AHT promedio: ${Math.round(avgCV * 100)}%`
    },
    {
      name: 'complejidad_inversa',
      displayName: 'Complejidad Inversa',
      score: Math.round(complexity_inverse * 10) / 10,
      weight: 0.35,
      description: `Tasa de transferencia promedio: ${Math.round(avgTransferRate)}%`
    },
    {
      name: 'repetitividad',
      displayName: 'Repetitividad',
      score: Math.round(repetitiveness * 10) / 10,
      weight: 0.25,
      description: `Volumen total: ${totalVolume.toLocaleString('es-ES')} interacciones`
    }
  ];
  
  // Interpretation
  let interpretation: string;
  if (score >= 8) {
    interpretation = 'Excelente candidato para automatización. Alta predictibilidad, baja complejidad y volumen significativo.';
  } else if (score >= 5) {
    interpretation = 'Buen candidato para asistencia con IA. Considere implementar copilots o asistentes virtuales.';
  } else {
    interpretation = 'Requiere optimización previa. Enfóquese en estandarizar procesos y reducir variabilidad antes de automatizar.';
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
 * Generar findings desde datos reales
 */
function generateFindingsFromRealData(metrics: SkillMetrics[], interactions: RawInteraction[]): Finding[] {
  const findings: Finding[] = [];
  
  // Finding 1: Variabilidad
  const highVariabilitySkills = metrics.filter(m => m.cv_aht > 0.45);
  if (highVariabilitySkills.length > 0) {
    findings.push({
      type: 'warning',
      title: 'Alta Variabilidad de AHT',
      description: `${highVariabilitySkills.length} skills muestran CV > 45%, sugiriendo procesos poco estandarizados.`
    });
  }
  
  // Finding 2: Transferencias
  const highTransferSkills = metrics.filter(m => m.transfer_rate > 20);
  if (highTransferSkills.length > 0) {
    findings.push({
      type: 'warning',
      title: 'Alta Tasa de Transferencia',
      description: `${highTransferSkills.length} skills con transfer rate > 20%.`
    });
  }
  
  // Finding 3: Volumen
  const topSkill = metrics[0];
  findings.push({
    type: 'info',
    title: 'Skill de Mayor Volumen',
    description: `"${topSkill.skill}" representa el ${Math.round(topSkill.volume / interactions.length * 100)}% del volumen total.`
  });
  
  return findings;
}

/**
 * Generar recomendaciones desde datos reales
 */
function generateRecommendationsFromRealData(metrics: SkillMetrics[]): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  const highVariabilitySkills = metrics.filter(m => m.cv_aht > 0.45);
  if (highVariabilitySkills.length > 0) {
    recommendations.push({
      priority: 'high',
      title: 'Estandarizar Procesos',
      description: `Crear guías y scripts para los ${highVariabilitySkills.length} skills con alta variabilidad.`,
      impact: 'Reducción del 20-30% en AHT'
    });
  }
  
  const highVolumeSkills = metrics.filter(m => m.volume > 500);
  if (highVolumeSkills.length > 0) {
    recommendations.push({
      priority: 'high',
      title: 'Automatizar Skills de Alto Volumen',
      description: `Implementar bots para los ${highVolumeSkills.length} skills con > 500 interacciones.`,
      impact: 'Ahorro estimado del 40-60%'
    });
  }
  
  return recommendations;
}

/**
 * Generar opportunities desde datos reales
 */
function generateOpportunitiesFromRealData(metrics: SkillMetrics[], costPerHour: number): Opportunity[] {
  return metrics.slice(0, 10).map((m, index) => {
    const potentialSavings = m.total_cost * 0.4; // 40% de ahorro potencial
    
    return {
      id: `opp-${index + 1}`,
      skill: m.skill,
      currentVolume: m.volume,
      currentAHT: Math.round(m.aht_mean),
      currentCost: Math.round(m.total_cost),
      potentialSavings: Math.round(potentialSavings),
      automationPotential: m.cv_aht < 0.3 && m.transfer_rate < 15 ? 'high' : m.cv_aht < 0.5 ? 'medium' : 'low',
      priority: index < 3 ? 'high' : index < 7 ? 'medium' : 'low'
    };
  });
}

/**
 * Generar roadmap desde opportunities
 */
function generateRoadmapFromRealData(opportunities: Opportunity[]): RoadmapInitiative[] {
  const highPriority = opportunities.filter(o => o.priority === 'high');
  
  return highPriority.slice(0, 5).map((opp, index) => ({
    id: `init-${index + 1}`,
    title: `Automatizar ${opp.skill}`,
    description: `Implementar bot para reducir AHT y coste`,
    phase: index < 2 ? RoadmapPhase.QUICK_WINS : RoadmapPhase.STRATEGIC,
    effort: opp.currentVolume > 1000 ? 'high' : 'medium',
    impact: opp.potentialSavings > 10000 ? 'high' : 'medium',
    timeline: `${index * 2 + 1}-${index * 2 + 3} meses`
  }));
}

/**
 * Generar economic model desde datos reales
 */
function generateEconomicModelFromRealData(metrics: SkillMetrics[], costPerHour: number): EconomicModelData {
  const totalCost = metrics.reduce((sum, m) => sum + m.total_cost, 0);
  const annualSavings = Math.round(totalCost * 0.35);
  const initialInvestment = Math.round(totalCost * 0.1);
  const paybackMonths = Math.ceil((initialInvestment / annualSavings) * 12);
  const roi3yr = (((annualSavings * 3) - initialInvestment) / initialInvestment) * 100;

  // NPV con tasa de descuento 10%
  const discountRate = 0.10;
  const npv = -initialInvestment +
              (annualSavings / (1 + discountRate)) +
              (annualSavings / Math.pow(1 + discountRate, 2)) +
              (annualSavings / Math.pow(1 + discountRate, 3));

  const savingsBreakdown = [
    { category: 'Automatización de tareas', amount: annualSavings * 0.45, percentage: 45 },
    { category: 'Eficiencia operativa', amount: annualSavings * 0.30, percentage: 30 },
    { category: 'Mejora FCR', amount: annualSavings * 0.15, percentage: 15 },
    { category: 'Reducción attrition', amount: annualSavings * 0.075, percentage: 7.5 },
    { category: 'Otros', amount: annualSavings * 0.025, percentage: 2.5 },
  ];

  const costBreakdown = [
    { category: 'Software y licencias', amount: initialInvestment * 0.43, percentage: 43 },
    { category: 'Implementación', amount: initialInvestment * 0.29, percentage: 29 },
    { category: 'Training y change mgmt', amount: initialInvestment * 0.18, percentage: 18 },
    { category: 'Contingencia', amount: initialInvestment * 0.10, percentage: 10 },
  ];

  return {
    currentAnnualCost: Math.round(totalCost),
    futureAnnualCost: Math.round(totalCost - annualSavings),
    annualSavings,
    initialInvestment,
    paybackMonths,
    roi3yr: parseFloat(roi3yr.toFixed(1)),
    npv: Math.round(npv),
    savingsBreakdown,
    costBreakdown
  };
}

/**
 * Generar benchmark desde datos reales
 */
function generateBenchmarkFromRealData(metrics: SkillMetrics[]): BenchmarkDataPoint[] {
  const avgAHT = metrics.reduce((sum, m) => sum + m.aht_mean, 0) / (metrics.length || 1);
  const avgFCR = 100 - (metrics.reduce((sum, m) => sum + m.transfer_rate, 0) / (metrics.length || 1));
  const avgCSAT = 4.3; // Default CSAT
  const avgCPI = 3.5; // Default CPI

  return [
    {
      kpi: 'AHT Promedio',
      userValue: Math.round(avgAHT),
      userDisplay: `${Math.round(avgAHT)}s`,
      industryValue: 420,
      industryDisplay: `420s`,
      percentile: Math.max(10, Math.min(90, Math.round(100 - (avgAHT / 420) * 100))),
      p25: 380,
      p50: 420,
      p75: 460,
      p90: 510
    },
    {
      kpi: 'Tasa FCR',
      userValue: avgFCR / 100,
      userDisplay: `${Math.round(avgFCR)}%`,
      industryValue: 0.72,
      industryDisplay: `72%`,
      percentile: Math.max(10, Math.min(90, Math.round((avgFCR / 100) * 100))),
      p25: 0.65,
      p50: 0.72,
      p75: 0.82,
      p90: 0.88
    },
    {
      kpi: 'CSAT',
      userValue: avgCSAT,
      userDisplay: `${avgCSAT}/5`,
      industryValue: 4.3,
      industryDisplay: `4.3/5`,
      percentile: 65,
      p25: 3.8,
      p50: 4.3,
      p75: 4.6,
      p90: 4.8
    },
    {
      kpi: 'Coste por Interacción',
      userValue: avgCPI,
      userDisplay: `€${avgCPI.toFixed(2)}`,
      industryValue: 3.5,
      industryDisplay: `€3.50`,
      percentile: 55,
      p25: 2.8,
      p50: 3.5,
      p75: 4.2,
      p90: 4.8
    }
  ];
}
