import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, Activity, Clock, PhoneForwarded, Users } from 'lucide-react';
import type { AnalysisData, Finding } from '../../types';

interface ExecutiveSummaryTabProps {
  data: AnalysisData;
}

// Compact KPI Row Component
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
  const formatNumber = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

  const getAHTStatus = (aht: number) => {
    if (aht <= 300) return { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Excelente' };
    if (aht <= 420) return { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Bueno' };
    if (aht <= 480) return { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Aceptable' };
    return { color: 'text-red-600', bg: 'bg-red-50', label: 'Alto' };
  };

  const getFCRStatus = (fcr: number) => {
    if (fcr >= 85) return { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Excelente' };
    if (fcr >= 75) return { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Bueno' };
    if (fcr >= 65) return { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Mejorable' };
    return { color: 'text-red-600', bg: 'bg-red-50', label: 'Crítico' };
  };

  const ahtStatus = getAHTStatus(avgAHT);
  const fcrStatus = getFCRStatus(avgFCR);

  const metrics = [
    {
      icon: Users,
      label: 'Interacciones',
      value: formatNumber(totalInteractions),
      sublabel: 'mensuales',
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
      status: avgTransferRate > 20
        ? { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Alto' }
        : { color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'OK' }
    }
  ];

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-[#6D84E3]" />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{metric.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-800">{metric.value}</span>
                {metric.status && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${metric.status.bg} ${metric.status.color}`}>
                    {metric.status.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">{metric.sublabel}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Health Score with Breakdown
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
  avgCSAT: number;
}) {
  const getColor = (s: number) => {
    if (s >= 80) return '#059669';
    if (s >= 60) return '#D97706';
    return '#DC2626';
  };

  const getLabel = (s: number) => {
    if (s >= 80) return 'Excelente';
    if (s >= 60) return 'Bueno';
    if (s >= 40) return 'Regular';
    return 'Crítico';
  };

  const color = getColor(score);
  const circumference = 2 * Math.PI * 40;
  const strokeDasharray = `${(score / 100) * circumference} ${circumference}`;

  // Calculate individual factor scores (0-100)
  const fcrScore = Math.min(100, Math.round((avgFCR / 85) * 100));
  const ahtScore = Math.min(100, Math.round(Math.max(0, (1 - (avgAHT - 240) / 360) * 100)));
  const transferScore = Math.min(100, Math.round(Math.max(0, (1 - avgTransferRate / 30) * 100)));
  const csatScore = avgCSAT;

  const factors = [
    {
      name: 'FCR',
      score: fcrScore,
      weight: '30%',
      status: fcrScore >= 80 ? 'good' : fcrScore >= 60 ? 'warning' : 'critical',
      insight: fcrScore >= 80 ? 'Óptimo' : fcrScore >= 60 ? 'Mejorable' : 'Requiere acción'
    },
    {
      name: 'Eficiencia (AHT)',
      score: ahtScore,
      weight: '25%',
      status: ahtScore >= 80 ? 'good' : ahtScore >= 60 ? 'warning' : 'critical',
      insight: ahtScore >= 80 ? 'Óptimo' : ahtScore >= 60 ? 'En rango' : 'Muy alto'
    },
    {
      name: 'Transferencias',
      score: transferScore,
      weight: '25%',
      status: transferScore >= 80 ? 'good' : transferScore >= 60 ? 'warning' : 'critical',
      insight: transferScore >= 80 ? 'Bajo' : transferScore >= 60 ? 'Moderado' : 'Excesivo'
    },
    {
      name: 'CSAT',
      score: csatScore,
      weight: '20%',
      status: csatScore >= 80 ? 'good' : csatScore >= 60 ? 'warning' : 'critical',
      insight: csatScore >= 80 ? 'Óptimo' : csatScore >= 60 ? 'Aceptable' : 'Bajo'
    }
  ];

  const statusColors = {
    good: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500'
  };

  const getMainInsight = () => {
    const weakest = factors.reduce((min, f) => f.score < min.score ? f : min, factors[0]);
    const strongest = factors.reduce((max, f) => f.score > max.score ? f : max, factors[0]);

    if (score >= 80) {
      return `Rendimiento destacado en ${strongest.name}. Mantener estándares actuales.`;
    } else if (score >= 60) {
      return `Oportunidad de mejora en ${weakest.name} (${weakest.insight.toLowerCase()}).`;
    } else {
      return `Priorizar mejora en ${weakest.name}: impacto directo en satisfacción del cliente.`;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <div className="flex items-start gap-5">
        {/* Gauge */}
        <div className="flex-shrink-0">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#E2E8F0" strokeWidth="8" />
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
          <p className="text-center text-sm font-semibold mt-1" style={{ color }}>{getLabel(score)}</p>
        </div>

        {/* Breakdown */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 mb-3">Health Score - Desglose</h3>

          <div className="space-y-2.5">
            {factors.map((factor) => (
              <div key={factor.name} className="flex items-center gap-3">
                <div className="w-24 text-xs text-slate-600 truncate">{factor.name}</div>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${statusColors[factor.status]}`}
                    style={{ width: `${factor.score}%` }}
                  />
                </div>
                <div className="w-10 text-xs text-slate-500 text-right">{factor.score}</div>
                <div className={`w-16 text-xs ${
                  factor.status === 'good' ? 'text-emerald-600' :
                  factor.status === 'warning' ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {factor.insight}
                </div>
              </div>
            ))}
          </div>

          {/* Key Insight */}
          <div className="mt-4 p-2.5 bg-slate-50 rounded-lg border-l-3 border-[#6D84E3]">
            <p className="text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Insight: </span>
              {getMainInsight()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Top Opportunities Component
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

// Economic Summary Compact
function EconomicSummary({ economicModel }: { economicModel: AnalysisData['economicModel'] }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <h3 className="font-semibold text-slate-800 mb-3">Impacto Económico</h3>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-2.5 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500">Coste Anual</p>
          <p className="text-lg font-bold text-slate-800">€{(economicModel.currentAnnualCost / 1000).toFixed(0)}K</p>
        </div>
        <div className="p-2.5 bg-emerald-50 rounded-lg">
          <p className="text-xs text-emerald-600">Ahorro Potencial</p>
          <p className="text-lg font-bold text-emerald-700">€{(economicModel.annualSavings / 1000).toFixed(0)}K</p>
        </div>
      </div>

      <div className="flex items-center justify-between p-2.5 bg-[#6D84E3]/10 rounded-lg">
        <div>
          <p className="text-xs text-[#6D84E3]">ROI 3 años</p>
          <p className="text-lg font-bold text-[#6D84E3]">{economicModel.roi3yr}%</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Payback</p>
          <p className="text-lg font-bold text-slate-700">{economicModel.paybackMonths}m</p>
        </div>
      </div>
    </div>
  );
}

export function ExecutiveSummaryTab({ data }: ExecutiveSummaryTabProps) {
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
  const avgCSAT = data.heatmapData.length > 0
    ? Math.round(data.heatmapData.reduce((sum, h) => sum + h.metrics.csat, 0) / data.heatmapData.length)
    : 0;

  const ahtBenchmark = data.benchmarkData.find(b => b.kpi.toLowerCase().includes('aht'));
  const fcrBenchmark = data.benchmarkData.find(b => b.kpi.toLowerCase().includes('fcr'));

  return (
    <div className="space-y-4">
      {/* Key Metrics Bar */}
      <KeyMetricsCard
        totalInteractions={totalInteractions}
        avgAHT={avgAHT}
        avgFCR={avgFCR}
        avgTransferRate={avgTransferRate}
        ahtBenchmark={ahtBenchmark?.industryValue}
        fcrBenchmark={fcrBenchmark?.industryValue}
      />

      {/* Health Score with Breakdown */}
      <HealthScoreDetailed
        score={data.overallHealthScore}
        avgFCR={avgFCR}
        avgAHT={avgAHT}
        avgTransferRate={avgTransferRate}
        avgCSAT={avgCSAT}
      />

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopOpportunities
          findings={data.findings}
          opportunities={data.opportunities}
        />
        <EconomicSummary economicModel={data.economicModel} />
      </div>
    </div>
  );
}

export default ExecutiveSummaryTab;
