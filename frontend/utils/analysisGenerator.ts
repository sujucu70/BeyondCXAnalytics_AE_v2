// analysisGenerator.ts - v2.0 con 6 dimensiones
import type { AnalysisData, Kpi, DimensionAnalysis, HeatmapDataPoint, Opportunity, RoadmapInitiative, EconomicModelData, BenchmarkDataPoint, Finding, Recommendation, TierKey, CustomerSegment } from '../types';
import { generateAnalysisFromRealData } from './realDataAnalysis';
import { RoadmapPhase } from '../types';
import { BarChartHorizontal, Zap, Smile, DollarSign, Target, Globe } from 'lucide-react';
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

// v2.0: 6 DIMENSIONES (eliminadas Complejidad y Efectividad)
const DIMENSIONS_CONTENT = {
    volumetry_distribution: {
        icon: BarChartHorizontal,
        titles: ["Volumetría y Distribución Horaria", "Análisis de la Demanda"],
        summaries: {
            good: ["El volumen de interacciones se alinea con las previsiones, permitiendo una planificación de personal precisa.", "La distribución horaria es uniforme con picos predecibles, facilitando la automatización."],
            medium: ["Existen picos de demanda imprevistos que generan caídas en el nivel de servicio.", "Alto porcentaje de interacciones fuera de horario laboral (>30%), sugiriendo necesidad de cobertura 24/7."],
            bad: ["Desajuste crónico entre el forecast y el volumen real, resultando en sobrecostes o mal servicio.", "Distribución horaria muy irregular con múltiples picos impredecibles."]
        },
        kpis: [
            { label: "Volumen Mensual", value: `${randomInt(5000, 25000).toLocaleString('es-ES')}` },
            { label: "% Fuera de Horario", value: `${randomInt(15, 45)}%` },
        ],
    },
    performance: {
        icon: Zap,
        titles: ["Rendimiento Operativo", "Optimización de Tiempos"],
        summaries: {
            good: ["El AHT está bien controlado con baja variabilidad (CV<30%), indicando procesos estandarizados.", "Tiempos de espera y post-llamada (ACW) mínimos, maximizando la productividad del agente."],
            medium: ["El AHT es competitivo, pero la variabilidad es alta (CV>40%), sugiriendo inconsistencia en procesos.", "El tiempo en espera (Hold Time) es ligeramente elevado, sugiriendo posibles mejoras en el acceso a la información."],
            bad: ["El AHT excede los benchmarks de la industria con alta variabilidad, impactando directamente en los costes.", "Tiempos de ACW prolongados indican procesos manuales ineficientes o falta de integración de sistemas."]
        },
        kpis: [
            { label: "AHT Promedio", value: `${randomInt(280, 550)}s` },
            { label: "CV AHT", value: `${randomInt(25, 60)}%` },
        ],
    },
    satisfaction: {
        icon: Smile,
        titles: ["Satisfacción y Experiencia", "Voz del Cliente"],
        summaries: {
            good: ["Puntuaciones de CSAT muy positivas con distribución normal, reflejando un proceso estable y consistente.", "El análisis cualitativo muestra un sentimiento mayoritariamente positivo en las interacciones."],
            medium: ["Los indicadores de satisfacción son neutros. La distribución de CSAT muestra cierta bimodalidad.", "Se observan comentarios mixtos, con puntos fuertes en la amabilidad del agente pero debilidades en los tiempos de respuesta."],
            bad: ["Bajas puntuaciones de CSAT con distribución anormal, indicando un proceso inconsistente.", "Los clientes se quejan frecuentemente de largos tiempos de espera, repetición de información y falta de resolución."]
        },
        kpis: [
            { label: "CSAT Promedio", value: `${randomFloat(3.8, 4.9, 1)}/5` },
            { label: "NPS", value: `${randomInt(-20, 55)}` },
        ],
    },
    economy: {
        icon: DollarSign,
        titles: ["Economía y Costes", "Rentabilidad del Servicio"],
        summaries: {
            good: ["El coste por interacción está por debajo del promedio de la industria, indicando una operación rentable.", "El ROI potencial de automatización supera los €200K anuales con payback <12 meses."],
            medium: ["Los costes son estables pero no se observa una tendencia a la baja, sugiriendo un estancamiento en la optimización.", "El ROI potencial es moderado (€100-200K), requiriendo inversión inicial significativa."],
            bad: ["Coste por interacción elevado, erosionando los márgenes de beneficio de la compañía.", "Bajo ROI potencial (<€100K) debido a volumen insuficiente o procesos ya optimizados."]
        },
        kpis: [
            { label: "Coste por Interacción", value: `€${randomFloat(2.5, 9.5, 2)}` },
            { label: "Ahorro Potencial", value: `€${randomInt(50, 250)}K` },
        ],
    },
    efficiency: {
        icon: Target,
        titles: ["Eficiencia", "Resolución y Calidad"],
        summaries: {
            good: ["Alta tasa de resolución en el primer contacto (FCR>85%), minimizando la repetición de llamadas.", "Bajo índice de transferencias y escalaciones (<10%), demostrando un correcto enrutamiento y alto conocimiento del agente."],
            medium: ["La tasa de FCR es aceptable (70-85%), aunque se detectan ciertos tipos de consulta que requieren múltiples contactos.", "Las transferencias son moderadas (10-20%), concentradas en departamentos específicos."],
            bad: ["Bajo FCR (<70%), lo que genera frustración en el cliente y aumenta el volumen de interacciones innecesarias.", "Excesivas transferencias y escalaciones (>20%), creando una experiencia de cliente fragmentada y costosa."]
        },
        kpis: [
            { label: "Tasa FCR", value: `${randomInt(65, 92)}%` },
            { label: "Tasa de Escalación", value: `${randomInt(5, 25)}%` },
        ],
    },
    benchmark: {
        icon: Globe,
        titles: ["Benchmark de Industria", "Contexto Competitivo"],
        summaries: {
            good: ["La operación se sitúa consistentemente por encima del P75 en los KPIs más críticos.", "El rendimiento en eficiencia y calidad es de 'top quartile', representando una ventaja competitiva."],
            medium: ["El rendimiento general está en línea con la mediana de la industria (P50), sin claras fortalezas o debilidades.", "Se observan algunas áreas por debajo del P50 que representan oportunidades de mejora claras."],
            bad: ["La mayoría de los KPIs se encuentran por debajo del P25, indicando una necesidad urgente de mejora.", "El AHT y el CPI son significativamente más altos que los benchmarks, impactando la rentabilidad."]
        },
        kpis: [
            { label: "Posición vs P50 AHT", value: `P${randomInt(30, 70)}` },
            { label: "Posición vs P50 FCR", value: `P${randomInt(30, 70)}` },
        ],
    },
};

