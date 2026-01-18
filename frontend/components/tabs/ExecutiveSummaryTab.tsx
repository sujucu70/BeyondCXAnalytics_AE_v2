import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, Activity, Clock, PhoneForwarded, Users, Bot, ChevronRight, BarChart3, Cpu, Map, Zap, ArrowRight, Calendar } from 'lucide-react';
import type { AnalysisData, Finding, DrilldownDataPoint, HeatmapDataPoint } from '../../types';
import type { TabId } from '../DashboardHeader';
import {
  Card,
  Badge,
  SectionHeader,
  DistributionBar,
  Stat,
  Button,
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
    transfer: BenchmarkMetric;
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
      transfer: { p25: 18, p50: 12, p75: 8, p90: 5, unidad: '%', invertida: true },
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
      transfer: { p25: 22, p50: 15, p75: 10, p90: 6, unidad: '%', invertida: true },
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
      transfer: { p25: 15, p50: 10, p75: 6, p90: 3, unidad: '%', invertida: true },
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
      transfer: { p25: 20, p50: 14, p75: 9, p90: 5, unidad: '%', invertida: true },
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
      transfer: { p25: 12, p50: 8, p75: 5, p90: 3, unidad: '%', invertida: true },
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
      transfer: { p25: 18, p50: 12, p75: 8, p90: 5, unidad: '%', invertida: true },
      cpi: { p25: 4.50, p50: 3.50, p75: 2.80, p90: 2.20, unidad: '€', invertida: true }
    }
  }
};

function calcularPercentilUsuario(valor: number, bench: BenchmarkMetric): number {
  const { p25, p50, p75, p90, invertida } = bench;
  if (invertida) {
    if (valor <= p90) return 95;
    if (valor <= p75) return 82;
    if (valor <= p50) return 60;
    if (valor <= p25) return 35;
    return 15;
  } else {
    if (valor >= p90) return 95;
    if (valor >= p75) return 82;
    if (valor >= p50) return 60;
    if (valor >= p25) return 35;
    return 15;
  }
}

