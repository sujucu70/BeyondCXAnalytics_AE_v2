// analysisGenerator.ts - v2.0 con 6 dimensiones
import type { AnalysisData, Kpi, DimensionAnalysis, HeatmapDataPoint, Opportunity, RoadmapInitiative, EconomicModelData, BenchmarkDataPoint, Finding, Recommendation, TierKey, CustomerSegment } from '../types';
import { generateAnalysisFromRealData } from './realDataAnalysis';
import { RoadmapPhase } from '../types';
import { BarChartHorizontal, Zap, Target, Brain, Bot } from 'lucide-react';
import { calculateAgenticReadinessScore, type AgenticReadinessInput } from './agenticReadinessV2';
import { callAnalysisApiRaw } from './apiClient';
import {
  mapBackendResultsToAnalysisData,
  buildHeatmapFromBackend,
} from './backendMapper';



const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number, decimals: number) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
const randomFromList = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Distribución normal (Box-Muller transform)
const normalRandom = (mean: number, std: number): number => {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z0;
};

const getScoreColor = (score: number): 'green' | 'yellow' | 'red' => {
  if (score >= 80) return 'green';
  if (score >= 60) return 'yellow';
  return 'red';
};

// v3.0: 5 DIMENSIONES VIABLES
const DIMENSIONS_CONTENT = {
    volumetry_distribution: {
        icon: BarChartHorizontal,
        titles: ["Volumetría & Distribución", "Análisis de la Demanda"],
        summaries: {
            good: ["El volumen de interacciones se alinea con las previsiones, permitiendo una planificación de personal precisa.", "La distribución horaria es uniforme con picos predecibles. Concentración Pareto equilibrada."],
            medium: ["Existen picos de demanda imprevistos que generan caídas en el nivel de servicio.", "Alta concentración en pocas colas (>80% en 20% de colas), riesgo de cuellos de botella."],
            bad: ["Desajuste crónico entre el forecast y el volumen real, resultando en sobrecostes o mal servicio.", "Distribución horaria muy irregular con múltiples picos impredecibles."]
        },
        kpis: [
            { label: "Volumen Mensual", value: `${randomInt(5000, 25000).toLocaleString('es-ES')}` },
            { label: "% Fuera de Horario", value: `${randomInt(15, 45)}%` },
        ],
    },
    operational_efficiency: {
        icon: Zap,
        titles: ["Eficiencia Operativa", "Optimización de Tiempos"],
        summaries: {
            good: ["El ratio P90/P50 es bajo (<1.5), indicando tiempos consistentes y procesos estandarizados.", "Tiempos de espera, hold y ACW bien controlados, maximizando la productividad."],
            medium: ["El ratio P90/P50 es moderado (1.5-2.0), existen casos outliers que afectan la eficiencia.", "El tiempo de hold es ligeramente elevado, sugiriendo mejoras en acceso a información."],
            bad: ["Alto ratio P90/P50 (>2.0), indicando alta variabilidad en tiempos de gestión.", "Tiempos de ACW y hold prolongados indican procesos manuales ineficientes."]
        },
        kpis: [
            { label: "AHT P50", value: `${randomInt(280, 450)}s` },
            { label: "Ratio P90/P50", value: `${randomFloat(1.2, 2.5, 2)}` },
        ],
    },
    effectiveness_resolution: {
        icon: Target,
        titles: ["Efectividad & Resolución", "Calidad del Servicio"],
        summaries: {
            good: ["FCR proxy >85%, mínima repetición de contactos a 7 días.", "Baja tasa de transferencias (<10%) y llamadas problemáticas (<5%)."],
            medium: ["FCR proxy 70-85%, hay oportunidad de reducir recontactos.", "Tasa de transferencias moderada (10-20%), concentradas en ciertas colas."],
            bad: ["FCR proxy <70%, alto volumen de recontactos a 7 días.", "Alta tasa de llamadas problemáticas (>15%) y transferencias excesivas."]
        },
        kpis: [
            { label: "FCR Proxy 7d", value: `${randomInt(65, 92)}%` },
            { label: "Tasa Transfer", value: `${randomInt(5, 25)}%` },
        ],
    },
    complexity_predictability: {
        icon: Brain,
        titles: ["Complejidad & Predictibilidad", "Análisis de Variabilidad"],
        summaries: {
            good: ["Baja variabilidad AHT (ratio P90/P50 <1.5), proceso altamente predecible.", "Diversidad de tipificaciones controlada, bajo % de llamadas con múltiples holds."],
            medium: ["Variabilidad AHT moderada, algunos casos outliers afectan la predictibilidad.", "% llamadas con múltiples holds elevado (15-30%), indicando complejidad."],
            bad: ["Alta variabilidad AHT (ratio >2.0), proceso impredecible y difícil de automatizar.", "Alta diversidad de tipificaciones y % transferencias, indicando alta complejidad."]
        },
        kpis: [
            { label: "Ratio P90/P50", value: `${randomFloat(1.2, 2.5, 2)}` },
            { label: "% Transferencias", value: `${randomInt(5, 30)}%` },
        ],
    },
    agentic_readiness: {
        icon: Bot,
        titles: ["Agentic Readiness", "Potencial de Automatización"],
        summaries: {
            good: ["Score 8-10: Excelente candidato para automatización completa con agentes IA.", "Alto volumen, baja variabilidad, pocas transferencias. Proceso repetitivo y predecible."],
            medium: ["Score 5-7: Candidato para asistencia con IA (copilot) o automatización parcial.", "Volumen moderado con algunas complejidades que requieren supervisión humana."],
            bad: ["Score 0-4: Requiere optimización previa antes de automatizar.", "Alta complejidad, baja repetitividad o variabilidad excesiva."]
        },
        kpis: [
            { label: "Score Global", value: `${randomFloat(3.0, 9.5, 1)}/10` },
            { label: "Categoría", value: randomFromList(['Automatizar', 'Asistir', 'Optimizar']) },
        ],
    },
};

