import { motion, useScroll, useTransform } from 'framer-motion';
import { Heart, Target, Rocket, Users, ArrowRight, Zap } from 'lucide-react';
import { brandColors } from '../utils/colors';
import { useRef } from 'react';

export function MissionSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [-50, 50]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.3, 1, 0.3]);

  const stats = [
    { value: '2024', label: 'Founded', icon: Rocket, color: brandColors.atomicOrange },
    { value: '15K+', label: 'Users', icon: Users, color: brandColors.electricBlue },
    { value: '50+', label: 'Countries', icon: Target, color: brandColors.navyBlue },
  ];

  return (
    <section id="about" ref={containerRef} className="relative overflow-hidden" style={{ backgroundColor: brandColors.white }}>

      {/* Animated Particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            backgroundColor: i % 3 === 0 ? brandColors.atomicOrange : i % 3 === 1 ? brandColors.electricBlue : brandColors.navyBlue,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-[96px]">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wider mb-6"
            style={{ 
              backgroundColor: `${brandColors.atomicOrange}33`,
              color: brandColors.atomicOrange 
            }}
          >
            <Heart className="w-4 h-4" />
            OUR MISSION
          </div>
          <motion.h2 
            className="text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mb-4 text-gray-900"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Built by Founders, For Founders
          </motion.h2>
        </motion.div>

        {/* Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 mb-16">
          {/* Left: Quote Card */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div 
              className="rounded-3xl p-10 relative overflow-hidden bg-gray-50 border border-gray-100"
            >
              {/* Animated quote mark */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                style={{ backgroundColor: `${brandColors.atomicOrange}22` }}
              >
                <span className="text-4xl font-bold" style={{ color: brandColors.atomicOrange }}>"</span>
              </motion.div>

              <p className="text-gray-700 text-lg leading-relaxed mb-6">
                Founded by <span className="font-bold text-gray-900">Sanket</span> to empower early stage founders, NextIgnition solves real startup challenges with mentorship, AI, and a global community.
              </p>

              {/* Animated border */}
              <motion.div
                className="absolute bottom-0 left-0 h-1 rounded-full"
                style={{ backgroundColor: brandColors.atomicOrange }}
                initial={{ width: 0 }}
                whileInView={{ width: '100%' }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.5 }}
              />

              {/* Floating elements */}
              <motion.div
                style={{ y: y1, backgroundColor: brandColors.electricBlue }}
                className="absolute top-10 right-10 w-20 h-20 rounded-full opacity-10"
              />
            </div>
          </motion.div>

          {/* Right: Mission Statement with Infographic */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div 
              className="rounded-3xl p-10 h-full flex flex-col justify-center bg-gray-50 border border-gray-100"
            >
              <p className="text-gray-700 text-base leading-relaxed mb-6">
                We believe every great idea deserves a chance to become reality. That's why we built NextIgnition to remove the barriers between brilliant founders and the resources they need to succeed.
              </p>

              <p className="text-gray-400 text-sm leading-relaxed mb-8">
                Whether you're just starting out or scaling up, we're here to help you move smarter and faster.
              </p>

              {/* Animated Progress Bars */}
              <div className="space-y-4 mb-8">
                {[
                  { label: 'Innovation', value: 95, color: brandColors.atomicOrange },
                  { label: 'Community', value: 88, color: brandColors.electricBlue },
                  { label: 'Growth', value: 92, color: brandColors.navyBlue },
                ].map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-500 font-medium">{item.label}</span>
                      <span className="text-xs font-bold text-gray-900">{item.value}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full relative"
                        style={{ backgroundColor: item.color }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${item.value}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.3 + index * 0.2 }}
                      >
                        {/* Glowing effect */}
                        <motion.div
                          className="absolute right-0 top-0 bottom-0 w-8"
                          style={{
                            background: `linear-gradient(to right, transparent, ${item.color})`,
                            filter: 'blur(4px)'
                          }}
                          animate={{
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                          }}
                        />
                      </motion.div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats Mini Infographic */}
              <div className="flex flex-wrap gap-4 sm:gap-6">
                {stats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                      className="flex-1"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div 
                          className="w-6 h-6 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${stat.color}22` }}
                        >
                          <Icon className="w-3 h-3" style={{ color: stat.color }} />
                        </div>
                        <span className="text-xl font-bold text-gray-900">{stat.value}</span>
                      </div>
                      <span className="text-xs text-gray-500">{stat.label}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>

        {/* CTA Button with Animated Background */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg relative overflow-hidden group"
            style={{ 
              backgroundColor: brandColors.atomicOrange,
              color: 'white'
            }}
          >
            <Zap className="w-5 h-5 relative z-10" />
            <span className="relative z-10">Join Our Mission</span>
            <motion.div
              animate={{
                x: [0, 5, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
              className="relative z-10"
            >
              <ArrowRight className="w-5 h-5" />
            </motion.div>
            
            {/* Ripple effect */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: brandColors.electricBlue }}
              initial={{ scale: 0, opacity: 1 }}
              whileHover={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          </motion.button>

          {/* Floating Icons Around Button */}
          <div className="relative">
            {[Heart, Target, Rocket].map((Icon, index) => (
              <motion.div
                key={index}
                className="absolute"
                style={{
                  left: `${50 + Math.cos((index * 2 * Math.PI) / 3) * 120}px`,
                  top: `${-30 + Math.sin((index * 2 * Math.PI) / 3) * 60}px`,
                }}
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: index * 0.3,
                }}
              >
                <Icon 
                  className="w-6 h-6 opacity-20" 
                  style={{ color: index === 0 ? brandColors.atomicOrange : index === 1 ? brandColors.electricBlue : brandColors.navyBlue }} 
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}