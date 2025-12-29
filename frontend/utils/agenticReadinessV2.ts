/**
 * Agentic Readiness Score v2.0
 * Algoritmo basado en metodología de 6 dimensiones con normalización continua
 */

import type { TierKey, SubFactor, AgenticReadinessResult, CustomerSegment } from '../types';
import { AGENTIC_READINESS_WEIGHTS, AGENTIC_READINESS_THRESHOLDS } from '../constants';

export interface AgenticReadinessInput {
  // Datos básicos (SILVER)
  volumen_mes: number;
  aht_values: number[];
  escalation_rate: number;
  cpi_humano: number;
  volumen_anual: number;
  
  // Datos avanzados (GOLD)
  structured_fields_pct?: number;
  exception_rate?: number;
  hourly_distribution?: number[];
  off_hours_pct?: number;
  csat_values?: number[];
  motivo_contacto_entropy?: number;
  resolucion_entropy?: number;
  
  // Tier
  tier: TierKey;
}

/**
 * SUB-FACTOR 1: REPETITIVIDAD (25%)
 * Basado en volumen mensual con normalización logística
 */
function calculateRepetitividadScore(volumen_mes: number): SubFactor {
  const { k, x0 } = AGENTIC_READINESS_THRESHOLDS.repetitividad;
  
  // Función logística: score = 10 / (1 + exp(-k * (volumen - x0)))
  const score = 10 / (1 + Math.exp(-k * (volumen_mes - x0)));
  
  return {
    name: 'repetitividad',
    displayName: 'Repetitividad',
    score: Math.round(score * 10) / 10,
    weight: AGENTIC_READINESS_WEIGHTS.repetitividad,
    description: `Volumen mensual: ${volumen_mes} interacciones`,
    details: {
      volumen_mes,
      threshold_medio: x0
    }
  };
}

/**
 * SUB-FACTOR 2: PREDICTIBILIDAD (20%)
 * Basado en variabilidad AHT + tasa de escalación + variabilidad input/output
 */
function calculatePredictibilidadScore(
  aht_values: number[],
  escalation_rate: number,
  motivo_contacto_entropy?: number,
  resolucion_entropy?: number
): SubFactor {
  const thresholds = AGENTIC_READINESS_THRESHOLDS.predictibilidad;
  
  // 1. VARIABILIDAD AHT (40%)
  const aht_mean = aht_values.reduce((a, b) => a + b, 0) / aht_values.length;
  const aht_variance = aht_values.reduce((sum, val) => sum + Math.pow(val - aht_mean, 2), 0) / aht_values.length;
  const aht_std = Math.sqrt(aht_variance);
  const cv_aht = aht_std / aht_mean;
  
  // Normalizar CV a escala 0-10
  const score_aht = Math.max(0, Math.min(10, 
    10 * (1 - (cv_aht - thresholds.cv_aht_excellent) / (thresholds.cv_aht_poor - thresholds.cv_aht_excellent))
  ));
  
  // 2. TASA DE ESCALACIÓN (30%)
  const score_escalacion = Math.max(0, Math.min(10, 
    10 * (1 - escalation_rate / thresholds.escalation_poor)
  ));
  
  // 3. VARIABILIDAD INPUT/OUTPUT (30%)
  let score_variabilidad: number;
  if (motivo_contacto_entropy !== undefined && resolucion_entropy !== undefined) {
    // Alta entropía input + Baja entropía output = BUENA para automatización
    const input_normalized = Math.min(motivo_contacto_entropy / 3.0, 1.0);
    const output_normalized = Math.min(resolucion_entropy / 3.0, 1.0);
    score_variabilidad = 10 * (input_normalized * (1 - output_normalized));
  } else {
    // Si no hay datos de entropía, usar promedio de AHT y escalación
    score_variabilidad = (score_aht + score_escalacion) / 2;
  }
  
  // PONDERACIÓN FINAL
  const predictibilidad = (
    0.40 * score_aht +
    0.30 * score_escalacion +
    0.30 * score_variabilidad
  );
  
  return {
    name: 'predictibilidad',
    displayName: 'Predictibilidad',
    score: Math.round(predictibilidad * 10) / 10,
    weight: AGENTIC_READINESS_WEIGHTS.predictibilidad,
    description: `CV AHT: ${(cv_aht * 100).toFixed(1)}%, Escalación: ${(escalation_rate * 100).toFixed(1)}%`,
    details: {
      cv_aht: Math.round(cv_aht * 1000) / 1000,
      escalation_rate,
      score_aht: Math.round(score_aht * 10) / 10,
      score_escalacion: Math.round(score_escalacion * 10) / 10,
      score_variabilidad: Math.round(score_variabilidad * 10) / 10
    }
  };
}

/**
 * SUB-FACTOR 3: ESTRUCTURACIÓN (15%)
 * Porcentaje de campos estructurados vs texto libre
 */