const KEY_FINDINGS: Finding[] = [
    {
        text: "El ratio P90/P50 de AHT es alto (>2.0) en varias colas, indicando alta variabilidad.",
        dimensionId: 'operational_efficiency',
        type: 'warning',
        title: 'Alta Variabilidad en Tiempos',
        description: 'Procesos poco estandarizados generan tiempos impredecibles y afectan la planificación.',
        impact: 'high'
    },
    {
        text: "Un 22% de las transferencias desde 'Soporte Técnico N1' hacia otras colas son incorrectas.",
        dimensionId: 'effectiveness_resolution',
        type: 'warning',
        title: 'Enrutamiento Incorrecto',
        description: 'Existe un problema de routing que genera ineficiencias y experiencia pobre del cliente.',
        impact: 'high'
    },
    {
        text: "El pico de demanda de los lunes por la mañana provoca una caída del Nivel de Servicio al 65%.",
        dimensionId: 'volumetry_distribution',
        type: 'critical',
        title: 'Crisis de Capacidad (Lunes por la mañana)',
        description: 'Los lunes 8-11h generan picos impredecibles que agotan la capacidad disponible.',
        impact: 'high'
    },
    {
        text: "El 28% de las interacciones ocurren fuera del horario laboral estándar (8-18h).",
        dimensionId: 'volumetry_distribution',
        type: 'info',
        title: 'Demanda Fuera de Horario',
        description: 'Casi 1 de 3 interacciones se produce fuera del horario laboral, requiriendo cobertura extendida.',
        impact: 'medium'
    },
    {
        text: "Las consultas sobre 'estado del pedido' representan el 30% de las interacciones y tienen alta repetitividad.",
        dimensionId: 'agentic_readiness',
        type: 'info',
        title: 'Oportunidad de Automatización: Estado de Pedido',
        description: 'Volumen significativo en consultas altamente repetitivas y automatizables (Score Agentic >8).',
        impact: 'high'
    },
    {
        text: "FCR proxy <75% en colas de facturación, alto recontacto a 7 días.",
        dimensionId: 'effectiveness_resolution',
        type: 'warning',
        title: 'Baja Resolución en Facturación',
        description: 'El equipo de facturación tiene alto % de recontactos, indicando problemas de resolución.',
        impact: 'high'
    },
    {
        text: "Alta diversidad de tipificaciones y >20% llamadas con múltiples holds en colas complejas.",
        dimensionId: 'complexity_predictability',
        type: 'warning',
        title: 'Alta Complejidad en Ciertas Colas',
        description: 'Colas con alta complejidad requieren optimización antes de considerar automatización.',
        impact: 'medium'
    },
];

const RECOMMENDATIONS: Recommendation[] = [
    {
        text: "Estandarizar procesos en colas con alto ratio P90/P50 para reducir variabilidad.",
        dimensionId: 'operational_efficiency',
        priority: 'high',
        title: 'Estandarización de Procesos',
        description: 'Implementar scripts y guías paso a paso para reducir la variabilidad en tiempos de gestión.',
        impact: 'Reducción ratio P90/P50: 20-30%, Mejora predictibilidad',
        timeline: '3-4 semanas'
    },
    {
        text: "Desarrollar un bot de estado de pedido para WhatsApp para desviar el 30% de las consultas.",
        dimensionId: 'agentic_readiness',
        priority: 'high',
        title: 'Bot Automatizado de Seguimiento de Pedidos',
        description: 'Implementar ChatBot en WhatsApp para consultas con alto Agentic Score (>8).',
        impact: 'Reducción de volumen: 20-30%, Ahorro anual: €40-60K',
        timeline: '1-2 meses'
    },
    {
        text: "Revisar la planificación de personal (WFM) para los lunes, añadiendo recursos flexibles.",
        dimensionId: 'volumetry_distribution',
        priority: 'high',
        title: 'Ajuste de Plantilla (WFM)',
        description: 'Reposicionar agentes y añadir recursos part-time para los lunes 8-11h.',
        impact: 'Mejora del NSL: +15-20%, Coste adicional: €5-8K/mes',
        timeline: '1 mes'
    },
    {
        text: "Crear una Knowledge Base más robusta para reducir hold time y mejorar FCR.",
        dimensionId: 'effectiveness_resolution',
        priority: 'high',
        title: 'Mejora de Acceso a Información',
        description: 'Desarrollar una KB centralizada para reducir búsquedas y mejorar resolución en primer contacto.',
        impact: 'Reducción hold time: 15-25%, Mejora FCR: 5-10%',
        timeline: '6-8 semanas'
    },
    {
        text: "Implementar cobertura 24/7 con agentes virtuales para el 28% de interacciones fuera de horario.",
        dimensionId: 'volumetry_distribution',
        priority: 'medium',
        title: 'Cobertura 24/7 con IA',
        description: 'Desplegar agentes virtuales para gestionar interacciones nocturnas y fines de semana.',
        impact: 'Captura de demanda: 20-25%, Coste incremental: €15-20K/mes',
        timeline: '2-3 meses'
    },
    {
        text: "Simplificar tipificaciones y reducir complejidad en colas problemáticas.",
        dimensionId: 'complexity_predictability',
        priority: 'medium',
        title: 'Reducción de Complejidad',
        description: 'Consolidar tipificaciones y simplificar flujos para mejorar predictibilidad.',
        impact: 'Reducción de complejidad: 20-30%, Mejora Agentic Score',
        timeline: '4-6 semanas'
    },
];


