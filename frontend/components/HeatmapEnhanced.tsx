import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import { HeatmapDataPoint } from '../types';
import clsx from 'clsx';

interface HeatmapEnhancedProps {
  data: HeatmapDataPoint[];
}

type SortKey = 'skill' | 'fcr' | 'aht' | 'csat' | 'quality';
type SortOrder = 'asc' | 'desc';

interface TooltipData {
  skill: string;
  metric: string;
  value: number;
  x: number;
  y: number;
}

const getCellColor = (value: number) => {
  if (value >= 95) return 'bg-emerald-600 text-white';
  if (value >= 90) return 'bg-emerald-500 text-white';
  if (value >= 85) return 'bg-green-400 text-green-900';
  if (value >= 80) return 'bg-yellow-300 text-yellow-900';
  if (value >= 70) return 'bg-amber-400 text-amber-900';
  return 'bg-red-400 text-red-900';
};

const getPercentile = (value: number): string => {
  if (value >= 95) return 'P95+';
  if (value >= 90) return 'P90-P95';
  if (value >= 75) return 'P75-P90';
  if (value >= 50) return 'P50-P75';
  return '<P50';
};

const HeatmapEnhanced: React.FC<HeatmapEnhancedProps> = ({ data }) => {
  const [sortKey, setSortKey] = useState<SortKey>('skill');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const metrics: Array<{ key: keyof HeatmapDataPoint['metrics']; label: string }> = [
    { key: 'fcr', label: 'FCR' },
    { key: 'aht', label: 'AHT' },
    { key: 'csat', label: 'CSAT' },
    { key: 'quality', label: 'Quality' },
  ];

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    if (sortKey === 'skill') {
      aValue = a.skill;
      bValue = b.skill;
    } else {
      aValue = a.metrics[sortKey];
      bValue = b.metrics[sortKey];
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
    <div id="heatmap" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-xl text-slate-800">Beyond CX Heatmap™</h3>
          <div className="group relative">
            <HelpCircle size={16} className="text-slate-400 cursor-pointer" />
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-slate-800 text-white text-xs rounded py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
              Mapa de calor de Readiness Agéntico por skill. Muestra el rendimiento en métricas clave para identificar fortalezas y áreas de mejora.
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Click en columnas para ordenar
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th
                onClick={() => handleSort('skill')}
                className="p-3 font-semibold text-slate-700 text-left cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>Skill/Proceso</span>
                  <ArrowUpDown size={14} className="text-slate-400" />
                </div>
              </th>
              {metrics.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="p-3 font-semibold text-slate-700 text-center cursor-pointer hover:bg-slate-100 transition-colors uppercase"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>{label}</span>
                    <ArrowUpDown size={14} className="text-slate-400" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {sortedData.map(({ skill, metrics: skillMetrics }, index) => (
                <motion.tr
                  key={skill}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: index * 0.05 }}
                  onMouseEnter={() => setHoveredRow(skill)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={clsx(
                    'border-t border-slate-200 transition-colors',
                    hoveredRow === skill && 'bg-blue-50'
                  )}
                >
                  <td className="p-3 font-semibold text-slate-700">
                    {skill}
                  </td>
                  {metrics.map(({ key }) => {
                    const value = skillMetrics[key];
                    return (
                      <td
                        key={key}
                        className={clsx(
                          'p-3 font-bold text-center cursor-pointer transition-all',
                          getCellColor(value),
                          hoveredRow === skill && 'scale-105 shadow-md'
                        )}
                        onMouseEnter={(e) => handleCellHover(skill, key.toUpperCase(), value, e)}
                        onMouseLeave={handleCellLeave}
                      >
                        {value}
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex justify-end items-center gap-4 mt-6 text-xs">
        <span className="font-semibold text-slate-600">Leyenda:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-red-400"></div>
          <span className="text-slate-600">&lt;70 (Bajo)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-yellow-300"></div>
          <span className="text-slate-600">70-85 (Medio)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-green-400"></div>
          <span className="text-slate-600">85-90 (Bueno)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
          <span className="text-slate-600">90+ (Excelente)</span>
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 pointer-events-none"
            style={{
              left: tooltip.x,
              top: tooltip.y - 10,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl text-sm">
              <div className="font-bold mb-2">{tooltip.skill}</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-300">{tooltip.metric}:</span>
                  <span className="font-bold">{tooltip.value}%</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-300">Percentil:</span>
                  <span className="font-semibold">{getPercentile(tooltip.value)}</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-700">
                  {tooltip.value >= 85 ? (
                    <>
                      <TrendingUp size={14} className="text-green-400" />
                      <span className="text-green-400 text-xs">Por encima del promedio</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown size={14} className="text-amber-400" />
                      <span className="text-amber-400 text-xs">Oportunidad de mejora</span>
                    </>
                  )}
                </div>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900"></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HeatmapEnhanced;
