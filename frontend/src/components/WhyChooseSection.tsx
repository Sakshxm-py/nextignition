import { motion, useScroll, useTransform } from 'framer-motion';
import { Layers, Sparkles, Users, Globe, TrendingUp, CreditCard, Shield, Smartphone, ArrowRight } from 'lucide-react';
import { brandColors } from '../utils/colors';
import { useRef } from 'react';

export function WhyChooseSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const features = [
    {
      icon: Layers,
      title: 'All in One Platform',
      description: 'Everything you need in one place',
      color: brandColors.atomicOrange,
      delay: 0,
    },
    {
      icon: Sparkles,
      title: 'AI Powered',
      description: 'Smart matching and tools',
      color: brandColors.electricBlue,
      delay: 0.1,
    },
    {
      icon: Users,
      title: 'Expert Network',
      description: 'Access to top mentors and advisors',
      color: brandColors.navyBlue,
      delay: 0.2,
    },
    {
      icon: Globe,
      title: 'Global Community',
      description: 'Connect with entrepreneurs worldwide',
      color: brandColors.atomicOrange,
      delay: 0.3,
    },
    {
      icon: TrendingUp,
      title: 'Proven Results',
      description: 'Real startups, real success stories',
      color: brandColors.electricBlue,
      delay: 0.4,
    },
    {
      icon: CreditCard,
      title: 'Free to Start',
      description: 'No credit card required',
      color: brandColors.navyBlue,
      delay: 0.5,
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data is protected',
      color: brandColors.atomicOrange,
      delay: 0.6,
    },
    {
      icon: Smartphone,
      title: 'Mobile & Web',
      description: 'Access anywhere, anytime',
      color: brandColors.electricBlue,
      delay: 0.7,
    },
  ];

  // Create rotating animation values
  const rotate1 = useTransform(scrollYProgress, [0, 1], [0, 360]);
  const rotate2 = useTransform(scrollYProgress, [0, 1], [360, 0]);

  return (
    <section id="why-choose" ref={containerRef} className="relative bg-white py-24 overflow-hidden" style={{ position: 'relative' }}>

      {/* Animated Background Circles — CSS-only for scroll perf */}
      <div 
        style={{ transform: `rotate(${0}deg)`, animation: 'floatScale 8s ease-in-out infinite' }}
        className="absolute top-1/4 right-10 w-96 h-96 rounded-full opacity-5 pointer-events-none hidden md:block"
      >
        <div className="w-full h-full rounded-full" style={{ backgroundColor: brandColors.electricBlue }} />
      </div>
      <div 
        style={{ animation: 'floatScale 10s ease-in-out 1s infinite' }}
        className="absolute bottom-1/4 left-10 w-80 h-80 rounded-full opacity-5 pointer-events-none hidden md:block"
      >
        <div className="w-full h-full rounded-full" style={{ backgroundColor: brandColors.atomicOrange }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <div 
            className="inline-block px-4 py-2 rounded-full text-xs font-bold tracking-wider mb-6"
            style={{ 
              backgroundColor: `${brandColors.atomicOrange}22`,
              color: brandColors.atomicOrange 
            }}
          >
            WHY CHOOSE NEXTIGNITION
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mb-4">
            The Complete Startup Ecosystem
          </h2>
          <p className="text-gray-600 text-lg max-w-3xl">
            Everything you need to turn your startup idea into reality, all in one powerful platform.
          </p>
        </motion.div>

        {/* Features Grid - 4x2 with Staggered Animation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const row = Math.floor(index / 4);
            const col = index % 4;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50, rotateX: -15 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true }}
                transition={{ 
                  duration: 0.6, 
                  delay: feature.delay,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ 
                  y: -10,
                  transition: { duration: 0.3 }
                }}
                className="group relative"
              >
                {/* Card */}
                <div className="bg-gray-50 rounded-2xl p-6 h-full flex flex-col items-center text-center relative overflow-hidden">
                  {/* Icon Container — CSS animation instead of Framer Motion loop */}
                  <div
                    className="relative mb-4"
                    style={{ animation: `floatYSmall 3s ease-in-out ${index * 0.2}s infinite`, willChange: 'transform' }}
                  >
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center relative group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: `${feature.color}22` }}
                    >
                      <Icon className="w-8 h-8 relative z-10" style={{ color: feature.color }} />
                      
                      {/* Pulsing ring — CSS animation */}
                      <div
                        className="absolute inset-0 rounded-2xl"
                        style={{ border: `2px solid ${feature.color}`, animation: `pulseRing 2s ease-in-out ${index * 0.3}s infinite`, willChange: 'transform, opacity' }}
                      />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-base mb-2 text-gray-900">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Animated dots infographic — CSS only */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                    {[0, 1, 2].map((dotIndex) => (
                      <div
                        key={dotIndex}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: feature.color, animation: `pulseRing 1.5s ease-in-out ${dotIndex * 0.2 + index * 0.1}s infinite`, willChange: 'transform, opacity' }}
                      />
                    ))}
                  </div>

                  {/* Gradient overlay on hover */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{
                      background: `linear-gradient(135deg, ${feature.color}11, transparent)`
                    }}
                  />
                </div>

                {/* Connection lines (for visual effect) */}
                {col < 3 && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.8 + index * 0.05 }}
                    className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px origin-left"
                    style={{ backgroundColor: `${feature.color}33` }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-white font-bold text-lg shadow-lg relative overflow-hidden group"
            style={{ backgroundColor: brandColors.atomicOrange }}
          >
            <span className="relative z-10">Get Started Free</span>
            <motion.div
              animate={{
                x: [0, 5, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            >
              <ArrowRight className="w-5 h-5 relative z-10" />
            </motion.div>
            
            {/* Animated background */}
            <motion.div
              className="absolute inset-0"
              style={{ backgroundColor: brandColors.navyBlue }}
              initial={{ x: '-100%' }}
              whileHover={{ x: 0 }}
              transition={{ duration: 0.3 }}
            />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}