import React from 'react';
import { motion } from 'framer-motion';
import {
  Clock, DollarSign, TrendingUp, AlertTriangle, CheckCircle,
  ArrowRight, Info, Users, Target, Zap, Shield,
  ChevronDown, ChevronUp, BookOpen, Bot, Settings, Rocket, AlertCircle
} from 'lucide-react';
import { RoadmapPhase } from '../../types';
import type { AnalysisData, RoadmapInitiative, HeatmapDataPoint, DrilldownDataPoint, OriginalQueueMetrics, AgenticTier } from '../../types';
import {
  Card,
  Badge,
  SectionHeader,
  DistributionBar,
  Stat,
  Collapsible,
} from '../ui';
import {
  cn,
  COLORS,
  STATUS_CLASSES,
  getStatusFromScore,
  formatCurrency,
  formatNumber,
  formatPercent,
} from '../../config/designSystem';

interface RoadmapTabProps {
  data: AnalysisData;
}

// ========== TIPOS PARA ROADMAP HONESTO ==========

interface WaveData {
  id: string;
  nombre: string;
  titulo: string;
  trimestre: string;
  tipo: 'consulting' | 'beyond' | 'beyond_consulting';
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  inversionSetup: number;
  costoRecurrenteAnual: number;
  ahorroAnual: number;
  esCondicional: boolean;
  condicion?: string;
  porQueNecesario: string;
  skills: string[];
  iniciativas: {
    nombre: string;
    setup: number;
    recurrente: number;
    kpi: string;
  }[];
  criteriosExito: string[];
  riesgo: 'bajo' | 'medio' | 'alto';
  riesgoDescripcion: string;
  proveedor: string;
}

// v3.9: Información detallada de Payback
interface PaybackInfo {
  meses: number;                 // Meses totales hasta recuperar inversión
  mesesImplementacion: number;   // Meses de implementación antes de ahorro
  mesesRecuperacion: number;     // Meses para recuperar después de implementar
  texto: string;                 // Texto formateado para display
  clase: string;                 // Clase CSS para color
  esRecuperable: boolean;        // True si hay payback finito
  tooltip: string;               // Explicación del cálculo
}

interface EscenarioData {
  id: string;
  nombre: string;
  descripcion: string;
  waves: string[];
  inversionTotal: number;
  costoRecurrenteAnual: number;
  ahorroAnual: number;
  ahorroAjustado: number;        // v3.7: Ahorro ajustado por riesgo
  margenAnual: number;
  paybackMeses: number;          // Mantener para compatibilidad
  paybackInfo: PaybackInfo;      // v3.9: Info detallada de payback
  roi3Anos: number;
  roi3AnosAjustado: number;      // v3.7: ROI ajustado por riesgo
  riesgo: 'bajo' | 'medio' | 'alto';
  recomendacion: string;
  esRecomendado: boolean;
  esRentable: boolean;           // v3.7: Flag de rentabilidad
  // v3.8: Waves habilitadoras
  esHabilitador: boolean;        // True si es principalmente habilitador
  potencialHabilitado: number;   // Ahorro de waves posteriores que habilita
  wavesHabilitadas: string[];    // Nombres de waves que habilita
  incluyeQuickWin: boolean;      // v3.9: True si incluye Wave 4 (Quick Wins)
}

/**
 * v3.8: Detecta si un escenario es principalmente habilitador
 * Un escenario es habilitador si:
 * 1. margen_anual <= 0
 * 2. margen_anual < (inversion × 0.20) - Recupera menos del 20% al año
 * 3. Solo incluye waves habilitadoras (Wave 1 Foundation siempre lo es)
 */
const isEnablingScenario = (
  margenAnual: number,
  inversionTotal: number,
  waves: string[]
): boolean => {
  // Condición 1: Margen negativo o cero
  if (margenAnual <= 0) return true;

  // Condición 2: Recupera menos del 20% del setup al año
  if (margenAnual < inversionTotal * 0.20) return true;

  // Condición 3: Solo incluye Wave 1-2 (habilitadoras por definición)
  const onlyEnablingWaves = waves.every(w => w === 'wave1' || w === 'wave2');
  if (onlyEnablingWaves && margenAnual < inversionTotal * 0.30) return true;

  return false;
};

// ========== FÓRMULAS DE CÁLCULO v3.7 ==========

// Factores de éxito por wave (probabilidad de alcanzar ahorro proyectado)
const RISK_FACTORS = {
  wave1: 0.90,  // Foundation: bajo riesgo de ejecución
  wave2: 0.75,  // Augment: riesgo medio
  wave3: 0.60,  // Assist: riesgo medio-alto, depende de adopción
  wave4: 0.50   // Automate: riesgo alto, depende de tecnología
};

// v3.9: Tiempos de implementación por tipo de wave (en meses)
const WAVE_IMPLEMENTATION_TIME: Record<string, number> = {
  wave1: 6,   // FOUNDATION: Q1-Q2 = 6 meses
  wave2: 3,   // AUGMENT: Q3 = 3 meses
  wave3: 3,   // ASSIST: Q4 = 3 meses
  wave4: 6    // AUTOMATE: Q1-Q2 año siguiente = 6 meses
};

/**
 * v3.9: Calcula meses hasta que comienza el ahorro
 * El ahorro empieza cuando las waves productivas (3-4) comienzan a dar resultados
 */
const calcularMesesImplementacion = (waves: string[], incluyeQuickWin: boolean): number => {
  // Si incluye Quick Win (Wave 4 AUTOMATE), el ahorro puede empezar antes
  if (incluyeQuickWin && waves.includes('wave4')) {
    // Quick Wins empiezan a dar ahorro en ~3 meses (piloto)
    return 3;
  }

  // Calcular tiempo acumulado hasta que la última wave productiva da resultados
  // Wave 1 y 2 son principalmente habilitadoras (poco ahorro directo)
  // Wave 3 y 4 son las que generan ahorro real

  const ultimaWaveProductiva = waves.includes('wave4') ? 'wave4' :
                               waves.includes('wave3') ? 'wave3' :
                               waves.includes('wave2') ? 'wave2' : 'wave1';

  let tiempoAcumulado = 0;

  // Sumar tiempos de waves previas
  for (const wave of ['wave1', 'wave2', 'wave3', 'wave4']) {
    if (wave === ultimaWaveProductiva) {
      // Añadir la mitad del tiempo de la última wave (cuando empieza a dar resultados)
      tiempoAcumulado += Math.ceil(WAVE_IMPLEMENTATION_TIME[wave] / 2);
      break;
    }
    if (waves.includes(wave)) {
      tiempoAcumulado += WAVE_IMPLEMENTATION_TIME[wave];
    }
  }

  return tiempoAcumulado;
};

/**
 * v3.9: Calcula payback completo considerando tiempo de implementación
 */
const calcularPaybackCompleto = (
  inversion: number,
  margenAnual: number,
  ahorroAnual: number,
  waves: string[],
  esHabilitador: boolean,
  incluyeQuickWin: boolean
): PaybackInfo => {
  // 1. Caso especial: escenario habilitador con poco ahorro directo
  if (esHabilitador || ahorroAnual < inversion * 0.1) {
    return {
      meses: -1,
      mesesImplementacion: calcularMesesImplementacion(waves, incluyeQuickWin),
      mesesRecuperacion: -1,
      texto: 'Ver Wave 3-4',
      clase: 'text-blue-600',
      esRecuperable: false,
      tooltip: 'Esta inversión se recupera con las waves de automatización (W3-W4). ' +
               'El payback se calcula sobre el roadmap completo, no sobre waves habilitadoras aisladas.'
    };
  }

  // 2. Calcular margen mensual neto
  const margenMensual = margenAnual / 12;

  // 3. Si margen negativo o cero, no hay payback
  if (margenMensual <= 0) {
    return {
      meses: -1,
      mesesImplementacion: 0,
      mesesRecuperacion: -1,
      texto: 'No recuperable',
      clase: 'text-red-600',
      esRecuperable: false,
      tooltip: 'El ahorro anual no supera los costes recurrentes. ' +
               `Margen neto: ${formatCurrency(margenAnual)}/año`
    };
  }

  // 4. Calcular tiempo hasta que comienza el ahorro
  const mesesImplementacion = calcularMesesImplementacion(waves, incluyeQuickWin);

  // 5. Calcular meses para recuperar la inversión (después de implementación)
  const mesesRecuperacion = Math.ceil(inversion / margenMensual);

  // 6. Payback total = implementación + recuperación
  const paybackTotal = mesesImplementacion + mesesRecuperacion;

  // 7. Formatear resultado según duración
  return formatearPaybackResult(paybackTotal, mesesImplementacion, mesesRecuperacion, margenMensual, inversion);
};

/**
 * v3.9: Formatea el resultado del payback
 */
const formatearPaybackResult = (
  meses: number,
  mesesImpl: number,
  mesesRec: number,
  margenMensual: number,
  inversion: number
): PaybackInfo => {
  const tooltipBase = `Implementación: ${mesesImpl} meses → Recuperación: ${mesesRec} meses. ` +
                     `Margen: ${formatCurrency(margenMensual * 12)}/año.`;

  if (meses <= 0) {
    return {
      meses: 0,
      mesesImplementacion: mesesImpl,
      mesesRecuperacion: mesesRec,
      texto: 'Inmediato',
      clase: 'text-emerald-600',
      esRecuperable: true,
      tooltip: tooltipBase
    };
  }

  if (meses <= 12) {
    return {
      meses,
      mesesImplementacion: mesesImpl,
      mesesRecuperacion: mesesRec,
      texto: `${meses} meses`,
      clase: 'text-emerald-600',
      esRecuperable: true,
      tooltip: tooltipBase
    };
  }

  if (meses <= 18) {
    return {
      meses,
      mesesImplementacion: mesesImpl,
      mesesRecuperacion: mesesRec,
      texto: `${meses} meses`,
      clase: 'text-yellow-600',
      esRecuperable: true,
      tooltip: tooltipBase
    };
  }

  if (meses <= 24) {
    return {
      meses,
      mesesImplementacion: mesesImpl,
      mesesRecuperacion: mesesRec,
      texto: `${meses} meses`,
      clase: 'text-amber-600',
      esRecuperable: true,
      tooltip: tooltipBase + ' ⚠️ Periodo de recuperación moderado.'
    };
  }

  // > 24 meses: mostrar en años
  const anos = Math.round(meses / 12 * 10) / 10;
  return {
    meses,
    mesesImplementacion: mesesImpl,
    mesesRecuperacion: mesesRec,
    texto: `${anos} años`,
    clase: 'text-orange-600',
    esRecuperable: true,
    tooltip: tooltipBase + ' ⚠️ Periodo de recuperación largo. Considerar escenario menos ambicioso.'
  };
};

/**
 * Calcula payback simple (mantener para compatibilidad)
 */
const calculatePayback = (inversion: number, margenAnual: number): number => {
  if (inversion <= 0) return 0;
  if (margenAnual <= 0) return -1;
  return Math.ceil(inversion / (margenAnual / 12));
};

/**
 * Calcula ROI a 3 años con fórmula correcta
 * Fórmula: ROI = ((ahorro_total_3a - coste_total_3a) / coste_total_3a) × 100
 * Donde: coste_total_3a = inversion + (recurrente × 3)
 */
const calculateROI3Years = (
  inversion: number,
  recurrenteAnual: number,
  ahorroAnual: number
): number => {
  const costeTotalTresAnos = inversion + (recurrenteAnual * 3);
  if (costeTotalTresAnos <= 0) return 0;

  const ahorroTotalTresAnos = ahorroAnual * 3;
  const roi = ((ahorroTotalTresAnos - costeTotalTresAnos) / costeTotalTresAnos) * 100;

  // Devolver con 1 decimal
  return Math.round(roi * 10) / 10;
};

/**
 * Calcula ahorro ajustado por riesgo por wave
 */
const calculateRiskAdjustedSavings = (
  wave2Savings: number,
  wave3Savings: number,
  wave4Savings: number,
  includeWaves: string[]
): number => {
  let adjusted = 0;
  if (includeWaves.includes('wave2')) {
    adjusted += wave2Savings * RISK_FACTORS.wave2;
  }
  if (includeWaves.includes('wave3')) {
    adjusted += wave3Savings * RISK_FACTORS.wave3;
  }
  if (includeWaves.includes('wave4')) {
    adjusted += wave4Savings * RISK_FACTORS.wave4;
  }
  return Math.round(adjusted);
};

// v3.9: formatPayback eliminado - usar calcularPaybackCompleto() en su lugar

/**
 * Formatea ROI para display con warnings
 */
