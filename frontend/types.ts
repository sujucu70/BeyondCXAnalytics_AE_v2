import type { LucideIcon } from 'lucide-react';

export type TierKey = 'gold' | 'silver' | 'bronze';
export type AnalysisSource = 'synthetic' | 'backend' | 'fallback';

export interface Tier {
  name: string;
  price: number;
  color: string;
  description: string;
  requirements: string;
  timeline: string;
  features?: string[];
}

export interface Field {
  name: string;
  type: string;
  example: string;
  critical: boolean;
}

export interface DataCategory {
  category: string;
  fields: Field[];
}

export interface DataRequirement {
  mandatory: DataCategory[];
  format: string;
  volumeMin: string;
}

export type TiersData = Record<TierKey, Tier>;
export type DataRequirementsData = Record<TierKey, DataRequirement>;

// --- v2.0: Nueva estructura de datos de entrada ---

// Configuración estática (manual)
export interface StaticConfig {
  cost_per_hour: number;      // Coste por hora agente (€/hora, fully loaded)
  avg_csat?: number;          // CSAT promedio (0-100, opcional, manual)
  
  // Mapeo de colas/skills a segmentos de cliente
  segment_mapping?: {
    high_value_queues: string[];    // Colas para clientes alto valor
    medium_value_queues: string[];  // Colas para clientes valor medio
    low_value_queues: string[];     // Colas para clientes bajo valor
  };
}

// Interacción raw del CSV (datos dinámicos)
export interface RawInteraction {
  interaction_id: string;     // ID único de la llamada/sesión
  datetime_start: string;     // Timestamp inicio (ISO 8601 o auto-detectado)
  queue_skill: string;        // Cola o skill
  channel: 'Voice' | 'Chat' | 'WhatsApp' | 'Email' | string;  // Tipo de medio
  duration_talk: number;      // Tiempo de conversación activa (segundos)
  hold_time: number;          // Tiempo en espera (segundos)
  wrap_up_time: number;       // Tiempo ACW post-llamada (segundos)
  agent_id: string;           // ID agente (anónimo/hash)
  transfer_flag: boolean;     // Indicador de transferencia
  repeat_call_7d?: boolean;   // True si el cliente llamó en los últimos 7 días (para FCR)
  caller_id?: string;         // ID cliente (opcional, hash/anónimo)
  disconnection_type?: string; // Tipo de desconexión (Externo/Interno/etc.)
  total_conversation?: number; // Conversación total en segundos (null/0 = abandono)
  is_abandoned?: boolean; // Flag directo de abandono del CSV
  record_status?: 'valid' | 'noise' | 'zombie' | 'abandon'; // Estado del registro para filtrado
  fcr_real_flag?: boolean; // FCR pre-calculado en el CSV (TRUE = resuelto en primer contacto)
  // v3.0: Campos para drill-down (jerarquía de 2 niveles)
  original_queue_id?: string; // Nombre real de la cola en centralita (nivel operativo)
  linea_negocio?: string;     // Línea de negocio (business_unit) - 9 categorías C-Level
  // queue_skill ya existe arriba como nivel estratégico
}

// Tipo para filtrado por record_status
export type RecordStatus = 'valid' | 'noise' | 'zombie' | 'abandon';

// v3.4: Tier de clasificación para roadmap
export type AgenticTier = 'AUTOMATE' | 'ASSIST' | 'AUGMENT' | 'HUMAN-ONLY';

// v3.4: Desglose del score por factores
export interface AgenticScoreBreakdown {
  predictibilidad: number;  // 30% - basado en CV AHT
  resolutividad: number;    // 25% - FCR (60%) + Transfer (40%)
  volumen: number;          // 25% - basado en volumen mensual
  calidadDatos: number;     // 10% - % registros válidos
  simplicidad: number;      // 10% - basado en AHT
}

// v3.4: Métricas por cola individual (original_queue_id - nivel operativo)
export interface OriginalQueueMetrics {
  original_queue_id: string;  // Nombre real de la cola en centralita
  volume: number;             // Total de interacciones
  volumeValid: number;        // Sin NOISE/ZOMBIE (para cálculo CV)
  aht_mean: number;           // AHT promedio (segundos)
  cv_aht: number;             // CV AHT calculado solo sobre VALID (%)
  transfer_rate: number;      // Tasa de transferencia (%)
  fcr_rate: number;           // FCR (%)
  agenticScore: number;       // Score de automatización (0-10)
  scoreBreakdown?: AgenticScoreBreakdown;  // v3.4: Desglose por factores
  tier: AgenticTier;          // v3.4: Clasificación para roadmap
  tierMotivo?: string;        // v3.4: Motivo de la clasificación
  isPriorityCandidate: boolean;  // Tier 1 (AUTOMATE)
  annualCost?: number;        // Coste anual estimado
}

