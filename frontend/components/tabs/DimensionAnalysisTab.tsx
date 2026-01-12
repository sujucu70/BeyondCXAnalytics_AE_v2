import { motion } from 'framer-motion';
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { AnalysisData, DimensionAnalysis, Finding, Recommendation } from '../../types';

interface DimensionAnalysisTabProps {
  data: AnalysisData;
}

// Dimension Card Component
function DimensionCard({
  dimension,
  findings,
  recommendations,
  delay = 0
}: {
  dimension: DimensionAnalysis;
  findings: Finding[];
  recommendations: Recommendation[];
  delay?: number;
}) {
  const Icon = dimension.icon;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-100';
    if (score >= 60) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Óptimo';
    if (score >= 60) return 'Aceptable';
    if (score >= 40) return 'Mejorable';
    return 'Crítico';
  };

  // Get KPI trend icon
  const TrendIcon = dimension.kpi.changeType === 'positive' ? TrendingUp :
                    dimension.kpi.changeType === 'negative' ? TrendingDown : Minus;

  const trendColor = dimension.kpi.changeType === 'positive' ? 'text-emerald-600' :
                     dimension.kpi.changeType === 'negative' ? 'text-red-600' : 'text-slate-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="bg-white rounded-lg border border-slate-200 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#6D84E3]/10">
              <Icon className="w-5 h-5 text-[#6D84E3]" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{dimension.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xs">{dimension.summary}</p>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getScoreColor(dimension.score)}`}>
            {dimension.score}
            <span className="text-xs font-normal ml-1">{getScoreLabel(dimension.score)}</span>
          </div>
        </div>
      </div>

      {/* KPI Highlight */}
      <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">{dimension.kpi.label}</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">{dimension.kpi.value}</span>
            {dimension.kpi.change && (
              <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                <TrendIcon className="w-3 h-3" />
                <span>{dimension.kpi.change}</span>
              </div>
            )}
          </div>
        </div>
        {dimension.percentile && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Percentil</span>
              <span>P{dimension.percentile}</span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#6D84E3] rounded-full"
                style={{ width: `${dimension.percentile}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Findings */}
      <div className="p-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Hallazgos Clave
        </h4>
        <ul className="space-y-2">
          {findings.slice(0, 3).map((finding, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <ChevronRight className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                finding.type === 'critical' ? 'text-red-500' :
                finding.type === 'warning' ? 'text-amber-500' :
                'text-[#6D84E3]'
              }`} />
              <span className="text-slate-700">{finding.text}</span>
            </li>
          ))}
          {findings.length === 0 && (
            <li className="text-sm text-slate-400 italic">Sin hallazgos destacados</li>
          )}
        </ul>
      </div>

      {/* Recommendations Preview */}
      {recommendations.length > 0 && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-[#6D84E3]/5 rounded-lg border border-[#6D84E3]/20">
            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold text-[#6D84E3]">Recomendación:</span>
              <span className="text-xs text-slate-600">{recommendations[0].text}</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Benchmark Comparison Table
function BenchmarkTable({ benchmarkData }: { benchmarkData: AnalysisData['benchmarkData'] }) {
  const getPercentileColor = (percentile: number) => {
    if (percentile >= 75) return 'text-emerald-600';
    if (percentile >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="font-semibold text-slate-800">Benchmark vs Industria</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-2 text-left font-medium">KPI</th>
              <th className="px-4 py-2 text-right font-medium">Actual</th>
              <th className="px-4 py-2 text-right font-medium">Industria</th>
              <th className="px-4 py-2 text-right font-medium">Percentil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {benchmarkData.map((item) => (
              <tr key={item.kpi} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-700 font-medium">{item.kpi}</td>
                <td className="px-4 py-3 text-sm text-slate-800 text-right font-semibold">
                  {item.userDisplay}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500 text-right">
                  {item.industryDisplay}
                </td>
                <td className={`px-4 py-3 text-sm text-right font-medium ${getPercentileColor(item.percentile)}`}>
                  P{item.percentile}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DimensionAnalysisTab({ data }: DimensionAnalysisTabProps) {
  // Filter out agentic_readiness (has its own tab)
  const coreDimensions = data.dimensions.filter(d => d.name !== 'agentic_readiness');

  // Group findings and recommendations by dimension
  const getFindingsForDimension = (dimensionId: string) =>
    data.findings.filter(f => f.dimensionId === dimensionId);

  const getRecommendationsForDimension = (dimensionId: string) =>
    data.recommendations.filter(r => r.dimensionId === dimensionId);

  return (
    <div className="space-y-6">
      {/* Dimensions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {coreDimensions.map((dimension, idx) => (
          <DimensionCard
            key={dimension.id}
            dimension={dimension}
            findings={getFindingsForDimension(dimension.id)}
            recommendations={getRecommendationsForDimension(dimension.id)}
            delay={idx * 0.1}
          />
        ))}
      </div>

      {/* Benchmark Table */}
      <BenchmarkTable benchmarkData={data.benchmarkData} />
    </div>
  );
}

export default DimensionAnalysisTab;
