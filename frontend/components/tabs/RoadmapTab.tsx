import { motion } from 'framer-motion';
import { Zap, Clock, DollarSign, TrendingUp, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { WaterfallChart, WaterfallDataPoint } from '../charts/WaterfallChart';
import type { AnalysisData, RoadmapInitiative, RoadmapPhase } from '../../types';

interface RoadmapTabProps {
  data: AnalysisData;
}

// Quick Wins Section
function QuickWins({ initiatives, economicModel }: {
  initiatives: RoadmapInitiative[];
  economicModel: AnalysisData['economicModel'];
}) {
  // Filter for quick wins (low investment, quick timeline)
  const quickWins = initiatives
    .filter(i => i.phase === RoadmapPhase.Automate || i.risk === 'low')
    .slice(0, 3);

  if (quickWins.length === 0) {
    // Create synthetic quick wins from savings breakdown
    const topSavings = economicModel.savingsBreakdown.slice(0, 3);
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-emerald-800">Quick Wins Identificados</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {topSavings.map((saving, idx) => (
            <div key={idx} className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700">{saving.category}</span>
              </div>
              <p className="text-lg font-bold text-emerald-600">
                €{saving.amount.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">{saving.percentage}% del ahorro total</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-emerald-600" />
        <h3 className="font-semibold text-emerald-800">Quick Wins</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {quickWins.map((initiative) => (
          <div key={initiative.id} className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-slate-700">{initiative.name}</span>
            </div>
            <p className="text-xs text-slate-500 mb-1">{initiative.timeline}</p>
            <p className="text-sm font-semibold text-emerald-600">
              €{initiative.investment.toLocaleString()} inversión
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Initiative Card
function InitiativeCard({ initiative, delay = 0 }: { initiative: RoadmapInitiative; delay?: number }) {
  const phaseColors = {
    [RoadmapPhase.Automate]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    [RoadmapPhase.Assist]: 'bg-[#6D84E3]/20 text-[#6D84E3] border-[#6D84E3]/30',
    [RoadmapPhase.Augment]: 'bg-amber-100 text-amber-700 border-amber-200'
  };

  const riskColors = {
    low: 'text-emerald-600',
    medium: 'text-amber-600',
    high: 'text-red-600'
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      className="bg-white rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-slate-800">{initiative.name}</h4>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium border ${phaseColors[initiative.phase]}`}>
            {initiative.phase}
          </span>
        </div>
        {initiative.risk && (
          <div className={`flex items-center gap-1 text-xs ${riskColors[initiative.risk]}`}>
            <AlertTriangle className="w-3 h-3" />
            Riesgo {initiative.risk === 'low' ? 'Bajo' : initiative.risk === 'medium' ? 'Medio' : 'Alto'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Clock className="w-4 h-4 text-slate-400" />
          {initiative.timeline}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <DollarSign className="w-4 h-4 text-slate-400" />
          €{initiative.investment.toLocaleString()}
        </div>
      </div>

      {initiative.resources.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {initiative.resources.slice(0, 3).map((resource, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
              {resource}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Business Case Summary
function BusinessCaseSummary({ economicModel }: { economicModel: AnalysisData['economicModel'] }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-[#6D84E3]" />
        Business Case Consolidado
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500 mb-1">Inversión Total</p>
          <p className="text-xl font-bold text-slate-800">
            €{economicModel.initialInvestment.toLocaleString()}
          </p>
        </div>
        <div className="text-center p-3 bg-emerald-50 rounded-lg">
          <p className="text-xs text-emerald-600 mb-1">Ahorro Anual</p>
          <p className="text-xl font-bold text-emerald-700">
            €{economicModel.annualSavings.toLocaleString()}
          </p>
        </div>
        <div className="text-center p-3 bg-[#6D84E3]/10 rounded-lg">
          <p className="text-xs text-[#6D84E3] mb-1">Payback</p>
          <p className="text-xl font-bold text-[#6D84E3]">
            {economicModel.paybackMonths} meses
          </p>
        </div>
        <div className="text-center p-3 bg-amber-50 rounded-lg">
          <p className="text-xs text-amber-600 mb-1">ROI 3 Años</p>
          <p className="text-xl font-bold text-amber-700">
            {economicModel.roi3yr}%
          </p>
        </div>
      </div>

      {/* Savings Breakdown */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Desglose de Ahorros:</p>
        {economicModel.savingsBreakdown.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">{item.category}</span>
                <span className="font-medium text-slate-800">€{item.amount.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-slate-500 w-10 text-right">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Timeline Visual
function TimelineVisual({ initiatives }: { initiatives: RoadmapInitiative[] }) {
  const phases = [
    { phase: RoadmapPhase.Automate, label: 'Wave 1: Automatizar', color: 'bg-emerald-500' },
    { phase: RoadmapPhase.Assist, label: 'Wave 2: Asistir', color: 'bg-[#6D84E3]' },
    { phase: RoadmapPhase.Augment, label: 'Wave 3: Aumentar', color: 'bg-amber-500' }
  ];

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <h3 className="font-semibold text-slate-800 mb-4">Timeline de Implementación</h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute top-6 left-4 right-4 h-1 bg-slate-200 rounded-full" />

        {/* Phases */}
        <div className="flex justify-between relative">
          {phases.map((phase, idx) => {
            const phaseInitiatives = initiatives.filter(i => i.phase === phase.phase);
            return (
              <div key={phase.phase} className="flex flex-col items-center" style={{ width: '30%' }}>
                {/* Circle */}
                <div className={`w-12 h-12 rounded-full ${phase.color} flex items-center justify-center text-white font-bold text-lg z-10`}>
                  {idx + 1}
                </div>
                {/* Label */}
                <p className="text-sm font-medium text-slate-700 mt-2 text-center">{phase.label}</p>
                {/* Count */}
                <p className="text-xs text-slate-500">
                  {phaseInitiatives.length} iniciativa{phaseInitiatives.length !== 1 ? 's' : ''}
                </p>
              </div>
            );
          })}
        </div>

        {/* Arrows */}
        <div className="flex justify-center gap-4 mt-4">
          <ArrowRight className="w-5 h-5 text-slate-400" />
          <ArrowRight className="w-5 h-5 text-slate-400" />
        </div>
      </div>
    </div>
  );
}

export function RoadmapTab({ data }: RoadmapTabProps) {
  // Generate waterfall data from economic model
  const waterfallData: WaterfallDataPoint[] = [
    {
      label: 'Coste Actual',
      value: data.economicModel.currentAnnualCost,
      cumulative: data.economicModel.currentAnnualCost,
      type: 'initial'
    },
    {
      label: 'Inversión Inicial',
      value: data.economicModel.initialInvestment,
      cumulative: data.economicModel.currentAnnualCost + data.economicModel.initialInvestment,
      type: 'increase'
    },
    ...data.economicModel.savingsBreakdown.map((saving, idx) => ({
      label: saving.category,
      value: saving.amount,
      cumulative: data.economicModel.currentAnnualCost + data.economicModel.initialInvestment -
        data.economicModel.savingsBreakdown.slice(0, idx + 1).reduce((sum, s) => sum + s.amount, 0),
      type: 'decrease' as const
    })),
    {
      label: 'Coste Futuro',
      value: data.economicModel.futureAnnualCost,
      cumulative: data.economicModel.futureAnnualCost,
      type: 'total'
    }
  ];

  // Group initiatives by phase
  const automateInitiatives = data.roadmap.filter(i => i.phase === RoadmapPhase.Automate);
  const assistInitiatives = data.roadmap.filter(i => i.phase === RoadmapPhase.Assist);
  const augmentInitiatives = data.roadmap.filter(i => i.phase === RoadmapPhase.Augment);

  return (
    <div className="space-y-6">
      {/* Quick Wins */}
      <QuickWins initiatives={data.roadmap} economicModel={data.economicModel} />

      {/* Timeline Visual */}
      <TimelineVisual initiatives={data.roadmap} />

      {/* Waterfall Chart */}
      <WaterfallChart
        data={waterfallData}
        title="Impacto Económico: De Coste Actual a Futuro"
        height={350}
      />

      {/* Initiatives by Phase */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wave 1: Automate */}
        <div>
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            Wave 1: Automatizar
          </h3>
          <div className="space-y-3">
            {automateInitiatives.length > 0 ? (
              automateInitiatives.map((init, idx) => (
                <InitiativeCard key={init.id} initiative={init} delay={idx * 0.1} />
              ))
            ) : (
              <p className="text-sm text-slate-500 italic p-3 bg-slate-50 rounded-lg">
                Sin iniciativas en esta fase
              </p>
            )}
          </div>
        </div>

        {/* Wave 2: Assist */}
        <div>
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#6D84E3]" />
            Wave 2: Asistir
          </h3>
          <div className="space-y-3">
            {assistInitiatives.length > 0 ? (
              assistInitiatives.map((init, idx) => (
                <InitiativeCard key={init.id} initiative={init} delay={idx * 0.1} />
              ))
            ) : (
              <p className="text-sm text-slate-500 italic p-3 bg-slate-50 rounded-lg">
                Sin iniciativas en esta fase
              </p>
            )}
          </div>
        </div>

        {/* Wave 3: Augment */}
        <div>
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            Wave 3: Aumentar
          </h3>
          <div className="space-y-3">
            {augmentInitiatives.length > 0 ? (
              augmentInitiatives.map((init, idx) => (
                <InitiativeCard key={init.id} initiative={init} delay={idx * 0.1} />
              ))
            ) : (
              <p className="text-sm text-slate-500 italic p-3 bg-slate-50 rounded-lg">
                Sin iniciativas en esta fase
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Business Case Summary */}
      <BusinessCaseSummary economicModel={data.economicModel} />
    </div>
  );
}

export default RoadmapTab;
