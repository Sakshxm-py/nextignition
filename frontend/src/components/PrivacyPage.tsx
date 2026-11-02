import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import logoImage from '../assets/logo.png';
import { brandColors } from '../utils/colors';
import { Footer } from './Footer';

export function PrivacyPage() {
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
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-12 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: January 9, 2026</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                NextIgnition ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how 
                we collect, use, disclose, and safeguard your information when you visit our website and use our services.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, 
                please do not access the site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may collect information about you in a variety of ways. The information we may collect includes:
              </p>
              
              <h3 className="text-xl font-bold mb-3 mt-6">Personal Data</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Personally identifiable information, such as your name, shipping address, email address, and telephone number, 
                and demographic information, such as your age, gender, hometown, and interests, that you voluntarily give to us 
                when you register with the Service or when you choose to participate in various activities related to the Service.
              </p>

              <h3 className="text-xl font-bold mb-3 mt-6">Derivative Data</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Information our servers automatically collect when you access the Service, such as your IP address, 
                your browser type, your operating system, your access times, and the pages you have viewed directly 
                before and after accessing the Service.
              </p>

              <h3 className="text-xl font-bold mb-3 mt-6">Financial Data</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Financial information, such as data related to your payment method (e.g., valid credit card number, card brand, 
                expiration date) that we may collect when you purchase, order, return, exchange, or request information about 
                our services from the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. Use of Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. 
                Specifically, we may use information collected about you via the Service to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Create and manage your account</li>
                <li>Process your transactions and send you related information</li>
                <li>Email you regarding your account or order</li>
                <li>Fulfill and manage purchases, orders, payments, and other transactions</li>
                <li>Generate a personal profile about you to make future visits more personalized</li>
                <li>Increase the efficiency and operation of the Service</li>
                <li>Monitor and analyze usage and trends to improve your experience</li>
                <li>Notify you of updates to the Service</li>
                <li>Offer new products, services, and/or recommendations</li>
                <li>Perform other business activities as needed</li>
                <li>Prevent fraudulent transactions and protect against criminal activity</li>
                <li>Request feedback and contact you about your use of the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Disclosure of Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
              </p>
              
              <h3 className="text-xl font-bold mb-3 mt-6">By Law or to Protect Rights</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                If we believe the release of information about you is necessary to respond to legal process, to investigate or 
                remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may 
                share your information as permitted or required by any applicable law, rule, or regulation.
              </p>

              <h3 className="text-xl font-bold mb-3 mt-6">Third-Party Service Providers</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may share your information with third parties that perform services for us or on our behalf, including payment 
                processing, data analysis, email delivery, hosting services, customer service, and marketing assistance.
              </p>

              <h3 className="text-xl font-bold mb-3 mt-6">Business Transfers</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may share or transfer your information in connection with, or during negotiations of, any merger, sale of 
                company assets, financing, or acquisition of all or a portion of our business to another company.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Security of Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use administrative, technical, and physical security measures to help protect your personal information. 
                While we have taken reasonable steps to secure the personal information you provide to us, please be aware that 
                despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be 
                guaranteed against any interception or other type of misuse.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Policy for Children</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We do not knowingly solicit information from or market to children under the age of 13. If we learn that we have 
                collected personal information from a child under age 13 without verification of parental consent, we will delete 
                that information as quickly as possible.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Your Privacy Rights</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may at any time review or change the information in your account or terminate your account by:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Logging into your account settings and updating your account</li>
                <li>Contacting us using the contact information provided below</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4 mt-4">
                Upon your request to terminate your account, we will deactivate or delete your account and information from our 
                active databases. However, some information may be retained in our files to prevent fraud, troubleshoot problems, 
                assist with any investigations, enforce our Terms of Use and/or comply with legal requirements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Changes to This Privacy Policy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update this Privacy Policy from time to time in order to reflect changes to our practices or for other 
                operational, legal, or regulatory reasons. We will notify you of any changes by posting the new Privacy Policy 
                on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have questions or comments about this Privacy Policy, please contact us at:
              </p>
              <p className="text-gray-700 leading-relaxed">
                Email: <a href="mailto:privacy@nextignition.com" className="underline" style={{ color: brandColors.electricBlue }}>
                  privacy@nextignition.com
                </a>
              </p>
            </section>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}