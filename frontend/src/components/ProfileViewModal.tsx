import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { safeExternalHref } from '../utils/safeUrl';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  MapPin, 
  Briefcase, 
  Star, 
  Calendar, 
  DollarSign,
  Award,
  MessageCircle,
  Video,
  CheckCircle,
  BadgeCheck,
  TrendingUp,
  Users,
  BookOpen,
  Linkedin,
  Globe,
  Mail,
  Phone
} from 'lucide-react';
import { brandColors } from '../utils/colors';
import { BookingModal } from './BookingModal';

interface ProfileData {
  id: number | string;
  name: string;
  avatar?: string;
  role: string;
  title?: string;
  company?: string;
  location?: string;
  rating?: number;
  reviews?: number;
  hourlyRate?: string;
  experience?: string;
  skills?: string[];
  expertise?: string[];
  bio?: string;
  availability?: string;
  responseTime?: string;
  completedProjects?: number;
  successRate?: number;
  certifications?: string[];
  education?: string[];
  portfolio?: Array<{ title: string; description: string }>;
  testimonials?: Array<{ author: string; text: string; rating: number }>;
  linkedin?: string;
  website?: string;
  email?: string;
  phone?: string;
  verified?: boolean;
  introVideo?: string;
  type: 'expert' | 'cofounder' | 'investor';
}

interface ProfileViewModalProps {
  profile: ProfileData | null;
  onClose: () => void;
  /** When set, "Send Message" closes the modal and runs this (e.g. focus existing chat or open messages). */
  onSendMessage?: () => void;
}

