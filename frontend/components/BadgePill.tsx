import React from 'react';
import { AlertCircle, AlertTriangle, Zap, CheckCircle, Clock } from 'lucide-react';

type BadgeType = 'critical' | 'warning' | 'info' | 'success' | 'priority';
type PriorityLevel = 'high' | 'medium' | 'low';
type ImpactLevel = 'high' | 'medium' | 'low';

interface BadgePillProps {
  type?: BadgeType;
  priority?: PriorityLevel;
  impact?: ImpactLevel;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

const BadgePill: React.FC<BadgePillProps> = ({
  type,
  priority,
  impact,
  label,
  size = 'md'
}) => {
  // Determinamos el estilo basado en el tipo
  let bgColor = 'bg-slate-100';
  let textColor = 'text-slate-700';
  let borderColor = 'border-slate-200';
  let icon = null;

  // Por tipo (crítico, warning, info)
  if (type === 'critical') {
    bgColor = 'bg-red-100';
    textColor = 'text-red-700';
    borderColor = 'border-red-300';
    icon = <AlertCircle size={14} className="text-red-600" />;
  } else if (type === 'warning') {
    bgColor = 'bg-amber-100';
    textColor = 'text-amber-700';
    borderColor = 'border-amber-300';
    icon = <AlertTriangle size={14} className="text-amber-600" />;
  } else if (type === 'info') {
    bgColor = 'bg-blue-100';
    textColor = 'text-blue-700';
    borderColor = 'border-blue-300';
    icon = <Zap size={14} className="text-blue-600" />;
  } else if (type === 'success') {
    bgColor = 'bg-green-100';
    textColor = 'text-green-700';
    borderColor = 'border-green-300';
    icon = <CheckCircle size={14} className="text-green-600" />;
  }

  // Por prioridad
  if (priority === 'high') {
    bgColor = 'bg-rose-100';
    textColor = 'text-rose-700';
    borderColor = 'border-rose-300';
    icon = <AlertCircle size={14} className="text-rose-600" />;
  } else if (priority === 'medium') {
    bgColor = 'bg-orange-100';
    textColor = 'text-orange-700';
    borderColor = 'border-orange-300';
    icon = <Clock size={14} className="text-orange-600" />;
  } else if (priority === 'low') {
    bgColor = 'bg-slate-100';
    textColor = 'text-slate-700';
    borderColor = 'border-slate-300';
  }

  // Por impacto
  if (impact === 'high') {
    bgColor = 'bg-purple-100';
    textColor = 'text-purple-700';
    borderColor = 'border-purple-300';
    icon = <Zap size={14} className="text-purple-600" />;
  } else if (impact === 'medium') {
    bgColor = 'bg-cyan-100';
    textColor = 'text-cyan-700';
    borderColor = 'border-cyan-300';
  } else if (impact === 'low') {
    bgColor = 'bg-teal-100';
    textColor = 'text-teal-700';
    borderColor = 'border-teal-300';
  }

  // Tamaños
  let paddingClass = 'px-2.5 py-1';
  let textClass = 'text-xs';

  if (size === 'sm') {
    paddingClass = 'px-2 py-0.5';
    textClass = 'text-xs';
  } else if (size === 'md') {
    paddingClass = 'px-3 py-1.5';
    textClass = 'text-sm';
  } else if (size === 'lg') {
    paddingClass = 'px-4 py-2';
    textClass = 'text-base';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${paddingClass} rounded-full border ${bgColor} ${textColor} ${borderColor} ${textClass} font-medium whitespace-nowrap`}
    >
      {icon}
      {label}
    </span>
  );
};

export default BadgePill;
