import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Star, Award, Medal, ChevronDown, ChevronUp } from 'lucide-react';
import { TierKey } from '../types';
import { TIERS } from '../constants';
import clsx from 'clsx';

interface TierSelectorEnhancedProps {
  selectedTier: TierKey;
  onSelectTier: (tier: TierKey) => void;
}

const tierIcons = {
  gold: Award,
  silver: Medal,
  bronze: Star,
};

const tierGradients = {
  gold: 'from-yellow-400 via-yellow-500 to-amber-600',
  silver: 'from-slate-300 via-slate-400 to-slate-500',
  bronze: 'from-orange-400 via-orange-500 to-amber-700',
};

const TierSelectorEnhanced: React.FC<TierSelectorEnhancedProps> = ({
  selectedTier,
  onSelectTier,
}) => {
  const [showComparison, setShowComparison] = useState(false);

  const tiers: TierKey[] = ['gold', 'silver', 'bronze'];

  return (
    <div className="space-y-6">
      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tierKey, index) => {
          const tier = TIERS[tierKey];
          const Icon = tierIcons[tierKey];
          const isSelected = selectedTier === tierKey;
          const isRecommended = tierKey === 'silver';

          return (
            <motion.div
              key={tierKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              onClick={() => onSelectTier(tierKey)}
              className={clsx(
                'relative cursor-pointer rounded-xl border-2 transition-all duration-300 overflow-hidden',
                isSelected
                  ? 'border-blue-500 shadow-xl shadow-blue-500/20'
                  : 'border-slate-200 hover:border-slate-300 shadow-lg hover:shadow-xl'
              )}
            >
              {/* Recommended Badge */}
              {isRecommended && (
                <motion.div
                  initial={{ x: -100 }}
                  animate={{ x: 0 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="absolute top-4 -left-8 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-bold px-10 py-1 rotate-[-45deg] shadow-lg z-10"
                >
                  POPULAR
                </motion.div>
              )}

              {/* Selected Checkmark */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="absolute top-4 right-4 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg z-10"
                  >
                    <Check className="text-white" size={20} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Card Content */}
              <div className="p-6 bg-white">
                {/* Icon with Gradient */}
                <div className="flex justify-center mb-4">
                  <div
                    className={clsx(
                      'w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br',
                      tierGradients[tierKey],
                      'shadow-lg'
                    )}
                  >
                    <Icon className="text-white" size={32} />
                  </div>
                </div>

                {/* Tier Name */}
                <h3 className="text-2xl font-bold text-center text-slate-900 mb-2">
                  {tier.name}
                </h3>

                {/* Price */}
                <div className="text-center mb-4">
                  <span className="text-4xl font-bold text-slate-900">
                    €{tier.price.toLocaleString('es-ES')}
                  </span>
                  <span className="text-slate-500 text-sm ml-1">one-time</span>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 text-center mb-6 min-h-[60px]">
                  {tier.description}
                </p>

                {/* Key Features */}
                <ul className="space-y-2 mb-6">
                  {tier.features?.slice(0, 3).map((feature, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 + i * 0.05 }}
                      className="flex items-start gap-2 text-sm text-slate-700"
                    >
                      <Check className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
                      <span>{feature}</span>
                    </motion.li>
                  ))}
                </ul>

                {/* Select Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={clsx(
                    'w-full py-3 rounded-lg font-semibold transition-all duration-300',
                    isSelected
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  )}
                >
                  {isSelected ? 'Seleccionado' : 'Seleccionar'}
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Comparison Toggle */}
      <div className="text-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowComparison(!showComparison)}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          {showComparison ? (
            <>
              <ChevronUp size={20} />
              Ocultar Comparación
            </>
          ) : (
            <>
              <ChevronDown size={20} />
              Ver Comparación Detallada
            </>
          )}
        </motion.button>
      </div>

      {/* Comparison Table */}
      <AnimatePresence>
        {showComparison && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6">
              <h4 className="text-lg font-bold text-slate-900 mb-4">
                Comparación de Tiers
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 font-semibold text-slate-700">
                        Característica
                      </th>
                      {tiers.map((tierKey) => (
                        <th
                          key={tierKey}
                          className="text-center p-3 font-semibold text-slate-700"
                        >
                          {TIERS[tierKey].name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-200">
                      <td className="p-3 text-slate-700">Precio</td>
                      {tiers.map((tierKey) => (
                        <td key={tierKey} className="p-3 text-center font-semibold">
                          €{TIERS[tierKey].price.toLocaleString('es-ES')}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td className="p-3 text-slate-700">Tiempo de Entrega</td>
                      {tiers.map((tierKey) => (
                        <td key={tierKey} className="p-3 text-center">
                          {tierKey === 'gold' ? '7 días' : tierKey === 'silver' ? '10 días' : '14 días'}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-slate-200">
                      <td className="p-3 text-slate-700">Análisis de 8 Dimensiones</td>
                      {tiers.map((tierKey) => (
                        <td key={tierKey} className="p-3 text-center">
                          <Check className="text-green-500 mx-auto" size={20} />
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td className="p-3 text-slate-700">Roadmap Ejecutable</td>
                      {tiers.map((tierKey) => (
                        <td key={tierKey} className="p-3 text-center">
                          <Check className="text-green-500 mx-auto" size={20} />
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-slate-200">
                      <td className="p-3 text-slate-700">Modelo Económico ROI</td>
                      {tiers.map((tierKey) => (
                        <td key={tierKey} className="p-3 text-center">
                          {tierKey !== 'bronze' ? (
                            <Check className="text-green-500 mx-auto" size={20} />
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td className="p-3 text-slate-700">Sesión de Presentación</td>
                      {tiers.map((tierKey) => (
                        <td key={tierKey} className="p-3 text-center">
                          {tierKey === 'gold' ? (
                            <Check className="text-green-500 mx-auto" size={20} />
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TierSelectorEnhanced;
