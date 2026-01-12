import { motion } from 'framer-motion';
import { Bot, Zap, Brain, Activity, ChevronRight } from 'lucide-react';
import { OpportunityTreemap, TreemapData, ReadinessCategory } from '../charts/OpportunityTreemap';
import type { AnalysisData, HeatmapDataPoint, SubFactor } from '../../types';

interface AgenticReadinessTabProps {
  data: AnalysisData;
}

// Global Score Gauge
function GlobalScoreGauge({ score, confidence }: { score: number; confidence?: string }) {
  const getColor = (s: number) => {
    if (s >= 7) return '#059669';   // emerald-600 - Ready to automate
    if (s >= 5) return '#6D84E3';   // primary blue - Assist with copilot
    if (s >= 3) return '#D97706';   // amber-600 - Optimize first
    return '#DC2626';               // red-600 - Not ready
  };

  const getLabel = (s: number) => {
    if (s >= 7) return 'Listo para Automatizar';
    if (s >= 5) return 'Asistir con Copilot';
    if (s >= 3) return 'Optimizar Primero';
    return 'No Apto';
  };

  const color = getColor(score);
  const percentage = (score / 10) * 100;

  return (
    <div className="bg-white rounded-lg p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#6D84E3]" />
          Agentic Readiness Score
        </h3>
        {confidence && (
          <span className={`text-xs px-2 py-1 rounded-full ${
            confidence === 'high' ? 'bg-emerald-100 text-emerald-700' :
            confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            Confianza: {confidence === 'high' ? 'Alta' : confidence === 'medium' ? 'Media' : 'Baja'}
          </span>
        )}
      </div>

      {/* Score Display */}
      <div className="flex items-center gap-6">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="12"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${percentage * 2.64} ${100 * 2.64}`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ color }}>{score.toFixed(1)}</span>
            <span className="text-xs text-slate-500">/10</span>
          </div>
        </div>

        <div className="flex-1">
          <p className="font-medium text-lg" style={{ color }}>{getLabel(score)}</p>
          <p className="text-sm text-slate-500 mt-1">
            {score >= 7
              ? 'Skills con alta predictibilidad y bajo riesgo de error'
              : score >= 5
              ? 'Skills aptos para asistencia AI con supervisión humana'
              : 'Requiere optimización de procesos antes de automatizar'}
          </p>
        </div>
      </div>
    </div>
  );
}

// Sub-factors Breakdown
function SubFactorsBreakdown({ subFactors }: { subFactors: SubFactor[] }) {
  const getIcon = (name: string) => {
    if (name.includes('repetitiv')) return Activity;
    if (name.includes('predict')) return Brain;
    if (name.includes('estructura') || name.includes('complex')) return Zap;
    return Bot;
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <h3 className="font-semibold text-slate-800 mb-4">Desglose de Factores</h3>
      <div className="space-y-3">
        {subFactors.map((factor) => {
          const Icon = getIcon(factor.name);
          const percentage = (factor.score / 10) * 100;
          const weightPct = Math.round(factor.weight * 100);

          return (
            <div key={factor.name} className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#6D84E3]" />
                  <span className="text-sm font-medium text-slate-700">{factor.displayName}</span>
                  <span className="text-xs text-slate-400">({weightPct}%)</span>
                </div>
                <span className="font-bold text-slate-800">{factor.score.toFixed(1)}</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#6D84E3] rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">{factor.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Skills Heatmap/Table
function SkillsReadinessTable({ heatmapData }: { heatmapData: HeatmapDataPoint[] }) {
  // Sort by automation_readiness descending
  const sortedData = [...heatmapData].sort((a, b) => b.automation_readiness - a.automation_readiness);

  const getReadinessColor = (score: number) => {
    if (score >= 70) return 'bg-emerald-100 text-emerald-700';
    if (score >= 50) return 'bg-[#6D84E3]/20 text-[#6D84E3]';
    if (score >= 30) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'automate_now': return 'Automatizar';
      case 'assist_copilot': return 'Copilot';
      case 'optimize_first': return 'Optimizar';
      default: return 'Evaluar';
    }
  };

  const getRecommendation = (dataPoint: HeatmapDataPoint): string => {
    const score = dataPoint.automation_readiness;
    if (score >= 70) return 'Implementar agente autónomo con supervisión mínima';
    if (score >= 50) return 'Desplegar copilot con escalado humano';
    if (score >= 30) return 'Reducir variabilidad antes de automatizar';
    return 'Optimizar procesos y reducir transferencias';
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="font-semibold text-slate-800">Análisis por Skill</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50">
              <th className="px-4 py-2 text-left font-medium">Skill</th>
              <th className="px-4 py-2 text-right font-medium">Volumen</th>
              <th className="px-4 py-2 text-right font-medium">AHT</th>
              <th className="px-4 py-2 text-right font-medium">CV AHT</th>
              <th className="px-4 py-2 text-right font-medium">Transfer</th>
              <th className="px-4 py-2 text-center font-medium">Score</th>
              <th className="px-4 py-2 text-left font-medium">Categoría</th>
              <th className="px-4 py-2 text-left font-medium">Siguiente Paso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedData.map((item) => (
              <motion.tr
                key={item.skill}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-slate-50"
              >
                <td className="px-4 py-3 text-sm font-medium text-slate-800">{item.skill}</td>
                <td className="px-4 py-3 text-sm text-slate-600 text-right">
                  {item.volume.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 text-right">
                  {item.aht_seconds}s
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <span className={item.variability.cv_aht > 50 ? 'text-amber-600' : 'text-slate-600'}>
                    {item.variability.cv_aht.toFixed(0)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  <span className={item.variability.transfer_rate > 20 ? 'text-red-600' : 'text-slate-600'}>
                    {item.variability.transfer_rate.toFixed(0)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getReadinessColor(item.automation_readiness)}`}>
                    {(item.automation_readiness / 10).toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    item.readiness_category === 'automate_now' ? 'bg-emerald-100 text-emerald-700' :
                    item.readiness_category === 'assist_copilot' ? 'bg-[#6D84E3]/20 text-[#6D84E3]' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {getCategoryLabel(item.readiness_category)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 max-w-xs">
                  <div className="flex items-start gap-1">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-[#6D84E3] flex-shrink-0" />
                    {getRecommendation(item)}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AgenticReadinessTab({ data }: AgenticReadinessTabProps) {
  // Get agentic readiness dimension or use fallback
  const agenticDimension = data.dimensions.find(d => d.name === 'agentic_readiness');
  const globalScore = data.agenticReadiness?.score || agenticDimension?.score || 0;
  const subFactors = data.agenticReadiness?.sub_factors || agenticDimension?.sub_factors || [];
  const confidence = data.agenticReadiness?.confidence;

  // Convert heatmap data to treemap format
  const treemapData: TreemapData[] = data.heatmapData.map(item => ({
    name: item.skill,
    value: item.annual_cost || item.volume * item.aht_seconds * 0.005, // Use annual cost or estimate
    category: item.readiness_category || (
      item.automation_readiness >= 70 ? 'automate_now' :
      item.automation_readiness >= 50 ? 'assist_copilot' : 'optimize_first'
    ) as ReadinessCategory,
    skill: item.skill,
    score: item.automation_readiness / 10,
    volume: item.volume
  }));

  return (
    <div className="space-y-6">
      {/* Top Row: Score Gauge + Sub-factors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlobalScoreGauge score={globalScore / 10} confidence={confidence} />
        <SubFactorsBreakdown subFactors={subFactors} />
      </div>

      {/* Treemap */}
      <OpportunityTreemap
        data={treemapData}
        title="Mapa de Oportunidades por Volumen y Readiness"
        height={300}
      />

      {/* Skills Table */}
      <SkillsReadinessTable heatmapData={data.heatmapData} />
    </div>
  );
}

export default AgenticReadinessTab;
