import { motion } from 'framer-motion';
import { Users, MessageSquare, Calendar, Sparkles, Video, RefreshCw, Bell, HelpCircle } from 'lucide-react';
import { brandColors } from '../utils/colors';

export function FeaturesSection() {
  const features = [
    {
      number: '01',
      icon: Users,
      title: 'AI Powered Expert Matching',
      description: 'Find the perfect expert for your needs. Our intelligent matching algorithm analyzes your startup needs and matches you with relevant experts, filtered by industry, expertise, and availability.',
      color: brandColors.atomicOrange,
    },
    {
      number: '02',
      icon: MessageSquare,
      title: 'Business Only Community Feed',
      description: 'Connect with like minded entrepreneurs in a professional environment. Real time updates from founders and experts, filter by Industry, Startup Stage, and Location. No spam, only business content.',
      color: brandColors.electricBlue,
    },
    {
      number: '03',
      icon: Calendar,
      title: 'Founder Expert Booking System',
      description: 'Schedule consultations seamlessly. Browse available experts, book 1 on 1 sessions, manage your calendar, set session duration and topics with automatic reminders and confirmations.',
      color: brandColors.navyBlue,
    },
    {
      number: '04',
      icon: Sparkles,
      title: 'AI Tools Suite',
      description: 'Powerful AI tools to accelerate your startup. Startup Summary Generator transforms ideas into investor ready summaries. Profile Summarizer optimizes profiles for maximum visibility. Pitch Deck Summarizer extracts key highlights automatically.',
      color: brandColors.atomicOrange,
    },
    {
      number: '05',
      icon: Video,
      title: 'Events',
      description: 'Learn from industry leaders. Live events with experts, recorded sessions library, networking events, interactive Q&A sessions, and auto reminders for registered events.',
      color: brandColors.electricBlue,
    },
    {
      number: '06',
      icon: RefreshCw,
      title: 'Switch Role Feature',
      description: 'One account, multiple roles. Seamlessly switch between Founder, Expert, Investor, and Co-founder roles with one click. Maintain separate profiles for each role and access role specific features instantly.',
      color: brandColors.navyBlue,
    },
    {
      number: '07',
      icon: Bell,
      title: 'Real Time Messaging & Notifications',
      description: 'Stay connected and informed. In app messaging system, internal email notifications, real time updates, push notifications, and never miss important updates.',
      color: brandColors.atomicOrange,
    },
    {
      number: '08',
      icon: HelpCircle,
      title: 'In App Support & Feedback',
      description: 'Get help when you need it. 24/7 in app support, quick feedback system, help center with FAQs, direct contact with support team, and community driven solutions.',
      color: brandColors.electricBlue,
    },
  ];

  return (
    <section id="features" className="relative bg-white pt-8 pb-12 lg:pt-8 lg:pb-24 overflow-hidden">

      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-6"
        >
          <div 
            className="inline-block px-4 py-2 rounded-full text-xs font-semibold tracking-wide uppercase mb-6"
            style={{ 
              backgroundColor: `${brandColors.atomicOrange}22`,
              color: brandColors.atomicOrange 
            }}
          >
            CORE FEATURES
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mb-4">
            Everything You Need to
            <br className="sm:hidden" /> Launch & Scale
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl">
            Built for founders who want to move fast. Access powerful tools, connect with experts, 
            and grow your startup all in one platform.
          </p>
        </motion.div>

        {/* 8 Core Features Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div 
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-white font-semibold"
            style={{ backgroundColor: brandColors.black }}
          >
            <span className="text-2xl">8</span>
            <span className="text-sm">Core Features</span>
          </div>
        </motion.div>

        {/* Features Grid - 4 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                className="bg-gray-50 rounded-2xl p-6 sm:p-8 relative overflow-hidden group hover:shadow-lg transition-shadow min-h-[320px] lg:h-[400px] flex flex-col"
              >
                <div className="relative z-10 flex flex-col h-full">
                  {/* Number Badge */}
                  <div 
                    className="inline-block px-3 py-1 rounded-full text-white text-[10px] font-bold mb-4 self-start"
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

                  {/* Graphical Elements Based on Feature Type */}
                  <div className="mt-auto">
                    {index === 0 && ( /* Expert Network */
                      <div className="bg-white rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Active Experts</span>
                          <span className="font-bold">250+</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="w-7 h-7 rounded-full border-2 border-white -ml-1 first:ml-0" style={{ backgroundColor: feature.color + '44' }} />
                          ))}
                        </div>
                        <div className="text-[10px] text-gray-500">Top Industries: AI, SaaS, Fintech</div>
                      </div>
                    )}
                    
                    {index === 1 && ( /* AI Matching */
                      <div className="bg-white rounded-xl p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-gray-500">Match Accuracy</span>
                          <span className="text-2xl font-bold" style={{ color: feature.color }}>94%</span>
                        </div>
                        <div className="space-y-1.5">
                          {[85, 92, 78].map((val, i) => (
                            <div key={i} className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                whileInView={{ width: `${val}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                                className="h-full rounded-full" 
                                style={{ backgroundColor: feature.color }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {index === 2 && ( /* Scheduling */
                      <div className="bg-white rounded-xl p-3">
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                            <div key={i} className="text-[8px] text-center text-gray-400 font-bold">{day}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({ length: 14 }).map((_, i) => (
                            <div 
                              key={i} 
                              className="aspect-square rounded"
                              style={{ 
                                backgroundColor: i % 3 === 0 ? feature.color : i % 5 === 0 ? feature.color + '66' : '#f3f4f6'
                              }}
                            />
                          ))}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-2">12 sessions booked this week</div>
                      </div>
                    )}
                    
                    {index === 3 && ( /* Community */
                      <div className="bg-white rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: '68%', backgroundColor: feature.color }} />
                          </div>
                          <span className="text-xs font-bold">68%</span>
                        </div>
                        <div className="flex gap-1">
                          {[4, 5, 4, 5, 3, 5, 4].map((height, i) => (
                            <div 
                              key={i} 
                              className="flex-1 rounded-t"
                              style={{ 
                                height: `${height * 6}px`,
                                backgroundColor: i === 6 ? feature.color : feature.color + '44'
                              }}
                            />
                          ))}
                        </div>
                        <div className="text-[10px] text-gray-500">+24% engagement this month</div>
                      </div>
                    )}
                    
                    {index === 4 && ( /* Live Events */
                      <div className="bg-white rounded-xl p-3">
                        <div className="space-y-2">
                          {[
                            { title: 'Fundraising 101', time: 'Today 2PM', attendees: 45 },
                            { title: 'MVP Workshop', time: 'Tomorrow', attendees: 32 },
                          ].map((event, i) => (
                            <div key={i} className="flex items-center justify-between text-xs pb-2 border-b border-gray-100 last:border-0">
                              <div>
                                <div className="font-semibold text-[11px]">{event.title}</div>
                                <div className="text-[10px] text-gray-500">{event.time}</div>
                              </div>
                              <div 
                                className="px-2 py-1 rounded text-[10px] font-bold text-white"
                                style={{ backgroundColor: feature.color }}
                              >
                                {event.attendees}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {index === 5 && ( /* Progress Tracking */
                      <div className="bg-white rounded-xl p-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-gray-500">Milestones</span>
                          <span className="text-xs font-bold">5/8 Complete</span>
                        </div>
                        <div className="space-y-2">
                          {[true, true, true, true, true, false, false, false].map((complete, i) => (
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
                    
                    {index === 6 && ( /* Notifications */
                      <div className="bg-white rounded-xl p-3 space-y-2">
                        {[
                          { type: 'New match found', time: '2m ago' },
                          { type: 'Session reminder', time: '1h ago' },
                          { type: 'Message received', time: '3h ago' },
                        ].map((notif, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div 
                              className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                              style={{ backgroundColor: feature.color }}
                            />
                            <div className="flex-1">
                              <div className="text-[11px] font-medium">{notif.type}</div>
                              <div className="text-[10px] text-gray-400">{notif.time}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {index === 7 && ( /* Resource Library */
                      <div className="bg-white rounded-xl p-3">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          {['Templates', 'Guides', 'Tools', 'Videos'].map((resource, i) => (
                            <div 
                              key={i} 
                              className="p-2 rounded text-center"
                              style={{ backgroundColor: feature.color + '22' }}
                            >
                              <div className="text-lg font-bold" style={{ color: feature.color }}>
                                {[24, 18, 32, 15][i]}
                              </div>
                              <div className="text-[9px] text-gray-600">{resource}</div>
                            </div>
                          ))}
                        </div>
                        <div className="text-[10px] text-gray-500 text-center">Updated weekly</div>
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
      </div>
    </section>
  );
}