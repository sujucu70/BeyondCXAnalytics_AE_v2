import React from 'react';
import { BenchmarkDataPoint } from '../types';
import { TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';
import MethodologyFooter from './MethodologyFooter';

interface BenchmarkReportProps {
  data: BenchmarkDataPoint[];
}

const BenchmarkBar: React.FC<{ user: number, industry: number, percentile: number, isLowerBetter?: boolean }> = ({ user, industry, percentile, isLowerBetter = false }) => {
    const isAbove = user > industry;
    const isPositive = isLowerBetter ? !isAbove : isAbove;
    const barWidth = `${percentile}%`;
    const barColor = percentile >= 75 ? 'bg-emerald-500' : percentile >= 50 ? 'bg-green-500' : percentile >= 25 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <div className="w-full bg-slate-200 rounded-full h-5 relative">
            <div className={`h-5 rounded-full ${barColor}`} style={{ width: barWidth }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
                 <span className="text-xs font-bold text-white text-shadow-sm">P{percentile}</span>
            </div>
        </div>
    );
};

const BenchmarkReport: React.FC<BenchmarkReportProps> = ({ data }) => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-2xl font-bold text-slate-800">Benchmark de Industria</h2>
         <div className="group relative">
            <HelpCircle size={18} className="text-slate-400 cursor-pointer" />
            <div className="absolute bottom-full mb-2 w-72 bg-slate-800 text-white text-xs rounded py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                Comparativa de tus KPIs principales frente a los promedios del sector (percentil 50). La barra indica tu posicionamiento percentil.
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
            </div>
        </div>
      </div>
      <p className="text-slate-600 mb-8">Análisis de tu rendimiento en métricas clave comparado con el promedio de la industria para contextualizar tus resultados.</p>
      
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
                <thead>
                    <tr className="text-left text-sm text-slate-600 border-b-2 border-slate-200">
                        <th className="p-4 font-semibold">Métrica (KPI)</th>
                        <th className="p-4 font-semibold text-center">Tu Operación</th>
                        <th className="p-4 font-semibold text-center">Industria (P50)</th>
                        <th className="p-4 font-semibold text-center">Gap</th>
                        <th className="p-4 font-semibold w-[200px]">Posicionamiento (Percentil)</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map(item => {
                        const isLowerBetter = item.kpi.toLowerCase().includes('aht') || item.kpi.toLowerCase().includes('coste');
                        const isAbove = item.userValue > item.industryValue;
                        const isPositive = isLowerBetter ? !isAbove : isAbove;
                        const gap = item.userValue - item.industryValue;
                        const gapPercent = (gap / item.industryValue) * 100;

                        return (
                            <tr key={item.kpi} className="border-b border-slate-200 last:border-0">
                                <td className="p-4 font-semibold text-slate-800">{item.kpi}</td>
                                <td className="p-4 font-semibold text-lg text-blue-600 text-center">{item.userDisplay}</td>
                                <td className="p-4 text-slate-600 text-center">{item.industryDisplay}</td>
                                <td className={`p-4 font-semibold text-sm text-center flex items-center justify-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                    {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    <span>{gapPercent.toFixed(1)}%</span>
                                </td>
                                <td className="p-4">
                                    <BenchmarkBar user={item.userValue} industry={item.industryValue} percentile={item.percentile} isLowerBetter={isLowerBetter} />
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
      </div>
      
      {/* Methodology Footer */}
      <MethodologyFooter
        sources="Gartner CX Benchmarking Study 2024 (N=250 contact centers) | Forrester Customer Service Benchmark 2024 | Datos internos (Q4 2024)"
        methodology="Peer Group: Contact centers en Telco/Tech, 200-500 agentes, Europa Occidental, omnichannel | Percentiles calculados sobre distribución de peer group | Fully-loaded costs incluyen overhead"
        notes="Benchmarks actualizados trimestralmente | Próxima actualización: Abril 2025 | Variabilidad por mix de canales y complejidad de productos ajustada por volumen"
        lastUpdated="Enero 2025"
      />
    </div>
  );
};

export default BenchmarkReport;
