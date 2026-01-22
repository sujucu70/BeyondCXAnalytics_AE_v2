import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Zap, Brain, Activity, ChevronRight, Info, ChevronDown, ChevronUp, TrendingUp, BarChart2, Target, Repeat, AlertTriangle, Users, Sparkles, XCircle, AlertOctagon, ShieldAlert } from 'lucide-react';
import type { AnalysisData, HeatmapDataPoint, SubFactor, DrilldownDataPoint, OriginalQueueMetrics, AgenticTier, AgenticScoreBreakdown } from '../../types';
import {
  Card,
  Badge,
  TierBadge,
  SectionHeader,
  DistributionBar,
  Collapsible,
} from '../ui';
import {
  cn,
  COLORS,
  STATUS_CLASSES,
  TIER_CLASSES,
  getStatusFromScore,
  formatCurrency,
  formatNumber,
  formatPercent,
} from '../../config/designSystem';

// ============================================
// RED FLAGS CONFIGURATION AND DETECTION
// ============================================

// v3.5: Configuración de Red Flags
interface RedFlagConfig {
  id: string;
  label: string;
  shortLabel: string;
  threshold: number;
  operator: '>' | '<';
  getValue: (queue: OriginalQueueMetrics) => number;
  format: (value: number) => string;
  color: string;
  description: string;
}

const RED_FLAG_CONFIGS: RedFlagConfig[] = [
  {
    id: 'cv_high',
    label: 'CV AHT Crítico',
    shortLabel: 'CV',
    threshold: 120,
    operator: '>',
    getValue: (q) => q.cv_aht,
    format: (v) => `${v.toFixed(0)}%`,
    color: 'red',
    description: 'Variabilidad extrema - procesos impredecibles'
  },
  {
    id: 'transfer_high',
    label: 'Transfer Excesivo',
    shortLabel: 'Transfer',
    threshold: 50,
    operator: '>',
    getValue: (q) => q.transfer_rate,
    format: (v) => `${v.toFixed(0)}%`,
    color: 'orange',
    description: 'Alta complejidad - requiere escalado frecuente'
  },
  {
    id: 'volume_low',
    label: 'Volumen Insuficiente',
    shortLabel: 'Vol',
    threshold: 50,
    operator: '<',
    getValue: (q) => q.volume,
    format: (v) => v.toLocaleString(),
    color: 'slate',
    description: 'ROI negativo - volumen no justifica inversión'
  },
  {
    id: 'valid_low',
    label: 'Calidad Datos Baja',
    shortLabel: 'Valid',
    threshold: 30,
    operator: '<',
    getValue: (q) => q.volume > 0 ? (q.volumeValid / q.volume) * 100 : 0,
    format: (v) => `${v.toFixed(0)}%`,
    color: 'amber',
    description: 'Datos poco fiables - métricas distorsionadas'
  }
];

// v3.5: Detectar red flags de una cola
interface DetectedRedFlag {
  config: RedFlagConfig;
  value: number;
}

function detectRedFlags(queue: OriginalQueueMetrics): DetectedRedFlag[] {
  const flags: DetectedRedFlag[] = [];

  for (const config of RED_FLAG_CONFIGS) {
    const value = config.getValue(queue);
    const hasFlag = config.operator === '>'
      ? value > config.threshold
      : value < config.threshold;

    if (hasFlag) {
      flags.push({ config, value });
    }
  }

  return flags;
}

