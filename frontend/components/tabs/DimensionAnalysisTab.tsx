import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb, DollarSign, Clock } from 'lucide-react';
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

// ========== HALLAZGO CLAVE CON IMPACTO ECONÓMICO ==========

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
  timeSavings?: string;    // Ahorro de tiempo para dar credibilidad al impacto económico
}

// Genera hallazgo clave basado en dimensión y datos
function generateCausalAnalysis(
  dimension: DimensionAnalysis,
  heatmapData: HeatmapDataPoint[],
  economicModel: { currentAnnualCost: number },
  staticConfig?: { cost_per_hour: number },
  dateRange?: { min: string; max: string }
): CausalAnalysisExtended[] {
  const analyses: CausalAnalysisExtended[] = [];
  const totalVolume = heatmapData.reduce((sum, h) => sum + h.volume, 0);

  // Coste horario del agente desde config (default €20 si no está definido)
  const HOURLY_COST = staticConfig?.cost_per_hour ?? 20;

  // Calcular factor de anualización basado en el período de datos
  // Si tenemos dateRange, calculamos cuántos días cubre y extrapolamos a año
  let annualizationFactor = 1; // Por defecto, asumimos que los datos ya son anuales
  if (dateRange?.min && dateRange?.max) {
    const startDate = new Date(dateRange.min);
    const endDate = new Date(dateRange.max);
    const daysCovered = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    annualizationFactor = 365 / daysCovered;
  }

  // v3.11: CPI consistente con Executive Summary
  const CPI_TCO = 2.33;
  // Usar CPI pre-calculado de heatmapData si existe, sino calcular desde annual_cost/cost_volume
  const totalCostVolume = heatmapData.reduce((sum, h) => sum + (h.cost_volume || h.volume), 0);
  const totalAnnualCost = heatmapData.reduce((sum, h) => sum + (h.annual_cost || 0), 0);
  const hasCpiField = heatmapData.some(h => h.cpi !== undefined && h.cpi > 0);
  const CPI = hasCpiField
    ? (totalCostVolume > 0
        ? heatmapData.reduce((sum, h) => sum + (h.cpi || 0) * (h.cost_volume || h.volume), 0) / totalCostVolume
        : CPI_TCO)
    : (totalCostVolume > 0 ? totalAnnualCost / totalCostVolume : CPI_TCO);

  // Calcular métricas agregadas
  const avgCVAHT = totalVolume > 0
    ? heatmapData.reduce((sum, h) => sum + (h.variability?.cv_aht || 0) * h.volume, 0) / totalVolume
    : 0;
  const avgTransferRate = totalVolume > 0
    ? heatmapData.reduce((sum, h) => sum + (h.variability?.transfer_rate || 0) * h.volume, 0) / totalVolume
    : 0;
  // Usar FCR Técnico (100 - transfer_rate) en lugar de FCR Real (con filtro recontacto 7d)
  // FCR Técnico es más comparable con benchmarks de industria
  const avgFCR = totalVolume > 0
    ? heatmapData.reduce((sum, h) => sum + (h.metrics.fcr_tecnico ?? (100 - h.metrics.transfer_rate)) * h.volume, 0) / totalVolume
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
  // Usar FCR Técnico para identificar skills con bajo FCR
  const skillsLowFCR = heatmapData.filter(h => (h.metrics.fcr_tecnico ?? (100 - h.metrics.transfer_rate)) < 50);
  const skillsHighTransfer = heatmapData.filter(h => (h.variability?.transfer_rate || 0) > 20);

  // Parsear P50 AHT del KPI del header para consistencia visual
  // El KPI puede ser "345s (P50)" o similar
  const parseKpiAhtSeconds = (kpiValue: string): number | null => {
    const match = kpiValue.match(/(\d+)s/);
    return match ? parseInt(match[1], 10) : null;
  };

  switch (dimension.name) {
    case 'operational_efficiency':
      // Obtener P50 AHT del header para mostrar valor consistente
      const p50Aht = parseKpiAhtSeconds(dimension.kpi.value) ?? avgAHT;

      // Eficiencia Operativa: enfocada en AHT (valor absoluto)
      // CV AHT se analiza en Complejidad & Predictibilidad (best practice)
      const hasHighAHT = p50Aht > 300; // 5:00 benchmark
      const ahtBenchmark = 300; // 5:00 objetivo

      if (hasHighAHT) {
        // Calcular impacto económico por AHT excesivo
        const excessSeconds = p50Aht - ahtBenchmark;
        const annualVolume = Math.round(totalVolume * annualizationFactor);
        const excessHours = Math.round((excessSeconds / 3600) * annualVolume);
        const ahtExcessCost = Math.round(excessHours * HOURLY_COST);

        // Estimar ahorro con solución Copilot (25-30% reducción AHT)
        const copilotSavings = Math.round(ahtExcessCost * 0.28);

        // Causa basada en AHT elevado
        const cause = 'Agentes dedican tiempo excesivo a búsqueda manual de información, navegación entre sistemas y tareas repetitivas.';

        analyses.push({
          finding: `AHT elevado: P50 ${Math.floor(p50Aht / 60)}:${String(Math.round(p50Aht) % 60).padStart(2, '0')} (benchmark: 5:00)`,
          probableCause: cause,
          economicImpact: ahtExcessCost,
          impactFormula: `${excessHours.toLocaleString()}h × €${HOURLY_COST}/h`,
          timeSavings: `${excessHours.toLocaleString()} horas/año en exceso de AHT`,
          recommendation: `Desplegar Copilot IA para agentes: (1) Auto-búsqueda en KB; (2) Sugerencias contextuales en tiempo real; (3) Scripts guiados para casos frecuentes. Reducción esperada: 20-30% AHT. Ahorro: ${formatCurrency(copilotSavings)}/año.`,
          severity: p50Aht > 420 ? 'critical' : 'warning',
          hasRealData: true
        });
      } else {
        // AHT dentro de benchmark - mostrar estado positivo
        analyses.push({
          finding: `AHT dentro de benchmark: P50 ${Math.floor(p50Aht / 60)}:${String(Math.round(p50Aht) % 60).padStart(2, '0')} (benchmark: 5:00)`,
          probableCause: 'Tiempos de gestión eficientes. Procesos operativos optimizados.',
          economicImpact: 0,
          impactFormula: 'Sin exceso de coste por AHT',
          timeSavings: 'Operación eficiente',
          recommendation: 'Mantener nivel actual. Considerar Copilot para mejora continua y reducción adicional de tiempos en casos complejos.',
          severity: 'info',
          hasRealData: true
        });
      }
      break;

    case 'effectiveness_resolution':
      // Análisis principal: FCR Técnico y tasa de transferencias
      const annualVolumeEff = Math.round(totalVolume * annualizationFactor);
      const transferCount = Math.round(annualVolumeEff * (avgTransferRate / 100));

      // Calcular impacto económico de transferencias
      const transferCostTotal = Math.round(transferCount * CPI_TCO * 0.5);

      // Potencial de mejora con IA
      const improvementPotential = avgFCR < 90 ? Math.round((90 - avgFCR) / 100 * annualVolumeEff) : 0;
      const potentialSavingsEff = Math.round(improvementPotential * CPI_TCO * 0.3);

      // Determinar severidad basada en FCR
      const effSeverity = avgFCR < 70 ? 'critical' : avgFCR < 85 ? 'warning' : 'info';

      // Construir causa basada en datos
      let effCause = '';
      if (avgFCR < 70) {
        effCause = skillsLowFCR.length > 0
          ? `Alta tasa de transferencias (${avgTransferRate.toFixed(0)}%) indica falta de herramientas o autoridad. Crítico en ${skillsLowFCR.slice(0, 2).map(s => s.skill).join(', ')}.`
          : `Transferencias elevadas (${avgTransferRate.toFixed(0)}%): agentes sin información contextual o sin autoridad para resolver.`;
      } else if (avgFCR < 85) {
        effCause = `Transferencias del ${avgTransferRate.toFixed(0)}% indican oportunidad de mejora con asistencia IA para casos complejos.`;
      } else {
        effCause = `FCR Técnico en nivel óptimo. Transferencias del ${avgTransferRate.toFixed(0)}% principalmente en casos que requieren escalación legítima.`;
      }

      // Construir recomendación
      let effRecommendation = '';
      if (avgFCR < 70) {
        effRecommendation = `Desplegar Knowledge Copilot con búsqueda inteligente en KB + Guided Resolution Copilot para casos complejos. Objetivo: FCR >85%. Potencial ahorro: ${formatCurrency(potentialSavingsEff)}/año.`;
      } else if (avgFCR < 85) {
        effRecommendation = `Implementar Copilot de asistencia en tiempo real: sugerencias contextuales + conexión con expertos virtuales para reducir transferencias. Objetivo: FCR >90%.`;
      } else {
        effRecommendation = `Mantener nivel actual. Considerar IA para análisis de transferencias legítimas y optimización de enrutamiento predictivo.`;
      }

      analyses.push({
        finding: `FCR Técnico: ${avgFCR.toFixed(0)}% | Transferencias: ${avgTransferRate.toFixed(0)}% (benchmark: FCR >85%, Transfer <10%)`,
        probableCause: effCause,
        economicImpact: transferCostTotal,
        impactFormula: `${transferCount.toLocaleString()} transferencias/año × €${CPI_TCO}/int × 50% coste adicional`,
        timeSavings: `${transferCount.toLocaleString()} transferencias/año (${avgTransferRate.toFixed(0)}% del volumen)`,
        recommendation: effRecommendation,
        severity: effSeverity,
        hasRealData: true
      });
      break;

    case 'volumetry_distribution':
      // Análisis de concentración de volumen
      const topSkill = [...heatmapData].sort((a, b) => b.volume - a.volume)[0];
      const topSkillPct = topSkill ? (topSkill.volume / totalVolume) * 100 : 0;
      if (topSkillPct > 40 && topSkill) {
        const annualTopSkillVolume = Math.round(topSkill.volume * annualizationFactor);
        const deflectionPotential = Math.round(annualTopSkillVolume * CPI_TCO * 0.20);
        const interactionsDeflectable = Math.round(annualTopSkillVolume * 0.20);
        analyses.push({
          finding: `Concentración de volumen: ${topSkill.skill} representa ${topSkillPct.toFixed(0)}% del total`,
          probableCause: `Alta concentración en un skill indica consultas repetitivas con potencial de automatización.`,
          economicImpact: deflectionPotential,
          impactFormula: `${topSkill.volume.toLocaleString()} int × anualización × €${CPI_TCO} × 20% deflexión potencial`,
          timeSavings: `${annualTopSkillVolume.toLocaleString()} interacciones/año en ${topSkill.skill} (${interactionsDeflectable.toLocaleString()} automatizables)`,
          recommendation: `Analizar tipologías de ${topSkill.skill} para deflexión a autoservicio o agente virtual. Potencial: ${formatCurrency(deflectionPotential)}/año.`,
          severity: 'info',
          hasRealData: true
        });
      }
      break;

    case 'complexity_predictability':
      // KPI principal: CV AHT (predictability metric per industry standards)
      // Siempre mostrar análisis de CV AHT ya que es el KPI de esta dimensión
      const cvBenchmark = 75; // Best practice: CV AHT < 75%

      if (avgCVAHT > cvBenchmark) {
        const staffingCost = Math.round(economicModel.currentAnnualCost * 0.03);
        const staffingHours = Math.round(staffingCost / HOURLY_COST);
        const standardizationSavings = Math.round(staffingCost * 0.50);

        // Determinar severidad basada en CV AHT
        const cvSeverity = avgCVAHT > 125 ? 'critical' : avgCVAHT > 100 ? 'warning' : 'warning';

        // Causa dinámica basada en nivel de variabilidad
        const cvCause = avgCVAHT > 125
          ? 'Dispersión extrema en tiempos de atención impide planificación efectiva de recursos. Probable falta de scripts o procesos estandarizados.'
          : 'Variabilidad moderada en tiempos indica oportunidad de estandarización para mejorar planificación WFM.';

        analyses.push({
          finding: `CV AHT elevado: ${avgCVAHT.toFixed(0)}% (benchmark: <${cvBenchmark}%)`,
          probableCause: cvCause,
          economicImpact: staffingCost,
          impactFormula: `~3% del coste operativo por ineficiencia de staffing`,
          timeSavings: `~${staffingHours.toLocaleString()} horas/año en sobre/subdimensionamiento`,
          recommendation: `Implementar scripts guiados por IA que estandaricen la atención. Reducción esperada: -50% variabilidad. Ahorro: ${formatCurrency(standardizationSavings)}/año.`,
          severity: cvSeverity,
          hasRealData: true
        });
      } else {
        // CV AHT dentro de benchmark - mostrar estado positivo
        analyses.push({
          finding: `CV AHT dentro de benchmark: ${avgCVAHT.toFixed(0)}% (benchmark: <${cvBenchmark}%)`,
          probableCause: 'Tiempos de atención consistentes. Buena estandarización de procesos.',
          economicImpact: 0,
          impactFormula: 'Sin impacto por variabilidad',
          timeSavings: 'Planificación WFM eficiente',
          recommendation: 'Mantener nivel actual. Analizar casos atípicos para identificar oportunidades de mejora continua.',
          severity: 'info',
          hasRealData: true
        });
      }

      // Análisis secundario: Hold Time (proxy de complejidad)
      if (avgHoldTime > 45) {
        const excessHold = avgHoldTime - 30;
        const annualVolumeHold = Math.round(totalVolume * annualizationFactor);
        const excessHoldHours = Math.round((excessHold / 3600) * annualVolumeHold);
        const holdCost = Math.round(excessHoldHours * HOURLY_COST);
        const searchCopilotSavings = Math.round(holdCost * 0.60);
        analyses.push({
          finding: `Hold time elevado: ${avgHoldTime.toFixed(0)}s promedio (benchmark: <30s)`,
          probableCause: 'Agentes ponen cliente en espera para buscar información. Sistemas no presentan datos de forma contextual.',
          economicImpact: holdCost,
          impactFormula: `Exceso ${Math.round(excessHold)}s × ${totalVolume.toLocaleString()} int × anualización × €${HOURLY_COST}/h`,
          timeSavings: `${excessHoldHours.toLocaleString()} horas/año de cliente en espera`,
          recommendation: `Desplegar vista 360° con contexto automático: historial, productos y acciones sugeridas visibles al contestar. Reducción esperada: -60% hold time. Ahorro: ${formatCurrency(searchCopilotSavings)}/año.`,
          severity: avgHoldTime > 60 ? 'critical' : 'warning',
          hasRealData: true
        });
      }
      break;

    case 'customer_satisfaction':
      // Solo generar análisis si hay datos de CSAT reales
      if (avgCSAT > 0) {
        if (avgCSAT < 70) {
          const annualVolumeCsat = Math.round(totalVolume * annualizationFactor);
          const customersAtRisk = Math.round(annualVolumeCsat * 0.02);
          const churnRisk = Math.round(customersAtRisk * 50);
          analyses.push({
            finding: `CSAT por debajo del objetivo: ${avgCSAT.toFixed(0)}% (benchmark: >80%)`,
            probableCause: 'Clientes insatisfechos por esperas, falta de resolución o experiencia de atención deficiente.',
            economicImpact: churnRisk,
            impactFormula: `${totalVolume.toLocaleString()} clientes × anualización × 2% riesgo churn × €50 valor`,
            timeSavings: `${customersAtRisk.toLocaleString()} clientes/año en riesgo de fuga`,
            recommendation: `Implementar programa VoC: encuestas post-contacto + análisis de causas raíz + acción correctiva en 48h. Objetivo: CSAT >80%.`,
            severity: avgCSAT < 50 ? 'critical' : 'warning',
            hasRealData: true
          });
        }
      }
      break;

    case 'economy_cpi':
      // Análisis de CPI
      if (CPI > 3.5) {
        const excessCPI = CPI - CPI_TCO;
        const annualVolumeCpi = Math.round(totalVolume * annualizationFactor);
        const potentialSavings = Math.round(annualVolumeCpi * excessCPI);
        const excessHours = Math.round(potentialSavings / HOURLY_COST);
        analyses.push({
          finding: `CPI por encima del benchmark: €${CPI.toFixed(2)} (objetivo: €${CPI_TCO})`,
          probableCause: 'Coste por interacción elevado por AHT alto, baja ocupación o estructura de costes ineficiente.',
          economicImpact: potentialSavings,
          impactFormula: `${totalVolume.toLocaleString()} int × anualización × €${excessCPI.toFixed(2)} exceso CPI`,
          timeSavings: `€${excessCPI.toFixed(2)} exceso/int × ${annualVolumeCpi.toLocaleString()} int = ${excessHours.toLocaleString()}h equivalentes`,
          recommendation: `Optimizar mix de canales + reducir AHT con automatización + revisar modelo de staffing. Objetivo: CPI <€${CPI_TCO}.`,
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

      {/* Hallazgo Clave - Solo si hay datos */}
      {dimension.score >= 0 && causalAnalyses.length > 0 && (
        <div className="p-4 space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Hallazgo Clave
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
                  <span className="text-xs text-gray-500">impacto anual (coste del problema)</span>
                  <span className="text-xs text-gray-400">i</span>
                </div>

                {/* Ahorro de tiempo - da credibilidad al cálculo económico */}
                {analysis.timeSavings && (
                  <div className="ml-6 mb-2 flex items-center gap-2">
                    <Clock className="w-3 h-3 text-blue-500" />
                    <span className="text-xs text-blue-700">{analysis.timeSavings}</span>
                  </div>
                )}

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

      {/* Fallback: Hallazgos originales si no hay hallazgo clave - Solo si hay datos */}
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

      {/* Recommendations Preview - Solo si no hay hallazgo clave y hay datos */}
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

  // Generar hallazgo clave para cada dimensión
  const getCausalAnalysisForDimension = (dimension: DimensionAnalysis) =>
    generateCausalAnalysis(dimension, data.heatmapData, data.economicModel, data.staticConfig, data.dateRange);

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