// === RECOMENDACIONES BASADAS EN DATOS REALES ===
const MAX_RECOMMENDATIONS = 4;

const generateRecommendationsFromData = (
  analysis: AnalysisData
): Recommendation[] => {
  const dimensions = analysis.dimensions || [];
  const dimScoreMap = new Map<string, number>();

  dimensions.forEach((d) => {
    if (d.id && typeof d.score === 'number') {
      dimScoreMap.set(d.id, d.score);
    }
  });

  const overallScore =
    typeof analysis.overallHealthScore === 'number'
      ? analysis.overallHealthScore
      : 70;

  const econ = analysis.economicModel;
  const annualSavings = econ?.annualSavings ?? 0;
  const currentCost = econ?.currentAnnualCost ?? 0;

  // Relevancia por recomendación
  const scoredTemplates = RECOMMENDATIONS.map((tpl, index) => {
    const dimId = tpl.dimensionId || 'overall';
    const dimScore = dimScoreMap.get(dimId) ?? overallScore;

    let relevance = 0;

    // 1) Dimensiones débiles => más relevancia
    if (dimScore < 60) relevance += 3;
    else if (dimScore < 75) relevance += 2;
    else if (dimScore < 85) relevance += 1;

    // 2) Prioridad declarada en la plantilla
    if (tpl.priority === 'high') relevance += 2;
    else if (tpl.priority === 'medium') relevance += 1;

    // 3) Refuerzo en función del potencial económico
    if (
      annualSavings > 0 &&
      currentCost > 0 &&
      annualSavings / currentCost > 0.15 &&
      dimId === 'economy'
    ) {
      relevance += 2;
    }

    // 4) Ligera penalización si la dimensión ya está muy bien (>85)
    if (dimScore > 85) relevance -= 1;

    return {
      tpl,
      relevance,
      index, // por si queremos desempatar
    };
  });

  // Filtramos las que no aportan nada (relevance <= 0)
  let filtered = scoredTemplates.filter((s) => s.relevance > 0);

  // Si ninguna pasa el filtro (por ejemplo, todo muy bien),
  // nos quedamos al menos con 2–3 de las de mayor prioridad
  if (filtered.length === 0) {
    filtered = scoredTemplates
      .slice()
      .sort((a, b) => {
        const prioWeight = (p?: 'high' | 'medium' | 'low') => {
          if (p === 'high') return 3;
          if (p === 'medium') return 2;
          return 1;
        };
        return (
          prioWeight(b.tpl.priority) - prioWeight(a.tpl.priority)
        );
      })
      .slice(0, MAX_RECOMMENDATIONS);
  } else {
    // Ordenamos por relevancia (desc), y en empate, por orden original
    filtered.sort((a, b) => {
      if (b.relevance !== a.relevance) {
        return b.relevance - a.relevance;
      }
      return a.index - b.index;
    });
  }

  const selected = filtered.slice(0, MAX_RECOMMENDATIONS).map((s) => s.tpl);

  // Mapear a tipo Recommendation completo
  return selected.map((rec, i): Recommendation => ({
    priority:
      rec.priority || (i === 0 ? ('high' as const) : ('medium' as const)),
    title: rec.title || 'Recomendación',
    description: rec.description || rec.text,
    impact:
      rec.impact ||
      'Mejora estimada del 10-20% en los KPIs clave.',
    timeline: rec.timeline || '4-8 semanas',
    // campos obligatorios:
    text:
      rec.text ||
      rec.description ||
      'Recomendación prioritaria basada en el análisis de datos.',
    dimensionId: rec.dimensionId || 'overall',
  }));
};

// === FINDINGS BASADOS EN DATOS REALES ===

const MAX_FINDINGS = 5;

