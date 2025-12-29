import React from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Grid3x3, 
  Activity, 
  Target, 
  Map, 
  DollarSign, 
  BarChart,
  Download,
  Share2
} from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface DashboardNavigationProps {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  onExport?: () => void;
  onShare?: () => void;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
  { id: 'dimensions', label: 'Dimensiones', icon: Grid3x3 },
  { id: 'heatmap', label: 'Heatmap', icon: Activity },
  { id: 'opportunities', label: 'Oportunidades', icon: Target },
  { id: 'roadmap', label: 'Roadmap', icon: Map },
  { id: 'economics', label: 'Modelo Económico', icon: DollarSign },
  { id: 'benchmark', label: 'Benchmark', icon: BarChart },
];

const DashboardNavigation: React.FC<DashboardNavigationProps> = ({
  activeSection,
  onSectionChange,
  onExport,
  onShare,
}) => {
  const scrollToSection = (sectionId: string) => {
    onSectionChange(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="sticky top-0 bg-white border-b border-slate-200 z-50 shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Navigation Items */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <motion.button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={clsx(
                    'relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                    isActive
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  
                  {isActive && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                      layoutId="activeIndicator"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-4">
            {onShare && (
              <motion.button
                onClick={onShare}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Share2 size={16} />
                <span className="hidden sm:inline">Compartir</span>
              </motion.button>
            )}
            
            {onExport && (
              <motion.button
                onClick={onExport}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Download size={16} />
                <span className="hidden sm:inline">Exportar</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNavigation;