const formatROI = (roi: number, roiAjustado: number): {
  text: string;
  showAjustado: boolean;
  isHighWarning: boolean;
} => {
  const roiDisplay = roi > 0 ? `${roi.toFixed(1)}%` : 'N/A';
  const showAjustado = roi > 500;
  const isHighWarning = roi > 1000;

  return { text: roiDisplay, showAjustado, isHighWarning };
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${Math.round(value / 1000)}K`;
  return `€${value.toLocaleString()}`;
};

// ========== COMPONENTE: MAPA DE OPORTUNIDADES v3.5 ==========
// Ejes actualizados:
// - X: FACTIBILIDAD = Score Agentic Readiness (0-10)
// - Y: IMPACTO ECONÓMICO = Ahorro anual TCO (€)
// - Tamaño: Volumen mensual de interacciones
// - Color: Tier (Verde=AUTOMATE, Azul=ASSIST, Naranja=AUGMENT, Rojo=HUMAN-ONLY)

interface BubbleDataPoint {
  id: string;
  name: string;
  feasibility: number;  // Score Agentic Readiness (0-10)
  economicImpact: number;  // Ahorro anual TCO (€)
  volume: number;  // Volumen mensual
  tier: AgenticTier;
  rank?: number;
}

// v3.5: Colores por Tier
const TIER_COLORS: Record<AgenticTier, { fill: string; stroke: string; label: string }> = {
  'AUTOMATE': { fill: '#059669', stroke: '#047857', label: 'Automatizar' },
  'ASSIST': { fill: '#3B82F6', stroke: '#2563EB', label: 'Asistir' },
  'AUGMENT': { fill: '#F59E0B', stroke: '#D97706', label: 'Optimizar' },
  'HUMAN-ONLY': { fill: '#EF4444', stroke: '#DC2626', label: 'Humano' }
};

// v3.6: Constantes CPI para cálculo de ahorro TCO
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

// v3.6: Calcular ahorro TCO realista con fórmula explícita
function calculateTCOSavings(volume: number, tier: AgenticTier): number {
  if (volume === 0) return 0;

  const { CPI_HUMANO, CPI_BOT, CPI_ASSIST, CPI_AUGMENT, RATE_AUTOMATE, RATE_ASSIST, RATE_AUGMENT } = CPI_CONFIG;

  switch (tier) {
    case 'AUTOMATE':
      // Ahorro = Vol × 12 × 70% × (CPI_humano - CPI_bot)
      return Math.round(volume * 12 * RATE_AUTOMATE * (CPI_HUMANO - CPI_BOT));

    case 'ASSIST':
      // Ahorro = Vol × 12 × 30% × (CPI_humano - CPI_assist)
      return Math.round(volume * 12 * RATE_ASSIST * (CPI_HUMANO - CPI_ASSIST));

    case 'AUGMENT':
      // Ahorro = Vol × 12 × 15% × (CPI_humano - CPI_augment)
      return Math.round(volume * 12 * RATE_AUGMENT * (CPI_HUMANO - CPI_AUGMENT));

    case 'HUMAN-ONLY':
    default:
      return 0;
  }
}

function OpportunityBubbleChart({
  heatmapData,
  drilldownData
}: {
  heatmapData: HeatmapDataPoint[];
  drilldownData?: DrilldownDataPoint[]
}) {
  // v3.5: Usar drilldownData si está disponible para tener info de Tier por cola
  let chartData: BubbleDataPoint[] = [];

  if (drilldownData && drilldownData.length > 0) {
    // Aplanar todas las colas de todos los skills
    const allQueues = drilldownData.flatMap(skill =>
      skill.originalQueues.map(q => ({
        queue: q,
        skillName: skill.skill
      }))
    );

    // Generar puntos de datos para el chart
    chartData = allQueues
      .filter(item => item.queue.tier !== 'HUMAN-ONLY') // Excluir HUMAN-ONLY del chart principal
      .slice(0, 15) // Limitar a 15 burbujas para legibilidad
      .map((item, idx) => {
        const savings = calculateTCOSavings(item.queue.volume, item.queue.tier);

        return {
          id: `opp-${idx + 1}`,
          name: item.queue.original_queue_id,
          feasibility: item.queue.agenticScore,
          economicImpact: savings,
          volume: item.queue.volume,
          tier: item.queue.tier
        };
      });
  } else {
    // Fallback: usar heatmapData si no hay drilldown
    chartData = heatmapData.slice(0, 10).map((item, idx) => {
      const score = (item.automation_readiness || 50) / 10;
      const tier: AgenticTier = score >= 7.5 ? 'AUTOMATE' :
                                score >= 5.5 ? 'ASSIST' :
                                score >= 3.5 ? 'AUGMENT' : 'HUMAN-ONLY';

      const savings = calculateTCOSavings(item.volume, tier);

      return {
        id: `opp-${idx + 1}`,
        name: item.skill,
        feasibility: score,
        economicImpact: savings,
        volume: item.volume,
        tier
      };
    });
  }

  // Ordenar por ahorro y asignar ranks
  const rankedData = chartData
    .sort((a, b) => b.economicImpact - a.economicImpact)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  // Calcular límites para escalas
  const maxSavings = Math.max(...rankedData.map(d => d.economicImpact), 1000);
  const maxVolume = Math.max(...rankedData.map(d => d.volume), 100);
  const minBubbleSize = 20;
  const maxBubbleSize = 50;
  const padding = 10;

  return (
    <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Target className="w-5 h-5 text-[#6D84E3]" />
            Mapa de Oportunidades por Tier
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Factibilidad (Score) vs Impacto Económico (Ahorro TCO) • Tamaño = Volumen • Color = Tier
          </p>
        </div>
      </div>

      {/* Bubble Chart */}
      <div className="relative" style={{ height: '340px' }}>
        {/* Y-axis label */}
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-gray-600 font-semibold whitespace-nowrap">
          IMPACTO ECONÓMICO (Ahorro TCO €/año)
        </div>

        {/* X-axis label */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-gray-600 font-semibold">
          FACTIBILIDAD (Agentic Readiness Score 0-10)
        </div>

        {/* Chart area */}
        <div className="ml-12 mr-4 h-[300px] relative border-l-2 border-b-2 border-gray-300">
          {/* Grid lines */}
          <div className="absolute inset-0 grid grid-cols-5 grid-rows-4">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="border border-gray-100" />
            ))}
          </div>

          {/* Threshold lines */}
          {/* Vertical line at score = 7.5 (AUTOMATE threshold) */}
          <div
            className="absolute top-0 bottom-0 w-px bg-emerald-300"
            style={{ left: `${(7.5 / 10) * 100}%` }}
          >
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-emerald-600 font-medium whitespace-nowrap">
              Tier AUTOMATE ≥7.5
            </span>
          </div>

          {/* Vertical line at score = 5.5 (ASSIST threshold) */}
          <div
            className="absolute top-0 bottom-0 w-px bg-blue-200"
            style={{ left: `${(5.5 / 10) * 100}%` }}
          />

          {/* Quadrant labels - basados en Score (X) y Ahorro (Y) */}
          {/* Top-right: High Score + High Savings = QUICK WINS */}
          <div className="absolute top-2 right-2 text-xs bg-emerald-100 px-2.5 py-1.5 rounded-lg border-2 border-emerald-400 shadow-sm">
            <div className="font-bold text-emerald-700">🎯 QUICK WINS</div>
            <div className="text-[9px] text-emerald-600">Score ≥7.5 + Ahorro alto</div>
            <div className="text-[9px] text-emerald-500 font-medium">→ Prioridad 1</div>
          </div>
          {/* Top-left: Low Score + High Savings = OPTIMIZE */}
          <div className="absolute top-2 left-2 text-xs bg-amber-100 px-2.5 py-1.5 rounded-lg border-2 border-amber-400 shadow-sm">
            <div className="font-bold text-amber-700">⚙️ OPTIMIZE</div>
            <div className="text-[9px] text-amber-600">Score &lt;7.5 + Ahorro alto</div>
            <div className="text-[9px] text-amber-500 font-medium">→ Wave 1 primero</div>
          </div>
          {/* Bottom-right: High Score + Low Savings = STRATEGIC */}
          <div className="absolute bottom-10 right-2 text-xs bg-blue-100 px-2.5 py-1.5 rounded-lg border-2 border-blue-400 shadow-sm">
            <div className="font-bold text-blue-700">📊 STRATEGIC</div>
            <div className="text-[9px] text-blue-600">Score ≥7.5 + Ahorro bajo</div>
            <div className="text-[9px] text-blue-500 font-medium">→ Evaluar ROI</div>
          </div>
          {/* Bottom-left: Low Score + Low Savings = DEFER */}
          <div className="absolute bottom-10 left-2 text-xs bg-gray-100 px-2.5 py-1.5 rounded-lg border-2 border-gray-300 shadow-sm">
            <div className="font-bold text-gray-600">📋 DEFER</div>
            <div className="text-[9px] text-gray-500">Score &lt;7.5 + Ahorro bajo</div>
            <div className="text-[9px] text-gray-400 font-medium">→ Backlog</div>
          </div>

          {/* Bubbles */}
          {rankedData.map((item, idx) => {
            // X: feasibility (score 0-10) → left to right
            const x = padding + (item.feasibility / 10) * (100 - 2 * padding);
            // Y: economicImpact → bottom to top (invert)
            const y = (100 - padding) - (item.economicImpact / maxSavings) * (100 - 2 * padding);
            // Size: based on volume
            const size = minBubbleSize + (item.volume / maxVolume) * (maxBubbleSize - minBubbleSize);
            const tierColor = TIER_COLORS[item.tier];
            const shortName = item.name.length > 12 ? item.name.substring(0, 10) + '...' : item.name;

            return (
              <motion.div
                key={item.id || idx}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.9 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                className="absolute flex flex-col items-center justify-center rounded-full cursor-pointer hover:opacity-100 hover:z-20 hover:scale-110 transition-all group"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: tierColor.fill,
                  border: `2px solid ${tierColor.stroke}`,
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
              >
                <span className="text-white font-bold text-[10px]">{item.rank}</span>
                {size >= 32 && (
                  <span className="text-white/90 text-[7px] leading-tight text-center px-0.5 truncate max-w-full">
                    {shortName}
                  </span>
                )}
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none shadow-xl">
                  <div className="font-semibold text-sm">{item.name}</div>
                  <div className="mt-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Score:</span>
                      <span className="font-medium">{item.feasibility.toFixed(1)}/10</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Volumen:</span>
                      <span className="font-medium">{item.volume.toLocaleString()}/mes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Ahorro TCO:</span>
                      <span className="font-medium text-emerald-400">{formatCurrency(item.economicImpact)}/año</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-gray-600">
                      <span className="text-gray-400">Tier:</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{ backgroundColor: tierColor.fill }}
                      >
                        {tierColor.label}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Y-axis ticks */}
          <div className="absolute -left-10 top-0 text-[10px] text-gray-500 font-medium">
            {formatCurrency(maxSavings)}
          </div>
          <div className="absolute -left-10 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
            {formatCurrency(maxSavings / 2)}
          </div>
          <div className="absolute -left-10 bottom-0 text-[10px] text-gray-500">€0</div>

          {/* X-axis ticks */}
          <div className="absolute bottom-[-20px] left-0 text-[10px] text-gray-500">0</div>
          <div className="absolute bottom-[-20px] left-1/4 text-[10px] text-gray-500">2.5</div>
          <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 text-[10px] text-gray-500">5</div>
          <div className="absolute bottom-[-20px] left-3/4 text-[10px] text-gray-500">7.5</div>
          <div className="absolute bottom-[-20px] right-0 text-[10px] text-gray-500">10</div>
        </div>
      </div>

      {/* Priority List with Tier badges */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
        {rankedData.slice(0, 8).map((item) => {
          const tierColor = TIER_COLORS[item.tier];
          return (
            <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs border border-gray-100">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ backgroundColor: tierColor.fill }}
              >
                {item.rank}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-gray-700 truncate block text-[11px]" title={item.name}>{item.name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-emerald-600 font-semibold">{formatCurrency(item.economicImpact)}</span>
                  <span
                    className="text-[8px] px-1 py-0.5 rounded font-medium text-white"
                    style={{ backgroundColor: tierColor.fill }}
                  >
                    {item.tier}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leyenda por Tier */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-700 mb-2">
          <span className="font-semibold" style={{ color: '#6d84e3' }}>Interpretación:</span> Las burbujas en el cuadrante superior derecho (Score alto + Ahorro alto)
          son Quick Wins para automatización. El tamaño indica volumen de interacciones.
        </p>
        <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-600 pt-2 border-t border-gray-200">
          <div className="flex items-center gap-1">
            <span className="font-medium">Tamaño:</span> Volumen
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TIER_COLORS.AUTOMATE.fill }} />
            <span>AUTOMATE (≥7.5)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TIER_COLORS.ASSIST.fill }} />
            <span>ASSIST (≥5.5)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TIER_COLORS.AUGMENT.fill }} />
            <span>AUGMENT (≥3.5)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TIER_COLORS['HUMAN-ONLY'].fill }} />
            <span>HUMAN (&lt;3.5)</span>
          </div>
        </div>
      </div>

      {/* Metodología detallada */}
      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-300 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-[#6D84E3]" />
          Metodología de Cálculo
        </h4>

        {/* Ejes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-gray-50 rounded border border-gray-200">
            <h5 className="text-xs font-semibold text-gray-700 mb-2">📊 Eje X: FACTIBILIDAD (Score 0-10)</h5>
            <p className="text-[11px] text-gray-600 mb-2">
              Score Agentic Readiness calculado con 5 factores ponderados:
            </p>
            <ul className="text-[10px] text-gray-500 space-y-1 ml-2">
              <li>• <strong>Predictibilidad (30%)</strong>: basado en CV AHT</li>
              <li>• <strong>Resolutividad (25%)</strong>: FCR (60%) + Transfer (40%)</li>
              <li>• <strong>Volumen (25%)</strong>: escala logarítmica del volumen</li>
              <li>• <strong>Calidad Datos (10%)</strong>: % registros válidos</li>
              <li>• <strong>Simplicidad (10%)</strong>: basado en AHT</li>
            </ul>
          </div>

          <div className="p-3 bg-gray-50 rounded border border-gray-200">
            <h5 className="text-xs font-semibold text-gray-700 mb-2">💰 Eje Y: IMPACTO ECONÓMICO (€/año)</h5>
            <p className="text-[11px] text-gray-600 mb-2">
              Ahorro TCO calculado según tier con CPI diferencial:
            </p>
            <div className="text-[10px] text-gray-500 space-y-1 ml-2">
              <p className="font-mono bg-gray-100 px-1 py-0.5 rounded text-[9px]">
                CPI Humano = €{CPI_CONFIG.CPI_HUMANO.toFixed(2)}/int
              </p>
              <p className="font-mono bg-emerald-50 px-1 py-0.5 rounded text-[9px] text-emerald-700">
                CPI Bot = €{CPI_CONFIG.CPI_BOT.toFixed(2)}/int
              </p>
              <p className="font-mono bg-blue-50 px-1 py-0.5 rounded text-[9px] text-blue-700">
                CPI Assist = €{CPI_CONFIG.CPI_ASSIST.toFixed(2)}/int
              </p>
              <p className="font-mono bg-amber-50 px-1 py-0.5 rounded text-[9px] text-amber-700">
                CPI Augment = €{CPI_CONFIG.CPI_AUGMENT.toFixed(2)}/int
              </p>
            </div>
          </div>
        </div>

        {/* Fórmulas por Tier */}
        <div className="p-3 bg-gradient-to-r from-slate-50 to-white rounded border border-gray-200">
          <h5 className="text-xs font-semibold text-gray-700 mb-3">🧮 Fórmulas de Ahorro por Tier</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px]">
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: TIER_COLORS.AUTOMATE.fill }} />
              <div>
                <p className="font-semibold text-emerald-700">AUTOMATE (Score ≥ 7.5)</p>
                <p className="font-mono text-gray-600 mt-0.5">
                  Ahorro = Vol × 12 × <strong>70%</strong> × (€2.33 - €0.15)
                </p>
                <p className="text-gray-500">= Vol × 12 × 0.70 × €2.18</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: TIER_COLORS.ASSIST.fill }} />
              <div>
                <p className="font-semibold text-blue-700">ASSIST (Score ≥ 5.5)</p>
                <p className="font-mono text-gray-600 mt-0.5">
                  Ahorro = Vol × 12 × <strong>30%</strong> × (€2.33 - €1.50)
                </p>
                <p className="text-gray-500">= Vol × 12 × 0.30 × €0.83</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: TIER_COLORS.AUGMENT.fill }} />
              <div>
                <p className="font-semibold text-amber-700">AUGMENT (Score ≥ 3.5)</p>
                <p className="font-mono text-gray-600 mt-0.5">
                  Ahorro = Vol × 12 × <strong>15%</strong> × (€2.33 - €2.00)
                </p>
                <p className="text-gray-500">= Vol × 12 × 0.15 × €0.33</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: TIER_COLORS['HUMAN-ONLY'].fill }} />
              <div>
                <p className="font-semibold text-red-700">HUMAN-ONLY (Score &lt; 3.5 o Red Flags)</p>
                <p className="font-mono text-gray-600 mt-0.5">
                  Ahorro = <strong>€0</strong>
                </p>
                <p className="text-gray-500">Requiere estandarización previa</p>
              </div>
            </div>
          </div>
        </div>

        {/* Clasificación de Tier */}
        <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
          <h5 className="text-xs font-semibold text-gray-700 mb-2">🏷️ Criterios de Clasificación de Tier</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
            <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
              <p className="font-semibold text-emerald-700">AUTOMATE</p>
              <ul className="text-emerald-600 mt-1 space-y-0.5">
                <li>• Score ≥ 7.5</li>
                <li>• CV ≤ 75%</li>
                <li>• Transfer ≤ 20%</li>
                <li>• FCR ≥ 50%</li>
              </ul>
            </div>
            <div className="p-2 bg-blue-50 rounded border border-blue-200">
              <p className="font-semibold text-blue-700">ASSIST</p>
              <ul className="text-blue-600 mt-1 space-y-0.5">
                <li>• Score ≥ 5.5</li>
                <li>• CV ≤ 90%</li>
                <li>• Transfer ≤ 30%</li>
                <li>• Sin red flags</li>
              </ul>
            </div>
            <div className="p-2 bg-amber-50 rounded border border-amber-200">
              <p className="font-semibold text-amber-700">AUGMENT</p>
              <ul className="text-amber-600 mt-1 space-y-0.5">
                <li>• Score ≥ 3.5</li>
                <li>• Sin red flags</li>
                <li>• Requiere optimización</li>
                <li>&nbsp;</li>
              </ul>
            </div>
            <div className="p-2 bg-red-50 rounded border border-red-200">
              <p className="font-semibold text-red-700">HUMAN-ONLY</p>
              <ul className="text-red-600 mt-1 space-y-0.5">
                <li>• Score &lt; 3.5, o</li>
                <li>• CV &gt; 120%</li>
                <li>• Transfer &gt; 50%</li>
                <li>• Vol &lt; 50 o Valid &lt; 30%</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Nota metodológica */}
        <p className="text-[10px] text-gray-500 mt-3 italic">
          <strong>Nota:</strong> El tamaño de las burbujas representa el volumen de interacciones.
          Las colas clasificadas como HUMAN-ONLY no aparecen en el gráfico (ahorro = €0).
          Los ahorros son proyecciones basadas en benchmarks de industria y deben validarse con pilotos.
        </p>
      </div>
    </div>
  );
}


// ========== TIPOS ADICIONALES PARA WAVE CARDS MEJORADOS ==========

interface WaveEntryCriteria {
  tierFrom: string[];
  scoreRange: string;
  requiredMetrics: string[];
}

interface WaveExitCriteria {
  tierTo: string;
  scoreTarget: string;
  kpiTargets: string[];
}

interface PriorityQueue {
  name: string;
  volume: number;
  currentScore: number;
  currentTier: AgenticTier;
  potentialSavings: number;
  redFlags?: string[];  // v3.7: Red flags que explican tier
}

// v3.7: Detectar red flags que explican por qué una cola tiene tier inferior al score
function detectRedFlags(queue: {
  agenticScore: number;
  tier: AgenticTier;
  cv_aht: number;
  transfer_rate: number;
  volume: number;
  volumeValid: number;
}): string[] {
  const flags: string[] = [];

  // CV AHT muy alto (umbral >120% = alta variabilidad)
  if (queue.cv_aht > 120) {
    flags.push(`CV ${queue.cv_aht.toFixed(0)}%`);
  }

  // Transfer rate alto (>50% = proceso mal diseñado)
  if (queue.transfer_rate > 50) {
    flags.push(`Transfer ${queue.transfer_rate.toFixed(0)}%`);
  }

  // Volumen muy bajo (< 50/mes = muestra insuficiente)
  if (queue.volume < 50) {
    flags.push(`Vol <50`);
  }

  // Porcentaje de registros válidos bajo (< 30% = datos ruidosos)
  const validPct = queue.volume > 0 ? (queue.volumeValid / queue.volume) * 100 : 0;
  if (validPct < 30 && queue.volume > 0) {
    flags.push(`Valid ${validPct.toFixed(0)}%`);
  }

  return flags;
}

// ========== COMPONENTE: WAVE CARD MEJORADO ==========

function WaveCard({
  wave,
  delay = 0,
  entryCriteria,
  exitCriteria,
  priorityQueues
}: {
  wave: WaveData;
  delay?: number;
  entryCriteria?: WaveEntryCriteria;
  exitCriteria?: WaveExitCriteria;
  priorityQueues?: PriorityQueue[];
}) {
  const [expanded, setExpanded] = React.useState(false);

  const margenAnual = wave.ahorroAnual - wave.costoRecurrenteAnual;
  const roiWave = wave.inversionSetup > 0 ? Math.round((margenAnual / wave.inversionSetup) * 100) : 0;

  const riesgoColors = {
    bajo: 'bg-emerald-100 text-emerald-700',
    medio: 'bg-amber-100 text-amber-700',
    alto: 'bg-red-100 text-red-700'
  };

  const riesgoIcons = {
    bajo: '🟢',
    medio: '🟡',
    alto: '🔴'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`bg-white rounded-xl border-2 ${wave.borderColor} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
    >
      {/* Header */}
      <div className={`${wave.bgColor} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${wave.color} bg-white/80 rounded-lg`}>
              {wave.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-800">{wave.titulo}</h3>
                {wave.esCondicional && (
                  <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                    Condicional
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600">{wave.trimestre}</p>
            </div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${riesgoColors[wave.riesgo]}`}>
            {riesgoIcons[wave.riesgo]} Riesgo {wave.riesgo}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Criterios de Entrada/Salida - NUEVO */}
        {(entryCriteria || exitCriteria) && (
          <div className="grid grid-cols-2 gap-2">
            {/* Criterios de Entrada */}
            {entryCriteria && (
              <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-[10px] text-blue-700 font-bold mb-1.5 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" /> ENTRADA
                </p>
                <div className="space-y-1 text-[10px]">
                  <p className="text-blue-600">
                    <span className="font-medium">Tier:</span> {entryCriteria.tierFrom.join(', ')}
                  </p>
                  <p className="text-blue-600">
                    <span className="font-medium">Score:</span> {entryCriteria.scoreRange}
                  </p>
                  <div className="pt-1 border-t border-blue-200 mt-1">
                    {entryCriteria.requiredMetrics.map((m, i) => (
                      <p key={i} className="text-blue-500">• {m}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Criterios de Salida */}
            {exitCriteria && (
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-[10px] text-emerald-700 font-bold mb-1.5 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> SALIDA
                </p>
                <div className="space-y-1 text-[10px]">
                  <p className="text-emerald-600">
                    <span className="font-medium">Tier:</span> {exitCriteria.tierTo}
                  </p>
                  <p className="text-emerald-600">
                    <span className="font-medium">Score:</span> {exitCriteria.scoreTarget}
                  </p>
                  <div className="pt-1 border-t border-emerald-200 mt-1">
                    {exitCriteria.kpiTargets.map((k, i) => (
                      <p key={i} className="text-emerald-500">• {k}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Por qué es necesario */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-xs text-gray-500 font-medium mb-1">🎯 Por qué es necesario:</p>
          <p className="text-sm text-gray-700">{wave.porQueNecesario}</p>
        </div>

        {/* Tabla de Colas Prioritarias - NUEVO */}
        {priorityQueues && priorityQueues.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-blue-500" />
                Top Colas por Volumen × Impacto
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-500">Cola</th>
                    <th className="text-right py-1.5 px-2 font-medium text-gray-500">Vol/mes</th>
                    <th className="text-right py-1.5 px-2 font-medium text-gray-500">Score</th>
                    <th className="text-center py-1.5 px-2 font-medium text-gray-500">Tier</th>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-500">Red Flags</th>
                    <th className="text-right py-1.5 px-2 font-medium text-gray-500">Potencial</th>
                  </tr>
                </thead>
                <tbody>
                  {priorityQueues.slice(0, 5).map((q, idx) => (
                    <tr key={idx} className="border-t border-gray-100">
                      <td className="py-1.5 px-2 text-gray-700 font-medium truncate max-w-[100px]" title={q.name}>
                        {q.name.length > 15 ? q.name.substring(0, 13) + '...' : q.name}
                      </td>
                      <td className="text-right py-1.5 px-2 text-gray-600">
                        {q.volume.toLocaleString()}
                      </td>
                      <td className="text-right py-1.5 px-2 text-gray-600">
                        {q.currentScore.toFixed(1)}
                      </td>
                      <td className="text-center py-1.5 px-2">
                        <span
                          className="px-1.5 py-0.5 rounded text-white font-medium text-[8px]"
                          style={{ backgroundColor: TIER_COLORS[q.currentTier].fill }}
                        >
                          {q.currentTier === 'HUMAN-ONLY' ? 'HUMAN' : q.currentTier}
                        </span>
                      </td>
                      <td className="py-1.5 px-2">
                        {q.redFlags && q.redFlags.length > 0 ? (
                          <div className="flex flex-wrap gap-0.5">
                            {q.redFlags.map((flag, i) => (
                              <span
                                key={i}
                                className="px-1 py-0.5 bg-red-100 text-red-700 rounded text-[8px] font-medium whitespace-nowrap"
                              >
                                {flag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-emerald-600 text-[8px]">✓ OK</span>
                        )}
                      </td>
                      <td className="text-right py-1.5 px-2 text-emerald-600 font-semibold">
                        {formatCurrency(q.potentialSavings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* v3.7: Nota explicativa de Red Flags */}
            <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-[9px] text-gray-500">
              <span className="font-medium">Red Flags:</span> CV &gt;120% (alta variabilidad) · Transfer &gt;50% (proceso fragmentado) · Vol &lt;50 (muestra pequeña) · Valid &lt;30% (datos ruidosos)
            </div>
          </div>
        )}

        {/* Skills afectados */}
        <div>
          <p className="text-xs text-gray-500 font-medium mb-2">Skills ({wave.skills.length}):</p>
          <div className="flex flex-wrap gap-1">
            {wave.skills.map((skill, idx) => (
              <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Métricas financieras */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-red-50 rounded border border-red-100">
            <p className="text-[10px] text-red-600 font-medium">Setup</p>
            <p className="text-sm font-bold text-red-700">{formatCurrency(wave.inversionSetup)}</p>
          </div>
          <div className="p-2 bg-amber-50 rounded border border-amber-100">
            <p className="text-[10px] text-amber-600 font-medium">Recurrente/año</p>
            <p className="text-sm font-bold text-amber-700">{formatCurrency(wave.costoRecurrenteAnual)}</p>
          </div>
          <div className="p-2 bg-emerald-50 rounded border border-emerald-100">
            <p className="text-[10px] text-emerald-600 font-medium">Ahorro/año</p>
            <p className="text-sm font-bold text-emerald-700">{formatCurrency(wave.ahorroAnual)}</p>
          </div>
          <div className="p-2 bg-blue-50 rounded border border-blue-100">
            <p className="text-[10px] text-blue-600 font-medium">Margen/año</p>
            <p className="text-sm font-bold text-blue-700">{formatCurrency(margenAnual)}</p>
          </div>
        </div>

        {/* Expandible: Iniciativas y criterios */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 py-2 border-t border-gray-100"
        >
          {expanded ? 'Ocultar detalles' : 'Ver iniciativas y criterios'}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && (
          <div className="space-y-4 pt-2">
            {/* Iniciativas */}
            <div>
              <p className="text-xs text-gray-500 font-medium mb-2">Iniciativas:</p>
              <div className="space-y-2">
                {wave.iniciativas.map((init, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 rounded text-xs">
                    <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-700">{init.nombre}</p>
                      <p className="text-gray-500">
                        Setup: {formatCurrency(init.setup)} | Rec: {formatCurrency(init.recurrente)}/mes
                      </p>
                      <p className="text-blue-600 mt-1">KPI: {init.kpi}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Criterios de éxito */}
            <div>
              <p className="text-xs text-gray-500 font-medium mb-2">✅ Criterios de éxito:</p>
              <ul className="space-y-1">
                {wave.criteriosExito.map((criterio, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                    {criterio}
                  </li>
                ))}
              </ul>
            </div>

            {/* Condición si aplica */}
            {wave.esCondicional && wave.condicion && (
              <div className="p-2 bg-amber-50 rounded border border-amber-200">
                <p className="text-xs text-amber-700">
                  <strong>⚠️ Condición:</strong> {wave.condicion}
                </p>
              </div>
            )}

            {/* Proveedor */}
            <div className="text-xs text-gray-500">
              <strong>Proveedor:</strong> {wave.proveedor}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ========== COMPONENTE: COMPARACIÓN DE ESCENARIOS v3.7 ==========

function ScenarioComparison({ escenarios }: { escenarios: EscenarioData[] }) {
  const riesgoColors = {
    bajo: 'text-emerald-600 bg-emerald-100',
    medio: 'text-amber-600 bg-amber-100',
    alto: 'text-red-600 bg-red-100'
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-500" />
          Escenarios de Inversión
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Comparación de opciones según nivel de compromiso
          <span className="ml-2 text-gray-400" title="ROI basado en benchmarks de industria. El ROI ajustado considera factores de riesgo de implementación.">
            ℹ️
          </span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-600">Escenario</th>
              <th className="text-right py-3 px-4 font-medium text-gray-600">Inversión</th>
              <th className="text-right py-3 px-4 font-medium text-gray-600">Recurrente</th>
              <th className="text-right py-3 px-4 font-medium text-gray-600">
                Ahorro
                <span className="block text-[10px] text-gray-400 font-normal">(ajustado)</span>
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-600">Margen</th>
              <th className="text-right py-3 px-4 font-medium text-gray-600">Payback</th>
              <th className="text-right py-3 px-4 font-medium text-gray-600">
                ROI 3a
                <span className="block text-[10px] text-gray-400 font-normal">(ajustado)</span>
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-600">Riesgo</th>
            </tr>
          </thead>
          <tbody>
            {escenarios.map((esc) => {
              // v3.9: Usar el nuevo paybackInfo detallado
              const pInfo = esc.paybackInfo;
              const roiInfo = formatROI(esc.roi3Anos, esc.roi3AnosAjustado);

              return (
                <tr
                  key={esc.id}
                  className={`border-t border-gray-100 ${
                    esc.esHabilitador ? 'bg-blue-50/30' :
                    !esc.esRentable ? 'bg-red-50/30' :
                    esc.esRecomendado ? 'bg-emerald-50/50' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {esc.esHabilitador && (
                        <span className="text-blue-500" title="Wave habilitadora - su valor está en desbloquear waves posteriores">💡</span>
                      )}
                      {!esc.esRentable && !esc.esHabilitador && (
                        <span className="text-red-500" title="Margen anual negativo">❌</span>
                      )}
                      <span className={`font-medium ${
                        esc.esHabilitador ? 'text-blue-700' :
                        !esc.esRentable ? 'text-red-700' :
                        esc.esRecomendado ? 'text-emerald-700' : 'text-gray-700'
                      }`}>
                        {esc.nombre}
                      </span>
                      {esc.esHabilitador && (
                        <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full">
                          Habilitador
                        </span>
                      )}
                      {esc.esRecomendado && !esc.esHabilitador && esc.esRentable && (
                        <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                          Recomendado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{esc.descripcion}</p>
                  </td>
                  <td className="text-right py-3 px-4 font-semibold text-gray-700">
                    {formatCurrency(esc.inversionTotal)}
                  </td>
                  <td className="text-right py-3 px-4 text-amber-600">
                    {formatCurrency(esc.costoRecurrenteAnual)}/año
                  </td>
                  <td className="text-right py-3 px-4">
                    <div className="text-emerald-600">{formatCurrency(esc.ahorroAnual)}/año</div>
                    {esc.esHabilitador && esc.potencialHabilitado > 0 && (
                      <div className="text-[10px] text-blue-600" title={`Desbloquea ${esc.wavesHabilitadas.join(', ')}`}>
                        (habilita {formatCurrency(esc.potencialHabilitado)})
                      </div>
                    )}
                    {!esc.esHabilitador && esc.ahorroAjustado !== esc.ahorroAnual && (
                      <div className="text-[10px] text-gray-500">
                        ({formatCurrency(esc.ahorroAjustado)} ajust.)
                      </div>
                    )}
                  </td>
                  <td className="text-right py-3 px-4">
                    {esc.esHabilitador ? (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                        Prerrequisito
                      </span>
                    ) : (
                      <span className={`font-bold ${esc.margenAnual <= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        {esc.margenAnual <= 0 ? '-' : ''}{formatCurrency(Math.abs(esc.margenAnual))}/año
                      </span>
                    )}
                  </td>
                  <td className="text-right py-3 px-4">
                    <div
                      className={`cursor-help ${pInfo.clase}`}
                      title={pInfo.tooltip}
                    >
                      <span className="font-semibold">{pInfo.texto}</span>
                      {/* v3.9: Mostrar desglose si es recuperable */}
                      {pInfo.esRecuperable && pInfo.meses > 12 && (
                        <div className="text-[10px] text-gray-500 font-normal">
                          ({pInfo.mesesImplementacion}m impl + {pInfo.mesesRecuperacion}m rec)
                        </div>
                      )}
                      {/* Advertencia si payback largo */}
                      {pInfo.meses > 24 && pInfo.esRecuperable && (
                        <span className="ml-1 text-orange-500" title="Periodo de recuperación largo">⚠️</span>
                      )}
                    </div>
                  </td>
                  <td className="text-right py-3 px-4">
                    {esc.esHabilitador ? (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium"
                        title="El ROI se calcula sobre el roadmap completo">
                        Prerrequisito
                      </span>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className={`font-bold ${
                          roiInfo.isHighWarning ? 'text-amber-600' :
                          esc.roi3Anos <= 0 ? 'text-red-600' : 'text-purple-600'
                        }`}>
                          {roiInfo.text}
                          {roiInfo.isHighWarning && (
                            <span className="ml-1" title="ROI proyectado. Validar con piloto.">⚠️</span>
                          )}
                        </span>
                        {roiInfo.showAjustado && esc.roi3AnosAjustado > 0 && (
                          <span className="text-[10px] text-gray-500" title="ROI ajustado por riesgo de implementación">
                            ({esc.roi3AnosAjustado.toFixed(1)}% ajust.)
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="text-center py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${riesgoColors[esc.riesgo]}`}>
                      {esc.riesgo.charAt(0).toUpperCase() + esc.riesgo.slice(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Nota sobre cálculos */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-500">
        <strong>Payback:</strong> Tiempo implementación + tiempo recuperación.
        Wave 1: 6m, W2: 3m, W3: 3m, W4: 6m. Ahorro comienza al 50% de última wave.
        <br />
        <strong>ROI:</strong> (Ahorro 3a - Coste Total 3a) / Coste Total 3a × 100.
        Ajustado aplica riesgo: W1-2: 75-90%, W3: 60%, W4: 50%.
        <br />
        <strong>💡 Habilitador:</strong> Waves que desbloquean ROI de waves posteriores. Su payback se evalúa con el roadmap completo.
      </div>

      {/* Recomendación destacada */}
      {(() => {
        const recomendado = escenarios.find(e => e.esRecomendado);
        const isEnabling = recomendado?.esHabilitador;
        const bgColor = isEnabling ? 'bg-blue-50 border-blue-200' :
                        recomendado?.esRentable ? 'bg-emerald-50 border-emerald-200' :
                        'bg-amber-50 border-amber-200';
        const textColor = isEnabling ? 'text-blue-800' :
                         recomendado?.esRentable ? 'text-emerald-800' : 'text-amber-800';
        const subTextColor = isEnabling ? 'text-blue-700' :
                            recomendado?.esRentable ? 'text-emerald-700' : 'text-amber-700';

        return (
          <div className={`p-4 border-t ${bgColor}`}>
            <div className="flex items-start gap-3">
              {isEnabling ? (
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              ) : recomendado?.esRentable ? (
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${textColor}`}>
                  {isEnabling ? 'Recomendación (Habilitador)' : 'Recomendación'}
                </p>
                <p className={`text-xs mt-1 ${subTextColor}`}>
                  {recomendado?.recomendacion || 'Iniciar con escenario conservador para validar modelo antes de escalar.'}
                </p>
                {isEnabling && recomendado?.potencialHabilitado > 0 && (
                  <div className="mt-2 p-2 bg-white/60 rounded border border-blue-200">
                    <p className="text-xs text-blue-800">
                      <strong>💡 Valor real de esta inversión:</strong> Desbloquea {formatCurrency(recomendado.potencialHabilitado)}/año
                      en {recomendado.wavesHabilitadas.join(' y ')}. Sin esta base, las waves posteriores no son viables.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}


// ========== COMPONENTE: TIMELINE VISUAL CON CONECTORES Y DECISIONES ==========

interface DecisionGate {
  id: string;
  afterWave: string;
  question: string;
  criteria: string;
  goAction: string;
  noGoAction: string;
}

// v3.6: Decision Gates alineados con nueva nomenclatura y criterios de Tier
const DECISION_GATES: DecisionGate[] = [
  {
    id: 'gate1',
    afterWave: 'wave1',
    question: '¿CV ≤75% en 3+ colas?',
    criteria: 'Red flags eliminados, Tier 4→3',
    goAction: 'Iniciar AUGMENT',
    noGoAction: 'Extender FOUNDATION'
  },
  {
    id: 'gate2',
    afterWave: 'wave2',
    question: '¿Score ≥5.5 en target?',
    criteria: 'CV ≤90%, Transfer ≤30%',
    goAction: 'Iniciar ASSIST',
    noGoAction: 'Consolidar AUGMENT'
  },
  {
    id: 'gate3',
    afterWave: 'wave3',
    question: '¿Score ≥7.5 en 2+ colas?',
    criteria: 'CV ≤75%, FCR ≥50%',
    goAction: 'Lanzar AUTOMATE',
    noGoAction: 'Expandir ASSIST'
  }
];

function RoadmapTimeline({ waves }: { waves: WaveData[] }) {
  const waveColors: Record<string, { bg: string; border: string; connector: string }> = {
    wave1: { bg: 'bg-blue-100', border: 'border-blue-400', connector: 'bg-blue-400' },
    wave2: { bg: 'bg-emerald-100', border: 'border-emerald-400', connector: 'bg-emerald-400' },
    wave3: { bg: 'bg-purple-100', border: 'border-purple-400', connector: 'bg-purple-400' },
    wave4: { bg: 'bg-amber-100', border: 'border-amber-400', connector: 'bg-amber-400' }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-800 mb-2">Roadmap de Transformación 2026-2027</h3>
      <p className="text-xs text-gray-500 mb-6">Cada wave depende del éxito de la anterior. Los puntos de decisión permiten ajustar según resultados reales.</p>

      {/* Timeline horizontal con waves y gates */}
      <div className="relative">
        {/* Main connector line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 z-0" />

        {/* Waves and Gates flow */}
        <div className="relative flex items-center justify-between gap-2">
          {waves.map((wave, idx) => {
            const colors = waveColors[wave.id] || waveColors.wave1;
            const gate = DECISION_GATES.find(g => g.afterWave === wave.id);
            const isLast = idx === waves.length - 1;

            return (
              <React.Fragment key={wave.id}>
                {/* Wave box */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.15 }}
                  className={`relative flex-1 min-w-0 ${wave.esCondicional ? 'opacity-80' : ''}`}
                >
                  <div className={`
                    p-3 rounded-lg border-2 ${colors.bg} ${colors.border}
                    ${wave.esCondicional ? 'border-dashed' : ''}
                    relative z-10
                  `}>
                    {/* Wave header */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded ${wave.color} bg-white/80`}>
                        {wave.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-800 truncate">{wave.nombre}: {wave.titulo}</p>
                        <p className="text-[10px] text-gray-500">{wave.trimestre}</p>
                      </div>
                    </div>

                    {/* Wave metrics */}
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div className="bg-white/60 rounded px-1.5 py-1">
                        <span className="text-gray-500">Setup:</span>
                        <span className="font-semibold text-gray-700 ml-1">{formatCurrency(wave.inversionSetup)}</span>
                      </div>
                      <div className="bg-white/60 rounded px-1.5 py-1">
                        <span className="text-gray-500">Ahorro:</span>
                        <span className="font-semibold text-emerald-600 ml-1">{formatCurrency(wave.ahorroAnual)}</span>
                      </div>
                    </div>

                    {/* Conditional badge */}
                    {wave.esCondicional && (
                      <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-medium">
                        Condicional
                      </div>
                    )}

                    {/* Risk indicator */}
                    <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] px-2 py-0.5 rounded-full font-medium ${
                      wave.riesgo === 'bajo' ? 'bg-emerald-500 text-white' :
                      wave.riesgo === 'medio' ? 'bg-amber-500 text-white' :
                      'bg-red-500 text-white'
                    }`}>
                      {wave.riesgo === 'bajo' ? '● Bajo' : wave.riesgo === 'medio' ? '● Medio' : '● Alto'}
                    </div>
                  </div>
                </motion.div>

                {/* Decision Gate (connector between waves) */}
                {gate && !isLast && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.15 + 0.1 }}
                    className="flex-shrink-0 relative z-20"
                  >
                    {/* Connector arrow */}
                    <div className="flex items-center">
                      {/* Line before gate */}
                      <div className={`w-4 h-1 ${colors.connector}`} />

                      {/* Decision diamond */}
                      <div className="relative group cursor-pointer">
                        <div className="w-10 h-10 bg-white border-2 border-gray-400 rotate-45 flex items-center justify-center shadow-md hover:border-blue-500 hover:shadow-lg transition-all">
                          <span className="text-gray-600 font-bold text-xs -rotate-45">?</span>
                        </div>

                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                          <p className="font-bold text-amber-300 mb-1">Go/No-Go</p>
                          <p className="font-medium">{gate.question}</p>
                          <p className="text-gray-300 mt-1">Criterio: {gate.criteria}</p>
                          <div className="mt-2 pt-2 border-t border-gray-600 grid grid-cols-2 gap-1">
                            <div className="text-emerald-400">
                              <span className="font-medium">✓ Go:</span> {gate.goAction}
                            </div>
                            <div className="text-red-400">
                              <span className="font-medium">✗ No:</span> {gate.noGoAction}
                            </div>
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                        </div>

                        {/* Go/No-Go labels */}
                        <div className="absolute top-1/2 -left-1 -translate-y-full text-[8px] text-emerald-600 font-bold whitespace-nowrap -rotate-45">
                          Go
                        </div>
                        <div className="absolute top-1/2 -right-1 translate-y-1/2 text-[8px] text-red-500 font-bold whitespace-nowrap rotate-45">
                          No
                        </div>
                      </div>

                      {/* Line after gate */}
                      <div className="w-4 h-1 bg-gray-300" />
                    </div>
                  </motion.div>
                )}

                {/* Simple connector for last wave */}
                {!gate && !isLast && (
                  <div className="flex-shrink-0 w-8 flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Quarter timeline below */}
        <div className="mt-8 flex justify-between text-[10px] text-gray-400 px-4">
          <span>Q1 2026</span>
          <span>Q2 2026</span>
          <span>Q3 2026</span>
          <span>Q4 2026</span>
          <span>Q1 2027</span>
          <span>Q2 2027</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded" />
          <span>Wave confirmada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 border-2 border-dashed border-gray-400 rounded" />
          <span>Wave condicional</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white border-2 border-gray-400 rotate-45" />
          <span>Punto de decisión Go/No-Go</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-full text-[10px]">● Bajo</span>
          <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px]">● Medio</span>
          <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-[10px]">● Alto</span>
          <span>= Riesgo</span>
        </div>
      </div>
    </div>
  );
}

// ========== COMPONENTE PRINCIPAL: ROADMAP TAB ==========

export function RoadmapTab({ data }: RoadmapTabProps) {
  // Analizar datos de heatmap para determinar skills listos
  const heatmapData = data.heatmapData || [];

  // UMBRAL ÚNICO: Score >= 6 (automation_readiness >= 60) = Listo para Copilot
  const COPILOT_THRESHOLD = 60; // automation_readiness en escala 0-100

  // Clasificar skills según umbrales coherentes
  const skillsCopilot = heatmapData.filter(s => (s.automation_readiness || 0) >= COPILOT_THRESHOLD);
  const skillsOptimizar = heatmapData.filter(s => {
    const score = s.automation_readiness || 0;
    return score >= 40 && score < COPILOT_THRESHOLD;
  });
  const skillsHumano = heatmapData.filter(s => (s.automation_readiness || 0) < 40);

  const skillsListos = skillsCopilot.length;
  const totalSkills = heatmapData.length || 9;

  // Encontrar el skill con mejor score para Wave 2 (el mejor candidato)
  const sortedByScore = [...heatmapData].sort((a, b) => (b.automation_readiness || 0) - (a.automation_readiness || 0));
  const bestSkill = sortedByScore[0];
  const bestSkillScore = bestSkill ? (bestSkill.automation_readiness || 0) / 10 : 0;
  const bestSkillVolume = bestSkill?.volume || 0;

  // Skills que necesitan estandarización (CV AHT > 60% benchmark)
  const skillsNeedStandardization = heatmapData.filter(s => (s.variability?.cv_aht || 0) > 60);
  const skillsHighCV = heatmapData.filter(s => (s.variability?.cv_aht || 0) > 100);

  // Generar texto dinámico para Wave 2
  const wave2Description = skillsListos > 0
    ? `${bestSkill?.skill || 'Skill principal'} es el skill con mejor Score (${bestSkillScore.toFixed(1)}/10, categoría "Copilot"). Volumen ${bestSkillVolume.toLocaleString()}/año = mayor impacto económico.`
    : `Ningún skill alcanza actualmente Score ≥6. El mejor candidato es ${bestSkill?.skill || 'N/A'} con Score ${bestSkillScore.toFixed(1)}/10. Requiere optimización previa en Wave 1.`;

  const wave2Skills = skillsListos > 0
    ? skillsCopilot.map(s => s.skill)
    : [bestSkill?.skill || 'Mejor candidato post-Wave 1'];

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.6: Calcular métricas dinámicas desde drilldownData si está disponible
  // ═══════════════════════════════════════════════════════════════════════════
  const drilldownData = data.drilldownData || [];
  const allQueues = drilldownData.flatMap(skill => skill.originalQueues);

  // Contar colas por tier
  const tierCounts = {
    AUTOMATE: allQueues.filter(q => q.tier === 'AUTOMATE'),
    ASSIST: allQueues.filter(q => q.tier === 'ASSIST'),
    AUGMENT: allQueues.filter(q => q.tier === 'AUGMENT'),
    'HUMAN-ONLY': allQueues.filter(q => q.tier === 'HUMAN-ONLY')
  };

  // Volúmenes por tier
  const tierVolumes = {
    AUTOMATE: tierCounts.AUTOMATE.reduce((s, q) => s + q.volume, 0),
    ASSIST: tierCounts.ASSIST.reduce((s, q) => s + q.volume, 0),
    AUGMENT: tierCounts.AUGMENT.reduce((s, q) => s + q.volume, 0),
    'HUMAN-ONLY': tierCounts['HUMAN-ONLY'].reduce((s, q) => s + q.volume, 0)
  };

  const totalVolume = Object.values(tierVolumes).reduce((a, b) => a + b, 0) || 1;

  // Calcular ahorros potenciales por tier usando fórmula TCO
  const { CPI_HUMANO, CPI_BOT, CPI_ASSIST, CPI_AUGMENT, RATE_AUTOMATE, RATE_ASSIST, RATE_AUGMENT } = CPI_CONFIG;

  const potentialSavings = {
    AUTOMATE: Math.round(tierVolumes.AUTOMATE * 12 * RATE_AUTOMATE * (CPI_HUMANO - CPI_BOT)),
    ASSIST: Math.round(tierVolumes.ASSIST * 12 * RATE_ASSIST * (CPI_HUMANO - CPI_ASSIST)),
    AUGMENT: Math.round(tierVolumes.AUGMENT * 12 * RATE_AUGMENT * (CPI_HUMANO - CPI_AUGMENT))
  };

  // Colas que necesitan Wave 1 (Tier 3 + 4)
  const wave1Queues = [...tierCounts.AUGMENT, ...tierCounts['HUMAN-ONLY']];
  const wave1Volume = tierVolumes.AUGMENT + tierVolumes['HUMAN-ONLY'];

  // ═══════════════════════════════════════════════════════════════════════════
  // WAVES con nueva nomenclatura: FOUNDATION → AUGMENT → ASSIST → AUTOMATE
  // ═══════════════════════════════════════════════════════════════════════════
  const waves: WaveData[] = [
    {
      id: 'wave1',
      nombre: 'Wave 1',
      titulo: 'FOUNDATION',
      trimestre: 'Q1-Q2 2026',
      tipo: 'consulting',
      icon: <Settings className="w-5 h-5" />,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-300',
      inversionSetup: 47000,
      costoRecurrenteAnual: 0,
      ahorroAnual: 0, // Wave habilitadora
      esCondicional: false,
      porQueNecesario: `${tierCounts['HUMAN-ONLY'].length + tierCounts.AUGMENT.length} de ${allQueues.length} colas están en Tier 3-4 (${Math.round((wave1Volume / totalVolume) * 100)}% del volumen). Red flags: CV >75%, Transfer >20%. Automatizar sin estandarizar = fracaso garantizado.`,
      skills: wave1Queues.length > 0
        ? [...new Set(drilldownData.filter(s => s.originalQueues.some(q => q.tier === 'HUMAN-ONLY' || q.tier === 'AUGMENT')).map(s => s.skill))].slice(0, 5)
        : skillsNeedStandardization.map(s => s.skill).slice(0, 5),
      iniciativas: [
        { nombre: 'Análisis de variabilidad y red flags', setup: 15000, recurrente: 0, kpi: 'Mapear causas de CV >75% y Transfer >20%' },
        { nombre: 'Rediseño y documentación de procesos', setup: 20000, recurrente: 0, kpi: 'Scripts estandarizados para 80% casuística' },
        { nombre: 'Training y certificación de agentes', setup: 12000, recurrente: 0, kpi: 'Certificación 90% agentes, adherencia >85%' }
      ],
      criteriosExito: [
        `CV AHT ≤75% en al menos ${Math.max(3, Math.ceil(wave1Queues.length * 0.3))} colas de alto volumen`,
        'Transfer ≤20% global',
        'Red flags eliminados en colas prioritarias',
        `Al menos ${Math.ceil(wave1Queues.length * 0.2)} colas migran de Tier 4 → Tier 3`
      ],
      riesgo: 'bajo',
      riesgoDescripcion: 'Consultoría con entregables tangibles. No requiere tecnología.',
      proveedor: 'Beyond Consulting o tercero especializado'
    },
    {
      id: 'wave2',
      nombre: 'Wave 2',
      titulo: 'AUGMENT',
      trimestre: 'Q3 2026',
      tipo: 'beyond_consulting',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      inversionSetup: 35000,
      costoRecurrenteAnual: 40000,
      ahorroAnual: potentialSavings.AUGMENT || 58000, // 15% efficiency
      esCondicional: true,
      condicion: 'Requiere CV ≤75% post-Wave 1 en colas target',
      porQueNecesario: `Implementar herramientas de soporte para colas Tier 3 (Score 3.5-5.5). Objetivo: elevar score a ≥5.5 para habilitar Wave 3. Foco en ${tierCounts.AUGMENT.length} colas con ${tierVolumes.AUGMENT.toLocaleString()} int/mes.`,
      skills: tierCounts.AUGMENT.length > 0
        ? [...new Set(drilldownData.filter(s => s.originalQueues.some(q => q.tier === 'AUGMENT')).map(s => s.skill))].slice(0, 4)
        : ['Colas que alcancen Score 3.5-5.5 post Wave 1'],
      iniciativas: [
        { nombre: 'Knowledge Base contextual', setup: 20000, recurrente: 2000, kpi: 'Hold time -25%, uso KB +40%' },
        { nombre: 'Scripts dinámicos con IA', setup: 15000, recurrente: 1500, kpi: 'Adherencia scripts +30%' }
      ],
      criteriosExito: [
        'Score promedio sube de 3.5-5.5 → ≥5.5',
        'AHT -15% vs baseline',
        'CV ≤90% en colas target',
        `${Math.ceil(tierCounts.AUGMENT.length * 0.5)} colas migran de Tier 3 → Tier 2`
      ],
      riesgo: 'bajo',
      riesgoDescripcion: 'Herramientas de soporte, bajo riesgo de integración.',
      proveedor: 'BEYOND (KB + Scripts IA)'
    },
    {
      id: 'wave3',
      nombre: 'Wave 3',
      titulo: 'ASSIST',
      trimestre: 'Q4 2026',
      tipo: 'beyond',
      icon: <Bot className="w-5 h-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      inversionSetup: 70000,
      costoRecurrenteAnual: 78000,
      ahorroAnual: potentialSavings.ASSIST || 145000, // 30% efficiency
      esCondicional: true,
      condicion: 'Requiere Score ≥5.5 Y CV ≤90% Y Transfer ≤30%',
      porQueNecesario: `Copilot IA para agentes en colas Tier 2. Sugerencias en tiempo real, autocompletado, next-best-action. Objetivo: elevar score a ≥7.5 para Wave 4. Target: ${tierCounts.ASSIST.length} colas con ${tierVolumes.ASSIST.toLocaleString()} int/mes.`,
      skills: tierCounts.ASSIST.length > 0
        ? [...new Set(drilldownData.filter(s => s.originalQueues.some(q => q.tier === 'ASSIST')).map(s => s.skill))].slice(0, 4)
        : ['Colas que alcancen Score ≥5.5 post Wave 2'],
      iniciativas: [
        { nombre: 'Agent Assist / Copilot IA', setup: 45000, recurrente: 4500, kpi: 'AHT -30%, sugerencias aceptadas >60%' },
        { nombre: 'Automatización parcial (FAQs, routing)', setup: 25000, recurrente: 3000, kpi: 'Deflection rate 15%' }
      ],
      criteriosExito: [
        'Score promedio sube de 5.5-7.5 → ≥7.5',
        'AHT -30% vs baseline Wave 2',
        'CV ≤75% en colas target',
        'Transfer ≤20%',
        `${Math.ceil(tierCounts.ASSIST.length * 0.4)} colas migran de Tier 2 → Tier 1`
      ],
      riesgo: 'medio',
      riesgoDescripcion: 'Integración con plataforma contact center. Piloto 4 semanas mitiga.',
      proveedor: 'BEYOND (Copilot + Routing IA)'
    },
    {
      id: 'wave4',
      nombre: 'Wave 4',
      titulo: 'AUTOMATE',
      trimestre: 'Q1-Q2 2027',
      tipo: 'beyond',
      icon: <Rocket className="w-5 h-5" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      inversionSetup: 85000,
      costoRecurrenteAnual: 108000,
      ahorroAnual: potentialSavings.AUTOMATE || 380000, // 70% containment
      esCondicional: true,
      condicion: 'Requiere Score ≥7.5 Y CV ≤75% Y Transfer ≤20% Y FCR ≥50%',
      porQueNecesario: `Automatización end-to-end para colas Tier 1. Voicebot/Chatbot transaccional con 70% contención. Solo viable con procesos maduros. Target actual: ${tierCounts.AUTOMATE.length} colas con ${tierVolumes.AUTOMATE.toLocaleString()} int/mes.`,
      skills: tierCounts.AUTOMATE.length > 0
        ? [...new Set(drilldownData.filter(s => s.originalQueues.some(q => q.tier === 'AUTOMATE')).map(s => s.skill))].slice(0, 4)
        : ['Colas que alcancen Score ≥7.5 post Wave 3'],
      iniciativas: [
        { nombre: 'Voicebot/Chatbot transaccional', setup: 55000, recurrente: 6000, kpi: 'Contención 70%+, CSAT ≥4/5' },
        { nombre: 'IVR inteligente con NLU', setup: 30000, recurrente: 3000, kpi: 'Pre-calificación 80%+, transferencia warm' }
      ],
      criteriosExito: [
        'Contención ≥70% en colas automatizadas',
        'CSAT se mantiene o mejora (≥4/5)',
        'Escalado a humano <30%',
        'ROI acumulado >300%'
      ],
      riesgo: 'alto',
      riesgoDescripcion: 'Muy condicional. Requiere éxito demostrado en Waves 1-3.',
      proveedor: 'BEYOND (Voicebot + IVR + Chatbot)'
    }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.7: Escenarios con cálculos TCO y ROI corregidos
  // Fórmulas:
  // - AUGMENT: Vol × 12 × 15% × (€2.33 - €2.00) = Vol × 12 × 0.15 × €0.33
  // - ASSIST: Vol × 12 × 30% × (€2.33 - €1.50) = Vol × 12 × 0.30 × €0.83
  // - AUTOMATE: Vol × 12 × 70% × (€2.33 - €0.15) = Vol × 12 × 0.70 × €2.18
  //
  // ROI 3 años = ((Ahorro×3) - (Inversión + Recurrente×3)) / (Inversión + Recurrente×3) × 100
  // ═══════════════════════════════════════════════════════════════════════════

  // Calcular valores dinámicos para escenarios
  const wave1Setup = 47000;
  const wave2Setup = 35000;
  const wave2Rec = 40000;
  const wave3Setup = 70000;
  const wave3Rec = 78000;
  const wave4Setup = 85000;
  const wave4Rec = 108000;

  const wave2Savings = potentialSavings.AUGMENT || Math.round(tierVolumes.AUGMENT * 12 * 0.15 * 0.33);
  const wave3Savings = potentialSavings.ASSIST || Math.round(tierVolumes.ASSIST * 12 * 0.30 * 0.83);
  const wave4Savings = potentialSavings.AUTOMATE || Math.round(tierVolumes.AUTOMATE * 12 * 0.70 * 2.18);

  // Escenario 1: Conservador (Wave 1-2: FOUNDATION + AUGMENT)
  const consInversion = wave1Setup + wave2Setup;
  const consRec = wave2Rec;
  const consSavings = wave2Savings;
  const consMargen = consSavings - consRec;
  const consSavingsAjustado = calculateRiskAdjustedSavings(wave2Savings, 0, 0, ['wave2']);

  // Escenario 2: Moderado (Wave 1-3: + ASSIST)
  const modInversion = consInversion + wave3Setup;
  const modRec = consRec + wave3Rec;
  const modSavings = consSavings + wave3Savings;
  const modMargen = modSavings - modRec;
  const modSavingsAjustado = calculateRiskAdjustedSavings(wave2Savings, wave3Savings, 0, ['wave2', 'wave3']);

  // Escenario 3: Agresivo (Wave 1-4: + AUTOMATE)
  const agrInversion = modInversion + wave4Setup;
  const agrRec = modRec + wave4Rec;
  const agrSavings = modSavings + wave4Savings;
  const agrMargen = agrSavings - agrRec;
  const agrSavingsAjustado = calculateRiskAdjustedSavings(wave2Savings, wave3Savings, wave4Savings, ['wave2', 'wave3', 'wave4']);

  // v3.8: Calcular si cada escenario es habilitador y qué potencial desbloquea
  const consEsHabilitador = isEnablingScenario(consMargen, consInversion, ['wave1', 'wave2']);
  const modEsHabilitador = isEnablingScenario(modMargen, modInversion, ['wave1', 'wave2', 'wave3']);
  const agrEsHabilitador = isEnablingScenario(agrMargen, agrInversion, ['wave1', 'wave2', 'wave3', 'wave4']);

  // Potencial que habilita cada escenario (ahorro de waves que desbloquea)
  const consPotencialHabilitado = wave3Savings + wave4Savings; // Conservador habilita Wave 3-4
  const modPotencialHabilitado = wave4Savings; // Moderado habilita Wave 4
  const agrPotencialHabilitado = 0; // Agresivo ya incluye todo

  // v3.9: Calcular payback completo para cada escenario
  const consPaybackInfo = calcularPaybackCompleto(
    consInversion, consMargen, consSavings,
    ['wave1', 'wave2'], consEsHabilitador, false
  );
  const modPaybackInfo = calcularPaybackCompleto(
    modInversion, modMargen, modSavings,
    ['wave1', 'wave2', 'wave3'], modEsHabilitador, false
  );
  // Agresivo incluye Wave 4 (Quick Wins potenciales si hay AUTOMATE queues)
  const agrIncluyeQuickWin = tierCounts.AUTOMATE.length >= 3;
  const agrPaybackInfo = calcularPaybackCompleto(
    agrInversion, agrMargen, agrSavings,
    ['wave1', 'wave2', 'wave3', 'wave4'], agrEsHabilitador, agrIncluyeQuickWin
  );

  const escenarios: EscenarioData[] = [
    {
      id: 'conservador',
      nombre: 'Conservador',
      descripcion: 'FOUNDATION + AUGMENT (Wave 1-2)',
      waves: ['wave1', 'wave2'],
      inversionTotal: consInversion,
      costoRecurrenteAnual: consRec,
      ahorroAnual: consSavings,
      ahorroAjustado: consSavingsAjustado,
      margenAnual: consMargen,
      paybackMeses: calculatePayback(consInversion, consMargen),
      paybackInfo: consPaybackInfo,
      roi3Anos: calculateROI3Years(consInversion, consRec, consSavings),
      roi3AnosAjustado: calculateROI3Years(consInversion, consRec, consSavingsAjustado),
      riesgo: 'bajo',
      recomendacion: consEsHabilitador
        ? `✅ Recomendado como HABILITADOR. Desbloquea ${formatCurrency(consPotencialHabilitado)}/año en Wave 3-4. Objetivo: mover ${Math.ceil(wave1Queues.length * 0.3)} colas de Tier 4→3.`
        : `✅ Recomendado. Validar modelo con riesgo bajo. Objetivo: mover ${Math.ceil(wave1Queues.length * 0.3)} colas de Tier 4→3.`,
      esRecomendado: true,
      esRentable: consMargen > 0,
      esHabilitador: consEsHabilitador,
      potencialHabilitado: consPotencialHabilitado,
      wavesHabilitadas: ['Wave 3', 'Wave 4'],
      incluyeQuickWin: false
    },
    {
      id: 'moderado',
      nombre: 'Moderado',
      descripcion: 'FOUNDATION + AUGMENT + ASSIST (Wave 1-3)',
      waves: ['wave1', 'wave2', 'wave3'],
      inversionTotal: modInversion,
      costoRecurrenteAnual: modRec,
      ahorroAnual: modSavings,
      ahorroAjustado: modSavingsAjustado,
      margenAnual: modMargen,
      paybackMeses: calculatePayback(modInversion, modMargen),
      paybackInfo: modPaybackInfo,
      roi3Anos: calculateROI3Years(modInversion, modRec, modSavings),
      roi3AnosAjustado: calculateROI3Years(modInversion, modRec, modSavingsAjustado),
      riesgo: 'medio',
      recomendacion: modEsHabilitador
        ? `Habilitador parcial. Desbloquea ${formatCurrency(modPotencialHabilitado)}/año en Wave 4. Decidir Go/No-Go en Q3 2026.`
        : `Decidir Go/No-Go en Q3 2026 basado en resultados Wave 1-2. Requiere Score ≥5.5 en colas target.`,
      esRecomendado: false,
      esRentable: modMargen > 0,
      esHabilitador: modEsHabilitador,
      potencialHabilitado: modPotencialHabilitado,
      wavesHabilitadas: ['Wave 4'],
      incluyeQuickWin: false
    },
    {
      id: 'agresivo',
      nombre: 'Agresivo',
      descripcion: 'Roadmap completo (Wave 1-4)',
      waves: ['wave1', 'wave2', 'wave3', 'wave4'],
      inversionTotal: agrInversion,
      costoRecurrenteAnual: agrRec,
      ahorroAnual: agrSavings,
      ahorroAjustado: agrSavingsAjustado,
      margenAnual: agrMargen,
      paybackMeses: calculatePayback(agrInversion, agrMargen),
      paybackInfo: agrPaybackInfo,
      roi3Anos: calculateROI3Years(agrInversion, agrRec, agrSavings),
      roi3AnosAjustado: calculateROI3Years(agrInversion, agrRec, agrSavingsAjustado),
      riesgo: 'alto',
      recomendacion: agrMargen > 0
        ? `⚠️ Aspiracional. Solo si Waves 1-3 exitosas y hay colas con Score ≥7.5. Decisión en Q1 2027.`
        : `❌ No rentable con el volumen actual. Requiere escala significativamente mayor.`,
      esRecomendado: false,
      esRentable: agrMargen > 0,
      esHabilitador: false, // Agresivo incluye todo, no es habilitador
      potencialHabilitado: 0,
      wavesHabilitadas: [],
      incluyeQuickWin: agrIncluyeQuickWin
    }
  ];

  const escenarioRecomendado = escenarios.find(e => e.esRecomendado)!;

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.11: Cálculo de métricas para footer (considera Enfoque Dual si aplica)
  // ═══════════════════════════════════════════════════════════════════════════

  // Lógica para determinar tipo de recomendación (misma que en sección DUAL)
  const automateQueuesWithVolume = tierCounts.AUTOMATE.filter(q => q.volume >= 50);
  const automateVolumeSignificant = tierVolumes.AUTOMATE >= 10000;
  const hasQuickWinsGlobal = automateQueuesWithVolume.length >= 3 && automateVolumeSignificant;

  const assistPctGlobal = totalVolume > 0 ? (tierVolumes.ASSIST / totalVolume) * 100 : 0;
  const hasAssistOpportunityGlobal = tierCounts.ASSIST.length >= 3 && assistPctGlobal >= 10;

  type RecommendationType = 'DUAL' | 'FOUNDATION' | 'STANDARDIZATION';
  const recTypeGlobal: RecommendationType = hasQuickWinsGlobal ? 'DUAL'
    : hasAssistOpportunityGlobal ? 'FOUNDATION'
    : 'STANDARDIZATION';

  // Métricas de Quick Win piloto (para combinar si es DUAL)
  const pilotQueuesGlobal = tierCounts.AUTOMATE
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 3);
  const pilotVolumeGlobal = pilotQueuesGlobal.reduce((s, q) => s + q.volume, 0);
  const pilotPctOfAutomateGlobal = tierVolumes.AUTOMATE > 0 ? pilotVolumeGlobal / tierVolumes.AUTOMATE : 0;

  const FACTOR_RIESGO_GLOBAL = 0.50;
  const pilotSetupGlobal = Math.round(wave4Setup * 0.35);
  const pilotRecurrenteGlobal = Math.round(wave4Rec * 0.35);
  const pilotAhorroBrutoGlobal = Math.round(potentialSavings.AUTOMATE * pilotPctOfAutomateGlobal);
  const pilotAhorroAjustadoGlobal = Math.round(pilotAhorroBrutoGlobal * FACTOR_RIESGO_GLOBAL);

  // Métricas combinadas para footer (Quick Win + Foundation si es DUAL)
  const footerMetrics = recTypeGlobal === 'DUAL' ? {
    tipo: 'dual' as const,
    inversion: pilotSetupGlobal + escenarioRecomendado.inversionTotal,
    recurrente: pilotRecurrenteGlobal + escenarioRecomendado.costoRecurrenteAnual,
    ahorro: pilotAhorroAjustadoGlobal + escenarioRecomendado.ahorroAnual,
    // ROI combinado a 3 años
    roi3Anos: (() => {
      const invTotal = pilotSetupGlobal + escenarioRecomendado.inversionTotal;
      const recTotal = pilotRecurrenteGlobal + escenarioRecomendado.costoRecurrenteAnual;
      const ahorroTotal = pilotAhorroAjustadoGlobal + escenarioRecomendado.ahorroAnual;
      const costoTotal3a = invTotal + (recTotal * 3);
      const beneficio3a = ahorroTotal * 3;
      return costoTotal3a > 0 ? Math.round(((beneficio3a - costoTotal3a) / costoTotal3a) * 100) : 0;
    })(),
    pilotSetup: pilotSetupGlobal,
    pilotRecurrente: pilotRecurrenteGlobal,
    pilotAhorro: pilotAhorroAjustadoGlobal,
    foundationInversion: escenarioRecomendado.inversionTotal,
    foundationAhorro: escenarioRecomendado.ahorroAnual
  } : {
    tipo: 'escenario' as const,
    inversion: escenarioRecomendado.inversionTotal,
    recurrente: escenarioRecomendado.costoRecurrenteAnual,
    ahorro: escenarioRecomendado.ahorroAnual,
    roi3Anos: escenarioRecomendado.roi3Anos,
    pilotSetup: 0,
    pilotRecurrente: 0,
    pilotAhorro: 0,
    foundationInversion: 0,
    foundationAhorro: 0
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.7: Criterios de Entrada/Salida y Colas Prioritarias por Wave
  // ═══════════════════════════════════════════════════════════════════════════

  // Wave 1: FOUNDATION - Colas Tier 3-4 que necesitan estandarización
  const wave1EntryCriteria: WaveEntryCriteria = {
    tierFrom: ['HUMAN-ONLY (4)', 'AUGMENT (3)'],
    scoreRange: '<5.5',
    requiredMetrics: ['CV >75% o Transfer >20%', 'Red Flags activos', 'Procesos no documentados']
  };
  const wave1ExitCriteria: WaveExitCriteria = {
    tierTo: 'AUGMENT (3) mínimo',
    scoreTarget: '≥3.5',
    kpiTargets: ['CV ≤75%', 'Transfer ≤20%', 'Red flags eliminados']
  };
  const wave1PriorityQueues: PriorityQueue[] = [...tierCounts['HUMAN-ONLY'], ...tierCounts.AUGMENT]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5)
    .map(q => ({
      name: q.original_queue_id,
      volume: q.volume,
      currentScore: q.agenticScore,
      currentTier: q.tier,
      potentialSavings: calculateTCOSavings(q.volume, 'AUGMENT'), // Potencial si llega a Tier 3
      redFlags: detectRedFlags(q)  // v3.7: Detectar red flags
    }));

  // Wave 2: AUGMENT - Colas Tier 3 con potencial de mejora
  const wave2EntryCriteria: WaveEntryCriteria = {
    tierFrom: ['AUGMENT (3)'],
    scoreRange: '3.5-5.5',
    requiredMetrics: ['CV ≤75%', 'Transfer ≤20%', 'Sin Red Flags']
  };
  const wave2ExitCriteria: WaveExitCriteria = {
    tierTo: 'ASSIST (2)',
    scoreTarget: '≥5.5',
    kpiTargets: ['CV ≤90%', 'Transfer ≤30%', 'AHT -15%']
  };
  const wave2PriorityQueues: PriorityQueue[] = tierCounts.AUGMENT
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5)
    .map(q => ({
      name: q.original_queue_id,
      volume: q.volume,
      currentScore: q.agenticScore,
      currentTier: q.tier,
      potentialSavings: calculateTCOSavings(q.volume, 'ASSIST'),
      redFlags: detectRedFlags(q)  // v3.7: Detectar red flags
    }));

  // Wave 3: ASSIST - Colas Tier 2 listas para copilot
  const wave3EntryCriteria: WaveEntryCriteria = {
    tierFrom: ['ASSIST (2)'],
    scoreRange: '5.5-7.5',
    requiredMetrics: ['CV ≤90%', 'Transfer ≤30%', 'AHT estable']
  };
  const wave3ExitCriteria: WaveExitCriteria = {
    tierTo: 'AUTOMATE (1)',
    scoreTarget: '≥7.5',
    kpiTargets: ['CV ≤75%', 'Transfer ≤20%', 'FCR ≥50%', 'AHT -30%']
  };
  const wave3PriorityQueues: PriorityQueue[] = tierCounts.ASSIST
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5)
    .map(q => ({
      name: q.original_queue_id,
      volume: q.volume,
      currentScore: q.agenticScore,
      currentTier: q.tier,
      potentialSavings: calculateTCOSavings(q.volume, 'AUTOMATE'),
      redFlags: detectRedFlags(q)  // v3.7: Detectar red flags
    }));

  // Wave 4: AUTOMATE - Colas Tier 1 listas para automatización completa
  const wave4EntryCriteria: WaveEntryCriteria = {
    tierFrom: ['AUTOMATE (1)'],
    scoreRange: '≥7.5',
    requiredMetrics: ['CV ≤75%', 'Transfer ≤20%', 'FCR ≥50%', 'Sin Red Flags']
  };
  const wave4ExitCriteria: WaveExitCriteria = {
    tierTo: 'AUTOMATIZADO',
    scoreTarget: 'Contención ≥70%',
    kpiTargets: ['Bot resolution ≥70%', 'CSAT ≥4/5', 'Escalado <30%']
  };
  const wave4PriorityQueues: PriorityQueue[] = tierCounts.AUTOMATE
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5)
    .map(q => ({
      name: q.original_queue_id,
      volume: q.volume,
      currentScore: q.agenticScore,
      currentTier: q.tier,
      potentialSavings: calculateTCOSavings(q.volume, 'AUTOMATE'),
      redFlags: detectRedFlags(q)  // v3.7: Detectar red flags
    }));

  // Map de criterios y colas por wave
  const waveConfigs: Record<string, { entry: WaveEntryCriteria; exit: WaveExitCriteria; queues: PriorityQueue[] }> = {
    wave1: { entry: wave1EntryCriteria, exit: wave1ExitCriteria, queues: wave1PriorityQueues },
    wave2: { entry: wave2EntryCriteria, exit: wave2ExitCriteria, queues: wave2PriorityQueues },
    wave3: { entry: wave3EntryCriteria, exit: wave3ExitCriteria, queues: wave3PriorityQueues },
    wave4: { entry: wave4EntryCriteria, exit: wave4ExitCriteria, queues: wave4PriorityQueues }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Calcular totales para Resumen Ejecutivo
  // ═══════════════════════════════════════════════════════════════════════════
  const totalSavingsPotential = potentialSavings.AUTOMATE + potentialSavings.ASSIST + potentialSavings.AUGMENT;
  const totalQueues = allQueues.length || heatmapData.length || 1;

  // Determinar recomendación específica según estado actual
  const getSpecificRecommendation = (): { action: string; rationale: string; nextStep: string } => {
    const automateCount = tierCounts.AUTOMATE.length;
    const assistCount = tierCounts.ASSIST.length;
    const humanOnlyCount = tierCounts['HUMAN-ONLY'].length;
    const totalHighTier = automateCount + assistCount;
    const pctHighTier = totalQueues > 0 ? (totalHighTier / totalQueues) * 100 : 0;

    if (automateCount >= 3) {
      return {
        action: 'Lanzar Wave 4 (AUTOMATE) en piloto',
        rationale: `${automateCount} colas ya tienen Score ≥7.5 con volumen de ${tierVolumes.AUTOMATE.toLocaleString()} int/mes.`,
        nextStep: `Iniciar piloto de automatización en las 2-3 colas de mayor volumen con ahorro potencial de ${formatCurrency(potentialSavings.AUTOMATE)}/año.`
      };
    } else if (assistCount >= 5 || pctHighTier >= 30) {
      return {
        action: 'Iniciar Wave 3 (ASSIST) con Copilot',
        rationale: `${assistCount} colas tienen Score 5.5-7.5, representando ${Math.round((tierVolumes.ASSIST / totalVolume) * 100)}% del volumen.`,
        nextStep: `Desplegar Copilot IA en colas Tier 2 para elevar score a ≥7.5 y habilitar Wave 4. Inversión: ${formatCurrency(wave3Setup)}.`
      };
    } else if (humanOnlyCount > totalQueues * 0.5) {
      return {
        action: 'Priorizar Wave 1 (FOUNDATION)',
        rationale: `${humanOnlyCount} colas (${Math.round((humanOnlyCount / totalQueues) * 100)}%) tienen Red Flags que impiden automatización.`,
        nextStep: `Estandarizar procesos antes de invertir en IA. La automatización sin fundamentos sólidos fracasa en 80%+ de casos.`
      };
    } else {
      return {
        action: 'Ejecutar Wave 1-2 secuencialmente',
        rationale: `Operación mixta: ${automateCount} colas Tier 1, ${assistCount} Tier 2, ${tierCounts.AUGMENT.length} Tier 3, ${humanOnlyCount} Tier 4.`,
        nextStep: `Comenzar con FOUNDATION para eliminar red flags, seguido de AUGMENT para elevar scores. Inversión inicial: ${formatCurrency(wave1Setup + wave2Setup)}.`
      };
    }
  };

  const recommendation = getSpecificRecommendation();

  // v3.16: Estados para secciones colapsables - detalle expandido por defecto
  const [waveDetailExpanded, setWaveDetailExpanded] = React.useState(true);
  const [showAllWaves, setShowAllWaves] = React.useState(true);

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════════════
          v3.17: BLOQUE 1 - RESUMEN EJECUTIVO (primero)
          ═══════════════════════════════════════════════════════════════════════════ */}
      <Card padding="none">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Clasificación por Potencial de Automatización
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {totalQueues} colas clasificadas en 4 Tiers según su preparación para IA • {totalVolume.toLocaleString()} interacciones/mes
          </p>
        </div>

        <div className="p-3 sm:p-5 space-y-4 sm:space-y-5 bg-gray-50">
          {/* Distribución por Tier */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {/* Tier 1: AUTOMATE */}
            <div className="p-3 rounded-lg border-2 border-emerald-300 bg-emerald-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Rocket className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-emerald-600 font-medium">TIER 1</p>
                  <p className="text-xs font-bold text-emerald-800">AUTOMATE</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-emerald-700">{tierCounts.AUTOMATE.length}</p>
                <p className="text-[10px] text-emerald-600">
                  {tierVolumes.AUTOMATE.toLocaleString()} int/mes
                </p>
                <p className="text-[10px] text-emerald-500">
                  ({Math.round((tierVolumes.AUTOMATE / totalVolume) * 100)}% volumen)
                </p>
                <p className="text-xs font-semibold text-emerald-700 pt-1 border-t border-emerald-200">
                  {formatCurrency(potentialSavings.AUTOMATE)}/año
                </p>
              </div>
            </div>

            {/* Tier 2: ASSIST */}
            <div className="p-3 rounded-lg border-2 border-blue-300 bg-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-blue-600 font-medium">TIER 2</p>
                  <p className="text-xs font-bold text-blue-800">ASSIST</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-blue-700">{tierCounts.ASSIST.length}</p>
                <p className="text-[10px] text-blue-600">
                  {tierVolumes.ASSIST.toLocaleString()} int/mes
                </p>
                <p className="text-[10px] text-blue-500">
                  ({Math.round((tierVolumes.ASSIST / totalVolume) * 100)}% volumen)
                </p>
                <p className="text-xs font-semibold text-blue-700 pt-1 border-t border-blue-200">
                  {formatCurrency(potentialSavings.ASSIST)}/año
                </p>
              </div>
            </div>

            {/* Tier 3: AUGMENT */}
            <div className="p-3 rounded-lg border-2 border-amber-300 bg-amber-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-amber-600 font-medium">TIER 3</p>
                  <p className="text-xs font-bold text-amber-800">AUGMENT</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-amber-700">{tierCounts.AUGMENT.length}</p>
                <p className="text-[10px] text-amber-600">
                  {tierVolumes.AUGMENT.toLocaleString()} int/mes
                </p>
                <p className="text-[10px] text-amber-500">
                  ({Math.round((tierVolumes.AUGMENT / totalVolume) * 100)}% volumen)
                </p>
                <p className="text-xs font-semibold text-amber-700 pt-1 border-t border-amber-200">
                  {formatCurrency(potentialSavings.AUGMENT)}/año
                </p>
              </div>
            </div>

            {/* Tier 4: HUMAN-ONLY */}
            <div className="p-3 rounded-lg border-2 border-red-300 bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-red-600 font-medium">TIER 4</p>
                  <p className="text-xs font-bold text-red-800">HUMAN-ONLY</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-red-700">{tierCounts['HUMAN-ONLY'].length}</p>
                <p className="text-[10px] text-red-600">
                  {tierVolumes['HUMAN-ONLY'].toLocaleString()} int/mes
                </p>
                <p className="text-[10px] text-red-500">
                  ({Math.round((tierVolumes['HUMAN-ONLY'] / totalVolume) * 100)}% volumen)
                </p>
                <p className="text-xs font-semibold text-red-700 pt-1 border-t border-red-200">
                  €0/año (Red flags)
                </p>
              </div>
            </div>
          </div>

          {/* Barra de distribución visual */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 font-medium mb-2">Distribución del volumen por tier:</p>
            <div className="h-6 rounded-full overflow-hidden flex">
              {tierVolumes.AUTOMATE > 0 && (
                <div
                  className="bg-emerald-500 flex items-center justify-center"
                  style={{ width: `${(tierVolumes.AUTOMATE / totalVolume) * 100}%` }}
                >
                  {(tierVolumes.AUTOMATE / totalVolume) >= 0.1 && (
                    <span className="text-[9px] text-white font-bold">{Math.round((tierVolumes.AUTOMATE / totalVolume) * 100)}%</span>
                  )}
                </div>
              )}
              {tierVolumes.ASSIST > 0 && (
                <div
                  className="bg-blue-500 flex items-center justify-center"
                  style={{ width: `${(tierVolumes.ASSIST / totalVolume) * 100}%` }}
                >
                  {(tierVolumes.ASSIST / totalVolume) >= 0.1 && (
                    <span className="text-[9px] text-white font-bold">{Math.round((tierVolumes.ASSIST / totalVolume) * 100)}%</span>
                  )}
                </div>
              )}
              {tierVolumes.AUGMENT > 0 && (
                <div
                  className="bg-amber-500 flex items-center justify-center"
                  style={{ width: `${(tierVolumes.AUGMENT / totalVolume) * 100}%` }}
                >
                  {(tierVolumes.AUGMENT / totalVolume) >= 0.1 && (
                    <span className="text-[9px] text-white font-bold">{Math.round((tierVolumes.AUGMENT / totalVolume) * 100)}%</span>
                  )}
                </div>
              )}
              {tierVolumes['HUMAN-ONLY'] > 0 && (
                <div
                  className="bg-red-500 flex items-center justify-center"
                  style={{ width: `${(tierVolumes['HUMAN-ONLY'] / totalVolume) * 100}%` }}
                >
                  {(tierVolumes['HUMAN-ONLY'] / totalVolume) >= 0.1 && (
                    <span className="text-[9px] text-white font-bold">{Math.round((tierVolumes['HUMAN-ONLY'] / totalVolume) * 100)}%</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* RECOMENDACIÓN ESTRATÉGICA - Unifica mensajes con lógica condicional */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {(() => {
            // Lógica de decisión
            const automateQueuesWithVolume = tierCounts.AUTOMATE.filter(q => q.volume >= 50);
            const automateVolumeSignificant = tierVolumes.AUTOMATE >= 10000; // ≥10K int/mes
            const hasQuickWins = automateQueuesWithVolume.length >= 3 && automateVolumeSignificant;

            const assistPct = totalVolume > 0 ? (tierVolumes.ASSIST / totalVolume) * 100 : 0;
            const hasAssistOpportunity = tierCounts.ASSIST.length >= 3 && assistPct >= 10;

            const humanOnlyPct = totalVolume > 0 ? (tierVolumes['HUMAN-ONLY'] / totalVolume) * 100 : 0;
            const augmentPct = totalVolume > 0 ? (tierVolumes.AUGMENT / totalVolume) * 100 : 0;
            const needsStandardization = (humanOnlyPct + augmentPct) >= 60;

            // Determinar tipo de recomendación
            type RecommendationType = 'DUAL' | 'FOUNDATION' | 'STANDARDIZATION';
            let recType: RecommendationType;

            if (hasQuickWins) {
              recType = 'DUAL'; // Quick Win paralelo + Foundation secuencial
            } else if (hasAssistOpportunity) {
              recType = 'FOUNDATION'; // Wave 1-2 para habilitar
            } else {
              recType = 'STANDARDIZATION'; // Solo Wave 1
            }

            // Calcular métricas para Quick Win piloto
            const pilotQueues = tierCounts.AUTOMATE
              .sort((a, b) => b.volume - a.volume)
              .slice(0, 3);
            const pilotVolume = pilotQueues.reduce((s, q) => s + q.volume, 0);
            const pilotPctOfAutomate = tierVolumes.AUTOMATE > 0 ? pilotVolume / tierVolumes.AUTOMATE : 0;

            // v3.11: Cálculo completo de ROI piloto (setup + recurrente + factor riesgo)
            const FACTOR_RIESGO_PILOTO = 0.50;  // 50% éxito conservador para piloto
            const pilotSetup = Math.round(wave4Setup * 0.35);  // 35% del setup Wave 4
            const pilotRecurrente = Math.round(wave4Rec * 0.35);  // 35% del recurrente anual
            const pilotInversionTotal = pilotSetup + pilotRecurrente;  // Coste total Year 1
            const pilotAhorroBruto = Math.round(potentialSavings.AUTOMATE * pilotPctOfAutomate);
            const pilotAhorroAjustado = Math.round(pilotAhorroBruto * FACTOR_RIESGO_PILOTO);
            const pilotROICalculado = pilotInversionTotal > 0
              ? Math.round(((pilotAhorroAjustado - pilotInversionTotal) / pilotInversionTotal) * 100)
              : 0;

            // Formatear ROI para credibilidad ejecutiva (cap visual)
            const formatPilotROI = (roi: number): { display: string; tooltip: string; showCap: boolean } => {
              if (roi > 1000) {
                return { display: '>1000%', tooltip: `ROI calculado: ${roi.toLocaleString()}%`, showCap: true };
              }
              if (roi > 500) {
                return { display: '>500%', tooltip: `ROI calculado: ${roi}%`, showCap: true };
              }
              if (roi > 300) {
                return { display: `${roi}%`, tooltip: 'ROI alto - validar con piloto', showCap: false };
              }
              return { display: `${roi}%`, tooltip: '', showCap: false };
            };
            const pilotROIDisplay = formatPilotROI(pilotROICalculado);

            // Skills afectados
            const quickWinSkills = [...new Set(
              drilldownData
                .filter(s => s.originalQueues.some(q => q.tier === 'AUTOMATE' && pilotQueues.some(p => p.original_queue_id === q.original_queue_id)))
                .map(s => s.skill)
            )].slice(0, 3);

            const wave1Skills = [...new Set(
              drilldownData
                .filter(s => s.originalQueues.some(q => q.tier === 'HUMAN-ONLY' || q.tier === 'AUGMENT'))
                .map(s => s.skill)
            )].slice(0, 3);

            // Configuración simplificada por tipo
            const typeConfig = {
              DUAL: {
                label: 'Nuestra Recomendación: Estrategia Dual',
                sublabel: 'Ejecutar dos líneas de trabajo en paralelo para maximizar el impacto'
              },
              FOUNDATION: {
                label: 'Nuestra Recomendación: Foundation First',
                sublabel: 'Preparar la operación antes de automatizar'
              },
              STANDARDIZATION: {
                label: 'Nuestra Recomendación: Estandarización',
                sublabel: 'Resolver problemas operativos críticos antes de invertir en IA'
              }
            };

            const config = typeConfig[recType];

            return (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <p className="font-semibold text-gray-900">{config.label}</p>
                  <p className="text-xs text-gray-500">{config.sublabel}</p>
                </div>

                <div className="p-4 space-y-4">
                  {/* ENFOQUE DUAL: Explicación + Tabla comparativa */}
                  {recType === 'DUAL' && (
                    <>
                      {/* Explicación de los dos tracks */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="font-semibold text-gray-800 mb-1">Track A: Quick Win</p>
                          <p className="text-xs text-gray-600">
                            Automatización inmediata de las colas ya preparadas (Tier AUTOMATE).
                            Genera retorno desde el primer mes y valida el modelo de IA con bajo riesgo.
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="font-semibold text-gray-800 mb-1">Track B: Foundation</p>
                          <p className="text-xs text-gray-600">
                            Preparación de las colas que aún no están listas (Tier 3-4).
                            Estandariza procesos y reduce variabilidad para habilitar automatización futura.
                          </p>
                        </div>
                      </div>

                      {/* Tabla comparativa */}
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 font-medium text-gray-500"></th>
                            <th className="text-center py-2 font-medium text-gray-700">Quick Win</th>
                            <th className="text-center py-2 font-medium text-gray-700">Foundation</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-600">
                          <tr className="border-b border-gray-100">
                            <td className="py-2 text-gray-500 text-xs">Alcance</td>
                            <td className="py-2 text-center">
                              <span className="font-medium text-gray-800">{pilotQueues.length} colas</span>
                              <span className="text-xs text-gray-400 block">{pilotVolume.toLocaleString()} int/mes</span>
                            </td>
                            <td className="py-2 text-center">
                              <span className="font-medium text-gray-800">{tierCounts['HUMAN-ONLY'].length + tierCounts.AUGMENT.length} colas</span>
                              <span className="text-xs text-gray-400 block">Wave 1 + Wave 2</span>
                            </td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="py-2 text-gray-500 text-xs">Inversión</td>
                            <td className="py-2 text-center font-medium text-gray-800">{formatCurrency(pilotInversionTotal)}</td>
                            <td className="py-2 text-center font-medium text-gray-800">{formatCurrency(wave1Setup + wave2Setup)}</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="py-2 text-gray-500 text-xs">Retorno</td>
                            <td className="py-2 text-center">
                              <span className="font-medium text-gray-800">{formatCurrency(pilotAhorroAjustado)}/año</span>
                              <span className="text-xs text-gray-400 block">directo (ajustado 50%)</span>
                            </td>
                            <td className="py-2 text-center">
                              <span className="font-medium text-gray-800">{formatCurrency(potentialSavings.ASSIST + potentialSavings.AUGMENT)}/año</span>
                              <span className="text-xs text-gray-400 block">habilitado (indirecto)</span>
                            </td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td className="py-2 text-gray-500 text-xs">Timeline</td>
                            <td className="py-2 text-center text-gray-800">2-3 meses</td>
                            <td className="py-2 text-center text-gray-800">6-9 meses</td>
                          </tr>
                          <tr>
                            <td className="py-2 text-gray-500 text-xs">ROI Year 1</td>
                            <td className="py-2 text-center">
                              <span className="font-semibold text-gray-900">{pilotROIDisplay.display}</span>
                            </td>
                            <td className="py-2 text-center text-gray-500 text-xs">No aplica (habilitador)</td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="text-xs text-gray-500 border-t border-gray-100 pt-3">
                        <strong className="text-gray-700">¿Por qué dos tracks?</strong> Quick Win genera caja y confianza desde el inicio.
                        Foundation prepara el {Math.round(assistPct + augmentPct)}% restante del volumen para fases posteriores.
                        Ejecutarlos en paralelo acelera el time-to-value total.
                      </div>
                    </>
                  )}

                  {/* FOUNDATION PRIMERO */}
                  {recType === 'FOUNDATION' && (
                    <>
                      {/* Explicación */}
                      <div className="p-3 bg-gray-50 rounded-lg mb-3">
                        <p className="font-semibold text-gray-800 mb-1">¿Qué significa Foundation?</p>
                        <p className="text-xs text-gray-600">
                          La operación actual no tiene colas listas para automatizar directamente.
                          Foundation es la fase de preparación: estandarizar procesos, reducir variabilidad
                          y mejorar la calidad de datos para que la automatización posterior sea efectiva.
                        </p>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        {tierCounts.ASSIST.length} colas ASSIST ({Math.round(assistPct)}% del volumen)
                        pueden elevarse a Tier AUTOMATE tras completar Wave 1-2.
                      </p>

                      <div className="grid grid-cols-3 gap-4 text-sm border-t border-gray-100 pt-3">
                        <div>
                          <p className="text-xs text-gray-500">Inversión</p>
                          <p className="font-semibold text-gray-800">{formatCurrency(wave1Setup + wave2Setup)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Timeline</p>
                          <p className="font-semibold text-gray-800">6-9 meses</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Ahorro habilitado</p>
                          <p className="font-semibold text-gray-800">{formatCurrency(potentialSavings.ASSIST)}/año</p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 border-t border-gray-100 pt-3 mt-3">
                        <strong className="text-gray-700">Criterios para pasar a automatización:</strong> CV ≤90% · Transfer ≤30% · AHT -15%
                      </div>
                    </>
                  )}

                  {/* ESTANDARIZACIÓN URGENTE */}
                  {recType === 'STANDARDIZATION' && (
                    <>
                      {/* Explicación */}
                      <div className="p-3 bg-gray-50 rounded-lg mb-3">
                        <p className="font-semibold text-gray-800 mb-1">¿Por qué estandarización primero?</p>
                        <p className="text-xs text-gray-600">
                          Se han detectado "red flags" operativos críticos (alta variabilidad, muchas transferencias)
                          que harían fracasar cualquier proyecto de automatización. Invertir en IA ahora sería
                          malgastar recursos. Primero hay que estabilizar la operación.
                        </p>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        {Math.round(humanOnlyPct + augmentPct)}% del volumen presenta red flags (CV &gt;75%, Transfer &gt;20%).
                        Wave 1 es una inversión habilitadora sin retorno directo inmediato.
                      </p>

                      <div className="grid grid-cols-3 gap-4 text-sm border-t border-gray-100 pt-3">
                        <div>
                          <p className="text-xs text-gray-500">Inversión Wave 1</p>
                          <p className="font-semibold text-gray-800">{formatCurrency(wave1Setup)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Timeline</p>
                          <p className="font-semibold text-gray-800">3-4 meses</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Ahorro directo</p>
                          <p className="font-semibold text-gray-500">€0 (habilitador)</p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 border-t border-gray-100 pt-3 mt-3">
                        <strong className="text-gray-700">Objetivo:</strong> Reducir red flags en las {Math.min(10, tierCounts['HUMAN-ONLY'].length + tierCounts.AUGMENT.length)} colas principales. Reevaluar tras completar.
                      </div>
                    </>
                  )}

                  {/* Siguiente paso */}
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <p className="text-xs text-gray-500 mb-1">Siguiente paso recomendado:</p>
                    <p className="text-sm text-gray-700">
                      {recType === 'DUAL' && (
                        <>Iniciar piloto de automatización con las {pilotQueues.length} colas AUTOMATE, mientras se ejecuta Wave 1 (Foundation) en paralelo para preparar el resto.</>
                      )}
                      {recType === 'FOUNDATION' && (
                        <>Comenzar Wave 1 focalizando en las {Math.min(10, tierCounts['HUMAN-ONLY'].length)} colas de mayor volumen. Medir progreso mensual en CV y Transfer.</>
                      )}
                      {recType === 'STANDARDIZATION' && (
                        <>Realizar workshop de diagnóstico operacional para identificar las causas raíz de los red flags antes de planificar inversiones.</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════════
          v3.17: BLOQUE 2 - TIMELINE VISUAL DEL ROADMAP
          ═══════════════════════════════════════════════════════════════════════════ */}
      <RoadmapTimeline waves={waves} />

      {/* ═══════════════════════════════════════════════════════════════════════════
          v3.17: BLOQUE 3 - DETALLE POR WAVE (expandido por defecto)
          ═══════════════════════════════════════════════════════════════════════════ */}
      <Card padding="none">
        {/* Header colapsable */}
        <button
          onClick={() => setWaveDetailExpanded(!waveDetailExpanded)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-blue-500" />
            <div className="text-left">
              <h3 className="font-semibold text-gray-800">Detalle por Wave</h3>
              <p className="text-xs text-gray-500">Iniciativas, criterios de entrada/salida, inversión por fase</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {waveDetailExpanded ? 'Ocultar detalle' : 'Ver detalle'}
            </span>
            {waveDetailExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {/* Contenido expandible */}
        {waveDetailExpanded && (
          <div className="p-5 border-t border-gray-200">
            {/* Botón para expandir/colapsar todas las waves */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowAllWaves(!showAllWaves)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                {showAllWaves ? 'Colapsar todas' : 'Expandir todas'}
                {showAllWaves ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {waves.map((wave, idx) => {
                const config = waveConfigs[wave.id];
                return (
                  <WaveCard
                    key={wave.id}
                    wave={wave}
                    delay={idx * 0.1}
                    entryCriteria={config?.entry}
                    exitCriteria={config?.exit}
                    priorityQueues={config?.queues}
                  />
                );
              })}
            </div>
          </div>
        )}
      </Card>

    </div>
  );
}

export default RoadmapTab;