const generateFindingsFromData = (
  analysis: AnalysisData
): Finding[] => {
  const dimensions = analysis.dimensions || [];
  const dimScoreMap = new Map<string, number>();

  dimensions.forEach((d) => {
    if (d.id && typeof d.score === 'number') {
      dimScoreMap.set(d.id, d.score);
    }
  });

  const overallScore =
    typeof analysis.overallHealthScore === 'number'
      ? analysis.overallHealthScore
      : 70;

  // Miramos volumetría para reforzar algunos findings
  const volumetryDim = dimensions.find(
    (d) => d.id === 'volumetry_distribution'
  );
  const offHoursPct =
    volumetryDim?.distribution_data?.off_hours_pct ?? 0;

  // Relevancia por finding
  const scoredTemplates = KEY_FINDINGS.map((tpl, index) => {
    const dimId = tpl.dimensionId || 'overall';
    const dimScore = dimScoreMap.get(dimId) ?? overallScore;

    let relevance = 0;

    // 1) Dimensiones débiles => más relevancia
    if (dimScore < 60) relevance += 3;
    else if (dimScore < 75) relevance += 2;
    else if (dimScore < 85) relevance += 1;

    // 2) Tipo de finding (critical > warning > info)
    if (tpl.type === 'critical') relevance += 3;
    else if (tpl.type === 'warning') relevance += 2;
    else relevance += 1;

    // 3) Impacto (high > medium > low)
    if (tpl.impact === 'high') relevance += 2;
    else if (tpl.impact === 'medium') relevance += 1;

    // 4) Refuerzo en volumetría si hay mucha demanda fuera de horario
    if (
      offHoursPct > 0.25 &&
      tpl.dimensionId === 'volumetry_distribution'
    ) {
      relevance += 2;
      if (
        tpl.title?.toLowerCase().includes('fuera de horario') ||
        tpl.text
          ?.toLowerCase()
          .includes('fuera del horario laboral')
      ) {
        relevance += 1;
      }
    }

    return {
      tpl,
      relevance,
      index,
    };
  });

  // Filtramos los que no aportan nada (relevance <= 0)
  let filtered = scoredTemplates.filter((s) => s.relevance > 0);

  // Si nada pasa el filtro, cogemos al menos algunos por prioridad/tipo
  if (filtered.length === 0) {
    filtered = scoredTemplates
      .slice()
      .sort((a, b) => {
        const typeWeight = (t?: Finding['type']) => {
          if (t === 'critical') return 3;
          if (t === 'warning') return 2;
          return 1;
        };
        const impactWeight = (imp?: string) => {
          if (imp === 'high') return 3;
          if (imp === 'medium') return 2;
          return 1;
        };
        const scoreA =
          typeWeight(a.tpl.type) + impactWeight(a.tpl.impact);
        const scoreB =
          typeWeight(b.tpl.type) + impactWeight(b.tpl.impact);
        return scoreB - scoreA;
      })
      .slice(0, MAX_FINDINGS);
  } else {
    // Ordenamos por relevancia (desc), y en empate, por orden original
    filtered.sort((a, b) => {
      if (b.relevance !== a.relevance) {
        return b.relevance - a.relevance;
      }
      return a.index - b.index;
    });
  }

  const selected = filtered.slice(0, MAX_FINDINGS).map((s) => s.tpl);

  // Mapear a tipo Finding completo
  return selected.map((finding, i): Finding => ({
    type:
      finding.type ||
      (i === 0
        ? ('warning' as const)
        : ('info' as const)),
    title: finding.title || 'Hallazgo',
    description: finding.description || finding.text,
    // campos obligatorios:
    text:
      finding.text ||
      finding.description ||
      'Hallazgo relevante basado en datos.',
    dimensionId: finding.dimensionId || 'overall',
    impact: finding.impact,
  }));
};


const generateFindingsFromTemplates = (): Finding[] => {
  return [
    ...new Set(
      Array.from({ length: 3 }, () => randomFromList(KEY_FINDINGS))
    ),
  ].map((finding, i): Finding => ({
    type: finding.type || (i === 0 ? 'warning' : 'info'),
    title: finding.title || 'Hallazgo',
    description: finding.description || finding.text,
    // campos obligatorios:
    text: finding.text || finding.description || 'Hallazgo relevante',
    dimensionId: finding.dimensionId || 'overall',
    impact: finding.impact,
  }));
};

const generateRecommendationsFromTemplates = (): Recommendation[] => {
  return [
    ...new Set(
      Array.from({ length: 3 }, () => randomFromList(RECOMMENDATIONS))
    ),
  ].map((rec, i): Recommendation => ({
    priority: rec.priority || (i === 0 ? 'high' : 'medium'),
    title: rec.title || 'Recomendación',
    description: rec.description || rec.text,
    impact: rec.impact || 'Mejora estimada del 20-30%',
    timeline: rec.timeline || '1-2 semanas',
    // campos obligatorios:
    text: rec.text || rec.description || 'Recomendación prioritaria',
    dimensionId: rec.dimensionId || 'overall',
  }));
};


// v2.0: Generar distribución horaria realista
const generateHourlyDistribution = (): number[] => {
    // Distribución con picos en 9-11h y 14-17h
    const distribution = Array(24).fill(0).map((_, hour) => {
        if (hour >= 9 && hour <= 11) return randomInt(800, 1200);  // Pico mañana
        if (hour >= 14 && hour <= 17) return randomInt(700, 1000);  // Pico tarde
        if (hour >= 8 && hour <= 18) return randomInt(300, 600);   // Horario laboral
        return randomInt(50, 200);  // Fuera de horario
    });
    return distribution;
};

// v2.0: Calcular % fuera de horario
const calculateOffHoursPct = (hourly_distribution: number[]): number => {
    const total = hourly_distribution.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;  // Evitar división por cero
    const off_hours = hourly_distribution.slice(0, 8).reduce((a, b) => a + b, 0) +
                      hourly_distribution.slice(19, 24).reduce((a, b) => a + b, 0);
    return off_hours / total;
};

// v2.0: Identificar horas pico
const identifyPeakHours = (hourly_distribution: number[]): number[] => {
    if (!hourly_distribution || hourly_distribution.length === 0) return [];
    const sorted = [...hourly_distribution].sort((a, b) => b - a);
    const threshold = sorted[Math.min(2, sorted.length - 1)] || 0;  // Top 3 o máximo disponible
    return hourly_distribution
        .map((val, idx) => val >= threshold ? idx : -1)
        .filter(idx => idx !== -1);
};

