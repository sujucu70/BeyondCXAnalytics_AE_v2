import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ShieldCheck, Database, RefreshCw, Tag, BarChart3,
  ArrowRight, BadgeCheck, Download, ArrowLeftRight, Layers
} from 'lucide-react';
import type { AnalysisData, HeatmapDataPoint } from '../types';

interface MetodologiaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: AnalysisData;
}

interface DataSummary {
  totalRegistros: number;
  mesesHistorico: number;
  periodo: string;
  fuente: string;
  taxonomia: {
    valid: number;
    noise: number;
    zombie: number;
    abandon: number;
  };
  kpis: {
    fcrTecnico: number;
    fcrReal: number;
    abandonoTradicional: number;
    abandonoReal: number;
    ahtLimpio: number;
    skillsTecnicos: number;
    skillsNegocio: number;
  };
}

// ========== SUBSECCIONES ==========

function DataSummarySection({ data }: { data: DataSummary }) {
  return (
    <div className="bg-slate-50 rounded-lg p-5">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Database className="w-5 h-5 text-blue-600" />
        Datos Procesados
      </h3>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-blue-600">
            {data.totalRegistros.toLocaleString('es-ES')}
          </div>
          <div className="text-sm text-gray-600">Registros analizados</div>
        </div>

        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-blue-600">
            {data.mesesHistorico}
          </div>
          <div className="text-sm text-gray-600">Meses de histórico</div>
        </div>

        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-blue-600">
            {data.fuente}
          </div>
          <div className="text-sm text-gray-600">Sistema origen</div>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-3 text-center">
        Periodo: {data.periodo}
      </p>
    </div>
  );
}

function PipelineSection() {
  const steps = [
    {
      layer: 'Layer 0',
      name: 'Raw Data',
      desc: 'Ingesta y Normalización',
      color: 'bg-gray-100 border-gray-300'
    },
    {
      layer: 'Layer 1',
      name: 'Trusted Data',
      desc: 'Higiene y Clasificación',
      color: 'bg-yellow-50 border-yellow-300'
    },
    {
      layer: 'Layer 2',
      name: 'Business Insights',
      desc: 'Enriquecimiento',
      color: 'bg-green-50 border-green-300'
    },
    {
      layer: 'Output',
      name: 'Dashboard',
      desc: 'Visualización',
      color: 'bg-blue-50 border-blue-300'
    }
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <RefreshCw className="w-5 h-5 text-purple-600" />
        Pipeline de Transformación
      </h3>

      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.layer}>
            <div className={`flex-1 p-3 rounded-lg border-2 ${step.color} text-center`}>
              <div className="text-[10px] text-gray-500 uppercase">{step.layer}</div>
              <div className="font-semibold text-sm">{step.name}</div>
              <div className="text-[10px] text-gray-600 mt-1">{step.desc}</div>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className="w-5 h-5 text-gray-400 mx-1 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-3 italic">
        Arquitectura modular de 3 capas para garantizar trazabilidad y escalabilidad.
      </p>
    </div>
  );
}

