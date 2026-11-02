import { motion } from 'framer-motion';
import { ArrowRight, Twitter, Mail, Linkedin, Facebook, Instagram, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { brandColors } from '../utils/colors';
import logoImage from '../assets/logo.png';
import { OrangeGlobe } from './OrangeGlobe';
import { Capacitor } from '@capacitor/core';

export function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [newsletterMessage, setNewsletterMessage] = useState('');

  const socialLinks = {
    twitter: 'https://x.com/next_ignition?s=21',
    linkedin: 'https://www.linkedin.com/company/nextignition-official/',
    facebook: 'https://www.facebook.com/share/1FoxN5jqvU/?mibextid=wwXIfr',
    instagram: 'https://www.instagram.com/next.ignition?igsh=ZnZ4N2ZmdHJvMHpo&utm_source=qr',
    whatsapp: 'https://chat.whatsapp.com/FqTkzzorqpNHavQLCKlj0c',
  };

  const handleNewsletterSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const email = newsletterEmail.trim();

    if (!email) {
      setNewsletterStatus('error');
      setNewsletterMessage('Please enter your email.');
      return;
    }

    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValid) {
      setNewsletterStatus('error');
      setNewsletterMessage('Please enter a valid email address.');
      return;
    }

    try {
      const existingRaw = localStorage.getItem('newsletterSubscribers');
      const existing = existingRaw ? (JSON.parse(existingRaw) as string[]) : [];
      const next = Array.from(new Set([...existing, email]));
      localStorage.setItem('newsletterSubscribers', JSON.stringify(next));
      setNewsletterStatus('success');
      setNewsletterMessage('Subscribed! Check your inbox soon.');
      setNewsletterEmail('');
    } catch {
      setNewsletterStatus('error');
      setNewsletterMessage('Subscription failed. Please try again.');
    }
  };

  const productLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How it Works', href: '#how-it-works' },
    { label: 'AI Tools', href: '#ai-tools' },
    { label: 'Events', href: '#events-info' },
    ...(Capacitor.getPlatform() === 'ios' ? [] : [{ label: 'Pricing', href: '#pricing' }]),
  ];

  const resourceLinks = [
    { label: 'Industry Community', href: '#industry-community' },
    { label: 'Growth Tracking', href: '#growth-tracking' },
    { label: 'Security', href: '#security-info' },
    { label: 'Testimonials', href: '#testimonials' },
    { label: 'Why Choose Us', href: '#why-choose-us' },
  ];

  const companyLinks = [
    { label: 'About', href: '#about' },
    { label: 'Roles', href: '#roles' },
    { label: 'Contact', href: '#contact' },
    { label: 'Free Registration', href: '#register' },
    { label: 'After Signup', href: '#after-signup' },
    { label: 'FAQ', href: '#faq' },
  ];

  const legalLinks = [
    { label: 'Privacy Policy', href: '#privacy' },
    { label: 'Terms of Service', href: '#terms' },
    { label: 'Cookie Policy', href: '#cookie-policy' },
    { label: 'Delete Account', href: '#delete-account' },
    { label: 'Admin Access', href: '#admin-dashboard' },
  ];

  return (
    <footer className="relative bg-[#1a1a1a] text-white overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 rounded-full"
          style={{ backgroundColor: brandColors.electricBlue }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-40 right-20 w-96 h-96 rounded-full"
          style={{ backgroundColor: brandColors.atomicOrange }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.05, 0.08, 0.05],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8">
        {/* Newsletter Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="py-16 border-b border-gray-800"
        >
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-3xl font-bold mb-3">Stay in the Loop</h3>
            <p className="text-gray-400 text-base mb-8">
              Get startup tips, platform updates, and exclusive content delivered to your inbox.
            </p>

            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input name="input-8eb7c8"
                  type="email"
                  placeholder="Enter your email"
                  value={newsletterEmail}
                  onChange={(e) => {
                    setNewsletterEmail(e.target.value);
                    if (newsletterStatus !== 'idle') {
                      setNewsletterStatus('idle');
                      setNewsletterMessage('');
                    }
                  }}
                  className="w-full pl-12 pr-4 py-3.5 rounded-full bg-[#2a2a2a] border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-8 py-3.5 rounded-full font-bold text-white hover:shadow-2xl transition-all group flex items-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${brandColors.atomicOrange}, ${brandColors.electricBlue})`
                }}
              >
                Subscribe
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            {newsletterMessage && (
              <div className={`mt-4 text-sm ${newsletterStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {newsletterMessage}
              </div>
            )}
          </div>
        </motion.div>

        {/* Main Footer Content */}
        <div className="py-16 grid grid-cols-12 gap-6 lg:gap-12 relative">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="col-span-12 lg:col-span-4 relative z-20"
          >
            <div className="flex items-center gap-2 mb-[32px] mt-[0px] mr-[0px] ml-[0px]">
              <img 
                src={logoImage} 
                alt="NextIgnition Logo" 
                className=""
                style={{ width: '50%' }}
              />
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3 relative z-20">
              <a
                href={socialLinks.twitter}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] flex items-center justify-center transition-colors group"
              >
                <Twitter className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              </a>
              <a
                href={socialLinks.linkedin}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] flex items-center justify-center transition-colors group"
              >
                <Linkedin className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              </a>
              <a
                href={socialLinks.facebook}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] flex items-center justify-center transition-colors group"
              >
                <Facebook className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              </a>
              <a
                href={socialLinks.instagram}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] flex items-center justify-center transition-colors group"
              >
                <Instagram className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              </a>
              <a
                href={socialLinks.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] flex items-center justify-center transition-colors group"
              >
                <MessageCircle className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              </a>
            </div>
          </motion.div>

          {/* Product Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="col-span-6 lg:col-span-2 relative z-20"
          >
            <h4 className="font-bold text-sm mb-4" style={{ color: brandColors.electricBlue }}>
              Product
            </h4>
            <ul className="space-y-3 relative z-20">
              {productLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2 group"
                  >
                    {link.label}
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Resources Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="col-span-6 lg:col-span-2 relative z-20"
          >
            <h4 className="font-bold text-sm mb-4" style={{ color: brandColors.atomicOrange }}>
              Resources
            </h4>
            <ul className="space-y-3 relative z-20">
              {resourceLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2 group"
                  >
                    {link.label}
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Company Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="col-span-6 lg:col-span-2 relative z-20"
          >
            <h4 className="font-bold text-sm mb-4" style={{ color: brandColors.electricBlue }}>
              Company
            </h4>
            <ul className="space-y-3 relative z-20">
              {companyLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2 group"
                  >
                    {link.label}
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Legal Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="col-span-6 lg:col-span-2 relative z-20"
          >
            <h4 className="font-bold text-sm mb-4" style={{ color: brandColors.atomicOrange }}>
              Legal
            </h4>
            <ul className="space-y-3 relative z-20">
              {legalLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2 group"
                  >
                    {link.label}
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="py-8 border-t border-gray-800 flex items-center justify-between relative"
        >
          {/* Orange Globe Background - Desktop */}
          <div className="hidden lg:block absolute w-[250px] h-[250px] lg:w-[600px] lg:h-[600px] bottom-0 right-1/2 translate-x-[-130%] translate-y-[50%] lg:right-0 z-0">
            <div className="w-full h-[400px]">
              <OrangeGlobe opacity={0.5} />
            </div>
          </div>

          {/* Orange Globe Background - Mobile */}
          <div className="block lg:hidden absolute w-[240px] h-[240px] sm:w-[320px] sm:h-[320px] bottom-0 left-1/2 -translate-x-[130%] translate-y-[20%] z-0">
            <div className="w-full h-[400px]">
              <OrangeGlobe opacity={0.6} />
            </div>
          </div>
          
          <p className="text-xs sm:text-sm text-[rgb(255,255,255)] relative z-10 text-center sm:text-left">
            © 2026 NextIgnition. All rights reserved.
          </p>

          <button
            className="px-6 py-2.5 rounded-full font-bold text-sm hover:shadow-xl transition-all group flex items-center gap-2 relative z-10"
            style={{
              backgroundColor: brandColors.atomicOrange
            }}
            onClick={() => {
              window.location.hash = '#login';
            }}
          >
            Launch App
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </footer>
  );
}