import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Clock, AlertCircle, TrendingUp } from 'lucide-react';

interface HourlyDistributionChartProps {
  hourly: number[];
  off_hours_pct: number;
  peak_hours: number[];
}

export function HourlyDistributionChart({ hourly, off_hours_pct, peak_hours }: HourlyDistributionChartProps) {
  // Preparar datos para el gráfico
  const chartData = hourly.map((value, hour) => ({
    hour: `${hour}:00`,
    hourNum: hour,
    volume: value,
    isPeak: peak_hours.includes(hour),
    isOffHours: hour < 8 || hour >= 19
  }));
  
  const totalVolume = hourly.reduce((a, b) => a + b, 0);
  const peakVolume = Math.max(...hourly);
  const avgVolume = totalVolume / 24;
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-semibold text-slate-900 mb-1">{data.hour}</p>
          <p className="text-sm text-slate-600">
            Volumen: <span className="font-medium text-slate-900">{data.volume.toLocaleString('es-ES')}</span>
          </p>
          <p className="text-sm text-slate-600">
            % del total: <span className="font-medium text-slate-900">
              {((data.volume / totalVolume) * 100).toFixed(1)}%
            </span>
          </p>
          {data.isPeak && (
            <p className="text-xs text-amber-600 mt-1">⚡ Hora pico</p>
          )}
          {data.isOffHours && (
            <p className="text-xs text-red-600 mt-1">🌙 Fuera de horario</p>
          )}
        </div>
      );
    }
    return null;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">
            Distribución Horaria de Interacciones
          </h3>
        </div>
        <p className="text-sm text-slate-600">
          Análisis del volumen de interacciones por hora del día
        </p>
      </div>
      
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-xs text-slate-600">Volumen Pico</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {peakVolume.toLocaleString('es-ES')}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {peak_hours.map(h => `${h}:00`).join(', ')}
          </div>
        </div>
        
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-slate-600">Promedio/Hora</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {Math.round(avgVolume).toLocaleString('es-ES')}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            24 horas
          </div>
        </div>
        
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-xs text-slate-600">Fuera de Horario</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {(off_hours_pct * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            19:00 - 08:00
          </div>
        </div>
      </div>
      
      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis 
              dataKey="hour" 
              tick={{ fontSize: 11, fill: '#64748B' }}
              interval={1}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#64748B' }}
              tickFormatter={(value) => value.toLocaleString('es-ES')}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine 
              y={avgVolume} 
              stroke="#6D84E3" 
              strokeDasharray="5 5"
              label={{ value: 'Promedio', position: 'right', fill: '#6D84E3', fontSize: 12 }}
            />
            <Bar 
              dataKey="volume" 
              fill="#6D84E3"
              radius={[4, 4, 0, 0]}
              animationDuration={1000}
            >
              {chartData.map((entry, index) => (
                <motion.rect
                  key={`bar-${index}`}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.02 }}
                  fill={
                    entry.isPeak ? '#F59E0B' :  // Amber for peaks
                    entry.isOffHours ? '#EF4444' :  // Red for off-hours
                    '#6D84E3'  // Corporate blue for normal
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#6D84E3]"></div>
          <span className="text-slate-600">Horario laboral (8-19h)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#F59E0B]"></div>
          <span className="text-slate-600">Horas pico</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#EF4444]"></div>
          <span className="text-slate-600">Fuera de horario</span>
        </div>
      </div>
      
      {/* Insight */}
      {off_hours_pct > 0.25 && (
        <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">
                Alto volumen fuera de horario laboral
              </p>
              <p className="text-sm text-amber-800">
                El {(off_hours_pct * 100).toFixed(0)}% de las interacciones ocurren fuera del horario 
                laboral estándar (19:00-08:00). Considera implementar cobertura 24/7 con agentes virtuales 
                para mejorar la experiencia del cliente y reducir costes.
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
