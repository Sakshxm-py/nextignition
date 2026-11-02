import { motion } from 'framer-motion';
import { Check, Rocket, GraduationCap, TrendingUp, Users } from 'lucide-react';
import { brandColors } from '../utils/colors';

export function RolesSection() {
  const goToSignupWithRole = (role: 'founder' | 'expert' | 'investor') => {
    sessionStorage.setItem('prefillSelectedRoles', JSON.stringify([role]));
    window.location.hash = '#signup';
  };

  const roles = [
    {
      icon: Rocket,
      title: 'Founder',
      subtitle: 'Turn your idea into a successful startup',
      description: 'Share your startup challenges and get expert advice. Get matched with mentors who understand your industry. Track your growth and milestones.',
      features: [
        'Expert mentorship on demand',
        'AI powered matching',
        'Funding opportunities',
        'Growth tracking tools',
        'Professional network',
        'Upload pitch decks and videos',
        'Access AI tools to refine your pitch',
      ],
      buttonText: 'Join as Founder',
      color: brandColors.atomicOrange,
      onClick: () => goToSignupWithRole('founder'),
    },
    {
      icon: GraduationCap,
      title: 'Expert',
      subtitle: 'Share your knowledge and build your reputation',
      description: 'Share your expertise with founders. Earn income through consultations. Build your professional reputation.',
      features: [
        'Monetize your expertise',
        'Flexible scheduling',
        'Build your brand',
        'Network with founders and investors',
        'Showcase your achievements',
        'Set your own rates and availability',
        'Host events',
      ],
      buttonText: 'Join as Expert',
      color: brandColors.electricBlue,
      onClick: () => goToSignupWithRole('expert'),
    },
    {
      icon: TrendingUp,
      title: 'Investor',
      subtitle: 'Discover promising startups and make informed decisions',
      description: 'Stealth access to startup profiles. Browse AI summarized pitch decks. Filter by industry, stage, and location.',
      features: [
        'Early access to startups',
        'AI powered pitch summaries',
        'Efficient deal flow',
        'Direct founder connections',
        'Investment analytics',
        'Track investment opportunities',
        'Join exclusive investor events',
      ],
      buttonText: 'Join as Investor',
      color: brandColors.navyBlue,
      onClick: () => goToSignupWithRole('investor'),
    },
    {
      icon: Users,
      title: 'Co-founder',
      subtitle: 'Find your perfect co-founder match',
      description: 'Connect with potential co-founders who complement your skills. Find technical, business, or creative partners.',
      features: [
        'Co-founder matching',
        'Skill complement matching',
        'Equity planning tools',
        'Team building resources',
        'Networking opportunities',
        'Build your founding team',
        'Share equity and responsibilities',
      ],
      buttonText: 'Join as Co-founder',
      color: brandColors.atomicOrange,
      onClick: () => goToSignupWithRole('founder'),
    },
  ];

  return (
    <section id="roles" className="relative bg-[rgba(26,26,26,1)] overflow-hidden p-[0px]">

      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-12 lg:py-24 bg-[rgb(26,26,26)]">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center max-w-3xl mx-auto"
        >
          <div 
            className="inline-block px-4 py-2 rounded-full text-xs font-bold tracking-wider mb-3"
            style={{ 
              backgroundColor: `${brandColors.atomicOrange}22`,
              color: brandColors.atomicOrange 
            }}
          >
            FOR EVERYONE
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl leading-tight tracking-tight mb-4 text-[rgb(255,255,255)]">
            One Platform, <br /> Four Powerful Roles
          </h2>
          <p className="text-[rgb(224,224,224)] text-lg">
            Whether you're building, advising, investing, or finding a co-founder — NextIgnition has a place for you.
          </p>
        </motion.div>

        {/* Four Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {roles.map((role, index) => {
            const Icon = role.icon;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                className="bg-gray-50 rounded-2xl p-6 flex flex-col relative overflow-hidden group hover:shadow-lg transition-shadow"
              >
                {/* Illustration Circle with Icon */}
                <div className="relative mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    className="w-24 h-24 rounded-full mx-auto flex items-center justify-center relative"
                    style={{ backgroundColor: `${role.color}22` }}
                  >
                    <Icon className="w-10 h-10" style={{ color: role.color }} />
                    
                    {/* Decorative circles */}
                    <div 
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-50"
                      style={{ backgroundColor: role.color }}
                    />
                    <div 
                      className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full opacity-30"
                      style={{ backgroundColor: role.color }}
                    />
                  </motion.div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold mb-2 text-center" style={{ color: role.color }}>
                  {role.title}
                </h3>
                
                {/* Subtitle */}
                <p className="text-sm font-semibold mb-3 text-center text-gray-900">
                  {role.subtitle}
                </p>

                {/* Description */}
                <p className="text-sm text-gray-600 leading-relaxed mb-6 text-center">
                  {role.description}
                </p>

                {/* Features List */}
                <div className="space-y-2.5 flex-1 mb-6">
                  {role.features.map((feature, featureIndex) => (
                    <motion.div
                      key={featureIndex}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.5 + index * 0.1 + featureIndex * 0.05 }}
                      className="flex items-start gap-2"
                    >
                      <div 
                        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${role.color}22` }}
                      >
                        <Check className="w-2.5 h-2.5" style={{ color: role.color }} />
                      </div>
                      <span className="text-sm text-gray-700 leading-relaxed">{feature}</span>
                    </motion.div>
                  ))}
                </div>

                {/* CTA Button */}
                <button 
                  onClick={role.onClick}
                  className="w-full py-3 rounded-full text-gray-900 font-semibold text-sm hover:shadow-lg transition-all hover:scale-105"
                  style={{ backgroundColor: role.color }}
                >
                  {role.buttonText}
                </button>

                {/* Gradient background - appears on hover */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-32 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{
                    background: `linear-gradient(to top, ${role.color}22, transparent)`
                  }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}