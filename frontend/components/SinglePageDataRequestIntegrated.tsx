// components/SinglePageDataRequestIntegrated.tsx
// Versión simplificada con cabecera estilo dashboard

import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { TierKey, AnalysisData } from '../types';
import DataInputRedesigned from './DataInputRedesigned';
import DashboardTabs from './DashboardTabs';
import { generateAnalysis } from '../utils/analysisGenerator';
import toast from 'react-hot-toast';
import { useAuth } from '../utils/AuthContext';

// Función para formatear fecha como en el dashboard
const formatDate = (): string => {
  const now = new Date();
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
};

const SinglePageDataRequestIntegrated: React.FC = () => {
  const [view, setView] = useState<'form' | 'dashboard'>('form');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { authHeader, logout } = useAuth();

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
    // Validar que hay archivo
    if (!config.file) {
      toast.error('Por favor, sube un archivo CSV o Excel.');
      return;
    }

    // Validar coste por hora
    if (!config.costPerHour || config.costPerHour <= 0) {
      toast.error('Por favor, introduce el coste por hora del agente.');
      return;
    }

    // Exigir estar logado para analizar
    if (!authHeader) {
      toast.error('Debes iniciar sesión para analizar datos.');
      return;
    }

    setIsAnalyzing(true);
    toast.loading('Generando análisis...', { id: 'analyzing' });

    setTimeout(async () => {
      try {
        // Usar tier 'gold' por defecto
        const data = await generateAnalysis(
          'gold' as TierKey,
          config.costPerHour,
          config.avgCsat || 0,
          config.segmentMapping,
          config.file,
          config.sheetUrl,
          false, // No usar sintético
          authHeader || undefined
        );

        setAnalysisData(data);
        setIsAnalyzing(false);
        toast.dismiss('analyzing');
        toast.success('¡Análisis completado!', { icon: '🎉' });
        setView('dashboard');

        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (error) {
        console.error('Error generating analysis:', error);
        setIsAnalyzing(false);
        toast.dismiss('analyzing');

        const msg = (error as Error).message || '';

        if (msg.includes('401')) {
          toast.error('Sesión caducada o credenciales incorrectas. Vuelve a iniciar sesión.');
          logout();
        } else {
          toast.error('Error al generar el análisis: ' + msg);
        }
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
    try {
      return <DashboardTabs data={analysisData} onBack={handleBackToForm} />;
    } catch (error) {
      console.error('Error rendering dashboard:', error);
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

      <div className="min-h-screen bg-slate-50">
        {/* Header estilo dashboard */}
        <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-slate-800">
                AIR EUROPA - Beyond CX Analytics
              </h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500">{formatDate()}</span>
                <button
                  onClick={logout}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido principal */}
        <main className="max-w-7xl mx-auto px-6 py-6">
          <DataInputRedesigned
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />
        </main>
      </div>
    </>
  );
};

export default SinglePageDataRequestIntegrated;
