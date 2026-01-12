import {
  ComposedChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList
} from 'recharts';

export interface WaterfallDataPoint {
  label: string;
  value: number;
  cumulative: number;
  type: 'initial' | 'increase' | 'decrease' | 'total';
}

export interface WaterfallChartProps {
  data: WaterfallDataPoint[];
  title?: string;
  height?: number;
  formatValue?: (value: number) => string;
}

interface ProcessedDataPoint {
  label: string;
  value: number;
  cumulative: number;
  type: 'initial' | 'increase' | 'decrease' | 'total';
  start: number;
  end: number;
  displayValue: number;
}

export function WaterfallChart({
  data,
  title,
  height = 300,
  formatValue = (v) => `€${Math.abs(v).toLocaleString()}`
}: WaterfallChartProps) {
  // Process data for waterfall visualization
  const processedData: ProcessedDataPoint[] = data.map((item) => {
    let start: number;
    let end: number;

    if (item.type === 'initial' || item.type === 'total') {
      start = 0;
      end = item.cumulative;
    } else if (item.type === 'decrease') {
      // Savings: bar goes down from previous cumulative
      start = item.cumulative;
      end = item.cumulative - item.value;
    } else {
      // Increase: bar goes up from previous cumulative
      start = item.cumulative - item.value;
      end = item.cumulative;
    }

    return {
      ...item,
      start: Math.min(start, end),
      end: Math.max(start, end),
      displayValue: Math.abs(item.value)
    };
  });

  const getBarColor = (type: string): string => {
    switch (type) {
      case 'initial':
        return '#64748B'; // slate-500
      case 'decrease':
        return '#059669'; // emerald-600 (savings)
      case 'increase':
        return '#DC2626'; // red-600 (costs)
      case 'total':
        return '#6D84E3'; // primary blue
      default:
        return '#94A3B8';
    }
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ProcessedDataPoint }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white px-3 py-2 shadow-lg rounded-lg border border-slate-200">
          <p className="font-medium text-slate-800">{data.label}</p>
          <p className={`text-sm ${
            data.type === 'decrease' ? 'text-emerald-600' :
            data.type === 'increase' ? 'text-red-600' :
            'text-slate-600'
          }`}>
            {data.type === 'decrease' ? '-' : data.type === 'increase' ? '+' : ''}
            {formatValue(data.value)}
          </p>
          {data.type !== 'initial' && data.type !== 'total' && (
            <p className="text-xs text-slate-500">
              Acumulado: {formatValue(data.cumulative)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Find min/max for Y axis
  const allValues = processedData.flatMap(d => [d.start, d.end]);
  const minValue = Math.min(0, ...allValues);
  const maxValue = Math.max(...allValues);
  const padding = (maxValue - minValue) * 0.1;

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      {title && (
        <h3 className="font-semibold text-slate-800 mb-4">{title}</h3>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={processedData}
          margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E2E8F0"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#64748B' }}
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
          />
          <YAxis
            domain={[minValue - padding, maxValue + padding]}
            tick={{ fontSize: 11, fill: '#64748B' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#94A3B8" strokeWidth={1} />

          {/* Invisible bar for spacing (from 0 to start) */}
          <Bar dataKey="start" stackId="waterfall" fill="transparent" />

          {/* Visible bar (the actual segment) */}
          <Bar
            dataKey="displayValue"
            stackId="waterfall"
            radius={[4, 4, 0, 0]}
          >
            {processedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.type)} />
            ))}
            <LabelList
              dataKey="displayValue"
              position="top"
              formatter={(value: number) => formatValue(value)}
              style={{ fontSize: 10, fill: '#475569' }}
            />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-slate-500" />
          <span className="text-slate-600">Coste Base</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-600" />
          <span className="text-slate-600">Ahorro</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-600" />
          <span className="text-slate-600">Inversión</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#6D84E3]" />
          <span className="text-slate-600">Total</span>
        </div>
      </div>
    </div>
  );
}

export default WaterfallChart;
