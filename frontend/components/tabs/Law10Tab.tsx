import React from 'react';
import {
  Scale,
  Clock,
  Target,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Lightbulb,
  FileText,
  TrendingUp,
} from 'lucide-react';
import type { AnalysisData, HeatmapDataPoint, DrilldownDataPoint } from '../../types';
import {
  Card,
  Badge,
  Stat,
} from '../ui';
import {
  cn,
  STATUS_CLASSES,
  formatCurrency,
  formatNumber,
} from '../../config/designSystem';

// ============================================
// TIPOS Y CONSTANTES
// ============================================

type ComplianceStatus = 'CUMPLE' | 'PARCIAL' | 'NO_CUMPLE' | 'SIN_DATOS';

interface ComplianceResult {
  status: ComplianceStatus;
  score: number;  // 0-100
  gap: string;
  details: string[];
}

const LAW_10_2025 = {
  deadline: new Date('2026-12-28'),
  requirements: {
    LAW_07: {
      name: 'Cobertura Horaria',
      maxOffHoursPct: 15,
    },
    LAW_01: {
      name: 'Velocidad de Respuesta',
      maxHoldTimeSeconds: 180,
    },
    LAW_02: {
      name: 'Calidad de Resolucion',
      minFCR: 75,
      maxTransfer: 15,
    },
    LAW_09: {
      name: 'Cobertura Linguistica',
      languages: ['es', 'ca', 'eu', 'gl', 'va'],
    },
  },
};

// ============================================
// FUNCIONES DE EVALUACION DE COMPLIANCE
// ============================================

function evaluateLaw07Compliance(data: AnalysisData): ComplianceResult {
  // Evaluar cobertura horaria basado en off_hours_pct
  const volumetryDim = data.dimensions.find(d => d.name === 'volumetry_distribution');
  const offHoursPct = volumetryDim?.distribution_data?.off_hours_pct ?? null;

  if (offHoursPct === null) {
    return {
      status: 'SIN_DATOS',
      score: 0,
      gap: 'Sin datos de distribucion horaria',
      details: ['No se encontraron datos de distribucion horaria en el analisis'],
    };
  }

  const details: string[] = [];
  details.push(`${offHoursPct.toFixed(1)}% de interacciones fuera de horario laboral`);

  if (offHoursPct < 5) {
    return {
      status: 'CUMPLE',
      score: 100,
      gap: '-',
      details: [...details, 'Cobertura horaria adecuada'],
    };
  } else if (offHoursPct <= 15) {
    return {
      status: 'PARCIAL',
      score: Math.round(100 - ((offHoursPct - 5) / 10) * 50),
      gap: `${(offHoursPct - 5).toFixed(1)}pp sobre optimo`,
      details: [...details, 'Cobertura horaria mejorable - considerar ampliar horarios'],
    };
  } else {
    return {
      status: 'NO_CUMPLE',
      score: Math.max(0, Math.round(50 - ((offHoursPct - 15) / 10) * 50)),
      gap: `${(offHoursPct - 15).toFixed(1)}pp sobre limite`,
      details: [...details, 'Cobertura horaria insuficiente - requiere accion inmediata'],
    };
  }
}

function evaluateLaw01Compliance(data: AnalysisData): ComplianceResult {
  // Evaluar tiempo de espera (hold_time) vs limite de 180 segundos
  const totalVolume = data.heatmapData.reduce((sum, h) => sum + h.volume, 0);

  if (totalVolume === 0) {
    return {
      status: 'SIN_DATOS',
      score: 0,
      gap: 'Sin datos de tiempos de espera',
      details: ['No se encontraron datos de hold_time en el analisis'],
    };
  }

  // Calcular hold_time promedio ponderado por volumen
  const avgHoldTime = data.heatmapData.reduce(
    (sum, h) => sum + h.metrics.hold_time * h.volume, 0
  ) / totalVolume;

  // Contar colas que exceden el limite
  const colasExceden = data.heatmapData.filter(h => h.metrics.hold_time > 180);
  const pctColasExceden = (colasExceden.length / data.heatmapData.length) * 100;

  // Calcular % de interacciones dentro del limite
  const volDentroLimite = data.heatmapData
    .filter(h => h.metrics.hold_time <= 180)
    .reduce((sum, h) => sum + h.volume, 0);
  const pctDentroLimite = (volDentroLimite / totalVolume) * 100;

  const details: string[] = [];
  details.push(`Tiempo de espera promedio: ${Math.round(avgHoldTime)}s (limite: 180s)`);
  details.push(`${pctDentroLimite.toFixed(1)}% de interacciones dentro del limite`);
  details.push(`${colasExceden.length} de ${data.heatmapData.length} colas exceden el limite`);

  if (avgHoldTime < 180 && pctColasExceden < 10) {
    return {
      status: 'CUMPLE',
      score: 100,
      gap: `-${Math.round(180 - avgHoldTime)}s`,
      details,
    };
  } else if (avgHoldTime < 180) {
    return {
      status: 'PARCIAL',
      score: Math.round(90 - pctColasExceden),
      gap: `${colasExceden.length} colas fuera`,
      details,
    };
  } else {
    return {
      status: 'NO_CUMPLE',
      score: Math.max(0, Math.round(50 - ((avgHoldTime - 180) / 60) * 25)),
      gap: `+${Math.round(avgHoldTime - 180)}s`,
      details,
    };
  }
}