const KEY_FINDINGS: Finding[] = [
    {
        text: "El canal de voz presenta un AHT un 35% superior al del chat, pero una tasa de resolución un 15% mayor.",
        dimensionId: 'performance',
        type: 'info',
        title: 'Diferencia de Canales: Voz vs Chat',
        description: 'Análisis comparativo entre canales muestra trade-off entre velocidad y resolución.',
        impact: 'medium'
    },
    {
        text: "Un 22% de las transferencias desde 'Soporte Técnico N1' hacia 'Facturación' son incorrectas.",
        dimensionId: 'efficiency',
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
        dimensionId: 'volumetry_distribution',
        type: 'info',
        title: 'Oportunidad de Automatización: Estado de Pedido',
        description: 'Volumen significativo en consultas altamente repetitivas y automatizables.',
        impact: 'high'
    },
    {
        text: "Baja puntuación de CSAT en interacciones relacionadas con problemas de facturación.",
        dimensionId: 'satisfaction',
        type: 'warning',
        title: 'Satisfacción Baja en Facturación',
        description: 'El equipo de facturación tiene desempeño por debajo de la media en satisfacción del cliente.',
        impact: 'high'
    },
    {
        text: "La variabilidad de AHT (CV=45%) sugiere procesos poco estandarizados.",
        dimensionId: 'performance',
        type: 'warning',
        title: 'Inconsistencia en Procesos',
        description: 'Alta variabilidad indica falta de estandarización y diferencias significativas entre agentes.',
        impact: 'medium'
    },
];