function calculateEstructuracionScore(structured_fields_pct: number): SubFactor {
  const score = structured_fields_pct * 10;
  
  return {
    name: 'estructuracion',
    displayName: 'Estructuración',
    score: Math.round(score * 10) / 10,
    weight: AGENTIC_READINESS_WEIGHTS.estructuracion,
    description: `${(structured_fields_pct * 100).toFixed(0)}% de campos estructurados`,
    details: {
      structured_fields_pct
    }
  };
}

/**
 * SUB-FACTOR 4: COMPLEJIDAD INVERSA (15%)
 * Basado en tasa de excepciones
 */
function calculateComplejidadInversaScore(exception_rate: number): SubFactor {
  // Menor tasa de excepciones → Mayor score
  // < 5% → Excelente (score 10)
  // > 30% → Muy complejo (score 0)
  const score_excepciones = Math.max(0, Math.min(10, 10 * (1 - exception_rate / 0.30)));
  
  return {
    name: 'complejidad_inversa',
    displayName: 'Complejidad Inversa',
    score: Math.round(score_excepciones * 10) / 10,
    weight: AGENTIC_READINESS_WEIGHTS.complejidad_inversa,
    description: `${(exception_rate * 100).toFixed(1)}% de excepciones`,
    details: {
      exception_rate
    }
  };
}

/**
 * SUB-FACTOR 5: ESTABILIDAD (10%)
 * Basado en distribución horaria y % llamadas fuera de horas
 */
function calculateEstabilidadScore(
  hourly_distribution: number[],
  off_hours_pct: number
): SubFactor {
  // 1. UNIFORMIDAD DISTRIBUCIÓN HORARIA (60%)
  // Calcular entropía de Shannon
  const total = hourly_distribution.reduce((a, b) => a + b, 0);
  let score_uniformidad = 0;
  let entropy_normalized = 0;

  if (total > 0) {
    const probs = hourly_distribution.map(v => v / total).filter(p => p > 0);
    const entropy = -probs.reduce((sum, p) => sum + p * Math.log2(p), 0);
    const max_entropy = Math.log2(hourly_distribution.length);
    entropy_normalized = entropy / max_entropy;
    score_uniformidad = entropy_normalized * 10;
  }
  
  // 2. % LLAMADAS FUERA DE HORAS (40%)
  // Más llamadas fuera de horas → Mayor necesidad agentes → Mayor score
  const score_off_hours = Math.min(10, (off_hours_pct / 0.30) * 10);
  
  // PONDERACIÓN
  const estabilidad = (
    0.60 * score_uniformidad +
    0.40 * score_off_hours
  );
  
  return {
    name: 'estabilidad',
    displayName: 'Estabilidad',
    score: Math.round(estabilidad * 10) / 10,
    weight: AGENTIC_READINESS_WEIGHTS.estabilidad,
    description: `${(off_hours_pct * 100).toFixed(1)}% fuera de horario`,
    details: {
      entropy_normalized: Math.round(entropy_normalized * 1000) / 1000,
      off_hours_pct,
      score_uniformidad: Math.round(score_uniformidad * 10) / 10,
      score_off_hours: Math.round(score_off_hours * 10) / 10
    }
  };
}

/**
 * SUB-FACTOR 6: ROI (15%)
 * Basado en ahorro potencial anual
 */
function calculateROIScore(
  volumen_anual: number,
  cpi_humano: number,
  automation_savings_pct: number = 0.70
): SubFactor {
  const ahorro_anual = volumen_anual * cpi_humano * automation_savings_pct;
  
  // Normalización logística
  const { k, x0 } = AGENTIC_READINESS_THRESHOLDS.roi;
  const score = 10 / (1 + Math.exp(-k * (ahorro_anual - x0)));
  
  return {
    name: 'roi',
    displayName: 'ROI',
    score: Math.round(score * 10) / 10,
    weight: AGENTIC_READINESS_WEIGHTS.roi,
    description: `€${(ahorro_anual / 1000).toFixed(0)}K ahorro potencial anual`,
    details: {
      ahorro_anual: Math.round(ahorro_anual),
      volumen_anual,
      cpi_humano,
      automation_savings_pct
    }
  };
}

/**
 * AJUSTE POR DISTRIBUCIÓN CSAT (Opcional, ±10%)
 * Distribución normal → Proceso estable
 */
function calculateCSATDistributionAdjustment(csat_values: number[]): number {
  // Test de normalidad simplificado (basado en skewness y kurtosis)
  const n = csat_values.length;
  const mean = csat_values.reduce((a, b) => a + b, 0) / n;
  const variance = csat_values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const std = Math.sqrt(variance);
  
  // Skewness
  const skewness = csat_values.reduce((sum, val) => sum + Math.pow((val - mean) / std, 3), 0) / n;
  
  // Kurtosis
  const kurtosis = csat_values.reduce((sum, val) => sum + Math.pow((val - mean) / std, 4), 0) / n;
  
  // Normalidad: skewness cercano a 0, kurtosis cercano a 3
  const skewness_score = Math.max(0, 1 - Math.abs(skewness));
  const kurtosis_score = Math.max(0, 1 - Math.abs(kurtosis - 3) / 3);
  const normality_score = (skewness_score + kurtosis_score) / 2;
  
  // Ajuste: +5% si muy normal, -5% si muy anormal
  const adjustment = 1 + ((normality_score - 0.5) * 0.10);
  
  return adjustment;
}

