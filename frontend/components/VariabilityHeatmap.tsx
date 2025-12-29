import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ArrowUpDown, TrendingUp, AlertTriangle, CheckCircle, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { HeatmapDataPoint } from '../types';
import clsx from 'clsx';
import MethodologyFooter from './MethodologyFooter';
import { getConsolidatedCategory, skillsConsolidationConfig } from '../config/skillsConsolidation';

interface VariabilityHeatmapProps {
  data: HeatmapDataPoint[];
}

type SortKey = 'skill' | 'cv_aht' | 'cv_talk_time' | 'cv_hold_time' | 'transfer_rate' | 'automation_readiness' | 'volume';
type SortOrder = 'asc' | 'desc';

interface TooltipData {
  skill: string;
  metric: string;
  value: number;
  x: number;
  y: number;
}

interface Insight {
  type: 'quick_win' | 'standardize' | 'consult';
  skill: string;
  volume: number;
  automation_readiness: number;
  recommendation: string;
  roi: number;
}

interface ConsolidatedDataPoint {
  categoryKey: string;
  categoryName: string;
  volume: number;
  originalSkills: string[];
  variability: {
    cv_aht: number;
    cv_talk_time: number;
    cv_hold_time: number;
    transfer_rate: number;
  };
  automation_readiness: number;
}

// Colores invertidos: Verde = bajo CV (bueno), Rojo = alto CV (malo)
// Escala RELATIVA: Ajusta a los datos reales (45-75%) para mejor diferenciación
const getCellColor = (value: number, minValue: number = 45, maxValue: number = 75) => {
  // Normalizar valor al rango 0-100 relativo al min/max actual
  const normalized = ((value - minValue) / (maxValue - minValue)) * 100;

  // Escala relativa a datos reales
  if (normalized < 20) return 'bg-emerald-600 text-white'; // Bajo en rango
  if (normalized < 35) return 'bg-green-500 text-white'; // Bajo-medio
  if (normalized < 50) return 'bg-yellow-400 text-yellow-900'; // Medio
  if (normalized < 70) return 'bg-amber-500 text-white'; // Alto-medio
  return 'bg-red-500 text-white'; // Alto en rango
};

const getReadinessColor = (score: number) => {
  if (score >= 80) return 'bg-emerald-600 text-white';
  if (score >= 60) return 'bg-yellow-400 text-yellow-900';
  return 'bg-red-500 text-white';
};

const getReadinessLabel = (score: number): string => {
  if (score >= 80) return 'Listo para automatizar';
  if (score >= 60) return 'Estandarizar primero';
  return 'Consultoría recomendada';
};

const getCellIcon = (value: number) => {
  if (value < 25) return <CheckCircle size={12} className="inline ml-1" />;
  if (value >= 55) return <AlertTriangle size={12} className="inline ml-1" />;
  return null;
};

// Función para consolidar skills por categoría
const consolidateVariabilityData = (data: HeatmapDataPoint[]): ConsolidatedDataPoint[] => {
  const consolidationMap = new Map<string, {
    category: string;
    displayName: string;
    volume: number;
    skills: string[];
    cvAhtSum: number;
    cvTalkSum: number;
    cvHoldSum: number;
    transferRateSum: number;
    readinessSum: number;
    count: number;
  }>();

  data.forEach(item => {
    const category = getConsolidatedCategory(item.skill);
    if (!category) return;

    const key = category.category;
    if (!consolidationMap.has(key)) {
      consolidationMap.set(key, {
        category: key,
        displayName: category.displayName,
        volume: 0,
        skills: [],
        cvAhtSum: 0,
        cvTalkSum: 0,
        cvHoldSum: 0,
        transferRateSum: 0,
        readinessSum: 0,
        count: 0
      });
    }

    const entry = consolidationMap.get(key)!;
    entry.volume += item.volume || 0;
    entry.skills.push(item.skill);
    entry.cvAhtSum += item.variability?.cv_aht || 0;
    entry.cvTalkSum += item.variability?.cv_talk_time || 0;
    entry.cvHoldSum += item.variability?.cv_hold_time || 0;
    entry.transferRateSum += item.variability?.transfer_rate || 0;
    entry.readinessSum += item.automation_readiness || 0;
    entry.count += 1;
  });

  return Array.from(consolidationMap.values()).map(entry => ({
    categoryKey: entry.category,
    categoryName: entry.displayName,
    volume: entry.volume,
    originalSkills: [...new Set(entry.skills)],
    variability: {
      cv_aht: Math.round(entry.cvAhtSum / entry.count),
      cv_talk_time: Math.round(entry.cvTalkSum / entry.count),
      cv_hold_time: Math.round(entry.cvHoldSum / entry.count),
      transfer_rate: Math.round(entry.transferRateSum / entry.count)
    },
    automation_readiness: Math.round(entry.readinessSum / entry.count)
  }));
};

