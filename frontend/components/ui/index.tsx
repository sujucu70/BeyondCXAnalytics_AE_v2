/**
 * v3.15: Componentes UI McKinsey
 *
 * Componentes base reutilizables que implementan el sistema de diseño.
 * Usar estos componentes en lugar de crear estilos ad-hoc.
 */

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  cn,
  CARD_BASE,
  SECTION_HEADER,
  BADGE_BASE,
  BADGE_SIZES,
  METRIC_BASE,
  STATUS_CLASSES,
  TIER_CLASSES,
  SPACING,
} from '../../config/designSystem';

// ============================================
// CARD
// ============================================

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'highlight' | 'muted';
  padding?: 'sm' | 'md' | 'lg' | 'none';
  className?: string;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  className,
}: CardProps) {
  return (
    <div
      className={cn(
        CARD_BASE,
        variant === 'highlight' && 'bg-gray-50 border-gray-300',
        variant === 'muted' && 'bg-gray-50 border-gray-100',
        padding !== 'none' && SPACING.card[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

// Card con indicador de status (borde superior)
interface StatusCardProps extends CardProps {
  status: 'critical' | 'warning' | 'success' | 'info' | 'neutral';
}

export function StatusCard({
  status,
  children,
  className,
  ...props
}: StatusCardProps) {
  const statusClasses = STATUS_CLASSES[status];

  return (
    <Card
      className={cn(
        'border-t-2',
        statusClasses.borderTop,
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

// ============================================
// SECTION HEADER
// ============================================

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: BadgeProps;
  action?: React.ReactNode;
  level?: 2 | 3 | 4;
  className?: string;
  noBorder?: boolean;
}

export function SectionHeader({
  title,
  subtitle,
  badge,
  action,
  level = 2,
  className,
  noBorder = false,
}: SectionHeaderProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const titleClass = level === 2
    ? SECTION_HEADER.title.h2
    : level === 3
    ? SECTION_HEADER.title.h3
    : SECTION_HEADER.title.h4;

  return (
    <div className={cn(
      SECTION_HEADER.wrapper,
      noBorder && 'border-b-0 pb-0 mb-2',
      className
    )}>
      <div>
        <div className="flex items-center gap-3">
          <Tag className={titleClass}>{title}</Tag>
          {badge && <Badge {...badge} />}
        </div>
        {subtitle && (
          <p className={SECTION_HEADER.subtitle}>{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ============================================
// BADGE
// ============================================

interface BadgeProps {
  label: string | number;
  variant?: 'default' | 'success' | 'warning' | 'critical' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  label,
  variant = 'default',
  size = 'sm',
  className,
}: BadgeProps) {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    critical: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
  };

  return (
    <span
      className={cn(
        BADGE_BASE,
        BADGE_SIZES[size],
        variantClasses[variant],
        className
      )}
    >
      {label}
    </span>
  );
}

// Badge para Tiers
interface TierBadgeProps {
  tier: 'AUTOMATE' | 'ASSIST' | 'AUGMENT' | 'HUMAN-ONLY';
  size?: 'sm' | 'md';
  className?: string;
}

export function TierBadge({ tier, size = 'sm', className }: TierBadgeProps) {
  const tierClasses = TIER_CLASSES[tier];

  return (
    <span
      className={cn(
        BADGE_BASE,
        BADGE_SIZES[size],
        tierClasses.bg,
        tierClasses.text,
        className
      )}
    >
      {tier}
    </span>
  );
}

// ============================================
// METRIC
// ============================================

interface MetricProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: 'success' | 'warning' | 'critical';
  comparison?: string;
  trend?: 'up' | 'down' | 'neutral';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Metric({
  label,
  value,
  unit,
  status,
  comparison,
  trend,
  size = 'md',
  className,
}: MetricProps) {
  const valueColorClass = !status
    ? 'text-gray-900'
    : status === 'success'
    ? 'text-emerald-600'
    : status === 'warning'
    ? 'text-amber-600'
    : 'text-red-600';

  return (
    <div className={cn('flex flex-col', className)}>
      <span className={METRIC_BASE.label}>{label}</span>
      <div className="flex items-baseline gap-1 mt-1">
        <span className={cn(METRIC_BASE.value[size], valueColorClass)}>
          {value}
        </span>
        {unit && <span className={METRIC_BASE.unit}>{unit}</span>}
        {trend && <TrendIndicator direction={trend} />}
      </div>
      {comparison && (
        <span className={METRIC_BASE.comparison}>{comparison}</span>
      )}
    </div>
  );
}

// Indicador de tendencia
function TrendIndicator({ direction }: { direction: 'up' | 'down' | 'neutral' }) {
  if (direction === 'up') {
    return <TrendingUp className="w-4 h-4 text-emerald-500" />;
  }
  if (direction === 'down') {
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  }
  return <Minus className="w-4 h-4 text-gray-400" />;
}

// ============================================
// KPI CARD (Metric in a card)
// ============================================

interface KPICardProps extends MetricProps {
  icon?: React.ReactNode;
}

export function KPICard({ icon, ...metricProps }: KPICardProps) {
  return (
    <Card padding="md" className="flex items-start gap-3">
      {icon && (
        <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
          {icon}
        </div>
      )}
      <Metric {...metricProps} />
    </Card>
  );
}

// ============================================
// STAT (inline stat for summaries)
// ============================================

interface StatProps {
  value: string | number;
  label: string;
  status?: 'success' | 'warning' | 'critical';
  className?: string;
}

export function Stat({ value, label, status, className }: StatProps) {
  const statusClasses = STATUS_CLASSES[status || 'neutral'];

  return (
    <div className={cn(
      'p-3 rounded-lg border',
      status ? statusClasses.bg : 'bg-gray-50',
      status ? statusClasses.border : 'border-gray-200',
      className
    )}>
      <p className={cn(
        'text-2xl font-bold',
        status ? statusClasses.text : 'text-gray-700'
      )}>
        {value}
      </p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  );
}

// ============================================
// DIVIDER
// ============================================

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-gray-200 my-4', className)} />;
}

// ============================================
// COLLAPSIBLE SECTION
// ============================================

interface CollapsibleProps {
  title: string;
  subtitle?: string;
  badge?: BadgeProps;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Collapsible({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children,
  className,
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className={cn('border border-gray-200 rounded-lg overflow-hidden', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-800">{title}</span>
          {badge && <Badge {...badge} />}
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          {subtitle && <span className="text-xs">{subtitle}</span>}
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-gray-200 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================
// DISTRIBUTION BAR
// ============================================

interface DistributionBarProps {
  segments: Array<{
    value: number;
    color: string;
    label?: string;
  }>;
  total?: number;
  height?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

export function DistributionBar({
  segments,
  total,
  height = 'md',
  showLabels = false,
  className,
}: DistributionBarProps) {
  const computedTotal = total || segments.reduce((sum, s) => sum + s.value, 0);
  const heightClass = height === 'sm' ? 'h-2' : height === 'md' ? 'h-3' : 'h-4';

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('flex rounded-full overflow-hidden bg-gray-100', heightClass)}>
        {segments.map((segment, idx) => {
          const pct = computedTotal > 0 ? (segment.value / computedTotal) * 100 : 0;
          if (pct <= 0) return null;

          return (
            <div
              key={idx}
              className={cn('flex items-center justify-center transition-all', segment.color)}
              style={{ width: `${pct}%` }}
              title={segment.label || `${pct.toFixed(0)}%`}
            >
              {showLabels && pct >= 10 && (
                <span className="text-[9px] text-white font-bold">
                  {pct.toFixed(0)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// TABLE COMPONENTS
// ============================================

export function Table({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-sm text-left', className)}>
        {children}
      </table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="text-xs text-gray-500 uppercase tracking-wide bg-gray-50">
      {children}
    </thead>
  );
}

export function Th({
  children,
  align = 'left',
  className,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  return (
    <th
      className={cn(
        'px-4 py-3 font-medium',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
    >
      {children}
    </th>
  );
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-gray-100">{children}</tbody>;
}

export function Tr({
  children,
  highlighted,
  className,
}: {
  children: React.ReactNode;
  highlighted?: boolean;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        'hover:bg-gray-50 transition-colors',
        highlighted && 'bg-blue-50',
        className
      )}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  align = 'left',
  className,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  return (
    <td
      className={cn(
        'px-4 py-3 text-gray-700',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
    >
      {children}
    </td>
  );
}

// ============================================
// EMPTY STATE
// ============================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="text-gray-300 mb-4">{icon}</div>}
      <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ============================================
// BUTTON
// ============================================

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled,
  className,
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
    >
      {children}
    </button>
  );
}
