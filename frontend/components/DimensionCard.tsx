import React from 'react';
import { DimensionAnalysis } from '../types';
import { motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, TrendingUp, CheckCircle, Zap } from 'lucide-react';
import BadgePill from './BadgePill';

interface HealthStatus {
  level: 'critical' | 'low' | 'medium' | 'good' | 'excellent';
  label: string;
  color: string;
  textColor: string;
  bgColor: string;
  icon: React.ReactNode;
  description: string;
}

const getHealthStatus = (score: number): HealthStatus => {
  if (score >= 86) {
    return {
      level: 'excellent',
      label: 'EXCELENTE',
      color: 'text-cyan-700',
      textColor: 'text-cyan-700',
      bgColor: 'bg-cyan-50',
      icon: <CheckCircle size={20} className="text-cyan-600" />,
      description: 'Top quartile, modelo a seguir'
    };
  }
  if (score >= 71) {
    return {
      level: 'good',
      label: 'BUENO',
      color: 'text-emerald-700',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      icon: <TrendingUp size={20} className="text-emerald-600" />,
      description: 'Por encima de benchmarks, desempeño sólido'
    };
  }
  if (score >= 51) {
    return {
      level: 'medium',
      label: 'MEDIO',
      color: 'text-amber-700',
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50',
      icon: <AlertTriangle size={20} className="text-amber-600" />,
      description: 'Oportunidad de mejora identificada'
    };
  }
  if (score >= 31) {
    return {
      level: 'low',
      label: 'BAJO',
      color: 'text-orange-700',
      textColor: 'text-orange-700',
      bgColor: 'bg-orange-50',
      icon: <AlertTriangle size={20} className="text-orange-600" />,
      description: 'Requiere mejora, por debajo de benchmarks'
    };
  }
  return {
    level: 'critical',
    label: 'CRÍTICO',
    color: 'text-red-700',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    icon: <AlertCircle size={20} className="text-red-600" />,
    description: 'Requiere acción inmediata'
  };
};

const getProgressBarColor = (score: number): string => {
  if (score >= 86) return 'bg-cyan-500';
  if (score >= 71) return 'bg-emerald-500';
  if (score >= 51) return 'bg-amber-500';
  if (score >= 31) return 'bg-orange-500';
  return 'bg-red-500';
};

const ScoreIndicator: React.FC<{ score: number; benchmark?: number }> = ({ score, benchmark }) => {
  const healthStatus = getHealthStatus(score);

  return (
    <div className="space-y-3">
      {/* Main Score Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-slate-900">{score}</span>
          <span className="text-lg text-slate-500">/100</span>
        </div>
        <BadgePill
          label={healthStatus.label}
          type={healthStatus.level === 'critical' ? 'critical' : healthStatus.level === 'low' ? 'warning' : 'info'}
          size="md"
        />
      </div>

      {/* Progress Bar with Scale Reference */}
      <div>
        <div className="w-full bg-slate-200 rounded-full h-3">
          <div
            className={`${getProgressBarColor(score)} h-3 rounded-full transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Scale Reference */}
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>

      {/* Benchmark Comparison */}
      {benchmark !== undefined && (
        <div className="bg-slate-50 rounded-lg p-3 text-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600">Benchmark Industria (P50)</span>
            <span className="font-bold text-slate-900">{benchmark}/100</span>
          </div>
          <div className="text-xs text-slate-500">
            {score > benchmark ? (
              <span className="text-emerald-600 font-semibold">
                ↑ {score - benchmark} puntos por encima del promedio
              </span>
            ) : score === benchmark ? (
              <span className="text-amber-600 font-semibold">
                = Alineado con promedio de industria
              </span>
            ) : (
              <span className="text-orange-600 font-semibold">
                ↓ {benchmark - score} puntos por debajo del promedio
              </span>
            )}
          </div>
        </div>
      )}

      {/* Health Status Description */}
      <div className={`${healthStatus.bgColor} rounded-lg p-3 flex items-start gap-2`}>
        {healthStatus.icon}
        <div>
          <p className={`text-sm font-semibold ${healthStatus.textColor}`}>
            {healthStatus.description}
          </p>
        </div>
      </div>
    </div>
  );
};

const DimensionCard: React.FC<{ dimension: DimensionAnalysis }> = ({ dimension }) => {
  const healthStatus = getHealthStatus(dimension.score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`${healthStatus.bgColor} p-6 rounded-lg border-2 flex flex-col hover:shadow-lg transition-shadow`}
      style={{
        borderColor: healthStatus.color.replace('text-', '') + '-200'
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-slate-900">{dimension.title}</h3>
          <p className="text-xs text-slate-500 mt-1">{dimension.name}</p>
        </div>
        {dimension.score >= 86 && (
          <span className="text-2xl">⭐</span>
        )}
      </div>

      {/* Score Indicator */}
      <div className="mb-5">
        <ScoreIndicator
          score={dimension.score}
          benchmark={dimension.percentile || 50}
        />
      </div>

      {/* Summary Description */}
      <p className="text-sm text-slate-700 flex-grow mb-4 leading-relaxed">
        {dimension.summary}
      </p>

      {/* KPI Display */}
      {dimension.kpi && (
        <div className="bg-white rounded-lg p-3 mb-4 border border-slate-200">
          <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
            {dimension.kpi.label}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-900">{dimension.kpi.value}</p>
            {dimension.kpi.change && (
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                dimension.kpi.changeType === 'positive'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {dimension.kpi.change}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`w-full py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
          dimension.score < 51
            ? 'bg-red-500 text-white hover:bg-red-600'
            : dimension.score < 71
            ? 'bg-amber-500 text-white hover:bg-amber-600'
            : 'bg-slate-300 text-slate-600 cursor-default'
        }`}
        disabled={dimension.score >= 71}
      >
        <Zap size={16} />
        {dimension.score < 51
          ? 'Ver Acciones Críticas'
          : dimension.score < 71
          ? 'Explorar Mejoras'
          : 'En buen estado'}
      </motion.button>
    </motion.div>
  );
};

export default DimensionCard;
