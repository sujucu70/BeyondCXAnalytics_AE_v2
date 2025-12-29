import React from 'react';
import { motion } from 'framer-motion';
import { AnalysisData, Kpi } from '../types';
import { TIERS } from '../constants';
import { ArrowLeft, BarChart2, Lightbulb, Target, Phone, Smile } from 'lucide-react';
import BadgePill from './BadgePill';

import HealthScoreGaugeEnhanced from './HealthScoreGaugeEnhanced';
import DimensionCard from './DimensionCard';
import HeatmapPro from './HeatmapPro';
import VariabilityHeatmap from './VariabilityHeatmap';
import OpportunityMatrixPro from './OpportunityMatrixPro';
import RoadmapPro from './RoadmapPro';
import EconomicModelPro from './EconomicModelPro';
import BenchmarkReportPro from './BenchmarkReportPro';
import { AgenticReadinessBreakdown } from './AgenticReadinessBreakdown';
import { HourlyDistributionChart } from './HourlyDistributionChart';
import ErrorBoundary from './ErrorBoundary';

interface DashboardReorganizedProps {
  analysisData: AnalysisData;
  onBack: () => void;
}

const KpiCard: React.FC<Kpi & { index: number }> = ({ label, value, change, changeType, index }) => {
  const changeColor = changeType === 'positive' ? 'bg-green-100 text-green-700' : changeType === 'negative' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.1 }}
      whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
      className="bg-white p-5 rounded-lg border border-slate-200"
    >
      <p className="text-sm text-slate-500 mb-1 truncate">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        {change && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 + index * 0.1, type: 'spring' }}
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${changeColor}`}
          >
            {change}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
};

const SectionDivider: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-3 my-8">
    <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent flex-1" />
    <div className="flex items-center gap-2 text-slate-700">
      {icon}
      <span className="font-bold text-lg">{title}</span>
    </div>
    <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent flex-1" />
  </div>
);

const DashboardReorganized: React.FC<DashboardReorganizedProps> = ({ analysisData, onBack }) => {
  const tierInfo = TIERS[analysisData.tier || 'gold'];  // Default to gold if tier is undefined

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            Volver
          </motion.button>
          
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${tierInfo.color} flex items-center justify-center`}>
              <BarChart2 className="text-white" size={16} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Beyond Diagnostic</h1>
              <p className="text-xs text-slate-500">{tierInfo.name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        
        {/* 1. HERO SECTION */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#5669D0] via-[#6D84E3] to-[#8A9EE8] rounded-2xl p-8 md:p-10 shadow-2xl"
          >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
              {/* Health Score */}
              <div className="lg:col-span-1">
                <HealthScoreGaugeEnhanced
                  score={analysisData.overallHealthScore}
                  previousScore={analysisData.overallHealthScore - 7}
                  industryAverage={65}
                  animated={true}
                />
              </div>

              {/* KPIs Agrupadas por Categoría */}
              <div className="lg:col-span-3">
                {/* Grupo 1: Métricas de Contacto */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Phone size={18} className="text-white" />
                    <h3 className="text-white text-lg font-bold">Métricas de Contacto</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {(analysisData.summaryKpis || []).slice(0, 4).map((kpi, index) => (
                      <KpiCard
                        key={kpi.label}
                        {...kpi}
                        index={index}
                      />
                    ))}
                  </div>
                </div>

                {/* Grupo 2: Métricas de Satisfacción */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Smile size={18} className="text-white" />
                    <h3 className="text-white text-lg font-bold">Métricas de Satisfacción</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {(analysisData.summaryKpis || []).slice(2, 4).map((kpi, index) => (
                      <KpiCard
                        key={kpi.label}
                        {...kpi}
                        index={index + 2}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* 2. INSIGHTS SECTION - FINDINGS */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-8">
              <h3 className="font-bold text-2xl text-amber-900 mb-6 flex items-center gap-2">
                <Lightbulb size={28} className="text-amber-600" />
                Principales Hallazgos
              </h3>
              <div className="space-y-5">
                {(analysisData.findings || []).map((finding, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white rounded-lg p-5 border border-amber-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        {finding.title && (
                          <h4 className="font-bold text-amber-900 mb-1">{finding.title}</h4>
                        )}
                        <p className="text-sm text-amber-900">{finding.text}</p>
                      </div>
                      <BadgePill
                        type={finding.type as any}
                        impact={finding.impact as any}
                        label={
                          finding.type === 'critical' ? 'Crítico' :
                          finding.type === 'warning' ? 'Alerta' : 'Información'
                        }
                        size="sm"
                      />
                    </div>
                    {finding.description && (
                      <p className="text-xs text-slate-600 italic mt-3 pl-3 border-l-2 border-amber-300">
                        {finding.description}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* 3. INSIGHTS SECTION - RECOMMENDATIONS */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="bg-[#E8EBFA] border-2 border-[#6D84E3] rounded-xl p-8">
              <h3 className="font-bold text-2xl text-[#3F3F3F] mb-6 flex items-center gap-2">
                <Target size={28} className="text-[#6D84E3]" />
                Recomendaciones Prioritarias
              </h3>
              <div className="space-y-5">
                {(analysisData.recommendations || []).map((rec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white rounded-lg p-5 border border-blue-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        {rec.title && (
                          <h4 className="font-bold text-[#3F3F3F] mb-1">{rec.title}</h4>
                        )}
                        <p className="text-sm text-[#3F3F3F] mb-2">{rec.text}</p>
                      </div>
                      <BadgePill
                        priority={rec.priority as any}
                        label={
                          rec.priority === 'high' ? 'Alta Prioridad' :
                          rec.priority === 'medium' ? 'Prioridad Media' : 'Baja Prioridad'
                        }
                        size="sm"
                      />
                    </div>

                    {(rec.description || rec.impact || rec.timeline) && (
                      <div className="bg-slate-50 rounded p-3 mt-3 border-l-4 border-[#6D84E3]">
                        {rec.description && (
                          <p className="text-xs text-slate-700 mb-2">
                            <span className="font-semibold">Descripción:</span> {rec.description}
                          </p>
                        )}
                        {rec.impact && (
                          <p className="text-xs text-slate-700 mb-2">
                            <span className="font-semibold text-green-700">Impacto esperado:</span> {rec.impact}
                          </p>
                        )}
                        {rec.timeline && (
                          <p className="text-xs text-slate-700">
                            <span className="font-semibold">Timeline:</span> {rec.timeline}
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* 4. ANÁLISIS DIMENSIONAL */}
        <section>
          <SectionDivider
            icon={<BarChart2 size={20} className="text-blue-600" />}
            title="Análisis Dimensional"
          />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {(analysisData.dimensions || []).map((dim, index) => (
              <motion.div
                key={dim.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <DimensionCard dimension={dim} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* 4. AGENTIC READINESS (si disponible) */}
        {analysisData.agenticReadiness && (
          <section>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <AgenticReadinessBreakdown agenticReadiness={analysisData.agenticReadiness} />
            </motion.div>
          </section>
        )}

        {/* 5. DISTRIBUCIÓN HORARIA (si disponible) */}
        {(() => {
          const volumetryDim = analysisData?.dimensions?.find(d => d.name === 'volumetry_distribution');
          const distData = volumetryDim?.distribution_data;
          
          if (distData && distData.hourly && distData.hourly.length > 0) {
            return (
              <section>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <HourlyDistributionChart 
                    hourly={distData.hourly}
                    off_hours_pct={distData.off_hours_pct}
                    peak_hours={distData.peak_hours}
                  />
                </motion.div>
              </section>
            );
          }
          return null;
        })()}

        {/* 6. HEATMAP DE PERFORMANCE COMPETITIVO */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <ErrorBoundary componentName="Heatmap de Métricas">
              <HeatmapPro data={analysisData.heatmapData} />
            </ErrorBoundary>
          </motion.div>
        </section>

        {/* 7. HEATMAP DE VARIABILIDAD INTERNA */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <VariabilityHeatmap data={analysisData.heatmapData} />
          </motion.div>
        </section>

        {/* 8. OPPORTUNITY MATRIX */}
        {analysisData.opportunities && analysisData.opportunities.length > 0 && (
          <section>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <OpportunityMatrixPro data={analysisData.opportunities} heatmapData={analysisData.heatmapData} />
            </motion.div>
          </section>
        )}

        {/* 9. ROADMAP */}
        {analysisData.roadmap && analysisData.roadmap.length > 0 && (
          <section>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <RoadmapPro data={analysisData.roadmap} />
            </motion.div>
          </section>
        )}

        {/* 10. ECONOMIC MODEL */}
        {analysisData.economicModel && (
          <section>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <EconomicModelPro data={analysisData.economicModel} />
            </motion.div>
          </section>
        )}

        {/* 11. BENCHMARK REPORT */}
        {analysisData.benchmarkData && analysisData.benchmarkData.length > 0 && (
          <section>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <BenchmarkReportPro data={analysisData.benchmarkData} />
            </motion.div>
          </section>
        )}

        {/* Footer */}
        <section className="pt-8 pb-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 bg-[#6D84E3] text-white px-8 py-4 rounded-xl hover:bg-[#5669D0] transition-colors shadow-lg hover:shadow-xl font-semibold text-lg"
            >
              <ArrowLeft size={20} />
              Realizar Nuevo Análisis
            </motion.button>
          </motion.div>
        </section>
      </main>
    </div>
  );
};

export default DashboardReorganized;
