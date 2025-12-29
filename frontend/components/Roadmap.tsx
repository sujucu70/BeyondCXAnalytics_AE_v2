import React from 'react';
import { RoadmapInitiative, RoadmapPhase } from '../types';
import { Bot, UserCheck, Cpu, Calendar, DollarSign, Users } from 'lucide-react';
import MethodologyFooter from './MethodologyFooter';

interface RoadmapProps {
  data: RoadmapInitiative[];
}

const PhaseConfig = {
  [RoadmapPhase.Automate]: {
    title: "Automate",
    description: "Iniciativas para automatizar tareas repetitivas y liberar a los agentes.",
    Icon: Bot,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  [RoadmapPhase.Assist]: {
    title: "Assist",
    description: "Herramientas para ayudar a los agentes a ser más eficientes y efectivos.",
    Icon: UserCheck,
    color: "text-sky-600",
    bgColor: "bg-sky-100",
  },
  [RoadmapPhase.Augment]: {
    title: "Augment",
    description: "Capacidades avanzadas que aumentan la inteligencia del equipo.",
    Icon: Cpu,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
};

const InitiativeCard: React.FC<{ initiative: RoadmapInitiative }> = ({ initiative }) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
      <h4 className="font-bold text-slate-800 mb-3">{initiative.name}</h4>
      <div className="space-y-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <span>Timeline: <span className="font-semibold">{initiative.timeline}</span></span>
        </div>
        <div className="flex items-center gap-2">
            <DollarSign size={14} className="text-slate-400" />
            <span>Inversión: <span className="font-semibold">{initiative.investment.toLocaleString('es-ES')}€</span></span>
        </div>
        <div className="flex items-start gap-2">
            <Users size={14} className="text-slate-400 mt-0.5" />
            <div>Recursos: <span className="font-semibold">{initiative.resources.join(', ')}</span></div>
        </div>
      </div>
    </div>
  );
};

const Roadmap: React.FC<RoadmapProps> = ({ data }) => {
  const phases = Object.values(RoadmapPhase);

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200">
      <h3 className="font-bold text-xl text-slate-800 mb-4">Implementation Roadmap</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {phases.map(phase => {
          const config = PhaseConfig[phase];
          const initiatives = data.filter(item => item.phase === phase);
          return (
            <div key={phase} className="flex flex-col">
              <div className={`p-4 rounded-t-lg ${config.bgColor}`}>
                <div className={`flex items-center gap-2 font-bold text-lg ${config.color}`}>
                  <config.Icon size={20} />
                  <h3>{config.title}</h3>
                </div>
                <p className="text-xs text-slate-600 mt-1">{config.description}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-b-lg border-x border-b border-slate-200 flex-grow">
                <div className="space-y-4">
                    {initiatives.map(initiative => (
                        <InitiativeCard 
                            key={initiative.id} 
                            initiative={initiative}
                        />
                    ))}
                    {initiatives.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No hay iniciativas para esta fase.</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Methodology Footer */}
      <MethodologyFooter
        sources="Plan de transformación interno | Benchmarks de implementación: Gartner Magic Quadrant for CCaaS 2024"
        methodology="Timelines basados en implementaciones similares en sector Telco/Tech | Recursos asumen disponibilidad full-time equivalente"
        notes="Fases: Automate (Quick Wins, 0-6 meses), Assist (Build Capability, 6-12 meses), Augment (Transform, 12-18 meses) | Inversiones incluyen software, implementación, training y contingencia"
        lastUpdated="Enero 2025"
      />
    </div>
  );
};

export default Roadmap;