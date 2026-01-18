import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb, DollarSign } from 'lucide-react';
import type { AnalysisData, DimensionAnalysis, Finding, Recommendation, HeatmapDataPoint } from '../../types';
import {
  Card,
  Badge,
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

interface DimensionAnalysisTabProps {
  data: AnalysisData;
}

// ========== ANÁLISIS CAUSAL CON IMPACTO ECONÓMICO ==========

interface CausalAnalysis {
  finding: string;
  probableCause: string;
  economicImpact: number;
  recommendation: string;
  severity: 'critical' | 'warning' | 'info';
}

// v3.11: Interfaz extendida para incluir fórmula de cálculo
interface CausalAnalysisExtended extends CausalAnalysis {
  impactFormula?: string;  // Explicación de cómo se calculó el impacto
  hasRealData: boolean;    // True si hay datos reales para calcular
}

// Genera análisis causal basado en dimensión y datos
function generateCausalAnalysis(
  dimension: DimensionAnalysis,
  heatmapData: HeatmapDataPoint[],
  economicModel: { currentAnnualCost: number }
): CausalAnalysisExtended[] {
  const analyses: CausalAnalysisExtended[] = [];
  const totalVolume = heatmapData.reduce((sum, h) => sum + h.volume, 0);

  // v3.11: CPI basado en modelo TCO (€2.33/interacción)
  const CPI_TCO = 2.33;
  const CPI = totalVolume > 0 ? economicModel.currentAnnualCost / (totalVolume * 12) : CPI_TCO;

  // Calcular métricas agregadas
  const avgCVAHT = totalVolume > 0
    ? heatmapData.reduce((sum, h) => sum + (h.variability?.cv_aht || 0) * h.volume, 0) / totalVolume
    : 0;
  const avgTransferRate = totalVolume > 0
    ? heatmapData.reduce((sum, h) => sum + (h.variability?.transfer_rate || 0) * h.volume, 0) / totalVolume
    : 0;
  const avgFCR = totalVolume > 0
    ? heatmapData.reduce((sum, h) => sum + h.metrics.fcr * h.volume, 0) / totalVolume
    : 0;
  const avgAHT = totalVolume > 0
    ? heatmapData.reduce((sum, h) => sum + h.aht_seconds * h.volume, 0) / totalVolume
    : 0;
  const avgCSAT = totalVolume > 0
    ? heatmapData.reduce((sum, h) => sum + (h.metrics?.csat || 0) * h.volume, 0) / totalVolume
    : 0;
  const avgHoldTime = totalVolume > 0
    ? heatmapData.reduce((sum, h) => sum + (h.metrics?.hold_time || 0) * h.volume, 0) / totalVolume
    : 0;

  // Skills con problemas específicos
  const skillsHighCV = heatmapData.filter(h => (h.variability?.cv_aht || 0) > 100);
  const skillsLowFCR = heatmapData.filter(h => h.metrics.fcr < 50);
  const skillsHighTransfer = heatmapData.filter(h => (h.variability?.transfer_rate || 0) > 20);

  switch (dimension.name) {
    case 'operational_efficiency':
      // Análisis de variabilidad AHT
      if (avgCVAHT > 80) {
        const inefficiencyPct = Math.min(0.15, (avgCVAHT - 60) / 200);
        const inefficiencyCost = Math.round(economicModel.currentAnnualCost * inefficiencyPct);
        analyses.push({
          finding: `Variabilidad AHT elevada: CV ${avgCVAHT.toFixed(0)}% (benchmark: <60%)`,
          probableCause: skillsHighCV.length > 0
            ? `Falta de scripts estandarizados en ${skillsHighCV.slice(0, 3).map(s => s.skill).join(', ')}. Agentes manejan casos similares de formas muy diferentes.`
            : 'Procesos no documentados y falta de guías de atención claras.',
          economicImpact: inefficiencyCost,
          impactFormula: `Coste anual × ${(inefficiencyPct * 100).toFixed(1)}% ineficiencia = €${(economicModel.currentAnnualCost/1000).toFixed(0)}K × ${(inefficiencyPct * 100).toFixed(1)}%`,
          recommendation: 'Crear playbooks por tipología de consulta y certificar agentes en procesos estándar.',
          severity: avgCVAHT > 120 ? 'critical' : 'warning',
          hasRealData: true
        });
      }

      // Análisis de AHT absoluto
      if (avgAHT > 420) {
        const excessSeconds = avgAHT - 360;
        const excessCost = Math.round((excessSeconds / 3600) * totalVolume * 12 * 25);
        analyses.push({
          finding: `AHT elevado: ${Math.floor(avgAHT / 60)}:${String(Math.round(avgAHT) % 60).padStart(2, '0')} (benchmark: 6:00)`,
          probableCause: 'Sistemas de información fragmentados, búsquedas manuales excesivas, o falta de herramientas de asistencia al agente.',
          economicImpact: excessCost,
          impactFormula: `Exceso ${Math.round(excessSeconds)}s × ${totalVolume.toLocaleString()} int/mes × 12 × €25/h`,
          recommendation: 'Implementar vista unificada de cliente y herramientas de sugerencia automática.',
          severity: avgAHT > 540 ? 'critical' : 'warning',
          hasRealData: true
        });
      }
      break;

    case 'effectiveness_resolution':
      // Análisis de FCR
      if (avgFCR < 70) {
        const recontactRate = (100 - avgFCR) / 100;
        const recontactCost = Math.round(totalVolume * 12 * recontactRate * CPI_TCO);
        analyses.push({
          finding: `FCR bajo: ${avgFCR.toFixed(0)}% (benchmark: >75%)`,
          probableCause: skillsLowFCR.length > 0
            ? `Agentes sin autonomía para resolver en ${skillsLowFCR.slice(0, 2).map(s => s.skill).join(', ')}. Políticas de escalado excesivamente restrictivas.`
            : 'Falta de información completa en primer contacto o limitaciones de autoridad del agente.',
          economicImpact: recontactCost,
          impactFormula: `${totalVolume.toLocaleString()} int × 12 × ${(recontactRate * 100).toFixed(0)}% recontactos × €${CPI_TCO}/int`,
          recommendation: 'Empoderar agentes con mayor autoridad de resolución y crear Knowledge Base contextual.',
          severity: avgFCR < 50 ? 'critical' : 'warning',
          hasRealData: true
        });
      }

      // Análisis de transferencias
      if (avgTransferRate > 15) {
        const transferCost = Math.round(totalVolume * 12 * (avgTransferRate / 100) * CPI_TCO * 0.5);
        analyses.push({
          finding: `Tasa de transferencias: ${avgTransferRate.toFixed(1)}% (benchmark: <10%)`,
          probableCause: skillsHighTransfer.length > 0
            ? `Routing inicial incorrecto hacia ${skillsHighTransfer.slice(0, 2).map(s => s.skill).join(', ')}. IVR no identifica correctamente la intención del cliente.`
            : 'Reglas de enrutamiento desactualizadas o skills mal definidos.',
          economicImpact: transferCost,
          impactFormula: `${totalVolume.toLocaleString()} int × 12 × ${avgTransferRate.toFixed(1)}% × €${CPI_TCO} × 50% coste adicional`,
          recommendation: 'Revisar árbol de IVR, actualizar reglas de ACD y capacitar agentes en resolución integral.',
          severity: avgTransferRate > 25 ? 'critical' : 'warning',
          hasRealData: true
        });
      }
      break;

    case 'volumetry_distribution':
      // Análisis de concentración de volumen
      const topSkill = [...heatmapData].sort((a, b) => b.volume - a.volume)[0];
      const topSkillPct = topSkill ? (topSkill.volume / totalVolume) * 100 : 0;
      if (topSkillPct > 40 && topSkill) {
        const deflectionPotential = Math.round(topSkill.volume * 12 * CPI_TCO * 0.20);
        analyses.push({
          finding: `Concentración de volumen: ${topSkill.skill} representa ${topSkillPct.toFixed(0)}% del total`,
          probableCause: 'Dependencia excesiva de un skill puede indicar oportunidad de autoservicio o automatización parcial.',
          economicImpact: deflectionPotential,
          impactFormula: `${topSkill.volume.toLocaleString()} int × 12 × €${CPI_TCO} × 20% deflexión potencial`,
          recommendation: `Analizar top consultas de ${topSkill.skill} para identificar candidatas a deflexión digital o FAQ automatizado.`,
          severity: 'info',
          hasRealData: true
        });
      }
      break;

    case 'complexity_predictability':
      // v3.11: Análisis de complejidad basado en hold time y CV
      if (avgHoldTime > 45) {
        const excessHold = avgHoldTime - 30;
        const holdCost = Math.round((excessHold / 3600) * totalVolume * 12 * 25);
        analyses.push({
          finding: `Hold time elevado: ${avgHoldTime.toFixed(0)}s promedio (benchmark: <30s)`,
          probableCause: 'Consultas complejas requieren búsqueda de información durante la llamada. Posible falta de acceso rápido a datos o sistemas.',
          economicImpact: holdCost,
          impactFormula: `Exceso ${Math.round(excessHold)}s × ${totalVolume.toLocaleString()} int × 12 × €25/h`,
          recommendation: 'Implementar acceso contextual a información del cliente y reducir sistemas fragmentados.',
          severity: avgHoldTime > 60 ? 'critical' : 'warning',
          hasRealData: true
        });
      }

      if (avgCVAHT > 100) {
        analyses.push({
          finding: `Alta impredecibilidad: CV AHT ${avgCVAHT.toFixed(0)}% (benchmark: <75%)`,
          probableCause: 'Procesos con alta variabilidad dificultan la planificación de recursos y el staffing.',
          economicImpact: Math.round(economicModel.currentAnnualCost * 0.03),
          impactFormula: `~3% del coste operativo por ineficiencia de staffing`,
          recommendation: 'Segmentar procesos por complejidad y estandarizar los más frecuentes.',
          severity: 'warning',
          hasRealData: true
        });
      }
      break;

    case 'customer_satisfaction':
      // v3.11: Solo generar análisis si hay datos de CSAT reales
      if (avgCSAT > 0) {
        if (avgCSAT < 70) {
          // Estimación conservadora: impacto en retención
          const churnRisk = Math.round(totalVolume * 12 * 0.02 * 50);  // 2% churn × €50 valor medio
          analyses.push({
            finding: `CSAT por debajo del objetivo: ${avgCSAT.toFixed(0)}% (benchmark: >80%)`,
            probableCause: 'Experiencia del cliente subóptima puede estar relacionada con tiempos de espera, resolución incompleta, o trato del agente.',
            economicImpact: churnRisk,
            impactFormula: `${totalVolume.toLocaleString()} clientes × 12 × 2% riesgo churn × €50 valor`,
            recommendation: 'Implementar programa de voz del cliente (VoC) y cerrar loop de feedback.',
            severity: avgCSAT < 50 ? 'critical' : 'warning',
            hasRealData: true
          });
        }
      }
      // Si no hay CSAT, no generamos análisis falso
      break;

    case 'economy_cpi':
      // Análisis de CPI
      if (CPI > 3.5) {
        const excessCPI = CPI - CPI_TCO;
        const potentialSavings = Math.round(totalVolume * 12 * excessCPI);
        analyses.push({
          finding: `CPI por encima del benchmark: €${CPI.toFixed(2)} (objetivo: €${CPI_TCO})`,
          probableCause: 'Combinación de AHT alto, baja productividad efectiva, o costes de personal por encima del mercado.',
          economicImpact: potentialSavings,
          impactFormula: `${totalVolume.toLocaleString()} int × 12 × €${excessCPI.toFixed(2)} exceso CPI`,
          recommendation: 'Revisar mix de canales, optimizar procesos para reducir AHT y evaluar modelo de staffing.',
          severity: CPI > 5 ? 'critical' : 'warning',
          hasRealData: true
        });
      }
      break;
  }

  // v3.11: NO generar fallback con impacto económico falso
  // Si no hay análisis específico, simplemente retornar array vacío
  // La UI mostrará "Sin hallazgos críticos" en lugar de un impacto inventado

  return analyses;
}

// Formateador de moneda (usa la función importada de designSystem)

// v3.15: Dimension Card Component - con diseño McKinsey
function DimensionCard({
  dimension,
  findings,
  recommendations,
  causalAnalyses,
  delay = 0
}: {
  dimension: DimensionAnalysis;
  findings: Finding[];
  recommendations: Recommendation[];
  causalAnalyses: CausalAnalysisExtended[];
  delay?: number;
}) {
  const Icon = dimension.icon;

  const getScoreVariant = (score: number): 'success' | 'warning' | 'critical' | 'default' => {
    if (score < 0) return 'default'; // N/A
    if (score >= 70) return 'success';
    if (score >= 40) return 'warning';
    return 'critical';
  };

  const getScoreLabel = (score: number): string => {
    if (score < 0) return 'N/A';
    if (score >= 80) return 'Óptimo';
    if (score >= 60) return 'Aceptable';
    if (score >= 40) return 'Mejorable';
    return 'Crítico';
  };

  const getSeverityConfig = (severity: string) => {
    if (severity === 'critical') return STATUS_CLASSES.critical;
    if (severity === 'warning') return STATUS_CLASSES.warning;
    return STATUS_CLASSES.info;
  };

  // Get KPI trend icon
  const TrendIcon = dimension.kpi.changeType === 'positive' ? TrendingUp :
                    dimension.kpi.changeType === 'negative' ? TrendingDown : Minus;

  const trendColor = dimension.kpi.changeType === 'positive' ? 'text-emerald-600' :
                     dimension.kpi.changeType === 'negative' ? 'text-red-600' : 'text-gray-500';

  // Calcular impacto total de esta dimensión
  const totalImpact = causalAnalyses.reduce((sum, a) => sum + a.economicImpact, 0);
  const scoreVariant = getScoreVariant(dimension.score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="bg-white rounded-lg border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Icon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{dimension.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5 max-w-xs">{dimension.summary}</p>
            </div>
          </div>
          <div className="text-right">
            <Badge
              label={dimension.score >= 0 ? `${dimension.score} ${getScoreLabel(dimension.score)}` : '— N/A'}
              variant={scoreVariant}
              size="md"
            />
            {totalImpact > 0 && (
              <p className="text-xs text-red-600 font-medium mt-1">
                Impacto: {formatCurrency(totalImpact)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* KPI Highlight */}
      <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{dimension.kpi.label}</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">{dimension.kpi.value}</span>
            {dimension.kpi.change && (
              <div className={cn('flex items-center gap-1 text-xs', trendColor)}>
                <TrendIcon className="w-3 h-3" />
                <span>{dimension.kpi.change}</span>
              </div>
            )}
          </div>
        </div>
        {dimension.percentile && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Percentil</span>
              <span>P{dimension.percentile}</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full"
                style={{ width: `${dimension.percentile}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Si no hay datos para esta dimensión (score < 0 = N/A) */}
      {dimension.score < 0 && (
        <div className="p-4">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500 italic flex items-center gap-2">
              <Minus className="w-4 h-4" />
              Sin datos disponibles para esta dimensión.
            </p>
          </div>
        </div>
      )}

      {/* Análisis Causal Completo - Solo si hay datos */}
      {dimension.score >= 0 && causalAnalyses.length > 0 && (
        <div className="p-4 space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Análisis Causal
          </h4>
          {causalAnalyses.map((analysis, idx) => {
            const config = getSeverityConfig(analysis.severity);
            return (
              <div key={idx} className={cn('p-3 rounded-lg border', config.bg, config.border)}>
                {/* Hallazgo */}
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className={cn('w-4 h-4 mt-0.5 flex-shrink-0', config.text)} />
                  <div>
                    <p className={cn('text-sm font-medium', config.text)}>{analysis.finding}</p>
                  </div>
                </div>

                {/* Causa probable */}
                <div className="ml-6 mb-2">
                  <p className="text-xs text-gray-500 font-medium mb-0.5">Causa probable:</p>
                  <p className="text-xs text-gray-700">{analysis.probableCause}</p>
                </div>

                {/* Impacto económico */}
                <div
                  className="ml-6 mb-2 flex items-center gap-2 cursor-help"
                  title={analysis.impactFormula || 'Impacto estimado basado en métricas operativas'}
                >
                  <DollarSign className="w-3 h-3 text-red-500" />
                  <span className="text-xs font-bold text-red-600">
                    {formatCurrency(analysis.economicImpact)}
                  </span>
                  <span className="text-xs text-gray-500">impacto anual estimado</span>
                  <span className="text-xs text-gray-400">i</span>
                </div>

                {/* Recomendación inline */}
                <div className="ml-6 p-2 bg-white rounded border border-gray-200">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-600">{analysis.recommendation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fallback: Hallazgos originales si no hay análisis causal - Solo si hay datos */}
      {dimension.score >= 0 && causalAnalyses.length === 0 && findings.length > 0 && (
        <div className="p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Hallazgos Clave
          </h4>
          <ul className="space-y-2">
            {findings.slice(0, 3).map((finding, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <ChevronRight className={cn('w-4 h-4 mt-0.5 flex-shrink-0',
                  finding.type === 'critical' ? 'text-red-500' :
                  finding.type === 'warning' ? 'text-amber-500' :
                  'text-blue-600'
                )} />
                <span className="text-gray-700">{finding.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Si no hay análisis ni hallazgos pero sí hay datos */}
      {dimension.score >= 0 && causalAnalyses.length === 0 && findings.length === 0 && (
        <div className="p-4">
          <div className={cn('p-3 rounded-lg border', STATUS_CLASSES.success.bg, STATUS_CLASSES.success.border)}>
            <p className={cn('text-sm flex items-center gap-2', STATUS_CLASSES.success.text)}>
              <ChevronRight className="w-4 h-4" />
              Métricas dentro de rangos aceptables. Sin hallazgos críticos.
            </p>
          </div>
        </div>
      )}

      {/* Recommendations Preview - Solo si no hay análisis causal y hay datos */}
      {dimension.score >= 0 && causalAnalyses.length === 0 && recommendations.length > 0 && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold text-blue-600">Recomendación:</span>
              <span className="text-xs text-gray-600">{recommendations[0].text}</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ========== v3.16: COMPONENTE PRINCIPAL ==========

export function DimensionAnalysisTab({ data }: DimensionAnalysisTabProps) {
  // Filter out agentic_readiness (has its own tab)
  const coreDimensions = data.dimensions.filter(d => d.name !== 'agentic_readiness');

  // Group findings and recommendations by dimension
  const getFindingsForDimension = (dimensionId: string) =>
    data.findings.filter(f => f.dimensionId === dimensionId);

  const getRecommendationsForDimension = (dimensionId: string) =>
    data.recommendations.filter(r => r.dimensionId === dimensionId);

  // Generar análisis causal para cada dimensión
  const getCausalAnalysisForDimension = (dimension: DimensionAnalysis) =>
    generateCausalAnalysis(dimension, data.heatmapData, data.economicModel);

  // Calcular impacto total de todas las dimensiones con datos
  const impactoTotal = coreDimensions
    .filter(d => d.score !== null && d.score !== undefined)
    .reduce((total, dimension) => {
      const analyses = getCausalAnalysisForDimension(dimension);
      return total + analyses.reduce((sum, a) => sum + a.economicImpact, 0);
    }, 0);

  // v3.16: Contar dimensiones por estado para el header
  const conDatos = coreDimensions.filter(d => d.score !== null && d.score !== undefined && d.score >= 0);
  const sinDatos = coreDimensions.filter(d => d.score === null || d.score === undefined || d.score < 0);

  return (
    <div className="space-y-6">
      {/* v3.16: Header simplificado - solo título y subtítulo */}
      <div className="mb-2">
        <h2 className="text-lg font-bold text-gray-900">Diagnóstico por Dimensión</h2>
        <p className="text-sm text-gray-500">
          {coreDimensions.length} dimensiones analizadas
          {sinDatos.length > 0 && ` (${sinDatos.length} sin datos)`}
        </p>
      </div>

      {/* v3.16: Grid simple con todas las dimensiones sin agrupación */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {coreDimensions.map((dimension, idx) => (
          <DimensionCard
            key={dimension.id}
            dimension={dimension}
            findings={getFindingsForDimension(dimension.id)}
            recommendations={getRecommendationsForDimension(dimension.id)}
            causalAnalyses={getCausalAnalysisForDimension(dimension)}
            delay={idx * 0.05}
          />
        ))}
      </div>
    </div>
  );
}

export default DimensionAnalysisTab;
