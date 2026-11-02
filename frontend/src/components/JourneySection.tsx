import { motion } from 'framer-motion';
import { Check, TrendingUp, UserCircle, Lightbulb, Sparkles, Rocket } from 'lucide-react';
import { brandColors } from '../utils/colors';
import phoneImage from 'figma:asset/21b5d4b88098807d9724b8ce3c0f8a824d5e809c.png';

export function JourneySection() {
  const stages = [
    {
      number: '01',
      title: 'Sign Up & Create Your Profile',
      description: 'Choose your role and build your professional profile in minutes.',
      details: ['Select role: Founder, Expert, Investor, or Co-founder', 'Complete your profile with skills and experience', 'Set your preferences and goals'],
    },
    {
      number: '02',
      title: 'Post Your Startup Idea or Challenge',
      description: 'Share what you\'re working on or need help with.',
      details: ['Post your startup idea or business challenge', 'Describe your needs and goals', 'Set visibility preferences'],
    },
    {
      number: '03',
      title: 'Get Matched with Experts & Resources (AI Powered)',
      description: 'Our AI finds the perfect experts and resources for you.',
      details: ['AI analyzes your needs and matches you with relevant experts', 'Browse curated expert profiles', 'Access relevant resources and tools'],
    },
    {
      number: '04',
      title: 'Book Consults, Join Events, and Grow Your Startup',
      description: 'Take action and accelerate your growth.',
      details: ['Schedule 1 on 1 consultations with experts', 'Join live events', 'Track your progress and milestones'],
    },
  ];

  return (
    <section id="how-it-works" className="relative bg-white py-12 lg:py-24 overflow-hidden px-0">

      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 max-w-3xl"
        >
          <div 
            className="inline-block px-4 py-2 rounded-full text-xs font-bold tracking-wider mb-3"
            style={{ 
              backgroundColor: `${brandColors.atomicOrange}22`,
              color: brandColors.atomicOrange 
            }}
          >
            SIMPLE PROCESS
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mb-4">
            From Idea to Launch <br /> in Four Steps
          </h2>
          <p className="text-gray-600 text-lg">
            Getting started is easy. Our streamlined process helps you connect with the right people and resources quickly.
          </p>
        </motion.div>



        {/* Four Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {stages.map((stage, index) => {
            const icons = [UserCircle, Lightbulb, Sparkles, Rocket];
            const Icon = icons[index];
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                className="bg-gray-50 rounded-2xl p-6 flex flex-col min-h-[300px] lg:h-[320px]"
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${brandColors.atomicOrange}22` }}
                >
                  <Icon className="w-5 h-5" style={{ color: brandColors.atomicOrange }} />
                </div>
                
                <h3 className="text-lg font-bold mb-2">{stage.number}</h3>
                <p className="text-sm font-semibold mb-4 leading-relaxed">
                  {stage.title}
                </p>

                <div className="space-y-2.5 flex-1">
                  {stage.details.map((detail, detailIndex) => (
                    <motion.div
                      key={detailIndex}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.7 + index * 0.1 + detailIndex * 0.05 }}
                      className="flex items-start gap-2"
                    >
                      <div 
                        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${brandColors.electricBlue}22` }}
                      >
                        <Check className="w-2.5 h-2.5" style={{ color: brandColors.electricBlue }} />
                      </div>
                      <span className="text-sm text-gray-700 leading-relaxed">{detail}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-12"
        >
          <button
            onClick={() => { window.location.hash = '#signup'; }}
            className="px-8 py-4 rounded-full text-gray-900 font-semibold text-sm hover:shadow-lg transition-shadow"
            style={{ backgroundColor: brandColors.atomicOrange }}
          >
            Start Your Journey Now
          </button>
        </motion.div>
      </div>
    </section>
  );
}