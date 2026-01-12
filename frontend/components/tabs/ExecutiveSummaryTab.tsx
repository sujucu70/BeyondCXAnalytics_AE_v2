import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Target } from 'lucide-react';
import { BulletChart } from '../charts/BulletChart';
import type { AnalysisData, Finding } from '../../types';

interface ExecutiveSummaryTabProps {
  data: AnalysisData;
}

// Health Score Gauge Component
function HealthScoreGauge({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return '#059669'; // emerald-600
    if (s >= 60) return '#D97706'; // amber-600
    return '#DC2626'; // red-600
  };

  const getLabel = (s: number) => {
    if (s >= 80) return 'Excelente';
    if (s >= 60) return 'Bueno';
    if (s >= 40) return 'Regular';
    return 'Crítico';
  };

  const color = getColor(score);
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = `${(score / 100) * circumference} ${circumference}`;

  return (
    <div className="bg-white rounded-lg p-6 border border-slate-200">
      <h3 className="font-semibold text-slate-800 mb-4 text-center">Health Score General</h3>
      <div className="relative w-32 h-32 mx-auto">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>{score}</span>
          <span className="text-xs text-slate-500">/100</span>
        </div>
      </div>
      <p className="text-center mt-3 text-sm font-medium" style={{ color }}>{getLabel(score)}</p>
    </div>
  );
}

// KPI Card Component
function KpiCard({ label, value, change, changeType }: {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}) {
  const ChangeIcon = changeType === 'positive' ? TrendingUp :
                     changeType === 'negative' ? TrendingDown : Minus;

  const changeColor = changeType === 'positive' ? 'text-emerald-600' :
                      changeType === 'negative' ? 'text-red-600' : 'text-slate-500';

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {change && (
        <div className={`flex items-center gap-1 mt-1 text-sm ${changeColor}`}>
          <ChangeIcon className="w-4 h-4" />
          <span>{change}</span>
        </div>
      )}
    </div>
  );
}

// Top Opportunities Component (McKinsey style)
function TopOpportunities({ findings, opportunities }: {
  findings: Finding[];
  opportunities: { name: string; impact: number; savings: number }[];
}) {
  // Combine critical findings and high-impact opportunities
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

  // Fill with opportunities if not enough findings
  if (items.length < 3) {
    const remaining = 3 - items.length;
    opportunities
      .sort((a, b) => b.savings - a.savings)
      .slice(0, remaining)
      .forEach((opp, i) => {
        items.push({
          rank: items.length + 1,
          title: opp.name,
          metric: `€${opp.savings.toLocaleString()} ahorro potencial`,
          action: 'Implementar',
          type: 'info' as const
        });
      });
  }

  const getIcon = (type: string) => {
    if (type === 'critical') return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (type === 'warning') return <Target className="w-5 h-5 text-amber-500" />;
    return <CheckCircle className="w-5 h-5 text-emerald-500" />;
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <h3 className="font-semibold text-slate-800 mb-4">Top 3 Oportunidades</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.rank} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-700">
              {item.rank}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {getIcon(item.type)}
                <span className="font-medium text-slate-800">{item.title}</span>
              </div>
              {item.metric && (
                <p className="text-sm text-slate-500 mt-0.5">{item.metric}</p>
              )}
              <p className="text-sm text-[#6D84E3] mt-1 font-medium">
                → {item.action}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExecutiveSummaryTab({ data }: ExecutiveSummaryTabProps) {
  // Extract key KPIs for bullet charts
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

  // Find benchmark data
  const ahtBenchmark = data.benchmarkData.find(b => b.kpi.toLowerCase().includes('aht'));
  const fcrBenchmark = data.benchmarkData.find(b => b.kpi.toLowerCase().includes('fcr'));

  return (
    <div className="space-y-6">
      {/* Main Grid: KPIs + Health Score */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Summary KPIs */}
        {data.summaryKpis.slice(0, 3).map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            change={kpi.change}
            changeType={kpi.changeType}
          />
        ))}

        {/* Health Score Gauge */}
        <HealthScoreGauge score={data.overallHealthScore} />
      </div>

      {/* Bullet Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BulletChart
          label="Total Interacciones"
          actual={totalInteractions}
          target={totalInteractions * 1.1}
          ranges={[totalInteractions * 0.7, totalInteractions * 0.9, totalInteractions * 1.3]}
          formatValue={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toString()}
        />

        <BulletChart
          label="AHT"
          actual={avgAHT}
          target={ahtBenchmark?.industryValue || 360}
          ranges={[480, 420, 600]} // >480s poor, 420-480 ok, <420 good
          unit="s"
          percentile={ahtBenchmark?.percentile}
          inverse={true}
          formatValue={(v) => v.toString()}
        />

        <BulletChart
          label="FCR"
          actual={avgFCR}
          target={fcrBenchmark?.industryValue || 75}
          ranges={[65, 75, 100]} // <65 poor, 65-75 ok, >75 good
          unit="%"
          percentile={fcrBenchmark?.percentile}
          formatValue={(v) => v.toString()}
        />

        <BulletChart
          label="Tasa Transferencia"
          actual={avgTransferRate}
          target={15}
          ranges={[25, 15, 40]} // >25% poor, 15-25 ok, <15 good
          unit="%"
          inverse={true}
          formatValue={(v) => v.toString()}
        />
      </div>

      {/* Bottom Row: Top Opportunities + Economic Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopOpportunities
          findings={data.findings}
          opportunities={data.opportunities}
        />

        {/* Economic Impact Summary */}
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">Impacto Económico</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Coste Anual Actual</p>
              <p className="text-xl font-bold text-slate-800">
                €{data.economicModel.currentAnnualCost.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <p className="text-sm text-emerald-600">Ahorro Potencial</p>
              <p className="text-xl font-bold text-emerald-700">
                €{data.economicModel.annualSavings.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Inversión Inicial</p>
              <p className="text-xl font-bold text-slate-800">
                €{data.economicModel.initialInvestment.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-[#6D84E3]/10 rounded-lg">
              <p className="text-sm text-[#6D84E3]">ROI a 3 Años</p>
              <p className="text-xl font-bold text-[#6D84E3]">
                {data.economicModel.roi3yr}%
              </p>
            </div>
          </div>

          {/* Payback indicator */}
          <div className="mt-4 p-3 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-emerald-700">Payback</span>
              <span className="font-bold text-emerald-800">
                {data.economicModel.paybackMonths} meses
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExecutiveSummaryTab;
