// components/SinglePageDataRequestIntegrated.tsx
// Versión integrada con DataInputRedesigned + Dashboard actual

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { TierKey, AnalysisData } from '../types';
import TierSelectorEnhanced from './TierSelectorEnhanced';
import DataInputRedesigned from './DataInputRedesigned';
import DashboardReorganized from './DashboardReorganized';
import { generateAnalysis } from '../utils/analysisGenerator';
import toast from 'react-hot-toast';

const SinglePageDataRequestIntegrated: React.FC = () => {
  const [selectedTier, setSelectedTier] = useState<TierKey>('silver');
  const [view, setView] = useState<'form' | 'dashboard'>('form');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleTierSelect = (tier: TierKey) => {
    setSelectedTier(tier);
  };

  const handleAnalyze = (config: {
    costPerHour: number;
    avgCsat: number;
    segmentMapping?: {
      high_value_queues: string[];
      medium_value_queues: string[];
      low_value_queues: string[];
    };
    file?: File;
    sheetUrl?: string;
    useSynthetic?: boolean;
  }) => {
    console.log('🚀 handleAnalyze called with config:', config);
    console.log('🎯 Selected tier:', selectedTier);
    console.log('📄 File:', config.file);
    console.log('🔗 Sheet URL:', config.sheetUrl);
    console.log('✨ Use Synthetic:', config.useSynthetic);
    
    // Validar que hay datos
    if (!config.file && !config.sheetUrl && !config.useSynthetic) {
      toast.error('Por favor, sube un archivo, introduce una URL o genera datos sintéticos.');
      return;
    }
    
    setIsAnalyzing(true);
    toast.loading('Generando análisis...', { id: 'analyzing' });
    
    setTimeout(async () => {
      console.log('⏰ Generating analysis...');
      try {
        const data = await generateAnalysis(
          selectedTier, 
          config.costPerHour, 
          config.avgCsat, 
          config.segmentMapping,
          config.file,
          config.sheetUrl,
          config.useSynthetic
        );
        console.log('✅ Analysis generated successfully');
        
        setAnalysisData(data);
        setIsAnalyzing(false);
        toast.dismiss('analyzing');
        toast.success('¡Análisis completado!', { icon: '🎉' });
        setView('dashboard');
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (error) {
        console.error('❌ Error generating analysis:', error);
        setIsAnalyzing(false);
        toast.dismiss('analyzing');
        toast.error('Error al generar el análisis: ' + (error as Error).message);
      }
    }, 1500);
  };

  const handleBackToForm = () => {
    setView('form');
    setAnalysisData(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dashboard view
  if (view === 'dashboard' && analysisData) {
    console.log('📊 Rendering dashboard with data:', analysisData);
    console.log('📊 Heatmap data length:', analysisData.heatmapData?.length);
    console.log('📊 Dimensions length:', analysisData.dimensions?.length);
    
    try {
      return <DashboardReorganized analysisData={analysisData} onBack={handleBackToForm} />;
    } catch (error) {
      console.error('❌ Error rendering dashboard:', error);
      return (
        <div className="min-h-screen bg-red-50 p-8">
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error al renderizar dashboard</h1>
            <p className="text-slate-700 mb-4">{(error as Error).message}</p>
            <button
              onClick={handleBackToForm}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
            >
              Volver al formulario
            </button>
          </div>
        </div>
      );
    }
  }

  // Form view
  return (
    <>
      <Toaster position="top-right" />
      
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-[#E8EBFA] to-slate-100 font-sans">
        <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3">
              Beyond Diagnostic
            </h1>
            <p className="text-lg text-slate-600">
              Análisis de Readiness Agéntico para Contact Centers
            </p>
          </motion.div>

          {/* Tier Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg p-8"
          >
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                Selecciona tu Tier de Análisis
              </h2>
              <p className="text-slate-600">
                Elige el nivel de profundidad que necesitas para tu diagnóstico
              </p>
            </div>

            <TierSelectorEnhanced
              selectedTier={selectedTier}
              onSelectTier={handleTierSelect}
            />
          </motion.div>

          {/* Data Input - Using redesigned component */}
          <DataInputRedesigned
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />
        </div>
      </div>
    </>
  );
};

export default SinglePageDataRequestIntegrated;
