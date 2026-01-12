import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

export type ReadinessCategory = 'automate_now' | 'assist_copilot' | 'optimize_first';

export interface TreemapData {
  name: string;
  value: number; // Savings potential (determines size)
  category: ReadinessCategory;
  skill: string;
  score: number; // Agentic readiness score 0-10
  volume?: number;
}

export interface OpportunityTreemapProps {
  data: TreemapData[];
  title?: string;
  height?: number;
  onItemClick?: (item: TreemapData) => void;
}

const CATEGORY_COLORS: Record<ReadinessCategory, string> = {
  automate_now: '#059669',    // emerald-600
  assist_copilot: '#6D84E3',  // primary blue
  optimize_first: '#D97706'   // amber-600
};

const CATEGORY_LABELS: Record<ReadinessCategory, string> = {
  automate_now: 'Automatizar Ahora',
  assist_copilot: 'Asistir con Copilot',
  optimize_first: 'Optimizar Primero'
};

interface TreemapContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  category: ReadinessCategory;
  score: number;
  value: number;
}

const CustomizedContent = ({
  x,
  y,
  width,
  height,
  name,
  category,
  score,
  value
}: TreemapContentProps) => {
  const showLabel = width > 60 && height > 40;
  const showScore = width > 80 && height > 55;
  const showValue = width > 100 && height > 70;

  const baseColor = CATEGORY_COLORS[category] || '#94A3B8';

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: baseColor,
          stroke: '#fff',
          strokeWidth: 2,
          opacity: 0.85 + (score / 10) * 0.15 // Higher score = more opaque
        }}
        rx={4}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showScore ? 8 : 0)}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: Math.min(12, width / 8),
            fontWeight: 600,
            fill: '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}
        >
          {name.length > 15 && width < 120 ? `${name.slice(0, 12)}...` : name}
        </text>
      )}
      {showScore && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: 10,
            fill: 'rgba(255,255,255,0.9)'
          }}
        >
          Score: {score.toFixed(1)}
        </text>
      )}
      {showValue && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 24}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: 9,
            fill: 'rgba(255,255,255,0.8)'
          }}
        >
          €{(value / 1000).toFixed(0)}K
        </text>
      )}
    </g>
  );
};

interface TooltipPayload {
  payload: TreemapData;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white px-3 py-2 shadow-lg rounded-lg border border-slate-200">
        <p className="font-semibold text-slate-800">{data.name}</p>
        <p className="text-xs text-slate-500 mb-2">{data.skill}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-slate-600">Readiness Score:</span>
            <span className="font-medium">{data.score.toFixed(1)}/10</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-600">Ahorro Potencial:</span>
            <span className="font-medium text-emerald-600">€{data.value.toLocaleString()}</span>
          </div>
          {data.volume && (
            <div className="flex justify-between gap-4">
              <span className="text-slate-600">Volumen:</span>
              <span className="font-medium">{data.volume.toLocaleString()}/mes</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-slate-600">Categoría:</span>
            <span
              className="font-medium"
              style={{ color: CATEGORY_COLORS[data.category] }}
            >
              {CATEGORY_LABELS[data.category]}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function OpportunityTreemap({
  data,
  title,
  height = 350,
  onItemClick
}: OpportunityTreemapProps) {
  // Group data by category for treemap
  const treemapData = data.map(item => ({
    ...item,
    size: item.value
  }));

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      {title && (
        <h3 className="font-semibold text-slate-800 mb-4">{title}</h3>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <Treemap
          data={treemapData}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="#fff"
          content={<CustomizedContent x={0} y={0} width={0} height={0} name="" category="automate_now" score={0} value={0} />}
          onClick={onItemClick ? (node) => onItemClick(node as unknown as TreemapData) : undefined}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs">
        {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
          <div key={category} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: color }}
            />
            <span className="text-slate-600">
              {CATEGORY_LABELS[category as ReadinessCategory]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OpportunityTreemap;