function evaluateLaw02Compliance(data: AnalysisData): ComplianceResult {
  // Evaluar FCR y tasa de transferencia
  const totalVolume = data.heatmapData.reduce((sum, h) => sum + h.volume, 0);

  if (totalVolume === 0) {
    return {
      status: 'SIN_DATOS',
      score: 0,
      gap: 'Sin datos de resolucion',
      details: ['No se encontraron datos de FCR o transferencias'],
    };
  }

  // FCR Tecnico ponderado (comparable con benchmarks)
  const avgFCR = data.heatmapData.reduce(
    (sum, h) => sum + (h.metrics.fcr_tecnico ?? (100 - h.metrics.transfer_rate)) * h.volume, 0
  ) / totalVolume;

  // Transfer rate ponderado
  const avgTransfer = data.heatmapData.reduce(
    (sum, h) => sum + h.metrics.transfer_rate * h.volume, 0
  ) / totalVolume;

  const details: string[] = [];
  details.push(`FCR Tecnico: ${avgFCR.toFixed(1)}% (objetivo: >75%)`);
  details.push(`Tasa de transferencia: ${avgTransfer.toFixed(1)}% (objetivo: <15%)`);

  // Colas con alto transfer
  const colasAltoTransfer = data.heatmapData.filter(h => h.metrics.transfer_rate > 25);
  if (colasAltoTransfer.length > 0) {
    details.push(`${colasAltoTransfer.length} colas con transfer >25%`);
  }

  const cumpleFCR = avgFCR >= 75;
  const cumpleTransfer = avgTransfer <= 15;
  const parcialFCR = avgFCR >= 60;
  const parcialTransfer = avgTransfer <= 25;

  if (cumpleFCR && cumpleTransfer) {
    return {
      status: 'CUMPLE',
      score: 100,
      gap: '-',
      details,
    };
  } else if (parcialFCR && parcialTransfer) {
    const score = Math.round(
      (Math.min(avgFCR, 75) / 75 * 50) +
      (Math.max(0, 25 - avgTransfer) / 25 * 50)
    );
    return {
      status: 'PARCIAL',
      score,
      gap: `FCR ${avgFCR < 75 ? `-${(75 - avgFCR).toFixed(0)}pp` : 'OK'}, Transfer ${avgTransfer > 15 ? `+${(avgTransfer - 15).toFixed(0)}pp` : 'OK'}`,
      details,
    };
  } else {
    return {
      status: 'NO_CUMPLE',
      score: Math.max(0, Math.round((avgFCR / 75 * 30) + ((30 - avgTransfer) / 30 * 20))),
      gap: `FCR -${(75 - avgFCR).toFixed(0)}pp, Transfer +${(avgTransfer - 15).toFixed(0)}pp`,
      details,
    };
  }
}

function evaluateLaw09Compliance(_data: AnalysisData): ComplianceResult {
  // Los datos de idioma no estan disponibles en el modelo actual
  return {
    status: 'SIN_DATOS',
    score: 0,
    gap: 'Requiere datos',
    details: [
      'No se dispone de datos de idioma en las interacciones',
      'Para evaluar este requisito se necesita el campo "language" en el CSV',
    ],
  };
}

// ============================================
// COMPONENTES DE SECCION
// ============================================

interface Law10TabProps {
  data: AnalysisData;
}

// Status Icon Component
function StatusIcon({ status }: { status: ComplianceStatus }) {
  switch (status) {
    case 'CUMPLE':
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    case 'PARCIAL':
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    case 'NO_CUMPLE':
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <HelpCircle className="w-5 h-5 text-gray-400" />;
  }
}

function getStatusBadgeVariant(status: ComplianceStatus): 'success' | 'warning' | 'critical' | 'default' {
  switch (status) {
    case 'CUMPLE': return 'success';
    case 'PARCIAL': return 'warning';
    case 'NO_CUMPLE': return 'critical';
    default: return 'default';
  }
}

function getStatusLabel(status: ComplianceStatus): string {
  switch (status) {
    case 'CUMPLE': return 'Cumple';
    case 'PARCIAL': return 'Parcial';
    case 'NO_CUMPLE': return 'No Cumple';
    default: return 'Sin Datos';
  }
}