// v2.1: Generar heatmap con nueva lógica de transformación (3 dimensiones)
const generateHeatmapData = (
    costPerHour: number = 20, 
    avgCsat: number = 85,
    segmentMapping?: { high_value_queues: string[]; medium_value_queues: string[]; low_value_queues: string[] }
): HeatmapDataPoint[] => {
    const skills = ['Ventas Inbound', 'Soporte Técnico N1', 'Facturación', 'Retención', 'VIP Support', 'Trial Support'];
    const COST_PER_SECOND = costPerHour / 3600;
    
    return skills.map(skill => {
        const volume = randomInt(800, 5500); // Volumen mensual (ampliado para cubrir rango de repetitividad)
        
        // Simular raw data: duration_talk, hold_time, wrap_up_time
        const avg_talk_time = randomInt(240, 450); // segundos
        const avg_hold_time = randomInt(15, 80); // segundos
        const avg_wrap_up = randomInt(10, 50); // segundos
        const aht_mean = avg_talk_time + avg_hold_time + avg_wrap_up; // AHT promedio
        
        // Simular desviación estándar del AHT (para CV)
        const aht_std = randomInt(Math.round(aht_mean * 0.15), Math.round(aht_mean * 0.60)); // 15-60% del AHT
        const cv_aht = aht_std / aht_mean; // Coeficiente de Variación
        
        // Transfer rate (para complejidad inversa)
        const transfer_rate = randomInt(5, 35); // %
        const fcr_approx = 100 - transfer_rate; // FCR aproximado
        
        // Coste anual
        const annual_volume = volume * 12;
        const annual_cost = Math.round(annual_volume * aht_mean * COST_PER_SECOND);
        
        // === NUEVA LÓGICA: 3 DIMENSIONES ===
        
        // Dimensión 1: Predictibilidad (Proxy: CV del AHT)
        // Fórmula: MAX(0, MIN(10, 10 - ((CV - 0.3) / 1.2 * 10)))
        const predictability_score = Math.max(0, Math.min(10, 
            10 - ((cv_aht - 0.3) / 1.2 * 10)
        ));
        
        // Dimensión 2: Complejidad Inversa (Proxy: Tasa de Transferencia)
        // Fórmula: MAX(0, MIN(10, 10 - ((T - 0.05) / 0.25 * 10)))
        const complexity_inverse_score = Math.max(0, Math.min(10,
            10 - ((transfer_rate / 100 - 0.05) / 0.25 * 10)
        ));
        
        // Dimensión 3: Repetitividad/Impacto (Proxy: Volumen)
        // > 5,000 = 10, < 100 = 0, interpolación lineal entre 100-5000
        let repetitivity_score: number;
        if (volume >= 5000) {
            repetitivity_score = 10;
        } else if (volume <= 100) {
            repetitivity_score = 0;
        } else {
            repetitivity_score = ((volume - 100) / (5000 - 100)) * 10;
        }
        
        // Agentic Readiness Score (Promedio ponderado)
        // Pesos: Predictibilidad 40%, Complejidad 35%, Repetitividad 25%
        const agentic_readiness_score = 
            predictability_score * 0.40 +
            complexity_inverse_score * 0.35 +
            repetitivity_score * 0.25;
        
        // Categoría de readiness
        let readiness_category: 'automate_now' | 'assist_copilot' | 'optimize_first';
        if (agentic_readiness_score >= 8.0) {
            readiness_category = 'automate_now';
        } else if (agentic_readiness_score >= 5.0) {
            readiness_category = 'assist_copilot';
        } else {
            readiness_category = 'optimize_first';
        }
        
        const automation_readiness = Math.round(agentic_readiness_score * 10); // Escala 0-100 para compatibilidad
        
        // Clasificar segmento si hay mapeo
        let segment: CustomerSegment | undefined;
        if (segmentMapping) {
            const normalizedSkill = skill.toLowerCase();
            if (segmentMapping.high_value_queues.some(q => normalizedSkill.includes(q.toLowerCase()))) {
                segment = 'high';
            } else if (segmentMapping.low_value_queues.some(q => normalizedSkill.includes(q.toLowerCase()))) {
                segment = 'low';
            } else {
                segment = 'medium';
            }
        }
        
        return {
            skill,
            segment,
            volume,
            aht_seconds: aht_mean, // Renombrado para compatibilidad
            metrics: {
                fcr: isNaN(fcr_approx) ? 0 : Math.max(0, Math.min(100, Math.round(fcr_approx))),
                aht: isNaN(aht_mean) ? 0 : Math.max(0, Math.min(100, Math.round(100 - ((aht_mean - 240) / 310) * 100))),
                csat: isNaN(avgCsat) ? 0 : Math.max(0, Math.min(100, Math.round(avgCsat))),
                hold_time: isNaN(avg_hold_time) ? 0 : Math.max(0, Math.min(100, Math.round(100 - (avg_hold_time / 120) * 100))),
                transfer_rate: isNaN(transfer_rate) ? 0 : Math.max(0, Math.min(100, Math.round(100 - (transfer_rate * 100))))
            },
            annual_cost,
            variability: {
                cv_aht: Math.round(cv_aht * 100), // Convertir a porcentaje
                cv_talk_time: 0, // Deprecado en v2.1
                cv_hold_time: 0, // Deprecado en v2.1
                transfer_rate
            },
            automation_readiness,
            // Nuevas dimensiones (v2.1)
            dimensions: {
                predictability: Math.round(predictability_score * 10) / 10,
                complexity_inverse: Math.round(complexity_inverse_score * 10) / 10,
                repetitivity: Math.round(repetitivity_score * 10) / 10
            },
            readiness_category
        };
    });
};

// v3.0: Oportunidades con nuevas dimensiones
const generateOpportunityMatrixData = (): Opportunity[] => {
    const opportunities = [
        { id: 'opp1', name: 'Automatizar consulta de pedidos', savings: 85000, dimensionId: 'agentic_readiness', customer_segment: 'medium' as CustomerSegment },
        { id: 'opp2', name: 'Implementar Knowledge Base dinámica', savings: 45000, dimensionId: 'operational_efficiency', customer_segment: 'high' as CustomerSegment },
        { id: 'opp3', name: 'Chatbot de triaje inicial', savings: 120000, dimensionId: 'effectiveness_resolution', customer_segment: 'medium' as CustomerSegment },
        { id: 'opp4', name: 'Reducir complejidad en colas críticas', savings: 30000, dimensionId: 'complexity_predictability', customer_segment: 'high' as CustomerSegment },
        { id: 'opp5', name: 'Cobertura 24/7 con agentes virtuales', savings: 65000, dimensionId: 'volumetry_distribution', customer_segment: 'low' as CustomerSegment },
    ];
    return opportunities.map(opp => ({ ...opp, impact: randomInt(3, 10), feasibility: randomInt(2, 9) }));
};

