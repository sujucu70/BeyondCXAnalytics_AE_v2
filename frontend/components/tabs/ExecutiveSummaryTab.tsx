import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, Activity, Clock, PhoneForwarded, Users, Bot, ChevronRight, BarChart3, Cpu, Map, Zap, Calendar } from 'lucide-react';
import type { AnalysisData, Finding, DrilldownDataPoint, HeatmapDataPoint } from '../../types';
import type { TabId } from '../DashboardHeader';
import {
  Card,
  Badge,
  SectionHeader,
  DistributionBar,
  Stat,
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

interface ExecutiveSummaryTabProps {
  data: AnalysisData;
  onTabChange?: (tab: TabId) => void;
}

// ============================================
// BENCHMARKS DE INDUSTRIA
// ============================================

type IndustryKey = 'aerolineas' | 'telecomunicaciones' | 'banca' | 'utilities' | 'retail' | 'general';

interface BenchmarkMetric {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  unidad: string;
  invertida: boolean;
}

interface IndustryBenchmarks {
  nombre: string;
  fuente: string;
  metricas: {
    aht: BenchmarkMetric;
    fcr: BenchmarkMetric;
    abandono: BenchmarkMetric;
    cpi: BenchmarkMetric;
  };
}

const BENCHMARKS_INDUSTRIA: Record<IndustryKey, IndustryBenchmarks> = {
  aerolineas: {
    nombre: 'Aerolíneas',
    fuente: 'COPC 2024, Dimension Data Global CX Report 2024',
    metricas: {
      aht: { p25: 320, p50: 380, p75: 450, p90: 520, unidad: 's', invertida: true },
      fcr: { p25: 55, p50: 68, p75: 78, p90: 85, unidad: '%', invertida: false },
      abandono: { p25: 8, p50: 5, p75: 3, p90: 2, unidad: '%', invertida: true },
      cpi: { p25: 4.50, p50: 3.50, p75: 2.80, p90: 2.20, unidad: '€', invertida: true }
    }
  },
  telecomunicaciones: {
    nombre: 'Telecomunicaciones',
    fuente: 'Contact Babel UK Report 2024, ICMI Benchmark Study',
    metricas: {
      aht: { p25: 380, p50: 420, p75: 500, p90: 600, unidad: 's', invertida: true },
      fcr: { p25: 50, p50: 65, p75: 75, p90: 82, unidad: '%', invertida: false },
      abandono: { p25: 10, p50: 6, p75: 4, p90: 2, unidad: '%', invertida: true },
      cpi: { p25: 5.00, p50: 4.00, p75: 3.20, p90: 2.50, unidad: '€', invertida: true }
    }
  },
  banca: {
    nombre: 'Banca & Finanzas',
    fuente: 'Deloitte Banking Benchmark 2024, McKinsey CX Survey',
    metricas: {
      aht: { p25: 280, p50: 340, p75: 420, p90: 500, unidad: 's', invertida: true },
      fcr: { p25: 58, p50: 72, p75: 82, p90: 88, unidad: '%', invertida: false },
      abandono: { p25: 6, p50: 4, p75: 2, p90: 1, unidad: '%', invertida: true },
      cpi: { p25: 6.00, p50: 4.50, p75: 3.50, p90: 2.80, unidad: '€', invertida: true }
    }
  },
  utilities: {
    nombre: 'Utilities & Energía',
    fuente: 'Dimension Data 2024, Utilities CX Benchmark',
    metricas: {
      aht: { p25: 350, p50: 400, p75: 480, p90: 560, unidad: 's', invertida: true },
      fcr: { p25: 52, p50: 67, p75: 77, p90: 84, unidad: '%', invertida: false },
      abandono: { p25: 9, p50: 6, p75: 4, p90: 2, unidad: '%', invertida: true },
      cpi: { p25: 4.20, p50: 3.30, p75: 2.60, p90: 2.00, unidad: '€', invertida: true }
    }
  },
  retail: {
    nombre: 'Retail & E-commerce',
    fuente: 'Zendesk CX Trends 2024, Salesforce State of Service',
    metricas: {
      aht: { p25: 240, p50: 300, p75: 380, p90: 450, unidad: 's', invertida: true },
      fcr: { p25: 60, p50: 73, p75: 82, p90: 89, unidad: '%', invertida: false },
      abandono: { p25: 7, p50: 4, p75: 2, p90: 1, unidad: '%', invertida: true },
      cpi: { p25: 3.80, p50: 2.80, p75: 2.10, p90: 1.60, unidad: '€', invertida: true }
    }
  },
  general: {
    nombre: 'Cross-Industry',
    fuente: 'Dimension Data Global CX Benchmark 2024',
    metricas: {
      aht: { p25: 320, p50: 380, p75: 460, p90: 540, unidad: 's', invertida: true },
      fcr: { p25: 55, p50: 70, p75: 80, p90: 87, unidad: '%', invertida: false },
      abandono: { p25: 8, p50: 5, p75: 3, p90: 2, unidad: '%', invertida: true },
      cpi: { p25: 4.50, p50: 3.50, p75: 2.80, p90: 2.20, unidad: '€', invertida: true }
    }
  }
};

function calcularPercentilUsuario(valor: number, bench: BenchmarkMetric): number {
  const { p25, p50, p75, p90, invertida } = bench;
  if (invertida) {
    // For inverted metrics (lower is better, like AHT, CPI, Abandono):
    // p25 = best performers (lowest values), p90 = worst performers (highest values)
    // Check from best to worst
    if (valor <= p25) return 95;  // Top 25% performers → beat 75%+
    if (valor <= p50) return 60;  // At or better than median → beat 50%+
    if (valor <= p75) return 35;  // Below median → beat 25%+
    if (valor <= p90) return 15;  // Poor → beat 10%+
    return 5;  // Very poor → beat <10%
  } else {
    // For normal metrics (higher is better, like FCR):
    // p90 = best performers (highest values), p25 = worst performers (lowest values)
    if (valor >= p90) return 95;
    if (valor >= p75) return 82;
    if (valor >= p50) return 60;
    if (valor >= p25) return 35;
    return 15;
  }
}


// ============================================
// PRINCIPALES HALLAZGOS
// ============================================

interface Hallazgo {
  tipo: 'critico' | 'warning' | 'info';
  texto: string;
  metrica?: string;
}

function generarHallazgos(data: AnalysisData): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  const allQueues = data.drilldownData?.flatMap(s => s.originalQueues) || [];
  const totalVolume = allQueues.reduce((s, q) => s + q.volume, 0);

  // AHT promedio ponderado por volumen (usando aht_seconds = AHT limpio sin noise/zombies)
  const heatmapVolume = data.heatmapData.reduce((sum, h) => sum + h.volume, 0);
  const avgAHT = heatmapVolume > 0
    ? data.heatmapData.reduce((sum, h) => sum + h.aht_seconds * h.volume, 0) / heatmapVolume
    : 0;

  // Alta variabilidad
  const colasAltaVariabilidad = allQueues.filter(q => q.cv_aht > 100);
  if (colasAltaVariabilidad.length > 0) {
    const pctVolumen = (colasAltaVariabilidad.reduce((s, q) => s + q.volume, 0) / totalVolume) * 100;
    hallazgos.push({
      tipo: 'critico',
      texto: `${colasAltaVariabilidad.length} colas con variabilidad crítica (CV >100%) representan ${pctVolumen.toFixed(0)}% del volumen`,
      metrica: 'CV AHT'
    });
  }

  // Alto transfer
  const colasAltoTransfer = allQueues.filter(q => q.transfer_rate > 25);
  if (colasAltoTransfer.length > 0) {
    hallazgos.push({
      tipo: 'warning',
      texto: `${colasAltoTransfer.length} colas con tasa de transferencia >25% - posible problema de routing o formación`,
      metrica: 'Transfer'
    });
  }

  // Bajo FCR (usar FCR Técnico para consistencia)
  const colasBajoFCR = allQueues.filter(q => (q.fcr_tecnico ?? (100 - q.transfer_rate)) < 50);
  if (colasBajoFCR.length > 0) {
    hallazgos.push({
      tipo: 'warning',
      texto: `${colasBajoFCR.length} colas con FCR <50% - clientes requieren múltiples contactos`,
      metrica: 'FCR'
    });
  }

  // AHT elevado vs benchmark
  if (avgAHT > 400) {
    hallazgos.push({
      tipo: 'warning',
      texto: `AHT promedio de ${Math.round(avgAHT)}s supera el benchmark de industria (380s)`,
      metrica: 'AHT'
    });
  }

  // Colas Human-Only
  const colasHumanOnly = allQueues.filter(q => q.tier === 'HUMAN-ONLY');
  if (colasHumanOnly.length > 0) {
    const pctHuman = (colasHumanOnly.reduce((s, q) => s + q.volume, 0) / totalVolume) * 100;
    hallazgos.push({
      tipo: 'info',
      texto: `${colasHumanOnly.length} colas (${pctHuman.toFixed(0)}% volumen) requieren intervención humana completa`,
      metrica: 'Tier'
    });
  }

  // Oportunidad de automatización
  const colasAutomate = allQueues.filter(q => q.tier === 'AUTOMATE');
  if (colasAutomate.length > 0) {
    hallazgos.push({
      tipo: 'info',
      texto: `${colasAutomate.length} colas listas para automatización con potencial de ahorro significativo`,
      metrica: 'Oportunidad'
    });
  }

  return hallazgos.slice(0, 5); // Máximo 5 hallazgos
}

