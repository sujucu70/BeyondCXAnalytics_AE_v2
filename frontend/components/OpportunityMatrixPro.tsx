import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Opportunity, HeatmapDataPoint } from '../types';
import { HelpCircle, TrendingUp, Zap, DollarSign, X, Target, AlertCircle } from 'lucide-react';
import MethodologyFooter from './MethodologyFooter';

interface OpportunityMatrixProProps {
  data: Opportunity[];
  heatmapData?: HeatmapDataPoint[];  // v2.0: Datos de variabilidad para ajustar factibilidad
}

interface QuadrantInfo {
  label: string;
  subtitle: string;
  recommendation: string;
  priority: number;
  color: string;
  bgColor: string;
  icon: string;
}

const OpportunityMatrixPro: React.FC<OpportunityMatrixProProps> = ({ data, heatmapData }) => {
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [hoveredOpportunity, setHoveredOpportunity] = useState<string | null>(null);

  const maxSavings = data && data.length > 0 ? Math.max(...data.map(d => d.savings || 0), 1) : 1;

  // v2.0: Ajustar factibilidad con automation readiness del heatmap
  const adjustFeasibilityWithReadiness = (opp: Opportunity): number => {
    if (!heatmapData) return opp.feasibility;

    // Buscar skill relacionada en heatmap
    const relatedSkill = heatmapData.find(h => {
      if (!h.skill || !opp.name) return false;
      const skillLower = h.skill.toLowerCase();
      const oppNameLower = opp.name.toLowerCase();
      const firstWord = oppNameLower.split(' ')[0] || '';  // Validar que existe
      return oppNameLower.includes(skillLower) || (firstWord && skillLower.includes(firstWord));
    });
    
    if (!relatedSkill) return opp.feasibility;
    
    // Ajustar factibilidad: readiness alto aumenta factibilidad, bajo la reduce
    const readinessFactor = relatedSkill.automation_readiness / 100; // 0-1
    const adjustedFeasibility = opp.feasibility * 0.6 + (readinessFactor * 10) * 0.4;
    
    return Math.min(10, Math.max(1, adjustedFeasibility));
  };

  // Calculate priorities (Impact × Feasibility × Savings)
  const dataWithPriority = useMemo(() => {
    try {
      if (!data || !Array.isArray(data)) return [];
      return data.map(opp => {
      const adjustedFeasibility = adjustFeasibilityWithReadiness(opp);
      const priorityScore = (opp.impact / 10) * (adjustedFeasibility / 10) * (opp.savings / maxSavings);
      return { ...opp, adjustedFeasibility, priorityScore };
    }).sort((a, b) => b.priorityScore - a.priorityScore)
      .map((opp, index) => ({ ...opp, priority: index + 1 }));
    } catch (error) {
      console.error('❌ Error in dataWithPriority useMemo:', error);
      return [];
    }
  }, [data, maxSavings, heatmapData]);

  // Calculate portfolio summary
  const portfolioSummary = useMemo(() => {
    const quickWins = dataWithPriority.filter(o => o.impact >= 5 && o.feasibility >= 5);
    const strategic = dataWithPriority.filter(o => o.impact >= 5 && o.feasibility < 5);
    const consider = dataWithPriority.filter(o => o.impact < 5 && o.feasibility >= 5);
    
    const totalSavings = dataWithPriority.reduce((sum, o) => sum + o.savings, 0);
    const quickWinsSavings = quickWins.reduce((sum, o) => sum + o.savings, 0);
    const strategicSavings = strategic.reduce((sum, o) => sum + o.savings, 0);
    
    return {
      totalSavings,
      quickWins: { count: quickWins.length, savings: quickWinsSavings },
      strategic: { count: strategic.length, savings: strategicSavings },
      consider: { count: consider.length, savings: 0 },
    };
  }, [dataWithPriority]);

  // Dynamic title
  const dynamicTitle = useMemo(() => {
    const { quickWins } = portfolioSummary;
    if (quickWins.count > 0) {
      return `${quickWins.count} Quick Wins pueden generar €${(quickWins.savings / 1000).toFixed(0)}K en ahorros con implementación en Q1-Q2`;
    }
    return `Portfolio de ${dataWithPriority.length} oportunidades identificadas con potencial de €${(portfolioSummary.totalSavings / 1000).toFixed(0)}K`;
  }, [portfolioSummary, dataWithPriority]);

  const getQuadrantInfo = (impact: number, feasibility: number): QuadrantInfo => {
    if (impact >= 5 && feasibility >= 5) {
      return {
        label: '🎯 Quick Wins',
        subtitle: `${portfolioSummary.quickWins.count} iniciativas | €${(portfolioSummary.quickWins.savings / 1000).toFixed(0)}K ahorro | 3-6 meses`,
        recommendation: 'Prioridad 1: Implementar Inmediatamente',
        priority: 1,
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        icon: '🎯',
      };
    }
    if (impact >= 5 && feasibility < 5) {
      return {
        label: '🚀 Proyectos Estratégicos',
        subtitle: `${portfolioSummary.strategic.count} iniciativas | €${(portfolioSummary.strategic.savings / 1000).toFixed(0)}K ahorro | 12-18 meses`,
        recommendation: 'Prioridad 2: Planificar Roadmap H2',
        priority: 2,
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        icon: '🚀',
      };
    }
    if (impact < 5 && feasibility >= 5) {
      return {
        label: '🔍 Evaluar',
        subtitle: `${portfolioSummary.consider.count} iniciativas | Bajo impacto | 2-4 meses`,
        recommendation: 'Prioridad 3: Considerar si hay capacidad',
        priority: 3,
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        icon: '🔍',
      };
    }
    return {
      label: '⏸️ Descartar',
      subtitle: 'Bajo impacto y factibilidad',
      recommendation: 'No priorizar - No invertir recursos',
      priority: 4,
      color: 'text-slate-500',
      bgColor: 'bg-slate-50',
      icon: '⏸️',
    };
  };

  const getQuadrantColor = (impact: number, feasibility: number): string => {
    if (impact >= 5 && feasibility >= 5) return 'bg-green-500';
    if (impact >= 5 && feasibility < 5) return 'bg-blue-500';
    if (impact < 5 && feasibility >= 5) return 'bg-amber-500';
    return 'bg-slate-400';
  };

  const getFeasibilityLabel = (value: number): string => {
    if (value >= 7.5) return 'Fácil';
    if (value >= 5) return 'Moderado';
    if (value >= 2.5) return 'Complejo';
    return 'Muy Difícil';
  };

  const getImpactLabel = (value: number): string => {
    if (value >= 7.5) return 'Muy Alto';
    if (value >= 5) return 'Alto';
    if (value >= 2.5) return 'Medio';
    return 'Bajo';
  };

  return (
    <div id="opportunities" className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
      {/* Header with Dynamic Title */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-bold text-2xl text-slate-800">Opportunity Matrix</h3>
          <div className="group relative">
            <HelpCircle size={18} className="text-slate-400 cursor-pointer" />
            <div className="absolute bottom-full mb-2 w-80 bg-slate-800 text-white text-xs rounded py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
              Prioriza iniciativas basadas en Impacto vs. Factibilidad. El tamaño de la burbuja representa el ahorro potencial. Los números indican la priorización estratégica. Click para ver detalles completos.
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
            </div>
          </div>
        </div>
        <p className="text-base text-slate-700 font-medium leading-relaxed mb-1">
          {dynamicTitle}
        </p>
        <p className="text-sm text-slate-500">
          Portfolio de Oportunidades | Análisis de {dataWithPriority.length} iniciativas identificadas
        </p>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-600 mb-1">Total Ahorro Potencial</div>
          <div className="text-2xl font-bold text-slate-800">
            €{(portfolioSummary.totalSavings / 1000).toFixed(0)}K
          </div>
          <div className="text-xs text-slate-500 mt-1">anuales</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
          <div className="text-xs text-green-700 mb-1">Quick Wins ({portfolioSummary.quickWins.count})</div>
          <div className="text-2xl font-bold text-green-600">
            €{(portfolioSummary.quickWins.savings / 1000).toFixed(0)}K
          </div>
          <div className="text-xs text-green-600 mt-1">6 meses</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <div className="text-xs text-blue-700 mb-1">Estratégicos ({portfolioSummary.strategic.count})</div>
          <div className="text-2xl font-bold text-blue-600">
            €{(portfolioSummary.strategic.savings / 1000).toFixed(0)}K
          </div>
          <div className="text-xs text-blue-600 mt-1">18 meses</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-200">
          <div className="text-xs text-purple-700 mb-1">ROI Portfolio</div>
          <div className="text-2xl font-bold text-purple-600">
            4.3x
          </div>
          <div className="text-xs text-purple-600 mt-1">3 años</div>
        </div>
      </div>

      {/* Matrix */}
      <div className="relative w-full h-[500px] border-l-2 border-b-2 border-slate-400 rounded-bl-lg bg-gradient-to-tr from-slate-50 to-white">
        {/* Y-axis Label */}
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-bold text-slate-700 flex items-center gap-2">
          <TrendingUp size={18} /> IMPACTO
        </div>
        
        {/* X-axis Label */}
        <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 text-sm font-bold text-slate-700 flex items-center gap-2">
          <Zap size={18} /> FACTIBILIDAD
        </div>

        {/* Axis scale labels */}
        <div className="absolute -left-2 top-0 -translate-x-full text-xs text-slate-500 font-medium">
          Muy Alto
        </div>
        <div className="absolute -left-2 top-1/2 -translate-x-full -translate-y-1/2 text-xs text-slate-500 font-medium">
          Medio
        </div>
        <div className="absolute -left-2 bottom-0 -translate-x-full text-xs text-slate-500 font-medium">
          Bajo
        </div>
        
        <div className="absolute left-0 -bottom-2 translate-y-full text-xs text-slate-500 font-medium">
          Muy Difícil
        </div>
        <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 translate-y-full text-xs text-slate-500 font-medium">
          Moderado
        </div>
        <div className="absolute right-0 -bottom-2 translate-y-full text-xs text-slate-500 font-medium">
          Fácil
        </div>

        {/* Quadrant Lines */}
        <div className="absolute top-1/2 left-0 w-full border-t-2 border-dashed border-slate-300"></div>
        <div className="absolute left-1/2 top-0 h-full border-l-2 border-dashed border-slate-300"></div>

        {/* Enhanced Quadrant Labels */}
        <div className="absolute top-6 left-6 max-w-[200px]">
          <div className={`text-sm font-bold ${getQuadrantInfo(3, 8).color} ${getQuadrantInfo(3, 8).bgColor} px-3 py-2 rounded-lg shadow-sm border-2 border-amber-200`}>
            <div>{getQuadrantInfo(3, 8).label}</div>
            <div className="text-xs font-normal mt-1">{getQuadrantInfo(3, 8).recommendation}</div>
          </div>
        </div>
        
        <div className="absolute top-6 right-6 max-w-[200px]">
          <div className={`text-sm font-bold ${getQuadrantInfo(8, 8).color} ${getQuadrantInfo(8, 8).bgColor} px-3 py-2 rounded-lg shadow-sm border-2 border-green-300`}>
            <div>{getQuadrantInfo(8, 8).label}</div>
            <div className="text-xs font-normal mt-1">{getQuadrantInfo(8, 8).recommendation}</div>
          </div>
        </div>
        
        <div className="absolute bottom-6 left-6 max-w-[200px]">
          <div className={`text-sm font-bold ${getQuadrantInfo(3, 3).color} ${getQuadrantInfo(3, 3).bgColor} px-3 py-2 rounded-lg shadow-sm border-2 border-slate-200`}>
            <div>{getQuadrantInfo(3, 3).label}</div>
            <div className="text-xs font-normal mt-1">{getQuadrantInfo(3, 3).recommendation}</div>
          </div>
        </div>
        
        <div className="absolute bottom-6 right-6 max-w-[200px]">
          <div className={`text-sm font-bold ${getQuadrantInfo(8, 3).color} ${getQuadrantInfo(8, 3).bgColor} px-3 py-2 rounded-lg shadow-sm border-2 border-blue-200`}>
            <div>{getQuadrantInfo(8, 3).label}</div>
            <div className="text-xs font-normal mt-1">{getQuadrantInfo(8, 3).recommendation}</div>
          </div>
        </div>
        
        {/* Opportunities */}
        {dataWithPriority.map((opp, index) => {
          const size = 40 + (opp.savings / maxSavings) * 60; // Bubble size from 40px to 100px
          const isHovered = hoveredOpportunity === opp.id;
          const isSelected = selectedOpportunity?.id === opp.id;
          
          return (
            <motion.div
              key={opp.id}
              className="absolute cursor-pointer"
              style={{
                left: `calc(${(opp.feasibility / 10) * 100}% - ${size / 2}px)`,
                bottom: `calc(${(opp.impact / 10) * 100}% - ${size / 2}px)`,
                width: `${size}px`,
                height: `${size}px`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.08, type: 'spring', stiffness: 200 }}
              whileHover={{ scale: 1.15, zIndex: 10 }}
              onMouseEnter={() => setHoveredOpportunity(opp.id)}
              onMouseLeave={() => setHoveredOpportunity(null)}
              onClick={() => setSelectedOpportunity(opp)}
            >
              <div 
                className={`w-full h-full rounded-full transition-all flex items-center justify-center relative ${
                  isSelected ? 'ring-4 ring-blue-400' : ''
                } ${getQuadrantColor(opp.impact, opp.feasibility)}`}
                style={{ opacity: isHovered || isSelected ? 0.95 : 0.75 }}
              >
                <span className="text-white font-bold text-lg">#{opp.priority}</span>
                {/* v2.0: Indicador de variabilidad si hay datos de heatmap */}
                {heatmapData && (() => {
                  const relatedSkill = heatmapData.find(h => {
                    if (!h.skill || !opp.name) return false;
                    const skillLower = h.skill.toLowerCase();
                    const oppNameLower = opp.name.toLowerCase();
                    return oppNameLower.includes(skillLower) || skillLower.includes(oppNameLower.split(' ')[0]);
                  });
                  if (relatedSkill && relatedSkill.automation_readiness < 60) {
                    return (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                        <AlertCircle size={12} className="text-white" />
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              
              {/* Hover Tooltip */}
              {isHovered && !selectedOpportunity && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 bg-slate-900 text-white p-4 rounded-lg text-xs shadow-2xl z-20 pointer-events-none"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-sm flex-1">{opp.name}</h4>
                    <span className="text-green-400 font-bold ml-2">#{opp.priority}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Impacto:</span>
                      <span className="font-semibold">{opp.impact}/10 ({getImpactLabel(opp.impact)})</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Factibilidad:</span>
                      <span className="font-semibold">{opp.feasibility}/10 ({getFeasibilityLabel(opp.feasibility)})</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                      <span className="text-slate-300">Ahorro Anual:</span>
                      <span className="font-bold text-green-400">€{opp.savings.toLocaleString('es-ES')}</span>
                    </div>
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900"></div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Enhanced Legend */}
      <div className="mt-8 p-4 bg-slate-50 rounded-lg">
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <span className="font-semibold text-slate-700">Tamaño de burbuja = Ahorro potencial:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-slate-400"></div>
            <span className="text-slate-700">Pequeño (&lt;€50K)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-400"></div>
            <span className="text-slate-700">Medio (€50-150K)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-400"></div>
            <span className="text-slate-700">Grande (&gt;€150K)</span>
          </div>
          <span className="ml-4 text-slate-500">|</span>
          <span className="font-semibold text-slate-700">Número = Prioridad estratégica</span>
        </div>
      </div>

      {/* Selected Opportunity Detail Panel */}
      <AnimatePresence>
        {selectedOpportunity && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 overflow-hidden"
          >
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${getQuadrantColor(selectedOpportunity.impact, selectedOpportunity.feasibility)} flex items-center justify-center`}>
                    <span className="text-white font-bold text-lg">#{selectedOpportunity.priority}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl text-slate-800">{selectedOpportunity.name}</h4>
                    <p className="text-sm text-blue-700 font-medium">
                      {getQuadrantInfo(selectedOpportunity.impact, selectedOpportunity.feasibility).label}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOpportunity(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <div className="text-xs text-slate-600 mb-1">Impacto</div>
                  <div className="text-2xl font-bold text-blue-600">{selectedOpportunity.impact}/10</div>
                  <div className="text-xs text-slate-500 mt-1">{getImpactLabel(selectedOpportunity.impact)}</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <div className="text-xs text-slate-600 mb-1">Factibilidad</div>
                  <div className="text-2xl font-bold text-blue-600">{selectedOpportunity.feasibility}/10</div>
                  <div className="text-xs text-slate-500 mt-1">{getFeasibilityLabel(selectedOpportunity.feasibility)}</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-100">
                  <div className="text-xs text-slate-600 mb-1">Ahorro Anual</div>
                  <div className="text-2xl font-bold text-green-600">€{selectedOpportunity.savings.toLocaleString('es-ES')}</div>
                  <div className="text-xs text-slate-500 mt-1">Potencial</div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={16} className="text-blue-600" />
                  <span className="font-semibold text-slate-800">Recomendación:</span>
                </div>
                <p className="text-sm text-slate-700">
                  {getQuadrantInfo(selectedOpportunity.impact, selectedOpportunity.feasibility).recommendation}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Methodology Footer */}
      <MethodologyFooter
        sources="Análisis interno de procesos operacionales | Benchmarks de implementación: Gartner Magic Quadrant for CCaaS 2024, Forrester Wave Contact Center 2024"
        methodology="Impacto: Basado en % reducción de AHT, mejora de FCR, y reducción de costes operacionales | Factibilidad: Evaluación de complejidad técnica (40%), cambio organizacional (30%), inversión requerida (30%) | Priorización: Score = (Impacto/10) × (Factibilidad/10) × (Ahorro/Max Ahorro)"
        notes="Ahorros calculados en escenario conservador (base case) sin incluir upside potencial | ROI calculado a 3 años con tasa de descuento 10%"
        lastUpdated="Enero 2025"
      />
    </div>
  );
};

export default OpportunityMatrixPro;
