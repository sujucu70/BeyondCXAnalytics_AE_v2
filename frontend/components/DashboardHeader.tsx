import { motion } from 'framer-motion';
import { LayoutDashboard, Layers, Bot, Map, ShieldCheck, Info, Scale } from 'lucide-react';

export type TabId = 'executive' | 'dimensions' | 'readiness' | 'roadmap' | 'law10';

export interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

interface DashboardHeaderProps {
  title?: string;
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  onMetodologiaClick?: () => void;
}

const TABS: TabConfig[] = [
  { id: 'executive', label: 'Resumen', icon: LayoutDashboard },
  { id: 'dimensions', label: 'Dimensiones', icon: Layers },
  { id: 'readiness', label: 'Agentic Readiness', icon: Bot },
  { id: 'roadmap', label: 'Roadmap', icon: Map },
  { id: 'law10', label: 'Ley 10/2025', icon: Scale },
];

export function DashboardHeader({
  title = 'AIR EUROPA - Beyond CX Analytics',
  activeTab,
  onTabChange,
  onMetodologiaClick
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      {/* Top row: Title and Metodología Badge */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base sm:text-xl font-bold text-slate-800 truncate">{title}</h1>
          {onMetodologiaClick && (
            <button
              onClick={onMetodologiaClick}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-green-100 text-green-800 rounded-full text-[10px] sm:text-xs font-medium hover:bg-green-200 transition-colors cursor-pointer flex-shrink-0"
            >
              <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden md:inline">Metodología de Transformación de Datos aplicada</span>
              <span className="md:hidden">Metodología</span>
              <Info className="w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-60" />
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <nav className="max-w-7xl mx-auto px-2 sm:px-6 overflow-x-auto">
        <div className="flex space-x-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  relative flex items-center gap-2 px-4 py-3 text-sm font-medium
                  transition-colors duration-200
                  ${isActive
                    ? 'text-[#6D84E3]'
                    : 'text-slate-500 hover:text-slate-700'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6D84E3]"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

export default DashboardHeader;
