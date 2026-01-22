/**
 * OpportunityPrioritizer - v1.0
 *
 * Redesigned Opportunity Matrix that clearly shows:
 * 1. WHERE are the opportunities (ranked list with context)
 * 2. WHERE to START (highlighted #1 with full justification)
 * 3. WHY this prioritization (tier-based rationale + metrics)
 *
 * Design principles:
 * - Scannable in 5 seconds (executive summary)
 * - Actionable in 30 seconds (clear next steps)
 * - Deep-dive available (expandable details)
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Opportunity, DrilldownDataPoint, AgenticTier } from '../types';
import {
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Zap,
  Clock,
  Users,
  Bot,
  Headphones,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Info,
  Target,
  DollarSign,
  BarChart3,
  Sparkles
} from 'lucide-react';

interface OpportunityPrioritizerProps {
  opportunities: Opportunity[];
  drilldownData?: DrilldownDataPoint[];
  costPerHour?: number;
}

interface EnrichedOpportunity extends Opportunity {
  rank: number;
  tier: AgenticTier;
  volume: number;
  cv_aht: number;
  transfer_rate: number;
  fcr_rate: number;
  agenticScore: number;
  timelineMonths: number;
  effortLevel: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
  whyPrioritized: string[];
  nextSteps: string[];
  annualCost?: number;
}

// Tier configuration
const TIER_CONFIG: Record<AgenticTier, {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  savingsRate: string;
  timeline: string;
  description: string;
}> = {
  'AUTOMATE': {
    icon: <Bot size={18} />,
    label: 'Automatizar',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    savingsRate: '70%',
    timeline: '3-6 meses',
    description: 'Automatización completa con agentes IA'
  },
  'ASSIST': {
    icon: <Headphones size={18} />,
    label: 'Asistir',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    savingsRate: '30%',
    timeline: '6-9 meses',
    description: 'Copilot IA para agentes humanos'
  },
  'AUGMENT': {
    icon: <BookOpen size={18} />,
    label: 'Optimizar',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    savingsRate: '15%',
    timeline: '9-12 meses',
    description: 'Estandarización y mejora de procesos'
  },
  'HUMAN-ONLY': {
    icon: <Users size={18} />,
    label: 'Humano',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    savingsRate: '0%',
    timeline: 'N/A',
    description: 'Requiere intervención humana'
  }
};

const OpportunityPrioritizer: React.FC<OpportunityPrioritizerProps> = ({
  opportunities,
  drilldownData,
  costPerHour = 20
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAllOpportunities, setShowAllOpportunities] = useState(false);

  // Enrich opportunities with drilldown data
  const enrichedOpportunities = useMemo((): EnrichedOpportunity[] => {
    if (!opportunities || opportunities.length === 0) return [];

    // Create a lookup map from drilldown data
    const queueLookup = new Map<string, {
      tier: AgenticTier;
      volume: number;
      cv_aht: number;
      transfer_rate: number;
      fcr_rate: number;
      agenticScore: number;
      annualCost?: number;
    }>();

    if (drilldownData) {
      drilldownData.forEach(skill => {
        skill.originalQueues?.forEach(q => {
          queueLookup.set(q.original_queue_id.toLowerCase(), {
            tier: q.tier || 'HUMAN-ONLY',
            volume: q.volume,
            cv_aht: q.cv_aht,
            transfer_rate: q.transfer_rate,
            fcr_rate: q.fcr_rate,
            agenticScore: q.agenticScore,
            annualCost: q.annualCost
          });
        });
      });
    }

    return opportunities.map((opp, index) => {
      // Extract queue name (remove tier emoji prefix)
      const cleanName = opp.name.replace(/^[^\w\s]+\s*/, '').toLowerCase();
      const lookupData = queueLookup.get(cleanName);

      // Determine tier from emoji prefix or lookup
      let tier: AgenticTier = 'ASSIST';
      if (opp.name.startsWith('🤖')) tier = 'AUTOMATE';
      else if (opp.name.startsWith('🤝')) tier = 'ASSIST';
      else if (opp.name.startsWith('📚')) tier = 'AUGMENT';
      else if (lookupData) tier = lookupData.tier;

      // Calculate effort and risk based on metrics
      const cv = lookupData?.cv_aht || 50;
      const transfer = lookupData?.transfer_rate || 15;
      const effortLevel: 'low' | 'medium' | 'high' =
        tier === 'AUTOMATE' && cv < 60 ? 'low' :
        tier === 'ASSIST' || cv < 80 ? 'medium' : 'high';

      const riskLevel: 'low' | 'medium' | 'high' =
        cv < 50 && transfer < 15 ? 'low' :
        cv < 80 && transfer < 30 ? 'medium' : 'high';

      // Timeline based on tier
      const timelineMonths = tier === 'AUTOMATE' ? 4 : tier === 'ASSIST' ? 7 : 10;

      // Generate "why" explanation
      const whyPrioritized: string[] = [];
      if (opp.savings > 50000) whyPrioritized.push(`Alto ahorro potencial (€${(opp.savings / 1000).toFixed(0)}K/año)`);
      if (lookupData?.volume && lookupData.volume > 1000) whyPrioritized.push(`Alto volumen (${lookupData.volume.toLocaleString()} interacciones)`);
      if (tier === 'AUTOMATE') whyPrioritized.push('Proceso altamente predecible y repetitivo');
      if (cv < 60) whyPrioritized.push('Baja variabilidad en tiempos de gestión');
      if (transfer < 15) whyPrioritized.push('Baja tasa de transferencias');
      if (opp.feasibility >= 7) whyPrioritized.push('Alta factibilidad técnica');

      // Generate next steps
      const nextSteps: string[] = [];
      if (tier === 'AUTOMATE') {
        nextSteps.push('Definir flujos conversacionales principales');
        nextSteps.push('Identificar integraciones necesarias (CRM, APIs)');
        nextSteps.push('Crear piloto con 10% del volumen');
      } else if (tier === 'ASSIST') {
        nextSteps.push('Mapear puntos de fricción del agente');
        nextSteps.push('Diseñar sugerencias contextuales');
        nextSteps.push('Piloto con equipo seleccionado');
      } else {
        nextSteps.push('Analizar causa raíz de variabilidad');
        nextSteps.push('Estandarizar procesos y scripts');
        nextSteps.push('Capacitar equipo en mejores prácticas');
      }

      return {
        ...opp,
        rank: index + 1,
        tier,
        volume: lookupData?.volume || Math.round(opp.savings / 10),
        cv_aht: cv,
        transfer_rate: transfer,
        fcr_rate: lookupData?.fcr_rate || 75,
        agenticScore: lookupData?.agenticScore || opp.feasibility,
        timelineMonths,
        effortLevel,
        riskLevel,
        whyPrioritized,
        nextSteps,
        annualCost: lookupData?.annualCost
      };
    });
  }, [opportunities, drilldownData]);

  // Summary stats
  const summary = useMemo(() => {
    const totalSavings = enrichedOpportunities.reduce((sum, o) => sum + o.savings, 0);
    const byTier = {
      AUTOMATE: enrichedOpportunities.filter(o => o.tier === 'AUTOMATE'),
      ASSIST: enrichedOpportunities.filter(o => o.tier === 'ASSIST'),
      AUGMENT: enrichedOpportunities.filter(o => o.tier === 'AUGMENT')
    };
    const quickWins = enrichedOpportunities.filter(o => o.tier === 'AUTOMATE' && o.effortLevel === 'low');

    return {
      totalSavings,
      totalVolume: enrichedOpportunities.reduce((sum, o) => sum + o.volume, 0),
      byTier,
      quickWinsCount: quickWins.length,
      quickWinsSavings: quickWins.reduce((sum, o) => sum + o.savings, 0)
    };
  }, [enrichedOpportunities]);

  const displayedOpportunities = showAllOpportunities
    ? enrichedOpportunities
    : enrichedOpportunities.slice(0, 5);

  const topOpportunity = enrichedOpportunities[0];

  if (!enrichedOpportunities.length) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
        <AlertTriangle className="mx-auto mb-4 text-amber-500" size={48} />
        <h3 className="text-lg font-semibold text-slate-700">No hay oportunidades identificadas</h3>
        <p className="text-slate-500 mt-2">Los datos actuales no muestran oportunidades de automatización viables.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Header - matching app's visual style */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Oportunidades Priorizadas</h2>
            <p className="text-sm text-gray-500 mt-1">
              {enrichedOpportunities.length} iniciativas ordenadas por potencial de ahorro y factibilidad
            </p>
          </div>
        </div>
      </div>

      {/* Executive Summary - Answer "Where are opportunities?" in 5 seconds */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-slate-50 border-b border-slate-200">
        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <DollarSign size={14} />
            <span>Ahorro Total Identificado</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">
            €{(summary.totalSavings / 1000).toFixed(0)}K
          </div>
          <div className="text-xs text-slate-500">anuales</div>
        </div>

        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 text-xs mb-1">
            <Bot size={14} />
            <span>Quick Wins (AUTOMATE)</span>
          </div>
          <div className="text-3xl font-bold text-emerald-700">
            {summary.byTier.AUTOMATE.length}
          </div>
          <div className="text-xs text-emerald-600">
            €{(summary.byTier.AUTOMATE.reduce((s, o) => s + o.savings, 0) / 1000).toFixed(0)}K en 3-6 meses
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 text-xs mb-1">
            <Headphones size={14} />
            <span>Asistencia (ASSIST)</span>
          </div>
          <div className="text-3xl font-bold text-blue-700">
            {summary.byTier.ASSIST.length}
          </div>
          <div className="text-xs text-blue-600">
            €{(summary.byTier.ASSIST.reduce((s, o) => s + o.savings, 0) / 1000).toFixed(0)}K en 6-9 meses
          </div>
        </div>

        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 text-xs mb-1">
            <BookOpen size={14} />
            <span>Optimización (AUGMENT)</span>
          </div>
          <div className="text-3xl font-bold text-amber-700">
            {summary.byTier.AUGMENT.length}
          </div>
          <div className="text-xs text-amber-600">
            €{(summary.byTier.AUGMENT.reduce((s, o) => s + o.savings, 0) / 1000).toFixed(0)}K en 9-12 meses
          </div>
        </div>
      </div>

      {/* START HERE - Answer "Where do I start?" */}
      {topOpportunity && (
        <div className="p-6 bg-gradient-to-r from-emerald-50 to-green-50 border-b-2 border-emerald-200">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-emerald-600" size={20} />
            <span className="text-emerald-800 font-bold text-lg">EMPIEZA AQUÍ</span>
            <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">Prioridad #1</span>
          </div>

          <div className="bg-white rounded-xl border-2 border-emerald-300 p-6 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              {/* Left: Main info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${TIER_CONFIG[topOpportunity.tier].bgColor}`}>
                    {TIER_CONFIG[topOpportunity.tier].icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {topOpportunity.name.replace(/^[^\w\s]+\s*/, '')}
                    </h3>
                    <span className={`text-sm font-medium ${TIER_CONFIG[topOpportunity.tier].color}`}>
                      {TIER_CONFIG[topOpportunity.tier].label} • {TIER_CONFIG[topOpportunity.tier].description}
                    </span>
                  </div>
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xs text-green-600 mb-1">Ahorro Anual</div>
                    <div className="text-xl font-bold text-green-700">
                      €{(topOpportunity.savings / 1000).toFixed(0)}K
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">Volumen</div>
                    <div className="text-xl font-bold text-slate-700">
                      {topOpportunity.volume.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">Timeline</div>
                    <div className="text-xl font-bold text-slate-700">
                      {topOpportunity.timelineMonths} meses
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">Agentic Score</div>
                    <div className="text-xl font-bold text-slate-700">
                      {topOpportunity.agenticScore.toFixed(1)}/10
                    </div>
                  </div>
                </div>

                {/* Why this is #1 */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Info size={14} />
                    ¿Por qué es la prioridad #1?
                  </h4>
                  <ul className="space-y-1">
                    {topOpportunity.whyPrioritized.slice(0, 4).map((reason, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right: Next steps */}
              <div className="lg:w-80 bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                <h4 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                  <ArrowRight size={14} />
                  Próximos Pasos
                </h4>
                <ol className="space-y-2">
                  {topOpportunity.nextSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-emerald-700">
                      <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
                <button className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                  Ver Detalle Completo
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Opportunity List - Answer "What else?" */}
      <div className="p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BarChart3 size={20} />
          Todas las Oportunidades Priorizadas
        </h3>

        <div className="space-y-3">
          {displayedOpportunities.slice(1).map((opp) => (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`border rounded-lg overflow-hidden transition-all ${
                expandedId === opp.id ? 'border-blue-300 shadow-md' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Collapsed view */}
              <div
                className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedId(expandedId === opp.id ? null : opp.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    opp.rank <= 3 ? 'bg-emerald-100 text-emerald-700' :
                    opp.rank <= 6 ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    #{opp.rank}
                  </div>

                  {/* Tier icon and name */}
                  <div className={`p-2 rounded-lg ${TIER_CONFIG[opp.tier].bgColor}`}>
                    {TIER_CONFIG[opp.tier].icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 truncate">
                      {opp.name.replace(/^[^\w\s]+\s*/, '')}
                    </h4>
                    <span className={`text-xs ${TIER_CONFIG[opp.tier].color}`}>
                      {TIER_CONFIG[opp.tier].label} • {TIER_CONFIG[opp.tier].timeline}
                    </span>
                  </div>

                  {/* Quick stats */}
                  <div className="hidden md:flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Ahorro</div>
                      <div className="font-bold text-green-600">€{(opp.savings / 1000).toFixed(0)}K</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Volumen</div>
                      <div className="font-semibold text-slate-700">{opp.volume.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Score</div>
                      <div className="font-semibold text-slate-700">{opp.agenticScore.toFixed(1)}</div>
                    </div>
                  </div>

                  {/* Visual bar: Value vs Effort */}
                  <div className="hidden lg:block w-32">
                    <div className="text-xs text-slate-500 mb-1">Valor / Esfuerzo</div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                      <div
                        className="bg-emerald-500 transition-all"
                        style={{ width: `${Math.min(100, opp.impact * 10)}%` }}
                      />
                      <div
                        className="bg-amber-400 transition-all"
                        style={{ width: `${Math.min(100 - opp.impact * 10, (10 - opp.feasibility) * 10)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>Valor</span>
                      <span>Esfuerzo</span>
                    </div>
                  </div>

                  {/* Expand icon */}
                  <motion.div
                    animate={{ rotate: expandedId === opp.id ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="text-slate-400" size={20} />
                  </motion.div>
                </div>
              </div>

              {/* Expanded details */}
              <AnimatePresence>
                {expandedId === opp.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-slate-50 border-t border-slate-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Why prioritized */}
                        <div>
                          <h5 className="text-sm font-semibold text-slate-700 mb-2">¿Por qué esta posición?</h5>
                          <ul className="space-y-1">
                            {opp.whyPrioritized.map((reason, i) => (
                              <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Metrics */}
                        <div>
                          <h5 className="text-sm font-semibold text-slate-700 mb-2">Métricas Clave</h5>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white rounded p-2 border border-slate-200">
                              <div className="text-xs text-slate-500">CV AHT</div>
                              <div className="font-semibold text-slate-700">{opp.cv_aht.toFixed(1)}%</div>
                            </div>
                            <div className="bg-white rounded p-2 border border-slate-200">
                              <div className="text-xs text-slate-500">Transfer Rate</div>
                              <div className="font-semibold text-slate-700">{opp.transfer_rate.toFixed(1)}%</div>
                            </div>
                            <div className="bg-white rounded p-2 border border-slate-200">
                              <div className="text-xs text-slate-500">FCR</div>
                              <div className="font-semibold text-slate-700">{opp.fcr_rate.toFixed(1)}%</div>
                            </div>
                            <div className="bg-white rounded p-2 border border-slate-200">
                              <div className="text-xs text-slate-500">Riesgo</div>
                              <div className={`font-semibold ${
                                opp.riskLevel === 'low' ? 'text-emerald-600' :
                                opp.riskLevel === 'medium' ? 'text-amber-600' : 'text-red-600'
                              }`}>
                                {opp.riskLevel === 'low' ? 'Bajo' : opp.riskLevel === 'medium' ? 'Medio' : 'Alto'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Next steps */}
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <h5 className="text-sm font-semibold text-slate-700 mb-2">Próximos Pasos</h5>
                        <div className="flex flex-wrap gap-2">
                          {opp.nextSteps.map((step, i) => (
                            <span key={i} className="bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-600">
                              {i + 1}. {step}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Show more button */}
        {enrichedOpportunities.length > 5 && (
          <button
            onClick={() => setShowAllOpportunities(!showAllOpportunities)}
            className="mt-4 w-full py-3 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            {showAllOpportunities ? (
              <>
                <ChevronDown size={16} className="rotate-180" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                Ver {enrichedOpportunities.length - 5} oportunidades más
              </>
            )}
          </button>
        )}
      </div>

      {/* Methodology note */}
      <div className="px-6 pb-6">
        <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-500">
          <div className="flex items-start gap-2">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              <strong>Metodología de priorización:</strong> Las oportunidades se ordenan por potencial de ahorro TCO (volumen × tasa de contención × diferencial CPI).
              La clasificación de tier (AUTOMATE/ASSIST/AUGMENT) se basa en el Agentic Readiness Score considerando predictibilidad (CV AHT),
              resolutividad (FCR + Transfer), volumen, calidad de datos y simplicidad del proceso.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpportunityPrioritizer;
