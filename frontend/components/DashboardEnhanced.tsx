import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalysisData, Kpi } from '../types';
import { TIERS } from '../constants';
import { ArrowLeft, BarChart2, Lightbulb, Target } from 'lucide-react';

import DashboardNavigation from './DashboardNavigation';
import HealthScoreGaugeEnhanced from './HealthScoreGaugeEnhanced';
import DimensionCard from './DimensionCard';
import HeatmapEnhanced from './HeatmapEnhanced';
import OpportunityMatrixEnhanced from './OpportunityMatrixEnhanced';
import Roadmap from './Roadmap';
import EconomicModelEnhanced from './EconomicModelEnhanced';
import BenchmarkReport from './BenchmarkReport';

interface DashboardEnhancedProps {
  analysisData: AnalysisData;
  onBack: () => void;
}

const KpiCard: React.FC<Kpi & { index: number }> = ({ label, value, change, changeType, index }) => {
    const changeColor = changeType === 'positive' ? 'bg-green-100 text-green-700' : changeType === 'negative' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700';
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
            className="bg-white p-4 rounded-lg border border-slate-200 cursor-pointer"
        >
            <p className="text-sm text-slate-500 mb-1 truncate">{label}</p>
            <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-slate-800">{value}</p>
                {change && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3 + index * 0.1, type: 'spring' }}
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${changeColor}`}
                    >
                        {change}
                    </motion.span>
                )}
            </div>
        </motion.div>
    );
};

const DashboardEnhanced: React.FC<DashboardEnhancedProps> = ({ analysisData, onBack }) => {
  const tierInfo = TIERS[analysisData.tier];
  const [activeSection, setActiveSection] = useState('overview');

  // Observe sections for active state
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.3 }
    );

    const sections = ['overview', 'dimensions', 'heatmap', 'opportunities', 'roadmap', 'economics', 'benchmark'];
    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const handleExport = () => {
    // Placeholder for export functionality
    alert('Funcionalidad de exportación próximamente...');
  };

  const handleShare = () => {
    // Placeholder for share functionality
    alert('Funcionalidad de compartir próximamente...');
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 font-sans">
      {/* Navigation */}
      <DashboardNavigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onExport={handleExport}
        onShare={handleShare}
      />

      <div className="max-w-screen-2xl mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6">
        {/* Left Sidebar (Fixed) */}
        <aside className="w-full md:w-96 flex-shrink-0">
          <div className="sticky top-24 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-lg ${tierInfo.color} flex items-center justify-center`}>
                <BarChart2 className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Diagnóstico</h1>
                <p className="text-sm text-slate-500">{tierInfo.name}</p>
              </div>
            </motion.div>
            
            <HealthScoreGaugeEnhanced 
              score={analysisData.overallHealthScore}
              previousScore={analysisData.overallHealthScore - 7}
              industryAverage={65}
              animated={true}
            />

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-lg border border-slate-200"
            >
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                    <Lightbulb size={20} className="text-yellow-500" />
                    Principales Hallazgos
                </h3>
                <ul className="space-y-3 text-sm text-slate-700">
                    {analysisData.keyFindings.map((finding, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="flex gap-2"
                      >
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{finding.text}</span>
                      </motion.li>
                    ))}
                </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-blue-50 p-6 rounded-lg border border-blue-200"
            >
                 <h3 className="font-bold text-lg text-blue-800 mb-4 flex items-center gap-2">
                    <Target size={20} className="text-blue-600" />
                    Recomendaciones
                </h3>
                 <ul className="space-y-3 text-sm text-blue-900">
                    {analysisData.recommendations.map((rec, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        className="flex gap-2"
                      >
                        <span className="text-blue-600 mt-1">→</span>
                        <span>{rec.text}</span>
                      </motion.li>
                    ))}
                </ul>
            </motion.div>
            
            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 bg-white text-slate-700 px-4 py-3 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm font-medium"
            >
              <ArrowLeft size={16} />
              Nuevo Análisis
            </motion.button>
          </div>
        </aside>

        {/* Main Content Area (Scrollable) */}
        <main className="flex-1 space-y-8">
          {/* Overview Section */}
          <section id="overview" className="scroll-mt-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Resumen Ejecutivo</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {analysisData.summaryKpis.map((kpi, index) => (
                      <KpiCard 
                          key={kpi.label} 
                          {...kpi}
                          index={index}
                      />
                  ))}
              </div>
            </motion.div>
          </section>
          
          {/* Dimensional Analysis */}
          <section id="dimensions" className="scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Análisis Dimensional</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {analysisData.dimensions.map((dim, index) => (
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
                </div>
              </motion.div>
          </section>

          {/* Strategic Visualizations */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <HeatmapEnhanced data={analysisData.heatmap} />
            <OpportunityMatrixEnhanced data={analysisData.opportunityMatrix} />
            
            <div id="roadmap" className="scroll-mt-24">
              <Roadmap data={analysisData.roadmap} />
            </div>
            
            <EconomicModelEnhanced data={analysisData.economicModel} />
            
            <div id="benchmark" className="scroll-mt-24">
              <BenchmarkReport data={analysisData.benchmarkReport} />
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default DashboardEnhanced;