function PrincipalesHallazgos({ data }: { data: AnalysisData }) {
  const hallazgos = generarHallazgos(data);

  if (hallazgos.length === 0) return null;

  const getIcono = (tipo: string) => {
    if (tipo === 'critico') return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (tipo === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    return <CheckCircle className="w-4 h-4 text-blue-500" />;
  };

  const getClase = (tipo: string) => {
    if (tipo === 'critico') return 'bg-red-50 border-red-200';
    if (tipo === 'warning') return 'bg-amber-50 border-amber-200';
    return 'bg-blue-50 border-blue-200';
  };

  return (
    <Card>
      <h3 className="font-semibold text-gray-900 mb-3">Principales Hallazgos</h3>
      <div className="space-y-2">
        {hallazgos.map((h, idx) => (
          <div key={idx} className={cn('flex items-start gap-2 p-2 rounded-lg border', getClase(h.tipo))}>
            {getIcono(h.tipo)}
            <div className="flex-1">
              <p className="text-sm text-gray-700">{h.texto}</p>
            </div>
            {h.metrica && (
              <span className="text-xs px-2 py-0.5 bg-white rounded border border-gray-200 text-gray-500">
                {h.metrica}
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================
// CABECERA CON PERIODO ANALIZADO
// ============================================

function CabeceraPeriodo({ data }: { data: AnalysisData }) {
  const totalInteractions = data.heatmapData.reduce((sum, h) => sum + h.volume, 0);

  // Contar colas únicas (original_queue_id) desde drilldownData
  const uniqueQueues = data.drilldownData
    ? new Set(data.drilldownData.flatMap(d => d.originalQueues.map(q => q.original_queue_id))).size
    : data.heatmapData.length;

  // Contar líneas de negocio únicas (skills en drilldownData = queue_skill agrupado)
  const numLineasNegocio = data.drilldownData?.length || data.heatmapData.length;

  // Formatear fechas del periodo
  const formatPeriodo = () => {
    if (!data.dateRange?.min || !data.dateRange?.max) {
      return 'Periodo no especificado';
    }
    const formatDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch {
        return dateStr;
      }
    };
    return `${formatDate(data.dateRange.min)} - ${formatDate(data.dateRange.max)}`;
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 py-3 px-3 sm:px-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 text-gray-600">
        <Calendar className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs sm:text-sm font-medium">Periodo:</span>
        <span className="text-xs sm:text-sm">{formatPeriodo()}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 md:gap-6 text-xs sm:text-sm text-gray-500">
        <span><strong>{formatNumber(totalInteractions)}</strong> int.</span>
        <span><strong>{uniqueQueues}</strong> colas</span>
        <span><strong>{numLineasNegocio}</strong> LN</span>
      </div>
    </div>
  );
}

// ============================================
// v3.15: HEADLINE EJECUTIVO (Situación)
// ============================================
function HeadlineEjecutivo({
  totalInteracciones,
  oportunidadTotal,
  eficienciaScore,
  resolucionScore,
  satisfaccionScore
}: {
  totalInteracciones: number;
  oportunidadTotal: number;
  eficienciaScore: number;
  resolucionScore: number;
  satisfaccionScore: number;
}) {
  const getStatusLabel = (score: number): string => {
    if (score >= 80) return 'Óptimo';
    if (score >= 60) return 'Aceptable';
    return 'Crítico';
  };

  const getStatusVariant = (score: number): 'success' | 'warning' | 'critical' => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'critical';
  };

  return (
    <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-4 sm:p-6 text-white">
      {/* Título principal */}
      <div className="mb-3 sm:mb-4">
        <h1 className="text-lg sm:text-xl md:text-2xl font-light mb-1">
          Tu operación procesa{' '}
          <span className="font-bold text-white">{formatNumber(totalInteracciones)}</span>{' '}
          interacciones
        </h1>
        <p className="text-sm sm:text-lg text-gray-300">
          con oportunidad de{' '}
          <span className="font-bold text-emerald-400">
            {formatCurrency(oportunidadTotal)}
          </span>{' '}
          en optimización
        </p>
      </div>

      {/* Status Bar */}
      <div className="flex flex-wrap gap-2 sm:gap-3 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-600">
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full',
          STATUS_CLASSES[getStatusVariant(eficienciaScore)].bg
        )}>
          <Clock className={cn('w-4 h-4', STATUS_CLASSES[getStatusVariant(eficienciaScore)].text)} />
          <span className={cn('text-sm font-medium', STATUS_CLASSES[getStatusVariant(eficienciaScore)].text)}>
            Eficiencia: {getStatusLabel(eficienciaScore)}
          </span>
        </div>
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full',
          STATUS_CLASSES[getStatusVariant(resolucionScore)].bg
        )}>
          <CheckCircle className={cn('w-4 h-4', STATUS_CLASSES[getStatusVariant(resolucionScore)].text)} />
          <span className={cn('text-sm font-medium', STATUS_CLASSES[getStatusVariant(resolucionScore)].text)}>
            Resolución: {getStatusLabel(resolucionScore)}
          </span>
        </div>
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full',
          STATUS_CLASSES[getStatusVariant(satisfaccionScore)].bg
        )}>
          <Users className={cn('w-4 h-4', STATUS_CLASSES[getStatusVariant(satisfaccionScore)].text)} />
          <span className={cn('text-sm font-medium', STATUS_CLASSES[getStatusVariant(satisfaccionScore)].text)}>
            Satisfacción: {getStatusLabel(satisfaccionScore)}
          </span>
        </div>
      </div>
    </div>
  );
}

