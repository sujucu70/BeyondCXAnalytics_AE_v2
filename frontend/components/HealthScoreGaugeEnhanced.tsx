import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import CountUp from 'react-countup';

interface HealthScoreGaugeEnhancedProps {
  score: number;
  previousScore?: number;
  industryAverage?: number;
  animated?: boolean;
}

const HealthScoreGaugeEnhanced: React.FC<HealthScoreGaugeEnhancedProps> = ({
  score,
  previousScore,
  industryAverage = 65,
  animated = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const getScoreColor = (value: number): string => {
    if (value >= 80) return '#10b981'; // green
    if (value >= 60) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const getScoreLabel = (value: number): string => {
    if (value >= 80) return 'Excelente';
    if (value >= 60) return 'Bueno';
    if (value >= 40) return 'Regular';
    return 'Crítico';
  };

  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);
  
  const trend = previousScore ? score - previousScore : 0;
  const trendPercentage = previousScore ? ((trend / previousScore) * 100).toFixed(1) : '0';
  
  const vsIndustry = score - industryAverage;
  const vsIndustryPercentage = ((vsIndustry / industryAverage) * 100).toFixed(1);

  // Calculate SVG path for gauge
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="font-bold text-lg text-slate-800 mb-6">Health Score General</h3>
      
      {/* Gauge SVG */}
      <div className="relative flex items-center justify-center mb-6">
        <svg width="200" height="200" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke="#e2e8f0"
            strokeWidth="12"
            fill="none"
          />
          
          {/* Animated progress circle */}
          <motion.circle
            cx="100"
            cy="100"
            r={radius}
            stroke={scoreColor}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: animated && isVisible ? strokeDashoffset : circumference }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-5xl font-bold" style={{ color: scoreColor }}>
            {animated ? (
              <CountUp end={score} duration={1.5} />
            ) : (
              score
            )}
          </div>
          <div className="text-sm font-semibold text-slate-500 mt-1">{scoreLabel}</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Trend vs Previous */}
        {previousScore && (
          <motion.div
            className="bg-white p-3 rounded-lg border border-slate-200"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-1">
              {trend > 0 ? (
                <TrendingUp size={16} className="text-green-600" />
              ) : trend < 0 ? (
                <TrendingDown size={16} className="text-red-600" />
              ) : (
                <Minus size={16} className="text-slate-400" />
              )}
              <span className="text-xs font-medium text-slate-600">vs Anterior</span>
            </div>
            <div className={`text-xl font-bold ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-slate-600'}`}>
              {trend > 0 ? '+' : ''}{trend}
            </div>
            <div className="text-xs text-slate-500">
              {trend > 0 ? '+' : ''}{trendPercentage}%
            </div>
          </motion.div>
        )}

        {/* Vs Industry Average */}
        <motion.div
          className="bg-white p-3 rounded-lg border border-slate-200"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-1">
            {vsIndustry > 0 ? (
              <TrendingUp size={16} className="text-green-600" />
            ) : vsIndustry < 0 ? (
              <TrendingDown size={16} className="text-red-600" />
            ) : (
              <Minus size={16} className="text-slate-400" />
            )}
            <span className="text-xs font-medium text-slate-600">vs Industria</span>
          </div>
          <div className={`text-xl font-bold ${vsIndustry > 0 ? 'text-green-600' : vsIndustry < 0 ? 'text-red-600' : 'text-slate-600'}`}>
            {vsIndustry > 0 ? '+' : ''}{vsIndustry}
          </div>
          <div className="text-xs text-slate-500">
            {vsIndustry > 0 ? '+' : ''}{vsIndustryPercentage}%
          </div>
        </motion.div>
      </div>

      {/* Industry Average Reference */}
      <motion.div
        className="mt-4 pt-4 border-t border-slate-200"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600">Promedio Industria</span>
          <span className="font-semibold text-slate-700">{industryAverage}</span>
        </div>
      </motion.div>
    </div>
  );
};

export default HealthScoreGaugeEnhanced;
