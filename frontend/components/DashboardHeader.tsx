import { motion } from 'framer-motion';
import { LayoutDashboard, Layers, Bot, Map } from 'lucide-react';
import { formatDateMonthYear } from '../utils/formatters';

export type TabId = 'executive' | 'dimensions' | 'readiness' | 'roadmap';

export interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

interface DashboardHeaderProps {
  title?: string;
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
}

const TABS: TabConfig[] = [
  { id: 'executive', label: 'Resumen', icon: LayoutDashboard },
  { id: 'dimensions', label: 'Dimensiones', icon: Layers },
  { id: 'readiness', label: 'Agentic Readiness', icon: Bot },
  { id: 'roadmap', label: 'Roadmap', icon: Map },
];

export function DashboardHeader({
  title = 'AIR EUROPA - Beyond CX Analytics',
  activeTab,
  onTabChange
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      {/* Top row: Title and Date */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base sm:text-xl font-bold text-slate-800 truncate">{title}</h1>
          <span className="text-xs sm:text-sm text-slate-500 flex-shrink-0">{formatDateMonthYear()}</span>
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
