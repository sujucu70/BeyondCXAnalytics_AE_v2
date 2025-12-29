import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { RoadmapInitiative, RoadmapPhase } from '../types';
import { Bot, UserCheck, Cpu, Calendar, DollarSign, Users, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import MethodologyFooter from './MethodologyFooter';

interface RoadmapProProps {
  data: RoadmapInitiative[];
}

const phaseConfig: Record<RoadmapPhase, { icon: any; color: string; bgColor: string; label: string; description: string }> = {
  [RoadmapPhase.Automate]: {
    icon: Bot,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    label: 'Wave 1: AUTOMATE',
    description: 'Quick Wins (0-6 meses)',
  },
  [RoadmapPhase.Assist]: {
    icon: UserCheck,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    label: 'Wave 2: ASSIST',
    description: 'Build Capability (6-12 meses)',
  },
  [RoadmapPhase.Augment]: {
    icon: Cpu,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    label: 'Wave 3: AUGMENT',
    description: 'Transform (12-18 meses)',
  },
};

const getRiskColor = (initiative: RoadmapInitiative): string => {
  // Simple risk assessment based on investment and resources
  if (initiative.investment > 50000 || initiative.resources.length > 3) return 'text-red-500';
  if (initiative.investment > 25000 || initiative.resources.length > 2) return 'text-amber-500';
  return 'text-green-500';
};

const getRiskLabel = (initiative: RoadmapInitiative): string => {
  if (initiative.investment > 50000 || initiative.resources.length > 3) return 'Alto';
  if (initiative.investment > 25000 || initiative.resources.length > 2) return 'Medio';
  return 'Bajo';
};

const RoadmapPro: React.FC<RoadmapProProps> = ({ data }) => {
  // Group initiatives by phase
  const groupedData = useMemo(() => {
    try {
      if (!data || !Array.isArray(data)) return {
        [RoadmapPhase.Automate]: [],
        [RoadmapPhase.Assist]: [],
        [RoadmapPhase.Augment]: [],
      };
      const groups: Record<RoadmapPhase, RoadmapInitiative[]> = {
        [RoadmapPhase.Automate]: [],
        [RoadmapPhase.Assist]: [],
        [RoadmapPhase.Augment]: [],
      };
      
      data.forEach(item => {
        if (item?.phase && groups[item.phase]) {
          groups[item.phase].push(item);
        }
      });
      
      return groups;
    } catch (error) {
      console.error('❌ Error in groupedData useMemo:', error);
      return {
        [RoadmapPhase.Automate]: [],
        [RoadmapPhase.Assist]: [],
        [RoadmapPhase.Augment]: [],
      };
    }
  }, [data]);

  // Calculate summary metrics
  const summary = useMemo(() => {
    try {
      if (!data || !Array.isArray(data)) return {
        totalInvestment: 0,
        totalResources: 0,
        duration: 18,
        initiativeCount: 0,
      };
      const totalInvestment = data.reduce((sum, item) => sum + (item?.investment || 0), 0);
      const resourceLengths = data.map(item => item?.resources?.length || 0);
      const totalResources = resourceLengths.length > 0 ? Math.max(0, ...resourceLengths) : 0;
      const duration = 18;
      
      return {
        totalInvestment,
        totalResources,
        duration,
        initiativeCount: data.length,
      };
    } catch (error) {
      console.error('❌ Error in summary useMemo:', error);
      return {
        totalInvestment: 0,
        totalResources: 0,
        duration: 18,
        initiativeCount: 0,
      };
    }
  }, [data]);

  // Timeline quarters (Q1 2025 - Q2 2026)
  const quarters = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026'];

  // Milestones
  const milestones = [
    { quarter: 1, label: 'Go-live Wave 1', icon: CheckCircle2, color: 'text-green-600' },
    { quarter: 2, label: '50% Adoption', icon: TrendingUp, color: 'text-blue-600' },
    { quarter: 3, label: 'Tier Silver', icon: CheckCircle2, color: 'text-slate-600' },
    { quarter: 5, label: 'Tier Gold', icon: CheckCircle2, color: 'text-amber-600' },
  ];

  return (
    <div id="roadmap" className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="mb-6">
        <h3 className="font-bold text-2xl text-slate-800 mb-2">
          Roadmap de Transformación: 18 meses hacia Agentic Readiness Tier Gold
        </h3>
        <p className="text-sm text-slate-500">
          Plan de Implementación en 3 olas de transformación | {data.length} iniciativas | €{((summary.totalInvestment || 0) / 1000).toFixed(0)}K inversión total
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-600 mb-1">Duración Total</div>
          <div className="text-2xl font-bold text-slate-800">{summary.duration} meses</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <div className="text-xs text-blue-700 mb-1">Inversión Total</div>
          <div className="text-2xl font-bold text-blue-600">€{(((summary.totalInvestment || 0)) / 1000).toFixed(0)}K</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
          <div className="text-xs text-green-700 mb-1"># Iniciativas</div>
          <div className="text-2xl font-bold text-green-600">{summary.initiativeCount}</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-200">
          <div className="text-xs text-purple-700 mb-1">FTEs Peak</div>
          <div className="text-2xl font-bold text-purple-600">{summary.totalResources.toFixed(1)}</div>
        </div>
      </div>

      {/* Timeline Visual */}
      <div className="mb-8">
        <div className="relative">
          {/* Timeline Bar */}
          <div className="flex items-center mb-12">
            {quarters.map((quarter, index) => (
              <div key={quarter} className="flex-1 relative">
                <div className="flex flex-col items-center">
                  {/* Quarter Marker */}
                  <div className="w-3 h-3 rounded-full bg-slate-400 mb-2 z-10"></div>
                  {/* Quarter Label */}
                  <div className="text-xs font-semibold text-slate-700">{quarter}</div>
                </div>
                {/* Connecting Line */}
                {index < quarters.length - 1 && (
                  <div className="absolute top-1.5 left-1/2 w-full h-0.5 bg-slate-300"></div>
                )}
                
                {/* Milestones */}
                {milestones
                  .filter(m => m.quarter === index)
                  .map((milestone, mIndex) => (
                    <motion.div
                      key={mIndex}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="absolute top-8 left-1/2 -translate-x-1/2 w-32"
                    >
                      <div className="flex flex-col items-center">
                        <milestone.icon size={20} className={milestone.color} />
                        <div className={`text-xs font-medium ${milestone.color} text-center mt-1`}>
                          {milestone.label}
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            ))}
          </div>

          {/* Waves */}
          <div className="space-y-6 mt-16">
            {([RoadmapPhase.Automate, RoadmapPhase.Assist, RoadmapPhase.Augment]).map((phase, phaseIndex) => {
              const config = phaseConfig[phase];
              const Icon = config.icon;
              const initiatives = groupedData[phase];

              return (
                <motion.div
                  key={phase}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: phaseIndex * 0.2 }}
                  className={`${config.bgColor} border-2 border-${phase === RoadmapPhase.Automate ? 'green' : phase === RoadmapPhase.Assist ? 'blue' : 'purple'}-200 rounded-xl p-6`}
                >
                  {/* Wave Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg bg-white border-2 border-${phase === RoadmapPhase.Automate ? 'green' : phase === RoadmapPhase.Assist ? 'blue' : 'purple'}-300 flex items-center justify-center`}>
                      <Icon size={20} className={config.color} />
                    </div>
                    <div>
                      <h4 className={`font-bold text-lg ${config.color}`}>{config.label}</h4>
                      <p className="text-xs text-slate-600">{config.description}</p>
                    </div>
                  </div>

                  {/* Initiatives */}
                  <div className="space-y-3">
                    {initiatives.map((initiative, index) => {
                      const riskColor = getRiskColor(initiative);
                      const riskLabel = getRiskLabel(initiative);

                      return (
                        <motion.div
                          key={initiative.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: phaseIndex * 0.2 + index * 0.1 }}
                          whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          className="bg-white rounded-lg p-4 border border-slate-200"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h5 className="font-semibold text-slate-800">{initiative.name}</h5>
                                <div className="flex items-center gap-1">
                                  <AlertCircle size={14} className={riskColor} />
                                  <span className={`text-xs font-medium ${riskColor}`}>
                                    Riesgo: {riskLabel}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                                <div className="flex items-center gap-1">
                                  <Calendar size={12} />
                                  <span>{initiative.timeline}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <DollarSign size={12} />
                                  <span>€{initiative.investment.toLocaleString('es-ES')}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users size={12} />
                                  <span>{initiative.resources.length} FTEs</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-slate-50 rounded-lg">
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <span className="font-semibold text-slate-700">Indicadores de Riesgo:</span>
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-green-500" />
            <span className="text-slate-700">Bajo riesgo</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-500" />
            <span className="text-slate-700">Riesgo medio (mitigable)</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-red-500" />
            <span className="text-slate-700">Alto riesgo (requiere atención)</span>
          </div>
        </div>
      </div>

      {/* Methodology Footer */}
      <MethodologyFooter
        sources="Plan de transformación interno | Benchmarks de implementación: Gartner Magic Quadrant for CCaaS 2024"
        methodology="Timelines basados en implementaciones similares en sector Telco/Tech | Recursos asumen disponibilidad full-time equivalente | Riesgo: Basado en inversión (>€50K alto, €25-50K medio, <€25K bajo) y complejidad de recursos"
        notes="Waves: Wave 1 (Automate - Quick Wins, 0-6 meses), Wave 2 (Assist - Build Capability, 6-12 meses), Wave 3 (Augment - Transform, 12-18 meses) | Inversiones incluyen software, implementación, training y contingencia | Milestones: Go-live Wave 1 (Q2), 50% Adoption (Q3), Tier Silver (Q4), Tier Gold (Q2 2026)"
        lastUpdated="Enero 2025"
      />
    </div>
  );
};

export default RoadmapPro;