/**
 * ALGORITMO COMPLETO (Tier GOLD)
 */
export function calculateAgenticReadinessScoreGold(data: AgenticReadinessInput): AgenticReadinessResult {
  const sub_factors: SubFactor[] = [];
  
  // 1. REPETITIVIDAD
  sub_factors.push(calculateRepetitividadScore(data.volumen_mes));
  
  // 2. PREDICTIBILIDAD
  sub_factors.push(calculatePredictibilidadScore(
    data.aht_values,
    data.escalation_rate,
    data.motivo_contacto_entropy,
    data.resolucion_entropy
  ));
  
  // 3. ESTRUCTURACIÓN
  sub_factors.push(calculateEstructuracionScore(data.structured_fields_pct || 0.5));
  
  // 4. COMPLEJIDAD INVERSA
  sub_factors.push(calculateComplejidadInversaScore(data.exception_rate || 0.15));
  
  // 5. ESTABILIDAD
  sub_factors.push(calculateEstabilidadScore(
    data.hourly_distribution || Array(24).fill(1),
    data.off_hours_pct || 0.2
  ));
  
  // 6. ROI
  sub_factors.push(calculateROIScore(
    data.volumen_anual,
    data.cpi_humano
  ));
  
  // PONDERACIÓN BASE
  const agentic_readiness_base = sub_factors.reduce(
    (sum, factor) => sum + (factor.score * factor.weight),
    0
  );
  
  // AJUSTE POR DISTRIBUCIÓN CSAT (Opcional)
  let agentic_readiness_final = agentic_readiness_base;
  if (data.csat_values && data.csat_values.length > 10) {
    const adjustment = calculateCSATDistributionAdjustment(data.csat_values);
    agentic_readiness_final = agentic_readiness_base * adjustment;
  }
  
  // Limitar a rango 0-10
  agentic_readiness_final = Math.max(0, Math.min(10, agentic_readiness_final));
  
  // Interpretación
  let interpretation = '';
  let confidence: 'high' | 'medium' | 'low' = 'high';
  
  if (agentic_readiness_final >= 8) {
    interpretation = 'Excelente candidato para automatización completa (Automate)';
  } else if (agentic_readiness_final >= 5) {
    interpretation = 'Buen candidato para asistencia agéntica (Assist)';
  } else if (agentic_readiness_final >= 3) {
    interpretation = 'Candidato para augmentación humana (Augment)';
  } else {
    interpretation = 'No recomendado para automatización en este momento';
  }
  
  return {
    score: Math.round(agentic_readiness_final * 10) / 10,
    sub_factors,
    tier: 'gold',
    confidence,
    interpretation
  };
}

/**
 * ALGORITMO SIMPLIFICADO (Tier SILVER)
 */
export function calculateAgenticReadinessScoreSilver(data: AgenticReadinessInput): AgenticReadinessResult {
  const sub_factors: SubFactor[] = [];
  
  // 1. REPETITIVIDAD (30%)
  const repetitividad = calculateRepetitividadScore(data.volumen_mes);
  repetitividad.weight = 0.30;
  sub_factors.push(repetitividad);
  
  // 2. PREDICTIBILIDAD SIMPLIFICADA (30%)
  const predictibilidad = calculatePredictibilidadScore(
    data.aht_values,
    data.escalation_rate
  );
  predictibilidad.weight = 0.30;
  sub_factors.push(predictibilidad);
  
  // 3. ROI (40%)
  const roi = calculateROIScore(data.volumen_anual, data.cpi_humano);
  roi.weight = 0.40;
  sub_factors.push(roi);
  
  // PONDERACIÓN SIMPLIFICADA
  const agentic_readiness = sub_factors.reduce(
    (sum, factor) => sum + (factor.score * factor.weight),
    0
  );
  
  // Interpretación
  let interpretation = '';
  if (agentic_readiness >= 7) {
    interpretation = 'Buen candidato para automatización';
  } else if (agentic_readiness >= 4) {
    interpretation = 'Candidato para asistencia agéntica';
  } else {
    interpretation = 'Requiere análisis más profundo (considerar GOLD)';
  }
  
  return {
    score: Math.round(agentic_readiness * 10) / 10,
    sub_factors,
    tier: 'silver',
    confidence: 'medium',
    interpretation
  };
}

/**
 * FUNCIÓN PRINCIPAL - Selecciona algoritmo según tier
 */
export function calculateAgenticReadinessScore(data: AgenticReadinessInput): AgenticReadinessResult {
  if (data.tier === 'gold') {
    return calculateAgenticReadinessScoreGold(data);
  } else if (data.tier === 'silver') {
    return calculateAgenticReadinessScoreSilver(data);
  } else {
    // BRONZE: Sin Agentic Readiness
    return {
      score: 0,
      sub_factors: [],
      tier: 'bronze',
      confidence: 'low',
      interpretation: 'Análisis Bronze no incluye Agentic Readiness Score'
    };
  }
}
