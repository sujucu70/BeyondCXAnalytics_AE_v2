import React from 'react';
import { motion } from 'framer-motion';
import { Check, Package, Upload, BarChart3 } from 'lucide-react';
import clsx from 'clsx';

interface Step {
  id: number;
  label: string;
  icon: React.ElementType;
}

interface ProgressStepperProps {
  currentStep: number;
}

const steps: Step[] = [
  { id: 1, label: 'Seleccionar Tier', icon: Package },
  { id: 2, label: 'Subir Datos', icon: Upload },
  { id: 3, label: 'Ver Resultados', icon: BarChart3 },
];

const ProgressStepper: React.FC<ProgressStepperProps> = ({ currentStep }) => {
  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <div className="relative flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isUpcoming = currentStep < step.id;

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <div className="relative flex flex-col items-center z-10">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={clsx(
                    'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                    isCompleted && 'bg-green-500 border-green-500',
                    isCurrent && 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/50',
                    isUpcoming && 'bg-white border-slate-300'
                  )}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                    >
                      <Check className="text-white" size={24} />
                    </motion.div>
                  ) : (
                    <Icon
                      className={clsx(
                        'transition-colors',
                        isCurrent && 'text-white',
                        isUpcoming && 'text-slate-400'
                      )}
                      size={20}
                    />
                  )}
                </motion.div>

                {/* Step Label */}
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.1 }}
                  className={clsx(
                    'mt-2 text-sm font-medium text-center whitespace-nowrap',
                    (isCompleted || isCurrent) && 'text-slate-900',
                    isUpcoming && 'text-slate-500'
                  )}
                >
                  {step.label}
                </motion.span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 bg-slate-200 mx-4 relative -mt-6">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-green-500 to-blue-600 h-full"
                    initial={{ width: '0%' }}
                    animate={{
                      width: currentStep > step.id ? '100%' : '0%',
                    }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressStepper;
