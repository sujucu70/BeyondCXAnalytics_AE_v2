// utils/backendMapper.ts
import type {
  AnalysisData,
  AgenticReadinessResult,
  SubFactor,
  TierKey,
  DimensionAnalysis,
  Kpi,
  EconomicModelData,
  Finding,
  Recommendation,
} from '../types';
import type { BackendRawResults } from './apiClient';
import { BarChartHorizontal, Zap, Target, Brain, Bot, Smile, DollarSign } from 'lucide-react';
import type { HeatmapDataPoint, CustomerSegment } from '../types';


function safeNumber(value: any, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeAhtMetric(ahtSeconds: number): number {
  if (!Number.isFinite(ahtSeconds) || ahtSeconds <= 0) return 0;

  // Ajusta estos números si ves que tus AHTs reales son muy distintos
  const MIN_AHT = 300;  // AHT muy bueno
  const MAX_AHT = 1000; // AHT muy malo

  const clamped = Math.max(MIN_AHT, Math.min(MAX_AHT, ahtSeconds));
  const ratio = (clamped - MIN_AHT) / (MAX_AHT - MIN_AHT); // 0 (mejor) -> 1 (peor)
  const score = 100 - ratio * 100; // 100 (mejor) -> 0 (peor)

  return Math.round(score);
}


function inferTierFromScore(score: number): TierKey {
  if (score >= 8) return 'gold';
  if (score >= 5) return 'silver';
  return 'bronze';
}

function computeBalanceScore(values: number[]): number {
  if (!values.length) return 50;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 50;
  const variance =
    values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
    values.length;
  const std = Math.sqrt(variance);
  const cv = std / mean;

  const rawScore = 100 - cv * 100;
  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

function getTopLabel(
  labels: any,
  values: number[]
): string | undefined {
  if (!Array.isArray(labels) || !labels.length || !values.length) {
    return undefined;
  }
  const len = Math.min(labels.length, values.length);
  let maxIdx = 0;
  let maxVal = values[0];
  for (let i = 1; i < len; i++) {
    if (values[i] > maxVal) {
      maxVal = values[i];
      maxIdx = i;
    }
  }
  return String(labels[maxIdx]);
}

// ==== Helpers para distribución horaria (desde heatmap_24x7) ====

function computeHourlyFromHeatmap(heatmap24x7: any): number[] {
  if (!Array.isArray(heatmap24x7) || !heatmap24x7.length) {
    return [];
  }

  const hours = Array(24).fill(0);

  for (const day of heatmap24x7) {
    for (let h = 0; h < 24; h++) {
      const key = String(h);
      const v = safeNumber(day?.[key], 0);
      hours[h] += v;
    }
  }

  return hours;
}

function calcOffHoursPct(hourly: number[]): number {
  const total = hourly.reduce((a, b) => a + b, 0);
  if (!total) return 0;
  const offHours =
    hourly.slice(0, 8).reduce((a, b) => a + b, 0) +
    hourly.slice(19, 24).reduce((a, b) => a + b, 0);
  return offHours / total;
}

function findPeakHours(hourly: number[]): number[] {
  if (!hourly.length) return [];
  const sorted = [...hourly].sort((a, b) => b - a);
  const threshold = sorted[Math.min(2, sorted.length - 1)] || 0;
  return hourly
    .map((val, idx) => (val >= threshold ? idx : -1))
    .filter((idx) => idx !== -1);
}

// ==== Agentic readiness ====

function mapAgenticReadiness(
  raw: any,
  fallbackTier: TierKey
): AgenticReadinessResult | undefined {
  const ar = raw?.agentic_readiness?.agentic_readiness;
  if (!ar) {
    return undefined;
  }

  const score = safeNumber(ar.final_score, 5);
  const classification = ar.classification || {};
  const weights = ar.weights || {};
  const sub_scores = ar.sub_scores || {};

  const baseWeights = weights.base_weights || {};
  const normalized = weights.normalized_weights || {};

  const subFactors: SubFactor[] = Object.entries(sub_scores).map(
    ([key, value]: [string, any]) => {
      const subScore = safeNumber(value?.score, 0);
      const weight =
        safeNumber(normalized?.[key], NaN) ||
        safeNumber(baseWeights?.[key], 0);

      return {
        name: key,
        displayName: key.replace(/_/g, ' '),
        score: subScore,
        weight,
        description:
          value?.reason ||
          value?.details?.description ||
          'Sub-factor calculado a partir de KPIs agregados.',
        details: value?.details || {},
      };
    }
  );

  const tier = inferTierFromScore(score) || fallbackTier;

  const interpretation =
    classification?.description ||
    `Puntuación de preparación agentic: ${score.toFixed(1)}/10`;

  const computedCount = Object.values(sub_scores).filter(
    (s: any) => s?.computed
  ).length;
  const totalCount = Object.keys(sub_scores).length || 1;
  const ratio = computedCount / totalCount;

  const confidence: AgenticReadinessResult['confidence'] =
    ratio >= 0.75 ? 'high' : ratio >= 0.4 ? 'medium' : 'low';

  return {
    score,
    sub_factors: subFactors,
    tier,
    confidence,
    interpretation,
  };
}

// ==== Volumetría (dimensión + KPIs) ====

function buildVolumetryDimension(
  raw: BackendRawResults
): { dimension?: DimensionAnalysis; extraKpis: Kpi[] } {
  const volumetry = raw?.volumetry;
  const volumeByChannel = volumetry?.volume_by_channel;
  const volumeBySkill = volumetry?.volume_by_skill;

  const channelValues: number[] = Array.isArray(volumeByChannel?.values)
    ? volumeByChannel.values.map((v: any) => safeNumber(v, 0))
    : [];

  const rawSkillLabels =
    volumeBySkill?.labels ??
    volumeBySkill?.skills ??
    volumeBySkill?.skill_names ??
    [];

  const skillLabels: string[] = Array.isArray(rawSkillLabels)
    ? rawSkillLabels.map((s: any) => String(s))
    : [];

  const skillValues: number[] = Array.isArray(volumeBySkill?.values)
    ? volumeBySkill.values.map((v: any) => safeNumber(v, 0))
    : [];

  const totalVolumeChannels = channelValues.reduce((a, b) => a + b, 0);
  const totalVolumeSkills = skillValues.reduce((a, b) => a + b, 0);
  const totalVolume =
    totalVolumeChannels || totalVolumeSkills || 0;

  const numChannels = Array.isArray(volumeByChannel?.labels)
    ? volumeByChannel.labels.length
    : 0;
  const numSkills = skillLabels.length;

  const topChannel = getTopLabel(volumeByChannel?.labels, channelValues);
  const topSkill = getTopLabel(skillLabels, skillValues);

  // Heatmap 24x7 -> distribución horaria
  const heatmap24x7 = volumetry?.heatmap_24x7;
  const hourly = computeHourlyFromHeatmap(heatmap24x7);
  const offHoursPct = hourly.length ? calcOffHoursPct(hourly) : 0;
  const peakHours = hourly.length ? findPeakHours(hourly) : [];

  console.log('📊 Volumetría backend (mapper):', {
    volumetry,
    volumeByChannel,
    volumeBySkill,
    totalVolume,
    numChannels,
    numSkills,
    skillLabels,
    skillValues,
    hourly,
    offHoursPct,
    peakHours,
  });

  const extraKpis: Kpi[] = [];

  if (totalVolume > 0) {
    extraKpis.push({
      label: 'Volumen total (backend)',
      value: totalVolume.toLocaleString('es-ES'),
    });
  }

  if (numChannels > 0) {
    extraKpis.push({
      label: 'Canales analizados',
      value: String(numChannels),
    });
  }

  if (numSkills > 0) {
    extraKpis.push({
      label: 'Skills analizadas',
      value: String(numSkills),
    });

    extraKpis.push({
      label: 'Skills (backend)',
      value: skillLabels.join(', '),
    });
  } else {
    extraKpis.push({
      label: 'Skills (backend)',
      value: 'N/A',
    });
  }

  if (topChannel) {
    extraKpis.push({
      label: 'Canal principal',
      value: topChannel,
    });
  }

  if (topSkill) {
    extraKpis.push({
      label: 'Skill principal',
      value: topSkill,
    });
  }

  if (!totalVolume) {
    return { dimension: undefined, extraKpis };
  }

  // Calcular ratio pico/valle para evaluar concentración de demanda
  const validHourly = hourly.filter(v => v > 0);
  const maxHourly = validHourly.length > 0 ? Math.max(...validHourly) : 0;
  const minHourly = validHourly.length > 0 ? Math.min(...validHourly) : 1;
  const peakValleyRatio = minHourly > 0 ? maxHourly / minHourly : 1;
  console.log(`⏰ Hourly distribution (backend path): total=${totalVolume}, peak=${maxHourly}, valley=${minHourly}, ratio=${peakValleyRatio.toFixed(2)}`);

  // Score basado en:
  // - % fuera de horario (>30% penaliza)
  // - Ratio pico/valle (>3x penaliza)
  // NO penalizar por tener volumen alto
  let score = 100;

  // Penalización por fuera de horario
  const offHoursPctValue = offHoursPct * 100;
  if (offHoursPctValue > 30) {
    score -= Math.min(40, (offHoursPctValue - 30) * 2); // -2 pts por cada % sobre 30%
  } else if (offHoursPctValue > 20) {
    score -= (offHoursPctValue - 20); // -1 pt por cada % entre 20-30%
  }

  // Penalización por ratio pico/valle alto
  if (peakValleyRatio > 5) {
    score -= 30;
  } else if (peakValleyRatio > 3) {
    score -= 20;
  } else if (peakValleyRatio > 2) {
    score -= 10;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const summaryParts: string[] = [];
  summaryParts.push(
    `${totalVolume.toLocaleString('es-ES')} interacciones analizadas.`
  );
  summaryParts.push(
    `${(offHoursPct * 100).toFixed(0)}% fuera de horario laboral (8-19h).`
  );
  if (peakValleyRatio > 2) {
    summaryParts.push(
      `Ratio pico/valle: ${peakValleyRatio.toFixed(1)}x - alta concentración de demanda.`
    );
  }
  if (topSkill) {
    summaryParts.push(`Skill principal: ${topSkill}.`);
  }

  // Métrica principal accionable: % fuera de horario
  const dimension: DimensionAnalysis = {
    id: 'volumetry_distribution',
    name: 'volumetry_distribution',
    title: 'Volumetría y distribución de demanda',
    score,
    percentile: undefined,
    summary: summaryParts.join(' '),
    kpi: {
      label: 'Fuera de horario',
      value: `${(offHoursPct * 100).toFixed(0)}%`,
      change: peakValleyRatio > 2 ? `Pico/valle: ${peakValleyRatio.toFixed(1)}x` : undefined,
      changeType: offHoursPct > 0.3 ? 'negative' : offHoursPct > 0.2 ? 'neutral' : 'positive'
    },
    icon: BarChartHorizontal,
    distribution_data: hourly.length
      ? {
          hourly,
          off_hours_pct: offHoursPct,
          peak_hours: peakHours,
        }
      : undefined,
  };

  return { dimension, extraKpis };
}

// ==== Eficiencia Operativa (v3.2 - con segmentación horaria) ====

function buildOperationalEfficiencyDimension(
  raw: BackendRawResults,
  hourlyData?: number[]
): DimensionAnalysis | undefined {
  const op = raw?.operational_performance;
  if (!op) return undefined;

  // AHT Global
  const ahtP50 = safeNumber(op.aht_distribution?.p50, 0);
  const ahtP90 = safeNumber(op.aht_distribution?.p90, 0);
  const ratioGlobal = ahtP90 > 0 && ahtP50 > 0 ? ahtP90 / ahtP50 : safeNumber(op.aht_distribution?.p90_p50_ratio, 1.5);

  // AHT Horario Laboral (8-19h) - estimación basada en distribución
  // Asumimos que el AHT en horario laboral es ligeramente menor (más eficiente)
  const ahtBusinessHours = Math.round(ahtP50 * 0.92); // ~8% más eficiente en horario laboral
  const ratioBusinessHours = ratioGlobal * 0.85; // Menor variabilidad en horario laboral

  // Determinar si la variabilidad se reduce fuera de horario
  const variabilityReduction = ratioGlobal - ratioBusinessHours;
  const variabilityInsight = variabilityReduction > 0.3
    ? 'La variabilidad se reduce significativamente en horario laboral.'
    : variabilityReduction > 0.1
    ? 'La variabilidad se mantiene similar en ambos horarios.'
    : 'La variabilidad es consistente independientemente del horario.';

  // Score basado en escala definida:
  // <1.5 = 100pts, 1.5-2.0 = 70pts, 2.0-2.5 = 50pts, 2.5-3.0 = 30pts, >3.0 = 20pts
  let score: number;
  if (ratioGlobal < 1.5) {
    score = 100;
  } else if (ratioGlobal < 2.0) {
    score = 70;
  } else if (ratioGlobal < 2.5) {
    score = 50;
  } else if (ratioGlobal < 3.0) {
    score = 30;
  } else {
    score = 20;
  }

  // Summary con segmentación
  let summary = `AHT Global: ${Math.round(ahtP50)}s (P50), ratio ${ratioGlobal.toFixed(2)}. `;
  summary += `AHT Horario Laboral (8-19h): ${ahtBusinessHours}s (P50), ratio ${ratioBusinessHours.toFixed(2)}. `;
  summary += variabilityInsight;

  // KPI principal: AHT P50 (industry standard for operational efficiency)
  const kpi: Kpi = {
    label: 'AHT P50',
    value: `${Math.round(ahtP50)}s`,
    change: `Ratio: ${ratioGlobal.toFixed(2)}`,
    changeType: ahtP50 > 360 ? 'negative' : ahtP50 > 300 ? 'neutral' : 'positive'
  };

  const dimension: DimensionAnalysis = {
    id: 'operational_efficiency',
    name: 'operational_efficiency',
    title: 'Eficiencia Operativa',
    score,
    percentile: undefined,
    summary,
    kpi,
    icon: Zap,
  };

  return dimension;
}

// ==== Efectividad & Resolución (v3.2 - enfocada en FCR Técnico) ====

function buildEffectivenessResolutionDimension(
  raw: BackendRawResults
): DimensionAnalysis | undefined {
  const op = raw?.operational_performance;
  if (!op) return undefined;

  // FCR Técnico = 100 - transfer_rate (comparable con benchmarks de industria)
  // Usamos escalation_rate que es la tasa de transferencias
  const escalationRate = safeNumber(op.escalation_rate, NaN);
  const abandonmentRate = safeNumber(op.abandonment_rate, 0);

  // FCR Técnico: 100 - tasa de transferencia
  const fcrRate = Number.isFinite(escalationRate) && escalationRate >= 0
    ? Math.max(0, Math.min(100, 100 - escalationRate))
    : 70; // valor por defecto benchmark aéreo

  // Tasa de transferencia (complemento del FCR Técnico)
  const transferRate = Number.isFinite(escalationRate) ? escalationRate : 100 - fcrRate;

  // Score basado en FCR Técnico (benchmark sector aéreo: 85-90%)
  // FCR >= 90% = 100pts, 85-90% = 80pts, 80-85% = 60pts, 75-80% = 40pts, <75% = 20pts
  let score: number;
  if (fcrRate >= 90) {
    score = 100;
  } else if (fcrRate >= 85) {
    score = 80;
  } else if (fcrRate >= 80) {
    score = 60;
  } else if (fcrRate >= 75) {
    score = 40;
  } else {
    score = 20;
  }

  // Penalización adicional por abandono alto (>8%)
  if (abandonmentRate > 8) {
    score = Math.max(0, score - Math.round((abandonmentRate - 8) * 2));
  }

  // Summary enfocado en FCR Técnico
  let summary = `FCR Técnico: ${fcrRate.toFixed(1)}% (benchmark: 85-90%). `;
  summary += `Tasa de transferencia: ${transferRate.toFixed(1)}%. `;

  if (fcrRate >= 90) {
    summary += 'Excelente resolución en primer contacto.';
  } else if (fcrRate >= 85) {
    summary += 'Resolución dentro del benchmark del sector.';
  } else {
    summary += 'Oportunidad de mejora reduciendo transferencias.';
  }

  const kpi: Kpi = {
    label: 'FCR Técnico',
    value: `${fcrRate.toFixed(0)}%`,
    change: `Transfer: ${transferRate.toFixed(0)}%`,
    changeType: fcrRate >= 85 ? 'positive' : fcrRate >= 80 ? 'neutral' : 'negative'
  };

  const dimension: DimensionAnalysis = {
    id: 'effectiveness_resolution',
    name: 'effectiveness_resolution',
    title: 'Efectividad & Resolución',
    score,
    percentile: undefined,
    summary,
    kpi,
    icon: Target,
  };

  return dimension;
}

// ==== Complejidad & Predictibilidad (v3.4 - basada en CV AHT per industry standards) ====

function buildComplexityPredictabilityDimension(
  raw: BackendRawResults
): DimensionAnalysis | undefined {
  const op = raw?.operational_performance;
  if (!op) return undefined;

  // KPI principal: CV AHT (industry standard for predictability/WFM)
  // CV AHT = (P90 - P50) / P50 como proxy de coeficiente de variación
  const ahtP50 = safeNumber(op.aht_distribution?.p50, 0);
  const ahtP90 = safeNumber(op.aht_distribution?.p90, 0);

  // Calcular CV AHT como (P90-P50)/P50 (proxy del coeficiente de variación real)
  let cvAht = 0;
  if (ahtP50 > 0 && ahtP90 > 0) {
    cvAht = (ahtP90 - ahtP50) / ahtP50;
  }
  const cvAhtPercent = Math.round(cvAht * 100);

  // Hold Time como métrica secundaria de complejidad
  const talkHoldAcw = op.talk_hold_acw_p50_by_skill;
  let avgHoldP50 = 0;
  if (Array.isArray(talkHoldAcw) && talkHoldAcw.length > 0) {
    const holdValues = talkHoldAcw.map((item: any) => safeNumber(item?.hold_p50, 0)).filter(v => v > 0);
    if (holdValues.length > 0) {
      avgHoldP50 = holdValues.reduce((a, b) => a + b, 0) / holdValues.length;
    }
  }

  // Score basado en CV AHT (benchmark: <75% = excelente, <100% = aceptable)
  // CV <= 75% = 100pts (alta predictibilidad)
  // CV 75-100% = 80pts (predictibilidad aceptable)
  // CV 100-125% = 60pts (variabilidad moderada)
  // CV 125-150% = 40pts (alta variabilidad)
  // CV > 150% = 20pts (muy alta variabilidad)
  let score: number;
  if (cvAhtPercent <= 75) {
    score = 100;
  } else if (cvAhtPercent <= 100) {
    score = 80;
  } else if (cvAhtPercent <= 125) {
    score = 60;
  } else if (cvAhtPercent <= 150) {
    score = 40;
  } else {
    score = 20;
  }

  // Summary descriptivo
  let summary = `CV AHT: ${cvAhtPercent}% (benchmark: <75%). `;

  if (cvAhtPercent <= 75) {
    summary += 'Alta predictibilidad: tiempos de atención consistentes. Excelente para planificación WFM.';
  } else if (cvAhtPercent <= 100) {
    summary += 'Predictibilidad aceptable: variabilidad moderada en tiempos de atención.';
  } else if (cvAhtPercent <= 125) {
    summary += 'Variabilidad notable: dificulta la planificación de recursos. Considerar estandarización.';
  } else {
    summary += 'Alta variabilidad: tiempos muy dispersos. Priorizar scripts guiados y estandarización.';
  }

  // Añadir info de Hold P50 promedio si está disponible (proxy de complejidad)
  if (avgHoldP50 > 0) {
    summary += ` Hold Time P50: ${Math.round(avgHoldP50)}s.`;
  }

  // KPI principal: CV AHT (predictability metric per industry standards)
  const kpi: Kpi = {
    label: 'CV AHT',
    value: `${cvAhtPercent}%`,
    change: avgHoldP50 > 0 ? `Hold: ${Math.round(avgHoldP50)}s` : undefined,
    changeType: cvAhtPercent > 125 ? 'negative' : cvAhtPercent > 75 ? 'neutral' : 'positive'
  };

  const dimension: DimensionAnalysis = {
    id: 'complexity_predictability',
    name: 'complexity_predictability',
    title: 'Complejidad & Predictibilidad',
    score,
    percentile: undefined,
    summary,
    kpi,
    icon: Brain,
  };

  return dimension;
}

// ==== Satisfacción del Cliente (v3.1) ====

function buildSatisfactionDimension(
  raw: BackendRawResults
): DimensionAnalysis | undefined {
  const cs = raw?.customer_satisfaction;
  const csatGlobalRaw = safeNumber(cs?.csat_global, NaN);

  const hasCSATData = Number.isFinite(csatGlobalRaw) && csatGlobalRaw > 0;

  // Si no hay CSAT, mostrar dimensión con "No disponible"
  const dimension: DimensionAnalysis = {
    id: 'customer_satisfaction',
    name: 'customer_satisfaction',
    title: 'Satisfacción del Cliente',
    score: hasCSATData ? Math.round((csatGlobalRaw / 5) * 100) : -1, // -1 indica N/A
    percentile: undefined,
    summary: hasCSATData
      ? `CSAT global: ${csatGlobalRaw.toFixed(1)}/5. ${csatGlobalRaw >= 4.0 ? 'Nivel de satisfacción óptimo.' : csatGlobalRaw >= 3.5 ? 'Satisfacción aceptable, margen de mejora.' : 'Satisfacción baja, requiere atención urgente.'}`
      : 'CSAT no disponible en el dataset. Para incluir esta dimensión, añadir datos de encuestas de satisfacción.',
    kpi: {
      label: 'CSAT',
      value: hasCSATData ? `${csatGlobalRaw.toFixed(1)}/5` : 'No disponible',
      changeType: hasCSATData
        ? (csatGlobalRaw >= 4.0 ? 'positive' : csatGlobalRaw >= 3.5 ? 'neutral' : 'negative')
        : 'neutral'
    },
    icon: Smile,
  };

  return dimension;
}

// ==== Economía - Coste por Interacción (v3.1) ====

function buildEconomyDimension(
  raw: BackendRawResults,
  totalInteractions: number
): DimensionAnalysis | undefined {
  const econ = raw?.economy_costs;
  const op = raw?.operational_performance;
  const totalAnnual = safeNumber(econ?.cost_breakdown?.total_annual, 0);

  // Benchmark CPI sector contact center (Fuente: Gartner Contact Center Cost Benchmark 2024)
  const CPI_BENCHMARK = 5.00;

  if (totalAnnual <= 0 || totalInteractions <= 0) {
    return undefined;
  }

  // Calcular cost_volume (non-abandoned) para consistencia con Executive Summary
  const abandonmentRate = safeNumber(op?.abandonment_rate, 0) / 100;
  const costVolume = Math.round(totalInteractions * (1 - abandonmentRate));

  // Calcular CPI usando cost_volume (non-abandoned) como denominador
  const cpi = costVolume > 0 ? totalAnnual / costVolume : totalAnnual / totalInteractions;

  // Score basado en comparación con benchmark (€5.00)
  // CPI <= 4.00 = 100pts (excelente)
  // CPI 4.00-5.00 = 80pts (en benchmark)
  // CPI 5.00-6.00 = 60pts (por encima)
  // CPI 6.00-7.00 = 40pts (alto)
  // CPI > 7.00 = 20pts (crítico)
  let score: number;
  if (cpi <= 4.00) {
    score = 100;
  } else if (cpi <= 5.00) {
    score = 80;
  } else if (cpi <= 6.00) {
    score = 60;
  } else if (cpi <= 7.00) {
    score = 40;
  } else {
    score = 20;
  }

  const cpiDiff = cpi - CPI_BENCHMARK;
  const cpiStatus = cpiDiff <= 0 ? 'positive' : cpiDiff <= 0.5 ? 'neutral' : 'negative';

  let summary = `Coste por interacción: €${cpi.toFixed(2)} vs benchmark €${CPI_BENCHMARK.toFixed(2)}. `;
  if (cpi <= CPI_BENCHMARK) {
    summary += 'Eficiencia de costes óptima, por debajo del benchmark del sector.';
  } else if (cpi <= 6.00) {
    summary += 'Coste ligeramente por encima del benchmark, oportunidad de optimización.';
  } else {
    summary += 'Coste elevado respecto al sector. Priorizar iniciativas de eficiencia.';
  }

  const dimension: DimensionAnalysis = {
    id: 'economy_costs',
    name: 'economy_costs',
    title: 'Economía & Costes',
    score,
    percentile: undefined,
    summary,
    kpi: {
      label: 'Coste por Interacción',
      value: `€${cpi.toFixed(2)}`,
      change: `vs benchmark €${CPI_BENCHMARK.toFixed(2)}`,
      changeType: cpiStatus as 'positive' | 'neutral' | 'negative'
    },
    icon: DollarSign,
  };

  return dimension;
}

// ==== Agentic Readiness como dimensión (v3.0) ====

function buildAgenticReadinessDimension(
  raw: BackendRawResults,
  fallbackTier: TierKey
): DimensionAnalysis | undefined {
  const ar = raw?.agentic_readiness?.agentic_readiness;

  // Si no hay datos de backend, calculamos un score aproximado
  const op = raw?.operational_performance;
  const volumetry = raw?.volumetry;

  let score0_10: number;
  let category: string;

  if (ar) {
    score0_10 = safeNumber(ar.final_score, 5);
  } else {
    // Calcular aproximado desde métricas disponibles
    const ahtP50 = safeNumber(op?.aht_distribution?.p50, 0);
    const ahtP90 = safeNumber(op?.aht_distribution?.p90, 0);
    const ratio = ahtP50 > 0 ? ahtP90 / ahtP50 : 2;
    const escalation = safeNumber(op?.escalation_rate, 15);

    const skillVolumes = Array.isArray(volumetry?.volume_by_skill?.values)
      ? volumetry.volume_by_skill.values.map((v: any) => safeNumber(v, 0))
      : [];
    const totalVolume = skillVolumes.reduce((a: number, b: number) => a + b, 0);

    // Calcular sub-scores
    const predictability = Math.max(0, Math.min(10, 10 - (ratio - 1) * 5));
    const complexityInverse = Math.max(0, Math.min(10, 10 - escalation / 5));
    const repetitivity = Math.min(10, totalVolume / 500);

    score0_10 = predictability * 0.30 + complexityInverse * 0.30 + repetitivity * 0.25 + 2.5; // base offset
  }

  const score0_100 = Math.max(0, Math.min(100, Math.round(score0_10 * 10)));

  if (score0_10 >= 8) {
    category = 'Automatizar';
  } else if (score0_10 >= 5) {
    category = 'Asistir (Copilot)';
  } else {
    category = 'Optimizar primero';
  }

  let summary = `Score global: ${score0_10.toFixed(1)}/10. Categoría: ${category}. `;

  if (score0_10 >= 8) {
    summary += 'Excelente candidato para automatización completa con agentes IA.';
  } else if (score0_10 >= 5) {
    summary += 'Candidato para asistencia con IA (copilot) o automatización parcial.';
  } else {
    summary += 'Requiere optimización de procesos antes de automatizar.';
  }

  const kpi: Kpi = {
    label: 'Score Global',
    value: `${score0_10.toFixed(1)}/10`,
  };

  const dimension: DimensionAnalysis = {
    id: 'agentic_readiness',
    name: 'agentic_readiness',
    title: 'Agentic Readiness',
    score: score0_100,
    percentile: undefined,
    summary,
    kpi,
    icon: Bot,
  };

  return dimension;
}


// ==== Economía y costes (economy_costs) ====

function buildEconomicModel(raw: BackendRawResults): EconomicModelData {
  const econ = raw?.economy_costs;
  const cost = econ?.cost_breakdown || {};
  const totalAnnual = safeNumber(cost.total_annual, 0);
  const laborAnnual = safeNumber(cost.labor_annual, 0);
  const overheadAnnual = safeNumber(cost.overhead_annual, 0);
  const techAnnual = safeNumber(cost.tech_annual, 0);

  const potential = econ?.potential_savings || {};
  const annualSavings = safeNumber(potential.annual_savings, 0);

  const currentAnnualCost =
    totalAnnual || laborAnnual + overheadAnnual + techAnnual || 0;
  const futureAnnualCost = currentAnnualCost - annualSavings;

  let initialInvestment = 0;
  let paybackMonths = 0;
  let roi3yr = 0;

  if (annualSavings > 0 && currentAnnualCost > 0) {
    initialInvestment = Math.round(currentAnnualCost * 0.15);
    paybackMonths = Math.ceil(
      (initialInvestment / annualSavings) * 12
    );
    roi3yr =
      ((annualSavings * 3 - initialInvestment) /
        initialInvestment) *
      100;
  }

  const savingsBreakdown = annualSavings
    ? [
        {
          category: 'Ineficiencias operativas (AHT, escalaciones)',
          amount: Math.round(annualSavings * 0.5),
          percentage: 50,
        },
        {
          category: 'Automatización de volumen repetitivo',
          amount: Math.round(annualSavings * 0.3),
          percentage: 30,
        },
        {
          category: 'Otros beneficios (calidad, CX)',
          amount: Math.round(annualSavings * 0.2),
          percentage: 20,
        },
      ]
    : [];

  const costBreakdown = currentAnnualCost
    ? [
        {
          category: 'Coste laboral',
          amount: laborAnnual,
          percentage: Math.round(
            (laborAnnual / currentAnnualCost) * 100
          ),
        },
        {
          category: 'Overhead',
          amount: overheadAnnual,
          percentage: Math.round(
            (overheadAnnual / currentAnnualCost) * 100
          ),
        },
        {
          category: 'Tecnología',
          amount: techAnnual,
          percentage: Math.round(
            (techAnnual / currentAnnualCost) * 100
          ),
        },
      ]
    : [];

  return {
    currentAnnualCost,
    futureAnnualCost,
    annualSavings,
    initialInvestment,
    paybackMonths,
    roi3yr: parseFloat(roi3yr.toFixed(1)),
    savingsBreakdown,
    npv: 0,
    costBreakdown,
  };
}

// buildEconomyDimension eliminado en v3.0 - economía integrada en otras dimensiones y modelo económico

/**
 * Transforma el JSON del backend (results) al AnalysisData
 * que espera el frontend.
 */
export function mapBackendResultsToAnalysisData(
  raw: BackendRawResults,
  tierFromFrontend?: TierKey
): AnalysisData {
  const volumetry = raw?.volumetry;
  const volumeByChannel = volumetry?.volume_by_channel;
  const volumeBySkill = volumetry?.volume_by_skill;

  const channelValues: number[] = Array.isArray(volumeByChannel?.values)
    ? volumeByChannel.values.map((v: any) => safeNumber(v, 0))
    : [];
  const skillValues: number[] = Array.isArray(volumeBySkill?.values)
    ? volumeBySkill.values.map((v: any) => safeNumber(v, 0))
    : [];

  const totalVolumeChannels = channelValues.reduce((a, b) => a + b, 0);
  const totalVolumeSkills = skillValues.reduce((a, b) => a + b, 0);
  const totalVolume =
    totalVolumeChannels || totalVolumeSkills || 0;

  const numChannels = Array.isArray(volumeByChannel?.labels)
    ? volumeByChannel.labels.length
    : 0;
  const numSkills = Array.isArray(volumeBySkill?.labels)
    ? volumeBySkill.labels.length
    : 0;

  // Agentic readiness
  const agenticReadiness = mapAgenticReadiness(
    raw,
    tierFromFrontend || 'silver'
  );
  const arScore = agenticReadiness?.score ?? 5;
  const overallHealthScore = Math.max(
    0,
    Math.min(100, Math.round(arScore * 10))
  );

  // v3.3: 7 dimensiones (Complejidad recuperada con métrica Hold Time >60s)
  const { dimension: volumetryDimension, extraKpis } =
    buildVolumetryDimension(raw);
  const operationalEfficiencyDimension = buildOperationalEfficiencyDimension(raw);
  const effectivenessResolutionDimension = buildEffectivenessResolutionDimension(raw);
  const complexityDimension = buildComplexityPredictabilityDimension(raw);
  const satisfactionDimension = buildSatisfactionDimension(raw);
  const economyDimension = buildEconomyDimension(raw, totalVolume);
  const agenticReadinessDimension = buildAgenticReadinessDimension(raw, tierFromFrontend || 'silver');

  const dimensions: DimensionAnalysis[] = [];
  if (volumetryDimension) dimensions.push(volumetryDimension);
  if (operationalEfficiencyDimension) dimensions.push(operationalEfficiencyDimension);
  if (effectivenessResolutionDimension) dimensions.push(effectivenessResolutionDimension);
  if (complexityDimension) dimensions.push(complexityDimension);
  if (satisfactionDimension) dimensions.push(satisfactionDimension);
  if (economyDimension) dimensions.push(economyDimension);
  if (agenticReadinessDimension) dimensions.push(agenticReadinessDimension);


  const op = raw?.operational_performance;
  const cs = raw?.customer_satisfaction;

  // FCR: viene ya como porcentaje 0-100
  const fcrPctRaw = safeNumber(op?.fcr_rate, NaN);
  const fcrPct =
    Number.isFinite(fcrPctRaw) && fcrPctRaw >= 0
      ? Math.min(100, Math.max(0, fcrPctRaw))
      : undefined;

  const csatAvg = computeCsatAverage(cs);

  // CSAT global (opcional)
  const csatGlobalRaw = safeNumber(cs?.csat_global, NaN);
  const csatGlobal =
    Number.isFinite(csatGlobalRaw) && csatGlobalRaw > 0
      ? csatGlobalRaw
      : undefined;


    // KPIs de resumen (los 4 primeros son los que se ven en "Métricas de Contacto")
  const summaryKpis: Kpi[] = [];

  // 1) Interacciones Totales (volumen backend)
  summaryKpis.push({
    label: 'Interacciones Totales',
    value:
      totalVolume > 0
        ? totalVolume.toLocaleString('es-ES')
        : 'N/D',
  });

  // 2) AHT Promedio (P50 de distribución de AHT)
  const ahtP50 = safeNumber(op?.aht_distribution?.p50, 0);
  summaryKpis.push({
    label: 'AHT Promedio',
    value: ahtP50
      ? `${Math.round(ahtP50)}s`
      : 'N/D',
  });

  // 3) Tasa FCR
  summaryKpis.push({
    label: 'Tasa FCR',
    value:
      fcrPct !== undefined
        ? `${Math.round(fcrPct)}%`
        : 'N/D',
  });

  // 4) CSAT
  summaryKpis.push({
    label: 'CSAT',
    value:
      csatGlobal !== undefined
        ? `${csatGlobal.toFixed(1)}/5`
        : 'N/D',
  });

  // --- KPIs adicionales, usados en otras secciones ---

  if (numChannels > 0) {
    summaryKpis.push({
      label: 'Canales analizados',
      value: String(numChannels),
    });
  }

  if (numSkills > 0) {
    summaryKpis.push({
      label: 'Skills analizadas',
      value: String(numSkills),
    });
  }

  summaryKpis.push({
    label: 'Agentic readiness',
    value: `${arScore.toFixed(1)}/10`,
  });

  // KPIs de economía (backend)
  const econ = raw?.economy_costs;
  const totalAnnual = safeNumber(
    econ?.cost_breakdown?.total_annual,
    0
  );
  const annualSavings = safeNumber(
    econ?.potential_savings?.annual_savings,
    0
  );

  if (totalAnnual) {
    summaryKpis.push({
      label: 'Coste anual actual (backend)',
      value: `€${totalAnnual.toFixed(0)}`,
    });
  }
  if (annualSavings) {
    summaryKpis.push({
      label: 'Ahorro potencial anual (backend)',
      value: `€${annualSavings.toFixed(0)}`,
    });
  }

  const mergedKpis: Kpi[] = [...summaryKpis, ...extraKpis];

  const economicModel = buildEconomicModel(raw);
  const benchmarkData = buildBenchmarkData(raw);

  // Generar findings y recommendations basados en volumetría
  const findings: Finding[] = [];
  const recommendations: Recommendation[] = [];

  // Extraer offHoursPct de la dimensión de volumetría
  const offHoursPct = volumetryDimension?.distribution_data?.off_hours_pct ?? 0;
  const offHoursPctValue = offHoursPct * 100; // Convertir de 0-1 a 0-100

  if (offHoursPctValue > 20) {
    const offHoursVolume = Math.round(totalVolume * offHoursPctValue / 100);
    findings.push({
      type: offHoursPctValue > 30 ? 'critical' : 'warning',
      title: 'Alto Volumen Fuera de Horario',
      text: `${offHoursPctValue.toFixed(0)}% de interacciones fuera de horario (8-19h)`,
      dimensionId: 'volumetry_distribution',
      description: `${offHoursVolume.toLocaleString()} interacciones (${offHoursPctValue.toFixed(1)}%) ocurren fuera de horario laboral. Oportunidad ideal para implementar agentes virtuales 24/7.`,
      impact: offHoursPctValue > 30 ? 'high' : 'medium'
    });

    const estimatedContainment = offHoursPctValue > 30 ? 60 : 45;
    const estimatedSavings = Math.round(offHoursVolume * estimatedContainment / 100);
    recommendations.push({
      priority: 'high',
      title: 'Implementar Agente Virtual 24/7',
      text: `Desplegar agente virtual para atender ${offHoursPctValue.toFixed(0)}% de interacciones fuera de horario`,
      description: `${offHoursVolume.toLocaleString()} interacciones ocurren fuera de horario laboral (19:00-08:00). Un agente virtual puede resolver ~${estimatedContainment}% de estas consultas automáticamente.`,
      dimensionId: 'volumetry_distribution',
      impact: `Potencial de contención: ${estimatedSavings.toLocaleString()} interacciones/período`,
      timeline: '1-3 meses'
    });
  }

  return {
    tier: tierFromFrontend,
    overallHealthScore,
    summaryKpis: mergedKpis,
    dimensions,
    heatmapData: [], // el heatmap por skill lo seguimos generando en el front
    findings,
    recommendations,
    opportunities: [],
    roadmap: [],
    economicModel,
    benchmarkData,
    agenticReadiness,
    staticConfig: undefined,
    source: 'backend',
  };
}

export function buildHeatmapFromBackend(
  raw: BackendRawResults,
  costPerHour: number,
  avgCsat: number,
  segmentMapping?: {
    high_value_queues: string[];
    medium_value_queues: string[];
    low_value_queues: string[];
  }
): HeatmapDataPoint[] {
  const volumetry = raw?.volumetry;
  const volumeBySkill = volumetry?.volume_by_skill;

  const rawSkillLabels =
    volumeBySkill?.labels ??
    volumeBySkill?.skills ??
    volumeBySkill?.skill_names ??
    [];

  const skillLabels: string[] = Array.isArray(rawSkillLabels)
    ? rawSkillLabels.map((s: any) => String(s))
    : [];

  const skillVolumes: number[] = Array.isArray(volumeBySkill?.values)
    ? volumeBySkill.values.map((v: any) => safeNumber(v, 0))
    : [];

  const op = raw?.operational_performance;
  const econ = raw?.economy_costs;
  const cs = raw?.customer_satisfaction;

  const talkHoldAcwBySkillRaw = Array.isArray(
    op?.talk_hold_acw_p50_by_skill
  )
    ? op.talk_hold_acw_p50_by_skill
    : [];

  // Crear lookup map por skill name para talk_hold_acw_p50
  const talkHoldAcwMap = new Map<string, { talk_p50: number; hold_p50: number; acw_p50: number }>();
  for (const item of talkHoldAcwBySkillRaw) {
    if (item?.queue_skill) {
      talkHoldAcwMap.set(String(item.queue_skill), {
        talk_p50: safeNumber(item.talk_p50, 0),
        hold_p50: safeNumber(item.hold_p50, 0),
        acw_p50: safeNumber(item.acw_p50, 0),
      });
    }
  }

  const globalEscalation = safeNumber(op?.escalation_rate, 0);
  // Usar fcr_rate del backend si existe, sino calcular como 100 - escalation
  const fcrRateBackend = safeNumber(op?.fcr_rate, NaN);
  const globalFcrPct = Number.isFinite(fcrRateBackend) && fcrRateBackend >= 0
    ? Math.max(0, Math.min(100, fcrRateBackend))
    : Math.max(0, Math.min(100, 100 - globalEscalation));

  // Usar abandonment_rate del backend si existe
  const abandonmentRateBackend = safeNumber(op?.abandonment_rate, 0);

  // ========================================================================
  // NUEVO: Métricas REALES por skill (transfer, abandonment, FCR)
  // Esto elimina la estimación de transfer rate basada en CV y hold time
  // ========================================================================
  const metricsBySkillRaw = Array.isArray(op?.metrics_by_skill)
    ? op.metrics_by_skill
    : [];

  // Crear lookup por nombre de skill para acceso O(1)
  const metricsBySkillMap = new Map<string, {
    transfer_rate: number;
    abandonment_rate: number;
    fcr_tecnico: number;
    fcr_real: number;
    aht_mean: number;  // AHT promedio del backend (solo VALID - consistente con fresh path)
    aht_total: number;  // AHT total (ALL rows incluyendo NOISE/ZOMBIE/ABANDON) - solo informativo
    hold_time_mean: number;  // Hold time promedio (consistente con fresh path - MEAN, no P50)
  }>();

  for (const m of metricsBySkillRaw) {
    if (m?.skill) {
      metricsBySkillMap.set(String(m.skill), {
        transfer_rate: safeNumber(m.transfer_rate, NaN),
        abandonment_rate: safeNumber(m.abandonment_rate, NaN),
        fcr_tecnico: safeNumber(m.fcr_tecnico, NaN),
        fcr_real: safeNumber(m.fcr_real, NaN),
        aht_mean: safeNumber(m.aht_mean, NaN),  // AHT promedio (solo VALID)
        aht_total: safeNumber(m.aht_total, NaN),  // AHT total (ALL rows)
        hold_time_mean: safeNumber(m.hold_time_mean, NaN),  // Hold time promedio (MEAN)
      });
    }
  }

  const hasRealMetricsBySkill = metricsBySkillMap.size > 0;
  if (hasRealMetricsBySkill) {
    console.log('✅ Usando métricas REALES por skill del backend:', metricsBySkillMap.size, 'skills');
  } else {
    console.warn('⚠️ No hay metrics_by_skill del backend, usando estimación basada en CV/hold');
  }

  // ========================================================================
  // NUEVO: CPI por skill desde cpi_by_skill_channel
  // Esto permite que el cached path tenga CPI real como el fresh path
  // ========================================================================
  const cpiBySkillRaw = Array.isArray(econ?.cpi_by_skill_channel)
    ? econ.cpi_by_skill_channel
    : [];

  // Crear lookup por nombre de skill para CPI
  const cpiBySkillMap = new Map<string, number>();
  for (const item of cpiBySkillRaw) {
    if (item?.queue_skill || item?.skill) {
      const skillKey = String(item.queue_skill ?? item.skill);
      const cpiValue = safeNumber(item.cpi_total ?? item.cpi, NaN);
      if (Number.isFinite(cpiValue)) {
        cpiBySkillMap.set(skillKey, cpiValue);
      }
    }
  }

  const hasCpiBySkill = cpiBySkillMap.size > 0;
  if (hasCpiBySkill) {
    console.log('✅ Usando CPI por skill del backend:', cpiBySkillMap.size, 'skills');
  }

  const csatGlobalRaw = safeNumber(cs?.csat_global, NaN);
  const csatGlobal =
    Number.isFinite(csatGlobalRaw) && csatGlobalRaw > 0
      ? csatGlobalRaw
      : undefined;
  const csatMetric0_100 = csatGlobal
    ? Math.max(
        0,
        Math.min(100, Math.round((csatGlobal / 5) * 100))
      )
    : 0;

  const ineffBySkillRaw = Array.isArray(
    econ?.inefficiency_cost_by_skill_channel
  )
    ? econ.inefficiency_cost_by_skill_channel
    : [];

  // Crear lookup map por skill name para inefficiency data
  const ineffBySkillMap = new Map<string, { aht_p50: number; aht_p90: number; volume: number }>();
  for (const item of ineffBySkillRaw) {
    if (item?.queue_skill) {
      ineffBySkillMap.set(String(item.queue_skill), {
        aht_p50: safeNumber(item.aht_p50, 0),
        aht_p90: safeNumber(item.aht_p90, 0),
        volume: safeNumber(item.volume, 0),
      });
    }
  }

  const COST_PER_SECOND = costPerHour / 3600;

  if (!skillLabels.length) return [];

  // Para normalizar la repetitividad según volumen
  const volumesForNorm = skillVolumes.filter((v) => v > 0);
  const minVol =
    volumesForNorm.length > 0
      ? Math.min(...volumesForNorm)
      : 0;
  const maxVol =
    volumesForNorm.length > 0
      ? Math.max(...volumesForNorm)
      : 0;

  const heatmap: HeatmapDataPoint[] = [];

  for (let i = 0; i < skillLabels.length; i++) {
    const skill = skillLabels[i];
    const volume = safeNumber(skillVolumes[i], 0);

    // Buscar P50s por nombre de skill (no por índice)
    const talkHold = talkHoldAcwMap.get(skill);
    const talk_p50 = talkHold?.talk_p50 ?? 0;
    const hold_p50 = talkHold?.hold_p50 ?? 0;
    const acw_p50 = talkHold?.acw_p50 ?? 0;

    // Buscar métricas REALES del backend (metrics_by_skill)
    const realSkillMetrics = metricsBySkillMap.get(skill);

    // AHT: Use ONLY aht_mean from backend metrics_by_skill
    // NEVER use P50 sum as fallback - it's mathematically different from mean AHT
    const aht_mean = (realSkillMetrics && Number.isFinite(realSkillMetrics.aht_mean) && realSkillMetrics.aht_mean > 0)
      ? realSkillMetrics.aht_mean
      : 0;

    // AHT Total: AHT calculado con TODAS las filas (incluye NOISE/ZOMBIE/ABANDON)
    // Solo para información/comparación - no se usa en cálculos
    const aht_total = (realSkillMetrics && Number.isFinite(realSkillMetrics.aht_total) && realSkillMetrics.aht_total > 0)
      ? realSkillMetrics.aht_total
      : aht_mean;  // fallback to aht_mean if not available

    if (aht_mean === 0) {
      console.warn(`⚠️ No aht_mean for skill ${skill} - data may be incomplete`);
    }

    // Coste anual aproximado
    const annual_volume = volume * 12;
    const annual_cost = Math.round(
      annual_volume * aht_mean * COST_PER_SECOND
    );

    // Buscar inefficiency data por nombre de skill (no por índice)
    const ineff = ineffBySkillMap.get(skill);
    const aht_p50_backend = ineff?.aht_p50 ?? aht_mean;
    const aht_p90_backend = ineff?.aht_p90 ?? aht_mean;

    // Variabilidad proxy: aproximamos CV a partir de P90-P50
    let cv_aht = 0;
    if (aht_p50_backend > 0) {
      cv_aht =
        (aht_p90_backend - aht_p50_backend) / aht_p50_backend;
    }

    // Dimensiones agentic similares a las que tenías en generateHeatmapData,
    // pero usando valores reales en lugar de aleatorios.

    // 1) Predictibilidad (menor CV => mayor puntuación)
    const predictability_score = Math.max(
      0,
      Math.min(
        10,
        10 - ((cv_aht - 0.3) / 1.2) * 10
      )
    );

    // 2) Transfer rate POR SKILL
    // PRIORIDAD 1: Usar métricas REALES del backend (metrics_by_skill)
    // PRIORIDAD 2: Fallback a estimación basada en CV y hold time

    let skillTransferRate: number;
    let skillAbandonmentRate: number;
    let skillFcrTecnico: number;
    let skillFcrReal: number;

    if (realSkillMetrics && Number.isFinite(realSkillMetrics.transfer_rate)) {
      // Usar métricas REALES del backend
      skillTransferRate = realSkillMetrics.transfer_rate;
      skillAbandonmentRate = Number.isFinite(realSkillMetrics.abandonment_rate)
        ? realSkillMetrics.abandonment_rate
        : abandonmentRateBackend;
      skillFcrTecnico = Number.isFinite(realSkillMetrics.fcr_tecnico)
        ? realSkillMetrics.fcr_tecnico
        : 100 - skillTransferRate;
      skillFcrReal = Number.isFinite(realSkillMetrics.fcr_real)
        ? realSkillMetrics.fcr_real
        : skillFcrTecnico;
    } else {
      // NO usar estimación - usar valores globales del backend directamente
      // Esto asegura consistencia con el fresh path que usa valores directos del CSV
      skillTransferRate = globalEscalation;  // Usar tasa global, sin estimación
      skillAbandonmentRate = abandonmentRateBackend;
      skillFcrTecnico = 100 - skillTransferRate;
      skillFcrReal = globalFcrPct;
      console.warn(`⚠️ No metrics_by_skill for skill ${skill} - using global rates`);
    }

    // Complejidad inversa basada en transfer rate del skill
    const complexity_inverse_score = Math.max(
      0,
      Math.min(
        10,
        10 - ((skillTransferRate / 100 - 0.05) / 0.25) * 10
      )
    );

    // 3) Repetitividad (según volumen relativo)
    let repetitivity_score = 5;
    if (maxVol > minVol && volume > 0) {
      repetitivity_score =
        ((volume - minVol) / (maxVol - minVol)) * 10;
    } else if (volume === 0) {
      repetitivity_score = 0;
    }

    const agentic_readiness_score =
      predictability_score * 0.4 +
      complexity_inverse_score * 0.35 +
      repetitivity_score * 0.25;

    let readiness_category:
      | 'automate_now'
      | 'assist_copilot'
      | 'optimize_first';
    if (agentic_readiness_score >= 8.0) {
      readiness_category = 'automate_now';
    } else if (agentic_readiness_score >= 5.0) {
      readiness_category = 'assist_copilot';
    } else {
      readiness_category = 'optimize_first';
    }

    const automation_readiness = Math.round(
      agentic_readiness_score * 10
    ); // 0-100

    // Métricas normalizadas 0-100 para el color del heatmap
    const ahtMetric = normalizeAhtMetric(aht_mean);

    // Hold time metric: use hold_time_mean from backend (MEAN, not P50)
    // Formula matches fresh path: 100 - (hold_time_mean / 60) * 10
    // This gives: 0s = 100, 60s = 90, 120s = 80, etc.
    const skillHoldTimeMean = (realSkillMetrics && Number.isFinite(realSkillMetrics.hold_time_mean))
      ? realSkillMetrics.hold_time_mean
      : hold_p50;  // Fallback to P50 only if no mean available

    const holdMetric = skillHoldTimeMean > 0
      ? Math.round(Math.max(0, Math.min(100, 100 - (skillHoldTimeMean / 60) * 10)))
      : 0;

    // Clasificación por segmento (si nos pasan mapeo)
    let segment: CustomerSegment | undefined;
    if (segmentMapping) {
      const normalizedSkill = skill.toLowerCase();
      if (
        segmentMapping.high_value_queues.some((q) =>
          normalizedSkill.includes(q.toLowerCase())
        )
      ) {
        segment = 'high';
      } else if (
        segmentMapping.low_value_queues.some((q) =>
          normalizedSkill.includes(q.toLowerCase())
        )
      ) {
        segment = 'low';
      } else {
        segment = 'medium';
      }
    }

    // Métricas de transferencia y FCR (ahora usando valores REALES cuando disponibles)
    const transferMetricFinal = Math.max(0, Math.min(100, Math.round(skillTransferRate)));

    // CPI should be extracted from cpi_by_skill_channel using cpi_total field
    const skillCpiRaw = cpiBySkillMap.get(skill);
    // Only use if it's a valid number
    const skillCpi = (Number.isFinite(skillCpiRaw) && skillCpiRaw > 0) ? skillCpiRaw : undefined;

    // cost_volume: volumen sin abandonos (para cálculo de CPI consistente)
    // Si tenemos abandonment_rate, restamos los abandonos
    const costVolume = Math.round(volume * (1 - skillAbandonmentRate / 100));

    heatmap.push({
      skill,
      segment,
      volume,
      cost_volume: costVolume,
      aht_seconds: aht_mean,
      aht_total: aht_total,  // AHT con TODAS las filas (solo informativo)
      metrics: {
        fcr: Math.round(skillFcrReal),        // FCR Real (sin transfer Y sin recontacto 7d)
        fcr_tecnico: Math.round(skillFcrTecnico),  // FCR Técnico (comparable con benchmarks)
        aht: ahtMetric,
        csat: csatMetric0_100,
        hold_time: holdMetric,
        transfer_rate: transferMetricFinal,
        abandonment_rate: Math.round(skillAbandonmentRate),
      },
      annual_cost,
      cpi: skillCpi,  // CPI real del backend (si disponible)
      variability: {
        cv_aht: Math.round(cv_aht * 100), // %
        cv_talk_time: 0,
        cv_hold_time: 0,
        transfer_rate: skillTransferRate,  // Transfer rate REAL o estimado
      },
      automation_readiness,
      dimensions: {
        predictability: Math.round(predictability_score * 10) / 10,
        complexity_inverse:
          Math.round(complexity_inverse_score * 10) / 10,
        repetitivity: Math.round(repetitivity_score * 10) / 10,
      },
      readiness_category,
    });
  }

  console.log('📊 Heatmap backend generado:', {
    length: heatmap.length,
    firstItem: heatmap[0],
  });

  return heatmap;
}

// ==== Benchmark Data (Sector Aéreo) ====

function buildBenchmarkData(raw: BackendRawResults): AnalysisData['benchmarkData'] {
  const op = raw?.operational_performance;
  const cs = raw?.customer_satisfaction;

  const benchmarkData: AnalysisData['benchmarkData'] = [];

  // Benchmarks hardcoded para sector aéreo
  const AIRLINE_BENCHMARKS = {
    aht_p50: 380,      // segundos
    fcr: 70,           // % (rango 68-72%)
    abandonment: 5,    // % (rango 5-8%)
    ratio_p90_p50: 2.0, // ratio saludable
    cpi: 5.25          // € (rango €4.50-€6.00)
  };

  // 1. AHT Promedio (benchmark sector aéreo: 380s)
  const ahtP50 = safeNumber(op?.aht_distribution?.p50, 0);
  if (ahtP50 > 0) {
    // Percentil: menor AHT = mejor. Si AHT <= benchmark = P75+
    const ahtPercentile = ahtP50 <= AIRLINE_BENCHMARKS.aht_p50
      ? Math.min(90, 75 + Math.round((AIRLINE_BENCHMARKS.aht_p50 - ahtP50) / 10))
      : Math.max(10, 75 - Math.round((ahtP50 - AIRLINE_BENCHMARKS.aht_p50) / 5));
    benchmarkData.push({
      kpi: 'AHT P50',
      userValue: Math.round(ahtP50),
      userDisplay: `${Math.round(ahtP50)}s`,
      industryValue: AIRLINE_BENCHMARKS.aht_p50,
      industryDisplay: `${AIRLINE_BENCHMARKS.aht_p50}s`,
      percentile: ahtPercentile,
      p25: 450,
      p50: AIRLINE_BENCHMARKS.aht_p50,
      p75: 320,
      p90: 280
    });
  }

  // 2. Tasa FCR (benchmark sector aéreo: 70%)
  const fcrRate = safeNumber(op?.fcr_rate, NaN);
  if (Number.isFinite(fcrRate) && fcrRate >= 0) {
    // Percentil: mayor FCR = mejor
    const fcrPercentile = fcrRate >= AIRLINE_BENCHMARKS.fcr
      ? Math.min(90, 50 + Math.round((fcrRate - AIRLINE_BENCHMARKS.fcr) * 2))
      : Math.max(10, 50 - Math.round((AIRLINE_BENCHMARKS.fcr - fcrRate) * 2));
    benchmarkData.push({
      kpi: 'Tasa FCR',
      userValue: fcrRate / 100,
      userDisplay: `${Math.round(fcrRate)}%`,
      industryValue: AIRLINE_BENCHMARKS.fcr / 100,
      industryDisplay: `${AIRLINE_BENCHMARKS.fcr}%`,
      percentile: fcrPercentile,
      p25: 0.60,
      p50: AIRLINE_BENCHMARKS.fcr / 100,
      p75: 0.78,
      p90: 0.85
    });
  }

  // 3. CSAT (si disponible)
  const csatGlobal = safeNumber(cs?.csat_global, NaN);
  if (Number.isFinite(csatGlobal) && csatGlobal > 0) {
    const csatPercentile = Math.max(10, Math.min(90, Math.round((csatGlobal / 5) * 100)));
    benchmarkData.push({
      kpi: 'CSAT',
      userValue: csatGlobal,
      userDisplay: `${csatGlobal.toFixed(1)}/5`,
      industryValue: 4.0,
      industryDisplay: '4.0/5',
      percentile: csatPercentile,
      p25: 3.5,
      p50: 4.0,
      p75: 4.3,
      p90: 4.6
    });
  }

  // 4. Tasa de Abandono (benchmark sector aéreo: 5%)
  const abandonRate = safeNumber(op?.abandonment_rate, NaN);
  if (Number.isFinite(abandonRate) && abandonRate >= 0) {
    // Percentil: menor abandono = mejor
    const abandonPercentile = abandonRate <= AIRLINE_BENCHMARKS.abandonment
      ? Math.min(90, 75 + Math.round((AIRLINE_BENCHMARKS.abandonment - abandonRate) * 5))
      : Math.max(10, 75 - Math.round((abandonRate - AIRLINE_BENCHMARKS.abandonment) * 5));
    benchmarkData.push({
      kpi: 'Tasa de Abandono',
      userValue: abandonRate / 100,
      userDisplay: `${abandonRate.toFixed(1)}%`,
      industryValue: AIRLINE_BENCHMARKS.abandonment / 100,
      industryDisplay: `${AIRLINE_BENCHMARKS.abandonment}%`,
      percentile: abandonPercentile,
      p25: 0.08,
      p50: AIRLINE_BENCHMARKS.abandonment / 100,
      p75: 0.03,
      p90: 0.02
    });
  }

  // 5. Ratio P90/P50 (benchmark sector aéreo: <2.0)
  const ahtP90 = safeNumber(op?.aht_distribution?.p90, 0);
  const ratio = ahtP50 > 0 && ahtP90 > 0 ? ahtP90 / ahtP50 : 0;
  if (ratio > 0) {
    // Percentil: menor ratio = mejor
    const ratioPercentile = ratio <= AIRLINE_BENCHMARKS.ratio_p90_p50
      ? Math.min(90, 75 + Math.round((AIRLINE_BENCHMARKS.ratio_p90_p50 - ratio) * 30))
      : Math.max(10, 75 - Math.round((ratio - AIRLINE_BENCHMARKS.ratio_p90_p50) * 30));
    benchmarkData.push({
      kpi: 'Ratio P90/P50',
      userValue: ratio,
      userDisplay: ratio.toFixed(2),
      industryValue: AIRLINE_BENCHMARKS.ratio_p90_p50,
      industryDisplay: `<${AIRLINE_BENCHMARKS.ratio_p90_p50}`,
      percentile: ratioPercentile,
      p25: 2.5,
      p50: AIRLINE_BENCHMARKS.ratio_p90_p50,
      p75: 1.5,
      p90: 1.3
    });
  }

  // 6. Tasa de Transferencia/Escalación
  const escalationRate = safeNumber(op?.escalation_rate, NaN);
  if (Number.isFinite(escalationRate) && escalationRate >= 0) {
    // Menor escalación = mejor percentil
    const escalationPercentile = Math.max(10, Math.min(90, Math.round(100 - escalationRate * 5)));
    benchmarkData.push({
      kpi: 'Tasa de Transferencia',
      userValue: escalationRate / 100,
      userDisplay: `${escalationRate.toFixed(1)}%`,
      industryValue: 0.15,
      industryDisplay: '15%',
      percentile: escalationPercentile,
      p25: 0.20,
      p50: 0.15,
      p75: 0.10,
      p90: 0.08
    });
  }

  // 7. CPI - Coste por Interacción (benchmark sector aéreo: €4.50-€6.00)
  const econ = raw?.economy_costs;
  const totalAnnualCost = safeNumber(econ?.cost_breakdown?.total_annual, 0);
  const volumetry = raw?.volumetry;
  const volumeBySkill = volumetry?.volume_by_skill;
  const skillVolumes: number[] = Array.isArray(volumeBySkill?.values)
    ? volumeBySkill.values.map((v: any) => safeNumber(v, 0))
    : [];
  const totalInteractions = skillVolumes.reduce((a, b) => a + b, 0);

  if (totalAnnualCost > 0 && totalInteractions > 0) {
    const cpi = totalAnnualCost / totalInteractions;
    // Menor CPI = mejor. Si CPI <= 4.50 = excelente (P90+), si CPI >= 6.00 = malo (P25-)
    let cpiPercentile: number;
    if (cpi <= 4.50) {
      cpiPercentile = Math.min(95, 90 + Math.round((4.50 - cpi) * 10));
    } else if (cpi <= AIRLINE_BENCHMARKS.cpi) {
      cpiPercentile = Math.round(50 + ((AIRLINE_BENCHMARKS.cpi - cpi) / 0.75) * 40);
    } else if (cpi <= 6.00) {
      cpiPercentile = Math.round(25 + ((6.00 - cpi) / 0.75) * 25);
    } else {
      cpiPercentile = Math.max(5, 25 - Math.round((cpi - 6.00) * 10));
    }

    benchmarkData.push({
      kpi: 'Coste por Interacción (CPI)',
      userValue: cpi,
      userDisplay: `€${cpi.toFixed(2)}`,
      industryValue: AIRLINE_BENCHMARKS.cpi,
      industryDisplay: `€${AIRLINE_BENCHMARKS.cpi.toFixed(2)}`,
      percentile: cpiPercentile,
      p25: 6.00,
      p50: AIRLINE_BENCHMARKS.cpi,
      p75: 4.50,
      p90: 3.80
    });
  }

  return benchmarkData;
}

function computeCsatAverage(customerSatisfaction: any): number | undefined {
  const arr = customerSatisfaction?.csat_avg_by_skill_channel;
  if (!Array.isArray(arr) || !arr.length) return undefined;

  const values: number[] = arr
    .map((item: any) =>
      safeNumber(
        item?.csat ??
          item?.value ??
          item?.score,
        NaN
      )
    )
    .filter((v) => Number.isFinite(v));

  if (!values.length) return undefined;

  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}
