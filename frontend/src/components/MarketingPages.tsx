import React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import logoImage from '../assets/logo.png';
import { brandColors } from '../utils/colors';
import { Footer } from './Footer';
import { FeaturesSection } from './FeaturesSection';
import { JourneySection } from './JourneySection';
import { RolesSection } from './RolesSection';
import { AIToolsSection } from './AIToolsSection';
import { CommunitySection } from './CommunitySection';
import { EventsSection } from './EventsSection';
import { GrowthTrackingSection } from './GrowthTrackingSection';
import { SecuritySection } from './SecuritySection';
import { SuccessStoriesSection } from './SuccessStoriesSection';
import { WhyChooseSection } from './WhyChooseSection';
import { MissionSection } from './MissionSection';
import { PricingSection } from './PricingSection';
import { FAQSection } from './FAQSection';

type MarketingPageShellProps = {
  title: string;
  subtitle?: string;
  hashBack?: string;
  children: ReactNode;
};

function MarketingPageShell({ title, subtitle, hashBack = '#', children }: MarketingPageShellProps) {
  return (
    <div className="min-h-screen bg-white">
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="border-b border-gray-200 sticky top-0 bg-white/80 backdrop-blur-md z-50"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 lg:px-8 py-3 lg:py-4">
          <a href={hashBack} className="flex items-center gap-2">
            <img
              src={logoImage}
              alt="Next Ignition Logo"
              className="h-8 lg:h-10 cursor-pointer object-contain"
              onClick={() => (window.location.hash = hashBack)}
            />
          </a>

          <div className="flex items-center gap-2 lg:gap-4">
            <a
              href={hashBack}
              className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity p-2"
              style={{ color: brandColors.electricBlue }}
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = hashBack;
              }}
            >
              <ArrowLeft className="w-5 h-5 lg:w-4 lg:h-4" />
              <span className="hidden md:inline">Back</span>
            </a>

            <button
              className="hidden lg:flex px-4 py-2 font-bold text-sm text-blue-600 hover:opacity-80 transition-all items-center gap-2"
              onClick={() => {
                window.location.hash = '#register';
              }}
            >
              Free Registration
            </button>
            <button
              className="px-4 lg:px-6 py-2 rounded-full font-bold text-xs lg:text-sm hover:shadow-lg transition-all group flex items-center gap-2"
              style={{ backgroundColor: brandColors.atomicOrange, color: brandColors.white }}
              onClick={() => {
                window.location.hash = '#login';
              }}
            >
              <span className="hidden sm:inline">Launch App</span>
              <span className="sm:hidden">Launch</span>
              <ArrowRight className="w-3 h-3 lg:w-4 lg:h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </motion.nav>


      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <h1 className="text-4xl lg:text-5xl font-bold mb-2">{title}</h1>
          {subtitle ? <p className="text-gray-600">{subtitle}</p> : null}
        </motion.div>
      </div>

      <div className="-mt-8">{children}</div>
      <Footer />
    </div>
  );
}

export function FeaturesPage() {
  return (
    <MarketingPageShell
      title="Features"
      subtitle="A quick overview of what you can do on NextIgnition."
    >
      <FeaturesSection />
    </MarketingPageShell>
  );
}

export function HowItWorksPage() {
  return (
    <MarketingPageShell
      title="How It Works"
      subtitle="Understand the journey from idea to launch and growth."
    >
      <JourneySection />
    </MarketingPageShell>
  );
}

export function AIToolsPage() {
  return (
    <MarketingPageShell
      title="AI Tools"
      subtitle="Use AI to move faster with better outcomes."
    >
      <AIToolsSection />
    </MarketingPageShell>
  );
}

export function EventsInfoPage() {
  return (
    <MarketingPageShell
      title="Events"
      subtitle="Learn from industry leaders and connect with the community."
    >
      <EventsSection />
    </MarketingPageShell>
  );
}

export function PricingPage() {
  // iOS compliance: Apple Guideline 3.1.1 prohibits displaying pricing tables
  // for digital goods outside of the StoreKit payment sheet.
  // On iOS, subscriptions are managed via the in-app SubscriptionPage.
  if (Capacitor.getPlatform() === 'ios') {
    return (
      <MarketingPageShell
        title="Subscription Plans"
        subtitle="Manage your subscription from within the app."
      >
        <div className="max-w-2xl mx-auto px-4 pb-16 text-center">
          <p className="text-gray-600">
            To view plans and manage your subscription, please sign in and visit your account settings.
          </p>
          <button
            className="mt-6 px-6 py-3 rounded-full font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all"
            onClick={() => { window.location.hash = '#login'; }}
          >
            Sign In
          </button>
        </div>
      </MarketingPageShell>
    );
  }
  return (
    <MarketingPageShell
      title="Pricing"
      subtitle="Simple plans that scale with you."
    >
      <PricingSection />
    </MarketingPageShell>
  );
}