function BenchmarkTable({ heatmapData }: { heatmapData: HeatmapDataPoint[] }) {
  const [selectedIndustry, setSelectedIndustry] = React.useState<IndustryKey>('aerolineas');
  const benchmarks = BENCHMARKS_INDUSTRIA[selectedIndustry];

  const totalVolume = heatmapData.reduce((sum, h) => sum + h.volume, 0);
  const operacion = {
    aht: totalVolume > 0 ? heatmapData.reduce((sum, h) => sum + h.aht_seconds * h.volume, 0) / totalVolume : 0,
    fcr: totalVolume > 0 ? heatmapData.reduce((sum, h) => sum + h.metrics.fcr * h.volume, 0) / totalVolume : 0,
    abandono: totalVolume > 0 ? heatmapData.reduce((sum, h) => sum + (h.metrics.abandonment_rate || 0) * h.volume, 0) / totalVolume : 0,
    transfer: totalVolume > 0 ? heatmapData.reduce((sum, h) => sum + (h.variability?.transfer_rate || 0) * h.volume, 0) / totalVolume : 0,
    cpi: 2.33
  };

  const getPercentileBadge = (percentile: number) => {
    if (percentile >= 90) return { label: 'Top 10%', color: 'bg-emerald-500 text-white' };
    if (percentile >= 75) return { label: 'Top 25%', color: 'bg-emerald-100 text-emerald-700' };
    if (percentile >= 50) return { label: 'Avg', color: 'bg-amber-100 text-amber-700' };
    if (percentile >= 25) return { label: 'Below Avg', color: 'bg-orange-100 text-orange-700' };
    return { label: 'Bottom 25%', color: 'bg-red-100 text-red-700' };
  };

  const metricsData = [
    { id: 'aht', label: 'AHT (Tiempo Medio)', valor: operacion.aht, display: `${Math.round(operacion.aht)}s`, bench: benchmarks.metricas.aht },
    { id: 'fcr', label: 'FCR (Resolución 1er Contacto)', valor: operacion.fcr, display: `${Math.round(operacion.fcr)}%`, bench: benchmarks.metricas.fcr },
    { id: 'abandono', label: 'Tasa de Abandono', valor: operacion.abandono, display: `${operacion.abandono.toFixed(1)}%`, bench: benchmarks.metricas.abandono },
    { id: 'transfer', label: 'Tasa de Transferencia', valor: operacion.transfer, display: `${operacion.transfer.toFixed(1)}%`, bench: benchmarks.metricas.transfer },
    { id: 'cpi', label: 'Coste por Interacción', valor: operacion.cpi, display: `€${operacion.cpi.toFixed(2)}`, bench: benchmarks.metricas.cpi }
  ];

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Benchmark vs Industria</h3>
        <select
          value={selectedIndustry}
          onChange={(e) => setSelectedIndustry(e.target.value as IndustryKey)}
          className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
        >
          {Object.entries(BENCHMARKS_INDUSTRIA).map(([key, val]) => (
            <option key={key} value={key}>{val.nombre}</option>
          ))}
        </select>
      </div>
      <p className="text-xs text-gray-500 mb-3">Fuente: {benchmarks.fuente}</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase border-b">
              <th className="py-2 text-left font-medium">Métrica</th>
              <th className="py-2 text-right font-medium">Tu Op.</th>
              <th className="py-2 text-right font-medium">P50</th>
              <th className="py-2 text-center font-medium">Posición</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {metricsData.map((m) => {
              const percentil = calcularPercentilUsuario(m.valor, m.bench);
              const badge = getPercentileBadge(percentil);
              return (
                <tr key={m.id}>
                  <td className="py-2 text-gray-700">{m.label}</td>
                  <td className="py-2 text-right font-semibold text-gray-800">{m.display}</td>
                  <td className="py-2 text-right text-gray-500">{m.bench.p50}{m.bench.unidad}</td>
                  <td className="py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
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

  // Llamadas fuera de horario (simulado - buscar en métricas si existe)
  const avgAHT = data.heatmapData.length > 0
    ? data.heatmapData.reduce((sum, h) => sum + h.aht_seconds, 0) / data.heatmapData.length
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

  // Bajo FCR
  const colasBajoFCR = allQueues.filter(q => q.fcr_rate < 50);
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

// v3.15: Compact KPI Row Component
function KeyMetricsCard({
  totalInteractions,
  avgAHT,
  avgFCR,
  avgTransferRate,
  ahtBenchmark,
  fcrBenchmark
}: {
  totalInteractions: number;
  avgAHT: number;
  avgFCR: number;
  avgTransferRate: number;
  ahtBenchmark?: number;
  fcrBenchmark?: number;
}) {
  const getAHTStatus = (aht: number): { variant: 'success' | 'warning' | 'critical'; label: string } => {
    if (aht <= 420) return { variant: 'success', label: 'Bueno' };
    if (aht <= 480) return { variant: 'warning', label: 'Aceptable' };
    return { variant: 'critical', label: 'Alto' };
  };

  const getFCRStatus = (fcr: number): { variant: 'success' | 'warning' | 'critical'; label: string } => {
    if (fcr >= 75) return { variant: 'success', label: 'Bueno' };
    if (fcr >= 65) return { variant: 'warning', label: 'Mejorable' };
    return { variant: 'critical', label: 'Crítico' };
  };

  const ahtStatus = getAHTStatus(avgAHT);
  const fcrStatus = getFCRStatus(avgFCR);
  const transferStatus = avgTransferRate > 20
    ? { variant: 'warning' as const, label: 'Alto' }
    : { variant: 'success' as const, label: 'OK' };

  const metrics = [
    {
      icon: Users,
      label: 'Interacciones',
      value: formatNumber(totalInteractions),
      sublabel: 'en el periodo',
      status: null
    },
    {
      icon: Clock,
      label: 'AHT Promedio',
      value: `${Math.floor(avgAHT / 60)}:${String(avgAHT % 60).padStart(2, '0')}`,
      sublabel: ahtBenchmark ? `Benchmark: ${Math.floor(ahtBenchmark / 60)}:${String(Math.round(ahtBenchmark) % 60).padStart(2, '0')}` : 'min:seg',
      status: ahtStatus
    },
    {
      icon: CheckCircle,
      label: 'FCR',
      value: `${avgFCR}%`,
      sublabel: fcrBenchmark ? `Benchmark: ${fcrBenchmark}%` : 'Resolución 1er contacto',
      status: fcrStatus
    },
    {
      icon: PhoneForwarded,
      label: 'Transferencias',
      value: `${avgTransferRate}%`,
      sublabel: avgTransferRate > 20 ? 'Requiere atención' : 'Bajo control',
      status: transferStatus
    }
  ];

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{metric.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-gray-900">{metric.value}</span>
                {metric.status && (
                  <Badge
                    label={metric.status.label}
                    variant={metric.status.variant}
                    size="sm"
                  />
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">{metric.sublabel}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// v3.15: Health Score with Breakdown
function HealthScoreDetailed({
  score,
  avgFCR,
  avgAHT,
  avgTransferRate,
  avgCSAT
}: {
  score: number;
  avgFCR: number;
  avgAHT: number;
  avgTransferRate: number;
  avgCSAT: number | null;  // null = sin datos de CSAT
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

  // Calculate individual factor scores (0-100)
  const fcrScore = Math.min(100, Math.round((avgFCR / 85) * 100));
  const ahtScore = Math.min(100, Math.round(Math.max(0, (1 - (avgAHT - 240) / 360) * 100)));
  const transferScore = Math.min(100, Math.round(Math.max(0, (1 - avgTransferRate / 30) * 100)));
  const hasCSATData = avgCSAT !== null;
  const csatScore = avgCSAT ?? 0;

  type FactorStatus = 'success' | 'warning' | 'critical' | 'nodata';
  const getFactorStatus = (s: number): FactorStatus => s >= 80 ? 'success' : s >= 60 ? 'warning' : 'critical';

  // Factores sin CSAT si no hay datos
  const basefactors = [
    { name: 'FCR', score: fcrScore, status: getFactorStatus(fcrScore) as FactorStatus, insight: fcrScore >= 80 ? 'Óptimo' : fcrScore >= 60 ? 'Mejorable' : 'Requiere acción', hasData: true },
    { name: 'Eficiencia (AHT)', score: ahtScore, status: getFactorStatus(ahtScore) as FactorStatus, insight: ahtScore >= 80 ? 'Óptimo' : ahtScore >= 60 ? 'En rango' : 'Muy alto', hasData: true },
    { name: 'Transferencias', score: transferScore, status: getFactorStatus(transferScore) as FactorStatus, insight: transferScore >= 80 ? 'Bajo' : transferScore >= 60 ? 'Moderado' : 'Excesivo', hasData: true },
    {
      name: 'CSAT',
      score: csatScore,
      status: hasCSATData ? getFactorStatus(csatScore) as FactorStatus : 'nodata' as FactorStatus,
      insight: !hasCSATData ? 'Sin datos' : csatScore >= 80 ? 'Óptimo' : csatScore >= 60 ? 'Aceptable' : 'Bajo',
      hasData: hasCSATData
    }
  ];
  const factors = basefactors;

  const statusBarColors: Record<FactorStatus, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
    nodata: 'bg-gray-300'
  };

  const statusTextColors: Record<FactorStatus, string> = {
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    critical: 'text-red-600',
    nodata: 'text-gray-400'
  };

  const getMainInsight = () => {
    // Solo considerar factores que tienen datos
    const factorsWithData = factors.filter(f => f.hasData);
    if (factorsWithData.length === 0) return 'No hay suficientes datos para generar insights.';

    const weakest = factorsWithData.reduce((min, f) => f.score < min.score ? f : min, factorsWithData[0]);
    const strongest = factorsWithData.reduce((max, f) => f.score > max.score ? f : max, factorsWithData[0]);

    if (score >= 80) return `Rendimiento destacado en ${strongest.name}. Mantener estándares actuales.`;
    if (score >= 60) return `Oportunidad de mejora en ${weakest.name} (${weakest.insight.toLowerCase()}).`;
    return `Priorizar mejora en ${weakest.name}: impacto directo en satisfacción del cliente.`;
  };

  return (
    <Card>
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
        {/* Gauge */}
        <div className="flex-shrink-0">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8"
                strokeLinecap="round" strokeDasharray={strokeDasharray}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold" style={{ color }}>{score}</span>
            </div>
          </div>
          <p className="text-center text-sm font-semibold mt-1" style={{ color }}>{getScoreLabel(score)}</p>
        </div>

        {/* Breakdown */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-3">Health Score - Desglose</h3>

          <div className="space-y-2.5">
            {factors.map((factor) => (
              <div key={factor.name} className="flex items-center gap-3">
                <div className="w-24 text-xs text-gray-600 truncate">{factor.name}</div>
                {factor.hasData ? (
                  <>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', statusBarColors[factor.status])}
                        style={{ width: `${factor.score}%` }}
                      />
                    </div>
                    <div className="w-10 text-xs text-gray-500 text-right">{factor.score}</div>
                    <div className={cn('w-20 text-xs', statusTextColors[factor.status])}>
                      {factor.insight}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-[8px] text-gray-400">—</span>
                      </div>
                    </div>
                    <div className="w-10 text-xs text-gray-400 text-right">—</div>
                    <div className="w-20 text-xs text-gray-400 italic">
                      Sin datos
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Key Insight */}
          <div className="mt-4 p-2.5 bg-gray-50 rounded-lg border-l-3 border-blue-600">
            <p className="text-xs text-gray-600">
              <span className="font-semibold text-gray-700">Insight: </span>
              {getMainInsight()}
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

// ============================================
// v3.15: SIGUIENTE PASO RECOMENDADO (Acción)
// ============================================
interface RecomendacionData {
  colasAutomate: number;
  topColasAutomate: string[];
  volumenHuman: number;
  pctHuman: number;
  colasConRedFlags: number;
  ahorroTotal: number;
}

function generarRecomendacionPrincipal(datos: RecomendacionData): {
  texto: string;
  tipo: 'dual' | 'automate' | 'foundation';
  prioridad: 'alta' | 'media';
} {
  if (datos.colasAutomate >= 3 && datos.pctHuman > 0.05) {
    return {
      texto: `Iniciar piloto de automatización con ${datos.colasAutomate} colas mientras se ejecuta Wave 1 Foundation para el ${(datos.pctHuman * 100).toFixed(0)}% del volumen que requiere estandarización.`,
      tipo: 'dual',
      prioridad: 'alta'
    };
  }
  if (datos.colasAutomate >= 3) {
    return {
      texto: `${datos.colasAutomate} colas listas para automatización inmediata. Iniciar piloto con las de mayor volumen para maximizar ROI.`,
      tipo: 'automate',
      prioridad: 'alta'
    };
  }
  return {
    texto: `Priorizar Wave 1 Foundation para resolver red flags en ${datos.colasConRedFlags} colas antes de automatizar. Esto habilitará más candidatos de automatización.`,
    tipo: 'foundation',
    prioridad: 'media'
  };
}

function SiguientePasoRecomendado({
  recomendacion,
  ahorroTotal,
  onVerRoadmap
}: {
  recomendacion: RecomendacionData;
  ahorroTotal: number;
  onVerRoadmap?: () => void;
}) {
  const rec = generarRecomendacionPrincipal(recomendacion);

  const tipoConfig = {
    dual: { icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Enfoque Dual' },
    automate: { icon: Bot, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Automatización' },
    foundation: { icon: Target, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Foundation' }
  };

  const config = tipoConfig[rec.tipo];
  const Icon = config.icon;

  return (
    <div className={cn('rounded-lg border-2 p-5', config.border, config.bg)}>
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-white shadow-sm">
          <Icon className={cn('w-6 h-6', config.color)} />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('text-xs font-bold uppercase tracking-wider', config.color)}>
              Recomendación basada en el análisis
            </span>
            <Badge
              label={`Prioridad ${rec.prioridad}`}
              variant={rec.prioridad === 'alta' ? 'critical' : 'warning'}
              size="sm"
            />
          </div>

          <p className="text-gray-700 text-sm leading-relaxed mb-4">
            {rec.texto}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className={cn('font-medium', config.color)}>
                {config.label}
              </span>
              {ahorroTotal > 0 && (
                <span className="text-emerald-600 font-semibold">
                  Potencial: {formatCurrency(ahorroTotal)}/año
                </span>
              )}
            </div>

            {onVerRoadmap && (
              <Button onClick={onVerRoadmap}>
                Ver Plan de Acción
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
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
  // Métricas básicas
  const totalInteractions = data.heatmapData.reduce((sum, h) => sum + h.volume, 0);
  const avgAHT = data.heatmapData.length > 0
    ? Math.round(data.heatmapData.reduce((sum, h) => sum + h.aht_seconds, 0) / data.heatmapData.length)
    : 0;
  const avgFCR = data.heatmapData.length > 0
    ? Math.round(data.heatmapData.reduce((sum, h) => sum + h.metrics.fcr, 0) / data.heatmapData.length)
    : 0;
  const avgTransferRate = data.heatmapData.length > 0
    ? Math.round(data.heatmapData.reduce((sum, h) => sum + h.metrics.transfer_rate, 0) / data.heatmapData.length)
    : 0;
  // Verificar si hay datos reales de CSAT (no todos son 0)
  const hasCSATData = data.heatmapData.some(h => h.metrics.csat > 0);
  const avgCSAT = hasCSATData && data.heatmapData.length > 0
    ? Math.round(data.heatmapData.reduce((sum, h) => sum + h.metrics.csat, 0) / data.heatmapData.length)
    : null;  // null indica "sin datos"

  const ahtBenchmark = data.benchmarkData.find(b => b.kpi.toLowerCase().includes('aht'));
  const fcrBenchmark = data.benchmarkData.find(b => b.kpi.toLowerCase().includes('fcr'));

  // v3.13: Métricas para headline y recomendación
  const allQueues = data.drilldownData?.flatMap(s => s.originalQueues) || [];
  const totalVolume = allQueues.reduce((s, q) => s + q.volume, 0);

  const colasAutomate = allQueues.filter(q => q.tier === 'AUTOMATE');
  const colasHumanOnly = allQueues.filter(q => q.tier === 'HUMAN-ONLY');
  const volumenHumanOnly = colasHumanOnly.reduce((s, q) => s + q.volume, 0);
  const pctHumanOnly = totalVolume > 0 ? volumenHumanOnly / totalVolume : 0;

  // Red flags: colas con CV > 100% o FCR < 50%
  const colasConRedFlags = allQueues.filter(q =>
    q.cv_aht > 100 || q.fcr_rate < 50 || q.transfer_rate > 25
  ).length;

  const ahorroTotal = data.economicModel?.annualSavings || 0;
  const dimensionesConProblemas = data.dimensions.filter(d => d.score < 60).length;

  // Scores para status bar
  const eficienciaScore = Math.min(100, Math.max(0, Math.round((1 - (avgAHT - 240) / 360) * 100)));
  const resolucionScore = Math.min(100, Math.round((avgFCR / 85) * 100));
  const satisfaccionScore = avgCSAT ?? 0;  // Para cálculos que necesiten número

  // Datos para recomendación
  const recomendacionData: RecomendacionData = {
    colasAutomate: colasAutomate.length,
    topColasAutomate: colasAutomate.slice(0, 5).map(q => q.original_queue_id),
    volumenHuman: volumenHumanOnly,
    pctHuman: pctHumanOnly,
    colasConRedFlags,
    ahorroTotal
  };

  return (
    <div className="space-y-5">
      {/* ========================================
          1. CABECERA CON PERIODO
          ======================================== */}
      <CabeceraPeriodo data={data} />

      {/* ========================================
          2. KPIs HEADER (Métricas clave)
          ======================================== */}
      <KeyMetricsCard
        totalInteractions={totalInteractions}
        avgAHT={avgAHT}
        avgFCR={avgFCR}
        avgTransferRate={avgTransferRate}
        ahtBenchmark={ahtBenchmark?.industryValue}
        fcrBenchmark={fcrBenchmark?.industryValue}
      />

      {/* ========================================
          3. HEALTH SCORE
          ======================================== */}
      <HealthScoreDetailed
        score={data.overallHealthScore}
        avgFCR={avgFCR}
        avgAHT={avgAHT}
        avgTransferRate={avgTransferRate}
        avgCSAT={avgCSAT}
      />

      {/* ========================================
          4. BENCHMARK VS INDUSTRIA
          ======================================== */}
      <BenchmarkTable heatmapData={data.heatmapData} />

      {/* ========================================
          5. PRINCIPALES HALLAZGOS
          ======================================== */}
      <PrincipalesHallazgos data={data} />

      {/* ========================================
          6. SIGUIENTE PASO RECOMENDADO (Acción)
          ======================================== */}
      <SiguientePasoRecomendado
        recomendacion={recomendacionData}
        ahorroTotal={ahorroTotal}
        onVerRoadmap={onTabChange ? () => onTabChange('roadmap') : undefined}
      />

      {/* ========================================
          6. NAVEGACIÓN RÁPIDA (Explorar más)
          ======================================== */}
      {onTabChange && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Explorar análisis detallado
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  <span className="font-medium text-gray-700 text-sm">Análisis por Dimensiones</span>
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
          </div>
        </div>
      )}
    </div>
  );
}

export default ExecutiveSummaryTab;