// v7.0: Unified KPI + Benchmark Card Component
// Combines KeyMetricsCard + BenchmarkTable into single 3x2 card grid
function UnifiedKPIBenchmark({ heatmapData }: { heatmapData: HeatmapDataPoint[] }) {
  const [selectedIndustry, setSelectedIndustry] = React.useState<IndustryKey>('aerolineas');
  const benchmarks = BENCHMARKS_INDUSTRIA[selectedIndustry];

  // Calculate volume-weighted metrics
  const totalVolume = heatmapData.reduce((sum, h) => sum + h.volume, 0);

  // FCR Técnico = sin transferencia (comparable con benchmarks)
  const fcrTecnico = totalVolume > 0
    ? heatmapData.reduce((sum, h) => sum + (h.metrics.fcr_tecnico ?? (100 - h.metrics.transfer_rate)) * h.volume, 0) / totalVolume
    : 0;

  // FCR Real: sin transferencia Y sin recontacto 7d (más estricto)
  const fcrReal = totalVolume > 0
    ? heatmapData.reduce((sum, h) => sum + h.metrics.fcr * h.volume, 0) / totalVolume
    : 0;

  // Volume-weighted AHT (usando aht_seconds = AHT limpio sin noise/zombies)
  const aht = totalVolume > 0 ? heatmapData.reduce((sum, h) => sum + h.aht_seconds * h.volume, 0) / totalVolume : 0;

  // Volume-weighted AHT Total (usando aht_total = AHT con TODAS las filas - solo informativo)
  const ahtTotal = totalVolume > 0
    ? heatmapData.reduce((sum, h) => sum + (h.aht_total ?? h.aht_seconds) * h.volume, 0) / totalVolume
    : 0;

  // CPI: usar el valor pre-calculado si existe, sino calcular desde annual_cost/cost_volume
  const totalCostVolume = heatmapData.reduce((sum, h) => sum + (h.cost_volume || h.volume), 0);
  const totalAnnualCost = heatmapData.reduce((sum, h) => sum + (h.annual_cost || 0), 0);

  // Si tenemos CPI pre-calculado, usarlo ponderado por volumen
  // Si no, calcular desde annual_cost / cost_volume
  const hasCpiField = heatmapData.some(h => h.cpi !== undefined && h.cpi > 0);
  const cpi = hasCpiField
    ? (totalCostVolume > 0
        ? heatmapData.reduce((sum, h) => sum + (h.cpi || 0) * (h.cost_volume || h.volume), 0) / totalCostVolume
        : 0)
    : (totalCostVolume > 0 ? totalAnnualCost / totalCostVolume : 0);

  // Volume-weighted metrics
  const operacion = {
    aht: aht,
    ahtTotal: ahtTotal,  // AHT con TODAS las filas (solo informativo)
    fcrTecnico: fcrTecnico,
    fcrReal: fcrReal,
    abandono: totalVolume > 0 ? heatmapData.reduce((sum, h) => sum + (h.metrics.abandonment_rate || 0) * h.volume, 0) / totalVolume : 0,
    cpi: cpi
  };

  // Calculate percentile position
  const getPercentileBadge = (percentile: number): { label: string; color: string } => {
    if (percentile >= 90) return { label: 'Top 10%', color: 'bg-emerald-500 text-white' };
    if (percentile >= 75) return { label: 'Top 25%', color: 'bg-emerald-100 text-emerald-700' };
    if (percentile >= 50) return { label: 'Promedio', color: 'bg-amber-100 text-amber-700' };
    if (percentile >= 25) return { label: 'Bajo Avg', color: 'bg-orange-100 text-orange-700' };
    return { label: 'Bottom 25%', color: 'bg-red-100 text-red-700' };
  };

  // Calculate GAP vs P50 - positive is better, negative is worse
  const calcularGap = (valor: number, bench: BenchmarkMetric): { gap: string; diff: number; isPositive: boolean } => {
    const diff = bench.invertida ? bench.p50 - valor : valor - bench.p50;
    const isPositive = diff > 0;
    if (bench.unidad === 's') {
      return { gap: `${isPositive ? '+' : ''}${Math.round(diff)}s`, diff, isPositive };
    } else if (bench.unidad === '%') {
      return { gap: `${isPositive ? '+' : ''}${diff.toFixed(1)}pp`, diff, isPositive };
    } else {
      return { gap: `${isPositive ? '+' : ''}€${Math.abs(diff).toFixed(2)}`, diff, isPositive };
    }
  };

  // Get card background color based on GAP
  type GapStatus = 'positive' | 'neutral' | 'negative';
  const getGapStatus = (diff: number, bench: BenchmarkMetric): GapStatus => {
    // Calculate threshold as 5% of P50
    const threshold = bench.p50 * 0.05;
    if (diff > threshold) return 'positive';
    if (diff < -threshold) return 'negative';
    return 'neutral';
  };

  const cardBgColors: Record<GapStatus, string> = {
    positive: 'bg-emerald-50 border-emerald-200',
    neutral: 'bg-amber-50 border-amber-200',
    negative: 'bg-red-50 border-red-200'
  };

  // Calculate position on visual scale (0-100) for the benchmark bar
  // 0 = worst performers, 100 = best performers
  const calcularPosicionVisual = (valor: number, bench: BenchmarkMetric): number => {
    const { p25, p50, p75, p90, invertida } = bench;

    if (invertida) {
      // For inverted metrics (lower is better): p25 < p50 < p75 < p90
      // Better performance = lower value = higher visual position
      if (valor <= p25) return 95;  // Best performers (top 25%)
      if (valor <= p50) return 50 + 45 * (p50 - valor) / (p50 - p25);  // Between median and top
      if (valor <= p75) return 25 + 25 * (p75 - valor) / (p75 - p50);  // Between p75 and median
      if (valor <= p90) return 5 + 20 * (p90 - valor) / (p90 - p75);   // Between p90 and p75
      return 5;  // Worst performers (bottom 10%)
    } else {
      // For normal metrics (higher is better): p25 < p50 < p75 < p90
      // Better performance = higher value = higher visual position
      if (valor >= p90) return 95;  // Best performers (top 10%)
      if (valor >= p75) return 75 + 20 * (valor - p75) / (p90 - p75);
      if (valor >= p50) return 50 + 25 * (valor - p50) / (p75 - p50);
      if (valor >= p25) return 25 + 25 * (valor - p25) / (p50 - p25);
      return Math.max(5, 25 * valor / p25);  // Worst performers
    }
  };

  // Get insight text based on percentile position
  const getInsightText = (percentile: number, bench: BenchmarkMetric): string => {
    if (percentile >= 90) return `Superas al 90% del mercado`;
    if (percentile >= 75) return `Mejor que 3 de cada 4 empresas`;
    if (percentile >= 50) return `En línea con la mediana del sector`;
    if (percentile >= 25) return `Por debajo de la media del mercado`;
    return `Área crítica de mejora`;
  };

  // Format benchmark value for display
  const formatBenchValue = (value: number, unidad: string): string => {
    if (unidad === 's') return `${Math.round(value)}s`;
    if (unidad === '%') return `${value}%`;
    return `€${value.toFixed(2)}`;
  };

  // Metrics data with display values
  // FCR Real context: métrica más estricta que incluye recontactos 7 días
  const fcrRealDiff = operacion.fcrTecnico - operacion.fcrReal;
  const fcrRealContext = fcrRealDiff > 0
    ? `${Math.round(fcrRealDiff)}pp de recontactos 7d`
    : null;

  // AHT Total context: diferencia entre AHT limpio y AHT con todas las filas
  const ahtTotalDiff = operacion.ahtTotal - operacion.aht;
  const ahtTotalContext = Math.abs(ahtTotalDiff) > 1
    ? `${ahtTotalDiff > 0 ? '+' : ''}${Math.round(ahtTotalDiff)}s vs AHT limpio`
    : null;

  const metricsData = [
    {
      id: 'aht',
      label: 'AHT',
      valor: operacion.aht,
      display: `${Math.floor(operacion.aht / 60)}:${String(Math.round(operacion.aht) % 60).padStart(2, '0')}`,
      subDisplay: `(${Math.round(operacion.aht)}s)`,
      bench: benchmarks.metricas.aht,
      tooltip: 'Tiempo medio de gestión (solo interacciones válidas)',
      // AHT Total integrado como métrica secundaria
      secondaryMetric: {
        label: 'AHT Total',
        value: `${Math.floor(operacion.ahtTotal / 60)}:${String(Math.round(operacion.ahtTotal) % 60).padStart(2, '0')} (${Math.round(operacion.ahtTotal)}s)`,
        note: ahtTotalContext,
        tooltip: 'Incluye todas las filas (noise, zombie, abandon) - solo informativo',
        description: 'Incluye noise, zombie y abandonos — solo informativo'
      }
    },
    {
      id: 'fcr_tecnico',
      label: 'FCR',
      valor: operacion.fcrTecnico,
      display: `${Math.round(operacion.fcrTecnico)}%`,
      subDisplay: null,
      bench: benchmarks.metricas.fcr,
      tooltip: 'First Contact Resolution - comparable con benchmarks de industria',
      // FCR Real integrado como métrica secundaria
      secondaryMetric: {
        label: 'FCR Ajustado',
        value: `${Math.round(operacion.fcrReal)}%`,
        note: fcrRealContext,
        tooltip: 'Excluye recontactos en 7 días (métrica más estricta)',
        description: 'Incluye filtro de recontactos 7d — métrica interna más estricta'
      }
    },
    {
      id: 'abandono',
      label: 'ABANDONO',
      valor: operacion.abandono,
      display: `${operacion.abandono.toFixed(1)}%`,
      subDisplay: null,
      bench: benchmarks.metricas.abandono,
      tooltip: 'Tasa de abandono',
      secondaryMetric: null
    },
    {
      id: 'cpi',
      label: 'COSTE/INTERAC.',
      valor: operacion.cpi,
      display: `€${operacion.cpi.toFixed(2)}`,
      subDisplay: null,
      bench: benchmarks.metricas.cpi,
      tooltip: 'Coste por interacción',
      secondaryMetric: null
    }
  ];

  return (
    <Card>
      {/* Header with industry selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">Indicadores vs Industria</h3>
          <p className="text-xs text-gray-500">Fuente: {benchmarks.fuente}</p>
        </div>
        <select
          value={selectedIndustry}
          onChange={(e) => setSelectedIndustry(e.target.value as IndustryKey)}
          className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white w-full sm:w-auto"
        >
          {Object.entries(BENCHMARKS_INDUSTRIA).map(([key, val]) => (
            <option key={key} value={key}>{val.nombre}</option>
          ))}
        </select>
      </div>

      {/* 2x2 Card Grid - McKinsey style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {metricsData.map((m) => {
          const percentil = calcularPercentilUsuario(m.valor, m.bench);
          const badge = getPercentileBadge(percentil);
          const { gap, diff, isPositive } = calcularGap(m.valor, m.bench);
          const gapStatus = getGapStatus(diff, m.bench);
          const posicionVisual = calcularPosicionVisual(m.valor, m.bench);
          const insightText = getInsightText(percentil, m.bench);

          return (
            <div
              key={m.id}
              className={cn(
                'p-4 rounded-lg border transition-all',
                cardBgColors[gapStatus]
              )}
              title={m.tooltip}
            >
              {/* Header: Label + Badge */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                  {m.label}
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
                  {badge.label}
                </span>
              </div>

              {/* Main Value + GAP */}
              <div className="flex items-baseline justify-between mb-3">
                <div className="text-2xl font-bold text-gray-900">
                  {m.display}
                  {m.subDisplay && (
                    <span className="text-xs font-normal text-gray-500 ml-1">{m.subDisplay}</span>
                  )}
                </div>
                <div className={cn(
                  "text-sm font-semibold",
                  isPositive ? "text-emerald-600" : "text-red-600"
                )}>
                  {gap} {isPositive ? '✓' : '✗'}
                </div>
              </div>

              {/* Secondary Metric (FCR Real for FCR card, AHT Total for AHT card) */}
              {m.secondaryMetric && (
                <div className="mb-3 py-2 px-3 bg-gray-50 border border-gray-200 rounded-md" title={m.secondaryMetric.tooltip}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wide">{m.secondaryMetric.label}</span>
                      <span className="text-sm font-semibold text-gray-700">{m.secondaryMetric.value}</span>
                    </div>
                    {m.secondaryMetric.note && (
                      <span className="text-[9px] text-gray-500 italic">
                        ({m.secondaryMetric.note})
                      </span>
                    )}
                  </div>
                  {m.secondaryMetric.description && (
                    <div className="text-[9px] text-gray-400 mt-1">
                      {m.secondaryMetric.description}
                    </div>
                  )}
                </div>
              )}

              {/* Visual Benchmark Distribution Bar */}
              <div className="mb-2">
                <div className="relative h-2 bg-gradient-to-r from-red-200 via-amber-200 to-emerald-200 rounded-full overflow-visible">
                  {/* P25, P50, P75 markers */}
                  <div className="absolute top-0 left-[25%] w-px h-2 bg-gray-400" title="P25" />
                  <div className="absolute top-0 left-[50%] w-0.5 h-2 bg-gray-600" title="P50 (Mediana)" />
                  <div className="absolute top-0 left-[75%] w-px h-2 bg-gray-400" title="P75" />
                  {/* User position indicator */}
                  <div
                    className="absolute -top-0.5 w-3 h-3 rounded-full bg-gray-800 border-2 border-white shadow-md transform -translate-x-1/2"
                    style={{ left: `${Math.min(98, Math.max(2, posicionVisual))}%` }}
                    title={`Tu posición: ${m.display}`}
                  />
                </div>
                {/* Scale labels */}
                <div className="flex justify-between text-[8px] text-gray-400 mt-0.5 px-0.5">
                  <span>P25</span>
                  <span>P50</span>
                  <span>P75</span>
                  <span>P90</span>
                </div>
              </div>

              {/* Benchmark Reference Values */}
              <div className="grid grid-cols-3 gap-1 text-center mb-2 py-1.5 bg-white/50 rounded">
                <div>
                  <div className="text-[9px] text-gray-400">Bajo</div>
                  <div className="text-[10px] font-medium text-gray-600">{formatBenchValue(m.bench.p25, m.bench.unidad)}</div>
                </div>
                <div className="border-x border-gray-200">
                  <div className="text-[9px] text-gray-400">Mediana</div>
                  <div className="text-[10px] font-semibold text-gray-700">{formatBenchValue(m.bench.p50, m.bench.unidad)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-gray-400">Top</div>
                  <div className="text-[10px] font-medium text-emerald-600">{formatBenchValue(m.bench.p90, m.bench.unidad)}</div>
                </div>
              </div>

              {/* Insight Text */}
              <div className={cn(
                "text-[10px] text-center py-1 rounded",
                percentil >= 75 ? "text-emerald-700 bg-emerald-100/50" :
                percentil >= 50 ? "text-amber-700 bg-amber-100/50" :
                "text-red-700 bg-red-100/50"
              )}>
                {insightText}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// v6.0: Health Score - Simplified weighted average (no penalties)
function HealthScoreDetailed({
  score,
  avgFCR,
  avgAHT,
  avgAbandonmentRate,
  avgTransferRate
}: {
  score: number;
  avgFCR: number;             // FCR Técnico (%)
  avgAHT: number;             // AHT en segundos
  avgAbandonmentRate: number; // Tasa de abandono (%)
  avgTransferRate: number;    // Tasa de transferencia (%)
}) {
  const getScoreColor = (s: number): string => {
    if (s >= 80) return COLORS.status.success;
    if (s >= 60) return COLORS.status.warning;
    return COLORS.status.critical;
  };

  const getScoreLabel = (s: number): string => {
    if (s >= 80) return 'Excelente';
    if (s >= 60) return 'Bueno';
    if (s >= 40) return 'Regular';
    return 'Crítico';
  };

  const color = getScoreColor(score);
  const circumference = 2 * Math.PI * 40;
  const strokeDasharray = `${(score / 100) * circumference} ${circumference}`;

  // ═══════════════════════════════════════════════════════════════
  // Calcular scores normalizados usando benchmarks de industria
  // Misma lógica que calculateHealthScore() en realDataAnalysis.ts
  // ═══════════════════════════════════════════════════════════════

  // FCR Técnico: P10=85%, P50=68%, P90=50%
  let fcrScore: number;
  if (avgFCR >= 85) {
    fcrScore = 95 + 5 * Math.min(1, (avgFCR - 85) / 15);
  } else if (avgFCR >= 68) {
    fcrScore = 50 + 50 * (avgFCR - 68) / (85 - 68);
  } else if (avgFCR >= 50) {
    fcrScore = 20 + 30 * (avgFCR - 50) / (68 - 50);
  } else {
    fcrScore = Math.max(0, 20 * avgFCR / 50);
  }

  // Abandono: P10=3%, P50=5%, P90=10%
  let abandonoScore: number;
  if (avgAbandonmentRate <= 3) {
    abandonoScore = 95 + 5 * Math.max(0, (3 - avgAbandonmentRate) / 3);
  } else if (avgAbandonmentRate <= 5) {
    abandonoScore = 50 + 45 * (5 - avgAbandonmentRate) / (5 - 3);
  } else if (avgAbandonmentRate <= 10) {
    abandonoScore = 20 + 30 * (10 - avgAbandonmentRate) / (10 - 5);
  } else {
    abandonoScore = Math.max(0, 20 - 2 * (avgAbandonmentRate - 10));
  }

  // AHT: P10=240s, P50=380s, P90=540s
  let ahtScore: number;
  if (avgAHT <= 240) {
    if (avgFCR > 65) {
      ahtScore = 95 + 5 * Math.max(0, (240 - avgAHT) / 60);
    } else {
      ahtScore = 70;
    }
  } else if (avgAHT <= 380) {
    ahtScore = 50 + 45 * (380 - avgAHT) / (380 - 240);
  } else if (avgAHT <= 540) {
    ahtScore = 20 + 30 * (540 - avgAHT) / (540 - 380);
  } else {
    ahtScore = Math.max(0, 20 * (600 - avgAHT) / 60);
  }

  // CSAT Proxy: 60% FCR + 40% Abandono
  const csatProxyScore = 0.60 * fcrScore + 0.40 * abandonoScore;

  type FactorStatus = 'success' | 'warning' | 'critical';
  const getFactorStatus = (s: number): FactorStatus => s >= 80 ? 'success' : s >= 50 ? 'warning' : 'critical';

  // Nueva ponderación: FCR 35%, Abandono 30%, CSAT Proxy 20%, AHT 15%
  const factors = [
    {
      name: 'FCR Técnico',
      weight: '35%',
      score: Math.round(fcrScore),
      status: getFactorStatus(fcrScore),
      insight: fcrScore >= 80 ? 'Óptimo' : fcrScore >= 50 ? 'En P50' : 'Bajo P90',
      rawValue: `${avgFCR.toFixed(0)}%`
    },
    {
      name: 'Accesibilidad',
      weight: '30%',
      score: Math.round(abandonoScore),
      status: getFactorStatus(abandonoScore),
      insight: abandonoScore >= 80 ? 'Bajo' : abandonoScore >= 50 ? 'Moderado' : 'Crítico',
      rawValue: `${avgAbandonmentRate.toFixed(1)}% aband.`
    },
    {
      name: 'CSAT Proxy',
      weight: '20%',
      score: Math.round(csatProxyScore),
      status: getFactorStatus(csatProxyScore),
      insight: csatProxyScore >= 80 ? 'Óptimo' : csatProxyScore >= 50 ? 'Mejorable' : 'Bajo',
      rawValue: '(FCR+Aband.)'
    },
    {
      name: 'Eficiencia',
      weight: '15%',
      score: Math.round(ahtScore),
      status: getFactorStatus(ahtScore),
      insight: ahtScore >= 80 ? 'Rápido' : ahtScore >= 50 ? 'En rango' : 'Lento',
      rawValue: `${Math.floor(avgAHT / 60)}:${String(Math.round(avgAHT) % 60).padStart(2, '0')}`
    }
  ];

  const statusBarColors: Record<FactorStatus, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500'
  };

  const statusTextColors: Record<FactorStatus, string> = {
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    critical: 'text-red-600'
  };

  // Score final = media ponderada (sin penalizaciones en v6.0)
  const finalScore = Math.round(
    fcrScore * 0.35 +
    abandonoScore * 0.30 +
    csatProxyScore * 0.20 +
    ahtScore * 0.15
  );

  const displayColor = getScoreColor(finalScore);
  const displayStrokeDasharray = `${(finalScore / 100) * circumference} ${circumference}`;

  return (
    <Card>
      <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
        {/* Single Gauge: Final Score (weighted average) */}
        <div className="flex-shrink-0">
          <div className="text-center">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="none" stroke={displayColor} strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={displayStrokeDasharray}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl sm:text-3xl font-bold" style={{ color: displayColor }}>{finalScore}</span>
              </div>
            </div>
            <p className="text-xs font-semibold mt-1" style={{ color: displayColor }}>{getScoreLabel(finalScore)}</p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-2">Health Score</h3>
          <p className="text-[10px] text-gray-400 mb-2">
            Benchmarks: FCR P10=85%, Aband. P10=3%, AHT P10=240s
          </p>

          <div className="space-y-2">
            {factors.map((factor) => (
              <div key={factor.name} className="flex items-center gap-2">
                <div className="w-20 text-xs text-gray-600 truncate">{factor.name}</div>
                <div className="w-7 text-[10px] text-gray-400 text-center font-medium">{factor.weight}</div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', statusBarColors[factor.status])}
                    style={{ width: `${factor.score}%` }}
                  />
                </div>
                <div className="w-6 text-xs text-gray-500 text-right">{factor.score}</div>
                <div className={cn('w-16 text-[10px]', statusTextColors[factor.status])}>
                  {factor.rawValue}
                </div>
              </div>
            ))}
          </div>

          {/* Nota de cálculo */}
          <div className="mt-3 pt-2 border-t border-gray-100">
            <p className="text-[9px] text-gray-400 text-center">
              Score = FCR×35% + Accesibilidad×30% + CSAT Proxy×20% + Eficiencia×15%
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// v3.16: Potencial de Automatización - Sin gauge confuso, solo distribución clara
function AgenticReadinessScore({ data }: { data: AnalysisData }) {
  const allQueues = data.drilldownData?.flatMap(skill => skill.originalQueues) || [];
  const totalQueueVolume = allQueues.reduce((sum, q) => sum + q.volume, 0);

  // Calcular volúmenes por tier
  const tierVolumes = {
    AUTOMATE: allQueues.filter(q => q.tier === 'AUTOMATE').reduce((s, q) => s + q.volume, 0),
    ASSIST: allQueues.filter(q => q.tier === 'ASSIST').reduce((s, q) => s + q.volume, 0),
    AUGMENT: allQueues.filter(q => q.tier === 'AUGMENT').reduce((s, q) => s + q.volume, 0),
    'HUMAN-ONLY': allQueues.filter(q => q.tier === 'HUMAN-ONLY').reduce((s, q) => s + q.volume, 0)
  };

  const tierCounts = {
    AUTOMATE: allQueues.filter(q => q.tier === 'AUTOMATE').length,
    ASSIST: allQueues.filter(q => q.tier === 'ASSIST').length,
    AUGMENT: allQueues.filter(q => q.tier === 'AUGMENT').length,
    'HUMAN-ONLY': allQueues.filter(q => q.tier === 'HUMAN-ONLY').length
  };

  // Porcentajes por tier
  const tierPcts = {
    AUTOMATE: totalQueueVolume > 0 ? (tierVolumes.AUTOMATE / totalQueueVolume) * 100 : 0,
    ASSIST: totalQueueVolume > 0 ? (tierVolumes.ASSIST / totalQueueVolume) * 100 : 0,
    AUGMENT: totalQueueVolume > 0 ? (tierVolumes.AUGMENT / totalQueueVolume) * 100 : 0,
    'HUMAN-ONLY': totalQueueVolume > 0 ? (tierVolumes['HUMAN-ONLY'] / totalQueueVolume) * 100 : 0
  };

  // Datos de tiers con descripción clara
  const tiers = [
    { key: 'AUTOMATE', label: 'AUTOMATE', bgColor: 'bg-emerald-500', desc: 'Bot autónomo' },
    { key: 'ASSIST', label: 'ASSIST', bgColor: 'bg-cyan-500', desc: 'Bot + agente' },
    { key: 'AUGMENT', label: 'AUGMENT', bgColor: 'bg-amber-500', desc: 'Agente asistido' },
    { key: 'HUMAN-ONLY', label: 'HUMAN', bgColor: 'bg-gray-400', desc: 'Solo humano' }
  ];

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Bot className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Potencial de Automatización</h3>
      </div>

      {/* Distribución por tier */}
      <div className="space-y-3">
        {tiers.map((tier) => {
          const pct = tierPcts[tier.key as keyof typeof tierPcts];
          const count = tierCounts[tier.key as keyof typeof tierCounts];
          const vol = tierVolumes[tier.key as keyof typeof tierVolumes];
          return (
            <div key={tier.key} className="flex items-center gap-3">
              <div className="w-20">
                <div className="text-xs font-medium text-gray-700">{tier.label}</div>
                <div className="text-[10px] text-gray-400">{tier.desc}</div>
              </div>
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', tier.bgColor)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="w-14 text-right">
                <div className="text-sm font-semibold text-gray-700">{Math.round(pct)}%</div>
              </div>
              <div className="w-16 text-xs text-gray-400 text-right">{count} colas</div>
            </div>
          );
        })}
      </div>

      {/* Resumen */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <p className="text-lg font-bold text-emerald-700">{Math.round(tierPcts.AUTOMATE)}%</p>
            <p className="text-[10px] text-emerald-600">Automatización completa</p>
          </div>
          <div className="p-2 bg-cyan-50 rounded-lg">
            <p className="text-lg font-bold text-cyan-700">{Math.round(tierPcts.AUTOMATE + tierPcts.ASSIST)}%</p>
            <p className="text-[10px] text-cyan-600">Con asistencia IA</p>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-2">
          Basado en {formatNumber(totalQueueVolume)} interacciones analizadas
        </p>
      </div>
    </Card>
  );
}


// Top Opportunities Component (legacy - kept for reference)
function TopOpportunities({ findings, opportunities }: {
  findings: Finding[];
  opportunities: { name: string; impact: number; savings: number }[];
}) {
  const items = [
    ...findings
      .filter(f => f.type === 'critical' || f.type === 'warning')
      .slice(0, 3)
      .map((f, i) => ({
        rank: i + 1,
        title: f.title || f.text.split(':')[0],
        metric: f.text.includes(':') ? f.text.split(':')[1].trim() : '',
        action: f.description || 'Acción requerida',
        type: f.type as 'critical' | 'warning' | 'info'
      })),
  ].slice(0, 3);

  if (items.length < 3) {
    const remaining = 3 - items.length;
    opportunities
      .sort((a, b) => b.savings - a.savings)
      .slice(0, remaining)
      .forEach(() => {
        const opp = opportunities[items.length];
        if (opp) {
          items.push({
            rank: items.length + 1,
            title: opp.name,
            metric: `€${opp.savings.toLocaleString()} ahorro potencial`,
            action: 'Implementar',
            type: 'info' as const
          });
        }
      });
  }

  const getIcon = (type: string) => {
    if (type === 'critical') return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (type === 'warning') return <Target className="w-4 h-4 text-amber-500" />;
    return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <h3 className="font-semibold text-slate-800 mb-3">Top 3 Oportunidades</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.rank} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
              {item.rank}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {getIcon(item.type)}
                <span className="text-sm font-medium text-slate-700">{item.title}</span>
              </div>
              {item.metric && (
                <p className="text-xs text-slate-500 mt-0.5">{item.metric}</p>
              )}
              <p className="text-xs text-[#6D84E3] mt-0.5 font-medium">→ {item.action}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// v3.15: Economic Summary Compact
function EconomicSummary({ economicModel }: { economicModel: AnalysisData['economicModel'] }) {
  return (
    <Card padding="md">
      <h3 className="font-semibold text-gray-900 mb-3">Impacto Económico</h3>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Stat
          value={formatCurrency(economicModel.currentAnnualCost)}
          label="Coste Anual"
        />
        <Stat
          value={formatCurrency(economicModel.annualSavings)}
          label="Ahorro Potencial"
          status="success"
        />
      </div>

      <div className="flex items-center justify-between p-2.5 bg-blue-50 rounded-lg">
        <div>
          <p className="text-xs text-blue-600">ROI 3 años</p>
          <p className="text-lg font-bold text-blue-600">{economicModel.roi3yr}%</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Payback</p>
          <p className="text-lg font-bold text-gray-700">{economicModel.paybackMonths}m</p>
        </div>
      </div>
    </Card>
  );
}

export function ExecutiveSummaryTab({ data, onTabChange }: ExecutiveSummaryTabProps) {
  // Métricas básicas - VOLUME-WEIGHTED para consistencia con calculateHealthScore()
  const totalInteractions = data.heatmapData.reduce((sum, h) => sum + h.volume, 0);

  // AHT ponderado por volumen (usando aht_seconds = AHT limpio sin noise/zombies)
  const avgAHT = totalInteractions > 0
    ? data.heatmapData.reduce((sum, h) => sum + h.aht_seconds * h.volume, 0) / totalInteractions
    : 0;

  // FCR Técnico: solo sin transferencia (comparable con benchmarks de industria) - ponderado por volumen
  const avgFCRTecnico = totalInteractions > 0
    ? data.heatmapData.reduce((sum, h) => sum + (h.metrics.fcr_tecnico ?? (100 - h.metrics.transfer_rate)) * h.volume, 0) / totalInteractions
    : 0;

  // Transfer rate ponderado por volumen
  const avgTransferRate = totalInteractions > 0
    ? data.heatmapData.reduce((sum, h) => sum + h.metrics.transfer_rate * h.volume, 0) / totalInteractions
    : 0;

  // Abandonment rate ponderado por volumen
  const avgAbandonmentRate = totalInteractions > 0
    ? data.heatmapData.reduce((sum, h) => sum + (h.metrics.abandonment_rate || 0) * h.volume, 0) / totalInteractions
    : 0;

  // DEBUG: Validar métricas GLOBALES calculadas (ponderadas por volumen)
  console.log('📊 ExecutiveSummaryTab - MÉTRICAS GLOBALES MOSTRADAS:', {
    totalInteractions,
    avgFCRTecnico: avgFCRTecnico.toFixed(2) + '%',
    avgTransferRate: avgTransferRate.toFixed(2) + '%',
    avgAbandonmentRate: avgAbandonmentRate.toFixed(2) + '%',
    avgAHT: Math.round(avgAHT) + 's',
    // Detalle por skill para verificación
    perSkill: data.heatmapData.map(h => ({
      skill: h.skill,
      vol: h.volume,
      fcr_tecnico: h.metrics?.fcr_tecnico,
      transfer: h.metrics?.transfer_rate
    }))
  });

  // Métricas para navegación
  const allQueues = data.drilldownData?.flatMap(s => s.originalQueues) || [];
  const colasAutomate = allQueues.filter(q => q.tier === 'AUTOMATE');
  const ahorroTotal = data.economicModel?.annualSavings || 0;
  const dimensionesConProblemas = data.dimensions.filter(d => d.score < 60).length;

  return (
    <div className="space-y-5">
      {/* ========================================
          1. CABECERA CON PERIODO
          ======================================== */}
      <CabeceraPeriodo data={data} />

      {/* ========================================
          2. KPIs + BENCHMARK (Unified Card Grid)
          ======================================== */}
      <UnifiedKPIBenchmark heatmapData={data.heatmapData} />

      {/* ========================================
          3. HEALTH SCORE
          ======================================== */}
      <HealthScoreDetailed
        score={data.overallHealthScore}
        avgFCR={avgFCRTecnico}
        avgAHT={avgAHT}
        avgAbandonmentRate={avgAbandonmentRate}
        avgTransferRate={avgTransferRate}
      />

      {/* ========================================
          4. PRINCIPALES HALLAZGOS
          ======================================== */}
      <PrincipalesHallazgos data={data} />

      {/* ========================================
          5. NAVEGACIÓN RÁPIDA (Explorar más)
          ======================================== */}
      {onTabChange && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Explorar análisis detallado
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Dimensiones */}
            <button
              onClick={() => onTabChange('dimensions')}
              className="group flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 text-left transition-all hover:shadow-sm hover:border-gray-300"
            >
              <div className={cn('p-2 rounded-lg', dimensionesConProblemas > 0 ? 'bg-amber-100' : 'bg-gray-100')}>
                <BarChart3 className={cn('w-4 h-4', dimensionesConProblemas > 0 ? 'text-amber-600' : 'text-gray-600')} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700 text-sm">Dimensiones</span>
                  {dimensionesConProblemas > 0 && (
                    <Badge label={`${dimensionesConProblemas} críticas`} variant="warning" size="sm" />
                  )}
                </div>
                <p className="text-xs text-gray-400">Eficiencia, resolución, satisfacción</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Agentic Readiness */}
            <button
              onClick={() => onTabChange('readiness')}
              className="group flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 text-left transition-all hover:shadow-sm hover:border-gray-300"
            >
              <div className={cn('p-2 rounded-lg', colasAutomate.length > 0 ? 'bg-emerald-100' : 'bg-gray-100')}>
                <Cpu className={cn('w-4 h-4', colasAutomate.length > 0 ? 'text-emerald-600' : 'text-gray-600')} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700 text-sm">Agentic Readiness</span>
                  {colasAutomate.length > 0 && (
                    <Badge label={`${colasAutomate.length} listas`} variant="success" size="sm" />
                  )}
                </div>
                <p className="text-xs text-gray-400">Colas elegibles para automatización</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Plan de Acción */}
            <button
              onClick={() => onTabChange('roadmap')}
              className="group flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 text-left transition-all hover:shadow-sm hover:border-gray-300"
            >
              <div className="p-2 rounded-lg bg-blue-100">
                <Zap className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700 text-sm">Plan de Acción</span>
                  <Badge label="Prioridad" variant="critical" size="sm" />
                </div>
                <p className="text-xs text-gray-400">
                  {ahorroTotal > 0 ? `Potencial: ${formatCurrency(ahorroTotal)}/año` : 'Roadmap de implementación'}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExecutiveSummaryTab;