// v3.0: Roadmap con nuevas dimensiones
const generateRoadmapData = (): RoadmapInitiative[] => {
    return [
        { id: 'r1', name: 'Chatbot de estado de pedido', phase: RoadmapPhase.Automate, timeline: 'Q1 2025', investment: 25000, resources: ['1x Bot Developer', 'API Access'], dimensionId: 'agentic_readiness', risk: 'low' },
        { id: 'r2', name: 'Implementar Knowledge Base dinámica', phase: RoadmapPhase.Assist, timeline: 'Q1 2025', investment: 15000, resources: ['1x PM', 'Content Team'], dimensionId: 'operational_efficiency', risk: 'low' },
        { id: 'r3', name: 'Agent Assist para sugerencias en real-time', phase: RoadmapPhase.Assist, timeline: 'Q2 2025', investment: 45000, resources: ['2x AI Devs', 'QA Team'], dimensionId: 'effectiveness_resolution', risk: 'medium' },
        { id: 'r4', name: 'Estandarización de procesos complejos', phase: RoadmapPhase.Augment, timeline: 'Q3 2025', investment: 30000, resources: ['Process Analyst', 'Training Team'], dimensionId: 'complexity_predictability', risk: 'medium' },
        { id: 'r5', name: 'Cobertura 24/7 con agentes virtuales', phase: RoadmapPhase.Augment, timeline: 'Q4 2025', investment: 75000, resources: ['Lead AI Engineer', 'Data Scientist'], dimensionId: 'volumetry_distribution', risk: 'high' },
    ];
};

// v2.0: Añadir NPV y costBreakdown
const generateEconomicModelData = (): EconomicModelData => {
    const currentAnnualCost = randomInt(800000, 2500000);
    const annualSavings = randomInt(150000, 500000);
    const futureAnnualCost = currentAnnualCost - annualSavings;
    const initialInvestment = randomInt(40000, 150000);
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
        currentAnnualCost,
        futureAnnualCost,
        annualSavings,
        initialInvestment,
        paybackMonths,
        roi3yr: parseFloat(roi3yr.toFixed(1)),
        npv: Math.round(npv),
        savingsBreakdown,
        costBreakdown
    };
};

// v2.x: Generar Opportunity Matrix a partir de datos REALES (heatmap + modelo económico)
const generateOpportunitiesFromHeatmap = (
  heatmapData: HeatmapDataPoint[],
  economicModel?: EconomicModelData
): Opportunity[] => {
  if (!heatmapData || heatmapData.length === 0) return [];

  // Ahorro anual total calculado por el backend (si existe)
  const globalSavings = economicModel?.annualSavings ?? 0;

  // 1) Calculamos un "peso" por skill en función de:
  //    - coste anual
  //    - ineficiencia (FCR bajo)
  //    - readiness (facilidad para automatizar)
  const scored = heatmapData.map((h) => {
    const annualCost = h.annual_cost ?? 0;
    const readiness = h.automation_readiness ?? 0;
    const fcrScore = h.metrics?.fcr ?? 0;

    // FCR bajo => más ineficiencia
    const ineffPenalty = Math.max(0, 100 - fcrScore); // 0–100
    // Peso base: coste alto + ineficiencia alta + readiness alto
    const baseWeight =
      annualCost *
      (1 + ineffPenalty / 100) *
      (0.3 + 0.7 * (readiness / 100));

    const weight = !Number.isFinite(baseWeight) || baseWeight < 0 ? 0 : baseWeight;

    return { heat: h, weight };
  });

  const totalWeight =
    scored.reduce((sum, s) => sum + s.weight, 0) || 1;

  // 2) Asignamos "savings" (ahorro potencial) por skill
  const opportunitiesWithSavings = scored.map((s) => {
    const { heat } = s;
    const annualCost = heat.annual_cost ?? 0;

    // Si el backend nos da un ahorro anual total, lo distribuimos proporcionalmente
    const savings =
      globalSavings > 0 && totalWeight > 0
        ? (globalSavings * s.weight) / totalWeight
        : // Si no hay dato de ahorro global, suponemos un 20% del coste anual
          annualCost * 0.2;

    return {
      heat,
      savings: Math.max(0, savings),
    };
  });

  const maxSavings =
    opportunitiesWithSavings.reduce(
      (max, s) => (s.savings > max ? s.savings : max),
      0
    ) || 1;

  // 3) Construimos cada oportunidad
  return opportunitiesWithSavings.map((item, index) => {
    const { heat, savings } = item;
    const skillName = heat.skill || `Skill ${index + 1}`;

    // Impacto: relativo al mayor ahorro
    const impactRaw = (savings / maxSavings) * 10;
    const impact = Math.max(
      3,
      Math.min(10, Math.round(impactRaw))
    );

    // Factibilidad base: a partir del automation_readiness (0–100)
    const readiness = heat.automation_readiness ?? 0;
    const feasibilityRaw = (readiness / 100) * 7 + 3; // 3–10
    const feasibility = Math.max(
      3,
      Math.min(10, Math.round(feasibilityRaw))
    );

    // Dimensión a la que lo vinculamos
    const dimensionId =
      readiness >= 70
        ? 'agentic_readiness'
        : readiness >= 40
        ? 'effectiveness_resolution'
        : 'complexity_predictability';

    // Segmento de cliente (high/medium/low) si lo tenemos
    const customer_segment = heat.segment;

    // Nombre legible que incluye el skill -> esto ayuda a
    // OpportunityMatrixPro a encontrar el skill en el heatmap
    const namePrefix =
      readiness >= 70
        ? 'Automatizar '
        : readiness >= 40
        ? 'Augmentar con IA en '
        : 'Optimizar proceso en ';

    const idSlug = skillName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    return {
      id: `opp_${index + 1}_${idSlug}`,
      name: `${namePrefix}${skillName}`,
      impact,
      feasibility,
      savings: Math.round(savings),
      dimensionId,
      customer_segment,
    };
  });
};