export function ProfileViewModal({ profile, onClose, onSendMessage }: ProfileViewModalProps) {
  const [showBooking, setShowBooking] = useState(false);

  if (!profile) return null;

  return createPortal(
    <>
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm z-0"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative z-10 w-full max-w-4xl max-h-[85vh] sm:max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-8 py-6 z-10 flex-shrink-0">
            <div className="flex items-start justify-between mb-4 sm:mb-0">
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 flex-1">
                {/* Avatar */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold flex-shrink-0 overflow-hidden relative">
                  {profile.avatar && /^https?:\/\//i.test(profile.avatar) ? (
                    <>
                      <img
                        src={profile.avatar}
                        alt={profile.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextElementSibling) {
                            e.currentTarget.nextElementSibling.classList.remove('hidden');
                            e.currentTarget.nextElementSibling.classList.add('flex');
                          }
                        }}
                      />
                      <div className="hidden items-center justify-center w-full h-full">
                        {profile.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    </>
                  ) : (
                    profile.name.split(' ').map(n => n[0]).join('')
                  )}
                </div>

                {/* Name & Title */}
                <div className="text-left flex-1">
                  <div className="flex items-center justify-start gap-2 mb-1 flex-wrap">
                    <h2 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
                      {profile.name}
                    </h2>
                    {profile.verified && (
                      <BadgeCheck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    )}
                  </div>
                  <p className="text-base sm:text-lg text-gray-700 font-medium mb-2">
                    {profile.title || profile.role}
                  </p>
                  {profile.company && (
                    <p className="text-sm sm:text-base text-gray-600 flex items-center justify-start gap-2 mb-2">
                      <Briefcase className="w-4 h-4" />
                      {profile.company}
                    </p>
                  )}
                  {profile.location && (
                    <p className="text-sm sm:text-base text-gray-600 flex items-center justify-start gap-2">
                      <MapPin className="w-4 h-4" />
                      {profile.location}
                    </p>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Stats Bar */}
            <div className="flex flex-wrap items-center justify-start gap-4 sm:gap-6 mt-4 text-sm sm:text-base">
              {profile.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold">{profile.rating}</span>
                  {profile.reviews && (
                    <span className="text-gray-500 text-sm">({profile.reviews} reviews)</span>
                  )}
                </div>
              )}
              {profile.completedProjects && (
                <div className="flex items-center gap-1 text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">{profile.completedProjects} projects</span>
                </div>
              )}
              {profile.successRate && (
                <div className="flex items-center gap-1 text-gray-600">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">{profile.successRate}% success rate</span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-6 space-y-6 overflow-y-auto flex-1 text-left">
            {/* Bio */}
            {profile.bio && (
              <div>
                <h3 className="text-xl font-bold mb-3">About</h3>
                <p className="text-gray-700 leading-relaxed mb-4">{profile.bio}</p>
                
                {profile.introVideo && (
                  <div className="mt-4 border-l-4 border-blue-500 pl-4 py-2 bg-blue-50/30 rounded-r-xl">
                    <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-3">30-Second Intro Pitch</h4>
                    <div className="rounded-xl overflow-hidden bg-black aspect-video shadow-lg max-w-xl">
                      <video 
                        src={profile.introVideo} 
                        controls 
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Key Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.hourlyRate && Capacitor.getPlatform() !== 'ios' && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="text-sm text-gray-600">Hourly Rate</div>
                    <div className="font-bold">{profile.hourlyRate}</div>
                  </div>
                </div>
              )}
              {profile.experience && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-sm text-gray-600">Experience</div>
                    <div className="font-bold">{profile.experience}</div>
                  </div>
                </div>
              )}
              {profile.availability && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="text-sm text-gray-600">Availability</div>
                    <div className="font-bold">{profile.availability}</div>
                  </div>
                </div>
              )}
              {profile.responseTime && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-orange-600" />
                  <div>
                    <div className="text-sm text-gray-600">Response Time</div>
                    <div className="font-bold">{profile.responseTime}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Skills/Expertise */}
            {(profile.skills || profile.expertise) && (
              <div>
                <h3 className="text-xl font-bold mb-3">
                  {profile.type === 'expert' ? 'Skills & Expertise' : 'Expertise'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(profile.skills || profile.expertise || []).map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {profile.certifications && profile.certifications.length > 0 && (
              <div>
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Certifications
                </h3>
                <ul className="space-y-2">
                  {(profile.certifications || []).map((cert, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      {cert}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Education */}
            {profile.education && profile.education.length > 0 && (
              <div>
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Education
                </h3>
                <ul className="space-y-2">
                  {(profile.education || []).map((edu, idx) => (
                    <li key={idx} className="text-gray-700">
                      {edu}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Portfolio */}
            {profile.portfolio && profile.portfolio.length > 0 && (
              <div>
                <h3 className="text-xl font-bold mb-3">Portfolio</h3>
                <div className="space-y-4">
                  {profile.portfolio.map((item, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-bold mb-2">{item.title}</h4>
                      <p className="text-gray-600 text-sm">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Testimonials */}
            {profile.testimonials && profile.testimonials.length > 0 && (
              <div>
                <h3 className="text-xl font-bold mb-3">Testimonials</h3>
                <div className="space-y-4">
                  {profile.testimonials.map((testimonial, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < testimonial.rating
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-gray-700 mb-2 italic">"{testimonial.text}"</p>
                      <p className="text-sm text-gray-600 font-medium">— {testimonial.author}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Info */}
            {(profile.email || profile.phone || profile.linkedin || profile.website) && (
            <div>
              <h3 className="text-xl font-bold mb-3">Contact Information</h3>
              <div className="space-y-2">
                {profile.email && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${profile.email}`} className="hover:text-blue-600">
                      {profile.email}
                    </a>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${profile.phone}`} className="hover:text-blue-600">
                      {profile.phone}
                    </a>
                  </div>
                )}
                {profile.linkedin && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Linkedin className="w-4 h-4" />
                    <a
                      href={safeExternalHref(profile.linkedin)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-600"
                    >
                      LinkedIn Profile
                    </a>
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Globe className="w-4 h-4" />
                    <a
                      href={safeExternalHref(profile.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-600"
                    >
                      {profile.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-8 py-5 flex flex-col sm:flex-row gap-3 sm:items-stretch flex-shrink-0">
            {onSendMessage ? (
              <button
                type="button"
                onClick={() => onSendMessage()}
                className="w-full sm:flex-1 min-h-[48px] px-4 py-3 rounded-xl text-sm sm:text-base font-semibold text-white flex items-center justify-center gap-2 text-center leading-snug shadow-md hover:opacity-95 transition-opacity"
                style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
              >
                <MessageCircle className="w-5 h-5 flex-shrink-0" />
                <span className="break-words">Send message</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowBooking(true)}
              className="w-full sm:flex-1 min-h-[48px] px-4 py-3 border-2 border-blue-600 text-blue-600 rounded-xl text-sm sm:text-base font-semibold flex items-center justify-center gap-2 text-center leading-snug hover:bg-blue-50 transition-colors"
            >
              <Video className="w-5 h-5 flex-shrink-0" />
              <span className="break-words">Schedule call</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
    
    {showBooking && (
      <BookingModal expert={profile} onClose={() => setShowBooking(false)} />
    )}
    </>,
    document.body
  );
}