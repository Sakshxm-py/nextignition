import { motion } from 'framer-motion';

interface IgnishaAIBrandmarkProps {
  size?: 24 | 32 | 60;
  variant?: 'default' | 'loading' | 'glow';
  className?: string;
}

export function IgnishaAIBrandmark({ size = 32, variant = 'default', className = '' }: IgnishaAIBrandmarkProps) {
  const sizeClasses = {
    24: 'w-6 h-6 text-xl',
    32: 'w-8 h-8 text-2xl',
    60: 'w-15 h-15 text-5xl'
  };

  if (variant === 'loading') {
    return (
      <motion.div 
        className={`${sizeClasses[size]} relative flex items-center justify-center ${className}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#6666FF] to-[#F78405] opacity-30 blur-sm" />
        <span className="relative font-bold text-[#6666FF]" style={{ fontFamily: 'Funnel Display' }}>
          א
        </span>
      </motion.div>
    );
  }

  if (variant === 'glow') {
    return (
      <motion.div 
        className={`${sizeClasses[size]} relative flex items-center justify-center ${className}`}
        animate={{ 
          boxShadow: [
            '0 0 20px rgba(102, 102, 255, 0.3)',
            '0 0 40px rgba(102, 102, 255, 0.6)',
            '0 0 20px rgba(102, 102, 255, 0.3)',
          ]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="font-bold text-[#6666FF]" style={{ fontFamily: 'Funnel Display' }}>
          א
        </span>
      </motion.div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} flex items-center justify-center ${className}`}>
      <span className="font-bold text-[#6666FF]" style={{ fontFamily: 'Funnel Display' }}>
        א
      </span>
    </div>
  );
}
