import { motion } from 'framer-motion';
import { TrendingUp, Target, Award, BarChart3, DollarSign, Users, Network, Presentation, Trophy } from 'lucide-react';
import { brandColors } from '../utils/colors';

export function GrowthTrackingSection() {
  const trackingFeatures = [
    {
      number: '01',
      icon: Target,
      title: 'Milestone Tracking',
      description: 'Set and track your startup milestones from idea to launch and beyond.',
      color: brandColors.atomicOrange,
      graphicType: 'milestones',
    },
    {
      number: '02',
      icon: BarChart3,
      title: 'Goal Setting',
      description: 'Define your goals and monitor progress with visual dashboards.',
      color: brandColors.electricBlue,
      graphicType: 'progress',
    },
    {
      number: '03',
      icon: Award,
      title: 'Achievement Badges',
      description: 'Earn badges as you complete milestones and reach important goals.',
      color: brandColors.navyBlue,
      graphicType: 'badges',
    },
    {
      number: '04',
      icon: TrendingUp,
      title: 'Performance Insights',
      description: 'Get actionable insights from your growth metrics and analytics.',
      color: brandColors.atomicOrange,
      graphicType: 'insights',
    },
  ];

  const trackingItems = [
    { icon: DollarSign, text: 'Funding progress', color: brandColors.atomicOrange },
    { icon: Users, text: 'Mentor sessions completed', color: brandColors.electricBlue },
    { icon: Network, text: 'Network growth', color: brandColors.navyBlue },
    { icon: Presentation, text: 'Pitch improvements', color: brandColors.atomicOrange },
    { icon: Trophy, text: 'Milestone achievements', color: brandColors.electricBlue },
  ];

  return (
    <section id="growth" className="relative bg-[rgb(255,255,255)] py-[48px] overflow-hidden px-[0px]">

      <div className="relative z-10 max-w-7xl mx-auto py-[32px] px-4 lg:px-8 bg-[rgba(255,255,255,0.05)]">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <div 
            className="inline-block px-4 py-2 rounded-full text-xs font-semibold tracking-wide uppercase mb-6"
            style={{ 
              backgroundColor: `${brandColors.electricBlue}22`,
              color: brandColors.electricBlue 
            }}
          >
            GROWTH TRACKING
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mb-4">
            Monitor Your Progress
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl">
            Track your startup journey with comprehensive dashboards, milestone tracking, and performance insights.
          </p>
        </motion.div>

        {/* 4 Core Features Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12"
        >
          <div 
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-white font-semibold"
            style={{ backgroundColor: brandColors.black }}
          >
            <span className="text-2xl">4</span>
            <span className="text-sm">Core Features</span>
          </div>
        </motion.div>

        {/* Features Grid - 4 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-16">
          {trackingFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                className="bg-gray-50 rounded-2xl p-6 relative overflow-hidden group hover:shadow-lg transition-shadow min-h-[320px] lg:h-[380px] flex flex-col"
              >
                <div className="relative z-10 flex flex-col h-full">
                  {/* Number Badge */}
                  <div 
                    className="inline-block px-3 py-1 rounded-full text-white text-xs font-bold mb-3 self-start"
                    style={{ backgroundColor: feature.color }}
                  >
                    {feature.number}
                  </div>

                  {/* Icon and Title */}
                  <div className="flex items-start gap-3 mb-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${feature.color}22` }}
                    >
                      <Icon 
                        className="w-5 h-5" 
                        style={{ color: feature.color }}
                      />
                    </div>
                    <h3 className="text-base font-semibold leading-tight pt-1 flex-1">
                      {feature.title}
                    </h3>
                  </div>
                  
                  {/* Description */}
                  <p className="text-gray-700 leading-relaxed text-xs mb-4">
                    {feature.description}
                  </p>

                  {/* Graphical Elements */}
                  <div className="mt-auto">
                    {feature.graphicType === 'milestones' && (
                      <div className="bg-white rounded-xl p-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-gray-500">Progress</span>
                          <span className="text-xs font-bold">6/10 Complete</span>
                        </div>
                        <div className="space-y-2">
                          {[true, true, true, true, true, true, false, false, false, false].map((complete, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full border-2 flex items-center justify-center"
                                style={{ 
                                  borderColor: complete ? feature.color : '#d1d5db',
                                  backgroundColor: complete ? feature.color : 'transparent'
                                }}
                              >
                                {complete && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                              </div>
                              <div className="flex-1 h-1 bg-gray-100 rounded" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {feature.graphicType === 'progress' && (
                      <div className="bg-white rounded-xl p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-gray-500">Goal Completion</span>
                          <span className="text-2xl font-bold" style={{ color: feature.color }}>82%</span>
                        </div>
                        <div className="space-y-1.5">
                          {[82, 65, 90].map((val, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-[9px] text-gray-400 w-8">Q{i + 1}</span>
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  whileInView={{ width: `${val}%` }}
                                  viewport={{ once: true }}
                                  transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                                  className="h-full rounded-full" 
                                  style={{ backgroundColor: feature.color }}
                                />
                              </div>
                              <span className="text-[9px] text-gray-600 w-8 text-right">{val}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {feature.graphicType === 'badges' && (
                      <div className="bg-white rounded-xl p-3">
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          {[1, 2, 3, 4, 5, 6].map((i) => (
                            <motion.div
                              key={i}
                              initial={{ scale: 0 }}
                              whileInView={{ scale: 1 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.4, delay: 0.6 + i * 0.05 }}
                              className="aspect-square rounded-lg flex items-center justify-center"
                              style={{ 
                                backgroundColor: i <= 4 ? `${feature.color}22` : '#f3f4f6'
                              }}
                            >
                              {i <= 4 && <Award className="w-5 h-5" style={{ color: feature.color }} />}
                            </motion.div>
                          ))}
                        </div>
                        <div className="text-[10px] text-gray-500 text-center">4/6 badges earned</div>
                      </div>
                    )}
                    
                    {feature.graphicType === 'insights' && (
                      <div className="bg-white rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: '75%', backgroundColor: feature.color }} />
                          </div>
                          <span className="text-xs font-bold">75%</span>
                        </div>
                        <div className="flex gap-1">
                          {[4, 5, 3, 6, 4, 7, 5].map((height, i) => (
                            <div 
                              key={i} 
                              className="flex-1 rounded-t"
                              style={{ 
                                height: `${height * 5}px`,
                                backgroundColor: i === 6 ? feature.color : feature.color + '44'
                              }}
                            />
                          ))}
                        </div>
                        <div className="text-[10px] text-gray-500">+32% growth this quarter</div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Gradient background - appears on hover */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-32 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    background: `linear-gradient(to top, ${feature.color}22, transparent)`
                  }}
                ></div>
              </motion.div>
            );
          })}
        </div>

        {/* What You Can Track Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <h3 className="text-2xl font-bold mb-3">
            What You Can Track
          </h3>
          <p className="text-gray-600 text-base mb-8">
            Monitor every aspect of your startup journey
          </p>

          {/* 5 Tracking Items in horizontal layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {trackingItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  className="bg-gray-50 rounded-2xl p-5 text-center hover:shadow-md transition-shadow group"
                >
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}22` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: item.color }} />
                  </motion.div>
                  
                  <div 
                    className="w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center font-bold text-white text-sm"
                    style={{ backgroundColor: item.color }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  
                  <p className="text-xs font-medium text-gray-800 leading-tight">
                    {item.text}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}