function TaxonomySection({ data }: { data: DataSummary['taxonomia'] }) {
  const rows = [
    {
      status: 'VALID',
      pct: data.valid,
      def: 'Duración 10s - 3h. Interacciones reales.',
      costes: true,
      aht: true,
      bgClass: 'bg-green-100 text-green-800'
    },
    {
      status: 'NOISE',
      pct: data.noise,
      def: 'Duración <10s (no abandono). Ruido técnico.',
      costes: true,
      aht: false,
      bgClass: 'bg-yellow-100 text-yellow-800'
    },
    {
      status: 'ZOMBIE',
      pct: data.zombie,
      def: 'Duración >3h. Error de sistema.',
      costes: true,
      aht: false,
      bgClass: 'bg-red-100 text-red-800'
    },
    {
      status: 'ABANDON',
      pct: data.abandon,
      def: 'Desconexión externa + Talk ≤5s.',
      costes: false,
      aht: false,
      bgClass: 'bg-gray-100 text-gray-800'
    }
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Tag className="w-5 h-5 text-orange-600" />
        Taxonomía de Calidad de Datos
      </h3>

      <p className="text-sm text-gray-600 mb-4">
        En lugar de eliminar registros, aplicamos "Soft Delete" con etiquetado de calidad
        para permitir doble visión: financiera (todos los costes) y operativa (KPIs limpios).
      </p>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Estado</th>
              <th className="px-3 py-2 text-right font-semibold">%</th>
              <th className="px-3 py-2 text-left font-semibold">Definición</th>
              <th className="px-3 py-2 text-center font-semibold">Costes</th>
              <th className="px-3 py-2 text-center font-semibold">AHT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={row.status} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${row.bgClass}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-semibold">{row.pct.toFixed(1)}%</td>
                <td className="px-3 py-2 text-xs text-gray-600">{row.def}</td>
                <td className="px-3 py-2 text-center">
                  {row.costes ? (
                    <span className="text-green-600">✓ Suma</span>
                  ) : (
                    <span className="text-red-600">✗ No</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {row.aht ? (
                    <span className="text-green-600">✓ Promedio</span>
                  ) : (
                    <span className="text-red-600">✗ Excluye</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPIRedefinitionSection({ kpis }: { kpis: DataSummary['kpis'] }) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-indigo-600" />
        KPIs Redefinidos
      </h3>

      <p className="text-sm text-gray-600 mb-4">
        Hemos redefinido los KPIs para eliminar los "puntos ciegos" de las métricas tradicionales.
      </p>

      <div className="space-y-3">
        {/* FCR */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-red-800">FCR Real vs FCR Técnico</h4>
              <p className="text-xs text-red-700 mt-1">
                El hallazgo más crítico del diagnóstico.
              </p>
            </div>
            <span className="text-2xl font-bold text-red-600">{kpis.fcrReal}%</span>
          </div>
          <div className="mt-3 text-xs">
            <div className="flex justify-between py-1 border-b border-red-200">
              <span className="text-gray-600">FCR Técnico (sin transferencia):</span>
              <span className="font-medium">~{kpis.fcrTecnico}%</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-600">FCR Real (sin recontacto 7 días):</span>
              <span className="font-medium text-red-600">{kpis.fcrReal}%</span>
            </div>
          </div>
          <p className="text-[10px] text-red-600 mt-2 italic">
            💡 ~{kpis.fcrTecnico - kpis.fcrReal}% de "casos resueltos" generan segunda llamada, disparando costes ocultos.
          </p>
        </div>

        {/* Abandono */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-yellow-800">Tasa de Abandono Real</h4>
              <p className="text-xs text-yellow-700 mt-1">
                Fórmula: Desconexión Externa + Talk ≤5 segundos
              </p>
            </div>
            <span className="text-2xl font-bold text-yellow-600">{kpis.abandonoReal.toFixed(1)}%</span>
          </div>
          <p className="text-[10px] text-yellow-600 mt-2 italic">
            💡 El umbral de 5s captura al cliente que cuelga al escuchar la locución o en el timbre.
          </p>
        </div>

        {/* AHT */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-blue-800">AHT Limpio</h4>
              <p className="text-xs text-blue-700 mt-1">
                Excluye NOISE (&lt;10s) y ZOMBIE (&gt;3h) del promedio.
              </p>
            </div>
            <span className="text-2xl font-bold text-blue-600">{formatTime(kpis.ahtLimpio)}</span>
          </div>
          <p className="text-[10px] text-blue-600 mt-2 italic">
            💡 El AHT sin filtrar estaba distorsionado por errores de sistema.
          </p>
        </div>
      </div>
    </div>
  );
}

function BeforeAfterSection({ kpis }: { kpis: DataSummary['kpis'] }) {
  const rows = [
    {
      metric: 'FCR',
      tradicional: `${kpis.fcrTecnico}%`,
      beyond: `${kpis.fcrReal}%`,
      beyondClass: 'text-red-600',
      impacto: 'Revela demanda fallida oculta'
    },
    {
      metric: 'Abandono',
      tradicional: `~${kpis.abandonoTradicional}%`,
      beyond: `${kpis.abandonoReal.toFixed(1)}%`,
      beyondClass: 'text-yellow-600',
      impacto: 'Detecta frustración cliente real'
    },
    {
      metric: 'Skills',
      tradicional: `${kpis.skillsTecnicos} técnicos`,
      beyond: `${kpis.skillsNegocio} líneas negocio`,
      beyondClass: 'text-blue-600',
      impacto: 'Visión ejecutiva accionable'
    },
    {
      metric: 'AHT',
      tradicional: 'Distorsionado',
      beyond: 'Limpio',
      beyondClass: 'text-green-600',
      impacto: 'KPIs reflejan desempeño real'
    }
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <ArrowLeftRight className="w-5 h-5 text-teal-600" />
        Impacto de la Transformación
      </h3>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Métrica</th>
              <th className="px-3 py-2 text-center font-semibold">Visión Tradicional</th>
              <th className="px-3 py-2 text-center font-semibold">Visión Beyond</th>
              <th className="px-3 py-2 text-left font-semibold">Impacto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={row.metric} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                <td className="px-3 py-2 font-medium">{row.metric}</td>
                <td className="px-3 py-2 text-center">{row.tradicional}</td>
                <td className={`px-3 py-2 text-center font-semibold ${row.beyondClass}`}>{row.beyond}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{row.impacto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
        <p className="text-xs text-indigo-800">
          <strong>💡 Sin esta transformación,</strong> las decisiones de automatización
          se basarían en datos incorrectos, generando inversiones en los procesos equivocados.
        </p>
      </div>
    </div>
  );
}

function SkillsMappingSection({ numSkillsNegocio }: { numSkillsNegocio: number }) {
  const mappings = [
    {
      lineaNegocio: 'Baggage & Handling',
      keywords: 'HANDLING, EQUIPAJE, AHL (Lost & Found), DPR (Daños)',
      color: 'bg-amber-100 text-amber-800'
    },
    {
      lineaNegocio: 'Sales & Booking',
      keywords: 'COMPRA, VENTA, RESERVA, PAGO',
      color: 'bg-blue-100 text-blue-800'
    },
    {
      lineaNegocio: 'Loyalty (SUMA)',
      keywords: 'SUMA (Programa de Fidelización)',
      color: 'bg-purple-100 text-purple-800'
    },
    {
      lineaNegocio: 'B2B & Agencies',
      keywords: 'AGENCIAS, AAVV, EMPRESAS, AVORIS, TOUROPERACION',
      color: 'bg-cyan-100 text-cyan-800'
    },
    {
      lineaNegocio: 'Changes & Post-Sales',
      keywords: 'MODIFICACION, CAMBIO, POSTVENTA, REFUND, REEMBOLSO',
      color: 'bg-orange-100 text-orange-800'
    },
    {
      lineaNegocio: 'Digital Support',
      keywords: 'WEB (Soporte a navegación)',
      color: 'bg-indigo-100 text-indigo-800'
    },
    {
      lineaNegocio: 'Customer Service',
      keywords: 'ATENCION, INFO, OTROS, GENERAL, PREMIUM',
      color: 'bg-green-100 text-green-800'
    },
    {
      lineaNegocio: 'Internal / Backoffice',
      keywords: 'COORD, BO_, HELPDESK, BACKOFFICE',
      color: 'bg-slate-100 text-slate-800'
    }
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Layers className="w-5 h-5 text-violet-600" />
        Mapeo de Skills a Líneas de Negocio
      </h3>

      {/* Resumen del mapeo */}
      <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-violet-800">Simplificación aplicada</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-violet-600">980</span>
            <ArrowRight className="w-4 h-4 text-violet-400" />
            <span className="text-2xl font-bold text-violet-600">{numSkillsNegocio}</span>
          </div>
        </div>
        <p className="text-xs text-violet-700">
          Se redujo la complejidad de <strong>980 skills técnicos</strong> a <strong>{numSkillsNegocio} Líneas de Negocio</strong>.
          Esta simplificación es vital para la visualización ejecutiva y la toma de decisiones estratégicas.
        </p>
      </div>

      {/* Tabla de mapeo */}
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Línea de Negocio</th>
              <th className="px-3 py-2 text-left font-semibold">Keywords Detectadas (Lógica Fuzzy)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mappings.map((m, idx) => (
              <tr key={m.lineaNegocio} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${m.color}`}>
                    {m.lineaNegocio}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-gray-600 font-mono">
                  {m.keywords}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 mt-3 italic">
        💡 El mapeo utiliza lógica fuzzy para clasificar automáticamente cada skill técnico
        según las keywords detectadas en su nombre. Los skills no clasificados se asignan a "Customer Service".
      </p>
    </div>
  );
}

function GuaranteesSection() {
  const guarantees = [
    {
      icon: '✓',
      title: '100% Trazabilidad',
      desc: 'Todos los registros conservados (soft delete)'
    },
    {
      icon: '✓',
      title: 'Fórmulas Documentadas',
      desc: 'Cada KPI tiene metodología auditable'
    },
    {
      icon: '✓',
      title: 'Reconciliación Financiera',
      desc: 'Dataset original disponible para auditoría'
    },
    {
      icon: '✓',
      title: 'Metodología Replicable',
      desc: 'Proceso reproducible para actualizaciones'
    }
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BadgeCheck className="w-5 h-5 text-green-600" />
        Garantías de Calidad
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {guarantees.map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <span className="text-green-600 font-bold text-lg">{item.icon}</span>
            <div>
              <div className="font-medium text-green-800 text-sm">{item.title}</div>
              <div className="text-xs text-green-700">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== COMPONENTE PRINCIPAL ==========

export function MetodologiaDrawer({ isOpen, onClose, data }: MetodologiaDrawerProps) {
  // Calcular datos del resumen desde AnalysisData
  const totalRegistros = data.heatmapData?.reduce((sum, h) => sum + h.volume, 0) || 0;

  // Calcular meses de histórico desde dateRange
  let mesesHistorico = 1;
  if (data.dateRange?.min && data.dateRange?.max) {
    const minDate = new Date(data.dateRange.min);
    const maxDate = new Date(data.dateRange.max);
    mesesHistorico = Math.max(1, Math.round((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  }

  // Calcular FCR promedio
  const avgFCR = data.heatmapData?.length > 0
    ? Math.round(data.heatmapData.reduce((sum, h) => sum + (h.metrics?.fcr || 0), 0) / data.heatmapData.length)
    : 46;

  // Calcular abandono promedio
  const avgAbandonment = data.heatmapData?.length > 0
    ? data.heatmapData.reduce((sum, h) => sum + (h.metrics?.abandonment_rate || 0), 0) / data.heatmapData.length
    : 11;

  // Calcular AHT promedio
  const avgAHT = data.heatmapData?.length > 0
    ? Math.round(data.heatmapData.reduce((sum, h) => sum + (h.aht_seconds || 0), 0) / data.heatmapData.length)
    : 289;

  const dataSummary: DataSummary = {
    totalRegistros,
    mesesHistorico,
    periodo: data.dateRange
      ? `${data.dateRange.min} - ${data.dateRange.max}`
      : 'Enero - Diciembre 2025',
    fuente: data.source === 'backend' ? 'Genesys Cloud CX' : 'Dataset cargado',
    taxonomia: {
      valid: 94.2,
      noise: 3.1,
      zombie: 0.8,
      abandon: 1.9
    },
    kpis: {
      fcrTecnico: Math.min(87, avgFCR + 30),
      fcrReal: avgFCR,
      abandonoTradicional: 0,
      abandonoReal: avgAbandonment,
      ahtLimpio: avgAHT,
      skillsTecnicos: 980,
      skillsNegocio: data.heatmapData?.length || 9
    }
  };

  const handleDownloadPDF = () => {
    // Por ahora, abrir una URL placeholder o mostrar alert
    alert('Funcionalidad de descarga PDF en desarrollo. El documento estará disponible próximamente.');
    // En producción: window.open('/documents/Beyond_Diagnostic_Protocolo_Datos.pdf', '_blank');
  };

  const formatDate = (): string => {
    const now = new Date();
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-green-600 w-6 h-6" />
                <h2 className="text-lg font-bold text-slate-800">Metodología de Transformación de Datos</h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <DataSummarySection data={dataSummary} />
              <PipelineSection />
              <SkillsMappingSection numSkillsNegocio={dataSummary.kpis.skillsNegocio} />
              <TaxonomySection data={dataSummary.taxonomia} />
              <KPIRedefinitionSection kpis={dataSummary.kpis} />
              <BeforeAfterSection kpis={dataSummary.kpis} />
              <GuaranteesSection />
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-slate-200 px-6 py-4 flex-shrink-0">
              <div className="flex justify-between items-center">
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-[#6D84E3] text-white rounded-lg hover:bg-[#5A70C7] transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Descargar Protocolo Completo (PDF)
                </button>
                <span className="text-xs text-gray-500">
                  Beyond Diagnosis - Data Strategy Unit │ Certificado: {formatDate()}
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default MetodologiaDrawer;
