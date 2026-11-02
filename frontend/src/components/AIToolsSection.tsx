import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, FileText, UserCircle, Presentation } from 'lucide-react';
import { brandColors } from '../utils/colors';

export function AIToolsSection() {
  const toolRoutes: Record<string, string> = {
    'Startup Summary Generator': '#startup-summary-generator',
    'Profile Summarizer': '#profile-summarizer',
    'Pitch Deck Summarizer': '#pitch-deck-summarizer',
  };

  const handleToolClick = (title: string) => {
    if (title === 'Startup Summary Generator') {
      window.location.hash = '#startup-summary-generator';
      return;
    }
    if (title === 'Profile Summarizer') {
      window.location.hash = '#profile-summarizer';
      return;
    }
    if (title === 'Pitch Deck Summarizer') {
      window.location.hash = '#pitch-deck-summarizer';
      return;
    }
  };

  const handleAccessAllTools = () => {
    window.location.hash = '#signup';
  };

  const tools = [
    {
      icon: FileText,
      number: '01',
      title: 'Startup Summary Generator',
      description: 'Transform your complex startup idea into a compelling, investor ready summary in seconds. Input your startup idea and get a concise, professional summary optimized for investor pitches. Save time and improve clarity.',
      quote: '"Turn your 10 page plan into a punchy 2 paragraph pitch"',
      color: brandColors.atomicOrange,
    },
    {
      icon: UserCircle,
      number: '02',
      title: 'Profile Summarizer',
      description: 'Create compelling profiles automatically. Transform your profile for maximum visibility, optimize for investor appeal, highlight key achievements, and get professional formatting.',
      quote: '"Highlight your strengths for maximum impact"',
      color: brandColors.electricBlue,
    },
    {
      icon: Presentation,
      number: '03',
      title: 'Pitch Deck Summarizer',
      description: 'Extract insights from your pitch deck. Upload your pitch deck and get key highlights automatically. Identify strengths and gaps, and generate executive summaries.',
      quote: '"Know your deck\'s strengths and weaknesses"',
      color: brandColors.navyBlue,
    },
  ];

  return (
    <section id="ai-tools" className="relative bg-white py-[48px] overflow-hidden px-[0px]">

      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-20"
        >
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wider mb-4"
            style={{ 
              backgroundColor: `${brandColors.electricBlue}22`,
              color: brandColors.electricBlue 
            }}
          >
            <Sparkles className="w-4 h-4" />
            AI POWERED
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mb-4 max-w-2xl">
            Supercharge Your Startup<br />
            with AI Tools
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl">
            Let AI handle the heavy lifting. Generate summaries, optimize profiles, and analyze pitch decks — all built to help you move faster.
          </p>
        </motion.div>

        {/* Tools List */}
        <div className="space-y-16 mb-[32px] mt-[0px] mr-[0px] ml-[0px]">
          {tools.map((tool, index) => {
            const Icon = tool.icon;
            const isEven = index % 2 === 0;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1 * index }}
                className="relative"
              >
                {/* Connecting Line */}
                {index < tools.length - 1 && (
                  <div 
                    className="hidden lg:block absolute left-16 top-full w-0.5 h-16 -mt-0"
                    style={{ 
                      background: `linear-gradient(to bottom, ${tool.color}44, transparent)`
                    }}
                  />
                )}

                <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-12">
                  {/* Left: Heading Section */}
                  <div className="flex-shrink-0 w-full lg:w-[400px]">
                    {/* Large Number */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                      className="flex items-start gap-4 mb-4"
                    >
                      <span 
                        className="text-7xl font-bold opacity-20 leading-none"
                        style={{ color: tool.color }}
                      >
                        {tool.number}
                      </span>
                      <div 
                        className="p-3 rounded-2xl mt-2"
                        style={{ backgroundColor: `${tool.color}22` }}
                      >
                        <Icon className="w-8 h-8" style={{ color: tool.color }} />
                      </div>
                    </motion.div>

                    <motion.h3 
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                      className="text-3xl font-bold mb-3"
                      style={{ color: tool.color }}
                    >
                      {tool.title}
                    </motion.h3>

                    {/* Accent Line */}
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: '80px' }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.4 + index * 0.1 }}
                      className="h-1 rounded-full mb-6"
                      style={{ backgroundColor: tool.color }}
                    />
                  </div>

                  {/* Right: Content Section */}
                  <div className="flex-1 pt-4">
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                      className="text-gray-700 text-base leading-relaxed mb-6"
                    >
                      {tool.description}
                    </motion.p>

                    {/* Quote */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                      className="relative pl-6 mb-6"
                    >
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
                        style={{ backgroundColor: tool.color }}
                      />
                      <p 
                        className="text-lg font-semibold italic"
                        style={{ color: tool.color }}
                      >
                        {tool.quote}
                      </p>
                    </motion.div>

                    {/* CTA Button */}
                    <motion.a
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                      onClick={() => handleToolClick(tool.title)}
                      href={toolRoutes[tool.title] || '#ai-tools'}
                      className="group inline-flex items-center gap-2 px-6 py-3 rounded-full text-gray-900 font-semibold text-sm hover:shadow-lg transition-all hover:gap-3"
                      style={{ backgroundColor: tool.color }}
                    >
                      Try it Now
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </motion.a>
                  </div>
                </div>

                {/* Background Gradient Circle */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.2 + index * 0.1 }}
                  className="absolute -z-10 w-64 h-64 rounded-full blur-3xl pointer-events-none"
                  style={{ 
                    background: `radial-gradient(circle, ${tool.color}15, transparent)`,
                    top: '-50px',
                    right: isEven ? '10%' : '30%',
                  }}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-center pt-8 border-t-2 border-gray-200"
        >
          <button 
            onClick={handleAccessAllTools}
            className="group inline-flex items-center gap-3 px-10 py-4 rounded-full text-gray-900 font-bold text-base hover:shadow-2xl transition-all hover:gap-4"
            style={{ 
              background: `linear-gradient(135deg, ${brandColors.atomicOrange}, ${brandColors.electricBlue})`
            }}
          >
            Access All AI Tools Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}