// v3.1: Tipo para drill-down - Nivel 1: queue_skill (estratégico)
export interface DrilldownDataPoint {
  skill: string;              // queue_skill (categoría estratégica)
  originalQueues: OriginalQueueMetrics[];  // Colas reales de centralita (nivel 2)
  // Métricas agregadas del grupo
  volume: number;             // Total de interacciones del grupo
  volumeValid: number;        // Sin NOISE/ZOMBIE
  aht_mean: number;           // AHT promedio ponderado (segundos)
  cv_aht: number;             // CV AHT promedio ponderado (%)
  transfer_rate: number;      // Tasa de transferencia ponderada (%)
  fcr_rate: number;           // FCR ponderado (%)
  agenticScore: number;       // Score de automatización promedio (0-10)
  isPriorityCandidate: boolean;  // Al menos una cola con CV < 75%
  annualCost?: number;        // Coste anual total del grupo
}

// Métricas calculadas por skill
export interface SkillMetrics {
  skill: string;
  volume: number;             // Total de interacciones
  channel: string;            // Canal predominante

  // Métricas de rendimiento (calculadas)
  fcr: number;                // FCR aproximado: 100% - transfer_rate
  aht: number;                // AHT = duration_talk + hold_time + wrap_up_time
  avg_talk_time: number;      // Promedio duration_talk
  avg_hold_time: number;      // Promedio hold_time
  avg_wrap_up: number;        // Promedio wrap_up_time
  transfer_rate: number;      // % con transfer_flag = true
  abandonment_rate: number;   // % abandonos (desconexión externa + sin conversación)

  // Métricas de variabilidad
  cv_aht: number;             // Coeficiente de variación AHT (%)
  cv_talk_time: number;       // CV de duration_talk (proxy de variabilidad input)
  cv_hold_time: number;       // CV de hold_time

  // Distribución temporal
  hourly_distribution: number[];  // 24 valores (0-23h)
  off_hours_pct: number;      // % llamadas fuera de horario (19:00-08:00)

  // Coste
  annual_cost: number;        // Volumen × AHT × cost_per_hour × 12

  // Outliers y complejidad
  outlier_rate: number;       // % casos con AHT > P90
}

// --- Analysis Dashboard Types ---

export interface Kpi {
  label: string;
  value: string;
  change?: string; // e.g., '+5%' or '-10s'
  changeType?: 'positive' | 'negative' | 'neutral';
}

// v4.0: 7 dimensiones viables
export type DimensionName =
  | 'volumetry_distribution'      // Volumetría & Distribución
  | 'operational_efficiency'      // Eficiencia Operativa
  | 'effectiveness_resolution'    // Efectividad & Resolución
  | 'complexity_predictability'   // Complejidad & Predictibilidad
  | 'customer_satisfaction'       // Satisfacción del Cliente (CSAT)
  | 'economy_cpi'                 // Economía Operacional (CPI)
  | 'agentic_readiness';          // Agentic Readiness

export interface SubFactor {
  name: string;
  displayName: string;
  score: number;
  weight: number;
  description: string;
  details?: Record<string, any>;
}

export interface DistributionData {
  hourly: number[];  // 24 valores (0-23h)
  off_hours_pct: number;
  peak_hours: number[];
  weekday_distribution?: number[];  // 7 valores (0=domingo, 6=sábado)
}

export interface DimensionAnalysis {
  id: string;
  name: DimensionName;
  title: string;
  score: number;
  percentile?: number;
  summary: string;
  kpi: Kpi;
  icon: LucideIcon;
  // v2.0: Nuevos campos
  sub_factors?: SubFactor[];  // Para Agentic Readiness
  distribution_data?: DistributionData;  // Para Volumetría
}

export interface HeatmapDataPoint {
  skill: string;
  segment?: CustomerSegment;  // Segmento de cliente (high/medium/low)
  volume: number;  // Volumen mensual de interacciones
  aht_seconds: number;  // AHT en segundos (para cálculo de coste)
  metrics: {
    fcr: number;    // First Contact Resolution score (0-100) - CALCULADO
    aht: number;    // Average Handle Time score (0-100, donde 100 es óptimo) - CALCULADO
    csat: number;   // Customer Satisfaction score (0-100) - MANUAL (estático)
    hold_time: number;  // Hold Time promedio (segundos) - CALCULADO
    transfer_rate: number;  // % transferencias - CALCULADO
    abandonment_rate: number;  // % abandonos - CALCULADO
  };
  annual_cost?: number;  // Coste anual en euros (calculado con cost_per_hour)
  
  // v2.0: Métricas de variabilidad interna
  variability: {
    cv_aht: number;         // Coeficiente de variación del AHT (%)
    cv_talk_time: number;   // CV Talk Time (deprecado en v2.1)
    cv_hold_time: number;   // CV Hold Time (deprecado en v2.1)
    transfer_rate: number;  // Tasa de transferencia (%)
  };
  automation_readiness: number;  // Score 0-100 (calculado)
  