// v3.5: Componente de badge de Red Flag individual
function RedFlagBadge({ flag, size = 'sm' }: { flag: DetectedRedFlag; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'md' ? 'px-2 py-1 text-xs' : 'px-1.5 py-0.5 text-[10px]';

  return (
    <span
      className={`inline-flex items-center gap-1 ${sizeClasses} rounded bg-red-100 text-red-700 font-medium`}
      title={`${flag.config.label}: ${flag.config.format(flag.value)} (umbral: ${flag.config.operator}${flag.config.threshold})`}
    >
      <XCircle className="w-3 h-3" />
      {flag.config.shortLabel}: {flag.config.format(flag.value)}
    </span>
  );
}

// v3.5: Componente de lista de Red Flags de una cola
function RedFlagsList({ queue, compact = false }: { queue: OriginalQueueMetrics; compact?: boolean }) {
  const flags = detectRedFlags(queue);

  if (flags.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {flags.map(flag => (
          <RedFlagBadge key={flag.config.id} flag={flag} size="sm" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {flags.map(flag => (
        <div key={flag.config.id} className="flex items-center gap-2 text-xs">
          <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
          <span className="text-red-700 font-medium">{flag.config.label}:</span>
          <span className="text-red-600">{flag.config.format(flag.value)}</span>
          <span className="text-gray-400">(umbral: {flag.config.operator}{flag.config.threshold})</span>
        </div>
      ))}
    </div>
  );
}

interface AgenticReadinessTabProps {
  data: AnalysisData;
  onTabChange?: (tab: string) => void;
}

// ============================================
// METHODOLOGY INTRODUCTION SECTION
// ============================================

interface TierExplanation {
  tier: AgenticTier;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  description: string;
  criteria: string;
  recommendation: string;
}

const TIER_EXPLANATIONS: TierExplanation[] = [
  {
    tier: 'AUTOMATE',
    label: 'Automatizable',
    emoji: '🤖',
    color: '#10b981',
    bgColor: '#d1fae5',
    description: 'Procesos maduros listos para automatización completa con agente virtual.',
    criteria: 'Score ≥7.5: CV AHT <75%, Transfer <15%, Volumen >500/mes',
    recommendation: 'Desplegar agente virtual con resolución autónoma'
  },
  {
    tier: 'ASSIST',
    label: 'Asistible',
    emoji: '🤝',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    description: 'Candidatos a Copilot: IA asiste al agente humano en tiempo real.',
    criteria: 'Score 5.5-7.5: Procesos semiestructurados con variabilidad moderada',
    recommendation: 'Implementar Copilot con sugerencias y búsqueda inteligente'
  },
  {
    tier: 'AUGMENT',
    label: 'Optimizable',
    emoji: '📚',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    description: 'Requiere herramientas y estandarización antes de automatizar.',
    criteria: 'Score 3.5-5.5: Alta variabilidad o complejidad, necesita optimización',
    recommendation: 'Desplegar KB mejorada, scripts guiados, herramientas de soporte'
  },
  {
    tier: 'HUMAN-ONLY',
    label: 'Solo Humano',
    emoji: '👤',
    color: '#6b7280',
    bgColor: '#f3f4f6',
    description: 'No apto para automatización: volumen insuficiente o complejidad extrema.',
    criteria: 'Score <3.5 o Red Flags: CV >120%, Transfer >50%, Vol <50',
    recommendation: 'Mantener gestión humana, evaluar periódicamente'
  }
];

function AgenticMethodologyIntro({
  tierData,
  totalVolume,
  totalQueues
}: {
  tierData: TierDataType;
  totalVolume: number;
  totalQueues: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calcular estadísticas para el roadmap
  const automatizableQueues = tierData.AUTOMATE.count + tierData.ASSIST.count;
  const optimizableQueues = tierData.AUGMENT.count;
  const humanOnlyQueues = tierData['HUMAN-ONLY'].count;

  const automatizablePct = totalVolume > 0
    ? Math.round((tierData.AUTOMATE.volume + tierData.ASSIST.volume) / totalVolume * 100)
    : 0;

  return (
    <Card padding="none">
      {/* Header con toggle */}
      <div
        className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                ¿Qué es el Índice de Agentic Readiness?
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Metodología de evaluación y guía de navegación de este análisis
              </p>
            </div>
          </div>
          <button className="p-2 rounded-lg hover:bg-white/50 transition-colors">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {/* Contenido expandible */}
      {isExpanded && (
        <div className="p-5 space-y-6">
          {/* Sección 1: Definición del índice */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-600" />
              Definición del Índice
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-3">
                El <strong>Índice de Agentic Readiness</strong> evalúa qué porcentaje del volumen de interacciones
                está preparado para ser gestionado por agentes virtuales o asistido por IA. Se calcula
                analizando cada cola individualmente según 5 factores clave:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
                <div className="bg-white rounded p-2 border border-gray-200">
                  <div className="font-bold text-blue-600">Predictibilidad</div>
                  <div className="text-gray-500">30% peso</div>
                  <div className="text-gray-600 mt-1">CV AHT &lt;75%</div>
                </div>
                <div className="bg-white rounded p-2 border border-gray-200">
                  <div className="font-bold text-blue-600">Resolutividad</div>
                  <div className="text-gray-500">25% peso</div>
                  <div className="text-gray-600 mt-1">FCR alto, Transfer bajo</div>
                </div>
                <div className="bg-white rounded p-2 border border-gray-200">
                  <div className="font-bold text-blue-600">Volumen</div>
                  <div className="text-gray-500">25% peso</div>
                  <div className="text-gray-600 mt-1">ROI positivo &gt;500/mes</div>
                </div>
                <div className="bg-white rounded p-2 border border-gray-200">
                  <div className="font-bold text-blue-600">Calidad Datos</div>
                  <div className="text-gray-500">10% peso</div>
                  <div className="text-gray-600 mt-1">% registros válidos</div>
                </div>
                <div className="bg-white rounded p-2 border border-gray-200">
                  <div className="font-bold text-blue-600">Simplicidad</div>
                  <div className="text-gray-500">10% peso</div>
                  <div className="text-gray-600 mt-1">AHT bajo, proceso simple</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sección 2: Los 4 Tiers explicados */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              Las 4 Categorías de Clasificación
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Cada cola se clasifica en uno de los siguientes tiers según su score compuesto:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TIER_EXPLANATIONS.map(tier => (
                <div
                  key={tier.tier}
                  className="rounded-lg border p-3"
                  style={{ backgroundColor: tier.bgColor, borderColor: tier.color + '40' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{tier.emoji}</span>
                    <span className="font-bold" style={{ color: tier.color }}>{tier.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: tier.color }}>
                      {tier.tier}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{tier.description}</p>
                  <div className="text-xs text-gray-600">
                    <div className="mb-1"><strong>Criterios:</strong> {tier.criteria}</div>
                    <div><strong>Acción:</strong> {tier.recommendation}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sección 3: Roadmap de navegación */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              Contenido de este Análisis
            </h3>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-gray-700 mb-4">
                Este tab presenta el análisis de automatización en el siguiente orden:
              </p>

              <div className="space-y-3">
                {/* Paso 1 */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    1
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Visión Global de Distribución</div>
                    <p className="text-xs text-gray-600">
                      Porcentaje de volumen en cada categoría ({automatizablePct}% automatizable).
                      Las 4 cajas muestran cómo se distribuyen las {totalVolume.toLocaleString()} interacciones.
                    </p>
                  </div>
                </div>

                {/* Paso 2 */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                    2
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      Candidatos Prioritarios
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {automatizableQueues} colas
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Colas AUTOMATE y ASSIST ordenadas por potencial de ahorro.
                      Quick wins con mayor ROI para priorizar en el roadmap.
                    </p>
                  </div>
                </div>

                {/* Paso 3 */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">
                    3
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      Colas a Optimizar
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        {optimizableQueues} colas
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Tier AUGMENT: requieren estandarización previa (reducir variabilidad,
                      mejorar FCR, documentar procesos) antes de automatizar.
                    </p>
                  </div>
                </div>

                {/* Paso 4 */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-500 text-white text-xs font-bold flex items-center justify-center">
                    4
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      No Automatizables
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {humanOnlyQueues} colas
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Tier HUMAN-ONLY: volumen insuficiente (ROI negativo), calidad de datos baja,
                      variabilidad extrema, o complejidad que requiere juicio humano.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Nota metodológica */}
          <div className="text-xs text-gray-500 border-t border-gray-200 pt-4">
            <strong>Nota metodológica:</strong> El índice se calcula por cola individual, no como promedio global.
            Esto permite identificar oportunidades específicas incluso cuando la media operativa sea baja.
            Los umbrales están calibrados según benchmarks de industria (COPC, Gartner).
          </div>
        </div>
      )}

      {/* Mini resumen cuando está colapsado */}
      {!isExpanded && (
        <div className="px-5 py-3 bg-gray-50 text-xs text-gray-600 flex items-center gap-4 flex-wrap">
          <span><strong>5 factores</strong> ponderados</span>
          <span>→</span>
          <span><strong>4 categorías</strong> de clasificación</span>
          <span>→</span>
          <span><strong>{totalQueues} colas</strong> analizadas</span>
          <span className="ml-auto text-blue-600 font-medium">Click para expandir metodología</span>
        </div>
      )}
    </Card>
  );
}

// Factor configuration with weights (must sum to 1.0)
interface FactorConfig {
  id: string;
  title: string;
  weight: number;
  icon: React.ElementType;
  color: string;
  description: string;
  methodology: string;
  benchmark: string;
  implications: { high: string; low: string };
}

const FACTOR_CONFIGS: FactorConfig[] = [
  {
    id: 'predictibilidad',
    title: 'Predictibilidad',
    weight: 0.30,
    icon: Brain,
    color: '#6D84E3',
    description: 'Consistencia en tiempos de gestión',
    methodology: 'Score = 10 - (CV_AHT / 10). CV AHT < 30% → Score > 7',
    benchmark: 'CV AHT óptimo < 25%',
    implications: { high: 'Tiempos consistentes, ideal para IA', low: 'Requiere estandarización' }
  },
  {
    id: 'complejidad_inversa',
    title: 'Simplicidad',
    weight: 0.20,
    icon: Zap,
    color: '#10B981',
    description: 'Bajo nivel de juicio humano requerido',
    methodology: 'Score = 10 - (Tasa_Transfer × 0.4). Transfer <10% → Score > 6',
    benchmark: 'Transferencias óptimas <10%',
    implications: { high: 'Procesos simples, automatizables', low: 'Alta complejidad, requiere copilot' }
  },
  {
    id: 'repetitividad',
    title: 'Volumen',
    weight: 0.25,
    icon: Repeat,
    color: '#F59E0B',
    description: 'Escala para justificar inversión',
    methodology: 'Score = log10(Volumen) normalizado. >5000 → 10, <100 → 2',
    benchmark: 'ROI positivo requiere >500/mes',
    implications: { high: 'Alto volumen justifica inversión', low: 'Considerar soluciones compartidas' }
  },
  {
    id: 'roi_potencial',
    title: 'ROI Potencial',
    weight: 0.25,
    icon: TrendingUp,
    color: '#8B5CF6',
    description: 'Retorno económico esperado',
    methodology: 'Score basado en coste anual total. >€500K → 10',
    benchmark: 'ROI >150% a 12 meses',
    implications: { high: 'Caso de negocio sólido', low: 'ROI marginal, evaluar otros beneficios' }
  }
];

// v3.4: Helper para obtener estilo de Tier
function getTierStyle(tier: AgenticTier): { bg: string; text: string; icon: React.ReactNode; label: string } {
  switch (tier) {
    case 'AUTOMATE':
      return {
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        icon: <Sparkles className="w-3 h-3" />,
        label: 'Automatizar'
      };
    case 'ASSIST':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        icon: <Bot className="w-3 h-3" />,
        label: 'Asistir'
      };
    case 'AUGMENT':
      return {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        icon: <TrendingUp className="w-3 h-3" />,
        label: 'Optimizar'
      };
    case 'HUMAN-ONLY':
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        icon: <Users className="w-3 h-3" />,
        label: 'Humano'
      };
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        icon: null,
        label: tier
      };
  }
}

// v3.4: Componente de desglose de score
function ScoreBreakdownTooltip({ breakdown }: { breakdown: AgenticScoreBreakdown }) {
  return (
    <div className="text-xs space-y-1">
      <div className="flex justify-between gap-4">
        <span>Predictibilidad (30%)</span>
        <span className="font-medium">{breakdown.predictibilidad.toFixed(1)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Resolutividad (25%)</span>
        <span className="font-medium">{breakdown.resolutividad.toFixed(1)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Volumen (25%)</span>
        <span className="font-medium">{breakdown.volumen.toFixed(1)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Calidad Datos (10%)</span>
        <span className="font-medium">{breakdown.calidadDatos.toFixed(1)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span>Simplicidad (10%)</span>
        <span className="font-medium">{breakdown.simplicidad.toFixed(1)}</span>
      </div>
    </div>
  );
}

// Tooltip component for methodology
function InfoTooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
}

// Calcular factores desde datos reales
function calculateFactorsFromData(heatmapData: HeatmapDataPoint[]): { id: string; score: number; detail: string }[] {
  if (heatmapData.length === 0) return [];

  const totalVolume = heatmapData.reduce((sum, h) => sum + h.volume, 0) || 1;

  // Predictibilidad: basada en CV AHT promedio ponderado
  const avgCvAht = heatmapData.reduce((sum, h) => sum + (h.variability.cv_aht * h.volume), 0) / totalVolume;
  const predictScore = Math.max(0, Math.min(10, 10 - (avgCvAht / 10)));

  // Simplicidad: basada en tasa de transferencias promedio ponderada
  const avgTransfer = heatmapData.reduce((sum, h) => sum + (h.variability.transfer_rate * h.volume), 0) / totalVolume;
  const simplicityScore = Math.max(0, Math.min(10, 10 - (avgTransfer * 0.4)));

  // Volumen: basado en volumen total (escala logarítmica)
  const volScore = totalVolume > 50000 ? 10 :
                   totalVolume > 20000 ? 9 :
                   totalVolume > 10000 ? 8 :
                   totalVolume > 5000 ? 7 :
                   totalVolume > 2000 ? 6 :
                   totalVolume > 1000 ? 5 :
                   totalVolume > 500 ? 4 :
                   totalVolume > 100 ? 3 : 2;

  // ROI potencial: basado en coste anual total
  const totalCost = heatmapData.reduce((sum, h) => sum + (h.annual_cost || h.volume * h.aht_seconds * 0.005), 0);
  const roiScore = totalCost > 1000000 ? 10 :
                   totalCost > 500000 ? 9 :
                   totalCost > 300000 ? 8 :
                   totalCost > 200000 ? 7 :
                   totalCost > 100000 ? 6 :
                   totalCost > 50000 ? 5 : 4;

  return [
    { id: 'predictibilidad', score: predictScore, detail: `CV AHT: ${avgCvAht.toFixed(0)}%` },
    { id: 'complejidad_inversa', score: simplicityScore, detail: `Transfer: ${avgTransfer.toFixed(0)}%` },
    { id: 'repetitividad', score: volScore, detail: `${totalVolume.toLocaleString()} int.` },
    { id: 'roi_potencial', score: roiScore, detail: `€${(totalCost/1000).toFixed(0)}K` }
  ];
}

// Calculate weighted global score from factors
function calculateWeightedScore(factors: { id: string; score: number }[]): number {
  if (factors.length === 0) return 5;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const factor of factors) {
    const config = FACTOR_CONFIGS.find(c => c.id === factor.id);
    if (config) {
      weightedSum += factor.score * config.weight;
      totalWeight += config.weight;
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight * 10 : 5; // Normalize to ensure weights sum correctly
}

// v3.4: Tipo para datos de Tier
interface TierDataType {
  AUTOMATE: { count: number; volume: number };
  ASSIST: { count: number; volume: number };
  AUGMENT: { count: number; volume: number };
  'HUMAN-ONLY': { count: number; volume: number };
}

// ============================================
// v3.10: OPPORTUNITY BUBBLE CHART
// ============================================

// Colores por tier para el bubble chart
const TIER_BUBBLE_COLORS: Record<AgenticTier, { fill: string; stroke: string }> = {
  'AUTOMATE': { fill: '#10b981', stroke: '#059669' },  // Emerald
  'ASSIST': { fill: '#6d84e3', stroke: '#4f63b8' },    // Primary blue
  'AUGMENT': { fill: '#f59e0b', stroke: '#d97706' },   // Amber
  'HUMAN-ONLY': { fill: '#94a3b8', stroke: '#64748b' } // Slate
};

// Calcular radio con escala logarítmica
function calcularRadioBurbuja(volumen: number, maxVolumen: number): number {
  const minRadio = 6;
  const maxRadio = 35;
  if (volumen <= 0 || maxVolumen <= 0) return minRadio;
  const escala = Math.log10(volumen + 1) / Math.log10(maxVolumen + 1);
  return minRadio + (maxRadio - minRadio) * escala;
}

// Período de datos: el volumen corresponde a 11 meses, no es mensual
const DATA_PERIOD_MONTHS = 11;

// Calcular ahorro TCO por cola
// v4.2: Corregido para convertir volumen de 11 meses a anual
function calcularAhorroTCO(queue: OriginalQueueMetrics): number {
  // CPI Config similar a RoadmapTab
  const CPI_HUMANO = 2.33;
  const CPI_BOT = 0.15;
  const CPI_ASSIST = 1.50;
  const CPI_AUGMENT = 2.00;

  const ratesByTier: Record<AgenticTier, { rate: number; cpi: number }> = {
    'AUTOMATE': { rate: 0.70, cpi: CPI_BOT },
    'ASSIST': { rate: 0.30, cpi: CPI_ASSIST },
    'AUGMENT': { rate: 0.15, cpi: CPI_AUGMENT },
    'HUMAN-ONLY': { rate: 0, cpi: CPI_HUMANO }
  };

  const config = ratesByTier[queue.tier];
  // Ahorro anual = (volumen/11) × 12 × rate × (CPI_humano - CPI_target)
  const annualVolume = (queue.volume / DATA_PERIOD_MONTHS) * 12;
  const ahorroAnual = annualVolume * config.rate * (CPI_HUMANO - config.cpi);
  return Math.round(ahorroAnual);
}

// Interfaz para datos de burbuja
interface BubbleData {
  id: string;
  name: string;
  skillName: string;
  score: number;
  tier: AgenticTier;
  volume: number;
  ahorro: number;
  cv: number;
  fcr: number;
  transfer: number;
  x: number;  // Posición X (score)
  y: number;  // Posición Y (ahorro)
  radius: number;
}

// Componente del Bubble Chart de Oportunidades
function OpportunityBubbleChart({ drilldownData }: { drilldownData: DrilldownDataPoint[] }) {
  // Estados para filtros
  const [tierFilter, setTierFilter] = useState<'Todos' | AgenticTier>('Todos');
  const [minAhorro, setMinAhorro] = useState<number>(0);
  const [minVolumen, setMinVolumen] = useState<number>(0);
  const [hoveredBubble, setHoveredBubble] = useState<BubbleData | null>(null);
  const [selectedBubble, setSelectedBubble] = useState<BubbleData | null>(null);

  // Responsive chart dimensions
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(700);

  React.useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerWidth(Math.max(320, width - 32)); // min 320px, account for padding
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Dimensiones del chart - responsive
  const chartWidth = containerWidth;
  const chartHeight = Math.min(400, containerWidth * 0.6); // aspect ratio ~1.67:1
  const margin = {
    top: 30,
    right: containerWidth < 500 ? 15 : 30,
    bottom: 50,
    left: containerWidth < 500 ? 45 : 70
  };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  // Extraer todas las colas y calcular ahorro
  const allQueues = React.useMemo(() => {
    return drilldownData.flatMap(skill =>
      skill.originalQueues.map(q => ({
        ...q,
        skillName: skill.skill,
        ahorro: calcularAhorroTCO(q)
      }))
    );
  }, [drilldownData]);

  // Filtrar colas según criterios
  const filteredQueues = React.useMemo(() => {
    return allQueues
      .filter(q => q.tier !== 'HUMAN-ONLY') // Excluir HUMAN-ONLY (no tienen ahorro)
      .filter(q => q.ahorro > minAhorro)
      .filter(q => q.volume >= minVolumen)
      .filter(q => tierFilter === 'Todos' || q.tier === tierFilter)
      .sort((a, b) => b.ahorro - a.ahorro) // Ordenar por ahorro descendente
      .slice(0, 20); // Mostrar hasta 20 burbujas
  }, [allQueues, tierFilter, minAhorro, minVolumen]);

  // Calcular escalas
  const maxVolumen = Math.max(...allQueues.map(q => q.volume), 1);
  const maxAhorro = Math.max(...filteredQueues.map(q => q.ahorro), 1);

  // Crear datos de burbujas con posiciones
  const bubbleData: BubbleData[] = React.useMemo(() => {
    return filteredQueues.map(q => ({
      id: q.original_queue_id,
      name: q.original_queue_id,
      skillName: q.skillName,
      score: q.agenticScore,
      tier: q.tier,
      volume: q.volume,
      ahorro: q.ahorro,
      cv: q.cv_aht,
      // FCR Técnico para consistencia con Executive Summary (fallback: 100 - transfer_rate)
      fcr: q.fcr_tecnico ?? (100 - q.transfer_rate),
      transfer: q.transfer_rate,
      // Escala X: score 0-10 -> 0-innerWidth
      x: (q.agenticScore / 10) * innerWidth,
      // Escala Y: ahorro 0-max -> innerHeight-0 (invertido para que arriba sea más)
      y: innerHeight - (q.ahorro / maxAhorro) * innerHeight,
      radius: calcularRadioBurbuja(q.volume, maxVolumen)
    }));
  }, [filteredQueues, maxVolumen, maxAhorro, innerWidth, innerHeight]);

  // v3.12: Contadores por cuadrante sincronizados con filtros
  // Umbrales fijos para score, umbral relativo para ahorro (30% del max visible)
  const SCORE_AUTOMATE = 7.5;
  const SCORE_ASSIST = 5.5;
  const AHORRO_THRESHOLD_PCT = 0.3;

  const quadrantStats = React.useMemo(() => {
    const ahorroThreshold = maxAhorro * AHORRO_THRESHOLD_PCT;

    // Cuadrantes basados en posición visual
    const quickWins = bubbleData.filter(b =>
      b.score >= SCORE_AUTOMATE && b.ahorro >= ahorroThreshold
    );
    const highPotential = bubbleData.filter(b =>
      b.score >= SCORE_ASSIST && b.score < SCORE_AUTOMATE && b.ahorro >= ahorroThreshold
    );
    const lowHanging = bubbleData.filter(b =>
      b.score >= SCORE_AUTOMATE && b.ahorro < ahorroThreshold
    );
    const nurture = bubbleData.filter(b =>
      b.score < SCORE_ASSIST
    );
    const backlog = bubbleData.filter(b =>
      b.score >= SCORE_ASSIST && b.score < SCORE_AUTOMATE && b.ahorro < ahorroThreshold
    );

    const sumAhorro = (items: BubbleData[]) => items.reduce((sum, b) => sum + b.ahorro, 0);

    return {
      quickWins: { items: quickWins, count: quickWins.length, ahorro: sumAhorro(quickWins) },
      highPotential: { items: highPotential, count: highPotential.length, ahorro: sumAhorro(highPotential) },
      lowHanging: { items: lowHanging, count: lowHanging.length, ahorro: sumAhorro(lowHanging) },
      nurture: { items: nurture, count: nurture.length, ahorro: sumAhorro(nurture) },
      backlog: { items: backlog, count: backlog.length, ahorro: sumAhorro(backlog) },
      total: bubbleData.length,
      totalAhorro: sumAhorro(bubbleData),
      ahorroThreshold
    };
  }, [bubbleData, maxAhorro]);

  const sumAhorro = (items: BubbleData[]) => items.reduce((sum, b) => sum + b.ahorro, 0);

  // Indicador de filtros activos
  const hasActiveFilters = minAhorro > 0 || minVolumen > 0 || tierFilter !== 'Todos';

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `€${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `€${Math.round(val / 1000)}K`;
    return `€${val}`;
  };

  const formatVolume = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${Math.round(v / 1000)}K`;
    return v.toString();
  };

  // Umbral de score para línea vertical AUTOMATE
  const automateThresholdX = (7.5 / 10) * innerWidth;
  const assistThresholdX = (5.5 / 10) * innerWidth;

  return (
    <div ref={containerRef} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-3 sm:px-4 py-3 border-b" style={{ backgroundColor: COLORS.light }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Target className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.primary }} />
            <h3 className="font-bold text-sm sm:text-base truncate" style={{ color: COLORS.dark }}>
              Mapa de Oportunidades
            </h3>
          </div>
          <span className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0" style={{ backgroundColor: COLORS.primary, color: 'white' }}>
            {bubbleData.length} colas
          </span>
        </div>
        <p className="text-[10px] sm:text-xs mt-1" style={{ color: COLORS.medium }}>
          Tamaño = Volumen · Color = Tier · Posición = Score vs Ahorro TCO
        </p>
      </div>

      {/* Filtros */}
      <div className="px-3 sm:px-4 py-2 border-b border-gray-100 flex flex-wrap gap-2 sm:gap-4 items-center bg-gray-50/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: COLORS.dark }}>Tier:</span>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as 'Todos' | AgenticTier)}
            className="text-xs border border-gray-200 rounded px-2 py-1"
          >
            <option value="Todos">Todos</option>
            <option value="AUTOMATE">AUTOMATE</option>
            <option value="ASSIST">ASSIST</option>
            <option value="AUGMENT">AUGMENT</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: COLORS.dark }}>Ahorro mín:</span>
          <select
            value={minAhorro}
            onChange={(e) => setMinAhorro(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded px-2 py-1"
          >
            <option value={0}>€0</option>
            <option value={10000}>€10K</option>
            <option value={50000}>€50K</option>
            <option value={100000}>€100K</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: COLORS.dark }}>Volumen mín:</span>
          <select
            value={minVolumen}
            onChange={(e) => setMinVolumen(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded px-2 py-1"
          >
            <option value={0}>0</option>
            <option value={1000}>1K</option>
            <option value={5000}>5K</option>
            <option value={10000}>10K</option>
          </select>
        </div>

        {/* v3.12: Indicador de filtros activos con resumen de cuadrantes */}
        {hasActiveFilters && (
          <div className="ml-auto flex items-center gap-2 text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-200">
            <span className="font-medium">Filtros activos:</span>
            {minAhorro > 0 && <span>Ahorro ≥€{minAhorro >= 1000 ? `${minAhorro/1000}K` : minAhorro}</span>}
            {minVolumen > 0 && <span>Vol ≥{minVolumen >= 1000 ? `${minVolumen/1000}K` : minVolumen}</span>}
            {tierFilter !== 'Todos' && <span>Tier: {tierFilter}</span>}
            <span className="text-amber-500">|</span>
            <span>{quadrantStats.total} de {allQueues.filter(q => q.tier !== 'HUMAN-ONLY').length} colas</span>
          </div>
        )}
      </div>

      {/* SVG Chart */}
      <div className="px-2 sm:px-4 py-4 relative overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="mx-auto min-w-[320px]">
          {/* Definiciones para gradientes y filtros */}
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="1" dy="1" stdDeviation="2" floodOpacity="0.2" />
            </filter>
          </defs>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Fondo de cuadrantes */}
            {/* Quick Wins (top-right) */}
            <rect
              x={automateThresholdX}
              y={0}
              width={innerWidth - automateThresholdX}
              height={innerHeight * 0.7}
              fill="#dcfce7"
              opacity={0.3}
            />
            {/* High Potential (top-center) */}
            <rect
              x={assistThresholdX}
              y={0}
              width={automateThresholdX - assistThresholdX}
              height={innerHeight * 0.7}
              fill="#dbeafe"
              opacity={0.3}
            />
            {/* Nurture (left) */}
            <rect
              x={0}
              y={0}
              width={assistThresholdX}
              height={innerHeight}
              fill="#fef3c7"
              opacity={0.2}
            />

            {/* Líneas de umbral verticales */}
            <line
              x1={automateThresholdX}
              y1={0}
              x2={automateThresholdX}
              y2={innerHeight}
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="6,3"
              opacity={0.7}
            />
            <line
              x1={assistThresholdX}
              y1={0}
              x2={assistThresholdX}
              y2={innerHeight}
              stroke="#6d84e3"
              strokeWidth={1.5}
              strokeDasharray="4,4"
              opacity={0.5}
            />

            {/* v3.12: Etiquetas de cuadrante sincronizadas con filtros */}
            {/* Quick Wins (top-right) */}
            <text x={automateThresholdX + 10} y={15} fontSize={10} fill="#059669" fontWeight="bold">
              🎯 QUICK WINS
            </text>
            <text x={automateThresholdX + 10} y={28} fontSize={9} fill="#059669">
              {quadrantStats.quickWins.count} colas · {formatCurrency(quadrantStats.quickWins.ahorro)}
            </text>

            {/* Alto Potencial (top-center) */}
            <text x={assistThresholdX + 10} y={15} fontSize={10} fill="#4f63b8" fontWeight="bold">
              ⚡ ALTO POTENCIAL
            </text>
            <text x={assistThresholdX + 10} y={28} fontSize={9} fill="#4f63b8">
              {quadrantStats.highPotential.count} colas · {formatCurrency(quadrantStats.highPotential.ahorro)}
            </text>

            {/* Desarrollar / Nurture (left column) */}
            <text x={10} y={15} fontSize={10} fill="#92400e" fontWeight="bold">
              📈 DESARROLLAR
            </text>
            <text x={10} y={28} fontSize={9} fill="#92400e">
              {quadrantStats.nurture.count} colas · {formatCurrency(quadrantStats.nurture.ahorro)}
            </text>

            {/* Low Hanging Fruit (bottom-right) - Fácil pero bajo ahorro */}
            {quadrantStats.lowHanging.count > 0 && (
              <>
                <text x={automateThresholdX + 10} y={innerHeight * 0.75 + 15} fontSize={9} fill="#6b7280" fontWeight="medium">
                  ✅ FÁCIL IMPL.
                </text>
                <text x={automateThresholdX + 10} y={innerHeight * 0.75 + 27} fontSize={8} fill="#9ca3af">
                  {quadrantStats.lowHanging.count} · {formatCurrency(quadrantStats.lowHanging.ahorro)}
                </text>
              </>
            )}

            {/* Backlog (bottom-center) */}
            {quadrantStats.backlog.count > 0 && (
              <>
                <text x={assistThresholdX + 10} y={innerHeight * 0.75 + 15} fontSize={9} fill="#6b7280" fontWeight="medium">
                  📋 BACKLOG
                </text>
                <text x={assistThresholdX + 10} y={innerHeight * 0.75 + 27} fontSize={8} fill="#9ca3af">
                  {quadrantStats.backlog.count} · {formatCurrency(quadrantStats.backlog.ahorro)}
                </text>
              </>
            )}

            {/* Ejes */}
            {/* Eje X */}
            <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={COLORS.medium} strokeWidth={1} />
            {/* Ticks X */}
            {[0, 2, 4, 5.5, 6, 7.5, 8, 10].map(score => {
              const x = (score / 10) * innerWidth;
              return (
                <g key={score}>
                  <line x1={x} y1={innerHeight} x2={x} y2={innerHeight + 5} stroke={COLORS.medium} />
                  <text
                    x={x}
                    y={innerHeight + 18}
                    textAnchor="middle"
                    fontSize={10}
                    fill={score === 7.5 ? '#059669' : score === 5.5 ? '#4f63b8' : COLORS.dark}
                    fontWeight={score === 7.5 || score === 5.5 ? 'bold' : 'normal'}
                  >
                    {score}
                  </text>
                </g>
              );
            })}
            <text x={innerWidth / 2} y={innerHeight + 38} textAnchor="middle" fontSize={11} fill={COLORS.dark} fontWeight="medium">
              Agentic Score
            </text>

            {/* Eje Y */}
            <line x1={0} y1={0} x2={0} y2={innerHeight} stroke={COLORS.medium} strokeWidth={1} />
            {/* Ticks Y */}
            {[0, 0.25, 0.5, 0.75, 1].map(pct => {
              const y = innerHeight - pct * innerHeight;
              const value = pct * maxAhorro;
              return (
                <g key={pct}>
                  <line x1={-5} y1={y} x2={0} y2={y} stroke={COLORS.medium} />
                  <text x={-10} y={y + 4} textAnchor="end" fontSize={9} fill={COLORS.dark}>
                    {formatCurrency(value)}
                  </text>
                </g>
              );
            })}
            <text
              x={-45}
              y={innerHeight / 2}
              textAnchor="middle"
              fontSize={11}
              fill={COLORS.dark}
              fontWeight="medium"
              transform={`rotate(-90, -45, ${innerHeight / 2})`}
            >
              Ahorro TCO Anual
            </text>

            {/* Burbujas */}
            {bubbleData.map((bubble, idx) => (
              <g
                key={bubble.id}
                onMouseEnter={() => setHoveredBubble(bubble)}
                onMouseLeave={() => setHoveredBubble(null)}
                onClick={() => setSelectedBubble(bubble)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={bubble.x}
                  cy={bubble.y}
                  r={bubble.radius}
                  fill={TIER_BUBBLE_COLORS[bubble.tier].fill}
                  stroke={hoveredBubble?.id === bubble.id ? COLORS.dark : TIER_BUBBLE_COLORS[bubble.tier].stroke}
                  strokeWidth={hoveredBubble?.id === bubble.id ? 3 : 1.5}
                  opacity={hoveredBubble && hoveredBubble.id !== bubble.id ? 0.4 : 0.85}
                  filter={hoveredBubble?.id === bubble.id ? 'url(#shadow)' : undefined}
                  style={{ transition: 'all 0.2s ease' }}
                />
                {/* Etiqueta si burbuja es grande */}
                {bubble.radius > 18 && (
                  <text
                    x={bubble.x}
                    y={bubble.y + 3}
                    textAnchor="middle"
                    fontSize={8}
                    fill="white"
                    fontWeight="bold"
                    style={{ pointerEvents: 'none' }}
                  >
                    {bubble.name.length > 8 ? bubble.name.substring(0, 6) + '…' : bubble.name}
                  </text>
                )}
              </g>
            ))}

            {/* Mensaje si no hay datos */}
            {bubbleData.length === 0 && (
              <text x={innerWidth / 2} y={innerHeight / 2} textAnchor="middle" fontSize={14} fill={COLORS.medium}>
                No hay colas que cumplan los filtros seleccionados
              </text>
            )}
          </g>
        </svg>

        {/* Tooltip flotante */}
        {hoveredBubble && (
          <div
            className="absolute z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-3 pointer-events-none"
            style={{
              left: Math.min(margin.left + hoveredBubble.x + 20, chartWidth - 200),
              top: Math.min(margin.top + hoveredBubble.y - 10, chartHeight - 150),
              minWidth: 180
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-gray-100">
              <span className="font-bold text-sm" style={{ color: COLORS.dark }}>{hoveredBubble.name}</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white"
                style={{ backgroundColor: TIER_BUBBLE_COLORS[hoveredBubble.tier].fill }}
              >
                {hoveredBubble.tier}
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span style={{ color: COLORS.medium }}>Score:</span>
                <span className="font-semibold" style={{ color: COLORS.dark }}>{hoveredBubble.score.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: COLORS.medium }}>Volumen:</span>
                <span className="font-semibold" style={{ color: COLORS.dark }}>{formatVolume(hoveredBubble.volume)}/mes</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: COLORS.medium }}>Ahorro:</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(hoveredBubble.ahorro)}/año</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: COLORS.medium }}>CV AHT:</span>
                <span className={`font-semibold ${hoveredBubble.cv > 120 ? 'text-red-500' : hoveredBubble.cv > 75 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {hoveredBubble.cv.toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: COLORS.medium }}>FCR:</span>
                <span className="font-semibold" style={{ color: COLORS.dark }}>{hoveredBubble.fcr.toFixed(0)}%</span>
              </div>
            </div>
            <p className="text-[10px] text-center mt-2 pt-2 border-t border-gray-100" style={{ color: COLORS.medium }}>
              Click para ver detalle
            </p>
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
        <div className="flex flex-wrap justify-between gap-4">
          {/* Leyenda de colores */}
          <div>
            <p className="text-[10px] font-bold mb-1.5" style={{ color: COLORS.dark }}>COLOR = TIER</p>
            <div className="flex gap-3">
              {(['AUTOMATE', 'ASSIST', 'AUGMENT'] as AgenticTier[]).map(tier => (
                <div key={tier} className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: TIER_BUBBLE_COLORS[tier].fill }}
                  />
                  <span className="text-[10px]" style={{ color: COLORS.dark }}>
                    {tier === 'AUTOMATE' ? '≥7.5' : tier === 'ASSIST' ? '≥5.5' : '≥3.5'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Leyenda de tamaños */}
          <div>
            <p className="text-[10px] font-bold mb-1.5" style={{ color: COLORS.dark }}>TAMAÑO = VOLUMEN</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-[10px]" style={{ color: COLORS.dark }}>&lt;1K</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3.5 h-3.5 rounded-full bg-gray-400" />
                <span className="text-[10px]" style={{ color: COLORS.dark }}>1K-10K</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-gray-400" />
                <span className="text-[10px]" style={{ color: COLORS.dark }}>&gt;10K</span>
              </div>
            </div>
          </div>

          {/* v3.12: Resumen con breakdown de cuadrantes */}
          <div className="flex items-center gap-4">
            {/* Breakdown de cuadrantes */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
              <span className="text-emerald-600 font-medium">
                🎯 {quadrantStats.quickWins.count}
              </span>
              <span className="text-blue-600 font-medium">
                ⚡ {quadrantStats.highPotential.count}
              </span>
              <span className="text-amber-600 font-medium">
                📈 {quadrantStats.nurture.count}
              </span>
              {quadrantStats.lowHanging.count > 0 && (
                <span className="text-gray-500 font-medium">
                  ✅ {quadrantStats.lowHanging.count}
                </span>
              )}
              {quadrantStats.backlog.count > 0 && (
                <span className="text-gray-400 font-medium">
                  📋 {quadrantStats.backlog.count}
                </span>
              )}
              <span className="text-gray-400">
                = {quadrantStats.total} total
              </span>
            </div>

            {/* Ahorro total */}
            <div className="text-right border-l border-gray-200 pl-4">
              <p className="text-[10px] font-bold mb-0.5" style={{ color: COLORS.dark }}>AHORRO VISIBLE</p>
              <p className="text-base font-bold text-emerald-600">{formatCurrency(quadrantStats.totalAhorro)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de detalle */}
      {selectedBubble && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setSelectedBubble(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-lg" style={{ color: COLORS.dark }}>{selectedBubble.name}</h4>
              <button onClick={() => setSelectedBubble(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: TIER_BUBBLE_COLORS[selectedBubble.tier].fill }}
                >
                  {selectedBubble.tier}
                </span>
                <span className="text-sm" style={{ color: COLORS.medium }}>
                  Skill: {selectedBubble.skillName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 py-3 border-y border-gray-100">
                <div>
                  <p className="text-xs" style={{ color: COLORS.medium }}>Agentic Score</p>
                  <p className="text-xl font-bold" style={{ color: COLORS.primary }}>{selectedBubble.score.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: COLORS.medium }}>Ahorro Anual</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(selectedBubble.ahorro)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: COLORS.medium }}>Volumen/mes</p>
                  <p className="text-lg font-semibold" style={{ color: COLORS.dark }}>{formatVolume(selectedBubble.volume)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: COLORS.medium }}>CV AHT</p>
                  <p className={`text-lg font-semibold ${selectedBubble.cv > 120 ? 'text-red-500' : selectedBubble.cv > 75 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {selectedBubble.cv.toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: COLORS.medium }}>FCR</p>
                  <p className="text-lg font-semibold" style={{ color: COLORS.dark }}>{selectedBubble.fcr.toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: COLORS.medium }}>Transfer Rate</p>
                  <p className={`text-lg font-semibold ${selectedBubble.transfer > 50 ? 'text-red-500' : selectedBubble.transfer > 30 ? 'text-amber-500' : 'text-gray-700'}`}>
                    {selectedBubble.transfer.toFixed(0)}%
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium mb-1" style={{ color: COLORS.dark }}>
                  {selectedBubble.tier === 'AUTOMATE' ? '🎯 Candidato a Quick Win' :
                   selectedBubble.tier === 'ASSIST' ? '⚡ Alto Potencial con Copilot' :
                   '📈 Requiere estandarización previa'}
                </p>
                <p className="text-xs" style={{ color: COLORS.medium }}>
                  {selectedBubble.tier === 'AUTOMATE'
                    ? 'Score ≥7.5 indica procesos maduros listos para automatización completa.'
                    : selectedBubble.tier === 'ASSIST'
                    ? 'Score 5.5-7.5 se beneficia de asistencia IA (Copilot) para elevar a Tier 1.'
                    : 'Score <5.5 requiere trabajo previo de estandarización antes de automatizar.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== Cabecera Agentic Readiness Score con colores corporativos ==========
function AgenticReadinessHeader({
  tierData,
  totalVolume,
  totalQueues
}: {
  tierData: TierDataType;
  totalVolume: number;
  totalQueues: number;
}) {
  // Calcular volumen automatizable (AUTOMATE + ASSIST)
  const automatizableVolume = tierData.AUTOMATE.volume + tierData.ASSIST.volume;
  const automatizablePct = totalVolume > 0 ? (automatizableVolume / totalVolume) * 100 : 0;

  // Porcentajes por tier
  const tierPcts = {
    AUTOMATE: totalVolume > 0 ? (tierData.AUTOMATE.volume / totalVolume) * 100 : 0,
    ASSIST: totalVolume > 0 ? (tierData.ASSIST.volume / totalVolume) * 100 : 0,
    AUGMENT: totalVolume > 0 ? (tierData.AUGMENT.volume / totalVolume) * 100 : 0,
    'HUMAN-ONLY': totalVolume > 0 ? (tierData['HUMAN-ONLY'].volume / totalVolume) * 100 : 0
  };

  // Formatear volumen
  const formatVolume = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${Math.round(v / 1000)}K`;
    return v.toLocaleString();
  };

  // Tier card config con colores consistentes con la sección introductoria
  const tierConfigs = [
    { key: 'AUTOMATE', label: 'AUTOMATE', emoji: '🤖', sublabel: 'Full IA', color: '#10b981', bgColor: '#d1fae5' },
    { key: 'ASSIST', label: 'ASSIST', emoji: '🤝', sublabel: 'Copilot', color: '#3b82f6', bgColor: '#dbeafe' },
    { key: 'AUGMENT', label: 'AUGMENT', emoji: '📚', sublabel: 'Tools', color: '#f59e0b', bgColor: '#fef3c7' },
    { key: 'HUMAN-ONLY', label: 'HUMAN', emoji: '👤', sublabel: 'Manual', color: '#6b7280', bgColor: '#f3f4f6' }
  ];

  // Calcular porcentaje de colas AUTOMATE
  const pctColasAutomate = totalQueues > 0 ? (tierData.AUTOMATE.count / totalQueues) * 100 : 0;

  // Generar interpretación que explica la diferencia volumen vs colas
  const getInterpretation = () => {
    // El score principal (88%) se basa en VOLUMEN de interacciones
    // El % de colas AUTOMATE (26%) es diferente porque hay pocas colas de alto volumen
    return `El ${Math.round(automatizablePct)}% representa el volumen de interacciones automatizables (AUTOMATE + ASSIST). ` +
           `Solo el ${Math.round(pctColasAutomate)}% de las colas (${tierData.AUTOMATE.count} de ${totalQueues}) son AUTOMATE, ` +
           `pero concentran ${Math.round(tierPcts.AUTOMATE)}% del volumen total. ` +
           `Esto indica pocas colas de alto volumen automatizables - oportunidad concentrada en Quick Wins de alto impacto.`;
  };

  return (
    <Card padding="none">
      {/* Header */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-600" />
          Agentic Readiness Score
        </h2>
      </div>

      <div className="p-5">
        {/* Score Principal - Centrado */}
        <div className="text-center mb-6">
          <div className="inline-block px-8 py-4 rounded-xl border-2" style={{ borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` }}>
            <div className="text-5xl font-bold" style={{ color: COLORS.primary }}>
              {Math.round(automatizablePct)}%
            </div>
            <div className="text-sm font-semibold mt-1" style={{ color: COLORS.dark }}>
              Volumen Automatizable
            </div>
            <div className="text-xs" style={{ color: COLORS.medium }}>
              (Tier AUTOMATE + ASSIST)
            </div>
          </div>
        </div>

        {/* 4 Tier Cards - colores consistentes con sección introductoria */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {tierConfigs.map(config => {
            const tierKey = config.key as keyof TierDataType;
            const data = tierData[tierKey];
            const pct = tierPcts[tierKey];

            return (
              <div
                key={config.key}
                className="rounded-lg border p-3 text-center"
                style={{ backgroundColor: config.bgColor, borderColor: config.color + '40' }}
              >
                <div className="text-xs font-bold mb-1" style={{ color: config.color }}>
                  {config.label}
                </div>
                <div className="text-2xl font-bold" style={{ color: config.color }}>
                  {Math.round(pct)}%
                </div>
                <div className="text-xs mt-1 text-gray-600">
                  {formatVolume(data.volume)} int
                </div>
                <div className="text-sm mt-1 text-gray-700">
                  {config.emoji} {config.sublabel}
                </div>
                <div className="text-xs mt-0.5 text-gray-500">
                  {data.count} colas
                </div>
              </div>
            );
          })}
        </div>

        {/* Barra de distribución visual - colores consistentes */}
        <div className="mb-4">
          <div className="flex h-3 rounded-full overflow-hidden bg-gray-200">
            {tierPcts.AUTOMATE > 0 && (
              <div
                style={{ width: `${tierPcts.AUTOMATE}%`, backgroundColor: '#10b981' }}
                title={`AUTOMATE: ${Math.round(tierPcts.AUTOMATE)}%`}
              />
            )}
            {tierPcts.ASSIST > 0 && (
              <div
                style={{ width: `${tierPcts.ASSIST}%`, backgroundColor: '#3b82f6' }}
                title={`ASSIST: ${Math.round(tierPcts.ASSIST)}%`}
              />
            )}
            {tierPcts.AUGMENT > 0 && (
              <div
                style={{ width: `${tierPcts.AUGMENT}%`, backgroundColor: '#f59e0b' }}
                title={`AUGMENT: ${Math.round(tierPcts.AUGMENT)}%`}
              />
            )}
            {tierPcts['HUMAN-ONLY'] > 0 && (
              <div
                style={{ width: `${tierPcts['HUMAN-ONLY']}%`, backgroundColor: '#6b7280' }}
                title={`HUMAN: ${Math.round(tierPcts['HUMAN-ONLY'])}%`}
              />
            )}
          </div>
          <div className="flex justify-between text-[10px] mt-1 text-gray-500">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Interpretación condensada en una línea */}
        <div className="pt-3" style={{ borderTop: `2px solid ${COLORS.light}` }}>
          <p className="text-xs" style={{ color: COLORS.dark }}>
            <span className="font-semibold" style={{ color: COLORS.primary }}>📊 Interpretación: </span>
            {getInterpretation()}
          </p>
        </div>

        {/* Footer con totales */}
        <div className="mt-3 pt-3 flex items-center justify-between text-xs" style={{ borderTop: `1px solid ${COLORS.light}`, color: COLORS.medium }}>
          <span>
            Total: <strong style={{ color: COLORS.dark }}>{formatVolume(totalVolume)}</strong> interacciones
          </span>
          <span>
            <strong style={{ color: COLORS.dark }}>{totalQueues}</strong> colas analizadas
          </span>
        </div>
      </div>
    </Card>
  );
}

// ========== Sección de Factores del Score Global ==========
function GlobalFactorsSection({
  drilldownData,
  tierData,
  totalVolume
}: {
  drilldownData: DrilldownDataPoint[];
  tierData: TierDataType;
  totalVolume: number;
}) {
  const allQueues = drilldownData.flatMap(skill => skill.originalQueues);

  // Calcular métricas globales ponderadas por volumen
  const totalQueueVolume = allQueues.reduce((sum, q) => sum + q.volume, 0);

  // CV AHT promedio ponderado
  const avgCV = totalQueueVolume > 0
    ? allQueues.reduce((sum, q) => sum + q.cv_aht * q.volume, 0) / totalQueueVolume
    : 0;

  // FCR Técnico promedio ponderado (consistente con Executive Summary)
  const avgFCR = totalQueueVolume > 0
    ? allQueues.reduce((sum, q) => sum + (q.fcr_tecnico ?? (100 - q.transfer_rate)) * q.volume, 0) / totalQueueVolume
    : 0;

  // Transfer rate promedio ponderado
  const avgTransfer = totalQueueVolume > 0
    ? allQueues.reduce((sum, q) => sum + q.transfer_rate * q.volume, 0) / totalQueueVolume
    : 0;

  // AHT promedio ponderado
  const avgAHT = totalQueueVolume > 0
    ? allQueues.reduce((sum, q) => sum + q.aht_mean * q.volume, 0) / totalQueueVolume
    : 0;

  // Calidad de datos: % registros válidos (aproximación)
  const validRecordsRatio = allQueues.length > 0
    ? allQueues.reduce((sum, q) => sum + (q.volumeValid / Math.max(1, q.volume)) * q.volume, 0) / totalQueueVolume
    : 0;
  const dataQualityPct = Math.round(validRecordsRatio * 100);

  // Calcular scores de cada factor (0-10)
  // Predictibilidad: basado en CV AHT (CV < 75% = bueno)
  const predictabilityScore = Math.max(0, Math.min(10, 10 - (avgCV / 20)));

  // Resolutividad: FCR (60%) + Transfer inverso (40%)
  const fcrComponent = (avgFCR / 100) * 10 * 0.6;
  const transferComponent = Math.max(0, (1 - avgTransfer / 50)) * 10 * 0.4;
  const resolutionScore = Math.min(10, fcrComponent + transferComponent);

  // Volumen: logarítmico basado en volumen del periodo
  const volumeScore = Math.min(10, Math.log10(totalQueueVolume + 1) * 2.5);

  // Calidad datos: % válidos
  const dataQualityScore = dataQualityPct / 10;

  // Simplicidad: basado en AHT (< 180s = 10, > 600s = 0)
  const simplicityScore = Math.max(0, Math.min(10, 10 - ((avgAHT - 180) / 60)));

  // Score global ponderado
  const weights = { predictability: 0.30, resolution: 0.25, volume: 0.25, dataQuality: 0.10, simplicity: 0.10 };
  const globalScore = (
    predictabilityScore * weights.predictability +
    resolutionScore * weights.resolution +
    volumeScore * weights.volume +
    dataQualityScore * weights.dataQuality +
    simplicityScore * weights.simplicity
  );

  // Automatizable %
  const automatizableVolume = tierData.AUTOMATE.volume + tierData.ASSIST.volume;
  const automatizablePct = totalVolume > 0 ? Math.round((automatizableVolume / totalVolume) * 100) : 0;

  const getStatus = (score: number): { emoji: string; label: string; color: string } => {
    if (score >= 7) return { emoji: '🟢', label: 'Alto', color: COLORS.primary };
    if (score >= 5) return { emoji: '🟡', label: 'Medio', color: COLORS.dark };
    if (score >= 3) return { emoji: '🟠', label: 'Bajo', color: COLORS.medium };
    return { emoji: '🔴', label: 'Crítico', color: COLORS.medium };
  };

  const getGlobalLabel = (score: number): string => {
    if (score >= 7) return 'Listo para automatización';
    if (score >= 5) return 'Potencial moderado';
    if (score >= 3) return 'Requiere optimización';
    return 'No preparado';
  };

  const formatVolume = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(2)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
    return v.toLocaleString();
  };

  const factors = [
    {
      name: 'Predictibilidad',
      score: predictabilityScore,
      weight: '30%',
      metric: `CV ${avgCV.toFixed(0)}%`,
      status: getStatus(predictabilityScore)
    },
    {
      name: 'Resolutividad',
      score: resolutionScore,
      weight: '25%',
      metric: `FCR ${avgFCR.toFixed(0)}%/Tr ${avgTransfer.toFixed(0)}%`,
      status: getStatus(resolutionScore)
    },
    {
      name: 'Volumen',
      score: volumeScore,
      weight: '25%',
      metric: `${formatVolume(totalQueueVolume)} int`,
      status: getStatus(volumeScore)
    },
    {
      name: 'Calidad Datos',
      score: dataQualityScore,
      weight: '10%',
      metric: `${dataQualityPct}% VALID`,
      status: getStatus(dataQualityScore)
    },
    {
      name: 'Simplicidad',
      score: simplicityScore,
      weight: '10%',
      metric: `AHT ${Math.round(avgAHT)}s`,
      status: getStatus(simplicityScore)
    }
  ];

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
      {/* Header */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">
          Factores del Score (Nivel Operación Global)
        </h2>
      </div>

      <div className="p-5">
        {/* Nota explicativa */}
        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: COLORS.light }}>
          <p className="text-xs" style={{ color: COLORS.dark }}>
            <span className="font-semibold">⚠️ NOTA:</span> Estos factores son promedios globales.
            El scoring por cola usa estos mismos factores calculados individualmente para cada cola.
          </p>
        </div>

        {/* Tabla de factores */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: COLORS.medium }}>
                <th className="text-left py-2 font-medium">Factor</th>
                <th className="text-right py-2 font-medium">Score</th>
                <th className="text-right py-2 font-medium">Peso</th>
                <th className="text-right py-2 font-medium">Métrica Real</th>
                <th className="text-center py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {factors.map((factor, idx) => (
                <tr key={factor.name} style={{ borderTop: `1px solid ${COLORS.light}` }}>
                  <td className="py-2 font-medium" style={{ color: COLORS.dark }}>{factor.name}</td>
                  <td className="py-2 text-right font-bold" style={{ color: factor.status.color }}>
                    {factor.score.toFixed(1)}
                  </td>
                  <td className="py-2 text-right" style={{ color: COLORS.medium }}>{factor.weight}</td>
                  <td className="py-2 text-right font-mono text-xs" style={{ color: COLORS.dark }}>{factor.metric}</td>
                  <td className="py-2 text-center">
                    <span className="text-xs">
                      {factor.status.emoji} <span style={{ color: factor.status.color }}>{factor.status.label}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${COLORS.medium}` }}>
                <td className="py-3 font-bold" style={{ color: COLORS.dark }}>SCORE GLOBAL</td>
                <td className="py-3 text-right font-bold text-lg" style={{ color: COLORS.primary }}>
                  {globalScore.toFixed(1)}
                </td>
                <td className="py-3" colSpan={2}></td>
                <td className="py-3 text-center text-xs" style={{ color: COLORS.dark }}>
                  {getGlobalLabel(globalScore)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Insight explicativo */}
        <div className="p-3 rounded-lg" style={{ backgroundColor: COLORS.light }}>
          <p className="text-xs" style={{ color: COLORS.dark }}>
            <span className="font-semibold" style={{ color: COLORS.primary }}>💡 </span>
            El score global ({globalScore.toFixed(1)}) refleja la operación completa.
            Sin embargo, <strong>{automatizablePct}%</strong> del volumen está en colas individuales
            que SÍ cumplen criterios de automatización.
          </p>
        </div>
      </div>
    </div>
  );
}

// ========== Clasificación por Skill con distribución por Tier ==========
function SkillClassificationSection({ drilldownData }: { drilldownData: DrilldownDataPoint[] }) {
  // Calcular métricas por skill
  const skillData = drilldownData.map(skill => {
    const queues = skill.originalQueues;
    const totalVolume = queues.reduce((sum, q) => sum + q.volume, 0);

    // Contar colas y volumen por tier
    const tierStats = {
      AUTOMATE: {
        count: queues.filter(q => q.tier === 'AUTOMATE').length,
        volume: queues.filter(q => q.tier === 'AUTOMATE').reduce((s, q) => s + q.volume, 0)
      },
      ASSIST: {
        count: queues.filter(q => q.tier === 'ASSIST').length,
        volume: queues.filter(q => q.tier === 'ASSIST').reduce((s, q) => s + q.volume, 0)
      },
      AUGMENT: {
        count: queues.filter(q => q.tier === 'AUGMENT').length,
        volume: queues.filter(q => q.tier === 'AUGMENT').reduce((s, q) => s + q.volume, 0)
      },
      'HUMAN-ONLY': {
        count: queues.filter(q => q.tier === 'HUMAN-ONLY').length,
        volume: queues.filter(q => q.tier === 'HUMAN-ONLY').reduce((s, q) => s + q.volume, 0)
      }
    };

    // Porcentajes por volumen
    const tierPcts = {
      AUTOMATE: totalVolume > 0 ? (tierStats.AUTOMATE.volume / totalVolume) * 100 : 0,
      ASSIST: totalVolume > 0 ? (tierStats.ASSIST.volume / totalVolume) * 100 : 0,
      AUGMENT: totalVolume > 0 ? (tierStats.AUGMENT.volume / totalVolume) * 100 : 0,
      'HUMAN-ONLY': totalVolume > 0 ? (tierStats['HUMAN-ONLY'].volume / totalVolume) * 100 : 0
    };

    // Tier dominante por volumen
    const dominantTier = Object.entries(tierPcts).reduce((max, [tier, pct]) =>
      pct > max.pct ? { tier, pct } : max
    , { tier: 'HUMAN-ONLY', pct: 0 });

    // Volumen en T1+T2
    const t1t2Pct = tierPcts.AUTOMATE + tierPcts.ASSIST;

    // Determinar acción recomendada
    let action = '';
    let isWarning = false;
    if (tierPcts.AUTOMATE >= 50) {
      action = '→ Wave 4: Bot Full';
    } else if (t1t2Pct >= 60) {
      action = '→ Wave 3: Copilot';
    } else if (tierPcts.AUGMENT >= 30) {
      action = '→ Wave 2: Tools';
    } else if (tierPcts['HUMAN-ONLY'] >= 50) {
      action = '→ Wave 1: Foundation';
      isWarning = true;
    } else {
      action = '→ Wave 2: Copilot';
    }

    return {
      skill: skill.skill,
      volume: totalVolume,
      tierStats,
      tierPcts,
      dominantTier,
      t1t2Pct,
      action,
      isWarning
    };
  }).sort((a, b) => b.volume - a.volume);

  // Identificar quick wins y alertas
  const quickWins = skillData.filter(s => s.tierPcts.AUTOMATE >= 40 || s.t1t2Pct >= 70);
  const alerts = skillData.filter(s => s.tierPcts['HUMAN-ONLY'] >= 50);

  const formatVolume = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${Math.round(v / 1000)}K`;
    return v.toLocaleString();
  };

  return (
    <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: COLORS.white, borderColor: COLORS.medium }}>
      {/* Header */}
      <div className="px-5 py-3" style={{ backgroundColor: COLORS.dark }}>
        <h2 className="font-bold text-sm" style={{ color: COLORS.white }}>
          CLASIFICACIÓN POR SKILL
        </h2>
      </div>

      <div className="p-5">
        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: COLORS.medium }}>
                <th className="text-left py-2 font-medium">Skill</th>
                <th className="text-right py-2 font-medium">Volumen</th>
                <th className="text-center py-2 font-medium" colSpan={4}>Distribución Colas por Tier</th>
                <th className="text-left py-2 font-medium pl-4">Acción</th>
              </tr>
              <tr style={{ color: COLORS.medium }} className="text-xs">
                <th></th>
                <th></th>
                <th className="text-center py-1">AUTO</th>
                <th className="text-center py-1">ASIST</th>
                <th className="text-center py-1">AUGM</th>
                <th className="text-center py-1">HUMAN</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {skillData.map((skill, idx) => (
                <tr key={skill.skill} style={{ borderTop: idx > 0 ? `1px solid ${COLORS.light}` : undefined }}>
                  {/* Skill name */}
                  <td className="py-3 font-medium" style={{ color: COLORS.dark }}>
                    {skill.skill}
                  </td>

                  {/* Volume */}
                  <td className="py-3 text-right font-bold" style={{ color: COLORS.dark }}>
                    {formatVolume(skill.volume)}
                  </td>

                  {/* Tier counts */}
                  <td className="py-3 text-center">
                    <div className="font-bold" style={{ color: skill.tierPcts.AUTOMATE >= 30 ? COLORS.primary : COLORS.medium }}>
                      {skill.tierStats.AUTOMATE.count}
                    </div>
                    <div className="text-[10px]" style={{ color: COLORS.medium }}>
                      ({Math.round(skill.tierPcts.AUTOMATE)}%)
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <div className="font-bold" style={{ color: skill.tierPcts.ASSIST >= 30 ? COLORS.dark : COLORS.medium }}>
                      {skill.tierStats.ASSIST.count}
                    </div>
                    <div className="text-[10px]" style={{ color: COLORS.medium }}>
                      ({Math.round(skill.tierPcts.ASSIST)}%)
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <div className="font-bold" style={{ color: COLORS.medium }}>
                      {skill.tierStats.AUGMENT.count}
                    </div>
                    <div className="text-[10px]" style={{ color: COLORS.medium }}>
                      ({Math.round(skill.tierPcts.AUGMENT)}%)
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <div className="font-bold" style={{ color: skill.tierPcts['HUMAN-ONLY'] >= 50 ? COLORS.dark : COLORS.medium }}>
                      {skill.tierStats['HUMAN-ONLY'].count}
                    </div>
                    <div className="text-[10px]" style={{ color: COLORS.medium }}>
                      ({Math.round(skill.tierPcts['HUMAN-ONLY'])}%)
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-3 pl-4">
                    <div className="font-medium text-xs" style={{ color: skill.isWarning ? COLORS.dark : COLORS.primary }}>
                      {skill.action}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: COLORS.medium }}>
                      {skill.tierPcts['HUMAN-ONLY'] >= 50 ? (
                        <span>Vol en T4: {Math.round(skill.tierPcts['HUMAN-ONLY'])}% ⚠️</span>
                      ) : (
                        <span>Vol en T1+T2: {Math.round(skill.t1t2Pct)}%</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Insights */}
        <div className="mt-4 pt-4 space-y-2" style={{ borderTop: `2px solid ${COLORS.light}` }}>
          {quickWins.length > 0 && (
            <p className="text-xs" style={{ color: COLORS.dark }}>
              <span style={{ color: COLORS.primary }}>🎯 Quick Wins:</span>{' '}
              {quickWins.map(s => s.skill).join(' + ')} tienen &gt;60% volumen en T1+T2
            </p>
          )}
          {alerts.length > 0 && (
            <p className="text-xs" style={{ color: COLORS.dark }}>
              <span>⚠️ Atención:</span>{' '}
              {alerts.map(s => `${s.skill} tiene ${Math.round(s.tierPcts['HUMAN-ONLY'])}% en HUMAN`).join('; ')} → priorizar en Wave 1
            </p>
          )}
          {quickWins.length === 0 && alerts.length === 0 && (
            <p className="text-xs" style={{ color: COLORS.medium }}>
              Distribución equilibrada entre tiers. Revisar colas individuales para priorización.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Skills Heatmap/Table (fallback cuando no hay drilldownData)
function SkillsReadinessTable({ heatmapData }: { heatmapData: HeatmapDataPoint[] }) {
  const sortedData = [...heatmapData].sort((a, b) => b.automation_readiness - a.automation_readiness);

  const formatVolume = (v: number) => v >= 1000 ? `${Math.round(v / 1000)}K` : v.toString();

  return (
    <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: COLORS.white, borderColor: COLORS.medium }}>
      <div className="px-5 py-3" style={{ backgroundColor: COLORS.dark }}>
        <h3 className="font-bold text-sm" style={{ color: COLORS.white }}>Análisis por Skill</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: COLORS.medium }}>
              <th className="px-4 py-2 text-left font-medium">Skill</th>
              <th className="px-4 py-2 text-right font-medium">Volumen</th>
              <th className="px-4 py-2 text-right font-medium">AHT</th>
              <th className="px-4 py-2 text-right font-medium">CV AHT</th>
              <th className="px-4 py-2 text-center font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item, idx) => (
              <tr key={item.skill} style={{ borderTop: idx > 0 ? `1px solid ${COLORS.light}` : undefined }}>
                <td className="px-4 py-3 font-medium" style={{ color: COLORS.dark }}>{item.skill}</td>
                <td className="px-4 py-3 text-right" style={{ color: COLORS.dark }}>{formatVolume(item.volume)}</td>
                <td className="px-4 py-3 text-right" style={{ color: COLORS.medium }}>{item.aht_seconds}s</td>
                <td className="px-4 py-3 text-right" style={{ color: item.variability.cv_aht > 75 ? COLORS.dark : COLORS.medium }}>
                  {item.variability.cv_aht.toFixed(0)}%
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: COLORS.light, color: COLORS.primary }}>
                    {(item.automation_readiness / 10).toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Formatear AHT en formato mm:ss
function formatAHT(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// v3.4: Fila expandible por queue_skill (muestra original_queue_id al expandir con Tiers)
function ExpandableSkillRow({
  dataPoint,
  idx,
  isExpanded,
  onToggle
}: {
  dataPoint: DrilldownDataPoint;
  idx: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // v3.4: Contar colas por Tier
  const tierCounts = {
    AUTOMATE: dataPoint.originalQueues.filter(q => q.tier === 'AUTOMATE').length,
    ASSIST: dataPoint.originalQueues.filter(q => q.tier === 'ASSIST').length,
    AUGMENT: dataPoint.originalQueues.filter(q => q.tier === 'AUGMENT').length,
    'HUMAN-ONLY': dataPoint.originalQueues.filter(q => q.tier === 'HUMAN-ONLY').length
  };

  // Tier dominante del skill (por volumen)
  const tierVolumes = {
    AUTOMATE: dataPoint.originalQueues.filter(q => q.tier === 'AUTOMATE').reduce((s, q) => s + q.volume, 0),
    ASSIST: dataPoint.originalQueues.filter(q => q.tier === 'ASSIST').reduce((s, q) => s + q.volume, 0),
    AUGMENT: dataPoint.originalQueues.filter(q => q.tier === 'AUGMENT').reduce((s, q) => s + q.volume, 0),
    'HUMAN-ONLY': dataPoint.originalQueues.filter(q => q.tier === 'HUMAN-ONLY').reduce((s, q) => s + q.volume, 0)
  };

  const dominantTier = (Object.keys(tierVolumes) as AgenticTier[]).reduce((a, b) =>
    tierVolumes[a] > tierVolumes[b] ? a : b
  );

  const potentialSavings = dataPoint.annualCost ? Math.round(dataPoint.annualCost * 0.35 / 12) : 0;
  const automateQueues = tierCounts.AUTOMATE;

  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: idx * 0.05 }}
        className={`hover:bg-emerald-50/50 cursor-pointer ${isExpanded ? 'bg-emerald-50/40 border-l-4 border-l-emerald-500' : ''}`}
        onClick={onToggle}
      >
        <td className="px-3 py-3 text-left">
          <button className="flex items-center gap-1 text-gray-400 hover:text-gray-600">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">{dataPoint.skill}</span>
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
              {dataPoint.originalQueues.length} colas
            </span>
            {/* v3.4: Mostrar tiers disponibles */}
            {automateQueues > 0 && (
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-xs rounded flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {automateQueues} AUTOMATE
              </span>
            )}
            {tierCounts.ASSIST > 0 && (
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-xs rounded">
                {tierCounts.ASSIST} ASSIST
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-3 text-sm text-gray-700 text-right font-semibold">{dataPoint.volume.toLocaleString()}</td>
        <td className="px-3 py-3 text-sm text-gray-600 text-right">{formatAHT(dataPoint.aht_mean)}</td>
        <td className="px-3 py-3 text-right">
          <span className={`text-sm font-semibold ${dataPoint.cv_aht < 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {dataPoint.cv_aht.toFixed(0)}%
          </span>
        </td>
        <td className="px-3 py-3 text-right">
          <span className="text-sm text-emerald-600 font-medium">{formatCurrency(potentialSavings)}/mes</span>
        </td>
        <td className="px-3 py-3 text-center">
          <TierBadge tier={dominantTier} />
        </td>
      </motion.tr>

      {/* Fila expandida con tabla de original_queue_id */}
      {isExpanded && (
        <motion.tr
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-emerald-50/20"
        >
          <td colSpan={7} className="p-0">
            <div className="border-l-4 border-l-emerald-300 ml-3">
              {/* Header de resumen con Tiers */}
              <div className="px-6 py-3 bg-emerald-50/50 border-b border-emerald-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-600">
                      <strong className="text-gray-800">{dataPoint.originalQueues.length}</strong> colas
                    </span>
                    <span className="text-gray-400">|</span>
                    {/* v3.4: Mostrar distribución por Tier */}
                    {tierCounts.AUTOMATE > 0 && (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <strong>{tierCounts.AUTOMATE}</strong> AUTOMATE
                      </span>
                    )}
                    {tierCounts.ASSIST > 0 && (
                      <span className="text-blue-600">
                        <strong>{tierCounts.ASSIST}</strong> ASSIST
                      </span>
                    )}
                    {tierCounts.AUGMENT > 0 && (
                      <span className="text-amber-600">
                        <strong>{tierCounts.AUGMENT}</strong> AUGMENT
                      </span>
                    )}
                    {tierCounts['HUMAN-ONLY'] > 0 && (
                      <span className="text-gray-500">
                        <strong>{tierCounts['HUMAN-ONLY']}</strong> HUMAN
                      </span>
                    )}
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-600">
                      Coste: <strong className="text-gray-800">{formatCurrency(dataPoint.annualCost || 0)}/año</strong>
                    </span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-600">
                      Ahorro: <strong className="text-emerald-600">{formatCurrency(potentialSavings * 12)}/año</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>FCR: {(dataPoint.fcr_tecnico ?? (100 - dataPoint.transfer_rate)).toFixed(0)}%</span>
                    <span className="text-gray-300">|</span>
                    <span>Transfer: {dataPoint.transfer_rate.toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* Tabla de colas (original_queue_id) con Tiers */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase tracking-wider bg-gray-50/80 border-b border-gray-200">
                      <th className="px-4 py-2 text-left font-medium">Cola (original_queue_id)</th>
                      <th className="px-3 py-2 text-right font-medium">Volumen</th>
                      <th className="px-3 py-2 text-right font-medium">AHT</th>
                      <th className="px-3 py-2 text-right font-medium">CV</th>
                      <th className="px-3 py-2 text-right font-medium">Transfer</th>
                      <th className="px-3 py-2 text-right font-medium">FCR</th>
                      <th className="px-3 py-2 text-center font-medium">Score</th>
                      <th className="px-3 py-2 text-center font-medium">Tier</th>
                      <th className="px-3 py-2 text-left font-medium">Red Flags</th>
                      <th className="px-3 py-2 text-right font-medium">Ahorro/mes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dataPoint.originalQueues.map((queue, queueIdx) => {
                      const queueMonthlySavings = queue.annualCost ? Math.round(queue.annualCost * 0.35 / 12) : 0;
                      const tierStyle = getTierStyle(queue.tier);
                      const redFlags = detectRedFlags(queue);

                      return (
                        <tr
                          key={`${queue.original_queue_id}-${queueIdx}`}
                          className={`hover:bg-white/50 ${queue.tier === 'AUTOMATE' ? 'bg-emerald-50/30' : queue.tier === 'ASSIST' ? 'bg-blue-50/20' : queue.tier === 'HUMAN-ONLY' && redFlags.length > 0 ? 'bg-red-50/20' : ''}`}
                        >
                          <td className="px-4 py-2 font-medium text-gray-800 max-w-[250px]">
                            <div className="flex items-center gap-2">
                              <span className="truncate block" title={queue.original_queue_id}>
                                {queue.original_queue_id}
                              </span>
                              {/* Mostrar motivo del tier en tooltip */}
                              {queue.tierMotivo && (
                                <InfoTooltip content={<div className="text-xs">{queue.tierMotivo}</div>}>
                                  <Info className="w-3 h-3 text-gray-400" />
                                </InfoTooltip>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-gray-700 text-right">{queue.volume.toLocaleString()}</td>
                          <td className="px-3 py-2 text-gray-600 text-right">{formatAHT(queue.aht_mean)}</td>
                          <td className="px-3 py-2 text-right">
                            <span className={`font-medium ${queue.cv_aht < 75 ? 'text-emerald-600' : queue.cv_aht < 90 ? 'text-blue-600' : queue.cv_aht > 120 ? 'text-red-600' : 'text-amber-600'}`}>
                              {queue.cv_aht.toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className={`font-medium ${queue.transfer_rate > 50 ? 'text-red-600' : queue.transfer_rate > 30 ? 'text-amber-600' : 'text-gray-600'}`}>
                              {queue.transfer_rate.toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-600 text-right">{(queue.fcr_tecnico ?? (100 - queue.transfer_rate)).toFixed(0)}%</td>
                          <td className="px-3 py-2 text-center">
                            {queue.scoreBreakdown ? (
                              <InfoTooltip content={<ScoreBreakdownTooltip breakdown={queue.scoreBreakdown} />}>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium cursor-help ${tierStyle.bg} ${tierStyle.text}`}>
                                  {queue.agenticScore.toFixed(1)}
                                </span>
                              </InfoTooltip>
                            ) : (
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${tierStyle.bg} ${tierStyle.text}`}>
                                {queue.agenticScore.toFixed(1)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <TierBadge tier={queue.tier} />
                          </td>
                          <td className="px-3 py-2">
                            {redFlags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {redFlags.map(flag => (
                                  <RedFlagBadge key={flag.config.id} flag={flag} size="sm" />
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-emerald-600 font-medium">
                            {formatCurrency(queueMonthlySavings)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Fila de totales */}
                  <tfoot>
                    <tr className="bg-emerald-50/50 font-semibold text-gray-700 border-t-2 border-emerald-200">
                      <td className="px-4 py-2">TOTAL ({dataPoint.originalQueues.length} colas)</td>
                      <td className="px-3 py-2 text-right">{dataPoint.volume.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{formatAHT(dataPoint.aht_mean)}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{dataPoint.cv_aht.toFixed(0)}%</td>
                      <td className="px-3 py-2 text-right">{dataPoint.transfer_rate.toFixed(0)}%</td>
                      <td className="px-3 py-2 text-right">{(dataPoint.fcr_tecnico ?? (100 - dataPoint.transfer_rate)).toFixed(0)}%</td>
                      <td className="px-3 py-2 text-center">
                        <span className="px-1.5 py-0.5 rounded text-xs bg-gray-200 text-gray-700">
                          {dataPoint.agenticScore.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <TierBadge tier={dominantTier} />
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-xs">—</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{formatCurrency(potentialSavings)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </td>
        </motion.tr>
      )}
    </>
  );
}

// ============================================
// v4.0: NUEVAS SECCIONES POR TIER
// ============================================

// Configuración de colores y estilos por tier
const TIER_SECTION_CONFIG: Record<AgenticTier, {
  color: string;
  bgColor: string;
  borderColor: string;
  gradientFrom: string;
  gradientTo: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  emptyMessage: string;
}> = {
  'AUTOMATE': {
    color: '#10b981',
    bgColor: '#d1fae5',
    borderColor: '#10b98140',
    gradientFrom: 'from-emerald-50',
    gradientTo: 'to-emerald-100/50',
    icon: Sparkles,
    title: 'Colas AUTOMATE',
    subtitle: 'Listas para automatización completa con agente virtual (Score ≥7.5)',
    emptyMessage: 'No hay colas clasificadas como AUTOMATE'
  },
  'ASSIST': {
    color: '#3b82f6',
    bgColor: '#dbeafe',
    borderColor: '#3b82f640',
    gradientFrom: 'from-blue-50',
    gradientTo: 'to-blue-100/50',
    icon: Bot,
    title: 'Colas ASSIST',
    subtitle: 'Candidatas a Copilot - IA asiste al agente humano (Score 5.5-7.5)',
    emptyMessage: 'No hay colas clasificadas como ASSIST'
  },
  'AUGMENT': {
    color: '#f59e0b',
    bgColor: '#fef3c7',
    borderColor: '#f59e0b40',
    gradientFrom: 'from-amber-50',
    gradientTo: 'to-amber-100/50',
    icon: TrendingUp,
    title: 'Colas AUGMENT',
    subtitle: 'Requieren optimización previa: estandarizar procesos, reducir variabilidad (Score 3.5-5.5)',
    emptyMessage: 'No hay colas clasificadas como AUGMENT'
  },
  'HUMAN-ONLY': {
    color: '#6b7280',
    bgColor: '#f3f4f6',
    borderColor: '#6b728040',
    gradientFrom: 'from-gray-50',
    gradientTo: 'to-gray-100/50',
    icon: Users,
    title: 'Colas HUMAN-ONLY',
    subtitle: 'No aptas para automatización: volumen insuficiente, datos de baja calidad o complejidad extrema',
    emptyMessage: 'No hay colas clasificadas como HUMAN-ONLY'
  }
};

// Componente de tabla de colas por Tier (AUTOMATE, ASSIST, AUGMENT)
function TierQueueSection({
  drilldownData,
  tier
}: {
  drilldownData: DrilldownDataPoint[];
  tier: 'AUTOMATE' | 'ASSIST' | 'AUGMENT';
}) {
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());
  const config = TIER_SECTION_CONFIG[tier];
  const IconComponent = config.icon;

  // Extraer todas las colas del tier específico, agrupadas por skill
  const skillsWithTierQueues = drilldownData
    .map(skill => ({
      skill: skill.skill,
      queues: skill.originalQueues.filter(q => q.tier === tier),
      totalVolume: skill.originalQueues.filter(q => q.tier === tier).reduce((s, q) => s + q.volume, 0),
      totalAnnualCost: skill.originalQueues.filter(q => q.tier === tier).reduce((s, q) => s + (q.annualCost || 0), 0)
    }))
    .filter(s => s.queues.length > 0)
    .sort((a, b) => b.totalVolume - a.totalVolume);

  const totalQueues = skillsWithTierQueues.reduce((sum, s) => sum + s.queues.length, 0);
  const totalVolume = skillsWithTierQueues.reduce((sum, s) => sum + s.totalVolume, 0);
  const totalCost = skillsWithTierQueues.reduce((sum, s) => sum + s.totalAnnualCost, 0);

  // Calcular ahorro potencial según tier
  const savingsRate = tier === 'AUTOMATE' ? 0.70 : tier === 'ASSIST' ? 0.30 : 0.15;
  const potentialSavings = Math.round(totalCost * savingsRate);

  const toggleSkill = (skill: string) => {
    const newExpanded = new Set(expandedSkills);
    if (newExpanded.has(skill)) {
      newExpanded.delete(skill);
    } else {
      newExpanded.add(skill);
    }
    setExpandedSkills(newExpanded);
  };

  if (totalQueues === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border-2 overflow-hidden shadow-sm" style={{ borderColor: config.borderColor }}>
      {/* Header */}
      <div className={`px-5 py-4 border-b bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: config.color }}>
              <IconComponent className="w-5 h-5" />
              {config.title}
            </h3>
            <p className="text-sm mt-1" style={{ color: config.color + 'cc' }}>
              {config.subtitle}
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold" style={{ color: config.color }}>{totalQueues}</span>
            <p className="text-sm" style={{ color: config.color + 'cc' }}>colas en {skillsWithTierQueues.length} skills</p>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="px-5 py-3 border-b flex items-center justify-between text-sm" style={{ backgroundColor: config.bgColor + '40' }}>
        <div className="flex gap-4 flex-wrap">
          <span className="text-gray-600">
            Volumen: <strong className="text-gray-800">{totalVolume.toLocaleString()}</strong> int/mes
          </span>
          <span className="text-gray-600">
            Coste: <strong className="text-gray-800">{formatCurrency(totalCost)}</strong>/año
          </span>
        </div>
        <span className="font-bold" style={{ color: config.color }}>
          Ahorro potencial: {formatCurrency(potentialSavings)}/año
        </span>
      </div>

      {/* Tabla por Business Unit (skill) */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-left font-medium w-8"></th>
              <th className="px-3 py-2.5 text-left font-medium">Business Unit (Skill)</th>
              <th className="px-3 py-2.5 text-center font-medium">Colas</th>
              <th className="px-3 py-2.5 text-right font-medium">Volumen</th>
              <th className="px-3 py-2.5 text-right font-medium">AHT Prom.</th>
              <th className="px-3 py-2.5 text-right font-medium">CV Prom.</th>
              <th className="px-3 py-2.5 text-right font-medium">FCR</th>
              <th className="px-3 py-2.5 text-right font-medium">Ahorro Potencial</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {skillsWithTierQueues.map((skillData, idx) => {
              const isExpanded = expandedSkills.has(skillData.skill);
              const avgAHT = skillData.queues.reduce((s, q) => s + q.aht_mean * q.volume, 0) / skillData.totalVolume;
              const avgCV = skillData.queues.reduce((s, q) => s + q.cv_aht * q.volume, 0) / skillData.totalVolume;
              const avgFCR = skillData.queues.reduce((s, q) => s + (q.fcr_tecnico ?? (100 - q.transfer_rate)) * q.volume, 0) / skillData.totalVolume;
              const skillSavings = Math.round(skillData.totalAnnualCost * savingsRate);

              return (
                <React.Fragment key={skillData.skill}>
                  {/* Fila del Skill */}
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleSkill(skillData.skill)}
                  >
                    <td className="px-3 py-3 text-center">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-medium text-gray-800">{skillData.skill}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: config.bgColor, color: config.color }}>
                        {skillData.queues.length}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-gray-700">
                      {skillData.totalVolume.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-600">
                      {formatAHT(avgAHT)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={avgCV < 75 ? 'text-emerald-600' : avgCV < 100 ? 'text-amber-600' : 'text-red-600'}>
                        {avgCV.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-gray-600">
                      {avgFCR.toFixed(0)}%
                    </td>
                    <td className="px-3 py-3 text-right font-medium" style={{ color: config.color }}>
                      {formatCurrency(skillSavings)}
                    </td>
                  </tr>

                  {/* Detalle expandible: colas individuales */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={8} className="px-0 py-0">
                        <div className="mx-4 my-2 rounded-lg border overflow-hidden" style={{ borderColor: config.borderColor, backgroundColor: config.bgColor + '20' }}>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-gray-500 uppercase tracking-wider" style={{ backgroundColor: config.bgColor + '60' }}>
                                <th className="px-4 py-2 text-left font-medium">Cola (ID)</th>
                                <th className="px-3 py-2 text-right font-medium">Volumen</th>
                                <th className="px-3 py-2 text-right font-medium">AHT</th>
                                <th className="px-3 py-2 text-right font-medium">CV</th>
                                <th className="px-3 py-2 text-right font-medium">Transfer</th>
                                <th className="px-3 py-2 text-right font-medium">FCR</th>
                                <th className="px-3 py-2 text-center font-medium">Score</th>
                                <th className="px-3 py-2 text-right font-medium">Ahorro</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {skillData.queues.map((queue, qIdx) => {
                                const queueSavings = Math.round((queue.annualCost || 0) * savingsRate);
                                return (
                                  <tr key={queue.original_queue_id} className="hover:bg-white/50">
                                    <td className="px-4 py-2 font-medium text-gray-700 truncate max-w-[200px]" title={queue.original_queue_id}>
                                      {queue.original_queue_id}
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-600">{queue.volume.toLocaleString()}</td>
                                    <td className="px-3 py-2 text-right text-gray-600">{formatAHT(queue.aht_mean)}</td>
                                    <td className="px-3 py-2 text-right">
                                      <span className={queue.cv_aht < 75 ? 'text-emerald-600' : queue.cv_aht < 100 ? 'text-amber-600' : 'text-red-600'}>
                                        {queue.cv_aht.toFixed(0)}%
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-600">{queue.transfer_rate.toFixed(0)}%</td>
                                    <td className="px-3 py-2 text-right text-gray-600">{(queue.fcr_tecnico ?? (100 - queue.transfer_rate)).toFixed(0)}%</td>
                                    <td className="px-3 py-2 text-center">
                                      <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: config.bgColor, color: config.color }}>
                                        {queue.agenticScore.toFixed(1)}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right font-medium" style={{ color: config.color }}>
                                      {formatCurrency(queueSavings)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        Click en un skill para ver el detalle de colas individuales
      </div>
    </div>
  );
}

// Componente para colas HUMAN-ONLY agrupadas por razón/red flag
function HumanOnlyByReasonSection({ drilldownData }: { drilldownData: DrilldownDataPoint[] }) {
  const [expandedReasons, setExpandedReasons] = useState<Set<string>>(new Set());
  const config = TIER_SECTION_CONFIG['HUMAN-ONLY'];

  // Extraer todas las colas HUMAN-ONLY
  const allHumanOnlyQueues = drilldownData.flatMap(skill =>
    skill.originalQueues
      .filter(q => q.tier === 'HUMAN-ONLY')
      .map(q => ({ ...q, skillName: skill.skill }))
  );

  if (allHumanOnlyQueues.length === 0) {
    return null;
  }

  // Agrupar por razón principal (red flag dominante o "Sin red flags")
  const queuesByReason: Record<string, typeof allHumanOnlyQueues> = {};

  allHumanOnlyQueues.forEach(queue => {
    const flags = detectRedFlags(queue);
    // Determinar razón principal (prioridad: cv_high > transfer_high > volume_low > valid_low)
    let reason = 'Sin Red Flags específicos';
    let reasonId = 'no_flags';

    if (flags.length > 0) {
      // Ordenar por severidad implícita
      const priorityOrder = ['cv_high', 'transfer_high', 'volume_low', 'valid_low'];
      const sortedFlags = [...flags].sort((a, b) =>
        priorityOrder.indexOf(a.config.id) - priorityOrder.indexOf(b.config.id)
      );
      reasonId = sortedFlags[0].config.id;
      reason = sortedFlags[0].config.label;
    }

    if (!queuesByReason[reasonId]) {
      queuesByReason[reasonId] = [];
    }
    queuesByReason[reasonId].push(queue);
  });

  // Convertir a array y ordenar por volumen
  const reasonGroups = Object.entries(queuesByReason)
    .map(([reasonId, queues]) => {
      const flagConfig = RED_FLAG_CONFIGS.find(c => c.id === reasonId);
      return {
        reasonId,
        reason: flagConfig?.label || 'Sin Red Flags específicos',
        description: flagConfig?.description || 'Colas que no cumplen criterios de automatización',
        action: flagConfig ? getActionForFlag(flagConfig.id) : 'Revisar manualmente',
        queues,
        totalVolume: queues.reduce((s, q) => s + q.volume, 0),
        queueCount: queues.length
      };
    })
    .sort((a, b) => b.totalVolume - a.totalVolume);

  const totalQueues = allHumanOnlyQueues.length;
  const totalVolume = allHumanOnlyQueues.reduce((s, q) => s + q.volume, 0);

  const toggleReason = (reasonId: string) => {
    const newExpanded = new Set(expandedReasons);
    if (newExpanded.has(reasonId)) {
      newExpanded.delete(reasonId);
    } else {
      newExpanded.add(reasonId);
    }
    setExpandedReasons(newExpanded);
  };

  function getActionForFlag(flagId: string): string {
    switch (flagId) {
      case 'cv_high': return 'Estandarizar procesos y scripts';
      case 'transfer_high': return 'Simplificar flujo, capacitar agentes';
      case 'volume_low': return 'Consolidar con colas similares';
      case 'valid_low': return 'Mejorar captura de datos';
      default: return 'Revisar manualmente';
    }
  }

  return (
    <div className="bg-white rounded-lg border-2 overflow-hidden shadow-sm" style={{ borderColor: config.borderColor }}>
      {/* Header */}
      <div className={`px-5 py-4 border-b bg-gradient-to-r ${config.gradientFrom} ${config.gradientTo}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: config.color }}>
              <Users className="w-5 h-5" />
              {config.title}
            </h3>
            <p className="text-sm mt-1 text-gray-600">
              {config.subtitle}
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold" style={{ color: config.color }}>{totalQueues}</span>
            <p className="text-sm text-gray-500">colas agrupadas por {reasonGroups.length} razones</p>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between text-sm">
        <span className="text-gray-600">
          Volumen total: <strong className="text-gray-800">{totalVolume.toLocaleString()}</strong> int/mes
        </span>
        <span className="text-gray-500">
          Estas colas requieren intervención antes de considerar automatización
        </span>
      </div>

      {/* Tabla agrupada por razón */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-left font-medium w-8"></th>
              <th className="px-3 py-2.5 text-left font-medium">Razón / Red Flag</th>
              <th className="px-3 py-2.5 text-center font-medium">Colas</th>
              <th className="px-3 py-2.5 text-right font-medium">Volumen</th>
              <th className="px-3 py-2.5 text-left font-medium">Acción Recomendada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reasonGroups.map((group) => {
              const isExpanded = expandedReasons.has(group.reasonId);

              return (
                <React.Fragment key={group.reasonId}>
                  {/* Fila de la razón */}
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleReason(group.reasonId)}
                  >
                    <td className="px-3 py-3 text-center">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <div>
                          <span className="font-medium text-gray-800">{group.reason}</span>
                          <p className="text-xs text-gray-500">{group.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {group.queueCount}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-gray-700">
                      {group.totalVolume.toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        {group.action}
                      </span>
                    </td>
                  </tr>

                  {/* Detalle expandible: colas de esta razón */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={5} className="px-0 py-0">
                        <div className="mx-4 my-2 rounded-lg border border-gray-200 overflow-hidden bg-gray-50/50">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-gray-500 uppercase tracking-wider bg-gray-100">
                                <th className="px-4 py-2 text-left font-medium">Cola (ID)</th>
                                <th className="px-3 py-2 text-left font-medium">Skill</th>
                                <th className="px-3 py-2 text-right font-medium">Volumen</th>
                                <th className="px-3 py-2 text-right font-medium">CV AHT</th>
                                <th className="px-3 py-2 text-right font-medium">Transfer</th>
                                <th className="px-3 py-2 text-center font-medium">Score</th>
                                <th className="px-3 py-2 text-left font-medium">Red Flags</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                              {group.queues.slice(0, 20).map((queue) => {
                                const flags = detectRedFlags(queue);
                                return (
                                  <tr key={queue.original_queue_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 font-medium text-gray-700 truncate max-w-[180px]" title={queue.original_queue_id}>
                                      {queue.original_queue_id}
                                    </td>
                                    <td className="px-3 py-2 text-gray-600 text-xs">{queue.skillName}</td>
                                    <td className="px-3 py-2 text-right text-gray-600">{queue.volume.toLocaleString()}</td>
                                    <td className="px-3 py-2 text-right">
                                      <span className={queue.cv_aht > 120 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                                        {queue.cv_aht.toFixed(0)}%
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <span className={queue.transfer_rate > 50 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                                        {queue.transfer_rate.toFixed(0)}%
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                        {queue.agenticScore.toFixed(1)}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex flex-wrap gap-1">
                                        {flags.map(flag => (
                                          <RedFlagBadge key={flag.config.id} flag={flag} size="sm" />
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {group.queues.length > 20 && (
                            <div className="px-4 py-2 text-xs text-gray-500 bg-gray-100 text-center">
                              Mostrando 20 de {group.queues.length} colas
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        Click en una razón para ver las colas afectadas. Priorizar acciones según volumen impactado.
      </div>
    </div>
  );
}

// v3.4: Sección de Candidatos Prioritarios - Por queue_skill con drill-down a original_queue_id
function PriorityCandidatesSection({ drilldownData }: { drilldownData: DrilldownDataPoint[] }) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filtrar skills que tienen al menos una cola AUTOMATE
  const candidateSkills = drilldownData.filter(d => d.isPriorityCandidate);

  // Toggle expansión de fila
  const toggleRow = (skill: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(skill)) {
      newExpanded.delete(skill);
    } else {
      newExpanded.add(skill);
    }
    setExpandedRows(newExpanded);
  };

  // Calcular totales
  const totalVolume = candidateSkills.reduce((sum, c) => sum + c.volume, 0);
  const totalCost = candidateSkills.reduce((sum, c) => sum + (c.annualCost || 0), 0);
  const potentialMonthlySavings = Math.round(totalCost * 0.35 / 12);

  // v3.4: Contar colas por Tier en todos los skills con candidatos
  const allQueuesInCandidates = candidateSkills.flatMap(s => s.originalQueues);
  const tierCounts = {
    AUTOMATE: allQueuesInCandidates.filter(q => q.tier === 'AUTOMATE').length,
    ASSIST: allQueuesInCandidates.filter(q => q.tier === 'ASSIST').length,
    AUGMENT: allQueuesInCandidates.filter(q => q.tier === 'AUGMENT').length,
    'HUMAN-ONLY': allQueuesInCandidates.filter(q => q.tier === 'HUMAN-ONLY').length
  };

  // Volumen por Tier
  const tierVolumes = {
    AUTOMATE: allQueuesInCandidates.filter(q => q.tier === 'AUTOMATE').reduce((s, q) => s + q.volume, 0),
    ASSIST: allQueuesInCandidates.filter(q => q.tier === 'ASSIST').reduce((s, q) => s + q.volume, 0),
    AUGMENT: allQueuesInCandidates.filter(q => q.tier === 'AUGMENT').reduce((s, q) => s + q.volume, 0),
    'HUMAN-ONLY': allQueuesInCandidates.filter(q => q.tier === 'HUMAN-ONLY').reduce((s, q) => s + q.volume, 0)
  };

  if (drilldownData.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border-2 border-emerald-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b bg-gradient-to-r from-emerald-50 to-emerald-100/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              CLASIFICACIÓN POR TIER DE AUTOMATIZACIÓN
            </h3>
            <p className="text-sm text-emerald-600 mt-1">
              Skills con colas clasificadas como AUTOMATE (score ≥ 7.5, CV ≤ 75%, transfer ≤ 20%)
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-emerald-700">{tierCounts.AUTOMATE}</span>
            <p className="text-sm text-emerald-600">colas AUTOMATE en {candidateSkills.length} skills</p>
          </div>
        </div>
      </div>

      {/* v3.4: Resumen por Tier */}
      <div className="px-5 py-3 bg-emerald-50/50 border-b border-emerald-100">
        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-100 rounded">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700">
                <strong>{tierCounts.AUTOMATE}</strong> AUTOMATE ({tierVolumes.AUTOMATE.toLocaleString()} int)
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 rounded">
              <Bot className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-blue-700">
                <strong>{tierCounts.ASSIST}</strong> ASSIST ({tierVolumes.ASSIST.toLocaleString()} int)
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 rounded">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-amber-700">
                <strong>{tierCounts.AUGMENT}</strong> AUGMENT ({tierVolumes.AUGMENT.toLocaleString()} int)
              </span>
            </div>
            {tierCounts['HUMAN-ONLY'] > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded">
                <Users className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-gray-600">
                  <strong>{tierCounts['HUMAN-ONLY']}</strong> HUMAN ({tierVolumes['HUMAN-ONLY'].toLocaleString()} int)
                </span>
              </div>
            )}
          </div>
          <div className="text-right">
            <span className="text-emerald-600 font-bold text-base">{formatCurrency(potentialMonthlySavings)} ahorro/mes potencial</span>
          </div>
        </div>
      </div>

      {/* Tabla por queue_skill */}
      {candidateSkills.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left font-medium w-8"></th>
                <th className="px-3 py-2.5 text-left font-medium">Queue Skill (Estratégico)</th>
                <th className="px-3 py-2.5 text-right font-medium">Volumen</th>
                <th className="px-3 py-2.5 text-right font-medium">AHT Prom.</th>
                <th className="px-3 py-2.5 text-right font-medium">CV Prom.</th>
                <th className="px-3 py-2.5 text-right font-medium">Ahorro Potencial</th>
                <th className="px-3 py-2.5 text-center font-medium">Tier Dom.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {candidateSkills.map((dataPoint, idx) => (
                <ExpandableSkillRow
                  key={dataPoint.skill}
                  dataPoint={dataPoint}
                  idx={idx}
                  isExpanded={expandedRows.has(dataPoint.skill)}
                  onToggle={() => toggleRow(dataPoint.skill)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">
          <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No se encontraron colas clasificadas como AUTOMATE</p>
          <p className="text-sm mt-1">Todas las colas requieren optimización antes de automatizar</p>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            <span className="font-medium">{candidateSkills.length}</span> de {drilldownData.length} skills
            tienen al menos una cola tier AUTOMATE
          </p>
          <p className="text-xs text-gray-400">
            Haz clic en un skill para ver las colas individuales con desglose de score
          </p>
        </div>
      </div>
    </div>
  );
}

// v3.6: Sección de Colas HUMAN-ONLY con Red Flags - Contextualizada
function HumanOnlyRedFlagsSection({ drilldownData }: { drilldownData: DrilldownDataPoint[] }) {
  const [showTable, setShowTable] = useState(false);

  // Extraer todas las colas
  const allQueues = drilldownData.flatMap(skill =>
    skill.originalQueues.map(q => ({ ...q, skillName: skill.skill }))
  );

  // Extraer todas las colas HUMAN-ONLY
  const humanOnlyQueues = allQueues.filter(q => q.tier === 'HUMAN-ONLY');

  // Colas con red flags (la mayoría de HUMAN-ONLY tendrán red flags por definición)
  const queuesWithFlags = humanOnlyQueues.map(q => ({
    queue: q,
    flags: detectRedFlags(q)
  })).filter(qf => qf.flags.length > 0);

  // Ordenar por volumen (mayor primero para priorizar)
  queuesWithFlags.sort((a, b) => b.queue.volume - a.queue.volume);

  if (queuesWithFlags.length === 0) {
    return null;
  }

  // Calcular totales
  const totalVolumeAllQueues = allQueues.reduce((sum, q) => sum + q.volume, 0);
  const totalVolumeRedFlags = queuesWithFlags.reduce((sum, qf) => sum + qf.queue.volume, 0);
  const pctVolumeRedFlags = totalVolumeAllQueues > 0 ? (totalVolumeRedFlags / totalVolumeAllQueues) * 100 : 0;

  // v4.2: Coste usando modelo CPI (consistente con Roadmap y Executive Summary)
  // IMPORTANTE: El volumen es de 11 meses, se convierte a anual: (Vol/11) × 12
  const CPI_HUMANO_RF = 2.33;  // €/interacción (coste unitario humano)
  const costeAnualRedFlags = Math.round((totalVolumeRedFlags / DATA_PERIOD_MONTHS) * 12 * CPI_HUMANO_RF);
  const costeAnualTotal = Math.round((totalVolumeAllQueues / DATA_PERIOD_MONTHS) * 12 * CPI_HUMANO_RF);
  const pctCosteRedFlags = costeAnualTotal > 0 ? (costeAnualRedFlags / costeAnualTotal) * 100 : 0;

  // Estadísticas detalladas por tipo de red flag
  const flagStats = RED_FLAG_CONFIGS.map(config => {
    const matchingQueues = queuesWithFlags.filter(qf =>
      qf.flags.some(f => f.config.id === config.id)
    );
    const queueCount = matchingQueues.length;
    const volumeAffected = matchingQueues.reduce((sum, qf) => sum + qf.queue.volume, 0);
    const pctTotal = totalVolumeAllQueues > 0 ? (volumeAffected / totalVolumeAllQueues) * 100 : 0;

    // Acción recomendada por tipo
    let action = '';
    switch (config.id) {
      case 'cv_high':
        action = 'Estandarizar procesos';
        break;
      case 'transfer_high':
        action = 'Simplificar flujo / capacitar';
        break;
      case 'volume_low':
        action = 'Consolidar con similar';
        break;
      case 'valid_low':
        action = 'Mejorar captura datos';
        break;
    }

    return {
      config,
      queueCount,
      volumeAffected,
      pctTotal,
      action
    };
  }).filter(s => s.queueCount > 0);

  // Insight contextual
  const isHighCountLowVolume = queuesWithFlags.length > 20 && pctVolumeRedFlags < 15;
  const isLowCountHighVolume = queuesWithFlags.length < 10 && pctVolumeRedFlags > 20;
  const dominantFlag = flagStats.reduce((a, b) => a.volumeAffected > b.volumeAffected ? a : b, flagStats[0]);

  // Mostrar top 15 en tabla
  const displayQueues = queuesWithFlags.slice(0, 15);

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-amber-500" />
            Skills con Red Flags
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Colas que requieren intervención antes de automatizar
          </p>
        </div>
        <Badge
          label={`${queuesWithFlags.length} colas`}
          variant="warning"
        />
      </div>

      {/* RESUMEN DE IMPACTO */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-200">
          <div className="text-2xl font-bold text-gray-800">
            {queuesWithFlags.length}
          </div>
          <div className="text-xs text-gray-500">Colas Afectadas</div>
          <div className="text-xs text-gray-400 mt-1">
            {Math.round((queuesWithFlags.length / allQueues.length) * 100)}% del total
          </div>
        </div>
        <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-200">
          <div className="text-2xl font-bold text-gray-800">
            {totalVolumeRedFlags >= 1000 ? `${(totalVolumeRedFlags/1000).toFixed(0)}K` : totalVolumeRedFlags}
          </div>
          <div className="text-xs text-gray-500">Volumen Afectado</div>
          <div className="text-xs text-gray-400 mt-1">
            {pctVolumeRedFlags.toFixed(1)}% del total
          </div>
        </div>
        <div className="text-center p-3 rounded-lg bg-amber-50 border border-amber-200">
          <div className="text-2xl font-bold text-amber-700">
            {costeAnualRedFlags >= 1000000
              ? `€${(costeAnualRedFlags / 1000000).toFixed(1)}M`
              : `€${(costeAnualRedFlags / 1000).toFixed(0)}K`}
          </div>
          <div className="text-xs text-amber-600">Coste Bloqueado/año</div>
        </div>
      </div>

      {/* INSIGHT */}
      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 mb-4">
        <div className="text-sm text-blue-800">
          <strong>Insight:</strong>{' '}
          {isHighCountLowVolume && (
            <>
              Muchas colas ({queuesWithFlags.length}) pero bajo volumen ({pctVolumeRedFlags.toFixed(1)}%).
              Prioridad: Consolidar colas similares para ganar escala.
            </>
          )}
          {isLowCountHighVolume && (
            <>
              Pocas colas ({queuesWithFlags.length}) concentran alto volumen ({pctVolumeRedFlags.toFixed(1)}%).
              Prioridad: Atacar estas colas primero para máximo impacto.
            </>
          )}
          {!isHighCountLowVolume && !isLowCountHighVolume && dominantFlag && (
            <>
              Red flag dominante: <strong>{dominantFlag.config.label}</strong> ({dominantFlag.queueCount} colas).
              Acción: {dominantFlag.action}.
            </>
          )}
        </div>
      </div>

      {/* DISTRIBUCIÓN DE RED FLAGS */}
      <div className="px-5 py-4 border-b" style={{ borderColor: COLORS.light }}>
        <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.dark }}>
          DISTRIBUCIÓN DE RED FLAGS
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider" style={{ color: COLORS.medium }}>
                <th className="px-3 py-2 text-left font-medium">Red Flag</th>
                <th className="px-3 py-2 text-right font-medium">Colas</th>
                <th className="px-3 py-2 text-right font-medium">Vol. Afectado</th>
                <th className="px-3 py-2 text-right font-medium">% Total</th>
                <th className="px-3 py-2 text-left font-medium">Acción Recomendada</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: COLORS.light }}>
              {flagStats.map(stat => (
                <tr key={stat.config.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4" style={{ color: COLORS.medium }} />
                      <span className="font-medium" style={{ color: COLORS.dark }}>{stat.config.label}</span>
                    </div>
                    <span className="text-xs" style={{ color: COLORS.medium }}>{stat.config.description}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium" style={{ color: COLORS.dark }}>
                    {stat.queueCount}
                  </td>
                  <td className="px-3 py-2.5 text-right" style={{ color: COLORS.dark }}>
                    {stat.volumeAffected.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={`font-medium ${stat.pctTotal > 10 ? 'text-red-600' : ''}`}
                      style={{ color: stat.pctTotal <= 10 ? COLORS.medium : undefined }}
                    >
                      {stat.pctTotal.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: COLORS.light, color: COLORS.dark }}>
                      {stat.action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRIORIDAD */}
      <div className="px-5 py-3 border-b flex items-start gap-3" style={{ backgroundColor: COLORS.light, borderColor: COLORS.light }}>
        <span className="text-lg">⚠️</span>
        <div className="text-sm" style={{ color: COLORS.dark }}>
          <strong>PRIORIDAD:</strong>{' '}
          {flagStats.find(s => s.config.id === 'cv_high')?.queueCount && flagStats.find(s => s.config.id === 'cv_high')!.queueCount > 0 ? (
            <>
              Resolver primero colas con <strong>CV &gt;120%</strong> — son las más impredecibles y bloquean cualquier automatización efectiva.
            </>
          ) : flagStats.find(s => s.config.id === 'transfer_high')?.queueCount && flagStats.find(s => s.config.id === 'transfer_high')!.queueCount > 0 ? (
            <>
              Priorizar colas con <strong>Transfer &gt;50%</strong> — alta dependencia de escalado indica complejidad que debe simplificarse.
            </>
          ) : flagStats.find(s => s.config.id === 'volume_low')?.queueCount && flagStats.find(s => s.config.id === 'volume_low')!.queueCount > 0 ? (
            <>
              Consolidar colas con <strong>Vol &lt;50</strong> — el bajo volumen no justifica inversión individual.
            </>
          ) : (
            <>
              Mejorar calidad de datos antes de cualquier iniciativa de automatización.
            </>
          )}
        </div>
      </div>

      {/* Botón para ver detalle de colas */}
      <div className="px-5 py-3" style={{ backgroundColor: '#fafafa' }}>
        <button
          onClick={() => setShowTable(!showTable)}
          className="text-sm flex items-center gap-2 hover:opacity-80"
          style={{ color: COLORS.primary }}
        >
          {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showTable ? 'Ocultar detalle de colas' : `Ver detalle de ${queuesWithFlags.length} colas con red flags`}
        </button>
      </div>

      {/* Tabla de colas con Red Flags (colapsable) */}
      {showTable && (
        <div className="border-t overflow-x-auto" style={{ borderColor: COLORS.light }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider" style={{ backgroundColor: COLORS.light, color: COLORS.medium }}>
                <th className="px-3 py-2.5 text-left font-medium">Cola</th>
                <th className="px-3 py-2.5 text-left font-medium">Skill</th>
                <th className="px-3 py-2.5 text-right font-medium">Volumen</th>
                <th className="px-3 py-2.5 text-right font-medium">CV AHT</th>
                <th className="px-3 py-2.5 text-right font-medium">Transfer</th>
                <th className="px-3 py-2.5 text-left font-medium">Red Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: COLORS.light }}>
              {displayQueues.map((qf, idx) => (
                <motion.tr
                  key={`${qf.queue.original_queue_id}-${idx}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-3 py-2.5 font-medium max-w-[200px]" style={{ color: COLORS.dark }}>
                    <span className="truncate block" title={qf.queue.original_queue_id}>
                      {qf.queue.original_queue_id}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs max-w-[150px]" style={{ color: COLORS.medium }}>
                    <span className="truncate block" title={(qf.queue as any).skillName}>
                      {(qf.queue as any).skillName}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right" style={{ color: COLORS.dark }}>
                    {qf.queue.volume.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`font-medium ${qf.queue.cv_aht > 120 ? 'text-red-600' : ''}`} style={{ color: qf.queue.cv_aht <= 120 ? COLORS.dark : undefined }}>
                      {qf.queue.cv_aht.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`font-medium ${qf.queue.transfer_rate > 50 ? 'text-red-600' : ''}`} style={{ color: qf.queue.transfer_rate <= 50 ? COLORS.dark : undefined }}>
                      {qf.queue.transfer_rate.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {qf.flags.map(flag => (
                        <RedFlagBadge key={flag.config.id} flag={flag} size="sm" />
                      ))}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {queuesWithFlags.length > 15 && (
            <div className="px-5 py-2 text-xs text-center" style={{ backgroundColor: COLORS.light, color: COLORS.medium }}>
              Mostrando top 15 de {queuesWithFlags.length} colas (ordenadas por volumen)
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// v3.11: Umbrales para highlighting de métricas
const METRIC_THRESHOLDS = {
  fcr: { critical: 50, warning: 60, good: 70, benchmark: 68 },
  cv_aht: { critical: 100, warning: 75, good: 60 },
  transfer: { critical: 25, warning: 15, good: 10, benchmark: 12 }
};

// v3.11: Evaluar métrica y devolver estilo + mensaje
function getMetricStatus(value: number, metric: 'fcr' | 'cv_aht' | 'transfer'): {
  className: string;
  isCritical: boolean;
  message: string;
} {
  const thresholds = METRIC_THRESHOLDS[metric];

  if (metric === 'fcr') {
    // Mayor es mejor
    if (value < thresholds.critical) {
      return {
        className: 'text-red-600 font-bold',
        isCritical: true,
        message: `FCR ${value.toFixed(0)}% muy por debajo del benchmark (${thresholds.benchmark}%)`
      };
    }
    if (value < thresholds.warning) {
      return { className: 'text-amber-600 font-medium', isCritical: false, message: '' };
    }
    return { className: 'text-emerald-600', isCritical: false, message: '' };
  }

  // Para CV y Transfer, menor es mejor
  if (value > thresholds.critical) {
    return {
      className: 'text-red-600 font-bold',
      isCritical: true,
      message: metric === 'cv_aht'
        ? `CV ${value.toFixed(0)}% indica proceso muy inestable/impredecible`
        : `Transfer ${value.toFixed(0)}% muy alto — revisar routing y capacitación`
    };
  }
  if (value > thresholds.warning) {
    return { className: 'text-amber-600 font-medium', isCritical: false, message: '' };
  }
  return { className: 'text-gray-600', isCritical: false, message: '' };
}

// v3.11: Componente para métricas con highlighting condicional
function MetricCell({
  value,
  metric,
  suffix = '%'
}: {
  value: number;
  metric: 'fcr' | 'cv_aht' | 'transfer';
  suffix?: string;
}) {
  const status = getMetricStatus(value, metric);

  return (
    <td className="px-3 py-2 text-right">
      <span className={`inline-flex items-center gap-1 ${status.className}`}>
        {value.toFixed(0)}{suffix}
        {status.isCritical && (
          <AlertTriangle
            className="w-3 h-3"
            title={status.message}
          />
        )}
      </span>
    </td>
  );
}

// v3.4: Sección secundaria de Skills sin colas AUTOMATE (requieren optimización)
function SkillsToOptimizeSection({ drilldownData }: { drilldownData: DrilldownDataPoint[] }) {
  const [showAll, setShowAll] = useState(false);

  // Filtrar skills sin colas AUTOMATE
  const skillsToOptimize = drilldownData.filter(d => !d.isPriorityCandidate);

  if (skillsToOptimize.length === 0) {
    return null;
  }

  // Mostrar top 20 o todos
  const displaySkills = showAll ? skillsToOptimize : skillsToOptimize.slice(0, 20);

  // Calcular totales
  const totalVolume = skillsToOptimize.reduce((sum, s) => sum + s.volume, 0);
  const totalCost = skillsToOptimize.reduce((sum, s) => sum + (s.annualCost || 0), 0);

  // v3.4: Contar colas por Tier en skills a optimizar
  const allQueuesInOptimize = skillsToOptimize.flatMap(s => s.originalQueues);
  const tierCounts = {
    ASSIST: allQueuesInOptimize.filter(q => q.tier === 'ASSIST').length,
    AUGMENT: allQueuesInOptimize.filter(q => q.tier === 'AUGMENT').length,
    'HUMAN-ONLY': allQueuesInOptimize.filter(q => q.tier === 'HUMAN-ONLY').length
  };

  return (
    <div className="bg-white rounded-lg border border-amber-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b bg-gradient-to-r from-amber-50 to-amber-100/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-amber-800 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Skills sin colas AUTOMATE
            </h3>
            <p className="text-xs text-amber-600 mt-0.5">
              Procesos tier ASSIST/AUGMENT/HUMAN — requieren optimización antes de automatizar
            </p>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold text-amber-700">{skillsToOptimize.length}</span>
            <p className="text-xs text-amber-600">skills</p>
          </div>
        </div>
      </div>

      {/* v3.4: Resumen por Tier */}
      <div className="px-5 py-2 bg-amber-50/30 border-b border-amber-100 text-xs">
        <div className="flex gap-4 flex-wrap items-center">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 rounded">
            <Bot className="w-3 h-3 text-blue-600" />
            <span className="text-blue-700"><strong>{tierCounts.ASSIST}</strong> ASSIST</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 rounded">
            <TrendingUp className="w-3 h-3 text-amber-600" />
            <span className="text-amber-700"><strong>{tierCounts.AUGMENT}</strong> AUGMENT</span>
          </div>
          {tierCounts['HUMAN-ONLY'] > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 rounded">
              <Users className="w-3 h-3 text-gray-500" />
              <span className="text-gray-600"><strong>{tierCounts['HUMAN-ONLY']}</strong> HUMAN</span>
            </div>
          )}
          <span className="text-gray-400 mx-2">|</span>
          <span className="text-gray-600">
            Volumen: <strong>{totalVolume.toLocaleString()}</strong>
          </span>
          <span className="text-gray-600">
            Coste: <strong>{formatCurrency(totalCost)}</strong>
          </span>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider bg-gray-50">
              <th className="px-3 py-2 text-left font-medium">Queue Skill</th>
              <th className="px-3 py-2 text-center font-medium">Colas</th>
              <th className="px-3 py-2 text-right font-medium">Volumen</th>
              <th className="px-3 py-2 text-right font-medium">AHT</th>
              <th className="px-3 py-2 text-right font-medium">CV AHT</th>
              <th className="px-3 py-2 text-right font-medium">Transfer</th>
              <th className="px-3 py-2 text-right font-medium">FCR</th>
              <th className="px-3 py-2 text-center font-medium">Tier Dom.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displaySkills.map((item, idx) => {
              // v3.4: Calcular tier dominante del skill
              const skillTierVolumes = {
                ASSIST: item.originalQueues.filter(q => q.tier === 'ASSIST').reduce((s, q) => s + q.volume, 0),
                AUGMENT: item.originalQueues.filter(q => q.tier === 'AUGMENT').reduce((s, q) => s + q.volume, 0),
                'HUMAN-ONLY': item.originalQueues.filter(q => q.tier === 'HUMAN-ONLY').reduce((s, q) => s + q.volume, 0)
              };
              const dominantTier = (Object.keys(skillTierVolumes) as ('ASSIST' | 'AUGMENT' | 'HUMAN-ONLY')[])
                .reduce((a, b) => skillTierVolumes[a] > skillTierVolumes[b] ? a : b) as AgenticTier;

              return (
                <tr key={`${item.skill}-${idx}`} className="hover:bg-amber-50/30">
                  <td className="px-3 py-2 font-medium text-gray-800 max-w-[200px] truncate" title={item.skill}>
                    {item.skill}
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-center text-xs">
                    {item.originalQueues.length}
                  </td>
                  <td className="px-3 py-2 text-gray-600 text-right">{item.volume.toLocaleString()}</td>
                  <td className="px-3 py-2 text-gray-600 text-right">{formatAHT(item.aht_mean)}</td>
                  <MetricCell value={item.cv_aht} metric="cv_aht" />
                  <MetricCell value={item.transfer_rate} metric="transfer" />
                  <MetricCell value={item.fcr_tecnico ?? (100 - item.transfer_rate)} metric="fcr" />
                  <td className="px-3 py-2 text-center">
                    <TierBadge tier={dominantTier} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {skillsToOptimize.length > 20 && (
        <div className="px-5 py-2 bg-gray-50 border-t border-gray-200">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-[#6D84E3] hover:underline flex items-center gap-1"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-3 h-3" /> Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" /> Ver todos ({skillsToOptimize.length})
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// v3.6: Sección de conexión con Roadmap
function RoadmapConnectionSection({ drilldownData }: { drilldownData: DrilldownDataPoint[] }) {
  // Extraer todas las colas
  const allQueues = drilldownData.flatMap(skill =>
    skill.originalQueues.map(q => ({ ...q, skillName: skill.skill }))
  );

  const totalVolume = allQueues.reduce((sum, q) => sum + q.volume, 0);

  // AUTOMATE queues (Quick Wins)
  const automateQueues = allQueues.filter(q => q.tier === 'AUTOMATE');
  const automateVolume = automateQueues.reduce((sum, q) => sum + q.volume, 0);

  // ASSIST queues (Wave 1 target)
  const assistQueues = allQueues.filter(q => q.tier === 'ASSIST');
  const assistVolume = assistQueues.reduce((sum, q) => sum + q.volume, 0);
  const assistPct = totalVolume > 0 ? (assistVolume / totalVolume) * 100 : 0;

  // HUMAN-ONLY queues with high transfer (Wave 1 focus)
  const humanOnlyHighTransfer = allQueues.filter(q =>
    q.tier === 'HUMAN-ONLY' && q.transfer_rate > 50
  );

  // v4.2: Cálculo de ahorros alineado con modelo TCO del Roadmap
  // Fórmula: (Vol/11) × 12 × Rate × (CPI_humano - CPI_target)
  // IMPORTANTE: El volumen es de 11 meses, se convierte a anual
  const CPI_HUMANO = 2.33;
  const CPI_BOT = 0.15;
  const CPI_ASSIST_TARGET = 1.50;
  const RATE_AUTOMATE = 0.70;  // 70% contención
  const RATE_ASSIST = 0.30;    // 30% deflection

  // Quick Wins (AUTOMATE): 70% de interacciones pueden ser atendidas por bot
  const annualSavingsAutomate = Math.round((automateVolume / DATA_PERIOD_MONTHS) * 12 * RATE_AUTOMATE * (CPI_HUMANO - CPI_BOT));
  const monthlySavingsAutomate = Math.round(annualSavingsAutomate / 12);

  // Potential savings from ASSIST (si implementan Copilot): 30% deflection
  const potentialAnnualAssist = Math.round((assistVolume / DATA_PERIOD_MONTHS) * 12 * RATE_ASSIST * (CPI_HUMANO - CPI_ASSIST_TARGET));

  // Get top skills with AUTOMATE queues
  const skillsWithAutomate = drilldownData
    .filter(skill => skill.originalQueues.some(q => q.tier === 'AUTOMATE'))
    .map(skill => skill.skill)
    .slice(0, 3);

  // Get top skills needing Wave 1 (high HUMAN-ONLY %)
  const skillsNeedingWave1 = drilldownData
    .map(skill => {
      const humanVolume = skill.originalQueues
        .filter(q => q.tier === 'HUMAN-ONLY')
        .reduce((s, q) => s + q.volume, 0);
      const skillVolume = skill.originalQueues.reduce((s, q) => s + q.volume, 0);
      const humanPct = skillVolume > 0 ? (humanVolume / skillVolume) * 100 : 0;
      return { skill: skill.skill, humanPct };
    })
    .filter(s => s.humanPct > 50)
    .sort((a, b) => b.humanPct - a.humanPct)
    .slice(0, 2);

  // Don't render if no data
  if (automateQueues.length === 0 && assistQueues.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden shadow-sm" style={{ borderColor: COLORS.medium }}>
      {/* Header */}
      <div className="px-5 py-4 border-b" style={{ backgroundColor: COLORS.primary, borderColor: COLORS.primary }}>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <ChevronRight className="w-5 h-5" />
          PRÓXIMOS PASOS → ROADMAP
        </h3>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-sm font-medium" style={{ color: COLORS.dark }}>
          BASADO EN ESTE ANÁLISIS:
        </p>

        {/* Quick Wins */}
        {automateQueues.length > 0 && (
          <div className="rounded-lg p-4 border" style={{ backgroundColor: '#f0fdf4', borderColor: '#86efac' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">✅</span>
              <span className="font-bold text-emerald-800">QUICK WINS INMEDIATOS (sin Wave 1)</span>
            </div>
            <div className="space-y-1 text-sm text-emerald-700">
              <p>
                <strong>{automateQueues.length} colas AUTOMATE</strong> con{' '}
                <strong>{(automateVolume / 1000).toFixed(0)}K interacciones/mes</strong>
              </p>
              <p
                className="cursor-help"
                title={`Cálculo: ${automateVolume.toLocaleString()} int × 12 meses × 70% contención × €2.18/int = €${(annualSavingsAutomate / 1000000).toFixed(1)}M`}
              >
                Ahorro potencial: <strong className="text-emerald-800">€{(annualSavingsAutomate / 1000000).toFixed(1)}M/año</strong>
                <span className="text-emerald-600 ml-1 text-xs">(70% contención × €2.18/int)</span>
              </p>
              {skillsWithAutomate.length > 0 && (
                <p>
                  Skills: <strong>{skillsWithAutomate.join(', ')}</strong>
                </p>
              )}
              <p className="pt-1 text-emerald-600 italic text-xs">
                → Alineado con Wave 4 del Roadmap. Pueden implementarse en paralelo a Wave 1.
              </p>
            </div>
          </div>
        )}

        {/* Wave 1: Foundation */}
        {assistQueues.length > 0 && (
          <div className="rounded-lg p-4 border" style={{ backgroundColor: COLORS.light, borderColor: COLORS.medium }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🔧</span>
              <span className="font-bold" style={{ color: COLORS.dark }}>
                WAVE 1-3: FOUNDATION → ASSIST ({assistQueues.length} colas)
              </span>
            </div>
            <div className="space-y-1 text-sm" style={{ color: COLORS.dark }}>
              <p>
                <strong>{(assistVolume / 1000).toFixed(0)}K interacciones/mes</strong> en tier ASSIST
              </p>
              {skillsNeedingWave1.length > 0 && (
                <p>
                  <strong>Foco Wave 1:</strong> Reducir transfer en{' '}
                  <strong>{skillsNeedingWave1.map(s => s.skill).join(' & ')}</strong>{' '}
                  ({Math.round(skillsNeedingWave1[0]?.humanPct || 0)}% HUMAN)
                </p>
              )}
              <p
                className="cursor-help"
                title={`Cálculo: ${assistVolume.toLocaleString()} int × 12 meses × 30% deflection × €0.83/int`}
              >
                <strong>Potencial con Copilot:</strong>{' '}
                <strong style={{ color: COLORS.primary }}>
                  €{potentialAnnualAssist >= 1000000
                    ? `${(potentialAnnualAssist / 1000000).toFixed(1)}M`
                    : `${(potentialAnnualAssist / 1000).toFixed(0)}K`
                  }/año
                </strong>
                <span className="ml-1 text-xs" style={{ color: COLORS.medium }}>(30% deflection × €0.83/int)</span>
              </p>
              <p className="pt-1 italic text-xs" style={{ color: COLORS.medium }}>
                → Requiere Wave 1 (Foundation) para habilitar Copilot en Wave 3
              </p>
            </div>
          </div>
        )}

        {/* Link to Roadmap */}
        <div className="flex items-center gap-2 pt-2">
          <span className="text-lg">👉</span>
          <span className="text-sm font-medium" style={{ color: COLORS.primary }}>
            Ver pestaña Roadmap para plan detallado
          </span>
        </div>
      </div>
    </div>
  );
}

export function AgenticReadinessTab({ data, onTabChange }: AgenticReadinessTabProps) {
  // Debug: Log drilldown data status
  console.log('🔍 AgenticReadinessTab - drilldownData:', {
    exists: !!data.drilldownData,
    length: data.drilldownData?.length || 0,
    sample: data.drilldownData?.slice(0, 2)
  });

  // Calculate factors from real data (para mostrar detalle de dimensiones)
  const factors = calculateFactorsFromData(data.heatmapData);

  // v3.4: Extraer todas las colas (original_queue_id) de drilldownData
  const allQueues = data.drilldownData?.flatMap(skill => skill.originalQueues) || [];
  const totalQueues = allQueues.length;

  // v3.4: Calcular conteos y volúmenes por Tier
  const tierData = {
    AUTOMATE: {
      count: allQueues.filter(q => q.tier === 'AUTOMATE').length,
      volume: allQueues.filter(q => q.tier === 'AUTOMATE').reduce((s, q) => s + q.volume, 0)
    },
    ASSIST: {
      count: allQueues.filter(q => q.tier === 'ASSIST').length,
      volume: allQueues.filter(q => q.tier === 'ASSIST').reduce((s, q) => s + q.volume, 0)
    },
    AUGMENT: {
      count: allQueues.filter(q => q.tier === 'AUGMENT').length,
      volume: allQueues.filter(q => q.tier === 'AUGMENT').reduce((s, q) => s + q.volume, 0)
    },
    'HUMAN-ONLY': {
      count: allQueues.filter(q => q.tier === 'HUMAN-ONLY').length,
      volume: allQueues.filter(q => q.tier === 'HUMAN-ONLY').reduce((s, q) => s + q.volume, 0)
    }
  };

  // v3.4: Agentic Readiness Score = Volumen en colas AUTOMATE / Volumen Total
  const totalVolume = allQueues.reduce((sum, q) => sum + q.volume, 0);
  const automatizableVolume = tierData.AUTOMATE.volume;
  const agenticReadinessPercent = totalVolume > 0
    ? (automatizableVolume / totalVolume) * 100
    : 0;

  // Count skills (queue_skill level)
  const totalSkills = data.drilldownData?.length || data.heatmapData.length;

  return (
    <div className="space-y-6">
      {/* SECCIÓN 0: Introducción Metodológica (colapsable) */}
      <AgenticMethodologyIntro
        tierData={tierData}
        totalVolume={totalVolume}
        totalQueues={totalQueues}
      />

      {/* SECCIÓN 1: Cabecera Agentic Readiness Score - Visión Global */}
      <AgenticReadinessHeader
        tierData={tierData}
        totalVolume={totalVolume}
        totalQueues={totalQueues}
      />

      {/* SECCIÓN 2-5: Desglose por Colas en 4 Tablas por Tier */}
      {data.drilldownData && data.drilldownData.length > 0 ? (
        <>
          {/* TABLA 1: Colas AUTOMATE - Listas para automatización */}
          <TierQueueSection drilldownData={data.drilldownData} tier="AUTOMATE" />

          {/* TABLA 2: Colas ASSIST - Candidatas a Copilot */}
          <TierQueueSection drilldownData={data.drilldownData} tier="ASSIST" />

          {/* TABLA 3: Colas AUGMENT - Requieren optimización */}
          <TierQueueSection drilldownData={data.drilldownData} tier="AUGMENT" />

          {/* TABLA 4: Colas HUMAN-ONLY - Agrupadas por razón/red flag */}
          <HumanOnlyByReasonSection drilldownData={data.drilldownData} />
        </>
      ) : (
        /* Fallback a tabla por Línea de Negocio si no hay drilldown data */
        <SkillsReadinessTable heatmapData={data.heatmapData} />
      )}

      {/* Link al Roadmap */}
      {onTabChange && (
        <div className="text-center pt-4">
          <button
            onClick={() => onTabChange('roadmap')}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Ver pestaña Roadmap para plan detallado →
          </button>
        </div>
      )}
    </div>
  );
}

export default AgenticReadinessTab;