// v2.0: Añadir percentiles múltiples
const generateBenchmarkData = (): BenchmarkDataPoint[] => {
    const userAHT = randomInt(380, 450);
    const industryAHT = 420;
    const userFCR = randomFloat(0.65, 0.78, 2);
    const industryFCR = 0.72;
    const userCSAT = randomFloat(4.1, 4.6, 1);
    const industryCSAT = 4.3;
    const userCPI = randomFloat(2.8, 4.5, 2);
    const industryCPI = 3.5;

    return [
        { 
            kpi: 'AHT Promedio', 
            userValue: userAHT, 
            userDisplay: `${userAHT}s`, 
            industryValue: industryAHT, 
            industryDisplay: `${industryAHT}s`, 
            percentile: randomInt(40, 75),
            p25: 380,
            p50: 420,
            p75: 460,
            p90: 510
        },
        { 
            kpi: 'Tasa FCR', 
            userValue: userFCR, 
            userDisplay: `${(userFCR * 100).toFixed(0)}%`, 
            industryValue: industryFCR, 
            industryDisplay: `${(industryFCR * 100).toFixed(0)}%`, 
            percentile: randomInt(30, 65),
            p25: 0.65,
            p50: 0.72,
            p75: 0.82,
            p90: 0.88
        },
        { 
            kpi: 'CSAT', 
            userValue: userCSAT, 
            userDisplay: `${userCSAT}/5`, 
            industryValue: industryCSAT, 
            industryDisplay: `${industryCSAT}/5`, 
            percentile: randomInt(45, 80),
            p25: 4.0,
            p50: 4.3,
            p75: 4.6,
            p90: 4.8
        },
        { 
            kpi: 'Coste por Interacción (Voz)', 
            userValue: userCPI, 
            userDisplay: `€${userCPI.toFixed(2)}`, 
            industryValue: industryCPI, 
            industryDisplay: `€${industryCPI.toFixed(2)}`, 
            percentile: randomInt(50, 85),
            p25: 2.8,
            p50: 3.5,
            p75: 4.2,
            p90: 5.0
        },
    ];
};

export const generateAnalysis = async (
  tier: TierKey,
  costPerHour: number = 20,
  avgCsat: number = 85,
  segmentMapping?: { high_value_queues: string[]; medium_value_queues: string[]; low_value_queues: string[] },
  file?: File,
  sheetUrl?: string,
  useSynthetic?: boolean,
  authHeaderOverride?: string 
): Promise<AnalysisData> => {
  // Si hay archivo, procesarlo
  // Si hay archivo, primero intentamos usar el backend
  if (file && !useSynthetic) {
    console.log('📡 Processing file (API first):', file.name);

    // 1) Intentar backend + mapeo
    try {
      const raw = await callAnalysisApiRaw({
        tier,
        costPerHour,
        avgCsat,
        segmentMapping,
        file,
        authHeaderOverride,
      });

      const mapped = mapBackendResultsToAnalysisData(raw, tier);

      // Heatmap: primero lo construimos a partir de datos reales del backend
      mapped.heatmapData = buildHeatmapFromBackend(
        raw,
        costPerHour,
        avgCsat,
        segmentMapping
      );

      // Oportunidades: AHORA basadas en heatmap real + modelo económico del backend
      mapped.opportunities = generateOpportunitiesFromHeatmap(
        mapped.heatmapData,
        mapped.economicModel
      );

      // 👉 El resto sigue siendo "frontend-driven" de momento
      mapped.findings = generateFindingsFromData(mapped);
      mapped.recommendations = generateRecommendationsFromData(mapped);
      mapped.roadmap = generateRoadmapData();

      // Benchmark: de momento no tenemos datos reales -> no lo generamos en modo backend
      mapped.benchmarkData = [];

      console.log(
        '✅ Usando resultados del backend mapeados (heatmap + opportunities reales)'
      );
      return mapped;


    } catch (apiError: any) {
      const status = apiError?.status;
      const msg = (apiError as Error).message || '';

      // 🔐 Si es un error de autenticación (401), NO hacemos fallback
      if (status === 401 || msg.includes('401')) {
        console.error(
          '❌ Error de autenticación en backend, abortando análisis (sin fallback).'
        );
        throw apiError;
      }

      console.error(
        '❌ Backend /analysis no disponible o mapeo incompleto, fallback a lógica local:',
        apiError
      );
    }

    // 2) Fallback completo: lógica antigua del frontend
    try {
      const { parseFile, validateInteractions } = await import('./fileParser');

      const interactions = await parseFile(file);
      const validation = validateInteractions(interactions);

      if (!validation.valid) {
        console.error('❌ Validation errors:', validation.errors);
        throw new Error(
          `Validación fallida: ${validation.errors.join(', ')}`
        );
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️ Warnings:', validation.warnings);
      }

      return generateAnalysisFromRealData(
        tier,
        interactions,
        costPerHour,
        avgCsat,
        segmentMapping
      );
    } catch (error) {
      console.error('❌ Error processing file:', error);
      throw new Error(
        `Error procesando archivo: ${(error as Error).message}`
      );
    }
  }
  
  // Si hay URL de Google Sheets, procesarla (TODO: implementar)
  if (sheetUrl && !useSynthetic) {
    console.warn('🔗 Google Sheets URL processing not implemented yet, using synthetic data');
  }
  
  // Generar datos sintéticos (fallback)
  console.log('✨ Generating synthetic data');
  return generateSyntheticAnalysis(tier, costPerHour, avgCsat, segmentMapping);
};