const RECOMMENDATIONS: Recommendation[] = [
    {
        text: "Implementar un programa de formación específico para agentes de Facturación sobre los nuevos planes.",
        dimensionId: 'efficiency',
        priority: 'high',
        title: 'Formación en Facturación',
        description: 'Capacitación intensiva en productos, políticas y procedimientos de facturación.',
        impact: 'Mejora estimada de satisfacción: 15-25%',
        timeline: '2-3 semanas'
    },
    {
        text: "Desarrollar un bot de estado de pedido para WhatsApp para desviar el 30% de las consultas.",
        dimensionId: 'volumetry_distribution',
        priority: 'high',
        title: 'Bot Automatizado de Seguimiento de Pedidos',
        description: 'Implementar ChatBot en WhatsApp para responder consultas de estado de pedido automáticamente.',
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
        text: "Crear una Knowledge Base más robusta y accesible para reducir el tiempo en espera.",
        dimensionId: 'performance',
        priority: 'high',
        title: 'Mejora de Acceso a Información',
        description: 'Desarrollar una KB centralizada integrada en el sistema de agentes con búsqueda inteligente.',
        impact: 'Reducción de AHT: 8-12%, Mejora de FCR: 5-10%',
        timeline: '6-8 semanas'
    },
    {
        text: "Implementar cobertura 24/7 con agentes virtuales para el 28% de interacciones fuera de horario.",
        dimensionId: 'volumetry_distribution',
        priority: 'medium',
        title: 'Cobertura 24/7 con IA',
        description: 'Desplegar agentes virtuales para gestionar el 28% de interacciones nocturnas.',
        impact: 'Captura de demanda: 20-25%, Coste incremental: €15-20K/mes',
        timeline: '2-3 meses'
    },
    {
        text: "Realizar un análisis de causa raíz sobre las quejas de facturación para mejorar procesos.",
        dimensionId: 'satisfaction',
        priority: 'medium',
        title: 'Análisis de Causa Raíz (Facturación)',
        description: 'Investigar las 50 últimas quejas de facturación para identificar patrones y causas.',
        impact: 'Identificación de mejoras de proceso con ROI potencial de €20-50K',
        timeline: '2-3 semanas'
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

// v2.0: Añadir segmentación de cliente
const generateOpportunityMatrixData = (): Opportunity[] => {
    const opportunities = [
        { id: 'opp1', name: 'Automatizar consulta de pedidos', savings: 85000, dimensionId: 'volumetry_distribution', customer_segment: 'medium' as CustomerSegment },
        { id: 'opp2', name: 'Implementar Knowledge Base dinámica', savings: 45000, dimensionId: 'performance', customer_segment: 'high' as CustomerSegment },
        { id: 'opp3', name: 'Chatbot de triaje inicial', savings: 120000, dimensionId: 'efficiency', customer_segment: 'medium' as CustomerSegment },
        { id: 'opp4', name: 'Análisis de sentimiento en tiempo real', savings: 30000, dimensionId: 'satisfaction', customer_segment: 'high' as CustomerSegment },
        { id: 'opp5', name: 'Cobertura 24/7 con agentes virtuales', savings: 65000, dimensionId: 'volumetry_distribution', customer_segment: 'low' as CustomerSegment },
    ];
    return opportunities.map(opp => ({ ...opp, impact: randomInt(3, 10), feasibility: randomInt(2, 9) }));
};

// v2.0: Añadir risk level
const generateRoadmapData = (): RoadmapInitiative[] => {
    return [
        { id: 'r1', name: 'Chatbot de estado de pedido', phase: RoadmapPhase.Automate, timeline: 'Q1 2025', investment: 25000, resources: ['1x Bot Developer', 'API Access'], dimensionId: 'volumetry_distribution', risk: 'low' },
        { id: 'r2', name: 'Implementar Knowledge Base dinámica', phase: RoadmapPhase.Assist, timeline: 'Q1 2025', investment: 15000, resources: ['1x PM', 'Content Team'], dimensionId: 'performance', risk: 'low' },
        { id: 'r3', name: 'Agent Assist para sugerencias en real-time', phase: RoadmapPhase.Assist, timeline: 'Q2 2025', investment: 45000, resources: ['2x AI Devs', 'QA Team'], dimensionId: 'efficiency', risk: 'medium' },
        { id: 'r4', name: 'IVR conversacional con IA', phase: RoadmapPhase.Automate, timeline: 'Q3 2025', investment: 60000, resources: ['AI Voice Specialist', 'UX Designer'], dimensionId: 'efficiency', risk: 'medium' },
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

    // Dimensión a la que lo vinculamos (solo decorativo de momento)
    const dimensionId =
      readiness >= 70
        ? 'volumetry_distribution'
        : readiness >= 40
        ? 'efficiency'
        : 'economy';

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

  // v2.0: Solo 6 dimensiones
  const dimensionKeys = ['volumetry_distribution', 'performance', 'satisfaction', 'economy', 'efficiency', 'benchmark'];
  
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

