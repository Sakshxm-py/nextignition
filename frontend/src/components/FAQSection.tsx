import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle, CheckCircle } from 'lucide-react';
import { brandColors } from '../utils/colors';
import { useState } from 'react';

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'How do I get started with NextIgnition?',
      answer: 'Simply sign up for a free account, choose your role (Founder, Expert, Investor, or Co-founder), and complete your profile. You\'ll immediately have access to our community, AI tools, and expert matching features.',
      color: brandColors.atomicOrange,
      icon: CheckCircle,
    },
    {
      question: 'Is NextIgnition really free?',
      answer: 'Yes! NextIgnition offers a free tier that gives you access to core features including community access, basic AI tools, and expert discovery. Premium features and advanced matching are available through our paid plans.',
      color: brandColors.electricBlue,
      icon: CheckCircle,
    },
    {
      question: 'How does the AI expert matching work?',
      answer: 'Our AI analyzes your startup profile, industry, stage, and specific needs to match you with the most relevant experts. The algorithm considers expertise areas, availability, past success rates, and compatibility factors to ensure the best matches.',
      color: brandColors.navyBlue,
      icon: CheckCircle,
    },
    {
      question: 'Can I switch between roles?',
      answer: 'Absolutely! You can seamlessly switch between Founder, Expert, Investor, and Co-founder roles with just one click. Each role has its own profile and features, allowing you to engage with the platform in multiple ways.',
      color: brandColors.atomicOrange,
      icon: CheckCircle,
    },
    {
      question: 'How do consultations work?',
      answer: 'Browse available experts, view their profiles and availability, then book a session directly through the platform. You\'ll receive automatic confirmations and reminders. Sessions can be conducted via video call, and you can rate and review experts after each consultation.',
      color: brandColors.electricBlue,
      icon: CheckCircle,
    },
    {
      question: 'What AI tools are included?',
      answer: 'NextIgnition includes several AI-powered tools: Startup Summary Generator (turns ideas into investor-ready summaries), Profile Summarizer (optimizes your profile), Pitch Deck Summarizer (extracts key highlights), and Smart Matching Algorithm (connects you with relevant experts and opportunities).',
      color: brandColors.navyBlue,
      icon: CheckCircle,
    },
  ];

  return (
    <section id="faq" className="relative bg-white py-24 overflow-hidden">

      {/* Decorative Animated Circles */}
      <motion.div
        className="absolute top-20 right-20 w-64 h-64 rounded-full opacity-5 pointer-events-none"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{ backgroundColor: brandColors.electricBlue }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, type: "spring" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wider mb-6"
            style={{ 
              backgroundColor: `${brandColors.electricBlue}22`,
              color: brandColors.electricBlue 
            }}
          >
            <HelpCircle className="w-4 h-4" />
            FAQ
          </motion.div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl">
            Got questions? We've got answers. If you don't see your question here, reach out to our support team.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const Icon = faq.icon;
            const isOpen = openIndex === index;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                {/* FAQ Item */}
                <div 
                  className="rounded-2xl overflow-hidden transition-all"
                  style={{ 
                    backgroundColor: isOpen ? '#f9fafb' : 'white',
                    border: `2px solid ${isOpen ? faq.color : '#e5e7eb'}`,
                  }}
                >
                  {/* Question Button */}
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left transition-all group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Animated Icon */}
                      <motion.div
                        animate={{
                          rotate: isOpen ? 360 : 0,
                          scale: isOpen ? 1.1 : 1,
                        }}
                        transition={{ duration: 0.3 }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ 
                          backgroundColor: `${faq.color}${isOpen ? '33' : '22'}`
                        }}
                      >
                        <Icon className="w-5 h-5" style={{ color: faq.color }} />
                      </motion.div>

                      {/* Question Text */}
                      <span className="font-bold text-gray-900 text-lg pr-4">
                        {faq.question}
                      </span>
                    </div>

                    {/* Toggle Icon with Animation */}
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex-shrink-0"
                    >
                      {isOpen ? (
                        <Minus className="w-6 h-6" style={{ color: faq.color }} />
                      ) : (
                        <Plus className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                      )}
                    </motion.div>
                  </button>

                  {/* Answer with Animated Expand/Collapse */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pl-4 sm:pl-6 lg:pl-20">
                          <motion.p
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            transition={{ duration: 0.2, delay: 0.1 }}
                            className="text-gray-700 leading-relaxed"
                          >
                            {faq.answer}
                          </motion.p>

                          {/* Animated decorative line */}
                          <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            exit={{ scaleX: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className="h-1 rounded-full mt-4 origin-left"
                            style={{ 
                              backgroundColor: faq.color,
                              width: '60px'
                            }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Animated glow effect when open */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className="absolute -inset-1 rounded-2xl -z-10"
                      style={{
                        background: `linear-gradient(135deg, ${faq.color}22, transparent)`,
                        filter: 'blur(8px)'
                      }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Animated Counter Infographic */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gray-50">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: brandColors.electricBlue }}
            />
            <span className="text-sm text-gray-600">
              <span className="font-bold text-gray-900">{faqs.length} questions</span> answered
            </span>
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 0.5,
              }}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: brandColors.atomicOrange }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}