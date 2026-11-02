import { Lightbulb, DollarSign, ArrowRight, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';
import { brandColors } from '../utils/colors';

interface ProfileCreationCardProps {
  type: 'expert' | 'investor' | 'founder';
  onCreateClick: () => void;
  isCreated?: boolean;
}

export function ProfileCreationCard({ type, onCreateClick, isCreated = false }: ProfileCreationCardProps) {
  const isExpert = type === 'expert';

  const config = {
    expert: {
      icon: Lightbulb,
      title: 'Expert Profile',
      description: 'Share your expertise, mentor startups, and unlock connections with founders',
      color: brandColors.atomicOrange,
      benefits: ['Mentor startups', 'Build network', 'Share expertise'],
    },
    investor: {
      icon: DollarSign,
      title: 'Investor Profile',
      description: 'Discover investment opportunities and connect with promising startups',
      color: brandColors.navyBlue,
      benefits: ['Access deals', 'Find opportunities', 'Build portfolio'],
    },
    founder: {
      icon: Rocket,
      title: 'Founder Profile',
      description: 'Create your startup, build your team, and get investor ready',
      color: brandColors.electricBlue,
      benefits: ['Launch startup', 'Find co-founders', 'Get funded'],
    },
  };

  const cfg = config[type];
  const Icon = cfg.icon;

  if (isCreated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-xl border-2"
        style={{ borderColor: cfg.color + '30', background: cfg.color + '10' }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg" style={{ background: cfg.color + '20' }}>
              <Icon className="w-6 h-6" style={{ color: cfg.color }} />
            </div>
            <div>
              <h3 className="font-bold text-lg" style={{ color: cfg.color }}>
                {cfg.title} • Created ✓
              </h3>
              <p className="text-sm text-gray-600 mt-1">You can now switch to this role</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="p-6 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition cursor-pointer group"
      onClick={onCreateClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg group-hover:scale-110 transition" style={{ background: cfg.color + '20' }}>
            <Icon className="w-6 h-6" style={{ color: cfg.color }} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">{cfg.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{cfg.description}</p>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="ml-14 mb-4 space-y-2">
        {cfg.benefits.map((benefit) => (
          <div key={benefit} className="flex items-center gap-2 text-sm text-gray-700">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: cfg.color }}
            />
            {benefit}
          </div>
        ))}
      </div>

      {/* Action */}
      <div className="ml-14 flex items-center gap-2 font-semibold group-hover:gap-3 transition" style={{ color: cfg.color }}>
        Create Now
        <ArrowRight className="w-4 h-4" />
      </div>
    </motion.div>
  );
}
