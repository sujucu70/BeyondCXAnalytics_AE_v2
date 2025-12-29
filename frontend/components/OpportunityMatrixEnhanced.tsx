import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Opportunity } from '../types';
import { HelpCircle, TrendingUp, Zap, DollarSign, X, Target } from 'lucide-react';

interface OpportunityMatrixEnhancedProps {
  data: Opportunity[];
}

const OpportunityMatrixEnhanced: React.FC<OpportunityMatrixEnhancedProps> = ({ data }) => {
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [hoveredOpportunity, setHoveredOpportunity] = useState<string | null>(null);

  const maxSavings = Math.max(...data.map(d => d.savings), 1);

  const getQuadrantLabel = (impact: number, feasibility: number): string => {
    if (impact >= 5 && feasibility >= 5) return 'Quick Wins';
    if (impact >= 5 && feasibility < 5) return 'Proyectos Estratégicos';
    if (impact < 5 && feasibility >= 5) return 'Estudiar';
    return 'Descartar';
  };

  const getQuadrantColor = (impact: number, feasibility: number): string => {
    if (impact >= 5 && feasibility >= 5) return 'bg-green-500';
    if (impact >= 5 && feasibility < 5) return 'bg-blue-500';
    if (impact < 5 && feasibility >= 5) return 'bg-yellow-500';
    return 'bg-slate-400';
  };

  return (
    <div id="opportunities" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="font-bold text-xl text-slate-800">Opportunity Matrix</h3>
        <div className="group relative">
          <HelpCircle size={16} className="text-slate-400 cursor-pointer" />
          <div className="absolute bottom-full mb-2 w-64 bg-slate-800 text-white text-xs rounded py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
            Prioriza iniciativas basadas en Impacto vs. Factibilidad. El tamaño de la burbuja representa el ahorro potencial. Click para ver detalles.
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
          </div>
        </div>
      </div>
      
      <div className="relative w-full h-[400px] border-l-2 border-b-2 border-slate-300 rounded-bl-lg">
        {/* Y-axis Label */}
        <div className="absolute -left-16 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-semibold text-slate-700 flex items-center gap-1">
          <TrendingUp size={16} /> Impacto
        </div>
        
        {/* X-axis Label */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-sm font-semibold text-slate-700 flex items-center gap-1">
          <Zap size={16} /> Factibilidad
        </div>

        {/* Quadrant Lines */}
        <div className="absolute top-1/2 left-0 w-full border-t border-dashed border-slate-300"></div>
        <div className="absolute left-1/2 top-0 h-full border-l border-dashed border-slate-300"></div>

        {/* Quadrant Labels */}
        <div className="absolute top-4 left-4 text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded">
          Estudiar
        </div>
        <div className="absolute top-4 right-4 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
          Quick Wins ⭐
        </div>
        <div className="absolute bottom-4 left-4 text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">
          Descartar
        </div>
        <div className="absolute bottom-4 right-4 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">
          Estratégicos
        </div>
        
        {/* Opportunities */}
        {data.map((opp, index) => {
          const size = 30 + (opp.savings / maxSavings) * 50; // Bubble size from 30px to 80px
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
              transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
              whileHover={{ scale: 1.1 }}
              onMouseEnter={() => setHoveredOpportunity(opp.id)}
              onMouseLeave={() => setHoveredOpportunity(null)}
              onClick={() => setSelectedOpportunity(opp)}
            >
              <div 
                className={`w-full h-full rounded-full transition-all ${
                  isSelected ? 'ring-4 ring-blue-400' : ''
                } ${getQuadrantColor(opp.impact, opp.feasibility)}`}
                style={{ opacity: isHovered || isSelected ? 0.9 : 0.7 }}
              />
              
              {/* Hover Tooltip */}
              {isHovered && !selectedOpportunity && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white p-3 rounded-lg text-xs shadow-xl z-20 pointer-events-none"
                >
                  <h4 className="font-bold mb-2">{opp.name}</h4>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Impacto:</span>
                      <span className="font-semibold">{opp.impact}/10</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Factibilidad:</span>
                      <span className="font-semibold">{opp.feasibility}/10</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-700">
                      <span className="text-slate-300">Ahorro:</span>
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

      {/* Legend */}
      <div className="mt-6 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <span className="font-semibold">Tamaño de burbuja:</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Pequeño ahorro</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-500"></div>
            <span>Ahorro medio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-500"></div>
            <span>Gran ahorro</span>
          </div>
        </div>
        <div className="text-slate-500">
          Click en burbujas para ver detalles
        </div>
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedOpportunity && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSelectedOpportunity(null)}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="text-blue-600" size={24} />
                      <h3 className="text-xl font-bold text-slate-900">
                        Detalle de Oportunidad
                      </h3>
                    </div>
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      getQuadrantColor(selectedOpportunity.impact, selectedOpportunity.feasibility)
                    } text-white`}>
                      {getQuadrantLabel(selectedOpportunity.impact, selectedOpportunity.feasibility)}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedOpportunity(null)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-slate-600" />
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2">
                      {selectedOpportunity.name}
                    </h4>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={18} className="text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Impacto</span>
                      </div>
                      <div className="text-3xl font-bold text-blue-600">
                        {selectedOpportunity.impact}/10
                      </div>
                      <div className="mt-2 bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${selectedOpportunity.impact * 10}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap size={18} className="text-amber-600" />
                        <span className="text-sm font-medium text-amber-900">Factibilidad</span>
                      </div>
                      <div className="text-3xl font-bold text-amber-600">
                        {selectedOpportunity.feasibility}/10
                      </div>
                      <div className="mt-2 bg-amber-200 rounded-full h-2">
                        <div 
                          className="bg-amber-600 h-2 rounded-full transition-all"
                          style={{ width: `${selectedOpportunity.feasibility * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Savings */}
                  <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign size={20} className="text-green-600" />
                      <span className="text-sm font-medium text-green-900">Ahorro Potencial Anual</span>
                    </div>
                    <div className="text-4xl font-bold text-green-600">
                      €{selectedOpportunity.savings.toLocaleString('es-ES')}
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h5 className="font-semibold text-slate-900 mb-2">Recomendación</h5>
                    <p className="text-sm text-slate-700">
                      {selectedOpportunity.impact >= 7 && selectedOpportunity.feasibility >= 7
                        ? '🎯 Alta prioridad: Quick Win con gran impacto y fácil implementación. Recomendamos iniciar de inmediato.'
                        : selectedOpportunity.impact >= 7
                        ? '🔵 Proyecto estratégico: Alto impacto pero requiere planificación. Incluir en roadmap a medio plazo.'
                        : selectedOpportunity.feasibility >= 7
                        ? '🟡 Analizar más: Fácil de implementar pero impacto limitado. Evaluar coste-beneficio.'
                        : '⚪ Baja prioridad: Considerar solo si hay recursos disponibles.'}
                    </p>
                  </div>

                  {/* Action Button */}
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                    Añadir al Roadmap
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OpportunityMatrixEnhanced;
