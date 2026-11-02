import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, Mail, Phone, MapPin, Send } from 'lucide-react';
import logoImage from '../assets/logo.png';
import { brandColors } from '../utils/colors';
import { Footer } from './Footer';
import { useState } from 'react';
import api from '../services/api';
import { toast } from 'sonner';

export function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post('/public/contact', {
        name: formData.name,
        email: formData.email,
        company: formData.company,
        subject: formData.subject,
        message: formData.message,
      });
      setSubmitSuccess(true);
      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({ name: '', email: '', company: '', subject: '', message: '' });
        setSubmitSuccess(false);
      }, 3000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="border-b border-gray-200"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 lg:px-8 py-4">
          <a href="#" className="flex items-center gap-2">
            <img
              src={logoImage}
              alt="Next Ignition Logo"
              className="h-6 lg:h-8 cursor-pointer"
              onClick={() => window.location.hash = '#'}
            />
          </a>
          <a
            href="#"
            onClick={() => (window.location.hash = '#')}
            className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: brandColors.electricBlue }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </a>
        </div>
      </motion.nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Left Column - Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">Get in Touch</h1>
            <p className="text-gray-600 text-lg mb-8">
              Have a question or want to learn more about NextIgnition? We'd love to hear from you. 
              Fill out the form and our team will get back to you within 24 hours.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${brandColors.electricBlue}15` }}
                >
                  <Mail className="w-5 h-5" style={{ color: brandColors.electricBlue }} />
                </div>
                <div>
                  <h3 className="font-bold mb-1">Email Us</h3>
                  <p className="text-gray-600">support@nextignition.com</p>
                  <p className="text-sm text-gray-500">Support &amp; user help</p>
                  <p className="text-gray-600 mt-2">connect@nextignition.com</p>
                  <p className="text-sm text-gray-500">Collaborations only</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${brandColors.atomicOrange}15` }}
                >
                  <Phone className="w-5 h-5" style={{ color: brandColors.atomicOrange }} />
                </div>
                <div>
                  <h3 className="font-bold mb-1">Call Us</h3>
                  <p className="text-gray-600">+91 89996 96950</p>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="mt-12 p-6 rounded-2xl" style={{ backgroundColor: `${brandColors.electricBlue}08` }}>
              <h3 className="font-bold mb-3">Quick Links</h3>
              <div className="space-y-2">
                {Capacitor.getPlatform() !== 'ios' && (
                  <a href="#pricing" className="block text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    → View Pricing Plans
                  </a>
                )}
                <a href="#faq" className="block text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  → Frequently Asked Questions
                </a>
                <a href="#features" className="block text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  → Explore Features
                </a>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <form onSubmit={handleSubmit} className="bg-gray-50 rounded-2xl p-6 lg:p-8">
              <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>

              {submitSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-lg text-white"
                  style={{ backgroundColor: brandColors.electricBlue }}
                >
                  <p className="font-medium">✓ Message sent successfully!</p>
                  <p className="text-sm opacity-90">We'll get back to you soon.</p>
                </motion.div>
              )}

              <div className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
                    placeholder="Your Company"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium mb-2">
                    Subject *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all bg-white"
                  >
                    <option value="">Select a subject</option>
                    <option value="general">General Inquiry</option>
                    <option value="sales">Sales & Pricing</option>
                    <option value="support">Technical Support</option>
                    <option value="partnership">Partnership Opportunities</option>
                    <option value="feedback">Feedback & Suggestions</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all resize-none"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: brandColors.atomicOrange }}
                  onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={(e) => !isSubmitting && (e.currentTarget.style.opacity = '1')}
                >
                  {isSubmitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-4 text-center">
                By submitting this form, you agree to our{' '}
                <a href="#privacy" className="underline" style={{ color: brandColors.electricBlue }}>
                  Privacy Policy
                </a>
              </p>
            </form>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}