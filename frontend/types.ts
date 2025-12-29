import type { LucideIcon } from 'lucide-react';

export type TierKey = 'gold' | 'silver' | 'bronze';

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
  caller_id?: string;         // ID cliente (opcional, hash/anónimo)
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

// v2.0: Dimensiones reducidas de 8 a 6
export type DimensionName = 
  | 'volumetry_distribution'  // Volumetría y Distribución Horaria (fusión + ampliación)
  | 'performance'             // Rendimiento
  | 'satisfaction'            // Satisfacción
  | 'economy'                 // Economía
  | 'efficiency'              // Eficiencia (fusiona efficiency + effectiveness)
  | 'benchmark';              // Benchmark

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

export enum RoadmapPhase {
  Automate = 'Automate',
  Assist = 'Assist',
  Augment = 'Augment'
}

export interface RoadmapInitiative {
  id: string;
  name: string;
  phase: RoadmapPhase;
  timeline: string;
  investment: number;
  resources: string[];
  dimensionId: string;
  risk?: 'high' | 'medium' | 'low';  // v2.0: Nuevo campo
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
}
