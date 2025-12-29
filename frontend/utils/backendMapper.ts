// utils/backendMapper.ts
import type {
  AnalysisData,
  AgenticReadinessResult,
  SubFactor,
  TierKey,
  DimensionAnalysis,
  Kpi,
  EconomicModelData,
} from '../types';
import type { BackendRawResults } from './apiClient';
import { BarChartHorizontal, Zap, DollarSign } from 'lucide-react';

function safeNumber(value: any, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
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

  const summaryParts: string[] = [];
  summaryParts.push(
    `Se han analizado aproximadamente ${totalVolume.toLocaleString(
      'es-ES'
    )} interacciones mensuales.`
  );
  if (numChannels > 0) {
    summaryParts.push(
      `El tráfico se reparte en ${numChannels} canales${
        topChannel ? `, destacando ${topChannel} como el canal con mayor volumen` : ''
      }.`
    );
  }
  if (numSkills > 0) {
    const skillsList =
      skillLabels.length > 0 ? skillLabels.join(', ') : undefined;
    summaryParts.push(
      `Se han identificado ${numSkills} skills${
        skillsList ? ` (${skillsList})` : ''
      }${
        topSkill ? `, siendo ${topSkill} la de mayor carga` : ''
      }.`
    );
  }

  const dimension: DimensionAnalysis = {
    id: 'volumetry_distribution',
    name: 'volumetry_distribution',
    title: 'Volumetría y distribución de demanda',
    score: computeBalanceScore(
      skillValues.length ? skillValues : channelValues
    ),
    percentile: undefined,
    summary: summaryParts.join(' '),
    kpi: {
      label: 'Interacciones mensuales (backend)',
      value: totalVolume.toLocaleString('es-ES'),
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

// ==== Performance (operational_performance) ====

function buildPerformanceDimension(
  raw: BackendRawResults
): DimensionAnalysis | undefined {
  const op = raw?.operational_performance;
  if (!op) return undefined;

  const perfScore0_10 = safeNumber(op.performance_score?.score, NaN);
  if (!Number.isFinite(perfScore0_10)) return undefined;

  const score = Math.max(
    0,
    Math.min(100, Math.round(perfScore0_10 * 10))
  );

  const ahtP50 = safeNumber(op.aht_distribution?.p50, 0);
  const ahtP90 = safeNumber(op.aht_distribution?.p90, 0);
  const ratio = safeNumber(op.aht_distribution?.p90_p50_ratio, 0);
  const escRate = safeNumber(op.escalation_rate, 0);

  let summary = `El AHT mediano se sitúa en ${Math.round(
    ahtP50
  )} segundos, con un P90 de ${Math.round(
    ahtP90
  )}s (ratio P90/P50 ≈ ${ratio.toFixed(
    2
  )}) y una tasa de escalación del ${escRate.toFixed(
    1
  )}%. `;

  if (score >= 80) {
    summary +=
      'El rendimiento operativo es sólido y se encuentra claramente por encima de los umbrales objetivo.';
  } else if (score >= 60) {
    summary +=
      'El rendimiento es aceptable pero existen oportunidades claras de optimización en algunos flujos.';
  } else {
    summary +=
      'El rendimiento operativo está por debajo del nivel deseado y requiere un plan de mejora específico.';
  }

  const kpi: Kpi = {
    label: 'AHT mediano (P50)',
    value: ahtP50 ? `${Math.round(ahtP50)}s` : 'N/D',
  };

  const dimension: DimensionAnalysis = {
    id: 'performance',
    name: 'performance',
    title: 'Rendimiento operativo',
    score,
    percentile: undefined,
    summary,
    kpi,
    icon: Zap,
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

function buildEconomyDimension(
  raw: BackendRawResults
): DimensionAnalysis | undefined {
  const econ = raw?.economy_costs;
  if (!econ) return undefined;

  const cost = econ.cost_breakdown || {};
  const totalAnnual = safeNumber(cost.total_annual, 0);
  const potential = econ.potential_savings || {};
  const annualSavings = safeNumber(potential.annual_savings, 0);

  if (!totalAnnual && !annualSavings) return undefined;

  const savingsPct = totalAnnual
    ? (annualSavings / totalAnnual) * 100
    : 0;

  let summary = `El coste anual estimado de la operación es de aproximadamente €${totalAnnual.toFixed(
    2
  )}. `;
  if (annualSavings > 0) {
    summary += `El ahorro potencial anual asociado a la estrategia agentic se sitúa en torno a €${annualSavings.toFixed(
      2
    )}, equivalente a ~${savingsPct.toFixed(1)}% del coste actual.`;
  } else {
    summary +=
      'Todavía no se dispone de una estimación robusta de ahorro potencial.';
  }

  const score =
    totalAnnual && annualSavings
      ? Math.max(0, Math.min(100, Math.round(savingsPct)))
      : 50;

  const dimension: DimensionAnalysis = {
    id: 'economy',
    name: 'economy',
    title: 'Economía y costes',
    score,
    percentile: undefined,
    summary,
    kpi: {
      label: 'Coste anual actual',
      value: totalAnnual
        ? `€${totalAnnual.toFixed(0)}`
        : 'N/D',
    },
    icon: DollarSign,
  };

  return dimension;
}

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

  // Dimensiones
  const { dimension: volumetryDimension, extraKpis } =
    buildVolumetryDimension(raw);
  const performanceDimension = buildPerformanceDimension(raw);
  const economyDimension = buildEconomyDimension(raw);

  const dimensions: DimensionAnalysis[] = [];
  if (volumetryDimension) dimensions.push(volumetryDimension);
  if (performanceDimension) dimensions.push(performanceDimension);
  if (economyDimension) dimensions.push(economyDimension);

  // KPIs de resumen
  const summaryKpis: Kpi[] = [];

  summaryKpis.push({
    label: 'Volumen total (estimado)',
    value:
      totalVolume > 0
        ? totalVolume.toLocaleString('es-ES')
        : 'N/A',
  });

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

  // KPIs de economía
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

  return {
    tier: tierFromFrontend,
    overallHealthScore,
    summaryKpis: mergedKpis,
    dimensions,
    heatmapData: [], // el heatmap por skill lo seguimos generando en el front
    findings: [],
    recommendations: [],
    opportunities: [],
    roadmap: [],
    economicModel,
    benchmarkData: [],
    agenticReadiness,
    staticConfig: undefined,
  };
}
