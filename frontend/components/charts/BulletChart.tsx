import { useMemo } from 'react';

export interface BulletChartProps {
  label: string;
  actual: number;
  target: number;
  ranges: [number, number, number]; // [poor, satisfactory, good/max]
  unit?: string;
  percentile?: number;
  inverse?: boolean; // true if lower is better (e.g., AHT)
  formatValue?: (value: number) => string;
}

export function BulletChart({
  label,
  actual,
  target,
  ranges,
  unit = '',
  percentile,
  inverse = false,
  formatValue = (v) => v.toLocaleString()
}: BulletChartProps) {
  const [poor, satisfactory, max] = ranges;

  const { actualPercent, targetPercent, rangePercents, performance } = useMemo(() => {
    const actualPct = Math.min((actual / max) * 100, 100);
    const targetPct = Math.min((target / max) * 100, 100);

    const poorPct = (poor / max) * 100;
    const satPct = (satisfactory / max) * 100;

    // Determine performance level
    let perf: 'poor' | 'satisfactory' | 'good';
    if (inverse) {
      // Lower is better (e.g., AHT, hold time)
      if (actual <= satisfactory) perf = 'good';
      else if (actual <= poor) perf = 'satisfactory';
      else perf = 'poor';
    } else {
      // Higher is better (e.g., FCR, CSAT)
      if (actual >= satisfactory) perf = 'good';
      else if (actual >= poor) perf = 'satisfactory';
      else perf = 'poor';
    }

    return {
      actualPercent: actualPct,
      targetPercent: targetPct,
      rangePercents: { poor: poorPct, satisfactory: satPct },
      performance: perf
    };
  }, [actual, target, ranges, inverse, poor, satisfactory, max]);

  const performanceColors = {
    poor: 'bg-red-500',
    satisfactory: 'bg-amber-500',
    good: 'bg-emerald-500'
  };

  const performanceLabels = {
    poor: 'Crítico',
    satisfactory: 'Aceptable',
    good: 'Óptimo'
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">{label}</span>
          {percentile !== undefined && (
            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
              P{percentile}
            </span>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          performance === 'good' ? 'bg-emerald-100 text-emerald-700' :
          performance === 'satisfactory' ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }`}>
          {performanceLabels[performance]}
        </span>
      </div>

      {/* Bullet Chart */}
      <div className="relative h-8 mb-2">
        {/* Background ranges */}
        <div className="absolute inset-0 flex rounded overflow-hidden">
          {inverse ? (
            // Inverse: green on left, red on right
            <>
              <div
                className="h-full bg-emerald-100"
                style={{ width: `${rangePercents.satisfactory}%` }}
              />
              <div
                className="h-full bg-amber-100"
                style={{ width: `${rangePercents.poor - rangePercents.satisfactory}%` }}
              />
              <div
                className="h-full bg-red-100"
                style={{ width: `${100 - rangePercents.poor}%` }}
              />
            </>
          ) : (
            // Normal: red on left, green on right
            <>
              <div
                className="h-full bg-red-100"
                style={{ width: `${rangePercents.poor}%` }}
              />
              <div
                className="h-full bg-amber-100"
                style={{ width: `${rangePercents.satisfactory - rangePercents.poor}%` }}
              />
              <div
                className="h-full bg-emerald-100"
                style={{ width: `${100 - rangePercents.satisfactory}%` }}
              />
            </>
          )}
        </div>

        {/* Actual value bar */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 h-4 rounded ${performanceColors[performance]}`}
          style={{ width: `${actualPercent}%`, minWidth: '4px' }}
        />

        {/* Target marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-800"
          style={{ left: `${targetPercent}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-800" />
        </div>
      </div>

      {/* Values */}
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="font-bold text-slate-800">{formatValue(actual)}</span>
          <span className="text-slate-500">{unit}</span>
          <span className="text-slate-400 ml-1">actual</span>
        </div>
        <div className="text-slate-500">
          <span className="text-slate-600">{formatValue(target)}</span>
          <span>{unit}</span>
          <span className="ml-1">benchmark</span>
        </div>
      </div>
    </div>
  );
}

export default BulletChart;