  // v2.1: Nuevas dimensiones para Agentic Readiness Score
  dimensions?: {
    predictability: number;      // Dimensión 1: Predictibilidad (0-10)
    complexity_inverse: number;  // Dimensión 2: Complejidad Inversa (0-10)
    repetitivity: number;        // Dimensión 3: Repetitividad/Impacto (0-10)
  };
  readiness_category?: 'automate_now' | 'assist_copilot' | 'optimize_first';
}

// v2.0: Segmentación de cliente
export type CustomerSegment = 'high' | 'medium' | 'low';

export interface Opportunity {
  id: string;
  name: string;
  impact: number;
  feasibility: number;
  savings: number;
  dimensionId: string;
  customer_segment?: CustomerSegment;  // v2.0: Nuevo campo opcional
}

// Usar objeto const en lugar de enum para evitar problemas de tree-shaking con Vite
export const RoadmapPhase = {
  Automate: 'Automate',
  Assist: 'Assist',
  Augment: 'Augment'
} as const;

export type RoadmapPhase = typeof RoadmapPhase[keyof typeof RoadmapPhase];

export interface RoadmapInitiative {
  id: string;
  name: string;
  phase: RoadmapPhase;
  timeline: string;
  investment: number;
  resources: string[];
  dimensionId: string;
  risk?: 'high' | 'medium' | 'low';  // v2.0: Nuevo campo
  // v2.1: Campos para trazabilidad
  skillsImpacted?: string[];         // Skills que impacta
  savingsDetail?: string;            // Detalle del cálculo de ahorro
  estimatedSavings?: number;         // Ahorro estimado €
  resourceHours?: number;            // Horas estimadas de recursos
  // v3.0: Campos mejorados conectados con skills reales
  volumeImpacted?: number;           // Volumen de interacciones impactadas
  kpiObjective?: string;             // Objetivo KPI específico
  rationale?: string;                // Justificación de la iniciativa
}

export interface Finding {
  text: string;
  dimensionId: string;
  type?: 'warning' | 'info' | 'critical';  // Tipo de hallazgo
  title?: string;  // Título del hallazgo
  description?: string;  // Descripción detallada
  impact?: 'high' | 'medium' | 'low';  // Impacto estimado
}

export interface Recommendation {
  text: string;
  dimensionId: string;
  priority?: 'high' | 'medium' | 'low';  // v2.0: Prioridad
  title?: string;  // Título de la recomendación
  description?: string;  // Descripción detallada
  impact?: string;  // Impacto estimado (e.g., "Mejora del 20-30%")
  timeline?: string;  // Timeline estimado (e.g., "1-3 meses")
}

export interface EconomicModelData {
    currentAnnualCost: number;
    futureAnnualCost: number;
    annualSavings: number;
    initialInvestment: number;
    paybackMonths: number;
    roi3yr: number;
    savingsBreakdown: { category: string; amount: number; percentage: number }[];
    npv?: number;  // v2.0: Net Present Value
    costBreakdown?: { category: string; amount: number; percentage: number }[];  // v2.0
}

export interface BenchmarkDataPoint {
    kpi: string;
    userValue: number;
    userDisplay: string;
    industryValue: number;
    industryDisplay: string;
    percentile: number;
    p25?: number;  // v2.0: Percentil 25
    p50?: number;  // v2.0: Percentil 50 (mediana)
    p75?: number;  // v2.0: Percentil 75
    p90?: number;  // v2.0: Percentil 90
}

// v2.0: Nuevo tipo para Agentic Readiness Score
export interface AgenticReadinessResult {
  score: number;  // 0-10
  sub_factors: SubFactor[];
  tier: TierKey;
  confidence: 'high' | 'medium' | 'low';
  interpretation: string;
}

export interface AnalysisData {
  tier?: TierKey;  // Opcional para compatibilidad
  overallHealthScore: number;
  summaryKpis: Kpi[];
  dimensions: DimensionAnalysis[];
  findings: Finding[];  // Actualizado de keyFindings
  recommendations: Recommendation[];
  heatmapData: HeatmapDataPoint[];  // Actualizado de heatmap
  opportunities: Opportunity[];  // Actualizado de opportunityMatrix
  roadmap: RoadmapInitiative[];
  economicModel: EconomicModelData;
  benchmarkData: BenchmarkDataPoint[];  // Actualizado de benchmarkReport
  agenticReadiness?: AgenticReadinessResult;  // v2.0: Nuevo campo
  staticConfig?: StaticConfig;  // v2.0: Configuración estática usada
  source?: AnalysisSource;
  dateRange?: { min: string; max: string };  // v2.1: Periodo analizado
  drilldownData?: DrilldownDataPoint[];  // v3.0: Drill-down Cola + Tipificación
}
