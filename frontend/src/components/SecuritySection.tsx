import { motion } from 'framer-motion';
import { Shield, Lock, Eye, FileCheck, Search } from 'lucide-react';
import { brandColors } from '../utils/colors';

export function SecuritySection() {
  const securityFeatures = [
    {
      icon: Lock,
      title: 'End to End Encryption',
      description: 'Your data is protected with enterprise grade encryption standards.',
      color: brandColors.atomicOrange,
    },
    {
      icon: Shield,
      title: 'Secure Data Storage',
      description: 'All data is stored securely with regular backups and recovery systems.',
      color: brandColors.electricBlue,
    },
    {
      icon: Eye,
      title: 'Privacy Controls',
      description: 'Control who sees your profile and manage data sharing preferences.',
      color: brandColors.electricBlue,
    },
    {
      icon: FileCheck,
      title: 'GDPR Compliant',
      description: 'Fully compliant with international data protection regulations.',
      color: brandColors.atomicOrange,
    },
    {
      icon: Search,
      title: 'Regular Security Audits',
      description: 'Continuous security monitoring and regular audits to ensure protection.',
      color: brandColors.electricBlue,
    },
  ];

  return (
    <section id="security" className="relative p-[0px] overflow-hidden bg-[rgb(26,26,26)]" >

      {/* Decorative Elements */}
      <div className="absolute top-20 right-20 w-64 h-64 rounded-full opacity-5" style={{ backgroundColor: brandColors.electricBlue, filter: 'blur(80px)' }} />
      <div className="absolute bottom-20 left-20 w-80 h-80 rounded-full opacity-5" style={{ backgroundColor: brandColors.atomicOrange, filter: 'blur(100px)' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 bg-[rgb(26,26,26)] py-[96px]">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wider mb-4"
            style={{ 
              backgroundColor: `${brandColors.electricBlue}33`,
              color: brandColors.electricBlue 
            }}
          >
            <Shield className="w-4 h-4" />
            SECURITY & PRIVACY
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mb-4 text-white">
            Your Data is Safe
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Enterprise grade security to protect your information and ensure your privacy.
          </p>
        </motion.div>

        {/* Security Features - 5 Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-20">
          {securityFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                className="relative group"
              >
                {/* Card */}
                <div 
                  className="rounded-2xl p-6 h-full transition-all group-hover:scale-105"
                  style={{ 
                    backgroundColor: '#2a2a2a',
                    border: '1px solid #333'
                  }}
                >
                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 mx-auto"
                    style={{ backgroundColor: `${feature.color}22` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: feature.color }} />
                  </motion.div>

                  {/* Title */}
                  <h3 className="text-sm font-bold mb-3 text-white text-center leading-tight">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-gray-400 leading-relaxed text-center">
                    {feature.description}
                  </p>

                  {/* Decorative glow on hover */}
                  <div 
                    className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{
                      background: `linear-gradient(135deg, ${feature.color}33, transparent)`,
                      filter: 'blur(10px)',
                      zIndex: -1
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}