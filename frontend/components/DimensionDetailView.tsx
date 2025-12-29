
import React from 'react';
import { DimensionAnalysis, Finding, Recommendation } from '../types';
import { Lightbulb, Target } from 'lucide-react';

interface DimensionDetailViewProps {
  dimension: DimensionAnalysis;
  findings: Finding[];
  recommendations: Recommendation[];
}

const ScoreIndicator: React.FC<{ score: number }> = ({ score }) => {
    const getScoreColor = (s: number) => {
        if (s >= 80) return 'bg-emerald-500';
        if (s >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };
    return (
        <div className="flex items-center gap-2">
            <div className="w-24 bg-slate-200 rounded-full h-2.5">
                <div className={`${getScoreColor(score)} h-2.5 rounded-full`} style={{ width: `${score}%`}}></div>
            </div>
            <span className={`font-bold text-lg ${getScoreColor(score).replace('bg-', 'text-')}`}>{score}<span className="text-sm text-slate-500">/100</span></span>
        </div>
    )
};


const DimensionDetailView: React.FC<DimensionDetailViewProps> = ({ dimension, findings, recommendations }) => {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <dimension.icon size={24} className="text-blue-600" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-800">{dimension.title}</h2>
                <p className="text-sm text-slate-500">Análisis detallado de la dimensión</p>
            </div>
        </div>
        <hr className="my-4"/>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
                 <h3 className="text-sm font-semibold text-slate-600 mb-2">Puntuación</h3>
                 <ScoreIndicator score={dimension.score} />
            </div>
             <div className="md:col-span-2">
                 <h3 className="text-sm font-semibold text-slate-600 mb-2">Resumen</h3>
                 <p className="text-slate-700 text-sm">{dimension.summary}</p>
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                <h3 className="font-bold text-xl text-slate-800 mb-4 flex items-center gap-2">
                    <Lightbulb size={20} className="text-yellow-500" />
                    Hallazgos Clave
                </h3>
                {findings.length > 0 ? (
                    <ul className="space-y-3 text-sm text-slate-700 list-disc list-inside">
                        {findings.map((finding, i) => <li key={i}>{finding.text}</li>)}
                    </ul>
                ) : (
                    <p className="text-sm text-slate-500">No se encontraron hallazgos específicos para esta dimensión.</p>
                )}
            </div>
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                 <h3 className="font-bold text-xl text-blue-800 mb-4 flex items-center gap-2">
                    <Target size={20} className="text-blue-600" />
                    Recomendaciones
                </h3>
                {recommendations.length > 0 ? (
                     <ul className="space-y-3 text-sm text-blue-900 list-disc list-inside">
                        {recommendations.map((rec, i) => <li key={i}>{rec.text}</li>)}
                    </ul>
                ) : (
                    <p className="text-sm text-blue-700">No hay recomendaciones específicas para esta dimensión.</p>
                )}
            </div>
        </div>

    </div>
  );
};

export default DimensionDetailView;