export function IndustryCommunityPage() {
  return (
    <MarketingPageShell
      title="Industry Community"
      subtitle="Find your people and grow through high-signal connections."
    >
      <CommunitySection />
    </MarketingPageShell>
  );
}

export function GrowthTrackingPage() {
  return (
    <MarketingPageShell
      title="Growth Tracking"
      subtitle="Track progress, milestones, and traction."
    >
      <GrowthTrackingSection />
    </MarketingPageShell>
  );
}

export function SecurityInfoPage() {
  const lastUpdated = 'April 7, 2025';
  const contactEmail = 'support@nextignition.com';

  const sectionStyle: CSSProperties = {
    marginBottom: '2.5rem',
  };
  const h2Style: CSSProperties = {
    fontSize: '1.35rem',
    fontWeight: 700,
    marginBottom: '0.75rem',
    color: '#111827',
    borderBottom: '2px solid #f97316',
    paddingBottom: '0.4rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };
  const pStyle: CSSProperties = {
    color: '#374151',
    lineHeight: '1.75',
    marginBottom: '0.75rem',
  };
  const ulStyle: CSSProperties = {
    paddingLeft: '1.5rem',
    color: '#374151',
    lineHeight: '1.75',
    marginBottom: '0.75rem',
  };
  const badgeStyle: CSSProperties = {
    display: 'inline-block',
    background: '#fee2e2',
    color: '#b91c1c',
    fontWeight: 700,
    fontSize: '0.78rem',
    borderRadius: '9999px',
    padding: '0.15rem 0.65rem',
    marginRight: '0.5rem',
    verticalAlign: 'middle',
  };
  const greenBadgeStyle: CSSProperties = {
    display: 'inline-block',
    background: '#dcfce7',
    color: '#166534',
    fontWeight: 700,
    fontSize: '0.78rem',
    borderRadius: '9999px',
    padding: '0.15rem 0.65rem',
    marginRight: '0.5rem',
    verticalAlign: 'middle',
  };
  const calloutStyle: CSSProperties = {
    background: '#fff7ed',
    border: '1px solid #fdba74',
    borderRadius: '0.75rem',
    padding: '1.25rem 1.5rem',
    marginBottom: '1.5rem',
    color: '#9a3412',
    fontWeight: 600,
    lineHeight: '1.7',
  };
  const infoBannerStyle: CSSProperties = {
    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
    borderRadius: '1rem',
    padding: '2rem',
    color: '#fff',
    marginBottom: '2.5rem',
    boxShadow: '0 8px 30px rgba(67,56,202,0.3)',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #e5e7eb', padding: '1rem 0' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="#home" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: '#4f46e5', fontWeight: 700, fontSize: '1.1rem' }}>
            ← NextIgnition
          </a>
          <a
            href={`mailto:${contactEmail}`}
            style={{ fontSize: '0.85rem', color: '#6b7280', textDecoration: 'none' }}
          >
            {contactEmail}
          </a>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>
            Safety, Privacy & Security Standards
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
            Last Updated: {lastUpdated}
          </p>
        </div>

        {/* Hero Banner */}
        <div style={infoBannerStyle}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            🔒 NextIgnition — Child Safety & Platform Integrity Commitment
          </div>
          <p style={{ margin: 0, opacity: 0.9, lineHeight: '1.7', fontSize: '0.97rem' }}>
            NextIgnition is a professional startup platform for founders, experts, and investors. We
            maintain a strict, zero-tolerance policy against child sexual abuse and exploitation (CSAE),
            child sexual abuse material (CSAM), and any content or behavior that endangers minors. This
            page documents our safety standards, prohibited content policies, reporting mechanisms, and
            enforcement practices in compliance with applicable app store child safety standards.
          </p>
        </div>

        {/* 1. Platform Age Requirement */}
        <div style={sectionStyle}>
          <h2 style={h2Style}>1. Platform Age Requirement</h2>
          <p style={pStyle}>
            <span style={badgeStyle}>REQUIRED</span>
            NextIgnition is intended exclusively for users who are <strong>18 years of age or older</strong>.
            We do not knowingly allow minors to register or use our platform. During registration, all users
            are required to confirm that they meet this age requirement by accepting our Terms of Service.
          </p>
          <p style={pStyle}>
            If we discover that a user under 18 has created an account, that account will be immediately
            suspended and all associated data will be deleted in accordance with applicable privacy laws,
            including COPPA and GDPR provisions relating to minors.
          </p>
        </div>

        {/* 2. Child Safety & CSAE Zero-Tolerance Policy */}
        <div style={sectionStyle}>
          <h2 style={h2Style}>2. Child Safety & CSAE Zero-Tolerance Policy</h2>
          <div style={calloutStyle}>
            ⚠️ NextIgnition has an absolute zero-tolerance policy for child sexual abuse and exploitation
            (CSAE) in any form. Any content, behavior, or material that sexually exploits, endangers, or
            harms minors — or facilitates such exploitation — is strictly prohibited and will result in
            immediate account removal and referral to law enforcement authorities.
          </div>
          <p style={pStyle}>
            We are fully committed to combating child sexual abuse and exploitation. This commitment extends
            to all aspects of our platform, including user-generated content, private messaging, community
            channels, events, and any other features. We actively monitor our platform for such content and
            cooperate fully with law enforcement investigations involving child safety.
          </p>
        </div>

        {/* 3. Prohibited Content */}
        <div style={sectionStyle}>
          <h2 style={h2Style}>3. Prohibited Content & Behaviour</h2>
          <p style={pStyle}>
            The following content and behaviours are strictly prohibited on NextIgnition. Violations will
            result in immediate account termination, content removal, and referral to the relevant authorities:
          </p>
          <ul style={ulStyle}>
            <li><strong>Child Sexual Abuse Material (CSAM):</strong> Any images, videos, text, or other media that sexually exploits minors is absolutely forbidden and will be reported to the National Center for Missing and Exploited Children (NCMEC) and relevant law enforcement agencies worldwide.</li>
            <li><strong>Grooming Behaviour:</strong> Any attempt to build trust with minors for the purpose of sexual exploitation, including unsolicited contact with minors or coercing minors into sexual conversations or exchanges.</li>
            <li><strong>Child Sexual Exploitation:</strong> Soliciting, producing, distributing, or possessing sexually explicit content depicting minors in any format.</li>
            <li><strong>Trafficking of Minors:</strong> Any content or activity related to the trafficking or exploitation of children.</li>
            <li><strong>Sexual Content Involving Minors:</strong> Any content — written, illustrated, animated, or otherwise — that depicts minors in a sexual context.</li>
            <li><strong>Sextortion:</strong> Threatening to distribute intimate images of a minor or using such threats to coerce any person.</li>
            <li><strong>Indecent Exposure to Minors:</strong> Deliberately exposing minors to sexually explicit material through the platform.</li>
            <li><strong>Facilitating Access to CSAM:</strong> Sharing links, codes, or instructions that facilitate access to child sexual abuse material.</li>
          </ul>
        </div>

        {/* 4. Reporting Mechanism */}
        <div style={sectionStyle}>
          <h2 style={h2Style}>4. In-App Reporting Mechanism</h2>
          <p style={pStyle}>
            <span style={greenBadgeStyle}>AVAILABLE IN-APP</span>
            NextIgnition provides users with a clear and accessible mechanism to report child safety concerns
            directly within the application. Users can report any content, profile, or behaviour they believe
            violates our child safety standards using the following methods:
          </p>
          <ul style={ulStyle}>
            <li><strong>In-App Report Button:</strong> Every user profile, community post, and message has a "Report" option. Users can select "Child Safety" or "Harmful Content" as the reporting category.</li>
            <li><strong>Help &amp; Support Page:</strong> Navigate to <strong>Help &amp; Support</strong> within the app and submit a detailed report via the contact form, selecting "Child Safety" as the category.</li>
            <li><strong>Direct Email:</strong> Reports can be sent directly to <a href={`mailto:${contactEmail}`} style={{ color: '#4f46e5' }}>{contactEmail}</a> with the subject line "CHILD SAFETY REPORT".</li>
          </ul>
          <p style={pStyle}>
            All reports related to child safety are treated as the highest priority. We aim to review and act
            on such reports within <strong>24 hours</strong>. Users who submit child safety reports will receive
            a confirmation and follow-up on the action taken (where permitted by law and privacy obligations).
          </p>
        </div>

        {/* 5. Moderation & Enforcement */}
        <div style={sectionStyle}>
          <h2 style={h2Style}>5. Moderation & Enforcement</h2>
          <p style={pStyle}>
            NextIgnition employs the following measures to detect, prevent, and act on violations of our
            child safety standards:
          </p>
          <ul style={ulStyle}>
            <li><strong>Proactive Monitoring:</strong> Our moderation team actively reviews flagged content, community posts, and user reports for potential child safety violations.</li>
            <li><strong>Automated Detection:</strong> We use automated systems and hash-matching technology to detect and prevent the upload or sharing of known CSAM on our platform.</li>
            <li><strong>Immediate Account Suspension:</strong> Accounts found to be in violation of our child safety policy are immediately suspended pending investigation.</li>
            <li><strong>Permanent Ban:</strong> Users confirmed to have violated our child safety standards are permanently banned from all NextIgnition platforms with no possibility of reinstatement.</li>
            <li><strong>Evidence Preservation:</strong> We preserve all relevant evidence upon detection of a potential CSAM violation and make it available to law enforcement upon request or legal obligation.</li>
            <li><strong>Law Enforcement Referral:</strong> We report all confirmed CSAM incidents to the National Center for Missing and Exploited Children (NCMEC) via its CyberTipline (www.cybertipline.org), and to relevant national and regional law enforcement authorities.</li>
          </ul>
        </div>

        {/* 6. Legal Compliance */}
        <div style={sectionStyle}>
          <h2 style={h2Style}>6. Legal Compliance & Reporting to Authorities</h2>
          <p style={pStyle}>
            NextIgnition complies with all applicable laws regarding child safety and the reporting of child
            sexual abuse material, including but not limited to:
          </p>
          <ul style={ulStyle}>
            <li><strong>PROTECT Our Children Act (USA)</strong> — We report known incidents of CSAM to NCMEC as required under 18 U.S.C. § 2258A.</li>
            <li><strong>Children's Online Privacy Protection Act (COPPA)</strong> — We do not collect personal information from children under 13.</li>
            <li><strong>EU Directive on Combating Child Sexual Abuse</strong> — We cooperate with European authorities to report and remove CSAM.</li>
            <li><strong>UK Online Safety Act</strong> — We comply with UK requirements to protect children from harm online.</li>
            <li><strong>IT Act, 2000 (India)</strong> — We comply with Indian law requiring reporting of CSAM to the Cyber Crime Cell and NCPCR.</li>
          </ul>
          <p style={pStyle}>
            We report incidents to the relevant regional and national authorities and cooperate fully with
            any lawful investigation. Our designated contact for child safety compliance matters is:
            <a href={`mailto:${contactEmail}`} style={{ color: '#4f46e5', marginLeft: '0.3rem' }}>{contactEmail}</a>
          </p>
        </div>

        {/* 7. Data Protection & User Privacy */}
        <div style={sectionStyle}>
          <h2 style={h2Style}>7. Data Protection & User Privacy</h2>
          <p style={pStyle}>
            NextIgnition is committed to protecting the privacy and security of all users. We implement
            industry-standard technical and organisational measures to safeguard personal data:
          </p>
          <ul style={ulStyle}>
            <li>All data is encrypted in transit (TLS 1.2+) and at rest (AES-256).</li>
            <li>We do not sell or rent user data to any third party.</li>
            <li>We collect only the minimum necessary data for platform operation.</li>
            <li>Users may request access to, correction of, or deletion of their personal data at any time by contacting us at <a href={`mailto:${contactEmail}`} style={{ color: '#4f46e5' }}>{contactEmail}</a>.</li>
            <li>All third-party service providers processing user data are bound by contractual data processing agreements.</li>
            <li>We retain user data only for as long as necessary to provide the service or as required by law.</li>
          </ul>
        </div>

        {/* 8. Platform Security */}
        <div style={sectionStyle}>
          <h2 style={h2Style}>8. Platform Security Measures</h2>
          <ul style={ulStyle}>
            <li><strong>Authentication:</strong> Secure JWT-based authentication with session expiry and token rotation.</li>
            <li><strong>Role-Based Access Control:</strong> Users only access data and features appropriate to their verified role.</li>
            <li><strong>Penetration Testing:</strong> Regular security audits and vulnerability assessments.</li>
            <li><strong>Suspicious Activity Detection:</strong> Automated monitoring for account takeover attempts, bot activity, and suspicious patterns.</li>
            <li><strong>Secure Communication:</strong> All API communications are encrypted and authenticated.</li>
          </ul>
        </div>

        {/* 9. Contact */}
        <div style={sectionStyle}>
          <h2 style={h2Style}>9. Contact for Child Safety &amp; CSAM Reports</h2>
          <p style={pStyle}>
            If you have identified child sexual abuse material or a child safety violation on NextIgnition,
            please contact us immediately:
          </p>
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '0.75rem', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, color: '#166534', marginBottom: '0.3rem' }}>Designated CSAM Point of Contact</div>
            <div style={{ color: '#166534' }}>Email: <a href={`mailto:${contactEmail}`} style={{ color: '#166534', fontWeight: 600 }}>{contactEmail}</a></div>
            <div style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.4rem' }}>
              Subject line: <strong>CHILD SAFETY REPORT</strong> — Our team will respond within 24 hours.
            </div>
          </div>
          <p style={{ ...pStyle, fontSize: '0.9rem', color: '#6b7280' }}>
            You may also report child sexual abuse material directly to the National Center for Missing &amp;
            Exploited Children (NCMEC) at{' '}
            <a href="https://www.cybertipline.org" target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5' }}>
              www.cybertipline.org
            </a>
            , or to your local law enforcement agency.
          </p>
        </div>

        {/* Footer Note */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', color: '#9ca3af', fontSize: '0.88rem' }}>
          <p style={{ margin: 0 }}>
            These standards are reviewed and updated regularly to align with applicable app store policies, legal requirements, and best practices in child online safety. For questions about this policy, contact{' '}
            <a href={`mailto:${contactEmail}`} style={{ color: '#6366f1' }}>{contactEmail}</a>.
          </p>
          <p style={{ margin: '0.5rem 0 0' }}>
            © {new Date().getFullYear()} NextIgnition. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsPage() {
  return (
    <MarketingPageShell
      title="Testimonials"
      subtitle="Success stories from founders, experts, and investors."
    >
      <SuccessStoriesSection />
    </MarketingPageShell>
  );
}

export function WhyChooseUsPage() {
  return (
    <MarketingPageShell
      title="Why Choose Us"
      subtitle="What makes NextIgnition different."
    >
      <WhyChooseSection />
    </MarketingPageShell>
  );
}

export function AboutPage() {
  return (
    <MarketingPageShell
      title="About"
      subtitle="Our mission and what we’re building."
    >
      <MissionSection />
    </MarketingPageShell>
  );
}

export function RolesPage() {
  return (
    <MarketingPageShell
      title="Roles"
      subtitle="Founder, Expert, Investor and more—switch anytime."
    >
      <RolesSection />
    </MarketingPageShell>
  );
}

export function AfterSignupPage() {
  return (
    <MarketingPageShell
      title="After Signup"
      subtitle="What happens after you create your account."
    >
      <div className="max-w-5xl mx-auto px-4 lg:px-8 pb-16">
        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="text-sm font-bold mb-1">Step 1</div>
              <div className="text-lg font-semibold mb-2">Complete your profile</div>
              <div className="text-sm text-gray-600">Add details so the platform can personalize your dashboard and matches.</div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="text-sm font-bold mb-1">Step 2</div>
              <div className="text-lg font-semibold mb-2">Choose your role</div>
              <div className="text-sm text-gray-600">Founder, Expert, or Investor—switch later anytime.</div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="text-sm font-bold mb-1">Step 3</div>
              <div className="text-lg font-semibold mb-2">Start building</div>
              <div className="text-sm text-gray-600">Join the community, connect, and use tools to move faster.</div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-end">
            <button
              className="px-6 py-3 rounded-full font-bold text-white"
              style={{ backgroundColor: brandColors.electricBlue }}
              onClick={() => {
                window.location.hash = '#signup';
              }}
            >
              Create account
            </button>
            <button
              className="px-6 py-3 rounded-full font-bold text-white"
              style={{ backgroundColor: brandColors.atomicOrange }}
              onClick={() => {
                window.location.hash = '#login';
              }}
            >
              Log in
            </button>
          </div>
        </div>
      </div>
    </MarketingPageShell>
  );
}

export function FAQPage() {
  return (
    <MarketingPageShell
      title="FAQ"
      subtitle="Answers to common questions."
    >
      <FAQSection />
    </MarketingPageShell>
  );
}
