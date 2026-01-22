import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { DashboardHeader, TabId } from './DashboardHeader';
import { formatDateMonthYear } from '../utils/formatters';
import { ExecutiveSummaryTab } from './tabs/ExecutiveSummaryTab';
import { DimensionAnalysisTab } from './tabs/DimensionAnalysisTab';
import { AgenticReadinessTab } from './tabs/AgenticReadinessTab';
import { RoadmapTab } from './tabs/RoadmapTab';
import { Law10Tab } from './tabs/Law10Tab';
import { MetodologiaDrawer } from './MetodologiaDrawer';
import type { AnalysisData } from '../types';

interface DashboardTabsProps {
  data: AnalysisData;
  title?: string;
  onBack?: () => void;
}

export function DashboardTabs({
  data,
  title = 'AIR EUROPA - Beyond CX Analytics',
  onBack
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('executive');
  const [metodologiaOpen, setMetodologiaOpen] = useState(false);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'executive':
        return <ExecutiveSummaryTab data={data} onTabChange={setActiveTab} />;
      case 'dimensions':
        return <DimensionAnalysisTab data={data} />;
      case 'readiness':
        return <AgenticReadinessTab data={data} onTabChange={setActiveTab} />;
      case 'roadmap':
        return <RoadmapTab data={data} />;
      case 'law10':
        return <Law10Tab data={data} onTabChange={setActiveTab} />;
      default:
        return <ExecutiveSummaryTab data={data} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back button */}
      {onBack && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver al formulario</span>
              <span className="sm:hidden">Volver</span>
            </button>
          </div>
        </div>
      )}

      {/* Sticky Header with Tabs */}
      <DashboardHeader
        title={title}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onMetodologiaClick={() => setMetodologiaOpen(true)}
      />

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-slate-500">
            <span className="hidden sm:inline">Beyond Diagnosis - Contact Center Analytics Platform</span>
            <span className="sm:hidden text-xs">Beyond Diagnosis</span>
            <span className="text-xs sm:text-sm text-slate-400 italic">{formatDateMonthYear()}</span>
          </div>
        </div>
      </footer>

      {/* Drawer de Metodología */}
      <MetodologiaDrawer
        isOpen={metodologiaOpen}
        onClose={() => setMetodologiaOpen(false)}
        data={data}
      />
    </div>
  );
}

export default DashboardTabs;