// Función auxiliar para generar análisis con datos sintéticos
const generateSyntheticAnalysis = (
  tier: TierKey,
  costPerHour: number = 20,
  avgCsat: number = 85,
  segmentMapping?: { high_value_queues: string[]; medium_value_queues: string[]; low_value_queues: string[] }
): AnalysisData => {
  const overallHealthScore = randomInt(55, 95);
  
  const summaryKpis: Kpi[] = [
    { label: "Interacciones Totales", value: randomInt(15000, 50000).toLocaleString('es-ES') },
    { label: "AHT Promedio", value: `${randomInt(300, 480)}s`, change: `-${randomInt(5, 20)}s`, changeType: 'positive' },
    { label: "Tasa FCR", value: `${randomInt(70, 88)}%`, change: `+${randomFloat(0.5, 2, 1)}%`, changeType: 'positive' },
    { label: "CSAT", value: `${randomFloat(4.1, 4.8, 1)}/5`, change: `-${randomFloat(0.1, 0.3, 1)}`, changeType: 'negative' },
  ];

  // v3.0: 5 dimensiones viables
  const dimensionKeys = ['volumetry_distribution', 'operational_efficiency', 'effectiveness_resolution', 'complexity_predictability', 'agentic_readiness'];
  
  const dimensions: DimensionAnalysis[] = dimensionKeys.map(key => {
      const content = DIMENSIONS_CONTENT[key as keyof typeof DIMENSIONS_CONTENT];
      const score = randomInt(50, 98);
      const status = getScoreColor(score);
      
      const dimension: DimensionAnalysis = {
          id: key,
          name: key as any,
          title: randomFromList(content.titles),
          score,
          percentile: randomInt(30, 85),
          summary: randomFromList(content.summaries[status === 'green' ? 'good' : status === 'yellow' ? 'medium' : 'bad']),
          kpi: randomFromList(content.kpis),
          icon: content.icon,
      };
      
      // Añadir distribution_data para volumetry_distribution
      if (key === 'volumetry_distribution') {
          const hourly = generateHourlyDistribution();
          dimension.distribution_data = {
              hourly,
              off_hours_pct: calculateOffHoursPct(hourly),
              peak_hours: identifyPeakHours(hourly)
          };
      }
      
      return dimension;
  });

  // v2.0: Calcular Agentic Readiness Score
  let agenticReadiness = undefined;
  if (tier === 'gold' || tier === 'silver') {
      // Generar datos sintéticos para el algoritmo
      const volumen_mes = randomInt(5000, 25000);
      const aht_values = Array.from({ length: 100 }, () => 
          Math.max(180, normalRandom(420, 120))  // Media 420s, std 120s
      );
      const escalation_rate = randomFloat(0.05, 0.25, 2);
      const cpi_humano = randomFloat(2.5, 5.0, 2);
      const volumen_anual = volumen_mes * 12;
      
      const agenticInput: AgenticReadinessInput = {
          volumen_mes,
          aht_values,
          escalation_rate,
          cpi_humano,
          volumen_anual,
          tier
      };
      
      // Datos adicionales para GOLD
      if (tier === 'gold') {
          const hourly_distribution = dimensions.find(d => d.name === 'volumetry_distribution')?.distribution_data?.hourly;
          const off_hours_pct = dimensions.find(d => d.name === 'volumetry_distribution')?.distribution_data?.off_hours_pct;
          
          agenticInput.structured_fields_pct = randomFloat(0.4, 0.9, 2);
          agenticInput.exception_rate = randomFloat(0.05, 0.25, 2);
          agenticInput.hourly_distribution = hourly_distribution;
          agenticInput.off_hours_pct = off_hours_pct;
          agenticInput.csat_values = Array.from({ length: 100 }, () => 
              Math.max(1, Math.min(5, normalRandom(4.3, 0.8)))
          );
      }
      
      agenticReadiness = calculateAgenticReadinessScore(agenticInput);
  }
    
  const heatmapData = generateHeatmapData(costPerHour, avgCsat, segmentMapping);
    
    console.log('📊 Heatmap data generated:', {
        length: heatmapData.length,
        firstItem: heatmapData[0],
        metricsKeys: heatmapData[0] ? Object.keys(heatmapData[0].metrics) : [],
        metricsValues: heatmapData[0] ? heatmapData[0].metrics : {},
        hasNaN: heatmapData.some(item => 
            Object.values(item.metrics).some(v => isNaN(v))
        )
    });  
  return {
    tier,
    overallHealthScore,
    summaryKpis,
    dimensions,
    heatmapData,
    agenticReadiness,
    findings: generateFindingsFromTemplates(),
    recommendations: generateRecommendationsFromTemplates(),
    opportunities: generateOpportunityMatrixData(),
    economicModel: generateEconomicModelData(),
    roadmap: generateRoadmapData(),
    benchmarkData: generateBenchmarkData(),
    source: 'synthetic', 
  };
};