const VariabilityHeatmap: React.FC<VariabilityHeatmapProps> = ({ data }) => {
  const [sortKey, setSortKey] = useState<SortKey>('automation_readiness');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const metrics: Array<{ key: keyof HeatmapDataPoint['variability']; label: string }> = [
    { key: 'cv_aht', label: 'CV AHT' },
    { key: 'cv_talk_time', label: 'CV Talk Time' },
    { key: 'cv_hold_time', label: 'CV Hold Time' },
    { key: 'transfer_rate', label: 'Transfer Rate' },
  ];

  // Calculate insights with consolidated data
  const insights = useMemo(() => {
    try {
      const consolidated = consolidateVariabilityData(data);
      const sortedByReadiness = [...consolidated].sort((a, b) => b.automation_readiness - a.automation_readiness);

      // Calculate simple ROI estimate: based on volume and variability reduction potential
      const getRoiEstimate = (cat: ConsolidatedDataPoint): number => {
        const volumeFactor = Math.min(cat.volume / 1000, 10); // Max 10K impact
        const variabilityReduction = Math.max(0, 75 - cat.variability.cv_aht); // Potential improvement
        return Math.round(volumeFactor * variabilityReduction * 1.5); // Rough EU multiplier
      };

      const quickWins: Insight[] = sortedByReadiness
        .filter(item => item.automation_readiness >= 80)
        .slice(0, 5)
        .map(item => ({
          type: 'quick_win',
          skill: item.categoryName,
          volume: item.volume,
          automation_readiness: item.automation_readiness,
          roi: getRoiEstimate(item),
          recommendation: `CV AHT ${item.variability.cv_aht}% → Listo para automatización`
        }));

      const standardize: Insight[] = sortedByReadiness
        .filter(item => item.automation_readiness >= 60 && item.automation_readiness < 80)
        .slice(0, 5)
        .map(item => ({
          type: 'standardize',
          skill: item.categoryName,
          volume: item.volume,
          automation_readiness: item.automation_readiness,
          roi: getRoiEstimate(item),
          recommendation: `Estandarizar antes de automatizar`
        }));

      const consult: Insight[] = sortedByReadiness
        .filter(item => item.automation_readiness < 60)
        .slice(0, 5)
        .map(item => ({
          type: 'consult',
          skill: item.categoryName,
          volume: item.volume,
          automation_readiness: item.automation_readiness,
          roi: getRoiEstimate(item),
          recommendation: `Consultoría para identificar causas raíz`
        }));

      return { quickWins, standardize, consult };
    } catch (error) {
      console.error('❌ Error calculating insights (VariabilityHeatmap):', error);
      return { quickWins: [], standardize: [], consult: [] };
    }
  }, [data]);

  // Calculate dynamic title
  const dynamicTitle = useMemo(() => {
    try {
      if (!data || !Array.isArray(data)) return 'Análisis de variabilidad interna';
      const highVariability = data.filter(item => (item?.automation_readiness || 0) < 60).length;
      const total = data.length;
      
      if (highVariability === 0) {
        return `Todas las skills muestran baja variabilidad (>60), listas para automatización`;
      } else if (highVariability === total) {
        return `${highVariability} de ${total} skills muestran alta variabilidad (CV>40%), sugiriendo necesidad de estandarización antes de automatizar`;
      } else {
        return `${highVariability} de ${total} skills muestran alta variabilidad (CV>40%), sugiriendo necesidad de estandarización antes de automatizar`;
      }
    } catch (error) {
      console.error('❌ Error in dynamicTitle useMemo (VariabilityHeatmap):', error);
      return 'Análisis de variabilidad interna';
    }
  }, [data]);

  // Consolidate data once for reuse
  const consolidatedData = useMemo(() => consolidateVariabilityData(data), [data]);

  // Get min/max values for relative color scaling
  const colorScaleValues = useMemo(() => {
    const cvValues = consolidatedData.flatMap(item => [
      item.variability.cv_aht,
      item.variability.cv_talk_time,
      item.variability.cv_hold_time
    ]);
    return {
      min: Math.min(...cvValues, 45),
      max: Math.max(...cvValues, 75)
    };
  }, [consolidatedData]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'automation_readiness' ? 'desc' : key === 'volume' ? 'desc' : 'asc');
    }
  };

  const sortedData = [...consolidatedData].sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    if (sortKey === 'skill') {
      aValue = a.categoryName;
      bValue = b.categoryName;
    } else if (sortKey === 'automation_readiness') {
      aValue = a.automation_readiness;
      bValue = b.automation_readiness;
    } else if (sortKey === 'volume') {
      aValue = a.volume;
      bValue = b.volume;
    } else {
      aValue = a.variability?.[sortKey] || 0;
      bValue = b.variability?.[sortKey] || 0;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortOrder === 'asc'
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const handleCellHover = (
    skill: string,
    metric: string,
    value: number,
    event: React.MouseEvent
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      skill,
      metric,
      value,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleCellLeave = () => {
    setTooltip(null);
  };

  return (
    <div id="variability-heatmap" className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
      {/* Header with Dynamic Title */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={24} className="text-[#6D84E3]" />
              <h3 className="font-bold text-2xl text-slate-800">Heatmap de Variabilidad Interna™</h3>
              <div className="group relative">
                <HelpCircle size={18} className="text-slate-400 cursor-pointer" />
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-80 bg-slate-800 text-white text-xs rounded py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                  Mide la consistencia y predictibilidad interna de cada skill. Baja variabilidad indica procesos maduros listos para automatización. Alta variabilidad sugiere necesidad de estandarización o consultoría.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {dynamicTitle}
            </p>
          </div>
        </div>

        {/* Insights Panel - Improved with Volume & ROI */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          {/* Quick Wins */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={18} className="text-emerald-600" />
              <h4 className="font-semibold text-emerald-800">✓ Quick Wins ({insights.quickWins.length})</h4>
            </div>
            <div className="space-y-2">
              {insights.quickWins.map((insight, idx) => (
                <div key={idx} className="text-xs p-2 bg-white rounded border-l-2 border-emerald-400">
                  <div className="font-bold text-emerald-700">{idx + 1}. {insight.skill}</div>
                  <div className="text-emerald-600 text-xs mt-1">
                    Vol: {(insight.volume / 1000).toFixed(1)}K/mes | ROI: €{insight.roi}K/año
                  </div>
                  <div className="text-emerald-600 text-xs mt-1">{insight.recommendation}</div>
                </div>
              ))}
              {insights.quickWins.length === 0 && (
                <p className="text-xs text-emerald-600 italic">No hay skills con readiness &gt;80</p>
              )}
            </div>
          </div>

          {/* Standardize - Top 5 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={18} className="text-amber-600" />
              <h4 className="font-semibold text-amber-800">📈 Estandarizar ({insights.standardize.length})</h4>
            </div>
            <div className="space-y-2">
              {insights.standardize.map((insight, idx) => (
                <div key={idx} className="text-xs p-2 bg-white rounded border-l-2 border-amber-400">
                  <div className="font-bold text-amber-700">{idx + 1}. {insight.skill}</div>
                  <div className="text-amber-600 text-xs mt-1">
                    Vol: {(insight.volume / 1000).toFixed(1)}K/mes | ROI: €{insight.roi}K/año
                  </div>
                  <div className="text-amber-600 text-xs mt-1">{insight.recommendation}</div>
                </div>
              ))}
              {insights.standardize.length === 0 && (
                <p className="text-xs text-amber-600 italic">No hay skills con readiness 60-79</p>
              )}
            </div>
          </div>

          {/* Consult */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-red-600" />
              <h4 className="font-semibold text-red-800">⚠️ Consultoría ({insights.consult.length})</h4>
            </div>
            <div className="space-y-2">
              {insights.consult.map((insight, idx) => (
                <div key={idx} className="text-xs p-2 bg-white rounded border-l-2 border-red-400">
                  <div className="font-bold text-red-700">{idx + 1}. {insight.skill}</div>
                  <div className="text-red-600 text-xs mt-1">
                    Vol: {(insight.volume / 1000).toFixed(1)}K/mes | ROI: €{insight.roi}K/año
                  </div>
                  <div className="text-red-600 text-xs mt-1">{insight.recommendation}</div>
                </div>
              ))}
              {insights.consult.length === 0 && (
                <p className="text-xs text-red-600 italic">No hay skills con readiness &lt;60</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50">
            <tr>
              <th
                onClick={() => handleSort('skill')}
                className="p-4 font-semibold text-slate-700 text-left cursor-pointer hover:bg-slate-100 transition-colors border-b-2 border-slate-300"
              >
                <div className="flex items-center gap-2">
                  <span>Categoría/Skill</span>
                  <ArrowUpDown size={14} className="text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('volume')}
                className="p-4 font-semibold text-slate-700 text-center cursor-pointer hover:bg-slate-100 transition-colors border-b-2 border-slate-300 bg-blue-50"
              >
                <div className="flex items-center justify-center gap-2">
                  <span>VOLUMEN</span>
                  <ArrowUpDown size={14} className="text-slate-400" />
                </div>
              </th>
              {metrics.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="p-4 font-semibold text-slate-700 text-center cursor-pointer hover:bg-slate-100 transition-colors uppercase border-b-2 border-slate-300"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>{label}</span>
                    <ArrowUpDown size={14} className="text-slate-400" />
                  </div>
                </th>
              ))}
              <th
                onClick={() => handleSort('automation_readiness')}
                className="p-4 font-semibold text-slate-700 text-center cursor-pointer hover:bg-slate-100 transition-colors border-b-2 border-slate-300"
              >
                <div className="flex items-center justify-center gap-2">
                  <span>READINESS</span>
                  <ArrowUpDown size={14} className="text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {sortedData.map((item, index) => (
                <motion.tr
                  key={item.categoryKey}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: index * 0.03 }}
                  onMouseEnter={() => setHoveredRow(item.categoryKey)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={clsx(
                    'border-b border-slate-200 transition-colors',
                    hoveredRow === item.categoryKey && 'bg-blue-50'
                  )}
                >
                  <td className="p-4 font-semibold text-slate-800 border-r border-slate-200">
                    <div className="flex items-center justify-between">
                      <span>{item.categoryName}</span>
                      {item.originalSkills.length > 1 && (
                        <span className="text-xs text-slate-500 ml-2">
                          ({item.originalSkills.length} skills)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-center bg-blue-50 border-l border-blue-200">
                    <div className="text-slate-800">{(item.volume / 1000).toFixed(1)}K/mes</div>
                  </td>
                  {metrics.map(({ key }) => {
                    const value = item.variability[key];
                    return (
                      <td
                        key={key}
                        className={clsx(
                          'p-4 font-bold text-center cursor-pointer transition-all relative',
                          getCellColor(value, colorScaleValues.min, colorScaleValues.max),
                          hoveredRow === item.categoryKey && 'scale-105 shadow-lg ring-2 ring-blue-400'
                        )}
                        onMouseEnter={(e) => handleCellHover(item.categoryName, key.toUpperCase(), value, e)}
                        onMouseLeave={handleCellLeave}
                      >
                        <span>{value}%</span>
                        {getCellIcon(value)}
                      </td>
                    );
                  })}
                  <td className={clsx(
                    'p-4 font-bold text-center',
                    getReadinessColor(item.automation_readiness)
                  )}>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-lg">{item.automation_readiness}</span>
                      <span className="text-xs opacity-90">{getReadinessLabel(item.automation_readiness)}</span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Enhanced Legend - Relative Scale */}
      <div className="mt-6 p-4 bg-slate-50 rounded-lg">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="font-semibold text-slate-700">Escala de Variabilidad (escala relativa a datos actuales):</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-emerald-600"></div>
            <span className="text-slate-700"><strong>Bajo</strong> (Mejor en rango)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-green-500"></div>
            <span className="text-slate-700"><strong>Bajo-Medio</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-yellow-400"></div>
            <span className="text-slate-700"><strong>Medio</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-amber-500"></div>
            <span className="text-slate-700"><strong>Alto-Medio</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-red-500"></div>
            <span className="text-slate-700"><strong>Alto</strong> (Peor en rango)</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs mt-3 pt-3 border-t border-slate-200">
          <span className="font-semibold text-slate-700">Automation Readiness (0-100):</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-emerald-600"></div>
            <span className="text-slate-700"><strong>80-100</strong> - Listo para automatizar</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-yellow-400"></div>
            <span className="text-slate-700"><strong>60-79</strong> - Estandarizar primero</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-red-500"></div>
            <span className="text-slate-700"><strong>&lt;60</strong> - Consultoría recomendada</span>
          </div>
        </div>
        <div className="text-xs text-slate-600 mt-3 italic">
          💡 <strong>Nota:</strong> Los datos se han consolidado de 44 skills a 12 categorías para mayor claridad. Las métricas muestran promedios por categoría.
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed z-50 bg-slate-800 text-white text-xs rounded-lg py-2 px-3 pointer-events-none"
            style={{
              left: tooltip.x,
              top: tooltip.y - 10,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="font-semibold mb-1">{tooltip.skill}</div>
            <div>{tooltip.metric}: {tooltip.value}%</div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Methodology Footer */}
      <MethodologyFooter
        sources={[
          'Datos operacionales del contact center (últimos 3 meses)',
          'Análisis de variabilidad por skill/canal',
          'Benchmarks de procesos estandarizados'
        ]}
        methodology="Automation Readiness calculado como: (100-CV_AHT)×30% + (100-CV_FCR)×25% + (100-CV_CSAT)×20% + (100-Entropía)×15% + (100-Escalación)×10%"
        assumptions={[
          'CV (Coeficiente de Variación) = Desviación Estándar / Media',
          'Entropía mide diversidad de motivos de contacto (0-100)',
          'Baja variabilidad indica proceso maduro y predecible'
        ]}
      />
    </div>
  );
};

export default VariabilityHeatmap;
