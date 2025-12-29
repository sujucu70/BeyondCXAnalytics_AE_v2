import React from 'react';
import { Info } from 'lucide-react';

interface MethodologyFooterProps {
  sources?: string;
  methodology?: string;
  notes?: string;
  lastUpdated?: string;
}

/**
 * MethodologyFooter - McKinsey-style footer for charts and visualizations
 * 
 * Displays sources, methodology, notes, and last updated information
 * in a professional, consulting-grade format.
 */
const MethodologyFooter: React.FC<MethodologyFooterProps> = ({
  sources,
  methodology,
  notes,
  lastUpdated,
}) => {
  if (!sources && !methodology && !notes && !lastUpdated) {
    return null;
  }

  return (
    <div className="mt-6 pt-4 border-t border-slate-200">
      <div className="space-y-2 text-xs text-slate-600">
        {sources && (
          <div className="flex items-start gap-2">
            <Info size={12} className="mt-0.5 text-slate-400 flex-shrink-0" />
            <div>
              <span className="font-semibold text-slate-700">Fuentes: </span>
              <span>{sources}</span>
            </div>
          </div>
        )}
        
        {methodology && (
          <div className="flex items-start gap-2">
            <Info size={12} className="mt-0.5 text-slate-400 flex-shrink-0" />
            <div>
              <span className="font-semibold text-slate-700">Metodología: </span>
              <span>{methodology}</span>
            </div>
          </div>
        )}
        
        {notes && (
          <div className="flex items-start gap-2">
            <Info size={12} className="mt-0.5 text-slate-400 flex-shrink-0" />
            <div>
              <span className="font-semibold text-slate-700">Nota: </span>
              <span>{notes}</span>
            </div>
          </div>
        )}
        
        {lastUpdated && (
          <div className="text-slate-500 italic">
            Última actualización: {lastUpdated}
          </div>
        )}
      </div>
    </div>
  );
};

export default MethodologyFooter;
