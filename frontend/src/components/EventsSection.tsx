import { motion, AnimatePresence } from 'framer-motion';
import { Video, ArrowRight, Calendar, Users, Lightbulb, Clock, BookOpen, MessageCircle, Download, PlayCircle, User, Network, MapPin, ExternalLink, BadgeCheck } from 'lucide-react';
import { brandColors } from '../utils/colors';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { getCurrentUser } from '../services/authService';

interface ApiEvent {
  _id: string;
  title: string;
  description: string;
  type: string;
  hostType: 'platform' | 'expert' | 'investor' | 'founder';
  hostUser?: {
    _id: string;
    name: string;
    role: string;
    avatar?: string;
    isVerified?: boolean;
  };
  status: string;
  startAt: string;
  durationMinutes: number;
  format: 'virtual' | 'in-person';
  location?: string;
  meetingLink?: string;
  priceType: 'free' | 'paid';
  priceAmount?: number;
  maxAttendees?: number;
  thumbnailUrl?: string;
}

export function EventsSection() {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const resp = await api.get('/events', { params: { status: 'upcoming', hostType: 'expert' } });
        const filtered = (resp.data as ApiEvent[]).filter(e => e.hostType === 'expert');
        setEvents(filtered.slice(0, 6)); // Show top 6
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const handleJoin = (eventId: string) => {
    const user = getCurrentUser();
    if (!user) {
      window.location.hash = '#login';
      return;
    }
    // If logged in, go to events page or specific event
    window.location.hash = '#events';
  };

  const eventTypes = [
    {
      icon: Video,
      title: 'Live Events',
      description: 'Weekly sessions with industry experts, interactive Q&A sessions, real time learning, and expert insights and tips.',
      color: brandColors.atomicOrange,
      gradient: 'from-orange-50 to-white',
    },
    {
      icon: Lightbulb,
      title: 'Expert Led Workshops',
      description: 'Hands on learning experiences, practical skills development, step by step guidance, and actionable takeaways.',
      color: brandColors.electricBlue,
      gradient: 'from-blue-50 to-white',
    },
    {
      icon: Network,
      title: 'Networking Sessions',
      description: 'Connect with peers, meet industry experts, build your network, share experiences, and find collaborators.',
      color: brandColors.navyBlue,
      gradient: 'from-indigo-50 to-white',
    },
  ];

  const eventFeatures = [
    { icon: Clock, text: 'Auto reminders via email and app' },
    { icon: Calendar, text: 'Calendar integration' },
    { icon: BookOpen, text: 'Recorded sessions library' },
    { icon: Download, text: 'Downloadable materials' },
    { icon: PlayCircle, text: 'Event replays' },
    { icon: User, text: 'Speaker profiles' },
    { icon: MessageCircle, text: 'Event chat and networking' },
    { icon: Download, text: 'Post event resources' },
  ];

  const upcomingTopics = [
    'Fundraising Strategies for Startups',
    'Product Market Fit: Finding Your Niche',
    'Growth Hacking Techniques',
    'Legal Essentials for Startups',
    'Scaling Your Team Effectively',
    'Investor Pitch Best Practices',
    'Marketing on a Startup Budget',
    'Industry Specific Insights',
  ];

  const colors = [brandColors.atomicOrange];

  return (
    <section id="events" className="relative bg-white py-12 lg:py-24 overflow-hidden">

      {/* Animated Background Icons — CSS-only for scroll performance */}
      <div
        className="absolute top-20 right-20 w-24 h-24 rounded-2xl items-center justify-center pointer-events-none opacity-10 hidden md:flex"
        style={{ backgroundColor: `${brandColors.electricBlue}22`, animation: 'floatY 6s ease-in-out infinite', willChange: 'transform' }}
      >
        <Video className="w-12 h-12" style={{ color: brandColors.electricBlue }} />
      </div>

      <div
        className="absolute top-1/3 right-10 w-20 h-20 rounded-xl items-center justify-center pointer-events-none opacity-10 hidden md:flex"
        style={{ backgroundColor: `${brandColors.atomicOrange}22`, animation: 'floatYReverse 7s ease-in-out 1s infinite', willChange: 'transform' }}
      >
        <Calendar className="w-10 h-10" style={{ color: brandColors.atomicOrange }} />
      </div>

      <div
        className="absolute bottom-1/4 right-32 w-16 h-16 rounded-lg items-center justify-center pointer-events-none opacity-10 hidden md:flex"
        style={{ backgroundColor: `${brandColors.navyBlue}22`, animation: 'floatY 8s ease-in-out 2s infinite', willChange: 'transform' }}
      >
        <PlayCircle className="w-8 h-8" style={{ color: brandColors.navyBlue }} />
      </div>

      <div
        className="absolute top-1/2 right-16 w-14 h-14 rounded-full items-center justify-center pointer-events-none opacity-10 hidden md:flex"
        style={{ backgroundColor: `${brandColors.electricBlue}22`, animation: 'floatScale 5s ease-in-out 0.5s infinite', willChange: 'transform' }}
      >
        <MessageCircle className="w-7 h-7" style={{ color: brandColors.electricBlue }} />
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wider mb-4"
            style={{ 
              backgroundColor: `${brandColors.electricBlue}22`,
              color: brandColors.electricBlue 
            }}
          >
            <Video className="w-4 h-4" />
            EVENTS
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl leading-tight tracking-tight mb-4">
            Learn from Industry Leaders <br className="hidden md:block" /> All Free
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-2xl">
            Access expert knowledge through free events. Weekly sessions with industry experts, interactive Q&A, and recorded sessions library.
          </p>
        </motion.div>

        {/* Real Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {loading ? (
            // Skeleton Loading
            [1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm animate-pulse">
                <div className="w-full h-48 bg-gray-100 rounded-2xl mb-4" />
                <div className="h-6 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-full mb-4" />
                <div className="h-10 bg-gray-100 rounded-full w-full" />
              </div>
            ))
          ) : events.length > 0 ? (
            events.map((event) => (
              <motion.div
                key={event._id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all group"
              >
                {/* Event Thumbnail */}
                <div className="relative aspect-video rounded-2xl overflow-hidden mb-6 bg-gray-100">
                  <img 
                    src={event.thumbnailUrl || 'https://images.unsplash.com/photo-1561089489-f13d5e730d72?auto=format&fit=crop&q=80'} 
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1561089489-f13d5e730d72?auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-600 shadow-sm">
                    {event.type}
                  </div>
                  {event.priceType === 'free' && (
                    <div className="absolute top-4 right-4 px-3 py-1 bg-green-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                      FREE
                    </div>
                  )}
                </div>

                {/* Host Info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold overflow-hidden">
                    {event.hostUser?.avatar ? (
                      <img 
                        src={event.hostUser.avatar} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const initials = (event.hostUser?.name || 'NI').charAt(0);
                          const fallbackDiv = document.createElement('div');
                          fallbackDiv.className = 'w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 font-bold';
                          fallbackDiv.textContent = initials;
                          e.currentTarget.parentElement?.appendChild(fallbackDiv);
                        }}
                      />
                    ) : (
                      (event.hostUser?.name || 'NI').charAt(0)
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-bold text-gray-900">{event.hostUser?.name || 'NextIgnition'}</p>
                      {event.hostUser?.isVerified && <BadgeCheck className="w-3 h-3 text-blue-500" />}
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{event.hostUser?.role || 'Host'}</p>
                  </div>
                </div>

                {/* Event Details */}
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {event.title}
                </h3>
                <p className="text-sm text-gray-600 mb-6 line-clamp-2 min-h-[40px]">
                  {event.description}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-medium">
                      {new Date(event.startAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-medium">
                      {new Date(event.startAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-medium">{event.maxAttendees || 'Unlimited'} Capacity</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    {event.format === 'virtual' ? (
                      <>
                        <ExternalLink className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-medium">Virtual</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-medium">In Person</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleJoin(event._id)}
                  className="w-full py-4 rounded-2xl bg-gray-900 text-white font-bold text-sm hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 group/btn shadow-lg shadow-gray-200"
                >
                  Join Now
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-200">
                <Calendar className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No upcoming events scheduled</p>
            </div>
          )}
        </div>

        {/* Three Event Types - Horizontal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-16 md:mb-24">
          {eventTypes.map((type, index) => {
            const Icon = type.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                className={`bg-gradient-to-br ${type.gradient} rounded-3xl p-8 relative overflow-hidden group hover:shadow-2xl transition-all`}
              >
                {/* Icon */}
                <motion.div
                  initial={{ rotate: 0 }}
                  whileInView={{ rotate: 360 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto"
                  style={{ backgroundColor: `${type.color}22` }}
                >
                  <Icon className="w-8 h-8" style={{ color: type.color }} />
                </motion.div>

                {/* Title */}
                <h3 className="text-xl font-bold mb-4 text-center" style={{ color: type.color }}>
                  {type.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-700 leading-relaxed text-center">
                  {type.description}
                </p>

                {/* Decorative element */}
                <div 
                  className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full opacity-10"
                  style={{ backgroundColor: type.color }}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Event Features Section - Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-16 md:mb-24 items-start">
          {/* Left: Heading */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-4"
          >
            <h3 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
              Event Features
            </h3>
            <p className="text-gray-600 text-base leading-relaxed">
              Everything you need for seamless event participation
            </p>

            {/* Decorative Infographic Element */}
            <div className="mt-8 relative">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="w-32 h-32 rounded-full relative"
                style={{ backgroundColor: `${brandColors.electricBlue}22` }}
              >
                <div 
                  className="absolute inset-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${brandColors.electricBlue}33` }}
                >
                  <Calendar className="w-10 h-10" style={{ color: brandColors.electricBlue }} />
                </div>
                {/* Orbiting dots */}
                <div
                  style={{ animation: 'spin 8s linear infinite' }}
                  className="absolute inset-0"
                >
                  <div 
                    className="absolute top-0 left-1/2 w-3 h-3 rounded-full -ml-1.5"
                    style={{ backgroundColor: brandColors.atomicOrange }}
                  />
                </div>
                <div
                  style={{ animation: 'spin 10s linear infinite reverse' }}
                  className="absolute inset-0"
                >
                  <div 
                    className="absolute bottom-2 right-2 w-2 h-2 rounded-full"
                    style={{ backgroundColor: brandColors.navyBlue }}
                  />
                </div>
              </motion.div>

              {/* Stats Element */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mt-6 p-4 rounded-xl"
                style={{ backgroundColor: `${brandColors.atomicOrange}11` }}
              >
                <div className="text-3xl font-bold" style={{ color: brandColors.atomicOrange }}>
                  8
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  Key Features
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right: 4x2 Grid */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
              {eventFeatures.map((feature, index) => {
                const Icon = feature.icon;
                const color = colors[index % colors.length];
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.05 * index }}
                    className="group relative bg-white rounded-2xl p-4 md:p-5 hover:shadow-lg transition-all border border-gray-100"
                  >
                    {/* Number Badge and Icon */}
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </div>
                    </div>

                    {/* Feature Text */}
                    <p className="text-sm text-gray-800 leading-snug font-medium">
                      {feature.text}
                    </p>

                    {/* Accent Line */}
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: '50px' }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.1 + index * 0.05 }}
                      className="h-1 mt-4 rounded-full"
                      style={{ backgroundColor: color }}
                    />

                    {/* Decorative corner element */}
                    <div className="absolute top-0 right-0 w-16 h-16 opacity-5 flex items-center justify-center">
                      <Icon className="w-12 h-12" style={{ color: color }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Upcoming Event Topics - Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 mb-12 md:mb-16 p-5 md:p-6 lg:p-8 rounded-2xl bg-[rgb(26,26,26)]">
          {/* Left: Heading */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-4"
          >
            <h3 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight text-[rgb(255,255,255)]">
              Upcoming Event Topics
            </h3>
            <p className="text-[rgb(255,255,255)] text-base leading-relaxed mb-6">
              Learn from industry leaders on these key topics
            </p>

            {/* Decorative Infographic Element */}
            <div className="relative hidden lg:block">
              {/* Stacked Circles */}
              <div className="flex items-center gap-2 mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${brandColors.atomicOrange}22` }}
                >
                  <Lightbulb className="w-7 h-7" style={{ color: brandColors.atomicOrange }} />
                </motion.div>
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${brandColors.electricBlue}22` }}
                >
                  <Users className="w-7 h-7" style={{ color: brandColors.electricBlue }} />
                </motion.div>
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${brandColors.white}22` }}
                >
                  <Video className="w-7 h-7" style={{ color: brandColors.white }} />
                </motion.div>
              </div>

              {/* Connection Lines */}
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="flex items-center gap-2 mb-4"
              >
                <div className="h-0.5 flex-1 rounded" style={{ backgroundColor: brandColors.atomicOrange }} />
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: brandColors.electricBlue }} />
                <div className="h-0.5 flex-1 rounded" style={{ backgroundColor: brandColors.white }} />
              </motion.div>

              {/* "And many more..." */}
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="text-base font-semibold italic"
                style={{ color: brandColors.atomicOrange }}
              >
                And many more...
              </motion.p>
            </div>
          </motion.div>

          {/* Right: Two Column List */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 lg:gap-x-8 gap-y-3 lg:gap-y-4">
              {upcomingTopics.map((topic, index) => {
                const color = colors[index % colors.length];
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.05 * index }}
                    className="flex items-start gap-3 group cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    {/* Number Circle */}
                    <div 
                      className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-base group-hover:scale-110 transition-transform"
                      style={{ 
                        backgroundColor: `${color}22`,
                        color: color 
                      }}
                    >
                      {index + 1}
                    </div>

                    {/* Topic Text */}
                    <div className="flex-1 pt-1">
                      <p className="text-sm font-semibold text-[rgb(255,255,255)] group-hover:text-black group-hover:translate-x-1 transition-transform leading-snug">
                        {topic}
                      </p>
                    </div>

                    {/* Arrow on Hover */}
                    <ArrowRight 
                      className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity mt-1.5 flex-shrink-0" 
                      style={{ color: color }}
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center"
        >
          <button
            onClick={() => {
              const user = getCurrentUser();
              window.location.hash = user ? '#events' : '#signup';
            }}
            className="group inline-flex items-center gap-3 px-10 py-4 rounded-full text-gray-900 font-bold text-base hover:shadow-2xl transition-all hover:gap-4"
            style={{
              background: `linear-gradient(135deg, ${brandColors.atomicOrange}, ${brandColors.electricBlue})`
            }}
          >
            Register for Free Events
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}