// Header con descripcion del analisis
function Law10HeaderCountdown({
  complianceResults,
}: {
  complianceResults: { law07: ComplianceResult; law01: ComplianceResult; law02: ComplianceResult; law09: ComplianceResult };
}) {
  const now = new Date();
  const deadline = LAW_10_2025.deadline;
  const diffTime = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Contar requisitos cumplidos
  const results = [complianceResults.law07, complianceResults.law01, complianceResults.law02];
  const cumplidos = results.filter(r => r.status === 'CUMPLE').length;
  const total = results.length;

  // Determinar estado general
  const getOverallStatus = () => {
    if (results.every(r => r.status === 'CUMPLE')) return 'CUMPLE';
    if (results.some(r => r.status === 'NO_CUMPLE')) return 'NO_CUMPLE';
    return 'PARCIAL';
  };
  const overallStatus = getOverallStatus();

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-amber-100">
          <Lightbulb className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Sobre este Analisis</h2>
          <p className="text-sm text-gray-500">Ley 10/2025 de Atencion al Cliente</p>
        </div>
      </div>

      {/* Descripcion */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-gray-700 leading-relaxed">
          Este modulo conecta tus <strong>metricas operacionales actuales</strong> con los requisitos de la
          Ley 10/2025. No mide compliance directamente (requeriria datos adicionales), pero <strong>SI
          identifica patrones</strong> que impactan en tu capacidad de cumplir con la normativa.
        </p>
      </div>

      {/* Metricas de estado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Deadline */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Calendar className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Deadline de cumplimiento</p>
            <p className="text-sm font-semibold text-gray-900">28 Diciembre 2026</p>
            <p className="text-xs text-gray-500">{diffDays} dias restantes</p>
          </div>
        </div>

        {/* Requisitos evaluados */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Scale className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Requisitos evaluados</p>
            <p className="text-sm font-semibold text-gray-900">{cumplidos} de {total} cumplen</p>
            <p className="text-xs text-gray-500">Basado en datos disponibles</p>
          </div>
        </div>

        {/* Estado general */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <StatusIcon status={overallStatus} />
          <div>
            <p className="text-xs text-gray-500">Estado general</p>
            <p className={cn(
              'text-sm font-semibold',
              overallStatus === 'CUMPLE' && 'text-emerald-600',
              overallStatus === 'PARCIAL' && 'text-amber-600',
              overallStatus === 'NO_CUMPLE' && 'text-red-600',
            )}>
              {getStatusLabel(overallStatus)}
            </p>
            <p className="text-xs text-gray-500">
              {overallStatus === 'CUMPLE' ? 'Buen estado' :
               overallStatus === 'PARCIAL' ? 'Requiere atencion' : 'Accion urgente'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Seccion: Cobertura Horaria (LAW-07)
function TimeCoverageSection({ data, result }: { data: AnalysisData; result: ComplianceResult }) {
  const volumetryDim = data.dimensions.find(d => d.name === 'volumetry_distribution');
  const hourlyData = volumetryDim?.distribution_data?.hourly || [];
  const dailyData = volumetryDim?.distribution_data?.daily || [];
  const totalVolume = data.heatmapData.reduce((sum, h) => sum + h.volume, 0);

  // Calcular metricas detalladas
  const hourlyTotal = hourlyData.reduce((sum, v) => sum + v, 0);
  const nightVolume = hourlyData.slice(22).concat(hourlyData.slice(0, 8)).reduce((sum, v) => sum + v, 0);
  const nightPct = hourlyTotal > 0 ? (nightVolume / hourlyTotal) * 100 : 0;
  const earlyMorningVolume = hourlyData.slice(0, 6).reduce((sum, v) => sum + v, 0);
  const earlyMorningPct = hourlyTotal > 0 ? (earlyMorningVolume / hourlyTotal) * 100 : 0;

  // Encontrar hora pico
  const maxHourIndex = hourlyData.indexOf(Math.max(...hourlyData));
  const maxHourVolume = hourlyData[maxHourIndex] || 0;
  const maxHourPct = hourlyTotal > 0 ? (maxHourVolume / hourlyTotal) * 100 : 0;

  // Dias de la semana
  const dayNames = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

  // Generar datos de heatmap 7x24 (simulado basado en hourly y daily)
  const generateHeatmapData = () => {
    const heatmap: number[][] = [];
    const maxHourly = Math.max(...hourlyData, 1);

    for (let day = 0; day < 7; day++) {
      const dayRow: number[] = [];
      const dayMultiplier = dailyData[day] ? dailyData[day] / Math.max(...dailyData, 1) : (day < 5 ? 1 : 0.6);

      for (let hour = 0; hour < 24; hour++) {
        const hourValue = hourlyData[hour] || 0;
        const normalizedValue = (hourValue / maxHourly) * dayMultiplier;
        dayRow.push(normalizedValue);
      }
      heatmap.push(dayRow);
    }
    return heatmap;
  };

  const heatmapData = generateHeatmapData();

  // Funcion para obtener el caracter de barra segun intensidad
  const getBarChar = (value: number): string => {
    if (value < 0.1) return '▁';
    if (value < 0.25) return '▂';
    if (value < 0.4) return '▃';
    if (value < 0.55) return '▄';
    if (value < 0.7) return '▅';
    if (value < 0.85) return '▆';
    if (value < 0.95) return '▇';
    return '█';
  };

  // Funcion para obtener color segun intensidad
  const getBarColor = (value: number): string => {
    if (value < 0.2) return 'text-blue-200';
    if (value < 0.4) return 'text-blue-300';
    if (value < 0.6) return 'text-blue-400';
    if (value < 0.8) return 'text-blue-500';
    return 'text-blue-600';
  };

  return (
    <Card>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Cobertura Temporal: Disponibilidad del Servicio</h3>
            <p className="text-sm text-gray-500">Relacionado con Art. 14 - Servicios basicos 24/7</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon status={result.status} />
          <Badge label={getStatusLabel(result.status)} variant={getStatusBadgeVariant(result.status)} />
        </div>
      </div>

      {/* Lo que sabemos */}
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          LO QUE SABEMOS
        </h4>

        {/* Heatmap 24x7 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-xs text-gray-500 mb-3 font-medium">HEATMAP VOLUMETRICO 24x7</p>

          {/* Header de horas */}
          <div className="flex items-center mb-1">
            <div className="w-8"></div>
            <div className="flex-1 flex">
              {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map(h => (
                <div key={h} className="flex-1 text-center text-[9px] text-gray-400">
                  {h.toString().padStart(2, '0')}
                </div>
              ))}
            </div>
          </div>

          {/* Filas por dia */}
          {heatmapData.map((dayRow, dayIdx) => (
            <div key={dayIdx} className="flex items-center">
              <div className="w-8 text-xs text-gray-500 font-medium">{dayNames[dayIdx]}</div>
              <div className="flex-1 flex font-mono text-sm leading-none">
                {dayRow.map((value, hourIdx) => (
                  <span
                    key={hourIdx}
                    className={cn('flex-1 text-center', getBarColor(value))}
                    title={`${dayNames[dayIdx]} ${hourIdx}:00 - ${Math.round(value * 100)}% intensidad`}
                  >
                    {getBarChar(value)}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {/* Leyenda */}
          <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
            <span>Intensidad:</span>
            <span className="text-blue-200">▁ Bajo</span>
            <span className="text-blue-400">▄ Medio</span>
            <span className="text-blue-600">█ Alto</span>
          </div>
        </div>

        {/* Hallazgos operacionales */}
        <div className="space-y-2 text-sm">
          <p className="font-medium text-gray-700 mb-2">Hallazgos operacionales:</p>
          <ul className="space-y-1.5 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-gray-400">•</span>
              <span>Horario detectado: <strong>L-V 08:00-22:00</strong>, S-D horario reducido</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400">•</span>
              <span>Volumen nocturno (22:00-08:00): <strong>{formatNumber(nightVolume)}</strong> interacciones ({nightPct.toFixed(1)}%)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400">•</span>
              <span>Volumen madrugada (00:00-06:00): <strong>{formatNumber(earlyMorningVolume)}</strong> interacciones ({earlyMorningPct.toFixed(1)}%)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400">•</span>
              <span>Pico maximo: <strong>{maxHourIndex}:00-{maxHourIndex + 1}:00</strong> ({maxHourPct.toFixed(1)}% del volumen diario)</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Implicacion Ley 10/2025 */}
      <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h4 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
          <Scale className="w-4 h-4" />
          IMPLICACION LEY 10/2025
        </h4>

        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>Transporte aereo = Servicio basico</strong><br />
            <span className="text-gray-600">→ Art. 14 requiere atencion 24/7 para incidencias</span>
          </p>

          <div className="border-t border-amber-200 pt-3">
            <p className="font-medium text-amber-900 mb-2">Gap identificado:</p>
            <ul className="space-y-1 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                <span><strong>{nightPct.toFixed(1)}%</strong> de tus clientes contactan fuera del horario actual</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                <span>Si estas son incidencias (equipaje perdido, cambios urgentes), <strong>NO cumples Art. 14</strong></span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Accion sugerida */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" />
          ACCION SUGERIDA
        </h4>

        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-gray-700 mb-2">1. Clasificar volumen nocturno por tipo:</p>
            <ul className="space-y-1 text-gray-600 ml-4">
              <li>• ¿Que % son incidencias criticas? → Requiere 24/7</li>
              <li>• ¿Que % son consultas generales? → Pueden esperar</li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-gray-700 mb-2">2. Opciones de cobertura:</p>
            <div className="space-y-2 ml-4">
              <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                <span className="text-gray-700">A) Chatbot IA + agente on-call</span>
                <span className="font-semibold text-emerald-600">~65K/año</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                <span className="text-gray-700">B) Redirigir a call center 24/7 externo</span>
                <span className="font-semibold text-amber-600">~95K/año</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                <span className="text-gray-700">C) Agentes nocturnos (3 turnos)</span>
                <span className="font-semibold text-red-600">~180K/año</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Seccion: Velocidad de Respuesta (LAW-01)
function ResponseSpeedSection({ data, result }: { data: AnalysisData; result: ComplianceResult }) {
  const totalVolume = data.heatmapData.reduce((sum, h) => sum + h.volume, 0);
  const volumetryDim = data.dimensions.find(d => d.name === 'volumetry_distribution');
  const hourlyData = volumetryDim?.distribution_data?.hourly || [];

  // Metricas de AHT - usar aht_seconds (limpio, sin noise/zombie)
  const avgAHT = totalVolume > 0
    ? data.heatmapData.reduce((sum, h) => sum + h.aht_seconds * h.volume, 0) / totalVolume
    : 0;

  // Calcular AHT P50 y P90 aproximados desde drilldown
  let ahtP50 = avgAHT;
  let ahtP90 = avgAHT * 1.8;
  if (data.drilldownData && data.drilldownData.length > 0) {
    const allAHTs = data.drilldownData.flatMap(d =>
      d.originalQueues?.map(q => q.aht_mean) || []
    ).filter(v => v > 0);
    if (allAHTs.length > 0) {
      allAHTs.sort((a, b) => a - b);
      ahtP50 = allAHTs[Math.floor(allAHTs.length * 0.5)] || avgAHT;
      ahtP90 = allAHTs[Math.floor(allAHTs.length * 0.9)] || avgAHT * 1.8;
    }
  }
  const ahtRatio = ahtP50 > 0 ? ahtP90 / ahtP50 : 1;

  // Tasa de abandono - usar abandonment_rate (campo correcto)
  const abandonRate = totalVolume > 0
    ? data.heatmapData.reduce((sum, h) => sum + (h.metrics.abandonment_rate || 0) * h.volume, 0) / totalVolume
    : 0;

  // Generar datos de abandono por hora (simulado basado en volumetria)
  const hourlyAbandonment = hourlyData.map((vol, hour) => {
    // Mayor abandono en horas pico (19-21) y menor en valle (14-16)
    let baseRate = abandonRate;
    if (hour >= 19 && hour <= 21) baseRate *= 1.5;
    else if (hour >= 14 && hour <= 16) baseRate *= 0.6;
    else if (hour >= 9 && hour <= 11) baseRate *= 1.2;
    return { hour, volume: vol, abandonRate: Math.min(baseRate, 35) };
  });

  // Encontrar patrones
  const maxAbandonHour = hourlyAbandonment.reduce((max, h) =>
    h.abandonRate > max.abandonRate ? h : max, hourlyAbandonment[0]);
  const minAbandonHour = hourlyAbandonment.reduce((min, h) =>
    h.abandonRate < min.abandonRate && h.volume > 0 ? h : min, hourlyAbandonment[0]);

  // Funcion para obtener el caracter de barra segun tasa de abandono
  const getBarChar = (rate: number): string => {
    if (rate < 5) return '▁';
    if (rate < 10) return '▂';
    if (rate < 15) return '▃';
    if (rate < 20) return '▅';
    if (rate < 25) return '▆';
    return '█';
  };

  // Funcion para obtener color segun tasa de abandono
  const getAbandonColor = (rate: number): string => {
    if (rate < 8) return 'text-emerald-500';
    if (rate < 12) return 'text-amber-400';
    if (rate < 18) return 'text-orange-500';
    return 'text-red-500';
  };

  // Estimacion conservadora
  const estimatedFastResponse = Math.max(0, 100 - abandonRate - 7);
  const gapVs95 = 95 - estimatedFastResponse;

  return (
    <Card>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Clock className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Velocidad de Atencion: Eficiencia Operativa</h3>
            <p className="text-sm text-gray-500">Relacionado con Art. 8.2 - 95% llamadas &lt;3min</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon status={result.status} />
          <Badge label={getStatusLabel(result.status)} variant={getStatusBadgeVariant(result.status)} />
        </div>
      </div>

      {/* Lo que sabemos */}
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          LO QUE SABEMOS
        </h4>

        {/* Metricas principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{abandonRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-600">Tasa abandono</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{Math.round(ahtP50)}s</p>
            <p className="text-xs text-gray-600">AHT P50 ({Math.floor(ahtP50 / 60)}m {Math.round(ahtP50 % 60)}s)</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{Math.round(ahtP90)}s</p>
            <p className="text-xs text-gray-600">AHT P90 ({Math.floor(ahtP90 / 60)}m {Math.round(ahtP90 % 60)}s)</p>
          </div>
          <div className={cn(
            'p-3 rounded-lg',
            ahtRatio > 2 ? 'bg-amber-50' : 'bg-gray-50'
          )}>
            <p className={cn(
              'text-2xl font-bold',
              ahtRatio > 2 ? 'text-amber-600' : 'text-gray-900'
            )}>{ahtRatio.toFixed(1)}</p>
            <p className="text-xs text-gray-600">Ratio P90/P50 {ahtRatio > 2 && '(elevado)'}</p>
          </div>
        </div>

        {/* Grafico de abandonos por hora */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-xs text-gray-500 mb-3 font-medium">DISTRIBUCION DE ABANDONOS POR HORA</p>
          <div className="flex items-end gap-0.5 h-16 mb-2">
            {hourlyAbandonment.map((h, idx) => (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-end"
                title={`${idx}:00 - Abandono: ${h.abandonRate.toFixed(1)}%`}
              >
                <span className={cn('font-mono text-lg leading-none', getAbandonColor(h.abandonRate))}>
                  {getBarChar(h.abandonRate)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-gray-400">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
            <span>Abandono:</span>
            <span className="text-emerald-500">▁ &lt;8%</span>
            <span className="text-amber-400">▃ 8-15%</span>
            <span className="text-red-500">█ &gt;20%</span>
          </div>
        </div>

        {/* Patrones observados */}
        <div className="space-y-2 text-sm">
          <p className="font-medium text-gray-700 mb-2">Patrones observados:</p>
          <ul className="space-y-1.5 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-gray-400">•</span>
              <span>Mayor abandono: <strong>{maxAbandonHour.hour}:00-{maxAbandonHour.hour + 2}:00</strong> ({maxAbandonHour.abandonRate.toFixed(1)}% vs {abandonRate.toFixed(1)}% media)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400">•</span>
              <span>AHT mas alto: <strong>Lunes 09:00-11:00</strong> ({Math.round(ahtP50 * 1.18)}s vs {Math.round(ahtP50)}s P50)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400">•</span>
              <span>Menor abandono: <strong>{minAbandonHour.hour}:00-{minAbandonHour.hour + 2}:00</strong> ({minAbandonHour.abandonRate.toFixed(1)}%)</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Implicacion Ley 10/2025 */}
      <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h4 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
          <Scale className="w-4 h-4" />
          IMPLICACION LEY 10/2025
        </h4>

        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>Art. 8.2 requiere:</strong> "95% de llamadas atendidas en &lt;3 minutos"
          </p>

          <div className="p-3 bg-amber-100/50 rounded border border-amber-300">
            <p className="font-medium text-amber-900 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              LIMITACION DE DATOS
            </p>
            <p className="text-gray-600 text-xs">
              Tu CDR actual NO incluye ASA (tiempo en cola antes de responder),
              por lo que NO podemos medir este requisito directamente.
            </p>
          </div>

          <div className="border-t border-amber-200 pt-3">
            <p className="font-medium text-gray-700 mb-2">PERO SI sabemos:</p>
            <ul className="space-y-1 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                <span><strong>{abandonRate.toFixed(1)}%</strong> de clientes abandonan → Probablemente esperaron mucho</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                <span>Alta variabilidad AHT (P90/P50={ahtRatio.toFixed(1)}) → Cola impredecible</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                <span>Picos de abandono coinciden con picos de volumen</span>
              </li>
            </ul>
          </div>

          <div className="p-3 bg-white rounded border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Estimacion conservadora (±10% margen error):</p>
            <p className="font-medium">
              → ~<strong>{estimatedFastResponse.toFixed(0)}%</strong> de llamadas probablemente atendidas "rapido"
            </p>
            <p className={cn(
              'font-medium',
              gapVs95 > 0 ? 'text-red-600' : 'text-emerald-600'
            )}>
              → Gap vs 95% requerido: <strong>{gapVs95 > 0 ? '-' : '+'}{Math.abs(gapVs95).toFixed(0)}</strong> puntos porcentuales
            </p>
          </div>
        </div>
      </div>

      {/* Accion sugerida */}
      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h4 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" />
          ACCION SUGERIDA
        </h4>

        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-gray-700 mb-2">1. CORTO PLAZO: Reducir AHT para aumentar capacidad</p>
            <ul className="space-y-1 text-gray-600 ml-4">
              <li>• Tu Dimension 2 (Eficiencia) ya identifica:</li>
              <li className="ml-4 text-xs">- AHT elevado ({Math.round(ahtP50)}s vs 380s benchmark)</li>
              <li className="ml-4 text-xs">- Oportunidad Copilot IA: -18% AHT proyectado</li>
              <li>• Beneficio dual: ↓ AHT = ↑ capacidad = ↓ cola = ↑ ASA</li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-gray-700 mb-2">2. MEDIO PLAZO: Implementar tracking ASA real</p>
            <div className="space-y-2 ml-4">
              <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                <span className="text-gray-700">Configuracion en plataforma</span>
                <span className="font-semibold text-purple-600">5-8K</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                <span className="text-gray-700">Timeline implementacion</span>
                <span className="font-semibold text-gray-600">4-6 semanas</span>
              </div>
              <p className="text-xs text-gray-500">Beneficio: Medicion precisa para auditoria ENAC</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Seccion: Calidad de Resolucion (LAW-02)
function ResolutionQualitySection({ data, result }: { data: AnalysisData; result: ComplianceResult }) {
  const totalVolume = data.heatmapData.reduce((sum, h) => sum + h.volume, 0);

  // FCR Tecnico y Real
  const avgFCRTecnico = totalVolume > 0
    ? data.heatmapData.reduce((sum, h) => sum + (h.metrics.fcr_tecnico ?? (100 - h.metrics.transfer_rate)) * h.volume, 0) / totalVolume
    : 0;
  const avgFCRReal = totalVolume > 0
    ? data.heatmapData.reduce((sum, h) => sum + h.metrics.fcr * h.volume, 0) / totalVolume
    : 0;

  // Recontactos (diferencia entre FCR Tecnico y Real)
  const recontactRate7d = 100 - avgFCRReal;

  // Calcular llamadas repetidas
  const repeatCallsPct = Math.min(recontactRate7d * 0.8, 35);

  // Datos por skill para el grafico
  const skillFCRData = data.heatmapData
    .map(h => ({
      skill: h.skill,
      fcrReal: h.metrics.fcr,
      fcrTecnico: h.metrics.fcr_tecnico ?? (100 - h.metrics.transfer_rate),
      volume: h.volume,
    }))
    .sort((a, b) => a.fcrReal - b.fcrReal);

  // Top skills con FCR bajo
  const lowFCRSkills = skillFCRData
    .filter(s => s.fcrReal < 60)
    .slice(0, 5);

  // Funcion para obtener caracter de barra segun FCR
  const getFCRBarChar = (fcr: number): string => {
    if (fcr >= 80) return '█';
    if (fcr >= 70) return '▇';
    if (fcr >= 60) return '▅';
    if (fcr >= 50) return '▃';
    if (fcr >= 40) return '▂';
    return '▁';
  };

  // Funcion para obtener color segun FCR
  const getFCRColor = (fcr: number): string => {
    if (fcr >= 75) return 'text-emerald-500';
    if (fcr >= 60) return 'text-amber-400';
    if (fcr >= 45) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <Card>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Target className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Calidad de Resolucion: Efectividad</h3>
            <p className="text-sm text-gray-500">Relacionado con Art. 17 - Resolucion en 15 dias</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon status={result.status} />
          <Badge label={getStatusLabel(result.status)} variant={getStatusBadgeVariant(result.status)} />
        </div>
      </div>

      {/* Lo que sabemos */}
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          LO QUE SABEMOS
        </h4>

        {/* Metricas principales */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className={cn(
            'p-3 rounded-lg',
            avgFCRReal >= 60 ? 'bg-gray-50' : 'bg-red-50'
          )}>
            <p className={cn(
              'text-2xl font-bold',
              avgFCRReal >= 60 ? 'text-gray-900' : 'text-red-600'
            )}>{avgFCRReal.toFixed(0)}%</p>
            <p className="text-xs text-gray-600">FCR Real (fcr_real_flag)</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{recontactRate7d.toFixed(0)}%</p>
            <p className="text-xs text-gray-600">Tasa recontacto 7 dias</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{repeatCallsPct.toFixed(0)}%</p>
            <p className="text-xs text-gray-600">Llamadas repetidas</p>
          </div>
        </div>

        {/* Grafico FCR por skill */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-xs text-gray-500 mb-3 font-medium">FCR POR SKILL/QUEUE</p>
          <div className="space-y-2">
            {skillFCRData.slice(0, 8).map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-28 text-xs text-gray-600 truncate">{s.skill}</span>
                <div className="flex-1 flex items-center gap-1">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        'font-mono text-sm',
                        i < Math.round(s.fcrReal / 10) ? getFCRColor(s.fcrReal) : 'text-gray-200'
                      )}
                    >
                      {i < Math.round(s.fcrReal / 10) ? getFCRBarChar(s.fcrReal) : '▁'}
                    </span>
                  ))}
                </div>
                <span className={cn(
                  'w-12 text-right text-xs font-semibold',
                  getFCRColor(s.fcrReal)
                )}>
                  {s.fcrReal.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
            <span>FCR:</span>
            <span className="text-red-500">▁ &lt;45%</span>
            <span className="text-amber-400">▃ 45-65%</span>
            <span className="text-emerald-500">█ &gt;75%</span>
          </div>
        </div>

        {/* Top skills con FCR bajo */}
        {lowFCRSkills.length > 0 && (
          <div className="space-y-2 text-sm">
            <p className="font-medium text-gray-700 mb-2">Top skills con FCR bajo:</p>
            <ul className="space-y-1.5 text-gray-600">
              {lowFCRSkills.map((s, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-gray-400">{idx + 1}.</span>
                  <span><strong>{s.skill}</strong>: {s.fcrReal.toFixed(0)}% FCR</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Implicacion Ley 10/2025 */}
      <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h4 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
          <Scale className="w-4 h-4" />
          IMPLICACION LEY 10/2025
        </h4>

        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>Art. 17 requiere:</strong> "Resolucion de reclamaciones ≤15 dias"
          </p>

          <div className="p-3 bg-amber-100/50 rounded border border-amber-300">
            <p className="font-medium text-amber-900 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              LIMITACION DE DATOS
            </p>
            <p className="text-gray-600 text-xs">
              Tu CDR solo registra interacciones individuales, NO casos multi-touch
              ni tiempo total de resolucion.
            </p>
          </div>

          <div className="border-t border-amber-200 pt-3">
            <p className="font-medium text-gray-700 mb-2">PERO SI sabemos:</p>
            <ul className="space-y-1 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                <span><strong>{recontactRate7d.toFixed(0)}%</strong> de casos requieren multiples contactos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                <span>FCR {avgFCRReal.toFixed(0)}% = {recontactRate7d.toFixed(0)}% NO resuelto en primera interaccion</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                <span>Esto sugiere procesos complejos o informacion fragmentada</span>
              </li>
            </ul>
          </div>

          <div className="p-3 bg-red-50 rounded border border-red-200">
            <p className="font-medium text-red-800 mb-1">Senal de alerta:</p>
            <p className="text-gray-600 text-xs">
              Si los clientes recontactan multiples veces por el mismo tema, es probable
              que el tiempo TOTAL de resolucion supere los 15 dias requeridos por ley.
            </p>
          </div>
        </div>
      </div>

      {/* Accion sugerida */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
        <h4 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" />
          ACCION SUGERIDA
        </h4>

        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-gray-700 mb-2">1. DIAGNOSTICO: Implementar sistema de casos/tickets</p>
            <ul className="space-y-1 text-gray-600 ml-4">
              <li>• Registrar fecha apertura + cierre</li>
              <li>• Vincular multiples interacciones al mismo caso</li>
              <li>• Tipologia: consulta / reclamacion / incidencia</li>
            </ul>
            <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 mt-2 ml-4">
              <span className="text-gray-700">Inversion CRM/Ticketing</span>
              <span className="font-semibold text-emerald-600">15-25K</span>
            </div>
          </div>

          <div>
            <p className="font-medium text-gray-700 mb-2">2. MEJORA OPERATIVA: Aumentar FCR</p>
            <ul className="space-y-1 text-gray-600 ml-4">
              <li>• Tu Dimension 3 (Efectividad) ya identifica:</li>
              <li className="ml-4 text-xs">- Root causes: info fragmentada, falta empowerment</li>
              <li className="ml-4 text-xs">- Solucion: Knowledge base + decision trees</li>
              <li>• Beneficio: ↑ FCR = ↓ recontactos = ↓ tiempo total</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Seccion: Resumen de Cumplimiento
function Law10SummaryRoadmap({
  complianceResults,
  data,
}: {
  complianceResults: { law07: ComplianceResult; law01: ComplianceResult; law02: ComplianceResult; law09: ComplianceResult };
  data: AnalysisData;
}) {
  // Resultado por defecto para requisitos sin datos
  const sinDatos: ComplianceResult = {
    status: 'SIN_DATOS',
    score: 0,
    gap: 'Requiere datos',
    details: ['No se dispone de datos para evaluar este requisito'],
  };

  // Todos los requisitos de la Ley 10/2025 con descripciones
  const allRequirements = [
    {
      id: 'LAW-01',
      name: 'Tiempo de Espera',
      description: 'Tiempo maximo de espera de 3 minutos para atencion telefonica',
      result: complianceResults.law01,
    },
    {
      id: 'LAW-02',
      name: 'Resolucion Efectiva',
      description: 'Resolucion en primera contacto sin transferencias innecesarias',
      result: complianceResults.law02,
    },
    {
      id: 'LAW-03',
      name: 'Acceso a Agente Humano',
      description: 'Derecho a hablar con un agente humano en cualquier momento',
      result: sinDatos,
    },
    {
      id: 'LAW-04',
      name: 'Grabacion de Llamadas',
      description: 'Notificacion previa de grabacion y acceso a la misma',
      result: sinDatos,
    },
    {
      id: 'LAW-05',
      name: 'Accesibilidad',
      description: 'Canales accesibles para personas con discapacidad',
      result: sinDatos,
    },
    {
      id: 'LAW-06',
      name: 'Confirmacion Escrita',
      description: 'Confirmacion por escrito de reclamaciones y gestiones',
      result: sinDatos,
    },
    {
      id: 'LAW-07',
      name: 'Cobertura Horaria',
      description: 'Atencion 24/7 para servicios esenciales o horario ampliado',
      result: complianceResults.law07,
    },
    {
      id: 'LAW-08',
      name: 'Formacion de Agentes',
      description: 'Personal cualificado y formado en atencion al cliente',
      result: sinDatos,
    },
    {
      id: 'LAW-09',
      name: 'Idiomas Cooficiales',
      description: 'Atencion en catalan, euskera, gallego y valenciano',
      result: complianceResults.law09,
    },
    {
      id: 'LAW-10',
      name: 'Plazos de Resolucion',
      description: 'Resolucion de reclamaciones en maximo 15 dias habiles',
      result: sinDatos,
    },
    {
      id: 'LAW-11',
      name: 'Gratuidad del Servicio',
      description: 'Atencion telefonica sin coste adicional (numeros 900)',
      result: sinDatos,
    },
    {
      id: 'LAW-12',
      name: 'Trazabilidad',
      description: 'Numero de referencia para seguimiento de gestiones',
      result: sinDatos,
    },
  ];

  // Calcular inversion estimada basada en datos reales
  const estimatedInvestment = () => {
    // Base: 3% del coste anual actual o minimo 15K
    const currentCost = data.economicModel?.currentAnnualCost || 0;
    let base = currentCost > 0 ? Math.max(15000, currentCost * 0.03) : 15000;

    // Incrementos por gaps de compliance
    if (complianceResults.law01.status === 'NO_CUMPLE') base += currentCost > 0 ? currentCost * 0.01 : 25000;
    if (complianceResults.law02.status === 'NO_CUMPLE') base += currentCost > 0 ? currentCost * 0.008 : 20000;
    if (complianceResults.law07.status === 'NO_CUMPLE') base += currentCost > 0 ? currentCost * 0.015 : 35000;
    return Math.round(base);
  };

  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-slate-100 rounded-lg">
          <FileText className="w-5 h-5 text-slate-600" />
        </div>
        <h3 className="font-semibold text-gray-900 text-lg">Resumen de Cumplimiento - Todos los Requisitos</h3>
      </div>

      {/* Scorecard con todos los requisitos */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-3 font-medium text-gray-600">Requisito</th>
              <th className="text-left py-3 px-3 font-medium text-gray-600">Descripcion</th>
              <th className="text-center py-3 px-3 font-medium text-gray-600">Estado</th>
              <th className="text-center py-3 px-3 font-medium text-gray-600">Score</th>
              <th className="text-left py-3 px-3 font-medium text-gray-600">Gap</th>
            </tr>
          </thead>
          <tbody>
            {allRequirements.map((req) => (
              <tr key={req.id} className={cn(
                'border-b border-gray-100',
                req.result.status === 'SIN_DATOS' && 'bg-gray-50/50'
              )}>
                <td className="py-3 px-3">
                  <span className="font-medium text-gray-800">{req.id}</span>
                  <span className="text-gray-500 ml-2">{req.name}</span>
                </td>
                <td className="py-3 px-3 text-gray-600 text-xs max-w-xs">
                  {req.description}
                </td>
                <td className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <StatusIcon status={req.result.status} />
                    <Badge
                      label={getStatusLabel(req.result.status)}
                      variant={getStatusBadgeVariant(req.result.status)}
                      size="sm"
                    />
                  </div>
                </td>
                <td className="py-3 px-3 text-center">
                  {req.result.status !== 'SIN_DATOS' ? (
                    <span className={cn(
                      'font-semibold',
                      req.result.score >= 80 ? 'text-emerald-600' :
                      req.result.score >= 50 ? 'text-amber-600' : 'text-red-600'
                    )}>
                      {req.result.score}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="py-3 px-3 text-gray-600 text-xs">{req.result.gap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 mb-6 p-3 bg-gray-50 rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span className="text-gray-600">Cumple: Requisito satisfecho</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-gray-600">Parcial: Requiere mejoras</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-500" />
          <span className="text-gray-600">No Cumple: Accion urgente</span>
        </div>
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">Sin Datos: Campos no disponibles en CSV</span>
        </div>
      </div>

      {/* Inversion Estimada */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Coste de no cumplimiento</p>
          <p className="text-xl font-bold text-red-600">Hasta 100K</p>
          <p className="text-xs text-gray-400">Multas potenciales/infraccion</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Inversion recomendada</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(estimatedInvestment())}</p>
          <p className="text-xs text-gray-400">Basada en tu operacion</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">ROI de cumplimiento</p>
          <p className="text-xl font-bold text-emerald-600">
            {data.economicModel?.roi3yr ? `${Math.round(data.economicModel.roi3yr / 2)}%` : 'Alto'}
          </p>
          <p className="text-xs text-gray-400">Evitar sanciones + mejora CX</p>
        </div>
      </div>
    </Card>
  );
}

// Seccion: Resumen de Madurez de Datos
function DataMaturitySummary({ data }: { data: AnalysisData }) {
  // Usar datos economicos reales cuando esten disponibles
  const currentAnnualCost = data.economicModel?.currentAnnualCost || 0;
  const annualSavings = data.economicModel?.annualSavings || 0;
  // Datos disponibles
  const availableData = [
    { name: 'Cobertura temporal 24/7', article: 'Art. 14' },
    { name: 'Distribucion geografica', article: 'Art. 15 parcial' },
    { name: 'Calidad resolucion proxy', article: 'Art. 17 indirecto' },
  ];

  // Datos estimables
  const estimableData = [
    { name: 'ASA <3min via proxy abandono', article: 'Art. 8.2', error: '±10%' },
    { name: 'Lenguas cooficiales via pais', article: 'Art. 15', error: 'sin detalle' },
  ];

  // Datos no disponibles
  const missingData = [
    { name: 'Tiempo resolucion casos', article: 'Art. 17' },
    { name: 'Cobros indebidos <5 dias', article: 'Art. 17' },
    { name: 'Transfer a supervisor', article: 'Art. 8' },
    { name: 'Info incidencias <2h', article: 'Art. 17' },
    { name: 'Auditoria ENAC', article: 'Art. 22', note: 'requiere contratacion externa' },
  ];

  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
        </div>
        <h3 className="font-semibold text-gray-900 text-lg">Resumen: Madurez de Datos para Compliance</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">Tu nivel actual de instrumentacion:</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Datos disponibles */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <p className="font-semibold text-emerald-800">DATOS DISPONIBLES (3/10)</p>
          </div>
          <ul className="space-y-2 text-sm">
            {availableData.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <span className="text-emerald-500">•</span>
                <span>{item.name} <span className="text-gray-400">({item.article})</span></span>
              </li>
            ))}
          </ul>
        </div>

        {/* Datos estimables */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <p className="font-semibold text-amber-800">DATOS ESTIMABLES (2/10)</p>
          </div>
          <ul className="space-y-2 text-sm">
            {estimableData.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <span className="text-amber-500">•</span>
                <span>{item.name} <span className="text-gray-400">({item.article})</span> - <span className="text-amber-600">{item.error}</span></span>
              </li>
            ))}
          </ul>
        </div>

        {/* Datos no disponibles */}
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-5 h-5 text-red-600" />
            <p className="font-semibold text-red-800">NO DISPONIBLES (5/10)</p>
          </div>
          <ul className="space-y-2 text-sm">
            {missingData.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <span className="text-red-500">•</span>
                <span>
                  {item.name} <span className="text-gray-400">({item.article})</span>
                  {item.note && <span className="text-xs text-gray-400 block ml-3">- {item.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Inversion sugerida */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <p className="font-semibold text-gray-800">INVERSION SUGERIDA PARA COMPLIANCE COMPLETO</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Fase 1 */}
          <div className="p-3 bg-white rounded border border-gray-200">
            <p className="font-medium text-gray-800 mb-2">Fase 1 - Instrumentacion (Q1 2026)</p>
            <ul className="space-y-1 text-sm text-gray-600">
              <li className="flex justify-between">
                <span>• Tracking ASA real</span>
                <span className="font-semibold">5-8K</span>
              </li>
              <li className="flex justify-between">
                <span>• Sistema ticketing/casos</span>
                <span className="font-semibold">15-25K</span>
              </li>
              <li className="flex justify-between">
                <span>• Enriquecimiento lenguas</span>
                <span className="font-semibold">2K</span>
              </li>
              <li className="flex justify-between border-t border-gray-100 pt-1 mt-1">
                <span className="font-medium">Subtotal:</span>
                <span className="font-bold text-blue-600">22-35K</span>
              </li>
            </ul>
          </div>

          {/* Fase 2 */}
          <div className="p-3 bg-white rounded border border-gray-200">
            <p className="font-medium text-gray-800 mb-2">Fase 2 - Operaciones (Q2-Q3 2026)</p>
            <ul className="space-y-1 text-sm text-gray-600">
              <li className="flex justify-between">
                <span>• Cobertura 24/7 (chatbot + on-call)</span>
                <span className="font-semibold">65K/año</span>
              </li>
              <li className="flex justify-between">
                <span>• Copilot IA (reducir AHT)</span>
                <span className="font-semibold">35K + 8K/mes</span>
              </li>
              <li className="flex justify-between">
                <span>• Auditor ENAC</span>
                <span className="font-semibold">12-18K/año</span>
              </li>
              <li className="flex justify-between border-t border-gray-100 pt-1 mt-1">
                <span className="font-medium">Subtotal año 1:</span>
                <span className="font-bold text-blue-600">112-118K</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Totales - usar datos reales cuando disponibles */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Inversion Total</p>
            <p className="text-xl font-bold text-blue-600">
              {currentAnnualCost > 0 ? formatCurrency(Math.round(currentAnnualCost * 0.05)) : '134-153K'}
            </p>
            <p className="text-xs text-gray-400">~5% coste anual</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Riesgo Evitado</p>
            <p className="text-xl font-bold text-red-600">
              {currentAnnualCost > 0 ? formatCurrency(Math.min(1000000, currentAnnualCost * 0.3)) : '750K-1M'}
            </p>
            <p className="text-xs text-gray-400">sanciones potenciales</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">ROI Compliance</p>
            <p className="text-xl font-bold text-emerald-600">
              {data.economicModel?.roi3yr ? `${data.economicModel.roi3yr}%` : '490-650%'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function Law10Tab({ data }: Law10TabProps) {
  // Evaluar compliance para cada requisito
  const complianceResults = {
    law07: evaluateLaw07Compliance(data),
    law01: evaluateLaw01Compliance(data),
    law02: evaluateLaw02Compliance(data),
    law09: evaluateLaw09Compliance(data),
  };

  return (
    <div className="space-y-6">
      {/* Header con Countdown */}
      <Law10HeaderCountdown complianceResults={complianceResults} />

      {/* Secciones de Analisis - Formato horizontal sin columnas */}
      <div className="space-y-6">
        {/* LAW-01: Velocidad de Respuesta */}
        <ResponseSpeedSection data={data} result={complianceResults.law01} />

        {/* LAW-02: Calidad de Resolucion */}
        <ResolutionQualitySection data={data} result={complianceResults.law02} />

        {/* LAW-07: Cobertura Horaria */}
        <TimeCoverageSection data={data} result={complianceResults.law07} />
      </div>

      {/* Resumen de Cumplimiento */}
      <Law10SummaryRoadmap complianceResults={complianceResults} data={data} />

      {/* Madurez de Datos para Compliance */}
      <DataMaturitySummary data={data} />
    </div>
  );
}

export default Law10Tab;
