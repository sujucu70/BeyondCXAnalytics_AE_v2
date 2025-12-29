import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Zap, Clock, DollarSign, Target } from 'lucide-react';
import BadgePill from './BadgePill';

export interface Opportunity {
  rank: number;
  skill: string;
  volume: number;
  currentMetric: string;
  currentValue: number;
  benchmarkValue: number;
  potentialSavings: number;
  difficulty: 'low' | 'medium' | 'high';
  timeline: string;
  actions: string[];
}

interface TopOpportunitiesCardProps {
  opportunities: Opportunity[];
}

const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case 'low':
      return 'bg-green-100 text-green-700';
    case 'medium':
      return 'bg-amber-100 text-amber-700';
    case 'high':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const getDifficultyLabel = (difficulty: string): string => {
  switch (difficulty) {
    case 'low':
      return '🟢 Baja';
    case 'medium':
      return '🟡 Media';
    case 'high':
      return '🔴 Alta';
    default:
      return 'Desconocida';
  }
};

export const TopOpportunitiesCard: React.FC<TopOpportunitiesCardProps> = ({ opportunities }) => {
  if (!opportunities || opportunities.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-8">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp size={28} className="text-amber-600" />
        <h3 className="text-2xl font-bold text-amber-900">
          Top Oportunidades de Mejora
        </h3>
        <span className="ml-auto px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-sm font-semibold">
          Ordenadas por ROI
        </span>
      </div>

      <div className="space-y-6">
        {opportunities.map((opp, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.15 }}
            className="bg-white rounded-lg p-6 border border-amber-100 hover:shadow-lg transition-shadow"
          >
            {/* Header with Rank */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-bold text-lg">
                  {opp.rank}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{opp.skill}</h4>
                  <p className="text-sm text-slate-600">
                    Volumen: {opp.volume.toLocaleString()} calls/mes
                  </p>
                </div>
              </div>
              <BadgePill
                label={opp.currentMetric}
                type="warning"
                size="md"
              />
            </div>

            {/* Metrics Analysis */}
            <div className="bg-slate-50 rounded-lg p-4 mb-4 border-l-4 border-amber-400">
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-xs text-slate-600 font-semibold uppercase mb-1">
                    Estado Actual
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {opp.currentValue}{opp.currentMetric.includes('AHT') ? 's' : '%'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-600 font-semibold uppercase mb-1">
                    Benchmark P50
                  </p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {opp.benchmarkValue}{opp.currentMetric.includes('AHT') ? 's' : '%'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-600 font-semibold uppercase mb-1">
                    Brecha
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {Math.abs(opp.currentValue - opp.benchmarkValue)}{opp.currentMetric.includes('AHT') ? 's' : '%'}
                  </p>
                </div>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-amber-400 to-amber-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(
                      (opp.currentValue / (opp.currentValue + opp.benchmarkValue)) * 100,
                      95
                    )}%`
                  }}
                />
              </div>
            </div>

            {/* Impact Calculation */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-start gap-2">
                <DollarSign size={18} className="text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-600 font-semibold">Ahorro Potencial Anual</p>
                  <p className="text-lg font-bold text-green-700">
                    €{(opp.potentialSavings / 1000).toFixed(1)}K
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Si mejoras al benchmark P50
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock size={18} className="text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-600 font-semibold">Timeline Estimado</p>
                  <p className="text-lg font-bold text-blue-700">{opp.timeline}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Dificultad:{' '}
                    <span className={`font-semibold ${getDifficultyColor(opp.difficulty)}`}>
                      {getDifficultyLabel(opp.difficulty)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Recommended Actions */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-900 mb-2">
                <Zap size={16} className="inline mr-1" />
                Acciones Recomendadas:
              </p>
              <ul className="space-y-1">
                {opp.actions.map((action, idx) => (
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-0.5">☐</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-2 px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-amber-700 transition-colors flex items-center justify-center gap-2"
            >
              <Target size={16} />
              Explorar Detalles de Implementación
            </motion.button>
          </motion.div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="mt-6 p-4 bg-amber-100 rounded-lg border border-amber-300">
        <p className="text-sm text-amber-900">
          <span className="font-semibold">ROI Total Combinado:</span>{' '}
          €{opportunities.reduce((sum, opp) => sum + opp.potentialSavings, 0) / 1000000 > 0
            ? (opportunities.reduce((sum, opp) => sum + opp.potentialSavings, 0) / 1000).toFixed(0)
            : '0'}K/año
          {' '} | Tiempo promedio implementación:{' '}
          {Math.round(opportunities.reduce((sum, opp) => {
            const months = parseInt(opp.timeline) || 2;
            return sum + months;
          }, 0) / opportunities.length)} meses
        </p>
      </div>
    </div>
  );
};

export default TopOpportunitiesCard;
